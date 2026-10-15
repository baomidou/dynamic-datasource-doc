---
title: "@DS 该注解在哪里"
description: "@DS 是切换数据源的核心注解，初次使用多数据源的人最常问的就是「我该把它放在哪一层」。这没有强制要求，但有一些经过实践验证的经验。"
---

# @DS 该注解在哪里

`@DS` 是切换数据源的核心注解，初次使用多数据源的人最常问的就是「我该把它放在哪一层」。这没有强制要求，但有一些经过实践验证的经验。

## 前提：它是 AOP 实现的

`@DS` 通过 Spring AOP 拦截方法调用来生效，所以 **AOP 的通用失效场景在这里同样成立**：

- 同类内部 `this` 自调用不走代理 → 不生效
- 被 Shiro / 其他代理包装后调用链断裂 → 不生效
- 非 public 方法（默认 `aop.allowed-public-only=true`）→ 静默忽略
- `@PostConstruct`、`@Async` 等生命周期或异步场景 → 时机/线程不对，不生效

遇到问题请先看[切换失败排查](/docs/guide/switching-failure)。

## 推荐：放在 Service 实现类的方法上

和 `@Transactional` 的放置习惯一致，这是最推荐的用法。原因：

- Service 是业务边界，一个业务动作可能依次访问多个库，切换点天然落在这里
- 如果某个方法具备通用性、会被其他 Service 调用，在它自己身上标注解，调用方就不必重复处理切换

```java
@Service
public class OrderServiceImpl implements OrderService {

    @DS("master")
    public void create(Order order) { }

    @DS("slave")
    public List<Order> list() { }
}
```

## 注解在 Controller 上

可以，但不推荐。Controller 的职责是参数校验与协议转换，通常不涉及数据库；把切换放在这里，一旦 Service 内部还需要切到别的库，就会变成「外层 Controller 一个源、内层 Service 另一个源」的嵌套，理解成本高。

## 注解在 Mapper 上

如果某张表确定只存在于某一个库，标注在 Mapper 上是可行的。建议**只标注在 Mapper 接口的类上**，而不是逐个方法标注：

```java
@DS("report")
public interface ReportMapper {
    List<Report> selectAll();
}
```

:::warning
Mapper 通常被 Service 的方法调用。如果 Service 方法上已经有 `@DS`，那么 Mapper 上的注解在**同类方法调用链**中会形成嵌套切换。多数情况下你希望 Service 层说了算，所以不要把两处都标注。

另外，Mapper 的 `@DS` 依赖 AOP 能拦到 MyBatis 生成的代理对象——使用 MyBatis-Plus 的 `ServiceImpl` 自带方法时尤其要注意时序。
:::

## 继承抽象类上的 @DS

**支持。** 抽象 Service 上标注了 `@DS`，子类中未重新指定的方法都会沿用。

```java
@DS("slave")
public abstract class BaseReadService {

    public List<User> listUsers() {   // 继承后走 slave
        return doQuery();
    }
}

@Service
public class UserService extends BaseReadService {

    @DS("master")
    public void save(User user) { }   // 就近优先，走 master
}
```

## 继承接口上的 @DS

**从 3.4.1 开始支持。** 实现类未覆盖时，框架会沿继承链向上查找接口上标注的 `@DS`。

```java
@DS("slave")
public interface ReadOnlyService {
    List<User> listUsers();
}
```

需要注意一个边界：**一个类可以同时实现多个接口**。当多个接口上都标注了 `@DS` 时，框架按 `getAllInterfacesForClassAsSet` 的遍历顺序**取第一个命中的**，而这个顺序由类层次结构决定，不保证符合直觉，也不保证跨版本稳定。

所以：**不要让多个接口同时携带 `@DS`。** 如果确实存在这种结构，就在实现类的方法上显式标注，把结果固定下来。

## 相关阅读

- [@DS 语义与优先级](/docs/guide/ds-semantics) —— 完整的解析规则与查找顺序
- [切换失败排查](/docs/guide/switching-failure) —— 不生效时的排查清单
- [无注解方案](/docs/no-annotation/) —— 完全不用注解的替代做法