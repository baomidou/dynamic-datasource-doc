---
title: "Atomikos XA Transactions"
description: "Atomikos as a standard XA two-phase-commit transaction manager for a single process: dependency windows, datasource configuration, transaction-manager wiring, programmatic JTA, and the pitfalls to avoid."
---

# Atomikos XA Transactions

Atomikos is the classic JTA transaction manager. It lets several datasources of a **single process** take part in one global transaction through XA two-phase commit (2PC).

:::tip[When to use it]
- Several databases inside one monolith, and you need **strong consistency** (best-effort rollback is not acceptable) → use Atomikos.
- Plain multi-database local transactions → use [`@DSTransactional`](/docs/tx/local-tx), it is lighter.
- Across services → use [Seata](/docs/tx/seata).

See the [transaction selection guide](/docs/tx) for the full comparison.
:::

## Dependencies and version window

Atomikos 6.0.0 is the first **jakarta** line; Atomikos 5 and older are javax-only:

| Spring Boot | starter | Atomikos |
| :--- | :--- | :--- |
| 1.5 ~ 2.x | `dynamic-datasource-spring-boot-starter` | 4.x / 5.x (javax, no classifier) |
| 3.x | `dynamic-datasource-spring-boot3-starter` | **6.0.x, the `jakarta` classifier is required** |
| 4.x | `dynamic-datasource-spring-boot4-starter` | **6.0.x, the `jakarta` classifier is required** |

Two dependency details that are easy to miss:

1. Spring Boot's BOM does **not** manage the Atomikos version — declare it yourself.
2. `transactions-jta` declares `jakarta.transaction:jakarta.transaction-api` as **provided**, so it is not transitive. Without it Boot's JTA auto-configuration backs off, the transaction manager falls back to `JdbcTransactionManager`, and **no XA happens at all**.

```xml
<dependency>
    <groupId>com.atomikos</groupId>
    <artifactId>transactions-jdbc</artifactId>
    <version>6.0.1</version>
    <classifier>jakarta</classifier>
</dependency>
<dependency>
    <groupId>com.atomikos</groupId>
    <artifactId>transactions-jta</artifactId>
    <version>6.0.1</version>
    <classifier>jakarta</classifier>
</dependency>
<!-- provided in transactions-jta, never transitive: declare it explicitly -->
<dependency>
    <groupId>jakarta.transaction</groupId>
    <artifactId>jakarta.transaction-api</artifactId>
</dependency>
```

