# 事务内不切换数据源（含 Spring Batch / Quartz）

> 关联 Issue：[#773](https://github.com/baomidou/dynamic-datasource/issues/773)（Spring Batch）

事务原理请先读[事务下切换原理](/docs/tx/basics)；本篇聚焦「外层事务已经开好了，`@DS` 却不起作用」这一类场景，给出可落地的四种解法。

## 现象

mapper/service 上标注了 `@DS("其他库")`，SQL 仍然打到默认主库，并报 `Table 'xxx' doesn't exist` 之类的错误。常见于：

- **Spring Batch** 的 Step/Tasklet 中调用带 `@DS` 的 mapper；
- `@Transactional` 方法内部调用带 `@DS` 的 mapper；
- 手动 `TransactionTemplate` 或第三方框架（ShedLock、Quartz 等）**先开了事务**再执行 SQL。

## 根因

`@DS` 的原理是**在获取连接之前**改变线程上的查找 key（`DynamicDataSourceContextHolder`）。而 Spring 事务的语义是：**一个 `DataSource` 实例在一个事务中只绑定一条连接**。

以 Spring Batch 为例：

1. Step 的 `PlatformTransactionManager` 包装的是 `DynamicRoutingDataSource`；
2. `TaskletStep` 在调用 tasklet **之前**就 `getTransaction()`。此时没有任何 `@DS` 切换发生，`determineDataSource()` 返回主库，主库连接被绑定到线程；
3. tasklet 内的 `@DS("starrocks")` 确实换了 key，但 MyBatis 通过 `DataSourceUtils.getConnection()` 发现该 `DataSource` 已有事务绑定连接，**直接复用主库连接**。中途换 key 无法替换已绑定的连接。

一句话：**事务开启时用的是哪个库，整个事务内就是哪个库；`@DS` 必须发生在事务开启之前。**

## 排查清单

| # | 检查点 | 说明 |
| :--- | :--- | :--- |
| 1 | 外层是否已有 Spring 事务 | `@Transactional`、编程式事务、Spring Batch/Quartz 等框架先开的事务都会绑定连接 |
| 2 | 调用是否经过代理 | 同类内部自调用（`this` 调用）不走 AOP，`@DS` 不生效 |
| 3 | 注解位置是否是 lambda/匿名类 | `@Bean` 返回 lambda Tasklet 时没有可增强的目标，类上的 `@DS` 无处附加 |
| 4 | 是否叠加了 `@DSTransactional` | 见方案 D；注意外层 Spring 事务仍会持有主库连接，不要与 step 事务叠加 |
| 5 | Mapper 上的 `@DS` key 是否存在 | key 不存在时非严格模式会静默 fallback 到 primary；可开 `spring.datasource.dynamic.strict=true` 让未匹配直接报错 |

## 解决方案（以 Spring Batch 为例）

### 方案 A：Step 不开事务（最简单）

适合 `removeAll()` 这类清理型 tasklet：

```java
@Bean
public Step syncCleanStep(JobRepository jobRepository) {
    // Spring Batch 5 起 tasklet step 允许不传 transactionManager
    return new StepBuilder("syncCleanStep", jobRepository)
            .tasklet(syncCleanTasklet())
            .build();
}
```

无事务时每次 mapper 调用独立取连接，`@DS` 正常切换。

### 方案 B：给 Step 显式指定「目标库」的事务管理器

step 事务本来就只操作这个库时最合适：

```java
@Bean
public Step syncCleanStep(JobRepository jobRepository, DynamicRoutingDataSource routingDataSource) {
    DataSource starrocks = routingDataSource.getDataSource("starrocks");
    return new StepBuilder("syncCleanStep", jobRepository)
            .tasklet(syncCleanTasklet(), new DataSourceTransactionManager(starrocks))
            .build();
}
```

事务从一开始就开在目标库连接上。

### 方案 C：让 @DS 发生在事务开启之前

把 lambda Tasklet 改成 `@Component` 类并标注 `@DS("starrocks")`，保证能被 AOP 增强。

普通的 `@Transactional` 场景同理——`@DS` 必须加在**事务边界的外层**调用点（例如先在 `@DS` 的 service 方法里，再调 `@Transactional` 的方法）：

```java
@DS("a")
public void outer() {
    innerService.doSomething();   // 内部 @Transactional，事务开在 a 上
}
```

### 方案 D：跨多库且需要事务，改用 @DSTransactional

框架自身的事务（`ConnectionFactory`）按 **xid + 库名** 缓存每个库一条代理连接，天然支持在一个「事务」内切换多库；而单个 Spring 事务对一个 `DataSource` 只能绑一条连接，做不到这一点。

:::warning[不要与外层 Spring 事务叠加]
使用 `@DSTransactional` 时要结合方案 A：外层不要再叠一个 step 事务，否则它仍会先把主库连接绑到线程上。
:::

详见[本地多数据源事务](/docs/tx/local-tx)与[事务常见问题](/docs/tx/faq)。

## 相关文档

- [本地多数据源事务](/docs/tx/local-tx) —— `@DSTransactional` 的传播行为与语义边界
- [事务常见问题](/docs/tx/faq) —— 原生事务与本地事务的混用陷阱
- [@DS 与线程](/docs/faq/threads) —— 异步链路里的事务边界
- [@DS 不生效排查总表](/docs/faq/not-working)
