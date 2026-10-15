---
title: "Integrating BeeCP"
description: "Integrating BeeCP"
---

# Integrating BeeCP

## Overview

- BeeCP on GitHub [https://github.com/Chris2018998/BeeCP](https://github.com/Chris2018998/BeeCP)
- BeeCP documentation [https://github.com/Chris2018998/BeeCP/blob/master/README_ZH.md](https://github.com/Chris2018998/BeeCP/blob/master/README_ZH.md)

## Integration steps

## 1. Add the `BeeCP` dependency.

[![](https://img.shields.io/maven-central/v/com.github.chris2018998/beecp.svg)](http://mvnrepository.com/artifact/com.github.chris2018998/beecp)

```xml
<dependency>
    <groupId>com.github.chris2018998</groupId>
    <artifactId>beecp</artifactId>
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
      beecp:  # global BeeCP parameters, all values match the defaults (supported parameters are listed below; do not set anything you do not understand)
        default-catalog:
        default-schema:
        default-readOnly:
        default-auto-commit:
        default-transaction-isolation-code:
        default-transaction-isolation-name:
        fair-mode:
        initial-size:
        max-active:
        borrow-semaphore-size:
        max-wait:
        idle-timeout:
        hold-timeout:
        connection-test-sql:
        connection-test-timeout:
        connection-test-integererval:
        idle-check-time-integererval:
        force-close-using-on-clear:
        delay-time-for-next-clear:
        connection-factory-class-name:
        xa-connection-factory-class-name:
        pool-implement-class-name:
        enable-jmx:
        connect-properties:
      datasource:
        master:
          username: root
          password: 123456
          driver-class-name: com.mysql.jdbc.Driver
          url: jdbc:mysql://xx.xx.xx.xx:3306/dynamic?characterEncoding=utf8&useSSL=false
          beecp: # per-datasource BeeCP parameters
            initial-size:
            max-active:
#           ......
```

## Core source

`BeeCP datasource creator` [https://github.com/baomidou/dynamic-datasource-spring-boot-starter/blob/master/dynamic-datasource-creator/src/main/java/com/baomidou/dynamic/datasource/creator/beecp/BeeCpDataSourceCreator.java](https://github.com/baomidou/dynamic-datasource-spring-boot-starter/blob/master/dynamic-datasource-creator/src/main/java/com/baomidou/dynamic/datasource/creator/beecp/BeeCpDataSourceCreator.java)

`BeeCP parameter class` [https://github.com/baomidou/dynamic-datasource-spring-boot-starter/blob/master/dynamic-datasource-creator/src/main/java/com/baomidou/dynamic/datasource/creator/beecp/BeeCpConfig.java](https://github.com/baomidou/dynamic-datasource-spring-boot-starter/blob/master/dynamic-datasource-creator/src/main/java/com/baomidou/dynamic/datasource/creator/beecp/BeeCpConfig.java)