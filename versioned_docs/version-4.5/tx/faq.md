# 事务常见问题

建议先读[为什么事务下切换不了数据源](/docs/tx/basics)，本篇聚焦最容易踩的坑。

核心前提只有一句：**Spring 原生事务会保证事务期间整个线程拿到的都是同一个 `Connection`。**

## 原生 `@Transactional` 能和 `@DS` 一起用吗？

能，但要注意执行顺序。

```java
public class AService {

    @DS("a")
    @Transactional
    public void doSomething() {
        // some code
    }
}
```

框架的 `@DS` 切面默认优先级高于事务切面，所以**先切换到 a，再开启事务**。事务内部不管是用注解还是手动 `DynamicDataSourceContextHolder.push`，都无法再切走，始终使用 a 数据源。

:::tip
只要确认「整个事务内不再切换数据源」，就应该优先用原生的 `@Transactional`——它的语义更完整（保存点、只读事务、隔离级别），而 `@DSTransactional` 是专门为跨库场景补位的。
:::

## 「本地事务和原生事务不能混用」是什么意思？

### 场景一：原生事务里调用本地事务

```java
public class AService {

    @DS("a")
    @Transactional
    public void doSomething() {
        bService.doSomething();  // B 库，标注了 @DS("b") + @DSTransactional
        cService.doSomething();  // C 库，标注了 @DS("c") + @DSTransactional
    }
}
```

结果：**全部在 a 库**。因为外层原生事务已经把连接锁死在 a 上，内层的 `@DSTransactional` 只能在同一连接上开保存点，切不过去。

### 场景二：本地事务里调用原生事务

```java
public class AService {

    @DS("a")
    @DSTransactional
    public void doSomething() {
        aMapper.updateSomeThing();
        bService.doSomething();  // B 库，标注了 @DS("b") + @Transactional
        cService.doSomething();  // C 库，标注了 @DS("c") + @Transactional
    }
}
```

结果：**B、C 各自是一个独立事务**。

- C 报错时 B 会回滚吗？不会，B 已经提交了。
- A 会回滚吗？会。

:::danger
**不建议混用。** 混用后事务边界不再与代码上的嵌套结构对应，出问题时极难定位。除非你完全掌握执行流程，否则请保持「一个业务入口只用一种事务方案」。
:::

## 本地事务的标准写法

最外层开启即可，内层只负责切换数据源，不要再叠加事务注解：

```java
public class AService {

    @DS("a")
    @DSTransactional   // 最外层开启即可
    public void doSomething() {
        aMapper.updateSomeThing();
        bService.doSomething();  // B 库，只标注 @DS("b")
        cService.doSomething();  // C 库，只标注 @DS("c")
    }
}
```

## `@DSTransactional` 回滚没有生效？

按顺序排查：

1. **异常被吞掉了**。业务代码里 `try/catch` 后没有重新抛出，事务感知不到失败。
2. **被 `noRollbackFor` 排除了**。注意 `@DSTransactional` 的 `rollbackFor` 默认是 `{Exception.class}`，**默认所有异常（含受检异常）都会回滚**，这点与 Spring `@Transactional` 默认只回滚 `RuntimeException` / `Error` **不同**。
3. **方法不是 public**，或者发生了 `this` 自调用（AOP 未拦截）。
4. **中途混入了原生 `@Transactional`**，导致后续操作脱离了本地事务的编排（见上方场景一）。
5. **提交阶段失败**。`@DSTransactional` 是逐库提交的，如果某个库在 `commit` 时失败，之前已提交的库无法回滚——这类问题会在日志里以 `dynamic-datasource commit local tx` 之后的异常形式出现。此时框架会抛出 `TransactionSystemException: Could not commit local tx [...]`，**不要让调用方把它当成成功**。

## 相关阅读

- [事务选型指南](/docs/tx) —— 决策树与方案对比
- [本地多数据源事务](/docs/tx/local-tx) —— 传播行为与事务事件监听
- [切换失败排查](/docs/guide/switching-failure) —— 非事务原因的失效清单
