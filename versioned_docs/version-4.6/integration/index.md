---
title: "第三方集成"
description: "本章介绍多数据源与常用中间件的配合方案。"
---

# 第三方集成

本章介绍多数据源与常用中间件的配合方案。

| 组件 | 集成的意义 | 关键点 |
| :--- | :--- | :--- |
| [MyBatis-Plus](/docs/integration/mybatis-plus) | 让 `@DS` 与 MP 的 `ServiceImpl`、分页插件共存 | MP 自带事务的方法无法切库，需绕开 |
| [P6spy](/docs/integration/p6spy) | 打印带真实参数值的 SQL | 全局或单库开启，线上建议关闭 |
| [Quartz](/docs/integration/quartz) | 让调度器使用独立库或动态数据源里的某个库 | JDBC JobStore 与 `@QuartzDataSource` |
| [ShardingSphere](/docs/integration/sharding-jdbc) | 组合「分片 + 多数据源」 | 自定义 `DynamicDataSourceProvider` 接管 |

:::tip
集成方案大多不依赖本框架的特殊支持——`DynamicRoutingDataSource` 本身就是一个标准的 `DataSource`，任何能接收 `DataSource` 的组件都能直接接进来。
:::