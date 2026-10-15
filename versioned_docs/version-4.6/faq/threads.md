# @DS 与线程：异步、线程池、并发串库

> 关联 Issue：[#74](https://github.com/baomidou/dynamic-datasource/issues/74)、[#147](https://github.com/baomidou/dynamic-datasource/issues/147)、[#399](https://github.com/baomidou/dynamic-datasource/issues/399)、[#502](https://github.com/baomidou/dynamic-datasource/issues/502)、[#536](https://github.com/baomidou/dynamic-datasource/issues/536)、[#550](https://github.com/baomidou/dynamic-datasource/issues/550)、[#664](https://github.com/baomidou/dynamic-datasource/issues/664)、[#673](https://github.com/baomidou/dynamic-datasource/issues/673)、[#554](https://github.com/baomidou/dynamic-datasource/issues/554)、[#708](https://github.com/baomidou/dynamic-datasource/issues/708)

## 现象

- `@Async` 方法、线程池任务、`CompletableFuture.supplyAsync`、`parallelStream` 中执行 SQL 时切换失效、走了主库；
- 高并发下偶发「串库」：A 请求打到了 B 库（[#554](https://github.com/baomidou/dynamic-datasource/issues/554)、[#708](https://github.com/baomidou/dynamic-datasource/issues/708)）。

## 根因

切换上下文 `DynamicDataSourceContextHolder` 基于 **`ThreadLocal`（线程私有）**：

- 父线程的切换结果**不会自动传给子线程**——子线程默认走 primary；
- 线程池线程会被复用，如果在某次任务里 `push` 后没有 `poll`/`clear`，残留 key 会污染该线程**后续所有任务**，这就是「串库」的典型来源；
- 事务上下文（`@DSTransactional` 的 xid、Spring `@Transactional` 的连接绑定）同样不跨线程。

## 解决方案（按推荐度排序）

### 方案 A：把切库动作放进子线程内部（推荐）

不要在父线程切好库再提交任务，而是让任务**自己**调用带 `@DS` 的代理方法：

```java
@Async
public void syncUser(Long id) {
    userService.selectFromSlave(id);   // 走代理的 @DS 方法，在子线程内部完成切换
}
```

### 方案 B：在任务内手动 push / poll 包裹

适合无法使用注解的场景：

```java
executor.submit(() -> {
    DynamicDataSourceContextHolder.push("slave");
    try {
        // ... 业务 SQL
    } finally {
        DynamicDataSourceContextHolder.poll();   // 必须成对，否则污染线程池
    }
});
```

### 方案 C：让线程池具备上下文传递能力（TransmittableThreadLocal）

阿里 TTL 方案可让父线程上下文自动「携带」进任务（社区建议见 [#550](https://github.com/baomidou/dynamic-datasource/issues/550)、[#664](https://github.com/baomidou/dynamic-datasource/issues/664)）。框架本身保持 `NamedThreadLocal` 不变，如需该语义需自行装饰线程池：

```java
ExecutorService ttlExecutor = TtlExecutors.getTtlExecutorService(rawExecutor);
// 并把 TtlThreadLocal 的传播策略应用到 dynamic-datasource 的 ThreadLocal
//（属于进阶自定义，建议只在确有全局需求时启用）
```

:::warning[权衡]
TTL 会让所有任务继承父线程的库选择，**隐式传播在复杂链路中反而容易出串库问题**。多数场景方案 A 就够用。
:::

## 事务与线程

- `@DSTransactional` **不跨线程**：在事务内提交线程池任务，新线程不在事务中；Spring `@Transactional` 同理——连接绑定在线程上；
- 子线程内需要事务时，让子线程**自己**开启事务（调用带 `@Transactional`/`@DSTransactional` 的代理方法）；
- 详见[本地多数据源事务](/docs/tx/local-tx)的语义边界一节。

## 并发串库自查清单

| # | 检查点 |
| :--- | :--- |
| 1 | 所有手动 `push` 是否都有 `try/finally` 中的 `poll()` 或 `clear()` |
| 2 | 是否在请求处理线程上做了「切换后忘记还原」的非常规操作 |
| 3 | 拦截器/过滤器里的切换是否在所有出口（含异常路径）都还原 |
| 4 | 是否依赖了「子线程继承父线程数据源」的假设（不支持） |
| 5 | 压测复现时打开 debug 日志，确认串库请求的 `switch to the datasource named [...]` 与预期 key 是否一致 |

## 常见误区

- 在父线程用 `@DS` 切好库，然后 `CompletableFuture` 里执行 —— **子线程看不到**；
- 多租户在 filter 里 `push(tenant)`，然后 service 开异步 —— **异步内拿不到**（[#147](https://github.com/baomidou/dynamic-datasource/issues/147)）；
- 异步任务内部再调 `@DS` 代理方法（或在任务内手动 push/poll）—— **正确**。

## 相关文档

- [手动切换数据源](/docs/advanced/manual-switching) —— push/poll 的配对要求
- [@DS 不生效排查总表](/docs/faq/not-working)
- [事务内不切换数据源](/docs/faq/tx-inside)
- [自动读写分离](/docs/no-annotation/mybatis-read-write) —— Filter/Interceptor 里的统一切换
