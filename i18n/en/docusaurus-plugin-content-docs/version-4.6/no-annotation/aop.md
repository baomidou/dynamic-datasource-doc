# Switching Datasource with an AOP Aspect

Custom aspects are supported since 3.4.0.

1. With this approach the original annotation style still works — the `DS` annotation is also implemented with AOP.
2. Caution: do not use the annotation and a custom aspect on the same join point at the same time.

```java
@Configuration
public class MyConfig {

    @Bean
    public DynamicDatasourceNamedInterceptor dsAdvice(DsProcessor dsProcessor) {
        DynamicDatasourceNamedInterceptor interceptor = new DynamicDatasourceNamedInterceptor(dsProcessor);
        Map<String, String> patternMap = new HashMap<>();
        patternMap.put("select*", "slave");
        patternMap.put("add*", "master");
        patternMap.put("update*", "master");
        patternMap.put("delete*", "master");
        interceptor.addPatternMap(patternMap);
        return interceptor;
    }

    @Bean
    public Advisor dsAdviceAdvisor(DynamicDatasourceNamedInterceptor dsAdvice) {
        AspectJExpressionPointcut pointcut = new AspectJExpressionPointcut();
        pointcut.setExpression("execution (* com.baomidou.samples.pattern..service.*.*(..))");
        return new DefaultPointcutAdvisor(pointcut, dsAdvice);
    }
}
```

The snippet above makes every method of every class under the `com.baomidou.samples.pattern` service package whose name starts with `add`, `update` or `delete` use the `master` datasource, while `select` uses the `slave` datasource.

More complex pointcut expression syntax is something you need to learn on your own.

Sample project: https://github.com/dynamic-datasource/dynamic-datasource-samples/tree/master/spring-boot-4/name-pattern-sample
