# FAQ: Datasource Switching Fails

## 1. A Spring transaction is already open.

Cause: after a Spring transaction starts, it keeps a `ConnectionHolder` so that the whole transaction uses the same database connection.

Check whether every class/method on the call chain — including inherited abstract classes — carries `@Transactional`.

If you truly need several databases to commit or fail together, see the solutions in the Transactions section.

## 2. Calling a method internally.

Look at the example below: when an external caller invokes `userservice.test1()`, will `test2()` switch to the `second` datasource?

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

Answer: **NO — it will not!** The core of datasource switching is an AOP proxy, and internal method calls never go through AOP.

Solution:

Move `test2()` into another service and call it separately.

## 3. Shiro AOP proxy.

In a Shiro application, beans injected with `@Autowire` into classes such as `UserRealm` lose both caching and transaction annotations.

```java
@Component
public class UserRealm extends AuthorizingRealm {

    @Lazy
    @Autowired
    private IUserService userService;
	//... unrelated content omitted
}
```

Solutions:
1. In Shiro, do not inject beans with `@Autowire`; use `ApplicationContextRegister.getBean()` to inject them manually.

2. Combine `@Autowire` with `@Lazy` to make the injected bean lazily initialized (recommended).

## 4. @PostConstruct initialization order.

Initialization covers: the `@PostConstruct` annotation, the `InitializingBean` interface, and custom `init-method`s.

```java
@Component
public class MyConfiguration {
    @Resource
    private UserMapper userMapper;
    @DS("slave")
    @PostConstruct
    public void init(){
        // cannot resolve the correct datasource
        userMapper.selectById(1);
    }
}
```

Solution: listen for the container-started event and run initialization afterwards.

```java
@Component
public class MyConfiguration {

    @DS("slave")
    @EventListener
    public void onApplicationEvent(ContextRefreshedEvent event) {
        // resolves the correct datasource
        userMapper.selectById(1);
    }
}
```

Relevant Spring source: `org.springframework.beans.factory.support.AbstractAutowireCapableBeanFactory#initializeBean`

After initialization completes, the bean enters the enhancement (proxying) phase, so any AOP used before that phase is ineffective.

## 5. Druid version too old.

Upgrade to Druid 1.1.22+, which fixes occasional switching failures under high concurrency.

## 6. @Async or Java 8 parallel streams.

These run on newly started threads that are not governed by the current thread. Annotate the newly started method with the corresponding `@DS` annotation to fix it.

---

## Further reading

### Why Shiro breaks it

During Spring bean initialization there are roughly three phases: BeanFactoryPostProcessor -> BeanPostProcessor -> Bean

They are all singletons, only initialized by that priority. Shiro breaks AOP because:

`ShiroFilterFactoryBean` is a BeanPostProcessor, loaded before ordinary singleton beans, so every bean it injects is not correctly advised.

Actual dependency chain:

ShiroFilterFactoryBean ->  SecurityManager -> UserRealm -> IUserService

Other services that `IUserService` depends on are affected as well:
IUserService -> MenuService -> RoleService
