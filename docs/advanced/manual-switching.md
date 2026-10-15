# 手动切换数据源

在某些情况您可能需要手动切换数据源。

```java
import com.baomidou.dynamic.datasource.toolkit.DynamicDataSourceContextHolder;

@Service
public class UserServiceImpl implements UserService {
  @Autowired
  private JdbcTemplate jdbcTemplate;

  public List selectAll() {
    DynamicDataSourceContextHolder.push("slave");//手动切换
    return  jdbcTemplate.queryForList("select * from user");
  }
 
}
```

## 核心 API

`com.baomidou.dynamic.datasource.toolkit.DynamicDataSourceContextHolder`：

| 方法 | 语义 |
| :--- | :--- |
| `push(String ds)` | 把 key 压入当前线程的**栈**（不是简单替换，支持嵌套） |
| `peek()` | 查看栈顶 key；未切换时为 `null` |
| `poll()` | 弹出栈顶；栈空时自动清理 ThreadLocal |
| `clear()` | 强制清空 ThreadLocal（异常兜底用） |

栈语义使得 `ServiceA >>> ServiceB >>> ServiceC` 的逐级切换后进先出——切到 B 之后调用切到 C 的方法，C 结束后自动回到 B。优先级上，**手动 push 高于方法上的 `@DS`，也高于类上的 `@DS`**；在注解方法内部手动 push 会叠加到栈上，方法返回后自动回退到注解的 key。完整优先级链见 [@DS 语义与优先级](/docs/guide/ds-semantics)。

```java
DynamicDataSourceContextHolder.push("slave");
try {
    // ... 业务 SQL / Mapper 调用
} finally {
    DynamicDataSourceContextHolder.poll();   // 必须执行
}
```

:::danger[push 必须与 poll 配对]
任何异常路径下漏掉 `poll()`，都会把 key 残留在（会被复用的）线程上，造成后续请求**串库**。这是硬性要求，不是建议。
:::

需要注意的是手动切换的数据源，最好自己在合适的位置 调用DynamicDataSourceContextHolder.clear()清空当前线程的数据源信息。 
如果你不太清楚什么时候调用，那么可以参考下面写一个拦截器，注册进spring里即可。
```java
@Slf4j
public class DynamicDatasourceClearInterceptor implements HandlerInterceptor {

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
//入口处清空看个人，有的新人在异步里切了数据源但是忘记清除了，下一个请求遇到这个线程就会带进来。
        //DynamicDataSourceContextHolder.clear(); 
        return true;
    }

    @Override
    public void postHandle(HttpServletRequest request, HttpServletResponse response, Object handler, ModelAndView modelAndView) {
    }

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler, Exception ex) {
        DynamicDataSourceContextHolder.clear();
    }

}
```

## 常见问题

### Q1：为什么连续对同一个 Mapper 操作两次，只有第一次切换生效？

一次切换覆盖的是它**到 poll 为止**的那段代码。如果两次操作写在同一段里、中间没有重新切换，第二次不会「自动」发生。正确做法是每个操作前分别 push/poll（或各自调用不同的注解方法）（[#192](https://github.com/baomidou/dynamic-datasource/issues/192)、[#696](https://github.com/baomidou/dynamic-datasource/issues/696)）。

### Q2：push 了一个不存在的 key 会怎样？

非严格模式静默回落 primary；`strict: true` 时抛 `CannotFindDataSourceException`。建议开发环境开启 `strict`。

### Q3：`peek()` 什么时候为 null？

从未切换过，或已全部 poll/clear 时。可以用它判断「当前是否处于切换态」（[#203](https://github.com/baomidou/dynamic-datasource/issues/203)）。

### Q4：如何获取「当前实际使用」的数据源对象？

```java
@Autowired
private DynamicRoutingDataSource routingDataSource;

String key = DynamicDataSourceContextHolder.peek();        // null 表示 primary
DataSource ds = routingDataSource.getDataSource(key);
```

注意组名返回的是**组**，具体成员还需要由策略挑选。

### Q5：如何判断某个数据源是否存在？

```java
boolean exists = routingDataSource.getDataSources().containsKey("slave_1")
        || routingDataSource.getGroupDataSources().containsKey("slave");
```

（[#36](https://github.com/baomidou/dynamic-datasource/issues/36)）

### Q6：如何获取当前库的数据库类型（用于方言判断）？

先 `peek()` 拿 key，再取 `DataSource`，用连接元数据判断（[#619](https://github.com/baomidou/dynamic-datasource/issues/619)）：

```java
try (Connection conn = routingDataSource.getDataSource(key).getConnection()) {
    String product = conn.getMetaData().getDatabaseProductName();
}
```

### Q7：多租户在 Filter 里 push，之后要做什么？

Filter 的 `finally` 里**必须** `poll()`（或 `clear()`）；同时注意异步链路拿不到这个上下文，见 [@DS 与线程](/docs/faq/threads)。

## 相关文档

- [@DS 语义与优先级](/docs/guide/ds-semantics)
- [@DS 与线程：异步、线程池、并发串库](/docs/faq/threads)
- [动态添加/移除数据源](/docs/advanced/add-remove-datasource)
- [@DS 不生效排查总表](/docs/faq/not-working)
