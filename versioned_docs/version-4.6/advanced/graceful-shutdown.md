# 优雅关闭

## 问题

应用滚动发布或缩容时，容器收到的关闭信号会立刻触发 `DataSource.close()`。如果此刻还有在途 SQL，连接被强关后客户端会收到 `SQLException`，表现为**发布期间偶发的请求失败**。

## 开启方式

```yaml
spring:
  datasource:
    dynamic:
      grace-destroy: true   # 默认 false
```

开启后，销毁数据源前会先等待「活跃连接归还」，最多 **10 秒**，超时则强制关闭。

## 工作方式

销毁流程分两步：

1. **探活等待**：起一个名为 `close-datasource` 的单线程，每 `100ms` 轮询一次，只要仍有活跃连接就继续等；累计超过 `10s` 直接跳出循环。
2. **执行 close**：反射调用数据源自身的 `close()` 方法，然后记录日志。

探活由内置的探测器完成，目前覆盖：

| 探测器 | 支持的数据源 |
| :--- | :--- |
| `HikariDataSourceActiveDetector` | HikariCP |
| `DruidDataSourceActiveDetector` | Druid |
| `Dhcp2DataSourceActiveDetector` | DBCP2（`org.apache.commons.dbcp2.BasicDataSource`） |

## 注意事项

:::warning[不支持的数据源会等满 10 秒]
如果数据源类型没有匹配到任何探测器（例如 **BeeCP、C3P0、Oracle UCP、JNDI 或无池 basic**），探活逻辑无法判断活跃连接，会**一直等到 10 秒超时**才关闭。

- 应用关闭时间因此固定增加 10 秒
- 这是已知行为，不是卡死

如果你用的是上述连接池，又不希望关闭变慢，请保持 `grace-destroy` 为 `false`，改用容器层面的 `preStop` 钩子或 `terminationGracePeriodSeconds` 来做流量摘除。
:::

另外两点：

- 探活**只判断连接池自身的活跃连接数**，不会感知应用层还在执行的、尚未拿到连接的逻辑。
- 该能力在运行期动态新增的数据源上同样生效（它们由同一个路由数据源统一管理销毁）。

## 与容器优雅下线的配合

`grace-destroy` 解决的是「连接别被强关」，但完整的优雅下线还需要：

1. 先从负载均衡摘除流量（Kubernetes 里通常是 `preStop` 配合 `sleep`）
2. 再停止应用
3. 应用关闭时由本能力等待在途连接
4. 确保 `terminationGracePeriodSeconds` 大于「摘流量等待时间 + 10s」

```yaml
# Kubernetes Deployment 片段
spec:
  terminationGracePeriodSeconds: 40
  containers:
    - name: app
      lifecycle:
        preStop:
          exec:
            command: ["sh", "-c", "sleep 10"]   # 先摘流量
```

## 相关阅读

- [完整配置参考](/docs/guide/configuration)
- [动态添加移除数据源](/docs/advanced/add-remove-datasource) —— 运行期移除单个库时的注意事项
