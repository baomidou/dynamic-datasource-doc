---
title: "完整配置参考"
description: "本页列出 spring.datasource.dynamic.* 下的全部框架级配置项。连接池自身的参数（druid.* / hikari.* 等）请见连接池集成章节，那里有与原生参数名的对照。"
---

# 完整配置参考

本页列出 `spring.datasource.dynamic.*` 下的**全部框架级配置项**。连接池自身的参数（`druid.*` / `hikari.*` 等）请见[连接池集成](/docs/pool/common)章节，那里有与原生参数名的对照。

配置前缀常量：`DynamicDataSourceProperties.PREFIX = "spring.datasource.dynamic"`。

## 全局配置

```yaml
spring:
  datasource:
    dynamic:
      enabled: true                # 是否启用动态数据源
      primary: master              # 默认数据源 / 数据源组
      strict: false                # 严格模式
      lazy: false                  # 全局懒加载
      p6spy: false                 # 全局启用 p6spy 输出
      seata: false                 # 全局启用 Seata
      seata-mode: AT               # Seata 模式：AT | XA
      grace-destroy: false         # 优雅关闭
      public-key: <内置默认公钥>     # ENC() 解密公钥
      strategy: com.baomidou.dynamic.datasource.strategy.LoadBalanceDynamicDataSourceStrategy
      datasource: {}               # 数据源定义，见下一节
```

| 配置项 | 类型 | 默认值 | 说明 |
| :--- | :--- | :--- | :--- |
| `enabled` | `boolean` | `true` | 总开关。由自动装配上的 `@ConditionalOnProperty(matchIfMissing = true)` 控制，设为 `false` 可整体关闭本框架接管。 |
| `primary` | `String` | `master` | 没有明确指定数据源时使用的数据源或组。 |
| `strict` | `boolean` | `false` | 严格模式。`true` 时 `@DS` 指定的名称匹配不到会直接抛 `CannotFindDataSourceException`；`false` 时回落到 `primary`。**生产建议开启**，能把写错的数据源名在第一次调用就暴露出来。 |
| `lazy` | `boolean` | `false` | 全局懒加载。`true` 时数据源在首次使用时才真正建立连接池。可被单个数据源覆盖。 |
| `p6spy` | `boolean` | `false` | 全局启用 p6spy SQL 日志。可被单个数据源覆盖。 |
| `seata` | `boolean` | `false` | 全局启用 Seata 代理。**开启后本地事务切面（`@DSTransactional`）会被自动禁用**，事务交由 Seata 托管。 |
| `seata-mode` | `AT` / `XA` | `AT` | Seata 代理模式，决定包装成 `DataSourceProxy` 还是 `DataSourceProxyXA`。 |
| `grace-destroy` | `boolean` | `false` | 优雅关闭。`true` 时容器关闭阶段会先等待活跃连接归还，最多 10 秒后再强制销毁数据源。 |
| `public-key` | `String` | 内置默认公钥 | `ENC(...)` 的解密公钥。**生产必须替换**，详见[数据库密码加密](/docs/advanced/encryption)。 |
| `strategy` | `Class<? extends DynamicDataSourceStrategy>` | `LoadBalanceDynamicDataSourceStrategy` | 组内选库策略。内置轮询与随机两种，可自定义。 |
| `datasource` | `Map<String, DataSourceProperty>` | `{}` | 数据源定义。 |

## 每个数据源

`spring.datasource.dynamic.datasource.<数据源名>` 下的配置：

```yaml
spring:
  datasource:
    dynamic:
      datasource:
        slave_1:
          # ---- 连接信息 ----
          url: jdbc:mysql://host:3307/db
          username: root
          password: ENC(xxxxx)
          driver-class-name: com.mysql.cj.jdbc.Driver
          # ---- 连接池 ----
          type: com.zaxxer.hikari.HikariDataSource
          pool-name: slave-1-pool
          # ---- 单库开关（不写则继承全局）----
          lazy: true
          p6spy: false
          seata: true
          public-key: MFwwDQYJKoZIhvc...
          # ---- 连接池参数覆盖（只影响本数据源）----
          hikari:
            maximum-pool-size: 10
          # ---- 初始化脚本 ----
          init:
            schema: classpath:db/slave1-schema.sql
            data: classpath:db/slave1-data.sql
            continue-on-error: true
            separator: ";"
```

| 配置项 | 类型 | 默认值 | 说明 |
| :--- | :--- | :--- | :--- |
| `url` | `String` | — | JDBC URL。设置了 `jndi-name` 时可省略。 |
| `username` / `password` | `String` | — | 账号密码，支持 `ENC(...)`。 |
| `driver-class-name` | `String` | SPI 自动推断 | JDBC 驱动类名。3.2.0 起可通过 SPI 推断，通常可省略。 |
| `type` | `Class<? extends DataSource>` | 自动探测 | 连接池类型。不指定时按 `Druid > HikariCP > BeeCP > DBCP2 > Basic` 的顺序取第一个可用的。 |
| `pool-name` | `String` | 配置里的数据源名 | 连接池的名称标识，用于日志与指标区分。 |
| `jndi-name` | `String` | — | JNDI 数据源名。**设置即表示启用 JNDI 模式**，此时不需要 `url`。 |
| `lazy` | `Boolean` | 继承全局 | 本数据源是否懒加载。 |
| `p6spy` | `Boolean` | 继承全局 | 本数据源是否包 p6spy。 |
| `seata` | `Boolean` | `true` | 本数据源是否包 Seata 代理。仅当框架级 `seata=true` 时才有意义。 |
| `public-key` | `String` | 继承全局 | 本数据源专属的解密公钥。 |
| `druid.*` `hikari.*` `beecp.*` `dbcp2.*` `atomikos.*` `c3p0.*` `oracle-ucp.*` | — | 继承全局 | 只覆盖本数据源的连接池参数。 |

