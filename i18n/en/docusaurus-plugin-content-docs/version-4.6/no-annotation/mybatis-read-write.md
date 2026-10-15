# Automatic Read/Write Splitting

Scenario:

1. A pure read/write splitting environment: every write goes to master, every read goes to slave.
2. You do not want to configure this with annotations.

Answer: in a MyBatis environment you can build this on top of a MyBatis plugin combined with this framework.

Register the plugin manually.

```java
@Bean
public MasterSlaveAutoRoutingPlugin masterSlaveAutoRoutingPlugin(){
    return new MasterSlaveAutoRoutingPlugin();
}
```

The primary is named `master` and the replica is named `slave` by default.

Nothing beyond that is supported for now; the source is simple and can be rewritten to fit your needs.

```java
@Intercepts({@Signature(type = Executor.class, method = "query", args = {MappedStatement.class, Object.class, RowBounds.class, ResultHandler.class}),
        @Signature(type = Executor.class, method = "update", args = {MappedStatement.class, Object.class})})
@Slf4j
public class MasterSlaveAutoRoutingPlugin implements Interceptor {

    private static final String MASTER = "master";

    private static final String SLAVE = "slave";

    @Override
    public Object intercept(Invocation invocation) throws Throwable {
        Object[] args = invocation.getArgs();
        MappedStatement ms = (MappedStatement) args[0];
        try {
            DynamicDataSourceContextHolder.push(SqlCommandType.SELECT == ms.getSqlCommandType() ? SLAVE : MASTER);
            return invocation.proceed();
        } finally {
            DynamicDataSourceContextHolder.clear();
        }
    }

    @Override
    public Object plugin(Object target) {
        return target instanceof Executor ? Plugin.wrap(target, this) : target;
    }

    @Override
    public void setProperties(Properties properties) {
    }
}
```

## Behaviour notes

- `SELECT` → `slave` (group); `INSERT/UPDATE/DELETE` → `master` (group) — **writes can never be routed to a replica**; this is a design constraint ([#687](https://github.com/baomidou/dynamic-datasource/issues/687)).
- Inside a Spring transaction the transactional connection is already bound (usually to the primary), so the plugin's switch **does not change the bound connection** — reads and writes inside a transaction all go to the same database, which naturally avoids "inconsistent reads and writes inside a transaction".
- It only takes effect at the MyBatis layer; other access paths such as `JdbcTemplate` are not controlled.

The plugin is hard-coded to the two keys `master` / `slave`; naming the members `master_1`, `slave_1`, `slave_2` gives you in-group load balancing — see [custom load balancing strategy](../custom/load-balance-strategy).

## Three ways to implement it

| Approach | Use case | Mechanism |
| :--- | :--- | :--- |
| explicit `@DS("slave")` | you want precise control over which database each query hits | AOP aspect |
| `MasterSlaveAutoRoutingPlugin` | pure read/write splitting without touching the code | MyBatis interceptor: `SELECT` goes to `slave` automatically, everything else to `master` |
| combined with ShardingSphere | you also need sharding | ShardingSphere owns sharding, dynamic owns the multiple datasources |

::::warning[Do not configure read/write splitting twice]
If ShardingSphere already handles sharding plus read/write splitting, do not let this framework's plugin route a second time — "double routing" may send traffic to a database you did not expect ([#314](https://github.com/baomidou/dynamic-datasource/issues/314), [#690](https://github.com/baomidou/dynamic-datasource/issues/690)).
::::

## Further reading

- [Custom load balancing strategy](../custom/load-balance-strategy) — group name rules and the failover FAQ
- [Integrating ShardingJDBC](../integration/sharding-jdbc)
- [@DS and threads](../faq/threads) — why a switch made in an interceptor must be restored
