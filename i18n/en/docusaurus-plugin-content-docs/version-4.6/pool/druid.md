---
title: "Integrating Druid"
description: "This framework integrates Druid simply and efficiently and supports a wide range of parameter configurations."
---

# Integrating Druid

## Overview

- Druid on GitHub [https://github.com/alibaba/druid](https://github.com/alibaba/druid)
- Druid documentation [https://github.com/alibaba/druid/wiki](https://github.com/alibaba/druid/wiki)

This framework integrates Druid **simply and efficiently** and supports a wide range of parameter configurations.

1. Each database may use a different pool, for example **Druid with monitoring on master and HikariCP on the replicas**.
2. If both Druid and HikariCP are on the classpath and no `type` is configured, **Druid takes precedence over HikariCP**.

# Integration steps

## 1. Add the `druid-spring-boot-starter` dependency.

[![](https://img.shields.io/maven-central/v/com.alibaba/druid.svg)](http://mvnrepository.com/artifact/com.alibaba/druid)

```xml
<dependency>
    <groupId>com.alibaba</groupId>
    <artifactId>druid-spring-boot-starter</artifactId>
    <version>${version}</version>
</dependency>
```

## 2. Exclude Druid's native auto-configuration class.

Note: from **v3.3.3 onwards** you basically no longer need to do this.

PS: added by the author on 2024-04-19 — druid 1.2.22 changed its underlying auto-configuration, so with that version you still have to exclude it manually.

```java
@SpringBootApplication(exclude = DruidDataSourceAutoConfigure.class)
public class Application {

  public static void main(String[] args) {
    SpringApplication.run(Application.class, args);
  }
}

```
Some Spring Boot versions may not allow that exclusion; use the following instead.

```yaml
spring:
  autoconfigure:
    exclude: com.alibaba.druid.spring.boot.autoconfigure.DruidDataSourceAutoConfigure
```

## 3. Configure parameters.

1. If no parameter is configured, the component's own default is kept.
2. If global parameters are configured, every datasource inherits them.
3. Every datasource can set its own parameters to override the global ones.

Essentially every parameter native druid supports is supported here; see the source for the complete list of fields.

https://github.com/baomidou/dynamic-datasource-spring-boot-starter/blob/master/dynamic-datasource-creator/src/main/java/com/baomidou/dynamic/datasource/creator/druid/DruidConfig.java

```yaml
spring:
  datasource:
    druid:
      stat-view-servlet:
        enabled: true
        loginUsername: admin
        loginPassword: 123456
    dynamic:
      druid: # global defaults supported below
        initial-size:
        max-active:
        filters: stat # note: this differs from native druid, stat is enabled by default. If you are sure you need no filter at all, set it to ""
        ...and so on, basically all of them are supported
        wall:
            none-base-statement-allow:
            ...and so on
        stat:
          merge-sql:
          log-slow-sql:
          slow-sql-millis: 
      datasource:
        master:
          username: root
          password: 123456
          driver-class-name: com.mysql.jdbc.Driver
          url: jdbc:mysql://xx.xx.xx.xx:3306/dynamic?characterEncoding=utf8&useSSL=false
          druid: # per-datasource parameters, each database can redefine them
            initial-size: 20
            validation-query: select 1 FROM DUAL # oracle, for instance, needs this redefined
            public-key: # (not a global parameter) setting it enables encryption; the low-level code configures the related connection parameters and filter for you. The encryption method shipped with this project is recommended.
#           ......

# Generate a public key and a password; the encryption method shipped with this project is recommended.
# java -cp druid-1.1.10.jar com.alibaba.druid.filter.config.ConfigTools youpassword
```

With the configuration above, visit `http://localhost:8080/druid/index.html` to open the druid console.

## Sample project

https://github.com/dynamic-datasource/dynamic-datasource-samples/tree/master/spring-boot-4/druid-sample

## Core source

`Druid datasource creator` [https://github.com/baomidou/dynamic-datasource-spring-boot-starter/blob/master/dynamic-datasource-creator/src/main/java/com/baomidou/dynamic/datasource/creator/druid/DruidDataSourceCreator.java](https://github.com/baomidou/dynamic-datasource-spring-boot-starter/blob/master/dynamic-datasource-creator/src/main/java/com/baomidou/dynamic/datasource/creator/druid/DruidDataSourceCreator.java)

`Druid parameter source` [https://github.com/baomidou/dynamic-datasource-spring-boot-starter/blob/master/dynamic-datasource-creator/src/main/java/com/baomidou/dynamic/datasource/creator/druid/DruidConfig.java](https://github.com/baomidou/dynamic-datasource-spring-boot-starter/blob/master/dynamic-datasource-creator/src/main/java/com/baomidou/dynamic/datasource/creator/druid/DruidConfig.java)

If a parameter is missing, feel free to send a PR after checking the source.