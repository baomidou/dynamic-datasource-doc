# 启动报错速查

> 关联 Issue：[#49](https://github.com/baomidou/dynamic-datasource/issues/49)、[#88](https://github.com/baomidou/dynamic-datasource/issues/88)、[#141](https://github.com/baomidou/dynamic-datasource/issues/141)、[#146](https://github.com/baomidou/dynamic-datasource/issues/146)、[#148](https://github.com/baomidou/dynamic-datasource/issues/148)、[#186](https://github.com/baomidou/dynamic-datasource/issues/186)、[#332](https://github.com/baomidou/dynamic-datasource/issues/332)、[#518](https://github.com/baomidou/dynamic-datasource/issues/518)、[#632](https://github.com/baomidou/dynamic-datasource/issues/632)、[#741](https://github.com/baomidou/dynamic-datasource/issues/741)

启动失败类问题约占历史 issue 的 6%。下面按**报错文案**索引。

:::tip[排查心法]
先看完整堆栈**最底部的第一个 `Caused by:`** ——那才是真实原因，上层往往只是被包装过的表象。
:::

## 1. `Failed to determine a suitable driver class` / `'url' attribute is not specified`

Spring Boot 认为你要走「默认单数据源」装配，但没找到可用的 url/driver。按以下顺序检查：

1. **数据源是否真的在 `spring.datasource.dynamic.datasource` 之下？** 不少案例是漏了一层或拼错了前缀，导致 dynamic 拿到的清单为空；
2. **`spring.datasource.dynamic.enabled` 是否被设成了 `false`？** 关闭后框架不再接管；
3. **是否同时引入了 `druid-spring-boot-starter`？** 它的 `DruidDataSourceAutoConfigure` 会抢先创建默认数据源，与 dynamic 冲突。官方建议排除：

```yaml
spring:
  autoconfigure:
    exclude: com.alibaba.druid.spring.boot.autoconfigure.DruidDataSourceAutoConfigure
```

4. **配置文件是否真的被打包/加载？** 多模块项目里 yml 未落入运行 jar、profile 未激活都会造成「本地好好的，打包就找不到 url」（[#193](https://github.com/baomidou/dynamic-datasource/issues/193)）。

> 另一种常见情况：想只留一个 `master`，却把 url 配在了老的 `spring.datasource.url`（不在 dynamic 下），框架无从加载。

## 2. `Please check the setting of primary` / `CannotFindDataSourceException: can not find primary datasource`

`primary` 指向的数据源/组不存在。检查：

- `spring.datasource.dynamic.primary` 的值是否与某个数据源键**完全一致**（含组名规则：`slave_1`、`slave_2` 属于组 `slave`，若 `primary: slave` 则命中组）；
- 数据源清单是否为空（结合第 1 条自查）；
- 多环境 profile 是否覆盖丢失；
- 参考 [#141](https://github.com/baomidou/dynamic-datasource/issues/141)、[#146](https://github.com/baomidou/dynamic-datasource/issues/146)、[#148](https://github.com/baomidou/dynamic-datasource/issues/148)、[#341](https://github.com/baomidou/dynamic-datasource/issues/341)。

## 3. `CannotFindDataSourceException: could not find a datasource named xxx`

这是 `strict: true` 下的**正确报错**——你切换的 key 不存在。见[@DS 不生效排查总表](/docs/faq/not-working)第 5 项。

## 4. `enabled P6SPY ,however without p6spy dependency` / `enabled ALIBABA SEATA,however without seata dependency`

开了开关却没加依赖。补依赖，或关闭开关：

```yaml
spring:
  datasource:
    dynamic:
      p6spy: false
      seata: false
```

## 5. `NoClassDefFoundError: io/seata/rm/datasource/SeataDataSourceProxy` 等同类错误

启动期加载了 Seata 相关类但依赖缺失（[#332](https://github.com/baomidou/dynamic-datasource/issues/332)）。按第 4 条处理；若确实需要 Seata，见[集成 Seata](/docs/tx/seata)。

## 6. `java.lang.ArrayStoreException: sun.reflect.annotation.TypeNotPresentExceptionProxy`

典型症状：**Spring Boot 3 项目用了 Boot 2 的 starter 产物**（或反之），注解里引用的类在新 JDK/新 Boot 下不存在（[#518](https://github.com/baomidou/dynamic-datasource/issues/518)、[#524](https://github.com/baomidou/dynamic-datasource/issues/524)）。

按 Spring Boot 大版本选择对应 starter 产物：

| Spring Boot | 依赖 artifactId |
| :--- | :--- |
| 1.5.x / 2.x | `dynamic-datasource-spring-boot-starter` |
| 3.x（JDK 17+） | `dynamic-datasource-spring-boot3-starter` |
| 4.x | `dynamic-datasource-spring-boot4-starter` |

## 7. druid 版本兼容窗口

- **3.6.1 及更早**版本与 **druid 1.2.17+** 不兼容（构造方式变化），启动即失败；修复在 4.0.0（[#494](https://github.com/baomidou/dynamic-datasource/issues/494)、[#497](https://github.com/baomidou/dynamic-datasource/issues/497)、[#500](https://github.com/baomidou/dynamic-datasource/issues/500)、[#506](https://github.com/baomidou/dynamic-datasource/issues/506)）；
- druid 1.2.22 起 `DruidDataSourceAutoConfigure` 行为变化导致的冲突，按第 1 条第 3 点排除（[#632](https://github.com/baomidou/dynamic-datasource/issues/632)）；
- **结论：保持 dynamic-datasource 4.x + 较新 druid。**

## 8. `Property 'sqlSessionFactory' or 'sqlSessionTemplate' are required`

这不是框架自身报错，而是 MyBatis(-Plus) 装配问题在接入多数据源后暴露。确认 mybatis(-plus) starter 与 Spring Boot 大版本匹配、容器中**只存在一个** `SqlSessionFactory`、Mapper 扫描配置正确（[#69](https://github.com/baomidou/dynamic-datasource/issues/69)、[#280](https://github.com/baomidou/dynamic-datasource/issues/280)、[#722](https://github.com/baomidou/dynamic-datasource/issues/722)）。集成姿势见[集成 MyBatis-Plus](/docs/integration/mybatis-plus)。

## 9. 启动时某个库连不上，整个应用起不来

框架默认在启动期创建所有数据源。若希望「连不上不阻塞启动」：

- **`lazy: true`**：数据源延迟到首次使用时创建，启动期完全不建池，见[懒加载数据源](/docs/advanced/lazy-datasource)；
- 池层面放宽：Hikari `initialization-fail-timeout: -1`（不等待建连）；Druid `fail-fast: false` + `initial-size: 0`。

:::warning[lazy 只是把错误推迟]
`lazy: true` 不会修复配置错误，只把失败从启动期推迟到首次使用（[#186](https://github.com/baomidou/dynamic-datasource/issues/186)、[#242](https://github.com/baomidou/dynamic-datasource/issues/242)、[#311](https://github.com/baomidou/dynamic-datasource/issues/311)、[#349](https://github.com/baomidou/dynamic-datasource/issues/349)）。若想「一个库都没有也能启动」，见[无数据源启动](/docs/advanced/no-datasource-startup)。
:::

## 10. 启动日志理解

| 日志 | 含义 |
| :--- | :--- |
| `dynamic-datasource initial loaded [N] datasource,primary datasource named [master]` | 正常 |
| `initial loaded [0] datasource,Please add your primary datasource or check your configuration` | 数据源清单为空——回第 1 条 |
| `dynamic-datasource start closing ....` + `all closed success,bye` | 正常关闭流程的日志，不是错误 |

## 相关文档

- [连接池集成](/docs/pool) —— 参数层级、druid 版本窗口与监控
- [完整配置参考](/docs/guide/configuration)
- [@DS 不生效排查总表](/docs/faq/not-working)
