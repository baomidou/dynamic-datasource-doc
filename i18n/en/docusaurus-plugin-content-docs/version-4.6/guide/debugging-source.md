---
title: "Debugging the Source"
description: "Check whether the log output is what you expect."
---

# Debugging the Source

1. Turn on debug logging for the dynamic datasource.

```shell
logging:
  level:
    com.baomidou.dynamic: debug
```
Check whether the log output is what you expect.

2. Put a breakpoint inside `DynamicDataSourceAnnotationInterceptor`.

```java {17}
public class DynamicDataSourceAnnotationInterceptor implements MethodInterceptor {

    private static final String DYNAMIC_PREFIX = "#";

    private final DataSourceClassResolver dataSourceClassResolver;
    private final DsProcessor dsProcessor;

    public DynamicDataSourceAnnotationInterceptor(Boolean allowedPublicOnly, DsProcessor dsProcessor) {
        dataSourceClassResolver = new DataSourceClassResolver(allowedPublicOnly);
        this.dsProcessor = dsProcessor;
    }

    @Override
    public Object invoke(MethodInvocation invocation) throws Throwable {
        try {
            // the resolved datasource identifier, e.g. master, is stored in the local thread here
            String dsKey = determineDatasourceKey(invocation);
            DynamicDataSourceContextHolder.push(dsKey);
            return invocation.proceed();
        } finally {
            DynamicDataSourceContextHolder.poll();
        }
    }

    private String determineDatasourceKey(MethodInvocation invocation) {
        String key = dataSourceClassResolver.findDSKey(invocation.getMethod(), invocation.getThis());
        return (!key.isEmpty() && key.startsWith(DYNAMIC_PREFIX)) ? dsProcessor.determineDatasource(invocation, key) : key;
    }
}
```

3. Put a breakpoint inside `DynamicRoutingDataSource`.

```java {10}
public class DynamicRoutingDataSource extends AbstractRoutingDataSource {

    private Map<String, DataSource> dataSourceMap = new LinkedHashMap<>();

    private Map<String, DynamicGroupDataSource> groupDataSources = new ConcurrentHashMap<>();

    @Override
    public DataSource determineDataSource() {
        // read the key from the local thread and resolve the real datasource
        String dsKey = DynamicDataSourceContextHolder.peek();
        return getDataSource(dsKey);
    }

    private DataSource determinePrimaryDataSource() {
        log.debug("returning data from the default datasource");
        return groupDataSources.containsKey(primary) ? groupDataSources.get(primary).determineDataSource() : dataSourceMap.get(primary);
    }

    public DataSource getDataSource(String ds) {
        if (StringUtils.isEmpty(ds)) {
            return determinePrimaryDataSource();
        } else if (!groupDataSources.isEmpty() && groupDataSources.containsKey(ds)) {
            log.debug("returning a datasource from the {} group datasource", ds);
            return groupDataSources.get(ds).determineDataSource();
        } else if (dataSourceMap.containsKey(ds)) {
            log.debug("returning a datasource from the {} single datasource", ds);
            return dataSourceMap.get(ds);
        }
        return determinePrimaryDataSource();
    }
}
```