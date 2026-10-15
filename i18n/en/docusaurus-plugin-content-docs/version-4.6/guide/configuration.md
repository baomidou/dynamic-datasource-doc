# Full Configuration Reference

This page lists **every framework-level property** under `spring.datasource.dynamic.*`. Parameters that belong to the connection pool itself (`druid.*` / `hikari.*`, …) are in the [connection pool integration](../pool/common) chapter, which also maps them to their native names.

The prefix constant is `DynamicDataSourceProperties.PREFIX = "spring.datasource.dynamic"`.

## Global configuration

```yaml
spring:
  datasource:
    dynamic:
      enabled: true                # enable the dynamic datasource
      primary: master              # the default datasource / datasource group
      strict: false                # strict mode
      lazy: false                  # global lazy initialization
      p6spy: false                 # enable p6spy output globally
      seata: false                 # enable Seata globally
      seata-mode: AT               # Seata mode: AT | XA
      grace-destroy: false         # graceful shutdown
      public-key: <built-in default public key>   # the public key used to decrypt ENC()
      strategy: com.baomidou.dynamic.datasource.strategy.LoadBalanceDynamicDataSourceStrategy
      datasource: {}               # datasource definitions, see the next section
```

| Property | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `enabled` | `boolean` | `true` | the master switch. Driven by `@ConditionalOnProperty(matchIfMissing = true)` on the auto-configuration; set it to `false` to disable the framework entirely. |
| `primary` | `String` | `master` | the datasource or group used when none is specified explicitly. |
| `strict` | `boolean` | `false` | strict mode. When `true`, a name in `@DS` that matches nothing throws `CannotFindDataSourceException`; when `false` it falls back to `primary`. **Recommended in production**, since a mistyped datasource name surfaces on the very first call. |
| `lazy` | `boolean` | `false` | global lazy initialization. When `true` a datasource only builds its pool on first use. Can be overridden per datasource. |
| `p6spy` | `boolean` | `false` | enable p6spy SQL logging globally. Can be overridden per datasource. |
| `seata` | `boolean` | `false` | enable the Seata proxy globally. **Turning it on automatically disables the local transaction aspect (`@DSTransactional`)**, leaving transactions to Seata. |
| `seata-mode` | `AT` / `XA` | `AT` | the Seata proxy mode, deciding whether datasources are wrapped in `DataSourceProxy` or `DataSourceProxyXA`. |
| `grace-destroy` | `boolean` | `false` | graceful shutdown. When `true`, the container waits for active connections to be returned during shutdown, for at most 10 seconds, before destroying datasources forcibly. |
| `public-key` | `String` | built-in default public key | the public key used to decrypt `ENC(...)`. **Must be replaced in production**, see [database password encryption](../advanced/encryption). |
| `strategy` | `Class<? extends DynamicDataSourceStrategy>` | `LoadBalanceDynamicDataSourceStrategy` | the strategy that picks a member within a group. Round-robin and random are built in, and it is customizable. |
| `datasource` | `Map<String, DataSourceProperty>` | `{}` | the datasource definitions. |

## Per datasource

Configuration under `spring.datasource.dynamic.datasource.<datasource name>`:

```yaml
spring:
  datasource:
    dynamic:
      datasource:
        slave_1:
          # ---- connection information ----
          url: jdbc:mysql://host:3307/db
          username: root
          password: ENC(xxxxx)
          driver-class-name: com.mysql.cj.jdbc.Driver
          # ---- connection pool ----
          type: com.zaxxer.hikari.HikariDataSource
          pool-name: slave-1-pool
          # ---- per-datasource switches (inherit the global value when omitted) ----
          lazy: true
          p6spy: false
          seata: true
          public-key: MFwwDQYJKoZI...
          # ---- pool parameter overrides (this datasource only) ----
          hikari:
            maximum-pool-size: 10
          # ---- init scripts ----
          init:
            schema: classpath:db/slave1-schema.sql
            data: classpath:db/slave1-data.sql
            continue-on-error: true
            separator: ";"
```

