# @DS 注解位置与 MyBatis-Plus 调用姿势

> 关联 Issue：[#259](https://github.com/baomidou/dynamic-datasource/issues/259)、[#104](https://github.com/baomidou/dynamic-datasource/issues/104)、[#344](https://github.com/baomidou/dynamic-datasource/issues/344)、[#355](https://github.com/baomidou/dynamic-datasource/issues/355)、[#25](https://github.com/baomidou/dynamic-datasource/issues/25)、[#59](https://github.com/baomidou/dynamic-datasource/issues/59)、[#207](https://github.com/baomidou/dynamic-datasource/issues/207)、[#337](https://github.com/baomidou/dynamic-datasource/issues/337)、[#709](https://github.com/baomidou/dynamic-datasource/issues/709)、[#73](https://github.com/baomidou/dynamic-datasource/issues/73)、[#633](https://github.com/baomidou/dynamic-datasource/issues/633)、[#589](https://github.com/baomidou/dynamic-datasource/issues/589)

## 一、@DS 应该加在哪？

**推荐：Service 实现类的方法上。** 维护者在 [#259](https://github.com/baomidou/dynamic-datasource/issues/259) 给出的三条理由：

1. **底层兼容性**——3.2.0 起才解决了大部分「注解加在 Mapper 上」可能发生的异常；
2. **Service 才是业务属性的载体**，由它负责决定选哪个库；
3. 只有确定某个 Mapper 只属于某个数据源时，才可以加在 Mapper 上。

**优先级规则**：

```text
代码中主动切换（ContextHolder.push） > 方法上的注解 > 类上的注解
```

接口和父类上声明的 `@DS` 可以被继承，完整规则见[@DS 语义与优先级](/docs/guide/ds-semantics)。

## 二、MyBatis-Plus 的调用姿势（历史 35+ issue 的重灾区）

`@DS` 依赖 Spring AOP 拦截「**代理上的、带注解的方法**」。而 MP 的许多便捷 API 恰好绕过了这一层。

### 错误姿势 1：Controller 直接使用 IService 默认方法

```java
// Controller —— 不会切换！
@GetMapping("/list")
public List<User> list() {
    return userService.list();          // IService 的 default 方法
}
```

`list()`、`getById()`、`lambdaQuery()`、`saveBatch()` 等在 `IService`/`ServiceImpl` 中是以接口 default 方法 / `AbstractChainWrapper` 形式提供的，实际执行路径不在「你注解的实现类方法」上（[#25](https://github.com/baomidou/dynamic-datasource/issues/25)、[#59](https://github.com/baomidou/dynamic-datasource/issues/59)、[#207](https://github.com/baomidou/dynamic-datasource/issues/207)、[#337](https://github.com/baomidou/dynamic-datasource/issues/337)、[#355](https://github.com/baomidou/dynamic-datasource/issues/355)）。

### 正确姿势：自定义业务方法 + 注解，方法内自由使用 MP API

```java
@Service
public class UserServiceImpl extends ServiceImpl<UserMapper, User> implements UserService {

    // 注解加在你自己声明的 public 方法上，方法内部无论用什么 MP API 都生效
    @Override
    @DS("slave")
    public List<User> selectSlaveUsers() {
        return baseMapper.selectList(null);   // BaseMapper 直调 —— OK
    }

    @Override
    @DS("slave")
    public List<User> selectLambdaSlaveUsers() {
        return this.lambdaQuery().list();     // lambda 链式 —— OK（因为执行入口在这个被代理的方法里）
    }
}
```

> 关键词是**执行入口**：只要走进被 `@DS` 注解的代理方法之后再调用 MP 的任何 API，都处在切换后的上下文里。
> 官方示例见 [mybatisplus3-sample](https://github.com/baomidou/dynamic-datasource-samples/tree/master/spring-boot-4/mybatisplus3-sample) 的 `UserServiceImpl`。

### 错误姿势 2：Controller 调 `lambdaQuery()` 却期望切库

```java
// Controller —— 不切换！
public List<User> list() {
    return userService.lambdaQuery().eq(User::getAge, 18).list();
}
```

链式的 `list()` 由 wrapper 执行，未经过你注解的方法（[#709](https://github.com/baomidou/dynamic-datasource/issues/709)）。

### saveBatch / updateBatchById

MP 3.4+ 中 `ServiceImpl` 的默认批量实现存在类似的绕过路径，官方 sample 选择了自定义实现（[UserServiceImpl#saveBatch](https://github.com/baomidou/dynamic-datasource-samples/blob/master/spring-boot-4/mybatisplus3-sample/src/main/java/com/baomidou/samples/mybatisplus3/service/impl/UserServiceImpl.java)）。

建议：**在自定义方法上标 `@DS`，内部调用 `baseMapper.insert/update` 逐条执行**，`updateBatchById` 同理。

### ActiveRecord 不支持

MP 的 ActiveRecord 模式（`Model` 的 `insert()/selectById()` 等静态/实例方法）不经过 Spring Bean 代理，`@DS` 无法拦截（[#589](https://github.com/baomidou/dynamic-datasource/issues/589)）。请改用传统 Service + Mapper 方式。

### databaseId 不随切换变化

一个已知限制：`@DS` 切换数据源时，MyBatis 的 `databaseId`（多数据库厂商 XML 方言选择器）**不会跟着切换**，同一个 Mapper 在不同厂商的库之间切会执行同一份方言（[#563](https://github.com/baomidou/dynamic-datasource/issues/563)、[#718](https://github.com/baomidou/dynamic-datasource/issues/718)）。不同厂商多库建议使用不同的 Mapper/Service。

## 三、加在 Mapper 上的注意点

- 3.2.0+ 大部分场景可用；低版本会出现 `Invalid bound statement`、注解不识别等异常（[#183](https://github.com/baomidou/dynamic-datasource/issues/183)、[#208](https://github.com/baomidou/dynamic-datasource/issues/208)）；
- 若 Mapper 上的 `@DS` 与外层 Service 的 `@DS` 冲突，以**就近（Mapper 方法）**优先；
- 生产建议仍以 Service 层为主：Mapper 层切库不利于复用与事务规划。

## 相关文档

- [@DS 不生效排查总表](/docs/faq/not-working)
- [@DS 语义与优先级](/docs/guide/ds-semantics) —— 组名、匹配规则与完整优先级
- [集成 MyBatis-Plus](/docs/integration/mybatis-plus)
- [手动切换数据源](/docs/advanced/manual-switching) —— 注解无法覆盖时的替代方案
