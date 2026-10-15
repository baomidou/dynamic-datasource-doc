---
title: "无注解方案必读"
description: "无论是出于注解侵入性还是代码整洁的考虑，都有不想使用注解的场景。"
---

# 无注解方案必读

无论是出于注解侵入性还是代码整洁的考虑，都有不想使用注解的场景。

但首先需要理解本多数据源实现的核心：

```java
public class DynamicRoutingDataSource {
    @Override
    public DataSource determineDataSource() {
        // 这里是核心，是从 ThreadLocal 中获取当前数据源
        String dsKey = DynamicDataSourceContextHolder.peek();
        return getDataSource(dsKey);
    }
}
```

因此就可以根据需求，在合适的时机调用 `DynamicDataSourceContextHolder.push("对应数据源")`。

默认的 `@DS` 注解切换数据源基于 Spring AOP：在方法执行前压入数据源 KEY，方法执行完成后移除对应 KEY。