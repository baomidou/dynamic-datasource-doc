# Adding/Removing Datasources at Runtime

## Overview

Multi-tenant systems often need this: when a new tenant arrives, **without restarting the application**, add a datasource; when the tenant leaves, take it away again.

`DynamicRoutingDataSource` offers `addDataSource` / `removeDataSource` for exactly this, and together with `DefaultDataSourceCreator` you can create any connection pool at runtime.

## Usage

```java
import com.baomidou.dynamic.datasource.DynamicRoutingDataSource;
import com.baomidou.dynamic.datasource.creator.DataSourceProperty;
import com.baomidou.dynamic.datasource.creator.DefaultDataSourceCreator;
import com.baomidou.dynamic.datasource.creator.jndi.JndiDataSourceCreator;
import org.springframework.beans.BeanUtils;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import javax.sql.DataSource;
import java.util.Set;

@RestController
@RequestMapping("/datasources")
public class DataSourceController {

    private final DataSource dataSource;
    private final DefaultDataSourceCreator dataSourceCreator;
    private final JndiDataSourceCreator jndiDataSourceCreator;

    public DataSourceController(DataSource dataSource,
                                DefaultDataSourceCreator dataSourceCreator,
                                JndiDataSourceCreator jndiDataSourceCreator) {
        this.dataSource = dataSource;
        this.dataSourceCreator = dataSourceCreator;
        this.jndiDataSourceCreator = jndiDataSourceCreator;
    }

    @GetMapping
    public Set<String> now() {
        DynamicRoutingDataSource ds = (DynamicRoutingDataSource) dataSource;
        return ds.getDataSources().keySet();
    }

    /**
     * generic add (recommended): DefaultDataSourceCreator picks the pool from the environment.
     * order: druid > hikaricp > beecp > dbcp2 > basic
     */
    @PostMapping("/add")
    public Set<String> add(@Validated @RequestBody DataSourceDTO dto) {
        DataSourceProperty property = new DataSourceProperty();
        BeanUtils.copyProperties(dto, property);

        DynamicRoutingDataSource ds = (DynamicRoutingDataSource) dataSource;
        DataSource newDataSource = dataSourceCreator.createDataSource(property);
        ds.addDataSource(dto.getPoolName(), newDataSource);
        return ds.getDataSources().keySet();
    }

    @PostMapping("/addJndi")
    public Set<String> addJndi(String poolName, String jndiName) {
        DynamicRoutingDataSource ds = (DynamicRoutingDataSource) dataSource;
        DataSource newDataSource = jndiDataSourceCreator.createDataSource(jndiName);
        ds.addDataSource(poolName, newDataSource);
        return ds.getDataSources().keySet();
    }

    @DeleteMapping
    public String remove(String name) {
        DynamicRoutingDataSource ds = (DynamicRoutingDataSource) dataSource;
        ds.removeDataSource(name);
        return "removed successfully";
    }
}
```

::::tip[Always use DefaultDataSourceCreator]
`DefaultDataSourceCreator` picks the pool according to the environment and **also handles lazy initialization, `ENC()` decryption and init scripts** automatically.

The individual creators (`DruidDataSourceCreator`, `HikariDataSourceCreator`, …) can be injected and used directly as well, but they bypass that unified handling — only use them when you know exactly why.
::::

## Behaviour details

`addDataSource(String name, DataSource dataSource)`:

- writes with `name` as the key, overwriting (an existing datasource with the same name is replaced)
- **automatically assigns the new datasource to its group** by the naming rules — adding `slave_3` puts it into the `slave` group and makes it a load-balanced member
- the method is `synchronized`, so it is concurrency-safe

`removeDataSource(String name)`:

- the name must not be empty
- once the last member of a group is removed, **the group itself is cleaned up**
- also `synchronized`

## Notes

::::danger[Do not remove a datasource that is still in use]
`removeDataSource` only takes the datasource out of the routing table; it does **not** wait for your in-flight requests to finish.

