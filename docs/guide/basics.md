---
title: "基础必读"
description: "dynamic-datasource 是一个基于 Spring Boot 的快速集成多数据源的启动器。它只做一件事——决定一次调用打到哪个 DataSource 上——并且不限制你随后做什么：任意 CRUD、任意 ORM、任意事务策略。"
---

# 基础必读

**dynamic-datasource** 是一个基于 Spring Boot 的快速集成多数据源的启动器。它只做一件事——**决定一次调用打到哪个 `DataSource` 上**——并且不限制你随后做什么：任意 CRUD、任意 ORM、任意事务策略。

```java
@Service
public class UserServiceImpl implements UserService {

    @DS("master")   // 走主库
    public void save(User user) { }

    @DS("slave")    // 走从库组，组内负载均衡
    public List<User> listUsers() { }
}
```

## 版本兼容

按你的 Spring Boot 版本选择对应的 starter：

| Spring Boot | JDK 要求 | Starter 构件 | 开始支持版本 |
| :---: | :---: | :--- | :---: |
| 1.5.x ~ 2.x.x | JDK 8+ | `dynamic-datasource-spring-boot-starter` | 1.0.0 |
| 3.x.x | JDK 17+ | `dynamic-datasource-spring-boot3-starter` | 4.0.0 |
| 4.x.x | JDK 17+ | `dynamic-datasource-spring-boot4-starter` | 4.5.0 |

:::warning
连接池（Druid / HikariCP 等）与 JDBC 驱动**不包含**在本 starter 中，需要你的项目自行引入并保持版本匹配。这样设计是为了保证构件轻量，避免 shaded 式打包带来的依赖冲突。
:::

## 快速开始

### 1 · 引入依赖

