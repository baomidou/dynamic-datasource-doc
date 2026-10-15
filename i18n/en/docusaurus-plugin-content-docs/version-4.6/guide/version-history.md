---
title: "Version History and How to Choose"
description: "Use the latest 4.6.0 for new projects. Projects already on 4.5.0 should upgrade to 4.6.0 as soon as possible (see \"Before you upgrade\" below for the reasons)."
---

# Version History and How to Choose

## Picking a version in one sentence

**Use the latest 4.6.0 for new projects.** Projects already on 4.5.0 should upgrade to 4.6.0 as soon as possible (see "Before you upgrade" below for the reasons).

## Version support

| Version | JDK | Spring Boot | Starter artifact | GraalVM |
| :--- | :--- | :--- | :--- | :---: |
| 3.5.2 | 8+ | 1.5.x / 2.x.x / 3.x.x | `-spring-boot-starter` | not supported |
| 4.1.3 | 8+ | 1.5.x / 2.x.x / 3.x.x | `-spring-boot-starter` | not supported |
| 4.2.0 ~ 4.3.1 | 8+ | 1.5.x / 2.x.x / 3.x.x | `-spring-boot-starter`, `-boot3-starter` | supported |
| **4.5.0** | 8+ (17+ for Boot 3 / 4) | 1.5.x / 2.x.x / 3.x.x / **4.x.x** | the three above plus `-boot4-starter` | supported |
| **4.6.0** (latest) | 8+ (17+ for Boot 3 / 4) | 1.5.x / 2.x.x / 3.x.x / 4.x.x | same as above | supported |

::::info[There is no 4.4.x]
After `4.3.1` (2024-06) the project **jumped straight to `4.5.0`** (2026-01) — 19 months later. No 4.4.x release exists at all; ignore any mention of 4.4 elsewhere.
::::

The maintenance status of each line (which still receives features, which is frozen) is in the main repository's [SUPPORT.md](https://github.com/baomidou/dynamic-datasource/blob/master/SUPPORT.md).

## Before you upgrade

### 4.5.0 → 4.6.0

**Two items are mandatory reading; the rest is optional.**

#### 1. Security: SpEL injection fix (upgrade recommended immediately)

