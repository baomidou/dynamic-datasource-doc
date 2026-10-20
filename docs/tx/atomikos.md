---
title: "Atomikos XA 事务"
description: "用 Atomikos 做单进程内的标准 XA 两阶段提交：本篇覆盖依赖版本窗口、数据源配置、事务管理器装配、编程式 JTA 写法，以及几个容易踩的坑。"
---

# Atomikos XA 事务

Atomikos 是经典的 JTA 事务管理器，通过 XA 两阶段提交（2PC）让**单进程内**的多个数据源参与同一个全局事务。

:::tip[什么时候用]
- 单体应用内跨多个库，且要求**强一致**（不能接受「尽力而为」的回滚）→ 用 Atomikos。
- 只是多库本地事务 → 用 [`@DSTransactional`](/docs/tx/local-tx)，更轻。
- 跨服务 → 用 [Seata](/docs/tx/seata)。

选型对比见[事务选型指南](/docs/tx)。
:::

## 依赖与版本窗口

Atomikos 6.0.0 是首个 **jakarta** 构件线，Atomikos 5 及更早只有 javax 构件：

| Spring Boot | starter | Atomikos |
| :--- | :--- | :--- |
| 1.5 ~ 2.x | `dynamic-datasource-spring-boot-starter` | 4.x / 5.x（javax，无 classifier） |
| 3.x | `dynamic-datasource-spring-boot3-starter` | **6.0.x，必须带 `jakarta` classifier** |
| 4.x | `dynamic-datasource-spring-boot4-starter` | **6.0.x，必须带 `jakarta` classifier** |

两个容易漏的依赖细节：

1. Spring Boot 的 BOM **不管理** Atomikos 版本，需要自己声明；
2. `transactions-jta` 把 `jakarta.transaction:jakarta.transaction-api` 声明为 **provided**，不会随依赖传递。不显式引入时，Spring Boot 的 JTA 自动配置会因缺少 `jakarta.transaction.Transaction` 而退让，事务管理器回退成 `JdbcTransactionManager`，**XA 根本不会发生**。

```xml
<dependency>
    <groupId>com.atomikos</groupId>
    <artifactId>transactions-jdbc</artifactId>
    <version>6.0.1</version>
    <classifier>jakarta</classifier>
</dependency>
<dependency>
    <groupId>com.atomikos</groupId>
    <artifactId>transactions-jta</artifactId>
    <version>6.0.1</version>
    <classifier>jakarta</classifier>
</dependency>
<!-- transactions-jta 里是 provided，不会传递，必须显式引入 -->
<dependency>
    <groupId>jakarta.transaction</groupId>
    <artifactId>jakarta.transaction-api</artifactId>
</dependency>
```

