# Where to Put the @DS Annotation

`@DS` is the core annotation for switching datasources, and the question people new to multiple datasources ask most often is "which layer should I put it on". There is no hard requirement, but there is some battle-tested experience.

## Prerequisite: it is implemented with AOP

`@DS` works by intercepting method calls through Spring AOP, so **the usual AOP failure scenarios apply here as well**:

- a `this` self-invocation inside the same class does not go through the proxy → no effect
- a call chain broken by Shiro / another proxy wrapper → no effect
- a non-public method (with the default `aop.allowed-public-only=true`) → silently ignored
- lifecycle or async scenarios such as `@PostConstruct` and `@Async` → wrong timing/thread, no effect

If you hit a problem, read [troubleshooting switching failures](./switching-failure) first.

## Recommended: methods of the Service implementation class

Just like the usual placement of `@Transactional`, this is the recommended usage. Reasons:

- the Service is the business boundary; one business action may touch several databases in sequence, so the switching point naturally belongs here
- if a method is generic and gets called by other Services, annotating it means callers do not have to deal with switching again

```java
@Service
public class OrderServiceImpl implements OrderService {

    @DS("master")
    public void create(Order order) { }

    @DS("slave")
    public List<Order> list() { }
}
```

## On the Controller

Possible, but not recommended. A Controller's job is parameter validation and protocol conversion; it usually does not touch the database. Putting the switch there means that, once the Service also needs to switch to another database, you end up with "the outer Controller on one datasource, the inner Service on another" nesting, which is expensive to reason about.

## On the Mapper

If a table definitely lives in exactly one database, annotating the Mapper works. It is recommended to **annotate the Mapper interface at class level only**, instead of annotating methods one by one:

```java
@DS("report")
public interface ReportMapper {
    List<Report> selectAll();
}
```

:::warning
Mappers are usually called from Service methods. If the Service method already carries `@DS`, the annotation on the Mapper forms a nested switch in the **same-class method call chain**. Most of the time you want the Service layer to have the final say, so do not annotate both places.

Also, a Mapper's `@DS` depends on AOP being able to intercept the proxy object MyBatis generates — pay particular attention to timing when using the built-in methods of MyBatis-Plus' `ServiceImpl`.
:::

## @DS on an inherited abstract class

**Supported.** Annotate the abstract Service and every method that the subclass does not override inherits it.

```java
@DS("slave")
public abstract class BaseReadService {

    public List<User> listUsers() {   // goes to slave after inheritance
        return doQuery();
    }
}

@Service
public class UserService extends BaseReadService {

    @DS("master")
    public void save(User user) { }   // nearest wins, goes to master
}
```

## @DS on an inherited interface

**Supported since 3.4.1.** When the implementation does not override it, the framework walks up the inheritance chain looking for a `@DS` on the interface.

```java
@DS("slave")
public interface ReadOnlyService {
    List<User> listUsers();
}
```

One boundary to be aware of: **a class can implement several interfaces at once**. When several interfaces all carry `@DS`, the framework **takes the first hit** in the iteration order of `getAllInterfacesForClassAsSet`; that order is determined by the class hierarchy, is not guaranteed to match intuition, and is not guaranteed to be stable across versions.

So: **do not let several interfaces carry `@DS` at the same time.** If such a structure really exists, annotate the implementation method explicitly to pin the result down.

## Further reading

- [@DS semantics and precedence](./ds-semantics) — the complete resolution rules and lookup order
- [Troubleshooting switching failures](./switching-failure) — the checklist when it does not work
- [The no-annotation approach](../no-annotation/) — alternatives that avoid annotations entirely
