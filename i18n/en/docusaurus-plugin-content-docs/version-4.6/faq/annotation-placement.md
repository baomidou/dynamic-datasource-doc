# @DS Placement and MyBatis-Plus Call Styles

> Related issues: [#259](https://github.com/baomidou/dynamic-datasource/issues/259), [#104](https://github.com/baomidou/dynamic-datasource/issues/104), [#344](https://github.com/baomidou/dynamic-datasource/issues/344), [#355](https://github.com/baomidou/dynamic-datasource/issues/355), [#25](https://github.com/baomidou/dynamic-datasource/issues/25), [#59](https://github.com/baomidou/dynamic-datasource/issues/59), [#207](https://github.com/baomidou/dynamic-datasource/issues/207), [#337](https://github.com/baomidou/dynamic-datasource/issues/337), [#709](https://github.com/baomidou/dynamic-datasource/issues/709), [#73](https://github.com/baomidou/dynamic-datasource/issues/73), [#633](https://github.com/baomidou/dynamic-datasource/issues/633), [#589](https://github.com/baomidou/dynamic-datasource/issues/589)

## 1. Where should `@DS` go?

**Recommended: on methods of the Service implementation class.** The maintainer gave three reasons in [#259](https://github.com/baomidou/dynamic-datasource/issues/259):

1. **Low-level compatibility** — most of the exceptions caused by "putting the annotation on the Mapper" were only fixed in 3.2.0;
2. **The Service is what carries business semantics**, so it should decide which database to use;
3. Only when you are certain that a Mapper belongs to a single datasource may you annotate the Mapper.

**Precedence rule**:

```text
explicit switch in code (ContextHolder.push) > annotation on the method > annotation on the class
```

`@DS` declared on interfaces and superclasses is inherited; the complete rules are in [@DS semantics and precedence](../guide/ds-semantics).

## 2. MyBatis-Plus call styles (the source of 35+ historical issues)

`@DS` relies on Spring AOP intercepting "**the annotated method on the proxy**". Many of MP's convenience APIs bypass exactly that layer.

### Wrong style 1: the Controller calls `IService` default methods directly

```java
// Controller — will not switch!
@GetMapping("/list")
public List<User> list() {
    return userService.list();          // a default method of IService
}
```

`list()`, `getById()`, `lambdaQuery()`, `saveBatch()` and friends are provided by `IService`/`ServiceImpl` as interface default methods or as `AbstractChainWrapper`, so the actual execution path is not "your annotated implementation method" ([#25](https://github.com/baomidou/dynamic-datasource/issues/25), [#59](https://github.com/baomidou/dynamic-datasource/issues/59), [#207](https://github.com/baomidou/dynamic-datasource/issues/207), [#337](https://github.com/baomidou/dynamic-datasource/issues/337), [#355](https://github.com/baomidou/dynamic-datasource/issues/355)).

### Correct style: your own business method with the annotation, using any MP API inside it

```java
@Service
public class UserServiceImpl extends ServiceImpl<UserMapper, User> implements UserService {

    // the annotation goes on a public method you declare yourself; any MP API used inside takes effect
    @Override
    @DS("slave")
    public List<User> selectSlaveUsers() {
        return baseMapper.selectList(null);   // calling BaseMapper directly — OK
    }

    @Override
    @DS("slave")
    public List<User> selectLambdaSlaveUsers() {
        return this.lambdaQuery().list();     // lambda chaining — OK (the execution entry point is this proxied method)
    }
}
```

> The keyword is the **execution entry point**: as long as you enter through a method annotated with `@DS` on the proxy, any MP API called afterwards runs in the switched context.
> See `UserServiceImpl` in the official [mybatisplus3-sample](https://github.com/baomidou/dynamic-datasource-samples/tree/master/spring-boot-4/mybatisplus3-sample).

### Wrong style 2: the Controller calls `lambdaQuery()` and expects a switch

```java
// Controller — no switch!
public List<User> list() {
    return userService.lambdaQuery().eq(User::getAge, 18).list();
}
```

The chained `list()` is executed by the wrapper and never passes through your annotated method ([#709](https://github.com/baomidou/dynamic-datasource/issues/709)).

### saveBatch / updateBatchById

In MP 3.4+ the default batch implementations of `ServiceImpl` have similar bypass paths, and the official sample ships custom implementations instead ([UserServiceImpl#saveBatch](https://github.com/baomidou/dynamic-datasource-samples/blob/master/spring-boot-4/mybatisplus3-sample/src/main/java/com/baomidou/samples/mybatisplus3/service/impl/UserServiceImpl.java)).

Recommendation: **put `@DS` on your own method and call `baseMapper.insert/update` row by row inside it**; the same applies to `updateBatchById`.

### ActiveRecord is not supported

MP's ActiveRecord mode (the static/instance methods of `Model` such as `insert()` / `selectById()`) does not go through a Spring bean proxy, so `@DS` cannot intercept it ([#589](https://github.com/baomidou/dynamic-datasource/issues/589)). Use the classic Service + Mapper style instead.

### databaseId does not follow the switch

A known limitation: when `@DS` switches datasources, MyBatis' `databaseId` (the multi-vendor XML dialect selector) **does not switch along**, so the same Mapper executes the same dialect across databases from different vendors ([#563](https://github.com/baomidou/dynamic-datasource/issues/563), [#718](https://github.com/baomidou/dynamic-datasource/issues/718)). With multiple vendors, use different Mappers/Services per database.

## 3. Notes on putting it on the Mapper

- It works in most scenarios from 3.2.0+; older versions throw `Invalid bound statement` or fail to recognise the annotation ([#183](https://github.com/baomidou/dynamic-datasource/issues/183), [#208](https://github.com/baomidou/dynamic-datasource/issues/208));
- If a `@DS` on the Mapper conflicts with one on the outer Service, **the nearest one (the Mapper method) wins**;
- Production code should still rely on the Service layer: switching databases at the Mapper layer hurts reuse and transaction planning.

## Further reading

- [@DS not working checklist](./not-working)
- [@DS semantics and precedence](../guide/ds-semantics) — group names, matching rules and the full precedence chain
- [Integrating MyBatis-Plus](../integration/mybatis-plus)
- [Manual datasource switching](../advanced/manual-switching) — the alternative when annotations cannot cover the case