If a thread happens to be taking a connection from that datasource right then, it gets `null` and throws a `NullPointerException` (strict mode cannot prevent this race either).

The correct production procedure has two steps:

1. **Drain the traffic first**: take the database out of its group (rename it, for instance, so the `slave` group no longer contains it) and wait for in-flight requests to finish
2. **Then remove it**: call `removeDataSource` once you are sure there are no active connections

You can also enable [`grace-destroy`](./graceful-shutdown) so the pool waits for active connections to be returned before closing.
::::

Two more points:

- Datasources added at runtime are **included in the Actuator endpoint** as well, which is a quick way to verify that the addition worked — see [operations endpoint and metrics](./observability).
- If the datasource list comes from outside (a config center, a bootstrap database), implementing `DynamicDataSourceProvider` fits better — see [custom datasource provider](../custom/datasource-provider).

## FAQ

### In a clustered / multi-instance deployment, does every machine have to call add?

Yes. `addDataSource` only affects **the current JVM** ([#233](https://github.com/baomidou/dynamic-datasource/issues/233)). There are three common approaches:

1. Every instance loads the **full list** from the same source (bootstrap database / config center) at startup and never adds or removes anything at runtime;
2. Management operations are **broadcast** to all instances through MQ or a pub/sub channel;
3. The datasource configuration is handed to a config center entirely and you wire up refreshing yourself (the framework ships no built-in refresh).

### How do I store the datasource list itself in a database?

Extend `AbstractJdbcDataSourceProvider` and return a `Map<String, DataSourceProperty>` loaded from the bootstrap database ([#107](https://github.com/baomidou/dynamic-datasource/issues/107), [#302](https://github.com/baomidou/dynamic-datasource/issues/302)). The bootstrap database's own connection information still lives in the configuration file — that is what "bootstrap" means here. The full extension guide is in [custom datasource provider](../custom/datasource-provider).

### Does startup fail when the bootstrap database has no rows?

A custom provider returning `null` or an empty Map used to throw an NPE on older versions ([#302](https://github.com/baomidou/dynamic-datasource/issues/302)); the current version tolerates `null` (you get an empty list and a warning log at startup). When writing your own provider, still handle the empty case defensively.

### What happens if I add a datasource with the same name twice?

**The same name replaces**: the old pool is closed and the new one takes effect. This can be used for a rolling "swap the database without downtime".

### What if add/remove collides with requests in flight?

Both methods are `synchronized`, and the routing side also guards against "a concurrent read at the exact moment of removal" (a `null` connection is never handed to the caller). On the business side you should still drain traffic before removing, as described in the [notes](#notes) above.

## Source analysis

`DataSourceCreator` is the common abstraction for creators; `DefaultDataSourceCreator` takes the first implementation whose `support()` returns `true`, in registration order:

```java
public interface DataSourceCreator {

    /**
     * create a datasource from properties
     *
     * @param dataSourceProperty datasource properties
     * @return the created datasource
     */
    DataSource createDataSource(DataSourceProperty dataSourceProperty);

    /**
     * whether this creator can create a datasource from these properties
     *
     * @param dataSourceProperty datasource properties
     * @return whether it is supported
     */
    boolean support(DataSourceProperty dataSourceProperty);
}
```

- `BasicDataSourceCreator` uses Spring's native creation path, supports only the most basic configuration and does **no pooling**.
- `JndiDataSourceCreator` is special: it looks the datasource up in the container directly by `jndiName` and does not take part in the `support()` auto-selection chain.
- The remaining implementations cover Druid / HikariCP / BeeCP / DBCP2 / C3P0 / Oracle UCP / Atomikos.

## Sample project

[https://github.com/dynamic-datasource/dynamic-datasource-samples/tree/master/spring-boot-4/add-remove-datasource-sample](https://github.com/dynamic-datasource/dynamic-datasource-samples/tree/master/spring-boot-4/add-remove-datasource-sample)
