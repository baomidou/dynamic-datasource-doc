# 自定义负载均衡策略

## 基础介绍

如下图`slave`组下有三个数据源，当用户使用`slave`切换数据源时会使用负载均衡算法。

系统自带了两个负载均衡算法

- `LoadBalanceDynamicDataSourceStrategy` 轮询,是默认的。
- `RandomDynamicDataSourceStrategy` 随机的。

```yaml
spring:
  datasource:
    dynamic:
      datasource:
        master:
          username: sa
          password: ""
          url: jdbc:h2:mem:test
          driver-class-name: org.h2.Driver
          schema: db/schema.sql
        slave_1:
          username: sa
          password: ""
          url: jdbc:h2:mem:test
          driver-class-name: org.h2.Driver
        slave_2:
          username: sa
          password: ""
          url: jdbc:h2:mem:test
          driver-class-name: org.h2.Driver
        slave_3:
          username: sa
          password: ""
          url: jdbc:h2:mem:test
          driver-class-name: org.h2.Driver
      strategy: com.baomidou.dynamic.datasource.strategy.LoadBalanceDynamicDataSourceStrategy
```

## 如何自定义

如果默认的两个都不能满足要求，可以参考源码自定义。 暂时只能全局更改。

```java
import java.util.List;
import java.util.concurrent.ThreadLocalRandom;
import javax.sql.DataSource;

public class RandomDynamicDataSourceStrategy implements DynamicDataSourceStrategy {
    public RandomDynamicDataSourceStrategy() {
    }

    public DataSource determineDataSource(List<DataSource> dataSources) {
        return (DataSource)dataSources.get(ThreadLocalRandom.current().nextInt(dataSources.size()));
    }
}
```

## 组名规则

数据源名**第一个 `_` 之前的部分是组名**：`slave_1`、`slave_2` 都属于 `slave` 组。`@DS("slave")` 路由到**组**，由 `strategy` 决策具体成员；`@DS("slave_1")` 则精确落到单个库，跳过策略。

命名即拓扑，详见 [@DS 语义与优先级](/docs/guide/ds-semantics)。

## 常见问题

### Q1：从库宕机了会自动切到其他从库/主库吗？

**不会。** 框架没有内置故障转移（相关提案见 [#84](https://github.com/baomidou/dynamic-datasource/issues/84)、[#108](https://github.com/baomidou/dynamic-datasource/issues/108)、[#790](https://github.com/baomidou/dynamic-datasource/issues/790)）。

可选的自研路径：自定义 `DynamicDataSourceStrategy`，在挑选成员时探测可用性并跳过不可用者。

### Q2：写后马上读，主从延迟怎么办？

框架不做延迟判断（[#361](https://github.com/baomidou/dynamic-datasource/issues/361)）。业务侧常见做法：写后需要强一致的读，在同一事务内完成，或显式指定 `@DS("master")`；也可以引入外部组件（如 ShardingSphere 的 `HintManager`）来强制走主库。

### Q3：多主多从如何配？

`master_1`、`master_2` 本身构成 `master` 组，只是命名而已（[#128](https://github.com/baomidou/dynamic-datasource/issues/128)）。写入端若也想负载均衡，`@DS("master")` + 策略即可；但多主写入的冲突需要自行评估。

### Q4：显式 `@DS("slave")` 后做写操作报错？

说明确实把 `INSERT/UPDATE/DELETE` 路由到了只读从库（[#190](https://github.com/baomidou/dynamic-datasource/issues/190)）。这正是[自动读写分离](/docs/no-annotation/mybatis-read-write)插件模式的优势：写语句永远走主库。

### Q5：与 ShardingSphere 一起用时，读写分离配给谁？

**不要双重配置**：要么由 ShardingSphere 负责读写分离（dynamic 只做多数据源），要么用本框架的插件（[#314](https://github.com/baomidou/dynamic-datasource/issues/314)、[#690](https://github.com/baomidou/dynamic-datasource/issues/690)）。

### Q6：为什么我的 `@DS("slave")` 没生效 / 读写分离无效？

先按 [@DS 不生效排查总表](/docs/faq/not-working)排查；插件模式额外检查两点：插件 Bean 是否注册、流量是否确实走了 MyBatis（`JdbcTemplate` 不受插件把控）。

## 相关文档

- [自动读写分离](/docs/no-annotation/mybatis-read-write) —— `MasterSlaveAutoRoutingPlugin` 的完整行为
- [集成 ShardingJDBC](/docs/integration/sharding-jdbc)
- [@DS 语义与优先级](/docs/guide/ds-semantics)