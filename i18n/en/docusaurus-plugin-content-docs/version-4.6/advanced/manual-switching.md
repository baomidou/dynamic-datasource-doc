# Manual Datasource Switching

In some situations you may need to switch the datasource by hand.

```java
import com.baomidou.dynamic.datasource.toolkit.DynamicDataSourceContextHolder;

@Service
public class UserServiceImpl implements UserService {
  @Autowired
  private JdbcTemplate jdbcTemplate;

  public List selectAll() {
    DynamicDataSourceContextHolder.push("slave");// switch manually
    return  jdbcTemplate.queryForList("select * from user");
  }

}
```

## Core API

`com.baomidou.dynamic.datasource.toolkit.DynamicDataSourceContextHolder`:

| Method | Meaning |
| :--- | :--- |
| `push(String ds)` | pushes the key onto the current thread's **stack** (not a plain replace, nesting is supported) |
| `peek()` | looks at the top of the stack; `null` when no switch is active |
| `poll()` | pops the top of the stack; clears the ThreadLocal once the stack is empty |
| `clear()` | force-clears the ThreadLocal (as a safety net for exceptions) |

The stack is what makes step-by-step switching such as `ServiceA >>> ServiceB >>> ServiceC` last-in-first-out — after switching to B, a call that switches to C returns to B automatically once C finishes. In terms of priority, **a manual push beats both the method-level `@DS` and the class-level `@DS`**; pushing inside an annotated method adds another entry on the stack, which rolls back to the annotation's key when the method returns. The complete priority chain is described in [@DS semantics and precedence](../guide/ds-semantics).

```java
DynamicDataSourceContextHolder.push("slave");
try {
    // ... business SQL / mapper calls
} finally {
    DynamicDataSourceContextHolder.poll();   // mandatory
}
```

:::danger[push must always be paired with poll]
Missing `poll()` on any exception path leaves the key behind on a thread that will be reused, causing later requests to hit **the wrong database**. This is a hard requirement, not a suggestion.
:::

Note that with manual switching you should also call `DynamicDataSourceContextHolder.clear()` yourself at a suitable point to wipe the current thread's datasource information. If you are unsure when to do it, write an interceptor like the one below and register it with Spring.

```java
@Slf4j
public class DynamicDatasourceClearInterceptor implements HandlerInterceptor {

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
// clearing at the entry point is a matter of taste; some newcomers switch the datasource inside an async task and forget to clear it, so the next request reusing that thread inherits it.
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

## FAQ

### Q1: Why does only the first switch take effect when I call the same mapper twice in a row?

One switch covers the code **up to its poll**. If both operations are written inside the same block with no new switch in between, the second one does not happen "automatically". The correct approach is to push/poll around each operation separately (or call separate annotated methods) ([#192](https://github.com/baomidou/dynamic-datasource/issues/192), [#696](https://github.com/baomidou/dynamic-datasource/issues/696)).

### Q2: What happens if I push a key that does not exist?

In non-strict mode it silently falls back to the primary; with `strict: true` a `CannotFindDataSourceException` is thrown. Enabling `strict` in development is recommended.

### Q3: When is `peek()` null?

When no switch has ever happened, or after everything has been polled/cleared. You can use it to tell "is a switch currently active" ([#203](https://github.com/baomidou/dynamic-datasource/issues/203)).

### Q4: How do I get the datasource object actually in use?

```java
@Autowired
private DynamicRoutingDataSource routingDataSource;

String key = DynamicDataSourceContextHolder.peek();        // null means primary
DataSource ds = routingDataSource.getDataSource(key);
```

Note that a group name returns the **group**; the concrete member is still picked by the strategy.

### Q5: How do I check whether a datasource exists?

```java
boolean exists = routingDataSource.getDataSources().containsKey("slave_1")
        || routingDataSource.getGroupDataSources().containsKey("slave");
```

([#36](https://github.com/baomidou/dynamic-datasource/issues/36))

### Q6: How do I get the database type of the current database (for dialect decisions)?

Take the key with `peek()`, then the `DataSource`, and judge from the connection metadata ([#619](https://github.com/baomidou/dynamic-datasource/issues/619)):

```java
try (Connection conn = routingDataSource.getDataSource(key).getConnection()) {
    String product = conn.getMetaData().getDatabaseProductName();
}
```

### Q7: In a multi-tenant filter I push the tenant — what else do I need to do?

The filter's `finally` block **must** call `poll()` (or `clear()`); also remember that async call chains do not inherit this context, see [@DS and threads](../faq/threads).

## Further reading

- [@DS semantics and precedence](../guide/ds-semantics)
- [@DS and threads: async, thread pools, cross-database contamination](../faq/threads)
- [Adding/removing datasources at runtime](./add-remove-datasource)
- [@DS not working checklist](../faq/not-working)