| Property | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `url` | `String` | — | the JDBC URL. Can be omitted when `jndi-name` is set. |
| `username` / `password` | `String` | — | credentials, `ENC(...)` supported. |
| `driver-class-name` | `String` | inferred via SPI | the JDBC driver class name. Since 3.2.0 it can be inferred through SPI, so it can usually be omitted. |
| `type` | `Class<? extends DataSource>` | auto-detected | the pool type. When unset, the first available one is used, in the order `Druid > HikariCP > BeeCP > DBCP2 > Basic`. |
| `pool-name` | `String` | the datasource name in the configuration | the pool's name identifier, used to tell datasources apart in logs and metrics. |
| `jndi-name` | `String` | — | the JNDI datasource name. **Setting it enables JNDI mode**, in which case `url` is not needed. |
| `lazy` | `Boolean` | inherits the global value | whether this datasource is lazily initialized. |
| `p6spy` | `Boolean` | inherits the global value | whether this datasource is wrapped with p6spy. |
| `seata` | `Boolean` | `true` | whether this datasource is wrapped with the Seata proxy. Only meaningful when the framework-level `seata=true`. |
| `public-key` | `String` | inherits the global value | a decryption public key dedicated to this datasource. |
| `druid.*` `hikari.*` `beecp.*` `dbcp2.*` `atomikos.*` `c3p0.*` `oracle-ucp.*` | — | inherits the global value | pool parameters that override the global ones for this datasource only. |

### Init scripts `init`

`init` lets **each database** run its own schema and data scripts; supported since 3.5.0:

| Property | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `init.schema` | `String` | — | path of the schema script, `classpath:` prefix supported. |
| `init.data` | `String` | — | path of the data script. |
| `init.continue-on-error` | `boolean` | `true` | whether to keep going when a single statement fails. |
| `init.separator` | `String` | `;` | the statement separator. |

See [startup init scripts](../advanced/init-scripts).

## AOP configuration

```yaml
spring:
  datasource:
    dynamic:
      aop:
        enabled: true                          # enable the @DS aspect
        order: -2147483648                     # aspect order, defaults to Ordered.HIGHEST_PRECEDENCE
        allowed-public-only: true              # intercept public methods only
        allowed-spel-type-access: false        # allow SpEL type references
```

| Property | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `aop.enabled` | `boolean` | `true` | when disabled, `@DS` stops working entirely (used in purely manual switching setups). |
| `aop.order` | `int` | `Ordered.HIGHEST_PRECEDENCE` | the aspect priority. **It must be higher than the transaction aspect**, otherwise `@DS` runs after the transaction has started and the switch has no effect. |
| `aop.allowed-public-only` | `boolean` | `true` | when `true`, `@DS` / `@DSTransactional` on non-public methods are silently ignored. |
| `aop.allowed-spel-type-access` | `boolean` | `false` | whether SpEL type references such as `T(java.lang.Runtime)` are allowed. Disabled by default to prevent SpEL injection. |

::::warning
Do not change `aop.order` casually. The default `HIGHEST_PRECEDENCE` exists to guarantee "switch the datasource first, then open the transaction"; lowering it makes `@DS` run after `@Transactional`, so the thread ends up with the connection the transaction already bound.
::::

## Metrics and the operations endpoint

| Property | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `hikari-metrics.enabled` | `boolean` | `true` | whether to register Hikari pool metrics with Micrometer (requires Micrometer and HikariCP on the classpath). |

The Actuator endpoint follows Actuator's own rules and is not configured through this framework's prefix:

```yaml
management:
  endpoints:
    web:
      exposure:
        include: dynamic-datasource   # expose as needed; not exposed by default
```

`GET /actuator/dynamic-datasource` returns the state of the four switches `primary` / `strict` / `p6spy` / `seata`, plus every datasource and its group composition. **It deliberately does not return the URL or the username** — a URL may carry credentials, and a status overview does not need them. See [operations endpoint and metrics](../advanced/observability).

## How global parameters are merged into a single datasource

`ConfigMergeCreator` merges "global pool parameters" with "per-datasource pool parameters":

1. take the **global parameters** (for example `spring.datasource.dynamic.hikari.*`) as the baseline
2. override them field by field with the **per-datasource parameters** (for example `...datasource.slave_1.hikari.*`)
3. `lazy` and `public-key` are special: they only inherit the global value when the datasource does not set them explicitly (`null` / empty string)

So "set it globally once, fine-tune a few databases" is safe — you do not have to copy the parameters into every datasource.

## Programmatic configuration

Besides YAML, you can modify the configuration object at startup by implementing `DynamicDataSourcePropertiesCustomizer`:

```java
@Bean
public DynamicDataSourcePropertiesCustomizer customizer() {
    return properties -> properties.setStrict(true);
}
```

When you need to take over completely (for instance because the datasource list comes from an external config center), implement `DynamicDataSourceProvider` — see [custom datasource provider](../custom/datasource-provider).

## Further reading

- [@DS semantics and precedence](./ds-semantics) — how these properties behave at runtime
- [Connection pool essentials](../pool/common) — `type` and the parameters of each pool
- [Database password encryption](../advanced/encryption) — `public-key` and `ENC()`
- [Graceful shutdown](../advanced/graceful-shutdown) — `grace-destroy`
