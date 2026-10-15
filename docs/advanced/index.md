---
title: "进阶使用"
description: "本章覆盖超出「@DS 切库」本身的运行时能力。按使用频率排列："
---

# 进阶使用

本章覆盖超出「`@DS` 切库」本身的运行时能力。按使用频率排列：

| 主题 | 说明 |
| :--- | :--- |
| [动态添加/移除数据源](/docs/advanced/add-remove-datasource) | 运行期增删数据源，多租户系统的基石 |
| [运维端点与指标](/docs/advanced/observability) | Actuator 端点盘点数据源与分组，连接池 Micrometer 指标 |
| [优雅关闭](/docs/advanced/graceful-shutdown) | 关闭前等待活跃连接归还，避免发布期请求失败 |
| [动态解析数据源](/docs/advanced/dynamic-datasource-resolution) | 按 header / session / SpEL 动态决定切到哪个库 |
| [数据库密码加密](/docs/advanced/encryption) | `ENC(...)` 加密 url / username / password |
| [启动初始化脚本](/docs/advanced/init-scripts) | 每个库独立执行 schema 与 data 脚本 |
| [懒启动数据源](/docs/advanced/lazy-datasource) | 到首次使用时才真正创建连接池 |
| [无数据源启动](/docs/advanced/no-datasource-startup) | 启动时不配置任何数据源，全靠后期动态添加 |
| [手动切换数据源](/docs/advanced/manual-switching) | 注解无法覆盖的场景，用工具类手动切换 |
| [手动注入多数据源](/docs/advanced/manual-injection) | 需要自己接管 `DataSource` Bean 时的做法 |
| [多租户实践](/docs/guide/multi-tenant) | 四种递进的租户隔离形态 |

想彻底不用注解？请看[无注解方案](/docs/no-annotation/)。