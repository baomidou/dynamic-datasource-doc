---
title: "Integrating ShardingJDBC"
description: "---"
---

# Integrating ShardingJDBC

## Overview

- ShardingSphere on GitHub [https://github.com/apache/shardingsphere](https://github.com/apache/shardingsphere)
- ShardingSphere documentation [https://shardingsphere.apache.org/](https://shardingsphere.apache.org/)
- ShardingSphere examples [https://github.com/apache/shardingsphere/tree/master/examples](https://github.com/apache/shardingsphere/tree/master/examples)

---

When multiple datasources meet ShardingSphere: some tables are large and need sharding handled by ShardingSphere, while multiple databases are needed at the same time.

Reference article: https://zhuanlan.zhihu.com/p/166105923

ShardingSphere has several major versions; **check the sample project at the bottom of this page for the integration method that matches your version**.

## How to use

### 1. Add the `shardingsphere` dependency.

[![](https://img.shields.io/maven-central/v/org.apache.shardingsphere/sharding-jdbc-spring-boot-starter.svg)](http://mvnrepository.com/artifact/org.apache.shardingsphere/sharding-jdbc-spring-boot-starter)

```xml
<dependency>
    <groupId>org.apache.shardingsphere</groupId>
    <artifactId>sharding-jdbc-spring-boot-starter</artifactId>
    <version>${version}</version>
</dependency>
<dependency>
    <groupId>org.apache.shardingsphere</groupId>
    <artifactId>sharding-jdbc-spring-namespace</artifactId>
    <version>${version}</version>
</dependency>
```

### 2. Configure ShardingJDBC and the dynamic datasource separately.

ShardingSphere has several major versions; **check the sample project at the bottom of this page for the integration method that matches your version**.

```yml
spring:
  # shardingjdbc configuration
  shardingsphere:
    datasource:
      names: shardingmaster,shardingslave0,shardingslave1
      shardingmaster:
        type: com.zaxxer.hikari.HikariDataSource
        driver-class-name: org.h2.Driver
        jdbc-url: jdbc:h2:mem:test
        username: sa
        password: ""
      shardingslave0:
        type: com.zaxxer.hikari.HikariDataSource
        driver-class-name: org.h2.Driver
        jdbc-url: jdbc:h2:mem:test
        username: sa
        password: ""
      shardingslave1:
        type: com.zaxxer.hikari.HikariDataSource
        driver-class-name: org.h2.Driver
        jdbc-url: jdbc:h2:mem:test
        username: sa
        password: ""
    masterslave:
      name: ms
      load-balance-algorithm-type: round_robin
      master-data-source-name: shardingmaster
      slave-data-source-names: shardingslave0,shardingslave1
    sharding:
      tables:
        t_order:
          actualDataNodes: shardingmaster.t_order${0..1}
          tableStrategy:
            inline:
              shardingColumn: order_id
              algorithmExpression: t_order${order_id % 2}
          keyGenerator:
            type: SNOWFLAKE
            column: order_id
  # dynamic datasource configuration
  datasource:
    dynamic:
      datasource:
        master:
          username: sa
          password: ""
          url: jdbc:h2:mem:master
          driver-class-name: org.h2.Driver
          schema: db/schema.sql
        test:
          username: sa
          password: ""
          url: jdbc:h2:mem:test
          driver-class-name: org.h2.Driver
          schema: db/schema.sql
```

### 3. Integrate with ShardingSphere through a custom `DynamicDataSourceProvider`.

ShardingSphere has several major versions; **check the sample project at the bottom of this page for the integration method that matches your version**.

```java
@Configuration
public class MyDataSourceConfiguration {

    @Resource
    private DynamicDataSourceProperties properties;

    /**
     * sharding: shardingDataSource
     * master/slave: masterSlaveDataSource
     * inject whichever fits your scenario
     */
//    @Lazy some Spring Boot versions fail without it (root cause unclear 0 0)
    @Resource
    private MasterSlaveDataSource masterSlaveDataSource;

 //    @Lazy 
//    @Resource newer sharding versions use this one, no master/slave split
//    private ShardingDataSource shardingDataSource;

    @Bean
    public DynamicDataSourceProvider dynamicDataSourceProvider() {
        return new AbstractDataSourceProvider() {

            @Override
            public Map<String, DataSource> loadDataSources() {
                Map<String, DataSource> dataSourceMap = new HashMap<>();
                dataSourceMap.put("sharding", masterSlaveDataSource);
// the code below also adds the child datasources managed by shardingJdbc into the dynamic datasource (enable it as needed; not possible when @Lazy turns them into proxies)
                Map<String, DataSource> shardingInnerDataSources = masterSlaveDataSource.getDataSourceMap();
                dataSourceMap.putAll(shardingInnerDataSources);
                return dataSourceMap;
            }
        };
    }

    /**
     * Make the dynamic datasource the primary one.
     * When Spring holds several datasources, the primary is the one auto-injected.
     * Once it is primary, the native shardingjdbc configuration style works as well.
     * Use the style below from 3.4.0 onwards; for older versions read  Advanced - manual multi-datasource injection
     */
    @Primary
    @Bean
    public DataSource dataSource() { 
        DynamicRoutingDataSource dataSource = new DynamicRoutingDataSource();
        dataSource.setPrimary(properties.getPrimary());
        dataSource.setStrict(properties.getStrict());
        dataSource.setStrategy(properties.getStrategy());
        dataSource.setP6spy(properties.getP6spy());
        dataSource.setSeata(properties.getSeata());
        return dataSource;
    }
}
```
>Multi-datasource configuration for 4.0.0
```java
    @Bean
    public DynamicDataSourceProvider dynamicDataSourceProvider(DefaultDataSourceCreator dataSourceCreator) {
        return new AbstractDataSourceProvider(dataSourceCreator) {

            @Override
            public Map<String, DataSource> loadDataSources() {
                Map<String, DataSource> dataSourceMap = new HashMap<>();
                dataSourceMap.put("sharding", shardingSphereDataSource);
                return dataSourceMap;
            }
        };
    }

    @Primary
    @Bean
    public DataSource dataSource(List<DynamicDataSourceProvider> providers) {
        DynamicRoutingDataSource dataSource = new DynamicRoutingDataSource(providers);
        dataSource.setPrimary(properties.getPrimary());
        dataSource.setStrict(properties.getStrict());
        dataSource.setStrategy(properties.getStrategy());
        dataSource.setSeata(properties.getSeata());
        dataSource.setP6spy(properties.getP6spy());
        dataSource.setSeata(properties.getSeata());
        return dataSource;
    }
```

## Sample project

https://github.com/dynamic-datasource/dynamic-datasource-samples