# 自动读写分离

场景：

1. 在纯的读写分离环境，写操作全部是master，读操作全部是slave。
2. 不想通过注解配置完成以上功能。

答：在mybatis环境下可以基于mybatis插件结合本数据源完成以上功能。

手动注入插件。

```java
@Bean
public MasterSlaveAutoRoutingPlugin masterSlaveAutoRoutingPlugin(){
    return new MasterSlaveAutoRoutingPlugin();
}
```

默认主库名称master,从库名称slave。

暂不支持更多，源码简单可参考重写。


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

## 行为要点

- `SELECT` → `slave`（组）；`INSERT/UPDATE/DELETE` → `master`（组）——**增删改不可能路由到从库**，这是设计约束（[#687](https://github.com/baomidou/dynamic-datasource/issues/687)）；
- 位于 Spring 事务内时，事务连接已绑定（通常就是主库），插件的切换**不会改变已绑定的连接**——事务内读写都走同一库，天然规避「事务内读写不一致」；
- 只在 MyBatis 层生效，`JdbcTemplate` 等其他访问方式不受把控。

插件固定使用 `master` / `slave` 两个 key；把成员命名为 `master_1`、`slave_1`、`slave_2` 即可获得组内负载均衡，详见[自定义负载均衡策略](/docs/custom/load-balance-strategy)。

## 三种实现方式

| 方式 | 适用场景 | 机制 |
| :--- | :--- | :--- |
| `@DS("slave")` 显式注解 | 想精确控制每一次查询走哪个库 | AOP 切面 |
| `MasterSlaveAutoRoutingPlugin` | 纯读写分离、不想改代码 | MyBatis 拦截器：`SELECT` 自动走 `slave`，其余自动走 `master` |
| 与 ShardingSphere 组合 | 同时需要分库分表 | ShardingSphere 管分片，dynamic 管多数据源 |

:::warning[不要双重配置读写分离]
如果 ShardingSphere 已经承担了分片 + 读写分离，就不要再让本框架的插件做一次路由，避免「双重路由」导致预期之外的库被访问（[#314](https://github.com/baomidou/dynamic-datasource/issues/314)、[#690](https://github.com/baomidou/dynamic-datasource/issues/690)）。
:::

## 相关文档

- [自定义负载均衡策略](/docs/custom/load-balance-strategy) —— 组名规则与故障转移 FAQ
- [集成 ShardingJDBC](/docs/integration/sharding-jdbc)
- [@DS 与线程](/docs/faq/threads) —— 拦截器里统一切换时的还原要求


