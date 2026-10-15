# Advanced Usage

This chapter covers the runtime capabilities that go beyond "switching databases with `@DS`". Ordered by how often they are used:

| Topic | Description |
| :--- | :--- |
| [Adding/removing datasources at runtime](./add-remove-datasource) | add and remove datasources while running — the foundation of multi-tenant systems |
| [Operations endpoint and metrics](./observability) | an Actuator endpoint listing datasources and groups, plus connection pool Micrometer metrics |
| [Graceful shutdown](./graceful-shutdown) | wait for active connections before closing, avoiding request failures during a release |
| [Dynamic datasource resolution](./dynamic-datasource-resolution) | decide which database to use from header / session / SpEL |
| [Database password encryption](./encryption) | `ENC(...)` for url / username / password |
| [Startup init scripts](./init-scripts) | run schema and data scripts per database |
| [Lazy datasource startup](./lazy-datasource) | create the connection pool only on first use |
| [Startup without datasources](./no-datasource-startup) | start with no datasource configured at all, adding them later |
| [Manual datasource switching](./manual-switching) | switch by hand with the toolkit when annotations do not cover the case |
| [Manual multi-datasource injection](./manual-injection) | what to do when you need to own the `DataSource` bean yourself |
| [Multi-tenancy in practice](../guide/multi-tenant) | four progressively stricter isolation models |

Want to drop annotations entirely? See the [no-annotation approach](../no-annotation/).
