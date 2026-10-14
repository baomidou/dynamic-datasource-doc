# 集成 P6spy

## 基础介绍

P6spy 是一个 JDBC 驱动包装层，用于打印**带真实参数值**的 SQL，弥补日志里只能看到 `?` 占位符的问题。

- P6spy Github [https://github.com/p6spy/p6spy](https://github.com/p6spy/p6spy)
- P6spy 文档 [https://p6spy.readthedocs.io/en/latest/](https://p6spy.readthedocs.io/en/latest/)

```shell
# before
select * from user where age>?
# after enabled p6spy
select * from user where age>6
```

## 集成步骤

### 1. 项目引入 `p6spy` 依赖
[![](https://img.shields.io/maven-central/v/p6spy/p6spy.svg)](http://mvnrepository.com/artifact/p6spy/p6spy)

```xml
<dependency>
    <groupId>p6spy</groupId>
    <artifactId>p6spy</artifactId>
    <version>${version}</version>
</dependency>
```

### 2. 启用 p6spy 相关配置

```yaml
spring:
  datasource:
    dynamic:
      p6spy: true # 默认false,建议线上关闭。
      datasource:
        product:
          username: sa
          password: ""
          url: jdbc:h2:mem:test
          driver-class-name: org.h2.Driver
          p6spy: false # 如果这个库不需要可单独关闭。
        order:
          username: sa
          password: ""
          url: jdbc:h2:mem:test
          driver-class-name: org.h2.Driver
```

### 3. 引入相关配置文件

在 classpath 下创建 `spy.properties`：

```properties
# 一个最简单配置,定义slf4j日志输出。 更多参数请自行了解。
appender=com.p6spy.engine.spy.appender.Slf4JLogger
```

简单示例 [https://github.com/dynamic-datasource/dynamic-datasource-samples/tree/master/spring-boot-4/druid-sample](https://github.com/dynamic-datasource/dynamic-datasource-samples/tree/master/spring-boot-4/druid-sample)