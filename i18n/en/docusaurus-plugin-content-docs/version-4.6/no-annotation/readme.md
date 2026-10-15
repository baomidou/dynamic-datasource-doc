---
title: "Read This First: The No-Annotation Approach"
description: "Whether for the sake of keeping annotations out of your code or simply for cleanliness, there are always cases where you do not want to use annotations."
---

# Read This First: The No-Annotation Approach

Whether for the sake of keeping annotations out of your code or simply for cleanliness, there are always cases where you do not want to use annotations.

But you need to understand the core of this multi-datasource implementation first:

```java
public class DynamicRoutingDataSource {
    @Override
    public DataSource determineDataSource() {
        // this is the core: the current datasource is taken from a ThreadLocal
        String dsKey = DynamicDataSourceContextHolder.peek();
        return getDataSource(dsKey);
    }
}
```

So you can pick a suitable moment to call `DynamicDataSourceContextHolder.push("the datasource you want")`, according to your needs.

The default `@DS` annotation switches datasources by exploiting Spring AOP: it sets the datasource key before the method starts and removes it once the method finishes.