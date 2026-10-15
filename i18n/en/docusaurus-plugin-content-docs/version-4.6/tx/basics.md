---
title: "Why You Cannot Switch Datasources Inside a Transaction"
description: "This is the most frequently asked question about multiple datasources. The answer is not complicated, but it deserves its own page."
---

# Why You Cannot Switch Datasources Inside a Transaction

This is the most frequently asked question about multiple datasources. The answer is not complicated, but it deserves its own page.

## Core mechanism

Two things happen at the same time, and together they break the switch:

**1. Datasource switching is "take a connection when asked"**

`@DS` only pushes a datasource name onto the current thread's ThreadLocal stack. The moment that actually decides which database is used is **every acquisition of a `Connection`** — the framework reads the key from the top of the ThreadLocal stack and looks up the matching datasource.

**2. A Spring transaction "locks the connection up front"**

When `@Transactional` opens a transaction it takes a `Connection` from the datasource and binds it to the current thread (`TransactionSynchronizationManager`). For the whole lifetime of that transaction, any `DataSourceUtils.getConnection()` returns **the same connection** instead of asking the router again.

The two rules combined:

```java
@Transactional opens → the connection is bound to the thread
       ↓
@DS("b") inside the transaction  →  the ThreadLocal changed, but no connection is re-acquired
       ↓
the SQL still hits the original database
```

Hence the symptom of "the switch silently fails": no error is raised, the log even shows `switch to the datasource named [b]`, but the SQL actually lands on database a.

## Reverse the order and it works

When the transaction opens depends on the aspect order. This framework's `@DS` aspect defaults to `order = Ordered.HIGHEST_PRECEDENCE`, so it runs **before** the transaction aspect:

```java
@DS("a")
@Transactional
public void doSomething() {
    // switch to a first, then open the transaction → the transaction binds a's connection
    // correct usage
}
```

```java
@DS("a")
@Transactional
public void outer() {
    inner();   // inner is marked @DS("b"), but a's connection is still the one in use here
}

@DS("b")
public void inner() {
    // does not work: still on database a
}
```

:::danger
Do not lower `spring.datasource.dynamic.aop.order` just to "switch before the transaction opens". The default is deliberate: lowering it makes `@DS` run after the transaction and hand you an already bound connection.
:::

## Frequent questions

### Does `@Transactional` mean I can never switch databases?

You can switch freely **outside** a transaction. You cannot **inside** one. In other words, in a nested "transactional method calling a transactional method" scenario within the same Service, the inner switch always fails.

### Can I still use single-database transactions?

Absolutely. As long as **no datasource switch happens inside the transaction**, use `@Transactional` whenever it fits — it is far more mature than local multi-datasource transactions and supports the full semantics: nested savepoints, read-only transactions, isolation levels. Prefer it.

### The business needs a transaction and spans several databases — what now?

Pick one of three, by scenario:

| Scenario | Option |
| :--- | :--- |
| monolith, spanning databases | `@DSTransactional`, see [local multi-datasource transactions](./local-tx) |
| microservices, spanning services | Seata `AT` / `XA`, see [Seata transactions](./seata) |
| standard JTA/XA required | Atomikos (point the driver straight at the XA datasource) |

The comparison is in the [transaction guide](./).

### Any other way out?

If you only have two or three datasources and are not afraid of complexity, you can drop this component entirely and assemble the datasources by hand into a set of XA datasources managed by a JTA transaction manager. This page does not go down that road; search for "multiple datasources JTA" yourself.

## Background knowledge

If you are not familiar with distributed transactions, fill in the concepts first:

- [Transaction concepts](./concepts) — ACID, JDBC transactions, Spring transactions
- the CAP theorem and the BASE model — to understand why "strong consistency across databases" is expensive