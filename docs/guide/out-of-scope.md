---
title: "不在范围内"
description: "这一页讲清楚 dynamic-datasource 刻意不做哪些事。它的定位非常窄——「决定一次调用使用哪个 DataSource」——把边界写出来，比多写十页教程更能省掉无效排查。"
---

# 不在范围内

这一页讲清楚 **dynamic-datasource 刻意不做哪些事**。它的定位非常窄——「决定一次调用使用哪个 `DataSource`」——把边界写出来，比多写十页教程更能省掉无效排查。

## 明确不做的事

| 不做 | 说明 | 你需要什么 |
| :--- | :--- | :--- |
| **不内置、不实现连接池** | 连接池与 JDBC 驱动请自备，本项目只做集成适配 | 自行引入 Druid / HikariCP / BeeCP / DBCP2 / C3P0 / Oracle UCP |
| **不做 ORM 增强** | 不接管 MyBatis / JPA 的映射与 SQL 生成 | — |
| **不做 SQL 改写或分片引擎** | MyBatis 插件只按读写规则**切换数据源**，不解析、不改写 SQL | 分片用 [ShardingSphere](/docs/integration/sharding-jdbc) |
| **不实现分布式事务内核** | Seata、Atomikos 都属于外部集成，本项目只负责接进来 | Seata `AT`/`XA` 或 Atomikos XA |
| **不支持跨线程事务传播** | 路由 key 与事务上下文按设计基于 ThreadLocal | 子线程内显式 `push`；或改用 Saga / 消息最终一致 |
| **不提供完整的 JPMS `module-info`** | 模块名的稳定契约是 manifest 里的 `Automatic-Module-Name` | — |
| **不做跨库 JOIN / 跨库聚合** | 一次调用只会拿到一个库的连接 | 在应用层聚合，或把库合并 / 上数仓 |
| **不做数据隔离策略** | 多租户场景下它只负责「按租户切库」，不负责行级过滤 | 自行实现租户字段过滤；参考[多租户实践](/docs/guide/multi-tenant) |

## 为什么这样设计

1. **只做路由，才不会和你的技术栈打架。** 不绑定 ORM、不绑定连接池、不绑定事务方案，你可以只用它的一部分。
2. **不带传递依赖，就不会制造冲突。** 连接池与驱动由你的 BOM 统一管理版本，避免 shaded 打包带来的版本黑洞。
3. **边界清晰，问题定位才快。** 出现异常时，你可以先问一句「这是路由问题还是我的连接池/事务问题」。

## 边界处的常见误用

**误以为它能跨库事务**

```java
@DS("master")
@Transactional
public void doSomething() {
    orderMapper.insert(order);
    // 这里的 @DS("slave") 不会生效——事务已经把连接锁在主库上了
    accountMapper.update(account);
}
```

需要跨库一致性时，请用 `@DSTransactional` 或 Seata。见[事务选型指南](/docs/tx/)。

**误以为它能在线程池里自动传递**

```java
@DS("slave")
public void asyncQuery() {
    executor.submit(() -> {
        // 这里是另一个线程 → 走默认数据源 master，@DS("slave") 不生效
        return orderMapper.selectList(null);
    });
}
```

**误以为 `@DS` 能拦住 SQL**

`@DS("slave")` 只是换了连接，它不会阻止你往从库写数据。读写分离的正确性依赖你自己的代码纪律，或使用 `MasterSlaveAutoRoutingPlugin` 按 SQL 类型自动路由（见[无注解方案](/docs/no-annotation/mybatis-read-write)）。

## 相关阅读

- [基础必读](/docs/guide/basics) —— 能做什么
- [@DS 语义与优先级](/docs/guide/ds-semantics) —— 怎么做
- [切换失败排查](/docs/guide/switching-failure) —— 出问题时先看这里