:::warning[Atomikos 6 is incompatible with dynamic-datasource ≤ 4.6.0]
Atomikos 6.0.0 removed `AtomikosDataSourceBean#setReapTimeout(int)`. dynamic-datasource 4.6.0 and older fail at startup with
`NoSuchMethodError: 'void com.atomikos.jdbc.AtomikosDataSourceBean.setReapTimeout(int)'`
([issue #822](https://github.com/baomidou/dynamic-datasource/issues/822)). Upgrade to a build that contains the fix.
:::

## Datasource configuration

An Atomikos datasource **must declare `type` explicitly**: the framework picks the first available creator by registration order, and both HikariCP and Druid rank ahead of Atomikos. Without `type` they claim the datasource and try to load the XA class as a `java.sql.Driver`, which fails at startup with `Failed to load driver class`.

```yaml
spring:
  datasource:
    dynamic:
      primary: master
      atomikos:                      # global pool tuning, per-datasource overrides apply on top
        min-pool-size: 1
        max-pool-size: 10
        borrow-connection-timeout: 30
        max-idle-time: 60
        maintenance-interval: 60
      datasource:
        master:
          # ① type is required
          type: com.atomikos.jdbc.AtomikosDataSourceBean
          # ② driver-class-name points at the XA datasource class (not a plain JDBC Driver)
          driver-class-name: com.mysql.cj.jdbc.MysqlXADataSource
          # ③ url / username / password are handed to the XA datasource as-is
          url: jdbc:mysql://xx.xx.xx.xx:3306/dynamic
          username: root
          password: root
```

Built-in XA datasource classes (see `XADataSourceEnum`):

| Database | XA datasource class |
| :--- | :--- |
| MySQL 8+ | `com.mysql.cj.jdbc.MysqlXADataSource` |
| MySQL 5.1 | `com.mysql.jdbc.jdbc2.optional.MysqlXADataSource` |
| Oracle | `oracle.jdbc.xa.client.OracleXADataSource` |
| PostgreSQL | `org.postgresql.xa.PGXADataSource` |
| H2 | `org.h2.jdbcx.JdbcDataSource` |

:::note
XA classes of other databases are not in the enum, so the Atomikos creator will **not** claim them — write a custom `DataSourceCreator`.
:::

Pool parameters (`spring.datasource.dynamic.atomikos.*` or `datasource.<name>.atomikos.*`):

| Parameter | Default | Meaning |
| :--- | :--- | :--- |
| `min-pool-size` | 1 | minimum connections |
| `max-pool-size` | 10 | maximum connections |
| `borrow-connection-timeout` | 30 | seconds to wait for a connection when the pool is empty |
| `reap-timeout` | 0 | maximum seconds a connection may be borrowed; **removed in Atomikos 6**, effective on 4/5 |
| `max-idle-time` | 60 | seconds an idle connection above `min-pool-size` is kept |
| `test-query` | `SELECT 1` | validation statement run before a connection is returned |
| `maintenance-interval` | 60 | seconds between pool maintenance runs |
| `default-isolation-level` | -1 | default isolation level, negative values are ignored |
| `max-lifetime` | 60 | maximum seconds a connection lives, 0 means unlimited |

`uniqueResourceName` (Atomikos requires a unique name per XA resource) defaults to the datasource key — keep the keys unique when adding datasources manually.

## Wiring the transaction manager

Boot 3 and earlier auto-configured Atomikos' `UserTransactionManager`; **since Boot 4 the JTA auto-configuration only ships the JNDI variant, so declare it yourself**:

```java
@Configuration
public class JtaConfig {
    @Bean(initMethod = "init", destroyMethod = "close")
    public UserTransactionManager userTransactionManager() {
        return new UserTransactionManager();
    }

    @Bean
    public JtaTransactionManager transactionManager(UserTransactionManager tm) {
        return new JtaTransactionManager(tm, tm);
    }
}
```

Atomikos writes its transaction log to `transaction-logs` (and `tmlog*.log`) in the working directory; after an abnormal exit the next start performs recovery, which is expected behaviour.

## Transactions: use programmatic JTA with multi-datasource MyBatis

**Do not use Spring's `@Transactional` with multi-datasource MyBatis.**

MyBatis-Spring reuses one `SqlSession` (and therefore one `Connection`) for the whole Spring transaction, and that connection is bound to the datasource current at the **first statement** of the transaction — every later `@DS` switch is ignored, so cross-database writes all land on the first datasource. The tell-tale symptom is `Table not found` on the second database.

Use **programmatic JTA** instead: no Spring transaction synchronization is registered, every mapper call takes its own connection routed by the current `@DS`, Atomikos enlists those connections into the active JTA transaction, and `commit` runs two-phase commit over all enlisted XA resources.

```java
@DS("order")
public void placeOrder(PlaceOrderRequest request) {
    try {
        userTransactionManager.begin();
        orderMapper.insert(order);                          // -> order datasource
        accountService.deduct(request.getUserId(), amount);  // @DS("account") -> account datasource
        userTransactionManager.commit();                    // 2PC over two XA resources
    } catch (RuntimeException e) {
        userTransactionManager.rollback();                  // both databases roll back
        throw e;
    } catch (Exception e) {
        userTransactionManager.rollback();
        throw new IllegalStateException("JTA transaction failed", e);
    }
}
```

Code that touches a single database can still use Spring's `@Transactional` (with the `JtaTransactionManager` above).

## MyBatis needs AtomikosTransactionFactory

```java
@Bean
public SqlSessionFactory sqlSessionFactory(DataSource dataSource) throws Exception {
    SqlSessionFactoryBean factoryBean = new SqlSessionFactoryBean();
    factoryBean.setDataSource(dataSource);
    // resolves the real datasource by the current @DS before each MyBatis transaction
    factoryBean.setTransactionFactory(new AtomikosTransactionFactory());
    return factoryBean.getObject();
}
```

Also declare `sqlSessionFactoryRef = "sqlSessionFactory"` on `@MapperScan` so the bean is not resolved by type under AOT.

:::note
This configuration class needs both MyBatis and mybatis-spring on the classpath (they come from the MyBatis / MyBatis-Plus starter you already use); otherwise the whole Atomikos auto-configuration group is skipped.
:::

## Do not create tables via init.schema on XA datasources

`spring.datasource.dynamic.datasource.<name>.init.schema` runs on a connection taken from the XA pool. Atomikos does not commit while no transaction manager is running, so the uncommitted DDL is rolled back when the connection returns — the table is never created (startup succeeds, the first query fails with `Table not found`).

Create the tables with a plain (auto-commit) connection, or let Flyway / Liquibase own the schema.

## Sample project

[tx-atomikos-sample](https://github.com/dynamic-datasource/dynamic-datasource-samples/tree/master/spring-boot-4/tx-atomikos-sample)

The sample is **Boot 4 + Atomikos 6 (jakarta) + MyBatis + two H2 XA datasources**: a simulated order writes to the order database and deducts the balance in the account database, both XA resources commit in one JTA transaction, and an insufficient balance rolls both back. The tests cover the 2PC commit and the rollback, no Docker needed.

## Common problems

| Symptom | Cause and fix |
| :--- | :--- |
| `NoSuchMethodError: setReapTimeout(int)` at startup | Atomikos 6 removed the method; dynamic-datasource ≤ 4.6.0 is incompatible, upgrade ([#822](https://github.com/baomidou/dynamic-datasource/issues/822)) |
| `Failed to load driver class` at startup | `type: com.atomikos.jdbc.AtomikosDataSourceBean` is missing, so Hikari/Druid claimed the datasource |
| The transaction manager is a `JdbcTransactionManager` | `jakarta.transaction-api` is missing, or Boot 4 has no `JtaTransactionManager` declared |
| `Table not found` on the second database | Spring `@Transactional` + MyBatis disabled the `@DS` switch; use programmatic JTA |
| The table is never created | `init.schema` on an XA pool does not commit; create it with a plain connection |
| `uniqueResourceName` conflict | Atomikos requires unique XA resource names; dynamic-datasource uses the datasource key, so do not reuse it |

## Further reading

- [Transaction selection guide](/docs/tx) — decision tree and comparison
- [Local multi-datasource transactions](/docs/tx/local-tx) — the full `@DSTransactional` guide
- [Seata transactions](/docs/tx/seata) — the cross-service option
- [Connection pools](/docs/pool) — creator priority and parameter inheritance
