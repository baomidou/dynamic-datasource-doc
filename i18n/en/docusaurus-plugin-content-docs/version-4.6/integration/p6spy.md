---
title: "Integrating P6spy"
description: "P6spy is a JDBC driver wrapper that prints SQL with the real parameter values, fixing the problem of logs showing nothing but ? placeholders."
---

# Integrating P6spy

## Overview

P6spy is a JDBC driver wrapper that prints SQL **with the real parameter values**, fixing the problem of logs showing nothing but `?` placeholders.

- P6spy on GitHub [https://github.com/p6spy/p6spy](https://github.com/p6spy/p6spy)
- P6spy documentation [https://p6spy.readthedocs.io/en/latest/](https://p6spy.readthedocs.io/en/latest/)

```shell
# before
select * from user where age>?
# after enabling p6spy
select * from user where age>6
```

## Integration steps

### 1. Add the `p6spy` dependency

[![](https://img.shields.io/maven-central/v/p6spy/p6spy.svg)](http://mvnrepository.com/artifact/p6spy/p6spy)

```xml
<dependency>
    <groupId>p6spy</groupId>
    <artifactId>p6spy</artifactId>
    <version>${version}</version>
</dependency>
```

### 2. Enable p6spy

```yaml
spring:
  datasource:
    dynamic:
      p6spy: true # default false; recommended to keep it off in production
      datasource:
        product:
          username: sa
          password: ""
          url: jdbc:h2:mem:test
          driver-class-name: org.h2.Driver
          p6spy: false # can be disabled for a single datasource
        order:
          username: sa
          password: ""
          url: jdbc:h2:mem:test
          driver-class-name: org.h2.Driver
```

### 3. Add the configuration file

Create `spy.properties` on the classpath:

```properties
# a minimal configuration: log through slf4j. Learn the other options on your own.
appender=com.p6spy.engine.spy.appender.Slf4JLogger
```

Simple sample: [https://github.com/dynamic-datasource/dynamic-datasource-samples/tree/master/spring-boot-4/druid-sample](https://github.com/dynamic-datasource/dynamic-datasource-samples/tree/master/spring-boot-4/druid-sample)