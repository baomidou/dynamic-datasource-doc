---
title: "启动初始化执行脚本"
description: "3.5.0 之前版本"
---

# 启动初始化执行脚本

3.5.0 之前版本
```yml
spring:
  datasource:
    dynamic:
      primary: order
      datasource:
        order:
          # 基础配置省略...
          schema: db/order/schema.sql # 配置则生效,自动初始化表结构
          data: db/order/data.sql # 配置则生效,自动初始化数据
          continue-on-error: true # 默认true,初始化失败是否继续
          separator: ";" # sql默认分号分隔符，一般无需更改
        product:
          schema: classpath*:db/product/schema.sql
          data: classpath*:db/product/data.sql
        user:
          schema: classpath*:db/user/schema/**/*.sql
          data: classpath*:db/user/data/**/*.sql
```

3.5.0（含） 之后版本 (层级多了一层 init，保持和新版 springboot 一致)
```yml
spring:
  datasource:
    dynamic:
      primary: order
      datasource:
        order:
          # 基础配置省略...
          init:
              schema: db/order/schema.sql # 配置则生效,自动初始化表结构
              data: db/order/data.sql # 配置则生效,自动初始化数据
              continue-on-error: true # 默认true,初始化失败是否继续
              separator: ";" # sql默认分号分隔符，一般无需更改
```

示例项目 [https://github.com/dynamic-datasource/dynamic-datasource-samples/blob/master/spring-boot-4/druid-sample/src/main/resources/application.yml](https://github.com/dynamic-datasource/dynamic-datasource-samples/blob/master/spring-boot-4/druid-sample/src/main/resources/application.yml)