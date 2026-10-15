---
title: "Integrating DBCP2"
description: "Integrating DBCP2"
---

# Integrating DBCP2

## Overview

- DBCP2 on GitHub [https://github.com/apache/commons-dbcp](https://github.com/apache/commons-dbcp)
- DBCP2 documentation [https://commons.apache.org/proper/commons-dbcp/](https://commons.apache.org/proper/commons-dbcp/)

## Integration steps

## 1. Add the `DBCP2` dependency.

[![](https://img.shields.io/maven-central/v/org.apache.commons/commons-dbcp2.svg)](http://mvnrepository.com/artifact/org.apache.commons/commons-dbcp2)

```xml
<dependency>
    <groupId>org.apache.commons</groupId>
    <artifactId>commons-dbcp2</artifactId>
    <version>${version}</version>
</dependency>
```

## 2. Configure parameters.

1. If no parameter is configured, the component's own default is kept.
2. If global parameters are configured, every datasource inherits them.
3. Every datasource can set its own parameters to override the global ones.

```yaml
spring:
  datasource:
    dynamic:
      dbcp2:  # global DBCP2 parameters, all values match the defaults (supported parameters are listed below; do not set anything you do not understand)
        initial-size:
      datasource:
        master:
          username: root
          password: 123456
          driver-class-name: com.mysql.jdbc.Driver
          url: jdbc:mysql://xx.xx.xx.xx:3306/dynamic?characterEncoding=utf8&useSSL=false
          dbcp2: # per-datasource DBCP2 parameters
            initial-size:
#           ......
```

## Core source

`DBCP2 datasource creator` [https://github.com/baomidou/dynamic-datasource-spring-boot-starter/blob/master/dynamic-datasource-creator/src/main/java/com/baomidou/dynamic/datasource/creator/dbcp/Dbcp2DataSourceCreator.java](https://github.com/baomidou/dynamic-datasource-spring-boot-starter/blob/master/dynamic-datasource-creator/src/main/java/com/baomidou/dynamic/datasource/creator/dbcp/Dbcp2DataSourceCreator.java)

`DBCP2 parameter class` [https://github.com/baomidou/dynamic-datasource-spring-boot-starter/blob/master/dynamic-datasource-creator/src/main/java/com/baomidou/dynamic/datasource/creator/dbcp/Dbcp2Config.java](https://github.com/baomidou/dynamic-datasource-spring-boot-starter/blob/master/dynamic-datasource-creator/src/main/java/com/baomidou/dynamic/datasource/creator/dbcp/Dbcp2Config.java)