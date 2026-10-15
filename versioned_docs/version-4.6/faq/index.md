---
title: "FAQ 速查"
description: "这一章收录历史 issue 里反复出现的问题，按「症状 → 定位 → 修复」组织。每页页首都列出对应的历史 issue 编号，方便回溯原始讨论。"
---

# FAQ 速查

这一章收录**历史 issue 里反复出现的问题**，按「症状 → 定位 → 修复」组织。每页页首都列出对应的历史 issue 编号，方便回溯原始讨论。

排查任何切换问题之前，先把这两件事备好。

打开框架自身的日志（切换成功与否它都会打印）：

```yaml
logging:
  level:
    com.baomidou.dynamic.datasource: debug
```

在业务方法里加一行，看当前线程的数据源 key：

```java
String current = DynamicDataSourceContextHolder.peek();
```

| 日志 / 断点结果 | 含义 |
| :--- | :--- |
| `switch to the datasource named [slave_1]` | key 已正确解析，切换动作发生了 |
| `switch to the primary datasource` | **没有有效 key**，落回主库——问题在「key 没压栈」 |
| 两条都没有 / `peek()` 为 `null` | 注解所在方法根本没被 AOP 拦截 |

## 按症状索引

| 现象 | 看这一页 |
| :--- | :--- |
| `@DS` 写了却一直走主库 | [@DS 不生效排查总表](/docs/faq/not-working) |
| Controller 里的链式查询、`IService` 方法不切换 | [@DS 注解位置与 MyBatis-Plus 调用姿势](/docs/faq/annotation-placement) |
| `@Async`、线程池、并行流里不切换；高并发偶发串库 | [@DS 与线程](/docs/faq/threads) |
| `@DS("#xxx")` 动态数据源名解析失败 | [SpEL 动态数据源名](/docs/faq/spel) |
| 事务内（含 Spring Batch、Quartz）切不动库 | [事务内不切换数据源](/docs/faq/tx-inside) |
| 应用启动失败，报驱动 / primary / 依赖相关错误 | [启动报错速查](/docs/faq/startup-errors) |

## 按主题索引

| 主题 | 深入文档 |
| :--- | :--- |
| `@DS` 的解析规则、组名、优先级 | [@DS 语义与优先级](/docs/guide/ds-semantics) |
| 切换失败的具体案例（Shiro、`@PostConstruct`、Druid 版本…） | [切换失败排查](/docs/guide/switching-failure) |
| 多数据源事务选型与混用陷阱 | [事务选型指南](/docs/tx)、[事务常见问题](/docs/tx/faq) |
| `@DSTransactional` 的传播行为与语义边界 | [本地多数据源事务](/docs/tx/local-tx) |
| 连接池参数层级、版本兼容、监控 | [连接池集成](/docs/pool)、[连接池必读](/docs/pool/common) |
| 密码加密 `ENC(...)` | [数据库密码加密](/docs/advanced/encryption) |
| 运行期增删数据源 | [动态添加/移除数据源](/docs/advanced/add-remove-datasource) |
| 手动切换的完整用法与 FAQ | [手动切换数据源](/docs/advanced/manual-switching) |
| 读写分离与负载均衡 | [自动读写分离](/docs/no-annotation/mybatis-read-write)、[自定义负载均衡策略](/docs/custom/load-balance-strategy) |
| MyBatis-Plus 集成 | [集成 MyBatis-Plus](/docs/integration/mybatis-plus) |

## 三条通用心法

1. **先看日志，再改代码。** 框架在切换时会打印 key，大多数「不生效」看日志就能定性：没打印说明没被拦截，打印了 primary 说明 key 不对。
2. **用 `peek()` 定位分界点。** 在怀疑的方法首尾各打一行，能立刻区分「没拦截」和「拦截了但连接已绑定」。
3. **开发环境开 `strict`。** `spring.datasource.dynamic.strict: true` 会让「数据源名不存在」直接抛 `CannotFindDataSourceException`，而不是静默回落主库——后者是「注解写了却一直用主库」最隐蔽的原因。

```yaml
spring:
  datasource:
    dynamic:
      strict: true
```

## 还没解决？

- 搜索或提交 [Issue](https://github.com/baomidou/dynamic-datasource/issues)（贴出 debug 日志里的 `switch to ...` 一行会大幅提高沟通效率）；
- 使用讨论区 [Discussions](https://github.com/baomidou/dynamic-datasource/discussions)；
- 或加入 QQ 群 **371234236** 直接提问。