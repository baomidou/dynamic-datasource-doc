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