`DsSpelExpressionProcessor` had a SpEL injection vulnerability that **could lead to remote code execution** when the expression is controllable ([#767](https://github.com/baomidou/dynamic-datasource/pull/767)).

There are two ways to fix it: upgrade to 4.6.0, or stay on 4.5.0 but **never** let a `@DS` SpEL expression contain user-controllable content.

4.6.0 also adds the `spring.datasource.dynamic.aop.allowed-spel-type-access` switch (**default `false`**) to forbid type references such as `T(java.lang.Runtime)`. See the [full configuration reference](./configuration).

#### 2. JDK 8 users seeing `No suitable driver`?

**The root cause is a dependency leak in 4.5.0, not your MySQL configuration.**

4.5.0 leaked `oracle-spring-boot-starter-ucp`, `ucp` (and `ojdbc11`) to every consumer. `ojdbc11` is Java 11 bytecode, and on **JDK 8** it breaks the driver ServiceLoader iteration inside `DriverManager` — other drivers (MySQL and friends) therefore fail to register, and you end up with `No suitable driver`.

4.6.0 changed both dependencies to `compileOnly`. If you must stay on 4.5.0 with JDK 8, exclude them:

```xml
<exclusions>
  <exclusion>
    <groupId>com.oracle.database.spring</groupId>
    <artifactId>oracle-spring-boot-starter-ucp</artifactId>
  </exclusion>
  <exclusion>
    <groupId>com.oracle.database.jdbc</groupId>
    <artifactId>ucp</artifactId>
  </exclusion>
</exclusions>
```

#### Other behaviour changes

| Change | Impact |
| :--- | :--- |
| the Seata proxy checker works again | in 4.5.0 that checker was **never registered**, so it did not exist at all. After the fix in 4.6.0, users with `seata=true` who hit Seata's automatic proxying start seeing WARN messages — this is expected |
| the Boot 4 line aligns with `mybatis-spring` 4.x | removes the transitive 2.1.2 version conflict |
| `Automatic-Module-Name` added to every artifact | provides a stable JPMS module name contract; a full `module-info` is still not shipped |

## Change log

Every version links to its GitHub Release with the full PR list and contributors.

### 4.6.0 <small>2026-10-13</small>

An aggregate release, 8 months and 63 changes after the previous one.

**Added**

- read-only Actuator endpoint `/actuator/dynamic-datasource`: the datasource list, group composition and global switches — see [operations endpoint and metrics](../advanced/observability)
- contract tests for `@DSTransactional` propagation semantics (12 scenarios × 3 lines)
- [SUPPORT.md](https://github.com/baomidou/dynamic-datasource/blob/master/SUPPORT.md): the maintenance policy for the three Boot lines

**Fixed**

- **security**: SpEL injection in `DsSpelExpressionProcessor` (potential RCE)
- **7 transaction core issues**: the NESTED savepoint success path, unmarked connection leaks, a broken completion chain, `REQUIRES_NEW` NPE with no connection ([#764](https://github.com/baomidou/dynamic-datasource/pull/764)), `Error` rollback semantics, and more
- **routing**: `containsKey`/`get` double-read returning `null` under concurrency, division by zero for an empty group after removing a datasource
- **native image**: reflection registration for `RandomDynamicDataSourceStrategy`, `nativeTest` fixes ([#788](https://github.com/baomidou/dynamic-datasource/pull/788))
- **dependencies**: the Oracle UCP dependency leak changed to `compileOnly` ([#787](https://github.com/baomidou/dynamic-datasource/pull/787))

[Read the full 4.6.0 release notes →](https://github.com/baomidou/dynamic-datasource/releases/tag/v4.6.0)

### 4.5.0 <small>2026-01-20</small>

A feature release 19 months after 4.3.1, and the project's **second watershed** (the first one was 4.0.0).

**Added**

- **Spring Boot 4.0.0 support**, with the new `dynamic-datasource-spring-boot4-starter`
- **C3P0** and **Oracle UCP** pool support (pool coverage is now Druid / HikariCP / BeeCP / DBCP2 / C3P0 / UCP / Atomikos)
- **HikariCP pool metrics** (Micrometer) — see [operations endpoint and metrics](../advanced/observability)
- Seata proxy datasource detection (the checker itself only became effective in 4.6.0, see above)
- Druid: thread pool parameter configuration, datasource callback configuration
- datasource creation failures now carry the `cause`, so the root cause is no longer lost

**Engineering**

- the build system migrated from Maven to Gradle
- releases moved to the Maven Central Portal

[Read the full 4.5.0 release notes →](https://github.com/baomidou/dynamic-datasource/releases/tag/v4.50)

::::tip[The tag is `v4.50`]
The git tag for 4.5.0 is missing a dot: it is written `v4.50`. When looking up tags, writing comparison links or configuring CI, always use `v4.50`, not `v4.5.0`.
::::

### 4.3.1 <small>2024-06-13</small>

- fixed startup warnings and Druid datasources that could not be closed (the `closed` state)
- group datasources are cleaned up together when removed
- fixed an infinite loop caused by opening a transaction inside a transaction post-callback
- added MySQL Connector/J 5.1 `XADataSource` support

[Read the full 4.3.1 release notes →](https://github.com/baomidou/dynamic-datasource/releases/tag/v4.3.1)

### Earlier versions

| Version | Date | Highlights |
| :--- | :--- | :--- |
| 4.3.0 | 2024-01 | fixed Druid creation failures when a `publicKey` is present, `@Bean` initialization improvements |
| 4.2.0 | 2023-10 | **GraalVM nativeTest in CI**, **graceful shutdown (grace-destroy)**, multi-datasource transaction synchronization |
| 4.1.3 | 2023-08 | `ENC` block encryption/decryption (53/64 byte thresholds), removed the hard dependency on `spring-boot-starter-web` |
| 4.1.2 | 2023-07 | fixed multiple NESTED sub-transactions not committing under REQUIRED |
| 4.1.1 | 2023-07 | fixed Druid encryption failures |
| 4.1.0 | 2023-07 | annotation resolution `ArrayStoreException`, `TransactionFactory` `NoClassDefFoundError` |
| 4.0.0 | 2023-06 | **multi-datasource transaction propagation**, Atomikos support, Jakarta EE 10 migration, NESTED propagation |
| 3.6.0 | 2022-12 | Spring Boot 3 auto-configuration support, Druid `socketTimeout` / `connectTimeout` |
| 3.5.2 | 2022-08 | local transactions throwing exceptions, `#root.target`, native HikariCP parameters |
| 3.5.0 | 2021-11 | `init` level restructuring (breaking), `strategy` method renamed to `determineKey` (breaking), health check removed, class-level annotations for local transactions, `DataSourceInitEvent` |

[See all releases →](https://github.com/baomidou/dynamic-datasource/releases)

## Upgrade advice

- **New projects**: go straight to the latest stable version.
- **Your current version works and has no feature you need**: no need to upgrade.
- **Before upgrading**: always read "Before you upgrade" above, especially for minor versions with breaking changes (`x.y.0` and `x.y` releases).
- This project does **not guarantee binary compatibility across major versions**, so run your own integration tests after upgrading.

## Further reading

- [Unavailable versions](./unavailable-versions) — versions that were pulled or had capabilities removed
- [Out of scope](./out-of-scope) — what this project deliberately does not do, so you do not mistake "not implemented" for "a version problem"
- The version dropdown in this site's navbar switches between the **4.5.0 / 4.6.0** documentation sets