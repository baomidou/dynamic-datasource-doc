---
title: "Lazy Datasource Startup"
description: "Lazy startup: the connection pool is not initialized right after it is created; it is initialized when a connection is actually needed."
---

# Lazy Datasource Startup

## Overview

Lazy startup: the connection pool is not initialized right after it is created; it is initialized when a connection is actually needed.

For now only the Druid, HikariCP and BeeCP pools support it.

The main use case is having many datasources that do not need to be initialized at startup, which shortens startup time.

The **downside** is that a misconfigured parameter stays silent at startup and only fails — possibly throwing repeatedly — at initialization time.

## Configuration

```yaml
spring:
  datasource:
    dynamic:
      primary: master # the default datasource or datasource group, defaults to master
      strict: false # strict mode, off by default. When on, an unmatched datasource name throws instead of falling back to the default datasource.
      lazy: true # false by default; when false the pool is initialized as soon as the datasource is loaded
      datasource:
        master:
          url: jdbc:mysql://xx.xx.xx.xx:3306/dynamic
          username: root
          password: 123456
          driver-class-name: com.mysql.jdbc.Driver
          lazy: true # this datasource starts lazily
        db1:
          url: jdbc:mysql://xx.xx.xx.xx:3307/dynamic
          username: root
          password: 123456
          driver-class-name: com.mysql.jdbc.Driver
        db2:
          url: jdbc:mysql://xx.xx.xx.xx:3307/dynamic
          username: root
          password: 123456
          driver-class-name: com.mysql.jdbc.Driver
```