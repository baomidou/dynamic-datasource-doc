# 版本记录与选择建议

## 一句话选版本

**新项目用最新的 4.6.0。** 已在 4.5.0 上的项目，建议尽快升级到 4.6.0（原因见下方「升级必读」）。

## 版本支持

| 版本 | JDK | Spring Boot | Starter 构件 | GraalVM |
| :--- | :--- | :--- | :--- | :---: |
| 3.5.2 | 8+ | 1.5.x / 2.x.x / 3.x.x | `-spring-boot-starter` | 不支持 |
| 4.1.3 | 8+ | 1.5.x / 2.x.x / 3.x.x | `-spring-boot-starter` | 不支持 |
| 4.2.0 ~ 4.3.1 | 8+ | 1.5.x / 2.x.x / 3.x.x | `-spring-boot-starter`、`-boot3-starter` | 支持 |
| **4.5.0** | 8+（Boot 3 / 4 需 17+） | 1.5.x / 2.x.x / 3.x.x / **4.x.x** | 上述三个 + `-boot4-starter` | 支持 |
| **4.6.0**（最新） | 8+（Boot 3 / 4 需 17+） | 1.5.x / 2.x.x / 3.x.x / 4.x.x | 同上 | 支持 |

:::info[没有 4.4.x]
`4.3.1`（2024-06）之后**直接跳到 `4.5.0`**（2026-01），中间隔了 19 个月，不存在 4.4.x 的任何发布。看到别处提到 4.4 可以忽略。
:::

