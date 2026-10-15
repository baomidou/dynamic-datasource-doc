---
title: "Transaction Guide"
description: "Anyone working with multiple datasources eventually runs into transactions. This chapter does not simply list \"the available options\" — it helps you pick the right one in 30 seconds."
---

# Transaction Guide

Anyone working with multiple datasources eventually runs into transactions. This chapter does not simply list "the available options" — it helps you **pick the right one in 30 seconds**.

## Understand one fact first

> **Once a native Spring transaction is open, the whole thread keeps getting the same `Connection`.**

Datasource switching relies on a key in a ThreadLocal, while `@Transactional` binds the connection to the thread. Together this means: **after the transaction starts, neither the switching annotation nor a manual `push` has any effect any more**.

This is not a bug; it is the inevitable consequence of the relational transaction model combined with "one connection per call". Once you understand this, every option below becomes easy to choose.

## Decision tree

```java
Do you need a transaction?
└─ no → do nothing

Yes. Will you switch to another database inside the transaction?
├─ no (single database reads/writes only) → use the native Spring @Transactional (together with @DS)
│
└─ yes
   ├─ within the same application process → use @DSTransactional
   └─ across services / processes      → use Seata (AT or XA)
```

## Comparing the options

| Option | Use case | External dependency | Cross-service | Consistency |
| :--- | :--- | :---: | :---: | :--- |
| `@Transactional` + `@DS` | single-database transactions that **never switch** inside the transaction | none | no | strong (guaranteed by the database) |
| `@DSTransactional` | spanning several databases inside one monolith | none | no | best-effort (see the note below) |
| Seata `AT` | across microservices | Seata Server | yes | eventual, with automatic compensation |
| Seata `XA` | cross-service with strong consistency | Seata Server | yes | strong, lower performance |
| Atomikos XA | standard XA inside a single process | Atomikos | no | strong |

:::warning[`@DSTransactional` is not strict 2PC]
What `@DSTransactional` does is: open a local transaction for each database involved, all registered under the same XID, then **commit database by database** when the business method returns normally, and **roll back database by database** when it throws.

The rollback is best-effort — if one database fails to roll back, that does not stop the others from rolling back. Committing is likewise sequential — **if a database fails during the commit phase, the databases committed earlier cannot be rolled back any more**.

So it fits "a monolith where cross-database consistency does not have to be 100% airtight". For financial-grade strong consistency, go for XA.
:::

## In this chapter

- [Why you cannot switch datasources inside a transaction](./basics) — the mechanism, and the correct answers to three frequent misconceptions
- [Transaction FAQ](./faq) — mixing pitfalls, the rules for `@DS` and `@Transactional` coexisting
- [Local multi-datasource transactions](./local-tx) — the complete `@DSTransactional` usage, 7 propagation behaviours, `@DsTxEventListener`
- [Seata transactions](./seata) — a complete runnable example
- [Transaction concepts](./concepts) — a primer on ACID, JDBC transactions and Spring transactions

## Further reading

- [Out of scope](../guide/out-of-scope) — this project implements no distributed transaction kernel and does not propagate transactions across threads
- [Troubleshooting switching failures](../guide/switching-failure) — transaction-related failure symptoms and their fixes