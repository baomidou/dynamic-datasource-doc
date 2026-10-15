# @DS 不生效排查总表

> 关联 Issue：[#770](https://github.com/baomidou/dynamic-datasource/issues/770)、[#649](https://github.com/baomidou/dynamic-datasource/issues/649)、[#674](https://github.com/baomidou/dynamic-datasource/issues/674)、[#266](https://github.com/baomidou/dynamic-datasource/issues/266)、[#122](https://github.com/baomidou/dynamic-datasource/issues/122)、[#166](https://github.com/baomidou/dynamic-datasource/issues/166)、[#740](https://github.com/baomidou/dynamic-datasource/issues/740)、[#663](https://github.com/baomidou/dynamic-datasource/issues/663)

`@DS("xxx")` 标注之后 SQL 仍打到默认库（primary），或日志显示「切了但连的库没变」——这是本仓库历史上**单类问题最多的投诉**（合计 150+ issue）。按下面的顺序逐项自查，命中率从高到低。

## 第 0 步：先看日志

打开框架日志，对照它到底说了什么：

```yaml
logging:
  level:
    com.baomidou.dynamic.datasource: debug
```

| 你看到的日志 | 含义 | 去哪里 |
| :--- | :--- | :--- |
| `dynamic-datasource switch to the datasource named [slave_1]` | key 已被正确解析，切换动作发生了 | 跳到第 2 / 6 项 |
| `dynamic-datasource switch to the primary datasource` | **没有任何有效 key**，落回了主库 | 第 1、3、5 项 |
| 两条都没有 | 注解所在的方法根本没被 AOP 拦截 | 第 1、3、4 项 |

## 排查清单

### 1. 调用是否经过 Spring 代理？

`@DS` 的本质是 Spring AOP 切面。以下调用**不经过代理**，注解形同虚设：

- 同类内部 `this.method()` 自调用 —— [#770](https://github.com/baomidou/dynamic-datasource/issues/770)、[#15](https://github.com/baomidou/dynamic-datasource/issues/15)；
- `static` 静态方法、自己 `new` 出来的对象 —— [#649](https://github.com/baomidou/dynamic-datasource/issues/649)；
- 工具类没有被 Spring 管理（不是 Bean）。

修复：跨 bean 调用；或自注入（`@Autowired private SelfService self;`）后再调；静态工具类改为注入代理 Bean。

### 2. 是否已有外层 Spring 事务？

`@Transactional` 开启的事务会先绑定 primary 的连接，事务中途 `@DS` 换 key 也无法更换**已经绑定**的连接。**事务开启前就必须完成切换。**

详见[事务内不切换数据源](/docs/faq/tx-inside)。

### 3. 方法的可见性与注解位置

- 默认 `spring.datasource.dynamic.aop.allowed-public-only=true` 下，**只有 public 方法**会被拦截（[#266](https://github.com/baomidou/dynamic-datasource/issues/266)）；
- 优先加在 **Service 实现类的方法**上；加在接口方法上框架也能识别（会向实现类回查），但有版本与场景限制，详见[@DS 注解位置与 MyBatis-Plus 调用姿势](/docs/faq/annotation-placement)；
- 类上和方法上同时存在时**方法优先**；接口/父类的注解可被继承。

完整的优先级链见[@DS 语义与优先级](/docs/guide/ds-semantics)。

### 4. 是不是被 MyBatis-Plus 的调用姿势绕过了？

`lambdaQuery().list()`、`IService` 默认方法、`BaseMapper` 直接调用、ActiveRecord 等场景非常容易踩坑（历史 35+ issue）。

详见[@DS 注解位置与 MyBatis-Plus 调用姿势](/docs/faq/annotation-placement)。

### 5. key 是否真实存在？

- 名字拼写、大小写、**组名规则**（第一个 `_` 之前是组名：`slave_1` 属于 `slave` 组，`@DS("slave")` 切的是组）；
- key 不存在时，**非严格模式会静默回落 primary** —— 这正是「注解写了却一直用主库」最隐蔽的原因；
- 打开严格模式让问题立刻暴露：

```yaml
spring:
  datasource:
    dynamic:
      strict: true   # 未匹配到数据源直接抛 CannotFindDataSourceException，而不是偷偷回落 primary
```

### 6. 是否被手动 push 的残留值覆盖？

代码里 `DynamicDataSourceContextHolder.push("xx")` 之后，如果异常路径没 `poll()`，当前线程后续的调用会被残留 key 影响（表现为「串库」）。规则：**push 必须与 try/finally + poll 或 clear 配对**。

详见[手动切换数据源](/docs/advanced/manual-switching)。

### 7. 是否跨越了线程边界？

`@Async`、线程池、`CompletableFuture`、`parallelStream` 里执行时，`@DS` 的解析结果**不会传递给子线程**，子线程默认走 primary。

详见[@DS 与线程](/docs/faq/threads)。

### 8. 时机是否太早？

`@PostConstruct`、`InitializingBean`、早期 `ApplicationRunner`、Bean 初始化阶段调用时，上游代理/上下文尚未就绪，拿不到切换后的效果（[#122](https://github.com/baomidou/dynamic-datasource/issues/122)）。把切库操作放到业务请求路径中执行，初始化逻辑改用 `ContextRefreshedEvent` 监听，详见[切换失败排查](/docs/guide/switching-failure)。

### 9. 单元测试类上标注无效？

`@DS` 要标注在 **Spring 容器内的 Bean 方法**上。标注在测试类本身不会生效（[#153](https://github.com/baomidou/dynamic-datasource/issues/153)、[#674](https://github.com/baomidou/dynamic-datasource/issues/674)）。

### 10. 断点验证

在业务方法里加一行：

```java
String current = DynamicDataSourceContextHolder.peek();
```

- `null`：注解根本没被拦截（回到第 1、3、4 项）；
- 是期望值但仍连错库：属于第 2 项（连接已被事务绑定）或第 6 项（被残留值影响）。

## 症状 → 最可能原因

| 症状 | 最可能原因 |
| :--- | :--- |
| 一直走 primary，日志无 `switch to the datasource` | 注解没被拦截（自调用 / 非 public / 非 Bean / 被 MP 绕过） |
| 同类内方法调用没切换 | `this` 自调用，第 1 项 |
| 事务方法内切换无效 | 事务已绑定连接，第 2 项 |
| Controller 链式查询没切换 | MyBatis-Plus 姿势，第 4 项 |
| 偶发串库 | push 残留 / 线程复用，第 6、7 项 |
| 切了但报某表不存在 | key 不在（回落 primary），第 5 项 |

## 相关文档

- [@DS 注解位置与 MyBatis-Plus 调用姿势](/docs/faq/annotation-placement)
- [@DS 与线程：异步、线程池、并发串库](/docs/faq/threads)
- [事务内不切换数据源](/docs/faq/tx-inside)
- [手动切换数据源](/docs/advanced/manual-switching)
- [切换失败排查](/docs/guide/switching-failure) —— 按案例汇总的旧版清单
