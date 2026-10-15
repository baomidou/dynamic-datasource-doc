# Manual Multi-Datasource Injection

When do you need to inject the multiple datasources by hand?

Mostly because your system has to coexist with other datasources. Quartz and ShardingJDBC, for instance, both need a datasource of their own.
*****

Injection differs between dynamic-datasource 3.4.0+ and older versions; inject according to your version.

Make sure the multi-datasource bean carries **@Primary** so that it becomes the primary datasource.

```java
// below 3.4.0
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

// 3.4.0 and above
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

// 4.x and above
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

The main change is that 3.4.0 started supporting several providers at the same time, so injection moved inside the framework. See the source change at https://github.com/baomidou/dynamic-datasource-spring-boot-starter/commit/6e8d2954499f83269302d23b58f8832c31e07ef7