下面的 `${version}` 请替换为 [Releases](https://github.com/baomidou/dynamic-datasource/releases) 中的最新版本（本文档对应 4.6 版本线）。

**Maven**

```xml
<!-- Spring Boot 2.x（含 1.5.x） -->
<dependency>
    <groupId>com.baomidou</groupId>
    <artifactId>dynamic-datasource-spring-boot-starter</artifactId>
    <version>${version}</version>
</dependency>

<!-- Spring Boot 3.x -->
<dependency>
    <groupId>com.baomidou</groupId>
    <artifactId>dynamic-datasource-spring-boot3-starter</artifactId>
    <version>${version}</version>
</dependency>

<!-- Spring Boot 4.x -->
<dependency>
    <groupId>com.baomidou</groupId>
    <artifactId>dynamic-datasource-spring-boot4-starter</artifactId>
    <version>${version}</version>
</dependency>
```

**Gradle**

```groovy
// 按你的 Spring Boot 版本三选一
implementation 'com.baomidou:dynamic-datasource-spring-boot-starter:${version}'
implementation 'com.baomidou:dynamic-datasource-spring-boot3-starter:${version}'
implementation 'com.baomidou:dynamic-datasource-spring-boot4-starter:${version}'
```

### 2 · 配置数据源

`datasource` 之下的每个 key 都是一个数据源名，**第一个 `_` 之前的部分即组名**。

```yaml
spring:
  datasource:
    dynamic:
      enabled: true              # 是否启用动态数据源，默认 true
      primary: master            # 默认数据源或数据源组，默认 master
      strict: false              # 严格模式：true 时未匹配到数据源直接抛异常
      grace-destroy: false       # 优雅关闭：true 时至多等待 10s 再强制关闭活跃连接
      datasource:
        master:
          url: jdbc:mysql://host1:3306/dynamic
          username: root
          password: 123456
          driver-class-name: com.mysql.cj.jdbc.Driver  # 3.2.0 起支持 SPI 自动推断，可省略
        slave_1:
          url: jdbc:mysql://host2:3307/dynamic
          username: root
          password: 123456
          driver-class-name: com.mysql.cj.jdbc.Driver
        slave_2:
          url: jdbc:mysql://host3:3308/dynamic
          username: ENC(xxxxx)   # 内置加密，见「数据库密码加密」
          password: ENC(xxxxx)
          driver-class-name: com.mysql.cj.jdbc.Driver
```

以上配置会得到一个 `master` 数据源，以及一个包含 `slave_1`、`slave_2` 的 `slave` 组。其他拓扑形态只是改命名而已：

```yaml
# 一主多从              # 纯粹多库            # 混合配置
master:                mysql:               master:
slave_1:               oracle:              slave_1:
slave_2:               sqlserver:           slave_2:
                       h2:                  oracle_1:
                                            oracle_2:
```

### 3 · 用 `@DS` 切换数据源

`@DS` 可以标注在**方法或类**上，同时存在时**方法上的注解优先**。

```java
@Service
@DS("slave")   // 类上声明：本类默认走 slave 组
public class UserServiceImpl implements UserService {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    // 未标注 → 用类上的 @DS("slave")

    @DS("master")   // 方法上声明 → 覆盖类上的，走主库
    public List<Map<String, Object>> selectAll() {
        return jdbcTemplate.queryForList("select * from user");
    }

    @DS("slave_1")  // 直接指定到具体的库，跳过组策略
    public List<Map<String, Object>> selectByCondition() {
        return jdbcTemplate.queryForList("select * from user where age > 10");
    }
}
```

| 注解 | 解析结果 |
| :--- | :--- |
| 不加注解 | 默认数据源（`primary`） |
| `@DS("slave")` | `slave` **组**，组内按策略负载均衡 |
| `@DS("slave_1")` | `slave_1` **具体数据源** |
| `@Master` / `@Slave` | 内置快捷注解，分别等价于 `@DS("master")` / `@DS("slave")` |
| `@DS("#header.tenantId")` | 从请求头取数据源名，见下节 |

只要一个注解自身被 `@DS` 元注解标注，它就能当作数据源切换注解使用——`@Master`、`@Slave` 就是这么来的，你也可以据此定义属于自己业务语义的注解（例如内部标注 `@DS("oracle")` 的 `@OracleDs`）。

## 核心特性

| 维度 | 能力 |
| :--- | :--- |
| **数据源分组** | 纯粹多库、读写分离、一主多从、混合模式，全靠命名表达。 |
| **动态路由** | `@DS` 可标注在方法 / 类 / 接口 / 抽象类上，就近生效；组名走负载均衡或随机策略。 |
| **事务支持** | `@DSTransactional` 本地多数据源事务（7 种传播行为）、`@DsTxEventListener` 事务事件，Seata `AT` / `XA` 与 Atomikos XA 分布式事务。 |
| **配置加密** | 内置 `ENC(...)` 敏感信息加密，算法与公钥可自定义；SpEL 类型访问默认关闭。 |
| **生命周期** | 无数据源启动、懒加载、运行期动态增删数据源、优雅关闭（等待活跃连接）。 |
| **可扩展** | 自定义注解（以 `@DS` 作为元注解）、自定义 `DsProcessor` 责任链、自定义 `DynamicDataSourceProvider`、可插拔 `DataSourceCreator`。 |
| **连接池** | Druid、HikariCP、BeeCP、DBCP2、C3P0、Oracle UCP、无池 basic 与 JNDI 的便捷集成。 |
| **可观测** | Actuator 只读端点盘点数据源与分组；Hikari / Druid 连接池 Micrometer 指标。 |
| **原生镜像** | GraalVM Reachability Metadata 作为独立构件发布，`nativeTest` 是每次提交的准入门禁。 |

## 约定

1. 本框架只做**切换数据源**这一件事，不限制你切换后做什么 CRUD。
2. 配置中所有以下划线 `_` 分割的数据源，**首个 `_` 之前的部分即为组名**，同组数据源归入同一个 `GroupDataSource`。
3. 切换目标既可以是组名，也可以是具体数据源名。组名走策略（默认负载均衡，可选随机）。
4. 默认数据源名为 `master`，可通过 `spring.datasource.dynamic.primary` 修改。
5. 优先级由高到低：**代码主动切换（`push`）> 方法注解 > 类注解**。
6. `@DS` 支持继承自**接口**（3.4.1 起）与**抽象类**，也支持桥接方法。

第 5、6 条涉及的行为细节，见 [@DS 语义与优先级](/docs/guide/ds-semantics)。

## 下一步

- [@DS 语义与优先级](/docs/guide/ds-semantics) —— 组与库、就近原则、SpEL / header / session 动态 key
- [完整配置参考](/docs/guide/configuration) —— 所有配置项与默认值
- [不在范围内](/docs/guide/out-of-scope) —— 哪些事情本框架刻意不做（建议先读，能省掉很多排查）
- [切换失败排查](/docs/guide/switching-failure) —— 历史高频问题的清单