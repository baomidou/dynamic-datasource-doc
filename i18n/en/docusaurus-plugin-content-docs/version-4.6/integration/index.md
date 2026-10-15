# Third-Party Integrations

This chapter covers how to combine multiple datasources with commonly used middleware.

| Component | Why integrate it | Key point |
| :--- | :--- | :--- |
| [MyBatis-Plus](./mybatis-plus) | let `@DS` coexist with MP's `ServiceImpl` and pagination plugin | methods that carry MP's own transaction cannot switch databases, work around them |
| [P6spy](./p6spy) | print SQL with the real parameter values | enable globally or per datasource; keep it off in production |
| [Quartz](./quartz) | let the scheduler use a dedicated database, or one of the dynamic datasources | JDBC JobStore and `@QuartzDataSource` |
| [ShardingSphere](./sharding-jdbc) | combine "sharding + multiple datasources" | take over with a custom `DynamicDataSourceProvider` |

:::tip
Most integrations need no special support from this framework — `DynamicRoutingDataSource` is itself a plain `DataSource`, so anything that accepts a `DataSource` can be plugged in directly.
:::
