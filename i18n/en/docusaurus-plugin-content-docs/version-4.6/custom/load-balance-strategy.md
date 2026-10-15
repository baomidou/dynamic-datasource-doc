# Custom Load Balancing Strategy

## Overview

As shown below, the `slave` group holds three datasources. When a user switches to `slave`, a load balancing algorithm is applied.

The framework ships with two load balancing algorithms:

- `LoadBalanceDynamicDataSourceStrategy` — round-robin, the default.
- `RandomDynamicDataSourceStrategy` — random.

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

## How to customize

If neither built-in strategy fits your needs, you can write your own by referring to the source code. For now it can only be changed globally.

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

## Group name rules

The **part before the first `_` of a datasource name is the group name**: both `slave_1` and `slave_2` belong to the `slave` group. `@DS("slave")` routes to a **group** and the `strategy` decides which member is used; `@DS("slave_1")` targets one concrete datasource and skips the strategy.

Naming is topology — see [@DS semantics and precedence](../guide/ds-semantics).

## FAQ

### Q1: When a replica goes down, does traffic fail over to another replica or to the primary automatically?

**No.** The framework has no built-in failover (see the related proposals [#84](https://github.com/baomidou/dynamic-datasource/issues/84), [#108](https://github.com/baomidou/dynamic-datasource/issues/108) and [#790](https://github.com/baomidou/dynamic-datasource/issues/790)).

A possible do-it-yourself path: implement your own `DynamicDataSourceStrategy` that probes availability while picking a member and skips the unavailable ones.

### Q2: Reading right after a write — how do I deal with primary/replica lag?

The framework makes no lag judgement ([#361](https://github.com/baomidou/dynamic-datasource/issues/361)). Common practices on the application side: run reads that need strong consistency after a write inside the same transaction, or specify `@DS("master")` explicitly; you can also bring in an external component (such as ShardingSphere's `HintManager`) to force routing to the primary.

### Q3: How do I configure multiple primaries and multiple replicas?

`master_1` and `master_2` themselves form the `master` group — it is only naming ([#128](https://github.com/baomidou/dynamic-datasource/issues/128)). If the write side also needs load balancing, `@DS("master")` plus a strategy is enough; write conflicts across multiple primaries, however, are yours to evaluate.

### Q4: A write fails after an explicit `@DS("slave")`?

That means `INSERT/UPDATE/DELETE` really were routed to a read-only replica ([#190](https://github.com/baomidou/dynamic-datasource/issues/190)). This is exactly the advantage of the [automatic read/write splitting](../no-annotation/mybatis-read-write) plugin mode: write statements always go to the primary.

### Q5: When used together with ShardingSphere, who owns read/write splitting?

**Do not configure it twice**: either let ShardingSphere handle read/write splitting (dynamic only manages multiple datasources), or use this framework's plugin ([#314](https://github.com/baomidou/dynamic-datasource/issues/314), [#690](https://github.com/baomidou/dynamic-datasource/issues/690)).

### Q6: Why is my `@DS("slave")` not taking effect / why is read/write splitting not working?

First go through the [@DS not working checklist](../faq/not-working). For plugin mode, check two more things: whether the plugin bean is registered, and whether the traffic really goes through MyBatis (`JdbcTemplate` is not controlled by the plugin).

## Further reading

- [Automatic read/write splitting](../no-annotation/mybatis-read-write) — the full behaviour of `MasterSlaveAutoRoutingPlugin`
- [Integrating ShardingJDBC](../integration/sharding-jdbc)
- [@DS semantics and precedence](../guide/ds-semantics)
