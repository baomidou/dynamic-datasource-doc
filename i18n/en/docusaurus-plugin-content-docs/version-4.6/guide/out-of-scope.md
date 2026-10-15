# Out of Scope

This page spells out **what dynamic-datasource deliberately does not do**. Its scope is very narrow — "decide which `DataSource` a call uses" — and writing the boundaries down saves more useless debugging than ten extra pages of tutorials.

## What it explicitly does not do

| Not done | Explanation | What you need instead |
| :--- | :--- | :--- |
| **no built-in connection pool** | bring your own pool and JDBC driver; this project only adapts them | add Druid / HikariCP / BeeCP / DBCP2 / C3P0 / Oracle UCP yourself |
| **no ORM enhancements** | it does not take over mapping or SQL generation in MyBatis / JPA | — |
| **no SQL rewriting or sharding engine** | the MyBatis plugin only **switches datasource** by read/write rules; it never parses or rewrites SQL | use [ShardingSphere](../integration/sharding-jdbc) for sharding |
| **no distributed transaction kernel** | Seata and Atomikos are external integrations; this project only wires them in | Seata `AT`/`XA` or Atomikos XA |
| **no cross-thread transaction propagation** | the routing key and the transaction context are ThreadLocal-based by design | `push` explicitly inside the child thread; or move to Saga / eventual consistency with messaging |
| **no complete JPMS `module-info`** | the stable contract for the module name is `Automatic-Module-Name` in the manifest | — |
| **no cross-database JOIN / aggregation** | one call only ever gets a connection to one database | aggregate in the application layer, merge the databases, or move to a warehouse |
| **no data isolation strategy** | in multi-tenant scenarios it only does "switch database by tenant", never row-level filtering | implement tenant column filtering yourself; see [multi-tenancy in practice](./multi-tenant) |

## Why it is designed this way

1. **Doing routing only keeps it from fighting your stack.** No ORM, pool or transaction strategy is imposed, so you can adopt just the part you need.
2. **No transitive dependencies means no conflicts.** Your BOM owns the pool and driver versions, avoiding the version black hole that shaded packaging creates.
3. **Clear boundaries make problems fast to locate.** When something breaks you can always ask first: "is this a routing problem or my pool/transaction problem?"

## Common misuse at the boundaries

**Assuming it can do cross-database transactions**

```java
@DS("master")
@Transactional
public void doSomething() {
    orderMapper.insert(order);
    // this @DS("slave") has no effect — the transaction already locked the connection to the primary
    accountMapper.update(account);
}
```

When you need cross-database consistency, use `@DSTransactional` or Seata. See the [transaction guide](../tx/).

**Assuming it propagates into thread pools automatically**

```java
@DS("slave")
public void asyncQuery() {
    executor.submit(() -> {
        // this is another thread → the default datasource master is used, @DS("slave") has no effect
        return orderMapper.selectList(null);
    });
}
```

**Assuming `@DS` can police your SQL**

`@DS("slave")` only changes the connection; it does not stop you from writing to a replica. Correct read/write splitting depends on your own discipline in code, or on `MasterSlaveAutoRoutingPlugin` routing by SQL type automatically (see the [no-annotation approach](../no-annotation/mybatis-read-write)).

## Further reading

- [Getting started](./basics) — what it can do
- [@DS semantics and precedence](./ds-semantics) — how it does it
- [Troubleshooting switching failures](./switching-failure) — read this first when something breaks
