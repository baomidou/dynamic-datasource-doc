# Connection Pool Integration

Wiring a connection pool into a traditional multi-datasource setup means hand-writing a pile of duplicated `DataSource` beans. This framework turns that into configuration: **declare it once globally, and let each datasource inherit or override as needed**.

## Supported pools

| Pool | `type` value | Notes |
| :--- | :--- | :--- |
| [Druid](./druid) | `com.alibaba.druid.pool.DruidDataSource` | the top priority by default; strong monitoring; Druid's own auto-configuration must be excluded |
| [HikariCP](./hikaricp) | `com.zaxxer.hikari.HikariDataSource` | the Spring Boot default pool; fast, few knobs |
| [BeeCP](./beecp) | `cn.beecp.BeeDataSource` | lightweight and fast |
| [DBCP2](./dbcp2) | `org.apache.commons.dbcp2.BasicDataSource` | from Apache, good for legacy projects |
| [JNDI](./jndi) | — | the datasource is provided by the container (Tomcat / WebLogic …) |
| C3P0 | `com.mchange.v2.c3p0.ComboPooledDataSource` | global `c3p0.*` plus per-datasource overrides |
| Oracle UCP | `oracle.ucp.jdbc.PoolDataSourceImpl` | Oracle's own pool |
| Basic | — | not pooled at all; just a `DriverManager` wrapper, for tests |

## What happens when `type` is omitted

`type` is **not mandatory**. Without it the framework picks the **first pool available on the classpath**, in this order:

```text
Druid > HikariCP > BeeCP > DBCP2 > Basic
```

The order comes from the registration order of the `DataSourceCreator` implementations. `Basic` is the fallback — it does no pooling and opens a new connection every time, so it is **only suitable for tests or extremely low-frequency use**.

:::tip
Declare `type` explicitly in production. Otherwise, as soon as a dependency changes (say, some starter drags in Hikari), the datasource type is swapped behind your back and your parameters silently stop applying.
:::

## How parameters are inherited

```yaml
spring:
  datasource:
    dynamic:
      hikari:                     # global defaults, shared by every Hikari datasource
        maximum-pool-size: 20
        minimum-idle: 5
      datasource:
        master:
          type: com.zaxxer.hikari.HikariDataSource
          # no hikari.* → inherits the global values
        report:
          type: com.zaxxer.hikari.HikariDataSource
          hikari:
            maximum-pool-size: 4  # overrides this datasource only, the rest is still inherited
```

Merging is done by `ConfigMergeCreator`: global parameters are the baseline, per-datasource parameters override them field by field. So "set it once globally, fine-tune a few datasources" is safe — you do not have to copy the whole block into every datasource.

## Common pitfalls

### Which level do parameters belong to?

Pool parameters live at **two levels**, and the per-datasource one wins:

```yaml
spring:
  datasource:
    dynamic:
      druid:                # global default, applies to every datasource
        max-wait: 3000
      hikari:
        maximum-pool-size: 20
      datasource:
        master:
          druid:            # per-datasource override of the global value
            max-wait: 5000
```

- The framework does **not** read `spring.datasource.druid.*` (that belongs to `druid-spring-boot-starter`);
- The framework does **not** read `spring.datasource.hikari.*` (that is Spring Boot's default single-datasource configuration);
- It only reads `spring.datasource.dynamic.druid.*` and `spring.datasource.dynamic.datasource.<name>.druid.*`.

A large share of historical issues such as "`max-wait` has no effect" or "Hikari parameters are ignored" are simply parameters written at the wrong level ([#189](https://github.com/baomidou/dynamic-datasource/issues/189), [#254](https://github.com/baomidou/dynamic-datasource/issues/254), [#447](https://github.com/baomidou/dynamic-datasource/issues/447), [#418](https://github.com/baomidou/dynamic-datasource/issues/418)).

### Druid version compatibility window

| dynamic-datasource | druid | Outcome |
| :--- | :--- | :--- |
| ≤ 3.6.1 | 1.2.17+ | fails to start (construction changed), [#494](https://github.com/baomidou/dynamic-datasource/issues/494), [#497](https://github.com/baomidou/dynamic-datasource/issues/497), [#500](https://github.com/baomidou/dynamic-datasource/issues/500), [#506](https://github.com/baomidou/dynamic-datasource/issues/506) |
| 4.x | 1.2.x (recent) | fine |
| 4.2.x | 1.2.22 | autoconfigure conflict, must be excluded (see above) |

**Conclusion: stay on the latest dynamic-datasource 4.x with a recent druid, and exclude druid's auto-configuration.**

### Traps in frequently used parameters

**Druid**

- `max-wait` defaults to **-1 (wait forever)**: when the pool is exhausted requests hang instead of failing fast. Set it explicitly in production.
- `socket-timeout` / `connect-timeout`: added in druid 1.2.12+, **default 10 seconds** ([#455](https://github.com/baomidou/dynamic-datasource/issues/455), [#461](https://github.com/baomidou/dynamic-datasource/issues/461)) — a slow query may be cut off at 10s, so check these first when hunting a network timeout.
- the `wall` filter (SQL firewall): options such as `multi-statement-allow` belong in the **`wall` sub-block**, and `filters` must include `wall`:

```yaml
spring:
  datasource:
    dynamic:
      druid:
        filters: stat,wall
        wall:
          multi-statement-allow: true
```

([#5](https://github.com/baomidou/dynamic-datasource/issues/5), [#640](https://github.com/baomidou/dynamic-datasource/issues/640))

**Hikari**

- `connection-timeout` defaults to 30s; when the pool is full it throws `Connection is not available, request timed out after 30001ms` ([#231](https://github.com/baomidou/dynamic-datasource/issues/231)) — look for connection leaks and the pool ceiling before tuning the parameter.
- `initialization-fail-timeout: -1`: do not wait for a connection at startup, useful when one database being temporarily unreachable should not block startup.

### Monitoring

- **Hikari metrics**: 4.x ships a built-in Micrometer binding (`spring.datasource.dynamic.hikari-metrics.enabled`, default `true`) that registers metrics for every datasource. The historical "metrics not collected" issues [#626](https://github.com/baomidou/dynamic-datasource/issues/626) and [#734](https://github.com/baomidou/dynamic-datasource/issues/734) are solved in 4.x — upgrade if you are on an older version. Endpoint and metric semantics are described in [operations endpoint and metrics](../advanced/observability).
- **Druid monitoring page**: dynamic does **not** register druid's `StatViewServlet` automatically; register it yourself (or keep the monitoring configuration of the druid starter). Historical "monitoring page 404 / login name" problems ([#34](https://github.com/baomidou/dynamic-datasource/issues/34), [#154](https://github.com/baomidou/dynamic-datasource/issues/154), [#184](https://github.com/baomidou/dynamic-datasource/issues/184), [#443](https://github.com/baomidou/dynamic-datasource/issues/443)) are handled as described in [Druid integration](./druid):

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

## In this chapter

- [Connection pool essentials](./common) — the possible `type` values and the auto-selection order
- Dependency coordinates, the full parameter list and the pitfalls of each pool

## Notes

:::warning[Druid: exclude its own auto-configuration]
`druid-spring-boot-starter` registers a `DataSource` of its own, which conflicts with the dynamic datasource. Exclude its auto-configuration as described in [Druid integration](./druid).
:::

Two more points:

- Connection pools and JDBC drivers are **not bundled** with this framework; add them yourself and keep their versions aligned.
- Using **a different pool per datasource** is allowed, but unless you have a clear reason (a migration period, say) it is not recommended — parameters and monitoring become hard to keep consistent.
