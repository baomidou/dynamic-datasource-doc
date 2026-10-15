---
title: "@DS 语义与优先级"
description: "这一页把「@DS 到底怎么被解析成一个具体数据源」讲透。多数「切换不生效」的问题，根因都在这套规则里。"
---

# @DS 语义与优先级

这一页把「`@DS` 到底怎么被解析成一个具体数据源」讲透。多数「切换不生效」的问题，根因都在这套规则里。

## 一、命名即拓扑

配置在 `spring.datasource.dynamic.datasource` 下的每个 key 都是一个数据源名，**首个下划线 `_` 之前的部分是组名**。

```yaml
datasource:
  master:      # 组名 master，组内 1 个数据源
  slave_1:     # 组名 slave，组内成员之一
  slave_2:     # 组名 slave，组内成员之二
  oracle_1:    # 组名 oracle
  oracle_2:    # 组名 oracle
```

框架据此构建：每个数据源一个 `ItemDataSource`，每个组名一个 `GroupDataSource`。所以「读写分离」「一主多从」「纯粹多库」「混合」不需要任何额外配置，只是命名不同。

## 二、解析过程

`@DS` 的值传给 `DynamicRoutingDataSource#getDataSource(String ds)`，查找顺序是：

1. `ds` 为空 → 使用 `primary` 指定的数据源（或组）
2. **先按组名精确匹配** `ds`；命中则交给该组的 `strategy` 选出一个成员
3. 再按**数据源名精确匹配** `ds`
4. 都没命中 → `strict: true` 抛 `CannotFindDataSourceException`；`strict: false` 回落到 `primary`

由此可以推出两条实用结论：

- `@DS("slave")` 拿到的是一次**负载均衡后的成员**，每次调用可能落在不同库上，不要用它做「主从一致性」的假设。
- `@DS("slave_1")` 精确落到单个库，跳过策略。
- 匹配是**大小写敏感的字面量匹配**，必须与配置 key 完全一致。

:::tip
想在启动阶段就暴露写错的数据源名，把 `spring.datasource.dynamic.strict` 设为 `true`。生产环境建议开启。
:::

## 三、优先级：就近原则

`@DS` 可以标注在**方法**、**类**（含接口与抽象类）上。叠加时的优先级由高到低：

```java
代码主动切换  DynamicDataSourceContextHolder.push("x")
        ↓
方法上的 @DS
        ↓
方法所在类上的 @DS
        ↓
接口 / 抽象类上的 @DS（3.4.1 起支持，取继承链上第一个命中的）
        ↓
默认数据源 primary
```

几个容易踩的点：

- **锚点是最具体的方法**。子类实现的方法与接口方法同时带 `@DS` 时，以子类方法为准（源码会先用 `BridgeMethodResolver` 解析桥接方法，再向上找）。
- **接口上的 `@DS` 是支持的**（3.4.1 起）。如果你的资料里还写着「不支持接口」，那是旧版本的说法。
- **只对 public 方法生效**。默认 `spring.datasource.dynamic.aop.allowed-public-only=true`，非 public 方法上的 `@DS` 会被**静默忽略**。确实需要时显式关掉。
- **`this` 自调用不生效**。这是 Spring AOP 的通用限制：`@DS` 由切面实现，同类内部直接调用不走代理。要么把方法挪到另一个 Bean，要么注入自身代理。

## 四、动态 key

当 `@DS` 的值以 `#` 开头时，框架不再把它当数据源名，而是交给 `DsProcessor` 责任链求值。内置三段，按顺序短路匹配：

| 处理器 | 匹配前缀 | 取值来源 | 示例 |
| :--- | :--- | :--- | :--- |
| `DsHeaderProcessor` | `#header` | 当前请求头 | `@DS("#header.tenantId")` |
| `DsSessionProcessor` | `#session` | 当前 Session 属性 | `@DS("#session.tenantId")` |
| `DsSpelExpressionProcessor` | 全部（兜底） | SpEL 表达式 | `@DS("#{#tenantId}")` |

行为细节：

- 前置处理器**匹配前缀后取值**，若取不到（比如请求头不存在）返回 `null`，会**继续下沉**给下一个处理器，最终由 SpEL 兜底。
- SpEL 处理器是链尾且 `matches` 恒为 `true`，所以任何以 `#` 开头、前两段没接住的表达式都会走到 SpEL 求值。
- SpEL 支持方法参数、`@beanName` 引用 Bean，以及（默认禁止的）类型引用。

```java
// 从方法参数取
@DS("#{#tenantId}")
public List<Order> list(String tenantId) { }

// 从 Spring Bean 取
@DS("#{@tenantResolver.current()}")
public List<Order> listOrders() { }
```

:::warning[安全]
`T(java.lang.Runtime)` 这类**类型引用默认被禁用**（`spring.datasource.dynamic.aop.allowed-spel-type-access=false`）。只有在你完全清楚风险、且确实需要时才打开——表达式一旦可控，就等于任意代码执行的入口。
:::

自定义动态规则请实现 `DsProcessor` 并注册为 Bean，详见 [自定义数据源处理器](/docs/custom/datasource-provider)。

## 五、与事务、线程的关系

- 数据源 key 存在**栈式 ThreadLocal**（`DynamicDataSourceContextHolder`）里，因此支持 `ServiceA → ServiceB → ServiceC` 的多层嵌套切换，退出时逐层恢复。
- **它不跨线程传播**。`@Async`、线程池、`CompletableFuture` 中拿到的会是默认数据源，需要在子线程显式重新 `push`。
- `push` 之后如果不在同一线程成对 `poll`，会造成 ThreadLocal 泄漏——手动切换请成对调用，或直接使用 `clear()`。

相关细节见 [手动切换数据源](/docs/advanced/manual-switching) 与 [切换失败排查](/docs/guide/switching-failure)；`@DS("#...")` 解析失败的排查见 [SpEL 动态数据源名](/docs/faq/spel)。