# Getting Started

**A starter for quickly integrating multiple datasources in Spring Boot**

![](https://github.com/baomidou/dynamic-datasource-spring-boot-starter/workflows/CodeQL/badge.svg?branch=master)
![](https://badgen.net/github/stars/baomidou/dynamic-datasource-spring-boot-starter)
[![](https://img.shields.io/maven-central/v/com.baomidou/dynamic-datasource-spring-boot-starter.svg)](https://mvnrepository.com/artifact/com.baomidou/dynamic-datasource-spring-boot-starter)
[![](https://img.shields.io/:license-apache-brightgreen.svg)](https://www.apache.org/licenses/LICENSE-2.0.html)
![](https://img.shields.io/badge/JDK-1.7+-green.svg)
![](https://img.shields.io/badge/springBoot-1.5.x__2.x.x__3.x.x-green.svg)
[![](https://img.shields.io/badge/IntelliJ%20IDEA-support-blue.svg)](https://www.jetbrains.com)
![](https://img.shields.io/badge/License-Apache%202.0-blue.svg)
[![dynamic-datasource QQ group](https://pub.idqqimg.com/wpa/images/group.png)](https://shang.qq.com/wpa/qunwpa?idkey=ded31006508b57d2d732c81266dd2c26e33283f84464e2c294309d90b9674992)

## Introduction

dynamic-datasource-spring-boot-starter is a starter for quickly integrating multiple datasources into a Spring Boot application.

It supports **JDK 1.7+, Spring Boot 1.5.x / 2.x.x / 3.x.x**.
JPA users are not encouraged to use it: JPA manages its own transactions and cannot switch datasources continuously.

## Features

- **Datasource groups** covering many scenarios: pure multiple databases, read-write splitting, one master with multiple slaves, mixed modes.
- **Encrypted (and customizable) sensitive configuration** via `ENC()`.
- Per-datasource initialization of table schema and database.
- Startup without datasources; lazy datasource creation (connections are created on demand).
- **Custom annotations** by extending `@DS` (3.2.0+).
- Simplified, out-of-the-box integration with Druid, HikariCP, BeeCP and DBCP2.
- Integration recipes for MyBatis-Plus, Quartz, ShardingJDBC, P6spy, JNDI and more.
- **Custom datasource providers** (e.g. loading all datasources from a database).
- **Adding and removing datasources dynamically** at runtime.
- A **pure read-write splitting** solution for MyBatis.
- **SpEL dynamic keys** for datasource resolution; built-in SpEL, session and header processors, fully customizable.
- **Multi-level nested switching** (ServiceA >>> ServiceB >>> ServiceC).
- A **Seata-based distributed transaction** solution.
- A **local multi-datasource transaction** solution.

## Conventions

1. This framework only does one core thing — **switching datasources** — and places no restriction on your operations after the switch: any CRUD is fine.
2. For datasource keys split by `_`, the **first** part is the group name; keys sharing a group name are grouped together.
3. A switch target can be either a group name or a concrete datasource name. Group names are resolved through the load-balancing strategy.
4. The default datasource name is **master**; change it with `spring.datasource.dynamic.primary`.
5. Method-level annotations take precedence over class-level ones.
6. `@DS` is inherited from abstract classes; inheriting from interfaces is not supported yet.

## Usage

1. Add dynamic-datasource-spring-boot-starter.

**spring-boot 1.5.x / 2.x.x**
```xml
<dependency>
  <groupId>com.baomidou</groupId>
  <artifactId>dynamic-datasource-spring-boot-starter</artifactId>
  <version>${version}</version>
</dependency>
```

**spring-boot3**
```xml
<dependency>
  <groupId>com.baomidou</groupId>
  <artifactId>dynamic-datasource-spring-boot3-starter</artifactId>
  <version>${version}</version>
</dependency>
```

2. Configure datasources.

```yaml
spring:
  datasource:
    dynamic:
      primary: master # default datasource or datasource group; defaults to master
      strict: false # strict matching; when true an unmatched datasource throws, false falls back to the primary
      datasource:
        master:
          url: jdbc:mysql://xx.xx.xx.xx:3306/dynamic
          username: root
          password: 123456
          driver-class-name: com.mysql.jdbc.Driver # SPI supported since 3.2.0, this can be omitted
        slave_1:
          url: jdbc:mysql://xx.xx.xx.xx:3307/dynamic
          username: root
          password: 123456
          driver-class-name: com.mysql.jdbc.Driver
        slave_2:
          url: ENC(xxxxx) # built-in encryption, see the detailed docs
          username: ENC(xxxxx)
          password: ENC(xxxxx)
          driver-class-name: com.mysql.jdbc.Driver
       #......omitted
       #this configures a default master database and a slave group with slave_1 and slave_2
```

```yaml
# multi-master multi-slave            # pure multiple databases (set primary!)     # mixed
spring:                               spring:                               spring:
  datasource:                           datasource:                           datasource:
    dynamic:                              dynamic:                              dynamic:
      datasource:                           datasource:                           datasource:
        master_1:                             mysql:                                master:
        master_2:                             oracle:                               slave_1:
        slave_1:                              sqlserver:                            slave_2:
        slave_2:                              postgresql:                           oracle_1:
        slave_3:                              h2:                                   oracle_2:
```

3. Switch datasources with **@DS**.

**@DS** can be annotated on a method or a class; when both exist, **method-level wins**.

|      Annotation       |           Result            |
|:-------------:|:-----------------------:|
|     no @DS     |          default datasource          |
| @DS("dsName") | dsName can be a group name or a concrete datasource name |

```java
@Service
@DS("slave")
public class UserServiceImpl implements UserService {

  @Autowired
  private JdbcTemplate jdbcTemplate;

  public List selectAll() {
    return  jdbcTemplate.queryForList("select * from user");
  }
  
  @Override
  @DS("slave_1")
  public List selectByCondition() {
    return  jdbcTemplate.queryForList("select * from user where age >10");
  }
}
```
