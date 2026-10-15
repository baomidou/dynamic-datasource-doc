# FAQ Quick Reference

This chapter collects **problems that keep reappearing in the issue tracker**, organized as "symptom → locate → fix". Every page lists the related historical issue numbers at the top so you can go back to the original discussion.

Before troubleshooting any switching problem, set these two things up.

Turn on the framework's own logging (it prints whether the switch succeeded or not):

```yaml
logging:
  level:
    com.baomidou.dynamic.datasource: debug
```

Add one line inside your business method to see the current thread's datasource key:

```java
String current = DynamicDataSourceContextHolder.peek();
```

| Log / breakpoint result | Meaning |
| :--- | :--- |
| `switch to the datasource named [slave_1]` | the key was resolved correctly, the switch happened |
| `switch to the primary datasource` | **no valid key**, it fell back to the primary — the problem is "the key never got pushed" |
| neither line / `peek()` is `null` | the annotated method was never intercepted by AOP |

## Index by symptom

| Symptom | Read this page |
| :--- | :--- |
| `@DS` is there but traffic always goes to the primary | [@DS not working checklist](./not-working) |
| chained queries in a Controller, `IService` methods do not switch | [@DS placement and MyBatis-Plus call styles](./annotation-placement) |
| no switching inside `@Async`, thread pools or parallel streams; occasional cross-database contamination under load | [@DS and threads](./threads) |
| `@DS("#xxx")` dynamic datasource name fails to resolve | [SpEL dynamic datasource names](./spel) |
| cannot switch inside a transaction (including Spring Batch, Quartz) | [No switching inside a transaction](./tx-inside) |
| the application fails to start with driver / primary / dependency errors | [Startup error quick reference](./startup-errors) |

## Index by topic

| Topic | In-depth documentation |
| :--- | :--- |
| `@DS` resolution rules, group names, precedence | [@DS semantics and precedence](../guide/ds-semantics) |
| concrete switching failure cases (Shiro, `@PostConstruct`, druid versions …) | [Troubleshooting switching failures](../guide/switching-failure) |
| choosing a multi-datasource transaction strategy and the pitfalls of mixing them | [Transaction guide](../tx), [Transaction FAQ](../tx/faq) |
| propagation behaviour and semantic boundaries of `@DSTransactional` | [Local multi-datasource transactions](../tx/local-tx) |
| pool parameter levels, version compatibility, monitoring | [Connection pool integration](../pool), [Connection pool essentials](../pool/common) |
| password encryption with `ENC(...)` | [Database password encryption](../advanced/encryption) |
| adding/removing datasources at runtime | [Adding/removing datasources at runtime](../advanced/add-remove-datasource) |
| the full manual switching API and its FAQ | [Manual datasource switching](../advanced/manual-switching) |
| read/write splitting and load balancing | [Automatic read/write splitting](../no-annotation/mybatis-read-write), [Custom load balancing strategy](../custom/load-balance-strategy) |
| MyBatis-Plus integration | [Integrating MyBatis-Plus](../integration/mybatis-plus) |

## Three rules of thumb

1. **Read the log before changing code.** The framework prints the key when switching, so most "not working" cases can be classified from the log: nothing printed means it was not intercepted, `primary` printed means the key is wrong.
2. **Use `peek()` to locate the boundary.** Print it at the beginning and the end of the method you suspect; that immediately separates "not intercepted" from "intercepted but the connection is already bound".
3. **Enable `strict` in development.** `spring.datasource.dynamic.strict: true` makes "this datasource name does not exist" throw a `CannotFindDataSourceException` instead of silently falling back to the primary — the latter is the most hidden cause of "the annotation is there but the primary is always used".

```yaml
spring:
  datasource:
    dynamic:
      strict: true
```

## Still stuck?

- Search or file an [Issue](https://github.com/baomidou/dynamic-datasource/issues) (pasting the `switch to ...` line from the debug log greatly speeds up the conversation);
- Use the [Discussions](https://github.com/baomidou/dynamic-datasource/discussions) board;
- Or join the QQ group **371234236** and ask directly.
