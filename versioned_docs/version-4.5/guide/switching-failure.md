---
title: "常见问题：切换数据源失败"
description: "原因： spring 开启事务后会维护一个 ConnectionHolder，保证在整个事务下，都是用同一个数据库连接。"
---

# 常见问题：切换数据源失败

## 1.开启了 spring 的事务。

原因： spring 开启事务后会维护一个 ConnectionHolder，保证在整个事务下，都是用同一个数据库连接。

请检查整个调用链路涉及的类的方法和类本身还有继承的抽象类上是否有`@Transactional`注解。

如强烈需要事务保证多个库同时执行成功或者失败，请查看事务专栏的解决办法。

## 2.方法内部调用。

查看以下示例 回答 外部调用 `userservice.test1()` 能在执行到 `test2()` 切换到 second 数据源吗？  

```java
public UserService {

    @DS("first")
    public void test1() {
        // do something
         test2();
    }

    @DS("second")
    public void test2() {
        // do something
    }
}
```

答案：**！！！不能不能不能！！！！** 数据源核心原理是基于 aop 代理实现切换，内部方法调用不会使用 aop。

解决方法:

把 test2()方法提到另外一个 service,单独调用。

## 3.shiroAop 代理。

在 shiro 框架中(UserRealm)使用 @Autowire 注入的类, 缓存注解和事务注解都失效。  

```java
@Component
public class UserRealm extends AuthorizingRealm {

    @Lazy
    @Autowired
    private IUserService userService;
	//... 省略其他无关的内容
}
```

解决方法:  
1.在 Shiro 框架中注入 Bean 时, 不使用 @Autowire, 使用 ApplicationContextRegister.getBean()方法,手动注入 bean。

2.使用 @Autowire+@Lazy 注解,设置注入到 Shiro 框架的 Bean 延时加载(推荐)。

## 4.PostConstruct 初始化顺序。

初始化包括: @PostConstruct 注解, InitializingBean 接口, 自定义 init-method

```java
@Component
public class MyConfiguration {
    @Resource
    private UserMapper userMapper;
    @DS("slave")
    @PostConstruct
    public void init(){
        // 无法选择正确的数据源
        userMapper.selectById(1);
    }
}
```

解决方法：监听容器启动完成事件, 在容器完成后做初始化。

```java
@Component
public class MyConfiguration {

    @DS("slave")
    @EventListener
    public void onApplicationEvent(ContextRefreshedEvent event) {
        // 成功选择正确的数据源
        userMapper.selectById(1);
    }
}
```

相关 spring 源码 : `org.springframework.beans.factory.support.AbstractAutowireCapableBeanFactory#initializeBean

在初始化完成后, bean 进入增强阶段, 所以这个阶段的任何 AOP 都是无效的。

## 5.Druid 版本过低。

请升级 druid1.1.22 及以上版本，这个版本修复了在高并发下偶发的切换失效问题。

## 6.@Async 或者 java8 的 ParallelStream 并行流之类方法。

这种情况都是新开了线程去处理，不受当前线程管控了。 可以在新开的方法上加对应的 DS 注解解决。

---

## 扩展阅读

### shiro 失效原因

在 spring 初始化 bean 的阶段中,大致上分为三段: BeanFactoryPostProcessor -> BeanPostProcessor -> Bean

这三种都是单例 bean. 只不过会按照这个优先级进行初始化, shiro 引起 AOP 失效的原因: 

ShiroFilterFactoryBean 是一个 BeanPostProcessor ,  比普通的单例 Bean 都优先加载, 所以他依赖注入的 bean 都无法正确的进行切面。

ShiroFilterFactoryBean 实际的依赖情况:  
ShiroFilterFactoryBean ->  SecurityManager -> UserRealm -> IUserService

IUserService 依赖的其他 service 也会失效
IUserService-> MenuService -> RoleService 