### 初始化脚本 `init`

`init` 用于让**每个库独立**执行建表与数据脚本，自 3.5.0 起支持：

| 配置项 | 类型 | 默认值 | 说明 |
| :--- | :--- | :--- | :--- |
| `init.schema` | `String` | — | 建表脚本路径，支持 `classpath:` 前缀。 |
| `init.data` | `String` | — | 数据脚本路径。 |
| `init.continue-on-error` | `boolean` | `true` | 单条语句出错是否继续执行。 |
| `init.separator` | `String` | `;` | 语句分隔符。 |

详见[启动初始化脚本](/docs/advanced/init-scripts)。

## AOP 配置

```yaml
spring:
  datasource:
    dynamic:
      aop:
        enabled: true                          # 是否启用 @DS 切面
        order: -2147483648                     # 切面顺序，默认 Ordered.HIGHEST_PRECEDENCE
        allowed-public-only: true              # 是否只拦截 public 方法
        allowed-spel-type-access: false        # 是否允许 SpEL 类型引用
```

| 配置项 | 类型 | 默认值 | 说明 |
| :--- | :--- | :--- | :--- |
| `aop.enabled` | `boolean` | `true` | 关闭后 `@DS` 完全失效（常用于纯手动切换场景）。 |
| `aop.order` | `int` | `Ordered.HIGHEST_PRECEDENCE` | 切面优先级。**必须高于事务切面**，否则 `@DS` 会在事务开启之后才执行，导致切换失效。 |
| `aop.allowed-public-only` | `boolean` | `true` | `true` 时非 public 方法上的 `@DS` / `@DSTransactional` 会被静默忽略。 |
| `aop.allowed-spel-type-access` | `boolean` | `false` | 是否允许 `T(java.lang.Runtime)` 这类 SpEL 类型引用。默认关闭以规避 SpEL 注入。**4.6.0 新增，4.5.0 上该配置项不存在。** |

:::warning
`aop.order` 不要随意调整。默认的 `HIGHEST_PRECEDENCE` 是为了保证「先切数据源、再开事务」；调低它会让 `@DS` 在 `@Transactional` 之后执行，从而在同一线程中拿到已被事务绑定死的连接。
:::

## 指标与运维端点

| 配置项 | 类型 | 默认值 | 说明 |
| :--- | :--- | :--- | :--- |
| `hikari-metrics.enabled` | `boolean` | `true` | 是否注册 Hikari 连接池的 Micrometer 指标（需 classpath 上有 Micrometer 与 HikariCP）。 |

Actuator 端点由 Actuator 自身的规则控制，不经本框架的配置前缀：

```yaml
management:
  endpoints:
    web:
      exposure:
        include: dynamic-datasource   # 按需暴露；默认不暴露
```

访问 `GET /actuator/dynamic-datasource` 可拿到 `primary` / `strict` / `p6spy` / `seata` 四个开关状态，以及全部数据源与其分组构成。**它刻意不返回 URL 与用户名**——URL 可能携带凭据，状态盘点不需要它们。详见[运维端点与指标](/docs/advanced/observability)。

## 全局参数如何合并到单个数据源

`ConfigMergeCreator` 负责把「全局连接池参数」与「单库连接池参数」合并：

1. 以**全局参数**（如 `spring.datasource.dynamic.hikari.*`）为基线
2. 用**单库参数**（如 `...datasource.slave_1.hikari.*`）逐字段覆盖
3. `lazy` 与 `public-key` 是特例：单库未显式设置（`null` / 空字符串）时才继承全局值

因此「全局设一次，个别库再微调」是安全的，不需要把参数在每库里重抄一遍。

## 编程式配置

除了 YAML，还可以通过实现 `DynamicDataSourcePropertiesCustomizer` 在启动时修改配置对象：

```java
@Bean
public DynamicDataSourcePropertiesCustomizer customizer() {
    return properties -> properties.setStrict(true);
}
```

需要更彻底的接管（例如数据源清单来自外部配置中心）时，请实现 `DynamicDataSourceProvider`，见[自定义数据源来源](/docs/custom/datasource-provider)。

## 相关阅读

- [@DS 语义与优先级](/docs/guide/ds-semantics) —— 这些配置在运行时的行为
- [连接池必读](/docs/pool/common) —— `type` 与各连接池参数
- [数据库密码加密](/docs/advanced/encryption) —— `public-key` 与 `ENC()`
- [优雅关闭](/docs/advanced/graceful-shutdown) —— `grace-destroy`