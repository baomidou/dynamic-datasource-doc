# Startup Error Quick Reference

> Related issues: [#49](https://github.com/baomidou/dynamic-datasource/issues/49), [#88](https://github.com/baomidou/dynamic-datasource/issues/88), [#141](https://github.com/baomidou/dynamic-datasource/issues/141), [#146](https://github.com/baomidou/dynamic-datasource/issues/146), [#148](https://github.com/baomidou/dynamic-datasource/issues/148), [#186](https://github.com/baomidou/dynamic-datasource/issues/186), [#332](https://github.com/baomidou/dynamic-datasource/issues/332), [#518](https://github.com/baomidou/dynamic-datasource/issues/518), [#632](https://github.com/baomidou/dynamic-datasource/issues/632), [#741](https://github.com/baomidou/dynamic-datasource/issues/741)

Startup failures account for roughly 6% of historical issues. They are indexed below by **error message**.

:::tip[How to troubleshoot]
Look at the **first `Caused by:` at the very bottom** of the full stack trace — that is the real cause; the layers above are usually just a wrapped symptom.
:::

## 1. `Failed to determine a suitable driver class` / `'url' attribute is not specified`

Spring Boot thinks you want its "default single datasource" auto-configuration, but found no usable url/driver. Check in this order:

1. **Are the datasources really under `spring.datasource.dynamic.datasource`?** Many cases turn out to be a missing or misspelled level, leaving dynamic with an empty list;
2. **Is `spring.datasource.dynamic.enabled` set to `false`?** Once disabled the framework stops taking over;
3. **Did you also add `druid-spring-boot-starter`?** Its `DruidDataSourceAutoConfigure` creates a default datasource first and conflicts with dynamic. The official recommendation is to exclude it:

```yaml
spring:
  autoconfigure:
    exclude: com.alibaba.druid.spring.boot.autoconfigure.DruidDataSourceAutoConfigure
```

4. **Is the configuration file really packaged/loaded?** In multi-module projects, a yml missing from the runtime jar or an inactive profile both produce "works locally, cannot find the url after packaging" ([#193](https://github.com/baomidou/dynamic-datasource/issues/193)).

> Another common case: you want a single `master`, but the url is configured on the legacy `spring.datasource.url` (not under dynamic), so the framework cannot load it.

## 2. `Please check the setting of primary` / `CannotFindDataSourceException: can not find primary datasource`

The datasource/group that `primary` points to does not exist. Check:

- whether the value of `spring.datasource.dynamic.primary` **exactly matches** a datasource key (including the group name rule: `slave_1` and `slave_2` belong to the `slave` group, so `primary: slave` matches the group);
- whether the datasource list is empty (combine this with the checks in item 1);
- whether a profile override got lost across environments;
- see [#141](https://github.com/baomidou/dynamic-datasource/issues/141), [#146](https://github.com/baomidou/dynamic-datasource/issues/146), [#148](https://github.com/baomidou/dynamic-datasource/issues/148), [#341](https://github.com/baomidou/dynamic-datasource/issues/341).

## 3. `CannotFindDataSourceException: could not find a datasource named xxx`

This is the **correct** error under `strict: true` — the key you switched to does not exist. See item 5 of the [@DS not working checklist](./not-working).

## 4. `enabled P6SPY ,however without p6spy dependency` / `enabled ALIBABA SEATA,however without seata dependency`

A switch was turned on without the dependency. Add the dependency, or turn the switch off:

```yaml
spring:
  datasource:
    dynamic:
      p6spy: false
      seata: false
```

## 5. `NoClassDefFoundError: io/seata/rm/datasource/SeataDataSourceProxy` and similar

Seata-related classes were loaded at startup but the dependency is missing ([#332](https://github.com/baomidou/dynamic-datasource/issues/332)). Handle it as in item 4; if you really need Seata, see [integrating Seata](../tx/seata).

## 6. `java.lang.ArrayStoreException: sun.reflect.annotation.TypeNotPresentExceptionProxy`

Typical symptom: **a Spring Boot 3 project using the Boot 2 starter artifact** (or the other way round), where a class referenced by an annotation does not exist under the new JDK/Boot ([#518](https://github.com/baomidou/dynamic-datasource/issues/518), [#524](https://github.com/baomidou/dynamic-datasource/issues/524)).

Pick the starter artifact that matches your Spring Boot major version:

| Spring Boot | Dependency artifactId |
| :--- | :--- |
| 1.5.x / 2.x | `dynamic-datasource-spring-boot-starter` |
| 3.x (JDK 17+) | `dynamic-datasource-spring-boot3-starter` |
| 4.x | `dynamic-datasource-spring-boot4-starter` |

## 7. Druid version compatibility window

- **3.6.1 and earlier** are incompatible with **druid 1.2.17+** (the construction changed) and fail at startup; the fix landed in 4.0.0 ([#494](https://github.com/baomidou/dynamic-datasource/issues/494), [#497](https://github.com/baomidou/dynamic-datasource/issues/497), [#500](https://github.com/baomidou/dynamic-datasource/issues/500), [#506](https://github.com/baomidou/dynamic-datasource/issues/506));
- from druid 1.2.22, changed `DruidDataSourceAutoConfigure` behaviour causes a conflict — exclude it as described in item 1.3 ([#632](https://github.com/baomidou/dynamic-datasource/issues/632));
- **Conclusion: stay on dynamic-datasource 4.x with a recent druid.**

## 8. `Property 'sqlSessionFactory' or 'sqlSessionTemplate' are required`

This is not an error from the framework itself, but a MyBatis(-Plus) wiring problem that surfaces after multiple datasources are introduced. Make sure the mybatis(-plus) starter matches your Spring Boot major version, that the container holds **exactly one** `SqlSessionFactory`, and that mapper scanning is configured correctly ([#69](https://github.com/baomidou/dynamic-datasource/issues/69), [#280](https://github.com/baomidou/dynamic-datasource/issues/280), [#722](https://github.com/baomidou/dynamic-datasource/issues/722)). See [integrating MyBatis-Plus](../integration/mybatis-plus) for the recommended wiring.

## 9. One unreachable database stops the whole application from starting

By default the framework creates every datasource at startup. If you want "an unreachable database does not block startup":

- **`lazy: true`**: the datasource is created on first use, so no pool is created at startup — see [lazy datasource startup](../advanced/lazy-datasource);
- relax it at the pool level: Hikari `initialization-fail-timeout: -1` (do not wait for a connection); Druid `fail-fast: false` plus `initial-size: 0`.

:::warning[lazy only postpones the error]
`lazy: true` does not fix a configuration error, it only moves the failure from startup to first use ([#186](https://github.com/baomidou/dynamic-datasource/issues/186), [#242](https://github.com/baomidou/dynamic-datasource/issues/242), [#311](https://github.com/baomidou/dynamic-datasource/issues/311), [#349](https://github.com/baomidou/dynamic-datasource/issues/349)). If you want to start with no datasource at all, see [startup without datasources](../advanced/no-datasource-startup).
:::

## 10. Understanding the startup log

| Log | Meaning |
| :--- | :--- |
| `dynamic-datasource initial loaded [N] datasource,primary datasource named [master]` | normal |
| `initial loaded [0] datasource,Please add your primary datasource or check your configuration` | the datasource list is empty — back to item 1 |
| `dynamic-datasource start closing ....` + `all closed success,bye` | the normal shutdown sequence, not an error |

## Further reading

- [Connection pool integration](../pool) — parameter levels, the druid version window and monitoring
- [Full configuration reference](../guide/configuration)
- [@DS not working checklist](./not-working)
