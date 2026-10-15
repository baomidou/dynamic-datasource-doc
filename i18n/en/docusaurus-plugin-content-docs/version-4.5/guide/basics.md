---
title: "Getting Started"
description: "dynamic-datasource is a Spring Boot starter for integrating multiple datasources quickly. It does exactly one thing — deciding which DataSource a call runs against — and places no restriction on what you do afterwards: any CRUD, any ORM, any transaction strategy."
---

# Getting Started

**dynamic-datasource** is a Spring Boot starter for integrating multiple datasources quickly. It does exactly one thing — **deciding which `DataSource` a call runs against** — and places no restriction on what you do afterwards: any CRUD, any ORM, any transaction strategy.

```java
@Service
public class UserServiceImpl implements UserService {

    @DS("master")   // routes to the primary
    public void save(User user) { }

    @DS("slave")    // routes to the "slave" group, load-balanced
    public List<User> listUsers() { }
}
```

## Version compatibility

Pick the starter that matches your Spring Boot version:

| Spring Boot | JDK | Starter artifact | Available since |
| :---: | :---: | :--- | :---: |
| 1.5.x ~ 2.x.x | JDK 8+ | `dynamic-datasource-spring-boot-starter` | 1.0.0 |
| 3.x.x | JDK 17+ | `dynamic-datasource-spring-boot3-starter` | 4.0.0 |
| 4.x.x | JDK 17+ | `dynamic-datasource-spring-boot4-starter` | 4.5.0 |

:::warning
Connection pools (Druid, HikariCP, …) and JDBC drivers are **not** bundled with the starter. Add them yourself and keep their versions aligned with your BOM. This keeps the artifact lightweight and avoids shaded-jar dependency conflicts.
:::

## Quick start

### 1 · Add the dependency

Replace `${version}` with the latest version from [Releases](https://github.com/baomidou/dynamic-datasource/releases) — this documentation targets the 4.6 line.

```xml
<!-- Spring Boot 1.5.x / 2.x.x -->
<dependency>
    <groupId>com.baomidou</groupId>
    <artifactId>dynamic-datasource-spring-boot-starter</artifactId>
    <version>${version}</version>
</dependency>

<!-- Spring Boot 3.x -->
<dependency>
    <groupId>com.baomidou</groupId>
    <artifactId>dynamic-datasource-spring-boot3-starter</artifactId>
    <version>${version}</version>
</dependency>

<!-- Spring Boot 4.x -->
<dependency>
    <groupId>com.baomidou</groupId>
    <artifactId>dynamic-datasource-spring-boot4-starter</artifactId>
    <version>${version}</version>
</dependency>
```

### 2 · Configure datasources

Every key under `datasource` is a datasource name, and **everything before the first `_` is the group name**.

```yaml
spring:
  datasource:
    dynamic:
      enabled: true              # enable the dynamic datasource, default true
      primary: master            # default datasource or group, default master
      strict: false              # strict matching; when true an unmatched name throws
      grace-destroy: false       # graceful shutdown, wait up to 10s for active connections
      datasource:
        master:
          url: jdbc:mysql://host1:3306/dynamic
          username: root
          password: 123456
          driver-class-name: com.mysql.cj.jdbc.Driver  # inferable via SPI since 3.2.0, may be omitted
        slave_1:
          url: jdbc:mysql://host2:3307/dynamic
          username: root
          password: 123456
        slave_2:
          url: jdbc:mysql://host3:3308/dynamic
          username: ENC(xxxxx)
          password: ENC(xxxxx)
```

This yields a `master` datasource plus a `slave` group containing `slave_1` and `slave_2`. Other topologies are just differences in naming:

```yaml
# one master, many slaves     # pure multiple databases     # mixed
master:                       mysql:                        master:
slave_1:                      oracle:                       slave_1:
slave_2:                      sqlserver:                    slave_2:
                              h2:                           oracle_1:
```

### 3 · Switch with `@DS`

`@DS` can be placed on a **method or a class**; when both are present, **the method wins**.

```java
@Service
@DS("slave")   // class-level default
public class UserServiceImpl implements UserService {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    // no annotation → uses the class-level @DS("slave")

    @DS("master")   // method-level overrides the class
    public List<Map<String, Object>> selectAll() {
        return jdbcTemplate.queryForList("select * from user");
    }

    @DS("slave_1")  // a concrete datasource, bypassing the group strategy
    public List<Map<String, Object>> selectByCondition() {
        return jdbcTemplate.queryForList("select * from user where age > 10");
    }
}
```

| Annotation | Resolution |
| :--- | :--- |
| none | the default datasource (`primary`) |
| `@DS("slave")` | the `slave` **group**, load-balanced |
| `@DS("slave_1")` | the concrete `slave_1` datasource |
| `@Master` / `@Slave` | built-in shortcuts for `@DS("master")` / `@DS("slave")` |
| `@DS("#header.tenantId")` | resolves from the request header |

Any annotation meta-annotated with `@DS` works as a switching annotation — that is how `@Master` and `@Slave` are defined, and you can define your own.

## Features

| Area | Capability |
| :--- | :--- |
| **Datasource groups** | Pure multiple databases, read-write splitting, one master with many slaves, mixed — all expressed through naming. |
| **Dynamic routing** | `@DS` on methods, classes, interfaces or abstract classes (nearest wins); groups resolve via load-balancing or random strategy. |
| **Transactions** | `@DSTransactional` local multi-datasource transactions (7 propagation modes), `@DsTxEventListener`, Seata `AT`/`XA` and Atomikos XA. |
| **Encrypted config** | Built-in `ENC(...)` for sensitive values, with customisable algorithm and public key; SpEL type access is disabled by default. |
| **Lifecycle** | Startup without datasources, lazy creation, runtime add/remove, graceful shutdown that waits for active connections. |
| **Extensibility** | Custom annotations (meta-annotated with `@DS`), custom `DsProcessor` chain, custom `DynamicDataSourceProvider`, pluggable `DataSourceCreator`. |
| **Connection pools** | Druid, HikariCP, BeeCP, DBCP2, C3P0, Oracle UCP, plus non-pooled basic and JNDI. |
| **Observability** | Hikari/Druid pool metrics via Micrometer (since 4.5.0); read-only Actuator endpoint listing datasources and groups (**since 4.6.0**). |
| **Native image** | GraalVM reachability metadata published as a separate artifact; `nativeTest` gates every commit. |

## Conventions

1. The framework only does **switching**; it does not restrict what you do after the switch.
2. Datasource keys split by `_`: the **first** part is the group name; keys sharing it form one group.
3. A switch target can be a group name or a concrete datasource name. Group names go through the strategy (load-balancing by default, random optional).
4. The default datasource is `master`; change it via `spring.datasource.dynamic.primary`.
5. Priority, highest first: **programmatic push > method annotation > class annotation**.
6. `@DS` is inherited from **interfaces** (since 3.4.1) and **abstract classes**, and bridge methods are resolved.

For the details behind rules 5 and 6, see [@DS semantics and precedence](./ds-semantics).

## Next steps

- [@DS semantics and precedence](./ds-semantics) — groups vs. datasources, nearest-wins, dynamic keys
- [Full configuration reference](./configuration) — every property and its default
- [Out of scope](./out-of-scope) — what this framework deliberately does *not* do
- [Troubleshooting datasource switching](./switching-failure)