产线的维护状态（哪条线还收特性、哪条线已冻结）见主仓库的 [SUPPORT.md](https://github.com/baomidou/dynamic-datasource/blob/master/SUPPORT.md)。

## 升级必读

### 4.5.0 → 4.6.0

**两条必读，其余按需。**

#### 1. 安全：SpEL 注入修复（建议立即升级）

`DsSpelExpressionProcessor` 存在 SpEL 注入漏洞，在表达式可控时**可能导致远程代码执行**（[#767](https://github.com/baomidou/dynamic-datasource/pull/767)）。

修复方式有两条：升级到 4.6.0，或继续用 4.5.0 但**不要**让 `@DS` 的 SpEL 表达式包含用户可控内容。

4.6.0 同时新增了 `spring.datasource.dynamic.aop.allowed-spel-type-access` 开关（**默认 `false`**），用于禁止 `T(java.lang.Runtime)` 这类类型引用。详见[完整配置参考](/docs/guide/configuration)。

#### 2. JDK 8 用户报 `No suitable driver`？

**根因是 4.5.0 的依赖泄漏，不是你的 MySQL 配置。**

4.5.0 把 `oracle-spring-boot-starter-ucp`、`ucp`（以及 `ojdbc11`）传递给了所有使用方。`ojdbc11` 是 Java 11 字节码，在 **JDK 8** 上会让 `DriverManager` 的驱动 ServiceLoader 遍历中断——其他驱动（MySQL 等）因此注册失败，最终报 `No suitable driver`。

4.6.0 已把这两个依赖改为 `compileOnly`。若必须留在 4.5.0 且使用 JDK 8，请排除：

```xml
<exclusions>
  <exclusion>
    <groupId>com.oracle.database.spring</groupId>
    <artifactId>oracle-spring-boot-starter-ucp</artifactId>
  </exclusion>
  <exclusion>
    <groupId>com.oracle.database.jdbc</groupId>
    <artifactId>ucp</artifactId>
  </exclusion>
</exclusions>
```

#### 其他行为变化

| 变化 | 影响 |
| :--- | :--- |
| Seata 代理检查器恢复生效 | 4.5.0 里该检查器**从未被注册**，等于没有。4.6.0 修复后，`seata=true` 且命中 Seata 自动代理的用户会开始看到 WARN 提示——这是预期行为 |
| Boot 4 线对齐 `mybatis-spring` 4.x | 移除了传递的 2.1.2 版本冲突 |
| 所有构件新增 `Automatic-Module-Name` | 提供稳定的 JPMS 模块名契约，仍不提供完整 `module-info` |

## 版本变更记录

每个版本都可以点进 GitHub Release 看完整的 PR 列表与贡献者。

### 4.6.0 <small>2026-10-13</small>

距上次发布 8 个月、63 笔变更的聚合发布。

**新增**

- Actuator 只读端点 `/actuator/dynamic-datasource`：数据源清单、分组构成与全局开关——见[运维端点与指标](/docs/advanced/observability)
- `@DSTransactional` 传播语义契约测试（12 场景 × 3 产线）
- [SUPPORT.md](https://github.com/baomidou/dynamic-datasource/blob/master/SUPPORT.md)：三条 Boot 产线的维护策略

**修复**

- **安全**：`DsSpelExpressionProcessor` 的 SpEL 注入（潜在 RCE）
- **事务核心 7 处**：NESTED savepoint 成功路径、未标记连接泄漏、完成链中断、`REQUIRES_NEW` 无连接 NPE（[#764](https://github.com/baomidou/dynamic-datasource/pull/764)）、`Error` 回滚语义等
- **路由**：并发下 `containsKey`/`get` 双读返回 `null`、删除数据源后空组除零
- **native image**：`RandomDynamicDataSourceStrategy` 反射注册、`nativeTest` 修复（[#788](https://github.com/baomidou/dynamic-datasource/pull/788)）
- **依赖**：Oracle UCP 依赖泄漏改为 `compileOnly`（[#787](https://github.com/baomidou/dynamic-datasource/pull/787)）

[查看 4.6.0 完整 Release 说明 →](https://github.com/baomidou/dynamic-datasource/releases/tag/v4.6.0)

### 4.5.0 <small>2026-01-20</small>

距 4.3.1 相隔 19 个月的特性版本，本项目的**第二个分水岭**（第一个是 4.0.0）。

**新增**

- **支持 Spring Boot 4.0.0**，新增 `dynamic-datasource-spring-boot4-starter`
- **C3P0** 与 **Oracle UCP** 连接池支持（至此连接池覆盖 Druid / HikariCP / BeeCP / DBCP2 / C3P0 / UCP / Atomikos）
- **HikariCP 连接池监控指标**（Micrometer）——见[运维端点与指标](/docs/advanced/observability)
- Seata 代理数据源检测（检查器本身在 4.6.0 才真正生效，见上）
- Druid：线程池参数配置、数据源 callback 配置
- 数据源创建失败时带上 `cause`，不再丢失根因

**工程**

- 构建体系从 Maven 迁移到 Gradle
- 发布迁移到 Maven Central Portal

[查看 4.5.0 完整 Release 说明 →](https://github.com/baomidou/dynamic-datasource/releases/tag/v4.50)

:::tip[tag 名是 `v4.50`]
4.5.0 的 git tag 少了个小数点，写成 `v4.50`。查 tag、写对比链接、配 CI 时都按 `v4.50` 写，别写成 `v4.5.0`。
:::

### 4.3.1 <small>2024-06-13</small>

- 修复启动警告、Druid 数据源无法关闭（`closed` 状态）
- 分组数据源删除后同步清理 datasource
- 修复事务后置回调中开启事务导致死循环
- 新增 MySQL Connector/J 5.1 `XADataSource` 支持

[查看 4.3.1 完整 Release 说明 →](https://github.com/baomidou/dynamic-datasource/releases/tag/v4.3.1)

### 更早的版本

| 版本 | 时间 | 关键内容 |
| :--- | :--- | :--- |
| 4.3.0 | 2024-01 | 修复 Druid 存在 `publicKey` 时创建异常、`@Bean` 初始化优化 |
| 4.2.0 | 2023-10 | **GraalVM nativeTest 接入 CI**、**优雅关闭（grace-destroy）**、多数据源事务同步机制 |
| 4.1.3 | 2023-08 | `ENC` 分组加解密（53/64 字节阈值）、移除 `spring-boot-starter-web` 强依赖 |
| 4.1.2 | 2023-07 | 修复 REQUIRED 下多个 NESTED 子事务不提交 |
| 4.1.1 | 2023-07 | 修复 Druid 加密失败 |
| 4.1.0 | 2023-07 | 注解解析 `ArrayStoreException`、`TransactionFactory` `NoClassDefFoundError` |
| 4.0.0 | 2023-06 | **多数据源事务传播机制**、Atomikos 适配、Jakarta EE 10 迁移、NESTED 传播 |
| 3.6.0 | 2022-12 | 支持 Spring Boot 3 自动配置、Druid `socketTimeout` / `connectTimeout` |
| 3.5.2 | 2022-08 | 本地事务抛异常、`#root.target`、HikariCP 原生参数 |
| 3.5.0 | 2021-11 | `init` 层级重构（破坏性）、`strategy` 方法改名 `determineKey`（破坏性）、移除健康检查、本地事务支持类级注解、`DataSourceInitEvent` |

[查看全部 Release →](https://github.com/baomidou/dynamic-datasource/releases)

## 升级建议

- **新项目**：直接用最新稳定版。
- **当前版本用得好、也没有你需要的新特性**：不必升级。
- **升级前**：务必读一次上面的「升级必读」，特别是带破坏性变更的次版本（`x.y.0` 与 `x.y` 版本）。
- 本项目**不保证跨大版本的二进制兼容**，升级后请跑一遍自己的集成测试。

## 相关阅读

- [不可用版本说明](/docs/guide/unavailable-versions) —— 已下架或被移除能力的版本
- [不在范围内](/docs/guide/out-of-scope) —— 本项目刻意不做的事，避免把「未实现」误判成「版本问题」
- 本站导航栏的版本下拉可切换 **4.5.0 / 4.6.0** 两套文档
