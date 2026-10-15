# Transaction FAQ

Reading [why you cannot switch datasources inside a transaction](./basics) first is recommended; this page focuses on the easiest pitfalls to hit.

The core premise is a single sentence: **a native Spring transaction guarantees that the whole thread gets the same `Connection` for the duration of the transaction.**

## Can the native `@Transactional` be used together with `@DS`?

Yes, but mind the execution order.

```java
public class AService {

    @DS("a")
    @Transactional
    public void doSomething() {
        // some code
    }
}
```

The framework's `@DS` aspect has a higher priority than the transaction aspect by default, so it **switches to a first and then opens the transaction**. Inside the transaction, neither the annotation nor a manual `DynamicDataSourceContextHolder.push` can switch away — datasource a is used throughout.

:::tip
As long as you are sure that "no datasource switch happens inside the transaction", prefer the native `@Transactional` — its semantics are more complete (savepoints, read-only transactions, isolation levels), while `@DSTransactional` exists specifically to fill the cross-database gap.
:::

## What does "local and native transactions cannot be mixed" mean?

### Scenario 1: calling a local transaction from inside a native transaction

```java
public class AService {

    @DS("a")
    @Transactional
    public void doSomething() {
        bService.doSomething();  // database B, marked @DS("b") + @DSTransactional
        cService.doSomething();  // database C, marked @DS("c") + @DSTransactional
    }
}
```

Result: **everything runs on database a**. The outer native transaction has already locked the connection to a, so the inner `@DSTransactional` can only open a savepoint on that same connection and cannot switch away.

### Scenario 2: calling native transactions from inside a local transaction

```java
public class AService {

    @DS("a")
    @DSTransactional
    public void doSomething() {
        aMapper.updateSomeThing();
        bService.doSomething();  // database B, marked @DS("b") + @Transactional
        cService.doSomething();  // database C, marked @DS("c") + @Transactional
    }
}
```

Result: **B and C are each an independent transaction**.

- If C fails, does B roll back? No — B has already committed.
- Does A roll back? Yes.

:::danger
**Mixing them is not recommended.** Once mixed, transaction boundaries no longer match the nesting structure of the code, which makes problems extremely hard to locate. Unless you fully master the execution flow, keep to "one business entry point uses one transaction strategy".
:::

## The canonical way to write a local transaction

Open it at the outermost level only; inner layers just switch datasources and must not add transaction annotations:

```java
public class AService {

    @DS("a")
    @DSTransactional   // opening it at the outermost level is enough
    public void doSomething() {
        aMapper.updateSomeThing();
        bService.doSomething();  // database B, marked with @DS("b") only
        cService.doSomething();  // database C, marked with @DS("c") only
    }
}
```

## `@DSTransactional` rollback did not happen?

Work through this list:

1. **The exception was swallowed.** The business code caught it with `try/catch` without rethrowing, so the transaction never learned about the failure.
2. **It was excluded by `noRollbackFor`.** Note that `@DSTransactional`'s `rollbackFor` defaults to `{Exception.class}`, so **every exception (checked ones included) rolls back by default** — this differs from Spring's `@Transactional`, which by default only rolls back on `RuntimeException` / `Error`.
3. **The method is not public**, or a `this` self-invocation happened (AOP did not intercept it).
4. **A native `@Transactional` got mixed in**, taking later operations out of the local transaction's orchestration (see scenario 1 above).
5. **The commit phase failed.** `@DSTransactional` commits database by database; if one database fails during `commit`, the databases committed before it cannot be rolled back — this shows up in the log as an exception right after `dynamic-datasource commit local tx`. The framework then throws `TransactionSystemException: Could not commit local tx [...]`; **do not let the caller treat that as success**.

## Further reading

- [Transaction guide](./) — the decision tree and the comparison of options
- [Local multi-datasource transactions](./local-tx) — propagation behaviour and transaction event listeners
- [Troubleshooting switching failures](../guide/switching-failure) — the list of non-transaction failure causes
