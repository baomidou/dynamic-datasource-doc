# Integrating HikariCP

## Overview

- HikariCP on GitHub [https://github.com/brettwooldridge/HikariCP](https://github.com/brettwooldridge/HikariCP)
- HikariCP documentation [https://github.com/brettwooldridge/HikariCP/wiki](https://github.com/brettwooldridge/HikariCP/wiki)

## Integration steps

## 1. Add the `HikariCP` dependency.

[![](https://img.shields.io/maven-central/v/com.zaxxer/HikariCP.svg)](http://mvnrepository.com/artifact/com.zaxxer/HikariCP)

```xml
<dependency>
    <groupId>com.zaxxer</groupId>
    <artifactId>HikariCP</artifactId>
    <version>${version}</version>
</dependency>
```

`SpringBoot2.x.x` pulls in HikariCP by default — no need to add it again unless you need a specific version.

`SpringBoot 1.5.x` requires you to add it manually; pick the version that fits your environment according to the official HikariCP documentation.

## 2. Configure parameters.

1. If no parameter is configured, the component's own default is kept.
2. If global parameters are configured, every datasource inherits them.
3. Every datasource can set its own parameters to override the global ones.

One thing to note: some field names differ from native HikariCP. This component sets parameters by reflection, while native HikariCP field names and setter names do not match. So please take the field names of this component as the source of truth.

```yaml
spring:
  datasource:
    dynamic:
      hikari:  # global HikariCP parameters, all values match the defaults (supported parameters are listed below; do not set anything you do not understand)
        catalog:
        connection-timeout:
        validation-timeout:
        idle-timeout:
        leak-detection-threshold:
        max-lifetime:
        max-pool-size:
        min-idle:
        initialization-fail-timeout:
        connection-init-sql:
        connection-test-query:
        dataSource-class-name:
        dataSource-jndi-name:
        schema:
        transaction-isolation-name:
        is-auto-commit:
        is-read-only:
        is-isolate-internal-queries:
        is-register-mbeans:
        is-allow-pool-suspension:
        data-source-properties: 
        health-check-properties:
      datasource:
        master:
          username: root
          password: 123456
          driver-class-name: com.mysql.jdbc.Driver
          url: jdbc:mysql://xx.xx.xx.xx:3306/dynamic?characterEncoding=utf8&useSSL=false
          hikari: # per-datasource Hikari parameters
            max-pool-size:
            idle-timeout:
#           ......
```

## FAQ

Failed to validate connection com.mysql.jdbc.JDBC4Connection@xxxxx (No operations allowed after connection closed.)
https://github.com/brettwooldridge/HikariCP/issues/1034

In short: HikariCP needs `connection-test-query`, and `max-lifetime` must be lower than MySQL's default wait timeout.

## Core source

`HikariCP datasource creator` [https://github.com/baomidou/dynamic-datasource-spring-boot-starter/blob/master/dynamic-datasource-creator/src/main/java/com/baomidou/dynamic/datasource/creator/hikaricp/HikariDataSourceCreator.java](https://github.com/baomidou/dynamic-datasource-spring-boot-starter/blob/master/dynamic-datasource-creator/src/main/java/com/baomidou/dynamic/datasource/creator/hikaricp/HikariDataSourceCreator.java)

`HikariCP parameter class` [https://github.com/baomidou/dynamic-datasource-spring-boot-starter/blob/master/dynamic-datasource-creator/src/main/java/com/baomidou/dynamic/datasource/creator/hikaricp/HikariCpConfig.java](https://github.com/baomidou/dynamic-datasource-spring-boot-starter/blob/master/dynamic-datasource-creator/src/main/java/com/baomidou/dynamic/datasource/creator/hikaricp/HikariCpConfig.java)
