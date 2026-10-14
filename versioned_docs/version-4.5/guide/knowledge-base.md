# 知识库

## 如何注入多数据源？

```java
public class A{
    @Autowired
    private DataSource dataSource;

    public void dosomething{
         //使用的时候需要强转
        DynamicRoutingDataSource ds = (DynamicRoutingDataSource) dataSource;
    }
}
```

## 如何获取当前线程数据源名称？

```java
DynamicDataSourceContextHolder.peek()
```

## 如何获取当前线程数据源？

```java
public void dosomething{
    DynamicRoutingDataSource ds = (DynamicRoutingDataSource) dataSource;
    DataSource datasource=ds.determineDataSource();
}
```
## DynamicRoutingDataSource 其他常用方法
![](/img/screenshot_1649815541046.png)
