---
title: "配置中心刷新数据源"
description: "在 Nacos / Apollo 里改了数据源配置，应用能自动生效吗？本文讲清边界，并给出安全的接入方式。"
---

# 配置中心刷新数据源

## 先说结论

**改完配置中心，配置对象会变，连接池不会自己变。**

`spring.datasource.dynamic.*` 是标准的 `@ConfigurationProperties`，Spring Cloud 的刷新机制确实会把它重新绑定。但数据源是在启动时由
`DynamicRoutingDataSource.afterPropertiesSet()` 一次性建好的连接池，没有任何代码会因为「配置对象变了」就去重建它们。

所以直接改配置中心的结果是：

| 改了什么 | 实际效果 |
| --- | --- |
| 新增一个数据源 | 不生效。strict 模式下报 `CannotFindDataSourceException`，非 strict 下**悄悄落到 primary**（等于查错库） |
| 删掉一个数据源 | 不生效，旧连接池还在，照样能查 |
| 改 url / 用户名 / 密码 | 不生效，旧连接池继续用旧凭据 |
| 改 primary / strict | 不生效，这些是启动时写进路由数据源的 |

最迷惑的地方在于：Actuator 端点、打的日志看到的是**新配置**，实际跑的还是**老连接池**。

## 框架提供什么

框架不绑定任何配置中心（Nacos / Apollo / Spring Cloud Config … 各有各的监听器），但把「拿到一份新配置之后怎么安全落到连接池」
这件最容易写错的事收进了 `DynamicDataSourceRefresher`：

- **只动变化的**：按配置指纹 diff，未变化的库保持原连接池实例不动——避免「改一个库，全库重建」；
- **空配置闸门**：新配置为空时直接拒绝，不删任何库——避免配置中心误操作把数据源团灭；
- **删除熔断**：单次删除比例超过阈值（默认一半）时拒绝删除，只做新增/更新；
- **失败隔离**：单个库创建失败保持旧池可用，不影响其他库；
- **只管自己认识的**：运行期手工 `addDataSource` 加进来的库不在托管快照里，不会被误删。

接入只剩一步：把新配置交给它。

## 方式一：Spring Cloud 环境（零代码）

classpath 存在 Spring Cloud 时，打开开关即可：

```yaml
spring:
  datasource:
    dynamic:
      refresh-enabled: true   # 默认 false
      grace-destroy: true     # 强烈建议同时打开，见下方注意事项
```

配置中心推送 → `RefreshEvent` → 读取已重新绑定的 `DynamicDataSourceProperties` → `refresher.refresh(...)`，全自动。
Nacos（`spring-cloud-starter-alibaba-nacos-config`）、Apollo、Consul 都走这条路径。

开关默认关闭，是不希望升级后行为发生突变。

## 方式二：非 Spring Cloud / 自定义监听

没用 Spring Cloud，或者用的是 Nacos 原生 SDK、自研配置中心，注入编排器手动调用即可：

```java
@Component
@RequiredArgsConstructor
public class DatasourceConfigListener {

    private final DynamicDataSourceRefresher refresher;
    private final DynamicDataSourceProperties properties;

    @NacosConfigListener(dataId = "dynamic-datasource")
    public void onMessage(String msg) {
        // 1. 把 msg 解析成 Map<String, DataSourceProperty>（交给 Spring 的 Binder 而不是手撸 snakeyaml）
        // 2. 交给编排器
        refresher.refresh(properties.getDatasource());
    }
}
```

::::tip[不要用 snakeyaml 手撸]
自己 `yaml.loadAs` 再逐个 `setUsername / setUrl / setPassword` 是常见写法，但它会丢掉 Spring 的 relaxed binding、
类型转换、`ENC()` 解密和嵌套池配置，连 `driver-class-name` 换个写法都会静默失效。

优先让 Spring 绑定：`Binder` 绑到 `Bindable.mapOf(String.class, DataSourceProperty.class)`，
或直接复用已被 Spring Cloud 重新绑定好的 `DynamicDataSourceProperties`。
::::

刷新结果会返回 `DynamicDataSourceRefresher.Result`，含 `added / updated / removed / skipped / failures`，便于打日志和做断言。

## 注意事项

::::danger[务必开启 grace-destroy]
`addDataSource` 同名覆盖会立刻关闭旧连接池，**在途 SQL 会直接断**。

`spring.datasource.dynamic.grace-destroy=true` 让旧池延迟销毁、等活跃连接归还。刷新场景强烈建议打开，
详见[优雅关闭](/docs/advanced/graceful-shutdown)。
::::

其他几点：

- **primary 不会被移除**。`removeDataSource` 会拒绝删除主数据源，并在 `Result.failures` 里记录原因，不会中断整批刷新。
- **全局池配置改了不生效**。`DruidDataSourceCreator` / `HikariDataSourceCreator` 在构造时就把全局 `druid` / `hikari`
  配置读进去了，刷新不会重建这些 bean。只有单个数据源自己的配置变化才会被应用。
- **`init` 脚本会重跑**。如果配了 `schema` / `data` 初始化脚本，每次重建连接池都会执行一遍。
- **多实例各刷各的**。编排器只作用于当前 JVM；用配置中心监听的好处正是每台实例自己监听自己改。
- **自定义 provider 需要补基线**。数据源来自自定义 `DynamicDataSourceProvider`（如引导库）时，启动配置不在
  `DynamicDataSourceProperties` 里，需要在拿到首份配置后调用 `refresher.baseline()` 建立基线，否则首次刷新会全量重建。
- **创建失败是快速失败**。以 HikariCP 为例，构造阶段就会建连，密码填错会**立即**抛异常，此时旧池保持不变——这比「替换后才发现问题」安全得多。

## 常见问题

### 我改了密码，为什么还是连上去了？

旧连接池持有的是启动时传入的密码，且池里的物理连接是老的。必须重建连接池才会用到新密码——这正是 `refresher.refresh()` 做的事。
如果刷新后密码仍不生效，检查这次刷新是否真的识别到变更：看日志里的 `added / updated / skipped`，或确认新配置是否被 Spring 正确绑定。

### 手工 addDataSource 加的库会被刷掉吗？

不会。编排器只管理它自己快照里的数据源（来自配置属性的那批），运行期手工加进来的库不在快照内，刷新时会被忽略。

### 刷新会不会把正在执行的请求打断？

`addDataSource` / `removeDataSource` 都是 `synchronized`，但都不等待在途请求。开 `grace-destroy` 能覆盖替换旧池的场景；
删除场景请参照[动态添加/移除数据源](/docs/advanced/add-remove-datasource)，先摘流量再移除。

## 示例项目

[refresh-datasource-sample](https://github.com/dynamic-datasource/dynamic-datasource-samples/tree/master/spring-boot-4/refresh-datasource-sample)
