# Knowledge Base

## How do I inject the multiple datasources?

```java
public class A{
    @Autowired
    private DataSource dataSource;

    public void dosomething{
         // a cast is needed at the point of use
        DynamicRoutingDataSource ds = (DynamicRoutingDataSource) dataSource;
    }
}
```

## How do I get the current thread's datasource name?

```java
DynamicDataSourceContextHolder.peek()
```

## How do I get the current thread's datasource?

```java
public void dosomething{
    DynamicRoutingDataSource ds = (DynamicRoutingDataSource) dataSource;
    DataSource datasource=ds.determineDataSource();
}
```
## Other commonly used methods of DynamicRoutingDataSource
![](/img/screenshot_1649815541046.png)
