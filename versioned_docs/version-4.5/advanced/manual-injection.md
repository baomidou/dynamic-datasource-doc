# 手动注入多数据源

什么时候需要手动注入多数据源？

绝大部分是因为您的系统需要和其他数据源共同存在使用。如Quartz和ShardingJdbc等都需要使用独立的数据源。
*****

dynamic-datasource 3.4.0及以上版本和老版本注入方式有一定差别，根据自己版本注入。

注意一定要让多数据源使用 **@Primary** ,让其成为主数据源。

```java
//3.4.0版本以下
@Primary
@Bean
public DataSource dataSource(DynamicDataSourceProvider dynamicDataSourceProvider) { 
    DynamicRoutingDataSource dataSource = new DynamicRoutingDataSource();
    dataSource.setPrimary(properties.getPrimary());
    dataSource.setStrict(properties.getStrict());
    dataSource.setStrategy(properties.getStrategy());
    dataSource.setProvider(dynamicDataSourceProvider);
    dataSource.setP6spy(properties.getP6spy());
    dataSource.setSeata(properties.getSeata());
    return dataSource;
}

//3.4.0版本及以上
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

//4.x版本及以上
@Primary
@Bean
public DataSource dataSource(List<DynamicDataSourceProvider> providers) {
    DynamicRoutingDataSource dataSource = new DynamicRoutingDataSource(providers);
    dataSource.setPrimary(properties.getPrimary());
    dataSource.setStrict(properties.getStrict());
    dataSource.setStrategy(properties.getStrategy());
    dataSource.setP6spy(properties.getP6spy());
    dataSource.setSeata(properties.getSeata());
    return dataSource;
}

```
主要变更是因为3.4.0支持了多个provider同时生效，采取了内部注入。 源码改动参考  https://github.com/baomidou/dynamic-datasource-spring-boot-starter/commit/6e8d2954499f83269302d23b58f8832c31e07ef7
