---
title: "@DS Semantics and Precedence"
description: "This page explains in depth \"how @DS is resolved into a concrete datasource\". Most \"switching does not work\" problems have their root cause in these rules."
---

# @DS Semantics and Precedence

This page explains in depth "how `@DS` is resolved into a concrete datasource". Most "switching does not work" problems have their root cause in these rules.

## 1. Naming is topology

Every key configured under `spring.datasource.dynamic.datasource` is a datasource name, and **the part before the first underscore `_` is the group name**.

```yaml
datasource:
  master:      # group name master, 1 datasource in the group
  slave_1:     # group name slave, first member of the group
  slave_2:     # group name slave, second member of the group
  oracle_1:    # group name oracle
  oracle_2:    # group name oracle
```

From this the framework builds one `ItemDataSource` per datasource and one `GroupDataSource` per group name. So "read/write splitting", "one master with many replicas", "pure multiple databases" and "mixed" need no extra configuration — they are just different naming.

## 2. The resolution process

The value of `@DS` is passed to `DynamicRoutingDataSource#getDataSource(String ds)`, which looks it up in this order:

1. `ds` empty → use the datasource (or group) named by `primary`
2. **match `ds` against group names first**, exactly; on a hit, hand it to that group's `strategy` to pick a member
3. then match `ds` against **datasource names**, exactly
4. nothing matched → with `strict: true` throw `CannotFindDataSourceException`; with `strict: false` fall back to `primary`

Two practical conclusions follow:

- `@DS("slave")` gives you a **load-balanced member**, so each call may land on a different database — do not build "primary/replica consistency" assumptions on it.
- `@DS("slave_1")` lands on one concrete database and skips the strategy.
- Matching is a **case-sensitive literal match** and must be identical to the configuration key.

:::tip
To surface a mistyped datasource name at startup, set `spring.datasource.dynamic.strict` to `true`. Recommended in production.
:::

## 3. Precedence: nearest wins

`@DS` can be placed on a **method** or a **class** (interfaces and abstract classes included). When they stack, the precedence from highest to lowest is:

```java
explicit switch in code  DynamicDataSourceContextHolder.push("x")
        ↓
@DS on the method
        ↓
@DS on the class declaring the method
        ↓
@DS on an interface / abstract class (supported since 3.4.1, the first hit along the inheritance chain wins)
        ↓
the default datasource, primary
```

A few easy traps:

- **The anchor is the most specific method.** When both an implementing method and the interface method carry `@DS`, the subclass method wins (the source resolves bridge methods with `BridgeMethodResolver` first, then walks upwards).
- **`@DS` on interfaces is supported** (since 3.4.1). If your material still says "interfaces are not supported", that is about older versions.
- **Only public methods are affected.** With the default `spring.datasource.dynamic.aop.allowed-public-only=true`, `@DS` on a non-public method is **silently ignored**. Turn it off explicitly if you really need it.
- **A `this` self-invocation does not work.** This is a general Spring AOP limitation: `@DS` is implemented with an aspect, so a direct call inside the same class never goes through the proxy. Either move the method to another bean or inject the self proxy.

## 4. Dynamic keys

When the `@DS` value starts with `#`, the framework stops treating it as a datasource name and hands it to the `DsProcessor` chain for evaluation. Three built-in stages match in order and short-circuit:

| Processor | Matching prefix | Value source | Example |
| :--- | :--- | :--- | :--- |
| `DsHeaderProcessor` | `#header` | the current request header | `@DS("#header.tenantId")` |
| `DsSessionProcessor` | `#session` | the current session attribute | `@DS("#session.tenantId")` |
| `DsSpelExpressionProcessor` | everything (fallback) | a SpEL expression | `@DS("#{#tenantId}")` |

Behaviour details:

- A preceding processor **matches the prefix and then reads the value**; if nothing is found (the header does not exist, say) it returns `null` and **falls through** to the next processor, with SpEL as the final fallback.
- The SpEL processor is the tail of the chain and its `matches` is always `true`, so any expression starting with `#` that the first two stages did not catch ends up evaluated by SpEL.
- SpEL supports method arguments, `@beanName` bean references, and (disabled by default) type references.

```java
// from a method argument
@DS("#{#tenantId}")
public List<Order> list(String tenantId) { }

// from a Spring bean
@DS("#{@tenantResolver.current()}")
public List<Order> listOrders() { }
```

:::warning[Security]
Type references such as `T(java.lang.Runtime)` are **disabled by default** (`spring.datasource.dynamic.aop.allowed-spel-type-access=false`). Only turn it on when you fully understand the risk and truly need it — once an expression is controllable, it becomes an arbitrary code execution entry point.
:::

To customize the dynamic rules, implement `DsProcessor` and register it as a bean — see [custom datasource provider](../custom/datasource-provider).

## 5. Relationship with transactions and threads

- The datasource key lives in a **stack-based ThreadLocal** (`DynamicDataSourceContextHolder`), so nested switching across `ServiceA → ServiceB → ServiceC` is supported and unwinds layer by layer on exit.
- **It is not propagated across threads.** Inside `@Async`, a thread pool or a `CompletableFuture` you get the default datasource, so the child thread must `push` explicitly again.
- If a `push` is not paired with a `poll` on the same thread, the ThreadLocal leaks — always call them in pairs when switching manually, or use `clear()` directly.

See [manual datasource switching](../advanced/manual-switching) and [troubleshooting switching failures](./switching-failure) for details; for failures of `@DS("#...")` resolution see [SpEL dynamic datasource names](../faq/spel).