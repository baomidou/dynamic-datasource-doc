# Operations Endpoint and Metrics

When troubleshooting multiple datasources in production, the first question is usually "which datasources exist right now, and how are they grouped". This framework provides a read-only Actuator endpoint that answers exactly that.

## Actuator endpoint

### Enabling it

The endpoint follows Actuator's own exposure rules and is **not exposed by default**:

```yaml
management:
  endpoints:
    web:
      exposure:
        include: dynamic-datasource
```

It requires Actuator 2.2+. On older Spring Boot versions, when the newer annotation classes are missing the whole auto-configuration is skipped through ASM, so no error is raised.

### Calling it

```text
GET /actuator/dynamic-datasource
```

Response structure:

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

What it is used for:

- `primary` / `strict` / `p6spy` / `seata` — confirm the **values actually in effect** for the four global switches, more reliable than reading the configuration
- `dataSources` — every datasource name together with its real pool type. Datasources added or removed at runtime show up here too, making it the fastest way to verify that "adding the database worked"
- `groups` — the group composition. When `@DS("slave")` does not load balance as expected, check here first to see whether the group looks the way you think it does

:::tip[Why no URL is returned]
The endpoint **deliberately does not return connection information such as the URL or the username** — a URL may carry credentials, and a status overview does not need them. This is an intentional trade-off, not a missing feature.
:::

## Connection pool metrics

If both **Micrometer** and **HikariCP** are on the classpath, the framework registers the metrics of every Hikari datasource into the `MeterRegistry` automatically. The metric names follow Spring Boot's Hikari naming (`hikaricp.connections.*`), and the `pool` tag distinguishes individual datasources.

```yaml
spring:
  datasource:
    dynamic:
      hikari-metrics:
        enabled: true   # default true
```

How to disable it:

```yaml
spring:
  datasource:
    dynamic:
      hikari-metrics:
        enabled: false
```

Behaviour details:

- **HikariCP only**. Druid users should rely on Druid's own `StatFilter` / `DruidStatViewServlet`; the framework does not forward them.
- Datasources that already set their own `metricRegistry` or `metricsTrackerFactory` are skipped — the framework never overrides your explicit configuration.
- A failed binding is only logged at `warn` level and does not stop the application from starting.

Combined with the `pool` tag you can watch whether a single database is being hammered:

```promql
# active connections per datasource
hikaricp_connections_active{pool="slave_1"}
```

## Adding and removing datasources at runtime

The endpoint only "looks"; use the `DynamicRoutingDataSource` API to add or remove:

```java
@Autowired
private DataSource dataSource;

public void addAndRemove() {
    DynamicRoutingDataSource ds = (DynamicRoutingDataSource) dataSource;

    // add or overwrite
    ds.addDataSource("slave_3", newDataSource);

    // remove (the group is cleaned up automatically once it becomes empty)
    ds.removeDataSource("slave_3");

    // every datasource currently registered
    Map<String, DataSource> all = ds.getDataSources();
}
```

The full example is in [adding/removing datasources at runtime](./add-remove-datasource).

:::warning
`addDataSource` / `removeDataSource` are `synchronized`, but **removing a datasource that is still in use will make that thread fail to obtain a connection**. In production, drain the traffic first (take the database out of its group, wait for in-flight requests to finish) before removing it.
:::

## Further reading

- [Adding/removing datasources at runtime](./add-remove-datasource)
- [Graceful shutdown](./graceful-shutdown)
- [Full configuration reference](../guide/configuration)
