# 连接池集成

传统多数据源接入连接池，需要手写大量重复的 `DataSource` Bean。本框架把这件事收敛成配置：**支持全局声明一次、每个数据源按需继承或覆盖**。

## 支持的连接池

| 连接池 | `type` 值 | 说明 |
| :--- | :--- | :--- |
| [Druid](/docs/pool/druid) | `com.alibaba.druid.pool.DruidDataSource` | 默认首选，监控能力强，需要排除 Druid 自带的自动配置 |
| [HikariCP](/docs/pool/hikaricp) | `com.zaxxer.hikari.HikariDataSource` | Spring Boot 默认池，性能好、参数少 |
| [BeeCP](/docs/pool/beecp) | `cn.beecp.BeeDataSource` | 轻量高性能 |
| [DBCP2](/docs/pool/dbcp2) | `org.apache.commons.dbcp2.BasicDataSource` | Apache 出品，兼容老项目 |
| [JNDI](/docs/pool/jndi) | — | 数据源由容器（Tomcat / WebLogic 等）提供 |
| C3P0 | `com.mchange.v2.c3p0.ComboPooledDataSource` | 有全局 `c3p0.*` 与单库覆盖 |
| Oracle UCP | `oracle.ucp.jdbc.PoolDataSourceImpl` | Oracle 官方池 |
| Basic | — | 不池化，仅用驱动自带的 `DriverManager` 包装，测试用 |

## 不指定 type 时会怎样

`type` **不是必填项**。不设置时，框架按下面的顺序取**第一个 classpath 上可用的**连接池：

```text
Druid > HikariCP > BeeCP > DBCP2 > Basic
```

这个顺序由各 `DataSourceCreator` 的注册顺序决定。`Basic` 是兜底实现——它不做连接池化，每次都会新建连接，**只适合测试或极低频场景**。

:::tip
生产环境建议**显式声明 `type`**。否则一旦依赖变动（比如某个 starter 顺带引入了 Hikari），数据源类型会在你不知情的情况下被换掉，参数也随之失效。
:::

## 参数继承规则

```yaml
spring:
  datasource:
    dynamic:
      hikari:                     # 全局默认，所有 Hikari 数据源共享
        maximum-pool-size: 20
        minimum-idle: 5
      datasource:
        master:
          type: com.zaxxer.hikari.HikariDataSource
          # 不写 hikari.* → 继承全局
        report:
          type: com.zaxxer.hikari.HikariDataSource
          hikari:
            maximum-pool-size: 4  # 只覆盖本库，其余仍继承全局
```

合并由 `ConfigMergeCreator` 完成：以全局参数为基线，用单库参数逐字段覆盖。所以「全局设一次、个别库微调」是安全的，不需要每库重抄。

## 常见坑

### 参数到底写在哪一层？

池参数有**两层**，单数据源优先：

```yaml
spring:
  datasource:
    dynamic:
      druid:                # 全局默认，对所有数据源生效
        max-wait: 3000
      hikari:
        maximum-pool-size: 20
      datasource:
        master:
          druid:            # 单数据源覆盖全局
            max-wait: 5000
```

- 框架**不读** `spring.datasource.druid.*`（那是 `druid-spring-boot-starter` 的配置）；
- 框架**不读** `spring.datasource.hikari.*`（那是 Spring Boot 默认单数据源的配置）；
- 只读 `spring.datasource.dynamic.druid.*` 与 `spring.datasource.dynamic.datasource.<name>.druid.*`。

