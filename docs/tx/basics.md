---
title: "为什么事务下切换不了数据源"
description: "这是多数据源最高频的疑问，答案本身不复杂，但值得单独讲清楚。"
---

# 为什么事务下切换不了数据源

这是多数据源最高频的疑问，答案本身不复杂，但值得单独讲清楚。

## 核心机制

两件事同时发生，导致切换失效：

**1. 数据源切换是「请求时取连接」**

`@DS` 只是把数据源名压进当前线程的 ThreadLocal 栈。真正决定用哪个库的时机，是**每次获取 `Connection` 的时刻**——框架从 ThreadLocal 栈顶读出 key，再去找对应的数据源。

**2. Spring 事务会「提前锁定连接」**

`@Transactional` 开启事务时会从数据源取一个 `Connection`，把它绑定到当前线程（`TransactionSynchronizationManager`）。在这个事务的整个生命周期内，任何 `DataSourceUtils.getConnection()` 都会拿到**同一个连接**，而不是重新去问路由。

两条规则叠加：

```java
@Transactional 开启 → 连接已绑定到线程
       ↓
事务内 @DS("b")  →  ThreadLocal 被改了，但连接不会重新获取
       ↓
SQL 仍然打在原来那个库上
```

所以现象是「切换静默失效」：不报错，日志里也能看到 `switch to the datasource named [b]`，但 SQL 实际打在 a 库上。

## 把顺序反过来就对了

事务的开启时机取决于切面顺序。本框架的 `@DS` 切面默认 `order = Ordered.HIGHEST_PRECEDENCE`，**先于事务切面执行**，所以：

```java
@DS("a")
@Transactional
public void doSomething() {
    // 先切到 a，再开事务 → 事务绑定的就是 a 的连接
    // 正确用法
}
```

```java
@DS("a")
@Transactional
public void outer() {
    inner();   // inner 上标了 @DS("b")，但这里拿到的还是 a 的连接
}

@DS("b")
public void inner() {
    // 失效：仍在 a 库
}
```

:::danger
不要为了「先切库再开事务」去调低 `spring.datasource.dynamic.aop.order`。默认值就是刻意设定的，调低会让 `@DS` 在事务之后执行，拿到已被绑定的连接。
:::

## 常见疑问

### 用了 `@Transactional` 就完全不能切库了吗？

事务**外**可以随便切。事务**内**不行。也就是说，同一个 Service 里「事务方法调事务方法」的嵌套场景，内层切换一定失效。

### 那单库事务还能用吗？

完全可以。只要**事务内不切换数据源**，该用 `@Transactional` 就用——它比本地多数据源事务成熟得多，支持嵌套保存点、只读事务、隔离级别等完整语义。建议优先使用。

### 业务必须保证事务，又有多个库，怎么办？

按场景三选一：

| 场景 | 方案 |
| :--- | :--- |
| 单体应用、跨库 | `@DSTransactional`，见[本地多数据源事务](/docs/tx/local-tx) |
| 微服务、跨服务 | Seata `AT` / `XA`，见[Seata 事务](/docs/tx/seata) |
| 需要标准 JTA/XA | Atomikos，见[Atomikos XA 事务](/docs/next/tx/atomikos) |

选型对比见[事务选型指南](/docs/tx)。

### 还有别的办法吗？

如果数据源只有两三个、又不怕复杂，可以放弃本组件，把数据源手动组装成一个 JTA 事务管理器管理的 XA 数据源集合。这条路本文不展开，可自行搜索「多数据源 JTA」。

## 背景知识

不熟悉分布式事务的话，建议先补齐概念：

- [事务概念](/docs/tx/concepts) —— ACID、JDBC 事务、Spring 事务
- CAP 定理与 BASE 理论 —— 理解为什么「跨库强一致」代价高昂