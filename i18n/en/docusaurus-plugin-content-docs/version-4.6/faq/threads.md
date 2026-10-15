# @DS and Threads: Async, Thread Pools, Cross-Database Contamination

> Related issues: [#74](https://github.com/baomidou/dynamic-datasource/issues/74), [#147](https://github.com/baomidou/dynamic-datasource/issues/147), [#399](https://github.com/baomidou/dynamic-datasource/issues/399), [#502](https://github.com/baomidou/dynamic-datasource/issues/502), [#536](https://github.com/baomidou/dynamic-datasource/issues/536), [#550](https://github.com/baomidou/dynamic-datasource/issues/550), [#664](https://github.com/baomidou/dynamic-datasource/issues/664), [#673](https://github.com/baomidou/dynamic-datasource/issues/673), [#554](https://github.com/baomidou/dynamic-datasource/issues/554), [#708](https://github.com/baomidou/dynamic-datasource/issues/708)

## Symptoms

- SQL executed inside `@Async` methods, thread pool tasks, `CompletableFuture.supplyAsync` or `parallelStream` does not switch and goes to the primary;
- occasional "cross-database contamination" under load: request A hits database B ([#554](https://github.com/baomidou/dynamic-datasource/issues/554), [#708](https://github.com/baomidou/dynamic-datasource/issues/708)).

## Root cause

The switching context, `DynamicDataSourceContextHolder`, is based on a **`ThreadLocal` (private to the thread)**:

- the parent thread's switch result **is not propagated to child threads** automatically — child threads default to the primary;
- pool threads are reused: if a task `push`es without a matching `poll`/`clear`, the leftover key contaminates **every later task on that thread**, which is the typical source of "cross-database contamination";
- the transaction context (the xid of `@DSTransactional`, the connection binding of Spring's `@Transactional`) does not cross threads either.

## Solutions (in order of preference)

### Option A: move the switch inside the child thread (recommended)

Do not switch in the parent thread and then submit the task; let the task **itself** call a `@DS`-annotated proxied method:

```java
@Async
public void syncUser(Long id) {
    userService.selectFromSlave(id);   // goes through the proxied @DS method, switching inside the child thread
}
```

### Option B: wrap the task body with a manual push / poll

For cases where annotations cannot be used:

```java
executor.submit(() -> {
    DynamicDataSourceContextHolder.push("slave");
    try {
        // ... business SQL
    } finally {
        DynamicDataSourceContextHolder.poll();   // must be paired, otherwise the pool is polluted
    }
});
```

### Option C: give the thread pool context propagation (TransmittableThreadLocal)

Alibaba's TTL lets the parent thread's context be "carried" into the task automatically (community suggestions in [#550](https://github.com/baomidou/dynamic-datasource/issues/550), [#664](https://github.com/baomidou/dynamic-datasource/issues/664)). The framework itself keeps its `NamedThreadLocal` unchanged, so you need to decorate the pool yourself to get that semantics:

```java
ExecutorService ttlExecutor = TtlExecutors.getTtlExecutorService(rawExecutor);
// and apply the TtlThreadLocal propagation strategy to dynamic-datasource's ThreadLocal
// (an advanced customization; only enable it when you really need it globally)
```

:::warning[Trade-off]
TTL makes every task inherit the parent thread's database choice, and **implicit propagation tends to cause contamination problems of its own in complex call chains**. In most cases option A is enough.
:::

## Transactions and threads

- `@DSTransactional` does **not** cross threads: submitting a pool task from inside a transaction leaves the new thread outside the transaction; the same goes for Spring's `@Transactional`, since the connection is bound to the thread;
- if the child thread needs a transaction, let it **open one itself** (call a proxied method annotated with `@Transactional` / `@DSTransactional`);
- see the semantic boundaries section of [local multi-datasource transactions](../tx/local-tx).

## Cross-database contamination checklist

| # | Check |
| :--- | :--- |
| 1 | does every manual `push` have a matching `poll()` or `clear()` in a `try/finally` |
| 2 | did you do anything unusual on the request-handling thread that switches without restoring |
| 3 | do interceptors/filters restore the switch on every exit path, including exceptions |
| 4 | do you rely on the assumption "the child thread inherits the parent's datasource" (it does not) |
| 5 | when reproducing under load, turn on debug logging and confirm that the contaminated request's `switch to the datasource named [...]` matches the expected key |

## Common misconceptions

- switching with `@DS` in the parent thread and then running the work in a `CompletableFuture` — **the child thread cannot see it**;
- multi-tenancy pushing `(tenant)` in a filter and then starting async work in the service — **the async part gets nothing** ([#147](https://github.com/baomidou/dynamic-datasource/issues/147));
- calling a `@DS`-annotated proxied method inside the async task (or pushing/polling manually inside the task) — **correct**.

## Further reading

- [Manual datasource switching](../advanced/manual-switching) — the push/poll pairing requirement
- [@DS not working checklist](./not-working)
- [No switching inside a transaction](./tx-inside)
- [Automatic read/write splitting](../no-annotation/mybatis-read-write) — switching centrally in a filter/interceptor
