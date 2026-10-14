# 运维端点与指标

:::warning[本文档对应 4.5.0]
**Actuator 端点是 4.6.0 才新增的能力，4.5.0 上不存在。** 如果你在用 4.5.0，请直接跳到下面的[连接池指标](#连接池指标)章节。

需要端点能力请升级到 [4.6.0](/docs/guide/version-history)，升级要点见该页的「升级必读」。
:::

线上排查多数据源问题时，第一件事往往是「现在到底有哪些数据源、分组是怎样的」。

## Actuator 端点

:::info[4.6.0 新增]
本节内容在 4.5.0 上不可用，保留在此仅为对照。
:::

### 启用

端点遵循 Actuator 自身的暴露规则，**默认不暴露**：

```yaml
management:
  endpoints:
    web:
      exposure:
        include: dynamic-datasource
```

依赖 Actuator 2.2+。在更早的 Spring Boot 版本上，缺少新注解类时整个自动装配会通过 ASM 方式跳过，不会报错。

### 访问

```text
GET /actuator/dynamic-datasource
```

返回结构：

```json
{
  "primary": "master",
  "strict": true,
  "p6spy": false,
  "seata": false,
  "dataSources": {
    "master": "HikariDataSource",
    "slave_1": "HikariDataSource",
    "slave_2": "DruidDataSource",
    "report": "HikariDataSource"
  },
  "groups": {
    "master": { "size": 1, "dataSources": ["master"] },
    "slave": { "size": 2, "dataSources": ["slave_1", "slave_2"] },
    "report": { "size": 1, "dataSources": ["report"] }
  }
}
```

用途：

- `primary` / `strict` / `p6spy` / `seata` —— 确认四个全局开关**实际生效的值**，比翻配置更可靠
- `dataSources` —— 全部数据源名与实际连接池类型。运行期动态增删的数据源同样会出现，是验证「加库有没有成功」的最快手段
- `groups` —— 分组构成。发现 `@DS("slave")` 没按预期负载均衡时，先看这里的分组是否符合预期

:::tip[为什么不返回 URL]
端点**刻意不返回 URL、用户名等连接串信息**——URL 可能携带凭据，而状态盘点并不需要它们。这是有意的取舍，不是功能缺失。
:::

## 连接池指标

如果 classpath 上同时有 **Micrometer** 与 **HikariCP**，框架会把每个 Hikari 数据源的指标自动注册到 `MeterRegistry`，指标名沿用 Spring Boot 的 Hikari 命名（`hikaricp.connections.*`），并通过 `pool` 标签区分具体数据源。

```yaml
spring:
  datasource:
    dynamic:
      hikari-metrics:
        enabled: true   # 默认 true
```

关闭方式：

```yaml
spring:
  datasource:
    dynamic:
      hikari-metrics:
        enabled: false
```

行为细节：

- **仅支持 HikariCP**。Druid 用户请使用 Druid 自带的 `StatFilter` / `DruidStatViewServlet`，框架不做转发。
- 已自行设置过 `metricRegistry` 或 `metricsTrackerFactory` 的数据源会被跳过——框架不会覆盖你的显式配置。
- 绑定失败只记录 `warn` 日志，不影响应用启动。

配合 `pool` 标签，可以直接观察单个库是否被打爆：

```promql
# 按数据源查看活跃连接数
hikaricp_connections_active{pool="slave_1"}
```

## 运行期动态增删数据源

端点只负责「看」，增删请用 `DynamicRoutingDataSource` 的 API：

```java
@Autowired
private DataSource dataSource;

public void addAndRemove() {
    DynamicRoutingDataSource ds = (DynamicRoutingDataSource) dataSource;

    // 新增或覆盖
    ds.addDataSource("slave_3", newDataSource);

    // 移除（组内为空时该组会被自动清理）
    ds.removeDataSource("slave_3");

    // 当前全量数据源
    Map<String, DataSource> all = ds.getDataSources();
}
```

完整示例见[动态添加移除数据源](/docs/advanced/add-remove-datasource)。

:::warning
`addDataSource` / `removeDataSource` 是 `synchronized` 的，但**移除正在被使用的数据源会导致该线程的连接获取失败**。生产环境请先做流量摘除（把该库从组里移出、等待在途请求结束），再调用移除。
:::

## 相关阅读

- [动态添加移除数据源](/docs/advanced/add-remove-datasource)
- [优雅关闭](/docs/advanced/graceful-shutdown)
- [完整配置参考](/docs/guide/configuration)
