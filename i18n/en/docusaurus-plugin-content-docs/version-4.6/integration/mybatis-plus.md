---
title: "Integrating MyBatis-Plus"
description: "The ServiceImpl built into MP carries its own transaction on methods such as insert, update and delete, which makes datasource switching impossible."
---

# Integrating MyBatis-Plus

## Overview

- MyBatis-Plus on GitHub [https://github.com/baomidou/mybatis-plus](https://github.com/baomidou/mybatis-plus)
- MyBatis-Plus documentation [https://mybatis.plus/](https://mybatis.plus/)

> Simply adding the mybatis-plus jars integrates it — no extra configuration needed. Use mybatis-plus `3.x` (for Spring Boot 3/4 pick the matching mybatis-plus version).

## Integration steps

## 1. Add the `mybatis-plus` dependency.

[![](https://img.shields.io/maven-central/v/com.baomidou/mybatis-plus.svg)](http://mvnrepository.com/artifact/com.baomidou/mybatis-plus)

```xml
<dependency>
    <groupId>com.baomidou</groupId>
    <artifactId>mybatis-plus-boot-starter</artifactId>
    <version>${version}</version>
</dependency>
```

## 2. Switch datasources with the `DS` annotation.

```java
@Service
@DS("mysql")
public class UserServiceImpl extends ServiceImpl<UserMapper, User> implements UserService {

    @DS("oracle")
    public void addUser(User user) {
        //do something
        baseMapper.insert(user);
    }
}
```

## 3. Pagination configuration.

```java
@Bean
public MybatisPlusInterceptor mybatisPlusInterceptor() {
    MybatisPlusInterceptor interceptor = new MybatisPlusInterceptor();
    // with heterogeneous databases, do not specify a DbType; it is detected automatically.
    interceptor.addInnerInterceptor(new PaginationInnerInterceptor());
   // interceptor.addInnerInterceptor(new PaginationInnerInterceptor(DbType.MYSQL));
    return interceptor;
}
```

## 4. Notes.

The `ServiceImpl` built into MP carries its own transaction on methods such as insert, update and delete, which makes datasource switching impossible.

**Workarounds:**

1. Copy `ServiceImpl` into your own `MyServiceImpl` and strip every transaction annotation.
2. Create a new method and put `@DS` on it, like the `addUser` method above.

A more complete list of call styles (`lambdaQuery()` chaining, `IService` default methods, `saveBatch`, ActiveRecord, `databaseId`, …) is in [@DS placement and MyBatis-Plus call styles](../faq/annotation-placement).

## FAQ

**Why does MyBatis-Plus deserve its own integration page?**

Because MyBatis-Plus overrides some core classes, and the real proxy target has to be obtained by resolving them.

Writing your own multi-datasource support makes integrating with MP very hard.

Core resolution source: `DataSourceClassResolver`
[https://github.com/baomidou/dynamic-datasource/blob/master/dynamic-datasource-spring/src/main/java/com/baomidou/dynamic/datasource/support/DataSourceClassResolver.java](https://github.com/baomidou/dynamic-datasource/blob/master/dynamic-datasource-spring/src/main/java/com/baomidou/dynamic/datasource/support/DataSourceClassResolver.java)

## Sample project

https://github.com/dynamic-datasource/dynamic-datasource-samples/tree/master/spring-boot-4/mybatisplus3-sample