# @DS Not Working Checklist

> Related issues: [#770](https://github.com/baomidou/dynamic-datasource/issues/770), [#649](https://github.com/baomidou/dynamic-datasource/issues/649), [#674](https://github.com/baomidou/dynamic-datasource/issues/674), [#266](https://github.com/baomidou/dynamic-datasource/issues/266), [#122](https://github.com/baomidou/dynamic-datasource/issues/122), [#166](https://github.com/baomidou/dynamic-datasource/issues/166), [#740](https://github.com/baomidou/dynamic-datasource/issues/740), [#663](https://github.com/baomidou/dynamic-datasource/issues/663)

After marking a method with `@DS("xxx")` the SQL still hits the default database (primary), or the log says "it switched but the connection did not change" — this is **the single most reported class of problem** in this repository (150+ issues in total). Go through the list below in order; it is sorted by hit rate, highest first.

## Step 0: read the log first

Turn on the framework's logging and see what it actually says:

```yaml
logging:
  level:
    com.baomidou.dynamic.datasource: debug
```

| Log you see | Meaning | Where to go |
| :--- | :--- | :--- |
| `dynamic-datasource switch to the datasource named [slave_1]` | the key was resolved correctly, the switch happened | jump to items 2 / 6 |
| `dynamic-datasource switch to the primary datasource` | **no valid key at all**, it fell back to the primary | items 1, 3, 5 |
| neither line | the annotated method was never intercepted by AOP | items 1, 3, 4 |

## Checklist

### 1. Does the call go through the Spring proxy?

`@DS` is essentially a Spring AOP aspect. The following calls **do not pass through the proxy**, so the annotation is dead weight:

- a self-invocation `this.method()` inside the same class — [#770](https://github.com/baomidou/dynamic-datasource/issues/770), [#15](https://github.com/baomidou/dynamic-datasource/issues/15);
- `static` methods, objects you created with `new` — [#649](https://github.com/baomidou/dynamic-datasource/issues/649);
- utility classes not managed by Spring (not a bean).

Fix: call across beans; or self-inject (`@Autowired private SelfService self;`) and call through that; turn static utility classes into injected proxy beans.

### 2. Is there an outer Spring transaction already?

A transaction opened by `@Transactional` binds the primary's connection first; changing the key with `@DS` mid-transaction cannot replace the **already bound** connection. **The switch must happen before the transaction starts.**

See [no switching inside a transaction](./tx-inside).

### 3. Method visibility and annotation placement

- with the default `spring.datasource.dynamic.aop.allowed-public-only=true`, **only public methods** are intercepted ([#266](https://github.com/baomidou/dynamic-datasource/issues/266));
- prefer **methods of the Service implementation class**; annotating interface methods is recognised too (the framework looks the implementation up), but with version and scenario limitations — see [@DS placement and MyBatis-Plus call styles](./annotation-placement);
- when both a class-level and a method-level annotation exist, **the method wins**; annotations on interfaces/superclasses are inherited.

The complete precedence chain is in [@DS semantics and precedence](../guide/ds-semantics).

### 4. Did a MyBatis-Plus call style bypass it?

`lambdaQuery().list()`, `IService` default methods, direct `BaseMapper` calls, ActiveRecord and similar scenarios are very easy to get wrong (35+ historical issues).

See [@DS placement and MyBatis-Plus call styles](./annotation-placement).

### 5. Does the key really exist?

- check spelling, case, and the **group name rule** (everything before the first `_` is the group name: `slave_1` belongs to the `slave` group, so `@DS("slave")` switches to the group);
- when the key does not exist, **non-strict mode silently falls back to the primary** — this is exactly the most hidden cause of "the annotation is there but the primary is always used";
- turn on strict mode so the problem surfaces immediately:

```yaml
spring:
  datasource:
    dynamic:
      strict: true   # an unmatched datasource throws CannotFindDataSourceException instead of quietly falling back to primary
```

### 6. Is a leftover manual push overriding it?

If an exception path skips the `poll()` after a `DynamicDataSourceContextHolder.push("xx")`, later calls on that thread are affected by the leftover key (showing up as "cross-database contamination"). Rule: **push must always be paired with try/finally + poll or clear**.

See [manual datasource switching](../advanced/manual-switching).

### 7. Did the call cross a thread boundary?

When execution happens inside `@Async`, a thread pool, `CompletableFuture` or `parallelStream`, the resolved `@DS` value **is not propagated to the child thread**, which defaults to the primary.

See [@DS and threads](./threads).

### 8. Is it too early?

Calling from `@PostConstruct`, `InitializingBean`, an early `ApplicationRunner` or during bean initialization means the upstream proxy/context is not ready yet, so the switch has no effect ([#122](https://github.com/baomidou/dynamic-datasource/issues/122)). Move database-switching work onto the business request path and move initialization logic into a `ContextRefreshedEvent` listener — see [troubleshooting switching failures](../guide/switching-failure).

### 9. Does it not work on a unit test class?

`@DS` must be placed on **a bean method inside the Spring container**. Annotating the test class itself has no effect ([#153](https://github.com/baomidou/dynamic-datasource/issues/153), [#674](https://github.com/baomidou/dynamic-datasource/issues/674)).

### 10. Verify with a breakpoint

Add one line inside the business method:

```java
String current = DynamicDataSourceContextHolder.peek();
```

- `null`: the annotation was never intercepted (back to items 1, 3, 4);
- the expected value but still the wrong database: item 2 (the connection is already bound by a transaction) or item 6 (a leftover value).

## Symptom → most likely cause

| Symptom | Most likely cause |
| :--- | :--- |
| always the primary, no `switch to the datasource` in the log | the annotation was not intercepted (self-invocation / non-public / not a bean / bypassed by MP) |
| calling a method in the same class does not switch | `this` self-invocation, item 1 |
| switching inside a transactional method has no effect | the transaction already bound a connection, item 2 |
| chained queries in a Controller do not switch | MyBatis-Plus style, item 4 |
| occasional cross-database contamination | push leftovers / thread reuse, items 6 and 7 |
| it switched but a table is reported missing | the key does not exist (fell back to primary), item 5 |

## Further reading

- [@DS placement and MyBatis-Plus call styles](./annotation-placement)
- [@DS and threads: async, thread pools, cross-database contamination](./threads)
- [No switching inside a transaction](./tx-inside)
- [Manual datasource switching](../advanced/manual-switching)
- [Troubleshooting switching failures](../guide/switching-failure) — the older, case-by-case list
