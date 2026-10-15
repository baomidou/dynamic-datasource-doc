---
title: "集成 DBCP2"
description: "集成 DBCP2"
---

# 集成 DBCP2

## 基础介绍

- Dbcp2 Github [https://github.com/apache/commons-dbcp](https://github.com/apache/commons-dbcp)
- Dbcp2 文档 [https://commons.apache.org/proper/commons-dbcp/](https://commons.apache.org/proper/commons-dbcp/)

## 集成步骤

## 1. 项目引入 `Dbcp2 ` 依赖。
[![](https://img.shields.io/maven-central/v/org.apache.commons/commons-dbcp2.svg)](http://mvnrepository.com/artifact/org.apache.commons/commons-dbcp2)

```xml
<dependency>
    <groupId>org.apache.commons</groupId>
    <artifactId>commons-dbcp2</artifactId>
    <version>${version}</version>
</dependency>
```

## 2.参数配置。

1. 如果参数都未配置，则保持原组件默认值。
2. 如果配置了全局参数，则每一个数据源都会继承对应参数。 
3. 每一个数据源可以单独设置参数覆盖全局参数。

```yaml
spring:
  datasource:
    dynamic:
      dbcp2:  # 全局dbcp2参数，所有值和默认保持一致。(现已支持的参数如下,不清楚含义不要乱设置)
        initial-size:
      datasource:
        master:
          username: root
          password: 123456
          driver-class-name: com.mysql.jdbc.Driver
          url: jdbc:mysql://xx.xx.xx.xx:3306/dynamic?characterEncoding=utf8&useSSL=false
          dbcp2: # 以下参数针对每个库可以重新设置dbcp2参数
            initial-size:
#           ......
```

## 核心源码

`dbcp2数据源创建器`  [https://github.com/baomidou/dynamic-datasource-spring-boot-starter/blob/master/dynamic-datasource-creator/src/main/java/com/baomidou/dynamic/datasource/creator/dbcp/Dbcp2DataSourceCreator.java](https://github.com/baomidou/dynamic-datasource-spring-boot-starter/blob/master/dynamic-datasource-creator/src/main/java/com/baomidou/dynamic/datasource/creator/dbcp/Dbcp2DataSourceCreator.java)

`dbcp2参数配置类`  [https://github.com/baomidou/dynamic-datasource-spring-boot-starter/blob/master/dynamic-datasource-creator/src/main/java/com/baomidou/dynamic/datasource/creator/dbcp/Dbcp2Config.java](https://github.com/baomidou/dynamic-datasource-spring-boot-starter/blob/master/dynamic-datasource-creator/src/main/java/com/baomidou/dynamic/datasource/creator/dbcp/Dbcp2Config.java)