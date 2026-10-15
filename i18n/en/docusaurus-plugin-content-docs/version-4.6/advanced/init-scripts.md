---
title: "Running Init Scripts at Startup"
description: "Before 3.5.0"
---

# Running Init Scripts at Startup

Before 3.5.0
```yml
spring:
  datasource:
    dynamic:
      primary: order
      datasource:
        order:
          # basic configuration omitted...
          schema: db/order/schema.sql # takes effect when set, initializes the schema automatically
          data: db/order/data.sql # takes effect when set, initializes the data automatically
          continue-on-error: true # default true, whether to continue when initialization fails
          separator: ";" # the default SQL separator is the semicolon, usually no need to change it
        product:
          schema: classpath*:db/product/schema.sql
          data: classpath*:db/product/data.sql
        user:
          schema: classpath*:db/user/schema/**/*.sql
          data: classpath*:db/user/data/**/*.sql
```

3.5.0 and later (one extra `init` level, to stay consistent with newer Spring Boot)
```yml
spring:
  datasource:
    dynamic:
      primary: order
      datasource:
        order:
          # basic configuration omitted...
          init:
              schema: db/order/schema.sql # takes effect when set, initializes the schema automatically
              data: db/order/data.sql # takes effect when set, initializes the data automatically
              continue-on-error: true # default true, whether to continue when initialization fails
              separator: ";" # the default SQL separator is the semicolon, usually no need to change it
```

Sample project [https://github.com/dynamic-datasource/dynamic-datasource-samples/blob/master/spring-boot-4/druid-sample/src/main/resources/application.yml](https://github.com/dynamic-datasource/dynamic-datasource-samples/blob/master/spring-boot-4/druid-sample/src/main/resources/application.yml)