# 集成 BeeCP

## 基础介绍

- BeeCp Github <https://github.com/Chris2018998/BeeCP>
- BeeCp 文档 <https://github.com/Chris2018998/BeeCP/blob/master/README_ZH.md>

## 集成步骤

## 1. 项目引入 `BeeCp` 依赖。
<a href="http://mvnrepository.com/artifact/com.github.chris2018998/beecp" target="_blank">
<img src="https://img.shields.io/maven-central/v/com.github.chris2018998/beecp.svg" ></a>

```xml
<dependency>
    <groupId>com.github.chris2018998</groupId>
    <artifactId>beecp</artifactId>
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
      beecp:  # 全局beeCp参数，所有值和默认保持一致。(现已支持的参数如下,不清楚含义不要乱设置)
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
          beecp: # 以下参数针对每个库可以重新设置beeCp参数
            initial-size:
            max-active:
#           ......
```

## 核心源码

`BeeCp数据源创建器`  <https://github.com/baomidou/dynamic-datasource-spring-boot-starter/blob/master/dynamic-datasource-creator/src/main/java/com/baomidou/dynamic/datasource/creator/beecp/BeeCpDataSourceCreator.java>

`BeeCp参数配置类`  <https://github.com/baomidou/dynamic-datasource-spring-boot-starter/blob/master/dynamic-datasource-creator/src/main/java/com/baomidou/dynamic/datasource/creator/beecp/BeeCpConfig.java>