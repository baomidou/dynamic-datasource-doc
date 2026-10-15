---
title: "AOP 切面切换数据源"
description: "从 3.4.0 开始支持自定义切面。"
---

# AOP 切面切换数据源

从 3.4.0 开始支持自定义切面。

1. 使用这个方式，原注解方式并不会失效。 原 DS 注解也是 AOP。
2. 注意：不要在同一个切面同时使用注解又使用自定义切面。

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

以上实现 com.baomidou.samples.pattern 包 service 下所有类的 add 和 update,delete 开头的方法使用 master 数据源，select 使用 slave 数据源。

更复杂的切点表达式语法需自行学习。

示例项目 https://github.com/dynamic-datasource/dynamic-datasource-samples/tree/master/spring-boot-4/name-pattern-sample