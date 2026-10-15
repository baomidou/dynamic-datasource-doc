# No Switching Inside a Transaction (Spring Batch / Quartz Included)

> Related issue: [#773](https://github.com/baomidou/dynamic-datasource/issues/773) (Spring Batch)

Read [how switching works under a transaction](../tx/basics) first; this page focuses on the class of problems where "an outer transaction is already open and `@DS` does nothing", and gives four workable solutions.

## Symptoms

`@DS("another database")` is present on the mapper/service, yet the SQL still hits the default primary and errors such as `Table 'xxx' doesn't exist` are raised. Commonly seen in:

- **Spring Batch** steps/tasklets that call a `@DS`-annotated mapper;
- `@Transactional` methods that call a `@DS`-annotated mapper;
- manual `TransactionTemplate` or third-party frameworks (ShedLock, Quartz, …) that **open the transaction first** and then run SQL.

## Root cause

`@DS` works by changing the lookup key on the thread (`DynamicDataSourceContextHolder`) **before a connection is acquired**. Spring's transaction semantics, on the other hand, say: **one `DataSource` instance binds exactly one connection per transaction**.

Taking Spring Batch as an example:

1. The step's `PlatformTransactionManager` wraps `DynamicRoutingDataSource`;
2. `TaskletStep` calls `getTransaction()` **before** invoking the tasklet. No `@DS` switch has happened yet, so `determineDataSource()` returns the primary and the primary's connection is bound to the thread;
3. `@DS("starrocks")` inside the tasklet does change the key, but MyBatis goes through `DataSourceUtils.getConnection()`, finds that a connection is already bound to the transaction for that `DataSource`, and **reuses the primary's connection**. Changing the key mid-transaction cannot replace an already bound connection.

In one sentence: **whichever database the transaction started with is the one used for the whole transaction; `@DS` must happen before the transaction starts.**

## Checklist

| # | Check | Notes |
| :--- | :--- | :--- |
| 1 | is there an outer Spring transaction | `@Transactional`, programmatic transactions, and transactions opened first by frameworks such as Spring Batch/Quartz all bind a connection |
| 2 | does the call go through the proxy | a self-invocation inside the same class (`this`) does not go through AOP, so `@DS` has no effect |
| 3 | is the annotation placed on a lambda/anonymous class | a `@Bean` returning a lambda Tasklet has no enhanceable target, so a class-level `@DS` has nowhere to attach |
| 4 | is `@DSTransactional` stacked on top | see option D; note that an outer Spring transaction still holds the primary's connection, so do not stack it with the step transaction |
| 5 | does the key on the mapper's `@DS` exist | a missing key falls back to primary silently in non-strict mode; set `spring.datasource.dynamic.strict=true` to make an unmatched key fail loudly |

## Solutions (using Spring Batch as the example)

### Option A: let the step run without a transaction (simplest)

Suited to cleanup-style tasklets such as `removeAll()`:

```java
@Bean
public Step syncCleanStep(JobRepository jobRepository) {
    // since Spring Batch 5 a tasklet step may be built without a transactionManager
    return new StepBuilder("syncCleanStep", jobRepository)
            .tasklet(syncCleanTasklet())
            .build();
}
```

Without a transaction, every mapper call takes its own connection and `@DS` switches normally.

### Option B: point the step at a transaction manager for the "target database"

Best when the step transaction only touches that database anyway:

```java
@Bean
public Step syncCleanStep(JobRepository jobRepository, DynamicRoutingDataSource routingDataSource) {
    DataSource starrocks = routingDataSource.getDataSource("starrocks");
    return new StepBuilder("syncCleanStep", jobRepository)
            .tasklet(syncCleanTasklet(), new DataSourceTransactionManager(starrocks))
            .build();
}
```

The transaction is opened on the target database's connection from the very beginning.

### Option C: make `@DS` happen before the transaction starts

Turn the lambda tasklet into a `@Component` class annotated with `@DS("starrocks")` so it can be advised by AOP.

The same reasoning applies to a plain `@Transactional` scenario — `@DS` must sit at the call site **outside** the transaction boundary (for example, in a `@DS` service method that then calls the `@Transactional` method):

```java
@DS("a")
public void outer() {
    innerService.doSomething();   // @Transactional inside, so the transaction is opened on a
}
```

### Option D: spanning several databases inside one transaction — switch to @DSTransactional

The framework's own transaction (`ConnectionFactory`) caches one proxy connection per database, keyed by **xid + database name**, so it naturally supports switching databases inside one "transaction"; a single Spring transaction can only bind one connection per `DataSource` and cannot do that.

:::warning[Do not stack it with an outer Spring transaction]
When using `@DSTransactional`, combine it with option A: do not stack another step transaction on the outside, otherwise it still binds the primary's connection to the thread first.
:::

See [local multi-datasource transactions](../tx/local-tx) and the [transaction FAQ](../tx/faq).

## Further reading

- [Local multi-datasource transactions](../tx/local-tx) — propagation behaviour and semantic boundaries of `@DSTransactional`
- [Transaction FAQ](../tx/faq) — the pitfalls of mixing native and local transactions
- [@DS and threads](./threads) — transaction boundaries in async call chains
- [@DS not working checklist](./not-working)
