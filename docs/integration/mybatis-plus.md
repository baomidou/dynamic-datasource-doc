# 集成 MyBatis-Plus

## 基础介绍

- MybatisPlus Github [https://github.com/baomidou/mybatis-plus](https://github.com/baomidou/mybatis-plus)
- MybatisPlus 文档 [https://mybatis.plus/](https://mybatis.plus/)

> 只要引入了mybatisPlus相关jar包，项目自动集成，兼容mybatisPlus 2.x和3.x的版本。

#  集成步骤

## 1. 项目引入 `mybatis-Plus` 依赖。
[![](https://img.shields.io/maven-central/v/com.baomidou/mybatis-plus.svg)](http://mvnrepository.com/artifact/com.baomidou/mybatis-plus)

```xml
<dependency>
    <groupId>com.baomidou</groupId>
    <artifactId>mybatis-plus-boot-starter</artifactId>
    <version>${version}</version>
</dependency>
```

## 2. 使用`DS`注解进行切换数据源。

```java
@Service
@DS("mysql")
public class UserServiceImpl extends ServiceImpl<UserMapper, User> implements UserService {

    @DS("oracle")
    publid void addUser(User user){
        //do something
        baseMapper.insert(user);
    }
}
```

## 3.分页配置。

```java
@Bean
public MybatisPlusInterceptor mybatisPlusInterceptor() {
    MybatisPlusInterceptor interceptor = new MybatisPlusInterceptor();
    //如果是不同类型的库，请不要指定DbType，其会自动判断。
    interceptor.addInnerInterceptor(new PaginationInnerInterceptor());
   // interceptor.addInnerInterceptor(new PaginationInnerInterceptor(DbType.MYSQL));
    return interceptor;
}
```

## 4.注意事项。

mp内置的ServiceImpl在新增,更改,删除等一些方法上自带事物导致不能切换数据源。

**解决办法:**

1. 复制ServiceImpl出来为自己的MyServiceImpl，并去掉所有事务注解。
2. 创建一个新方法，并在此方法上加DS注解. 如上面的`addUser`方法。

## FAQ

**为什么要单独拿出来说和mybatisPlus的集成**？

因为mybatisPlus重写了一些核心类，必须通过解析获得真实的代理对象。

如果自己写多数据源，则很难完成与mp的集成。

核心解析源码 [https://github.com/baomidou/dynamic-datasource-spring-boot-starter/blob/master/dynamic-datasource-spring/src/main/java/com/baomidou/dynamic/datasource/support/DataSourceClassResolver.java](https://github.com/baomidou/dynamic-datasource-spring-boot-starter/blob/master/dynamic-datasource-spring/src/main/java/com/baomidou/dynamic/datasource/support/DataSourceClassResolver.java)

## 示例项目

https://github.com/dynamic-datasource/dynamic-datasource-samples/tree/master/spring-boot-4/mybatisplus3-sample