历史 issue 中大量「`max-wait` 不生效 / Hikari 参数不生效」都属于写错层级（[#189](https://github.com/baomidou/dynamic-datasource/issues/189)、[#254](https://github.com/baomidou/dynamic-datasource/issues/254)、[#447](https://github.com/baomidou/dynamic-datasource/issues/447)、[#418](https://github.com/baomidou/dynamic-datasource/issues/418)）。

### druid 版本兼容窗口

| dynamic-datasource | druid | 结果 |
| :--- | :--- | :--- |
| ≤ 3.6.1 | 1.2.17+ | 启动失败（构造方式变化），[#494](https://github.com/baomidou/dynamic-datasource/issues/494)、[#497](https://github.com/baomidou/dynamic-datasource/issues/497)、[#500](https://github.com/baomidou/dynamic-datasource/issues/500)、[#506](https://github.com/baomidou/dynamic-datasource/issues/506) |
| 4.x | 1.2.x（较新） | 正常 |
| 4.2.x | 1.2.22 | autoconfigure 冲突，需排除，见上 |

**结论：保持 dynamic-datasource 最新 4.x + 较新 druid，并排除 druid 的自动配置。**

### 高频参数陷阱

**Druid**

- `max-wait` 默认 **-1（无限等待）**：连接耗尽时请求会一直卡住而不是快速失败，生产建议显式设置；
- `socket-timeout` / `connect-timeout`：druid 1.2.12+ 新增，**默认 10 秒**（[#455](https://github.com/baomidou/dynamic-datasource/issues/455)、[#461](https://github.com/baomidou/dynamic-datasource/issues/461)）——慢查询可能被 10s 掐断，排查网络超时要先看它；
- `wall` 过滤器（SQL 防火墙）：`multi-statement-allow` 等参数要配在 **`wall` 子块**里，且 `filters` 要包含 `wall`：

```yaml
spring:
  datasource:
    dynamic:
      druid:
        filters: stat,wall
        wall:
          multi-statement-allow: true
```

（[#5](https://github.com/baomidou/dynamic-datasource/issues/5)、[#640](https://github.com/baomidou/dynamic-datasource/issues/640)）

**Hikari**

- `connection-timeout` 默认 30s，池满时抛 `Connection is not available, request timed out after 30001ms`（[#231](https://github.com/baomidou/dynamic-datasource/issues/231)）——先查连接泄漏与池上限，再调参；
- `initialization-fail-timeout: -1`：启动时不等待建连，配合「某个库暂时连不上也不阻塞启动」使用。

### 监控

- **Hikari 指标**：4.x 内置 Micrometer 绑定（`spring.datasource.dynamic.hikari-metrics.enabled`，默认 `true`），会为每个数据源注册指标。历史 issue [#626](https://github.com/baomidou/dynamic-datasource/issues/626)、[#734](https://github.com/baomidou/dynamic-datasource/issues/734)（采集不到指标）在 4.x 已解决，老版本请升级；端点与指标口径见[运维端点与指标](/docs/advanced/observability)。
- **Druid 监控页**：dynamic **不自动注册** druid 的 `StatViewServlet`，需要自行注册（或保留 druid starter 的监控配置）。历史「监控页 404 / 登录名」问题（[#34](https://github.com/baomidou/dynamic-datasource/issues/34)、[#154](https://github.com/baomidou/dynamic-datasource/issues/154)、[#184](https://github.com/baomidou/dynamic-datasource/issues/184)、[#443](https://github.com/baomidou/dynamic-datasource/issues/443)）按 [Druid 集成](/docs/pool/druid)处理：

```java
@Bean
public ServletRegistrationBean<StatViewServlet> druidStatView() {
    ServletRegistrationBean<StatViewServlet> bean =
            new ServletRegistrationBean<>(new StatViewServlet(), "/druid/*");
    bean.addInitParameter("loginUsername", "admin");
    bean.addInitParameter("loginPassword", "admin");
    return bean;
}
```

## 本章内容

- [连接池必读](/docs/pool/common) —— `type` 的取值与自动选择顺序
- 各连接池的依赖坐标、参数清单与坑位说明

## 注意事项

:::warning[Druid 需要排除自带自动配置]
`druid-spring-boot-starter` 会自行注册一个 `DataSource`，与动态数据源冲突。请排除它的自动配置，具体见 [Druid 集成](/docs/pool/druid)。
:::

其他两点：

- 连接池与 JDBC 驱动**不由本框架携带**，需要你的项目自行引入并统一版本。
- 同一应用里允许**每个数据源用不同的连接池**，但除非有明确理由（例如迁移期），不建议这么做——参数与监控口径都会变得难以统一。
