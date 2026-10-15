# SpEL 动态数据源名

> 关联 Issue：[#199](https://github.com/baomidou/dynamic-datasource/issues/199)、[#205](https://github.com/baomidou/dynamic-datasource/issues/205)、[#413](https://github.com/baomidou/dynamic-datasource/issues/413)、[#492](https://github.com/baomidou/dynamic-datasource/issues/492)、[#698](https://github.com/baomidou/dynamic-datasource/issues/698)、[#744](https://github.com/baomidou/dynamic-datasource/issues/744)、[#216](https://github.com/baomidou/dynamic-datasource/issues/216)、[#727](https://github.com/baomidou/dynamic-datasource/issues/727)

本篇讲 `@DS("#...")` 这类**动态数据源名**怎么用、以及解析失败时怎么排查。处理器责任链的整体设计见[@DS 语义与优先级](/docs/guide/ds-semantics)。

## 一、什么时候会走 SpEL？

`@DS` 的值**以 `#` 开头**时，才交给 SpEL 处理器解析；否则按字面量当数据源名（组名/具体名）。

## 二、支持的写法

```java
@DS("#header.ds")          // 从 HTTP 请求头取（内置处理器）
@DS("#session.dsName")     // 从 HTTP Session 取（内置处理器）
@DS("#user.level")         // SpEL：当前方法参数上的属性
@DS("#p0")                 // SpEL：按参数位置（p0 = 第一个参数）
@DS("#dto.dsKey")          // SpEL：参数对象的字段
@DS("@dsLocator.for(#id)") // SpEL：引用 Spring Bean 的方法
```

优先级链：内置的 `DsHeaderProcessor`（`#header`）→ `DsSessionProcessor`（`#session`）→ `DsSpelExpressionProcessor`（其余 `#` 表达式）。前置处理器匹配前缀后取不到值时返回 `null` 并**继续下沉**给下一个处理器，最终由 SpEL 兜底。你还可以实现 `DsProcessor` 并放到链首扩展自己的前缀，见[自定义数据源来源](/docs/custom/datasource-provider)。

## 三、常见问题

### Q1：`#user.dsName` 报参数找不到 / 解析成 null？

（[#698](https://github.com/baomidou/dynamic-datasource/issues/698)）

- SpEL 里按**参数名**取值需要编译时保留参数名（`-parameters`；Spring Boot 的 Maven 插件默认开启，纯 javac 场景记得加）。没保留时改用 `#p0`、`#a0` 这种位置写法；
- `EL1007E: Property or field 'xxx' cannot be found on null`：表达式的**前置对象**是 null（如 `#user` 本身为 null），检查参数是否为 null；
- 表达式属性写错同样报 `EL1007E`，对照参数类型逐字段核对。

### Q2：表达式解析失败会怎样？

SpEL 无法解析时本次切换失败——非严格模式最终回落 primary（表现又是「注解不生效」）。建议开发环境开 `strict: true` 并及时看日志：

```yaml
spring:
  datasource:
    dynamic:
      strict: true
```

### Q3：`#header.ds` 取不到值时的默认行为？

（[#727](https://github.com/baomidou/dynamic-datasource/issues/727)）

取不到就是 `null` → 回落 primary。想要「没有 header 就报错」，需要自定义 `DsProcessor` 或在业务入口自行校验；也可以标 `@DS("#header.ds ?: 'master'")`，用 SpEL 的 Elvis 运算符给默认值。

### Q4：Mapper 方法上能用 SpEL 吗？

SpEL 针对**注解所在方法**的参数求值。Mapper 方法上的 `@DS("#param")` 取的是 mapper 方法参数（可行，但更推荐 Service 层，理由见[@DS 注解位置与 MyBatis-Plus 调用姿势](/docs/faq/annotation-placement)）。

### Q5：性能如何？

（[#413](https://github.com/baomidou/dynamic-datasource/issues/413)）

每次调用都会解析表达式（有解析缓存），开销可控；但**高频热路径**可考虑把 key 的计算结果缓存到 ThreadLocal，或使用自定义处理器避免复杂表达式。

## 四、安全：类型引用默认被禁用

`T(...)` 类型引用与 `new` 构造表达式在数据源 key 解析中**默认被禁止**（防止 SpEL 注入导致 RCE，[#766](https://github.com/baomidou/dynamic-datasource/issues/766)、[#776](https://github.com/baomidou/dynamic-datasource/issues/776)）。确有需要才打开，并清楚风险：

```yaml
spring:
  datasource:
    dynamic:
      aop:
        allowed-spel-type-access: true   # 默认 false，强烈不建议生产开启
```

:::danger[4.6.0 之前没有这道开关]
4.5.0 及更早版本不存在 `allowed-spel-type-access`，表达式一旦可控即等于任意代码执行入口。请升级到 4.6.0 及以上，并保持该开关为默认的 `false`。
:::

## 相关文档

- [@DS 语义与优先级](/docs/guide/ds-semantics) —— 处理器责任链与匹配规则
- [完整配置参考](/docs/guide/configuration) —— `aop.allowed-spel-type-access` 的取值
- [自定义数据源来源](/docs/custom/datasource-provider) —— 实现自定义 `DsProcessor`
- [@DS 不生效排查总表](/docs/faq/not-working)
