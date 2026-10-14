# 集成 Druid

## 基础介绍

- Druid Github <https://github.com/alibaba/druid>
- Druid 文档 <https://github.com/alibaba/druid/wiki>

本组件能```简单高效``` 完成对Druid的集成并完成其参数的多元化配置。

1.各个库可以使用不同的数据库连接池，如  **master使用Druid监控，从库使用HikariCP**。
2.如果项目同时存在Druid和HikariCP并且未配置连接池type类型，默认 **Druid优先于HikariCP** 。

#  集成步骤

## 1. 项目引入 `druid-spring-boot-starter` 依赖。
<a href="http://mvnrepository.com/artifact/com.alibaba/druid" target="_blank"><img src="https://img.shields.io/maven-central/v/com.alibaba/druid.svg" ></a>

```xml
<dependency>
    <groupId>com.alibaba</groupId>
    <artifactId>druid-spring-boot-starter</artifactId>
    <version>${version}</version>
</dependency>
```

## 2. 排除原生Druid的快速配置类。

注意：**v3.3.3及以上**版本基本不用排除了。
PS:作者2024-04-19更新补充， 新版druid 1.2.22更改了底层自动配置，如果你使用这个版本还是需要手动排除。

```java
@SpringBootApplication(exclude = DruidDataSourceAutoConfigure.class)
public class Application {

  public static void main(String[] args) {
    SpringApplication.run(Application.class, args);
  }
}

```
某些springBoot的版本上面可能无法排除可用以下方式排除。
```yaml
spring:
  autoconfigure:
    exclude: com.alibaba.druid.spring.boot.autoconfigure.DruidDataSourceAutoConfigure
```

## 3.参数配置。

1. 如果参数都未配置，则保持原组件默认值。
2. 如果配置了全局参数，则每一个数据源都会继承对应参数。 
3. 每一个数据源可以单独设置参数覆盖全局参数。

基本上原生druid支持的参数都支持，完整支持的字段请看源码。

https://github.com/baomidou/dynamic-datasource-spring-boot-starter/blob/master/dynamic-datasource-creator/src/main/java/com/baomidou/dynamic/datasource/creator/druid/DruidConfig.java

```yaml
spring:
  datasource:
    druid:
      stat-view-servlet:
        enabled: true
        loginUsername: admin
        loginPassword: 123456
    dynamic:
      druid: #以下是支持的全局默认值
        initial-size:
        max-active:
        filters: stat # 注意这个值和druid原生不一致，默认启动了stat。 如果确定什么filter都不需要 这里填 ""
        ...等等基本都支持
        wall:
            none-base-statement-allow:
            ...等等
        stat:
          merge-sql:
          log-slow-sql:
          slow-sql-millis: 
      datasource:
        master:
          username: root
          password: 123456
          driver-class-name: com.mysql.jdbc.Driver
          url: jdbc:mysql://xx.xx.xx.xx:3306/dynamic?characterEncoding=utf8&useSSL=false
          druid: # 以下是独立参数，每个库可以重新设置
            initial-size: 20
            validation-query: select 1 FROM DUAL #比如oracle就需要重新设置这个
            public-key: #（非全局参数）设置即表示启用加密,底层会自动帮你配置相关的连接参数和filter，推荐使用本项目自带的加密方法。
#           ......

# 生成 publickey 和密码，推荐使用本项目自带的加密方法。
# java -cp druid-1.1.10.jar com.alibaba.druid.filter.config.ConfigTools youpassword
```

如上即可配置访问用户和密码，访问 `http://localhost:8080/druid/index.html` 查看druid监控。

## 示例项目

https://github.com/dynamic-datasource/dynamic-datasource-samples/tree/master/datasource-samples/druid-sample

## 核心源码

`Druid数据源创建器`  <https://github.com/baomidou/dynamic-datasource-spring-boot-starter/blob/master/dynamic-datasource-creator/src/main/java/com/baomidou/dynamic/datasource/creator/druid/DruidDataSourceCreator.java>

`Druid参数源码`  <https://github.com/baomidou/dynamic-datasource-spring-boot-starter/blob/master/dynamic-datasource-creator/src/main/java/com/baomidou/dynamic/datasource/creator/druid/DruidConfig.java>

如有参数缺失可参考源码提交PR。


