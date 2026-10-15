---
title: "SpEL Dynamic Datasource Names"
description: "This page explains how dynamic datasource names such as @DS(\"#...\") work and how to debug them when resolution fails. The overall design of the processor chain is described in @DS semantics and precedence."
---

# SpEL Dynamic Datasource Names

> Related issues: [#199](https://github.com/baomidou/dynamic-datasource/issues/199), [#205](https://github.com/baomidou/dynamic-datasource/issues/205), [#413](https://github.com/baomidou/dynamic-datasource/issues/413), [#492](https://github.com/baomidou/dynamic-datasource/issues/492), [#698](https://github.com/baomidou/dynamic-datasource/issues/698), [#744](https://github.com/baomidou/dynamic-datasource/issues/744), [#216](https://github.com/baomidou/dynamic-datasource/issues/216), [#727](https://github.com/baomidou/dynamic-datasource/issues/727)

This page explains how **dynamic datasource names** such as `@DS("#...")` work and how to debug them when resolution fails. The overall design of the processor chain is described in [@DS semantics and precedence](../guide/ds-semantics).

## 1. When does SpEL kick in?

Only when the `@DS` value **starts with `#`** is it handed to the SpEL processor; otherwise it is treated as a literal datasource name (a group name or a concrete name).

## 2. Supported syntax

```java
@DS("#header.ds")          // from an HTTP request header (built-in processor)
@DS("#session.dsName")     // from the HTTP session (built-in processor)
@DS("#user.level")         // SpEL: a property of the current method's argument
@DS("#p0")                 // SpEL: by argument position (p0 = the first argument)
@DS("#dto.dsKey")          // SpEL: a field of an argument object
@DS("@dsLocator.for(#id)") // SpEL: a method on a Spring bean
```

Precedence chain: the built-in `DsHeaderProcessor` (`#header`) → `DsSessionProcessor` (`#session`) → `DsSpelExpressionProcessor` (any other `#` expression). When a preceding processor matches the prefix but finds no value, it returns `null` and **falls through** to the next processor, with SpEL as the final fallback. You can also implement `DsProcessor` and put it at the head of the chain to add your own prefix — see [custom datasource provider](../custom/datasource-provider).

## 3. FAQ

### Q1: `#user.dsName` reports the argument cannot be found / resolves to null?

([#698](https://github.com/baomidou/dynamic-datasource/issues/698))

- Reading SpEL values **by argument name** requires the parameter names to be preserved at compile time (`-parameters`; the Spring Boot Maven plugin enables it by default, but remember to add it with plain javac). Without it, use positional syntax such as `#p0` / `#a0`;
- `EL1007E: Property or field 'xxx' cannot be found on null`: the **preceding object** of the expression is null (for instance `#user` itself), so check whether the argument is null;
- a misspelled property produces the same `EL1007E`, so check the argument type field by field.

### Q2: What happens when an expression fails to resolve?

When SpEL cannot resolve it, this switch fails — in non-strict mode it eventually falls back to the primary (which again looks like "the annotation does not work"). Enable `strict: true` in development and watch the log:

```yaml
spring:
  datasource:
    dynamic:
      strict: true
```

### Q3: What is the default when `#header.ds` finds nothing?

([#727](https://github.com/baomidou/dynamic-datasource/issues/727))

Nothing found means `null` → fall back to the primary. If you want "throw when the header is missing", write your own `DsProcessor` or validate at the business entry point; you can also write `@DS("#header.ds ?: 'master'")` and give a default with SpEL's Elvis operator.

### Q4: Can SpEL be used on Mapper methods?

SpEL evaluates against the arguments of **the annotated method**. `@DS("#param")` on a Mapper method reads the mapper method's arguments (it works, but the Service layer is recommended — the reasons are in [@DS placement and MyBatis-Plus call styles](./annotation-placement)).

### Q5: How is the performance?

([#413](https://github.com/baomidou/dynamic-datasource/issues/413))

The expression is parsed on every call (there is a parse cache), so the overhead is manageable; but on a **hot path** consider caching the computed key in a ThreadLocal, or use a custom processor to avoid complex expressions.

## 4. Security: type references are disabled by default

`T(...)` type references and `new` construction expressions are **forbidden by default** when resolving a datasource key (to prevent SpEL injection leading to RCE, [#766](https://github.com/baomidou/dynamic-datasource/issues/766), [#776](https://github.com/baomidou/dynamic-datasource/issues/776)). Only turn it on if you truly need it, and understand the risk:

```yaml
spring:
  datasource:
    dynamic:
      aop:
        allowed-spel-type-access: true   # default false; strongly discouraged in production
```

:::danger[This switch did not exist before 4.6.0]
4.5.0 and earlier had no `allowed-spel-type-access`, so any controllable expression was an arbitrary code execution entry point. Upgrade to 4.6.0 or later and keep this switch at its default `false`.
:::

## Further reading

- [@DS semantics and precedence](../guide/ds-semantics) — the processor chain and matching rules
- [Full configuration reference](../guide/configuration) — the values of `aop.allowed-spel-type-access`
- [Custom datasource provider](../custom/datasource-provider) — implementing your own `DsProcessor`
- [@DS not working checklist](./not-working)