---
title: "Graceful Shutdown"
description: "During a rolling release or a scale-down, the shutdown signal reaching the container triggers DataSource.close() immediately. If SQL is still in flight, the connections are closed forcibly and clients receive an SQLException — which shows up as occasional request failures during a release."
---

# Graceful Shutdown

## The problem

During a rolling release or a scale-down, the shutdown signal reaching the container triggers `DataSource.close()` immediately. If SQL is still in flight, the connections are closed forcibly and clients receive an `SQLException` — which shows up as **occasional request failures during a release**.

## How to enable it

```yaml
spring:
  datasource:
    dynamic:
      grace-destroy: true   # default false
```

Once enabled, the framework waits for "active connections to be returned" before destroying a datasource, for at most **10 seconds**, then closes it forcibly.

## How it works

Destruction takes two steps:

1. **Liveness wait**: a single thread named `close-datasource` polls every `100ms`; as long as active connections remain it keeps waiting, and it breaks out of the loop once the total exceeds `10s`.
2. **Execute close**: the datasource's own `close()` method is invoked reflectively, then a log entry is written.

Liveness is checked by the built-in detectors, which currently cover:

| Detector | Supported datasources |
| :--- | :--- |
| `HikariDataSourceActiveDetector` | HikariCP |
| `DruidDataSourceActiveDetector` | Druid |
| `Dhcp2DataSourceActiveDetector` | DBCP2 (`org.apache.commons.dbcp2.BasicDataSource`) |

## Notes

:::warning[Unsupported datasources wait the full 10 seconds]
If a datasource type matches no detector (for example **BeeCP, C3P0, Oracle UCP, JNDI or the non-pooled basic datasource**), the liveness check cannot tell whether connections are active and simply **waits until the 10 second timeout** before closing.

- Application shutdown therefore always takes 10 extra seconds
- This is known behaviour, not a hang

If you use one of those pools and do not want a slower shutdown, keep `grace-destroy` at `false` and drain traffic at the container level instead, with a `preStop` hook or `terminationGracePeriodSeconds`.
:::

Two more points:

- The check **only looks at the pool's own active connection count**; it cannot see application logic that is still running and has not acquired a connection yet.
- The feature also applies to datasources added dynamically at runtime (they are destroyed by the same routing datasource).

## Working together with a graceful container shutdown

`grace-destroy` solves "do not close connections forcibly", but a complete graceful shutdown also needs:

1. Remove the instance from the load balancer first (in Kubernetes this is usually `preStop` combined with `sleep`)
2. Then stop the application
3. Let this feature wait for in-flight connections while the application shuts down
4. Make sure `terminationGracePeriodSeconds` is larger than "traffic drain wait + 10s"

```yaml
# Kubernetes Deployment snippet
spec:
  terminationGracePeriodSeconds: 40
  containers:
    - name: app
      lifecycle:
        preStop:
          exec:
            command: ["sh", "-c", "sleep 10"]   # drain traffic first
```

## Further reading

- [Full configuration reference](../guide/configuration)
- [Adding/removing datasources at runtime](./add-remove-datasource) — what to watch out for when removing a single database at runtime