:::warning[Atomikos 6 与 4.6.0 及更早版本不兼容]
Atomikos 6.0.0 移除了 `AtomikosDataSourceBean#setReapTimeout(int)`。dynamic-datasource 4.6.0 及更早版本在 Atomikos 6 下启动即抛
`NoSuchMethodError: 'void com.atomikos.jdbc.AtomikosDataSourceBean.setReapTimeout(int)'`
（[issue #822](https://github.com/baomidou/dynamic-datasource/issues/822)）。升级到包含该修复的版本即可。
:::

## 数据源配置

Atomikos 数据源**必须显式声明 `type`**：框架按 creator 注册顺序取第一个可用池，HikariCP / Druid 的优先级都在 Atomikos 之前，
不写 `type` 会被它们接管，并把 XA 数据源类误当作 `java.sql.Driver` 加载，启动报 `Failed to load driver class`。

```yaml
spring:
  datasource:
    dynamic:
      primary: master
      atomikos:                      # 全局连接池参数，单数据源下可用同名 key 覆盖
        min-pool-size: 1
        max-pool-size: 10
        borrow-connection-timeout: 30
        max-idle-time: 60
        maintenance-interval: 60
      datasource:
        master:
          # ① type 必须显式声明
          type: com.atomikos.jdbc.AtomikosDataSourceBean
          # ② driver-class-name 指向 XA 数据源类（不是普通 JDBC Driver）
          driver-class-name: com.mysql.cj.jdbc.MysqlXADataSource
          # ③ url / username / password 原样交给 XA 数据源
          url: jdbc:mysql://xx.xx.xx.xx:3306/dynamic
          username: root
          password: root
```

内置支持的 XA 数据源类（见 `XADataSourceEnum`）：

| 数据库 | XA 数据源类 |
| :--- | :--- |
| MySQL 8+ | `com.mysql.cj.jdbc.MysqlXADataSource` |
| MySQL 5.1 | `com.mysql.jdbc.jdbc2.optional.MysqlXADataSource` |
| Oracle | `oracle.jdbc.xa.client.OracleXADataSource` |
| PostgreSQL | `org.postgresql.xa.PGXADataSource` |
| H2 | `org.h2.jdbcx.JdbcDataSource` |

:::note
其他数据库的 XA 数据源类不在枚举内，**不会被 Atomikos 创建器认领**，需要自定义 `DataSourceCreator`。
:::

连接池参数（`spring.datasource.dynamic.atomikos.*` 或 `datasource.<name>.atomikos.*`）：

| 参数 | 默认值 | 说明 |
| :--- | :--- | :--- |
| `min-pool-size` | 1 | 最小连接数 |
| `max-pool-size` | 10 | 最大连接数 |
| `borrow-connection-timeout` | 30 | 池空时等待连接的秒数 |
| `reap-timeout` | 0 | 连接最大借用秒数；**Atomikos 6 已移除该配置**，4/5 生效 |
| `max-idle-time` | 60 | 超出 min-pool-size 的空闲连接保留秒数 |
| `test-query` | `SELECT 1` | 归还连接前的验证语句 |
| `maintenance-interval` | 60 | 池维护线程间隔秒数 |
| `default-isolation-level` | -1 | 默认隔离级别，负值忽略 |
| `max-lifetime` | 60 | 连接最大存活秒数，0 为不限制 |

`uniqueResourceName`（Atomikos 要求每个 XA 资源名唯一）自动取数据源的 key，无需配置；手工 `addDataSource` 时注意不要重名。

## 事务管理器装配

Spring Boot 3 及以前会自动装配 Atomikos 的 `UserTransactionManager`；**Boot 4 起 JTA 自动配置只剩 JNDI 变体，需要自行声明**：

```java
@Configuration
public class JtaConfig {
    @Bean(initMethod = "init", destroyMethod = "close")
    public UserTransactionManager userTransactionManager() {
        return new UserTransactionManager();
    }

    @Bean
    public JtaTransactionManager transactionManager(UserTransactionManager tm) {
        return new JtaTransactionManager(tm, tm);
    }
}
```

Atomikos 的事务日志默认落在工作目录的 `transaction-logs`（及 `tmlog*.log`），异常退出后重启会先做故障恢复，属预期行为。

## 事务写法：多数据源 MyBatis 请用编程式 JTA

**不要在多数据源 MyBatis 场景使用 Spring 的 `@Transactional`。**

MyBatis-Spring 在 Spring 事务同步激活时会把整个事务复用同一个 `SqlSession`（连同同一个 `Connection`），
而这个连接是在事务内**第一条语句执行时**才按当时的 `@DS` 确定数据源的——之后的 `@DS` 切换全部失效，
跨库写入会集中打到第一个数据源上，典型报错是第二个库 `Table not found`。

正确写法是**编程式 JTA**：不注册 Spring 事务同步，每次 mapper 调用各自取连接并按当前 `@DS` 路由，
Atomikos 自动把连接登记进当前 JTA 事务，`commit` 时对所有已登记的 XA 资源做两阶段提交。

```java
@DS("order")
public void placeOrder(PlaceOrderRequest request) {
    try {
        userTransactionManager.begin();
        orderMapper.insert(order);                          // -> order 数据源
        accountService.deduct(request.getUserId(), amount);  // @DS("account") -> account 数据源
        userTransactionManager.commit();                    // 两个 XA 资源 2PC
    } catch (RuntimeException e) {
        userTransactionManager.rollback();                  // 两个库一起回滚
        throw e;
    } catch (Exception e) {
        userTransactionManager.rollback();
        throw new IllegalStateException("JTA 事务提交失败", e);
    }
}
```

只操作单库时仍可用 Spring 的 `@Transactional`（配合上面的 `JtaTransactionManager`）。

## MyBatis 侧配 AtomikosTransactionFactory

```java
@Bean
public SqlSessionFactory sqlSessionFactory(DataSource dataSource) throws Exception {
    SqlSessionFactoryBean factoryBean = new SqlSessionFactoryBean();
    factoryBean.setDataSource(dataSource);
    // 每次 MyBatis 事务开始时先按当前 @DS 确定真实数据源，再交给 SpringManagedTransaction
    factoryBean.setTransactionFactory(new AtomikosTransactionFactory());
    return factoryBean.getObject();
}
```

同时 `@MapperScan` 显式声明 `sqlSessionFactoryRef = "sqlSessionFactory"`，避免 AOT 下按类型装配丢失。

:::note
该配置类要求 classpath 上同时有 MyBatis 与 mybatis-spring（由使用方的 MyBatis / MyBatis-Plus starter 提供），否则 Atomikos 整组自动装配会被跳过。
:::

## XA 数据源不要用 init.schema 建表

`spring.datasource.dynamic.datasource.<name>.init.schema` 的脚本是在 XA 连接池取出的连接上执行的；
Atomikos 在事务管理器未运行时会话不提交，连接关闭时未提交的 DDL 会被回滚，
表根本建不出来（启动不报错，第一次查询才 `Table not found`）。

解法：用普通连接（auto-commit）先建表，或交给 Flyway / Liquibase 管理。

## 示例项目

[tx-atomikos-sample](https://github.com/dynamic-datasource/dynamic-datasource-samples/tree/master/spring-boot-4/tx-atomikos-sample)

该示例为 **Boot 4 + Atomikos 6（jakarta）+ MyBatis + 双 H2 XA 数据源** 的版本：模拟用户下单写订单库、扣账户库余额，
两个 XA 资源在同一 JTA 事务内提交，余额不足时一起回滚。测试用例覆盖 2PC 提交与整体回滚，不需要 Docker。

## 常见问题

| 现象 | 原因与处理 |
| :--- | :--- |
| 启动报 `NoSuchMethodError: setReapTimeout(int)` | Atomikos 6 移除了该方法，dynamic-datasource 4.6.0 及更早版本不兼容，升级即可（[#822](https://github.com/baomidou/dynamic-datasource/issues/822)） |
| 启动报 `Failed to load driver class` | 漏写 `type: com.atomikos.jdbc.AtomikosDataSourceBean`，连接池被 Hikari/Druid 接管 |
| 事务管理器是 `JdbcTransactionManager` | 缺 `jakarta.transaction-api`，或 Boot 4 未自行装配 `JtaTransactionManager` |
| 第二个库报 `Table not found` | 用了 Spring `@Transactional` + MyBatis，事务内 `@DS` 失效；改用编程式 JTA |
| 表建不出来 | XA 池内 `init.schema` 不提交；改用普通连接建表 |
| `uniqueResourceName` 冲突 | Atomikos 要求 XA 资源名唯一，dynamic-datasource 自动取数据源 key，勿重名 |

## 相关阅读

- [事务选型指南](/docs/tx) —— 决策树与方案对比
- [本地多数据源事务](/docs/tx/local-tx) —— `@DSTransactional` 完整用法
- [Seata 事务](/docs/tx/seata) —— 跨服务场景的方案
- [连接池集成](/docs/pool) —— creator 优先级与参数继承规则
