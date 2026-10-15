---
title: "本地多数据源事务"
description: "多数据源事务一直是个难题，传统方案只有两条路："
---

# 本地多数据源事务

## 背景

多数据源事务一直是个难题，传统方案只有两条路：

1. **Atomikos 手工构建 XA 数据源**：适合数据源少、性能要求不高的项目。痛点是配置量大。
2. **Seata 这类分布式事务方案**：能力完整，痛点是必须部署和维护 seata-server。

这两条路对「场景简单、又不想引入第三方中间件」的项目都偏重，所以本框架提供了第三条路。

## 基础介绍

从 **3.3.0** 开始，由 Seata 的核心贡献者贡献了一套基于 **Connection 代理** 的本地多数据源事务方案。建议从 **3.4.0** 及以上版本使用——更早的版本存在「只加 `@DSTransactional` 不加 `@DS` 会报错」的问题。

它的定位是：**单体应用内、跨多个库、不引入任何外部中间件**。

## 使用方法

在最外层方法上标注 `@DSTransactional`，内部各层照常用 `@DS` 切换数据源即可。

```java
// AService 调用 BService 和 CService，A、B、C 分别对应不同的数据源
public class AService {

    @DS("a")   // 如果 a 就是默认数据源，这个注解可以省略
    @DSTransactional
    public void doSomething() {
        bService.doSomething();
        cService.doSomething();
    }
}

public class BService {

    @DS("b")
    public void doSomething() {
        // ...
    }
}

public class CService {

    @DS("c")
    public void doSomething() {
        // ...
    }
}
```

只要 `@DSTransactional` 覆盖的调用链上任一环节抛出（需要回滚的）异常，**所有已开启的库事务整体回滚**。

内层方法上再标注 `@DSTransactional` 是允许的，它不会开启新事务，而是并入同一个 XID——这一点和 Spring 的 `REQUIRED` 语义一致。

## 完整属性

```java
@Target({ElementType.TYPE, ElementType.METHOD})
public @interface DSTransactional {

    /** 需要回滚的异常，默认 {Exception.class} */
    Class<? extends Throwable>[] rollbackFor() default {Exception.class};

    /** 不需要回滚的异常 */
    Class<? extends Throwable>[] noRollbackFor() default {};

    /** 事务传播行为，默认 REQUIRED */
    DsPropagation propagation() default DsPropagation.REQUIRED;
}
```

:::warning[回滚规则与 Spring 不同]
`rollbackFor` 默认是 `{Exception.class}`，所以**默认情况下所有异常（含受检异常）都会触发回滚**。

而 Spring 的 `@Transactional` 默认只回滚 `RuntimeException` 与 `Error`。从 Spring 迁过来的代码不要想当然，需要排除某些异常时请显式配置 `noRollbackFor`。
:::

`DsPropagation` 提供与 Spring 对齐的 7 种传播行为：

| 传播行为 | 含义 |
| :--- | :--- |
| `REQUIRED`（默认） | 有事务就加入，没有就新建 |
| `REQUIRES_NEW` | 总是新建，若存在当前事务则挂起 |
| `NOT_SUPPORTED` | 以非事务方式执行，若存在当前事务则挂起 |
| `SUPPORTS` | 有事务就加入，没有就以非事务方式执行 |
| `NEVER` | 以非事务方式执行，若存在当前事务则抛异常 |
| `MANDATORY` | 必须已存在事务，否则抛异常 |
| `NESTED` | 存在当前事务时在嵌套事务内执行（基于 Savepoint），否则新建 |

## 事务事件监听

长事务结束后才需要执行的动作（发消息、清缓存、推通知），不要写在事务里。用 `@DsTxEventListener` 把它挂到事务的对应阶段：

```java
@Component
public class OrderTxListener {

    @DsTxEventListener
    public void onCommitted(OrderCreatedEvent event) {
        // 默认 phase = AFTER_COMMIT，只有真正提交后才执行
        messageProducer.send(event);
    }

    @DsTxEventListener(phase = TransactionPhase.AFTER_ROLLBACK)
    public void onRolledBack(OrderCreatedEvent event) {
        log.warn("下单失败，已回滚: {}", event.getOrderId());
    }
}
```

`@DsTxEventListener` 是 Spring `@EventListener` 的别名，因此同样支持 `classes` 按类型过滤与 `condition` SpEL 条件：

| 属性 | 默认值 | 说明 |
| :--- | :--- | :--- |
| `phase` | `AFTER_COMMIT` | 触发阶段，取值同 Spring `TransactionPhase` |
| `value` / `classes` | `{}` | 监听的事件类型 |
| `condition` | `""` | SpEL 条件表达式 |

## 注意事项

1. **不要与 Spring 原生事务混用。** 可以分别使用，但**千万不能混用**——混用后事务边界不再对应代码结构，排查成本极高。详见[事务常见问题](/docs/tx/faq)。
2. **只适合单体多数据源场景。** 涉及异步、线程池、微服务时请改用 [Seata](/docs/tx/seata)。
3. **不支持只读事务与隔离级别配置。** 只有传播行为可配置。
4. **提交阶段不是原子的。** 实现上是「循环提交、出错循环回滚」，前提假设是数据库本身不异常。如果某个库在 commit 阶段宕机，先前已提交的库无法回滚——这类场景请使用 Seata 或 XA。
5. **`TransactionContext` 不要和 Seata 的 `RootContext` 搞混。** 本地事务用 `com.baomidou.dynamic.datasource.tx.TransactionContext.getXID()` 拿 XID；Seata 场景才是 `io.seata.core.context.RootContext.getXID()`。

## 示例项目

[https://github.com/dynamic-datasource/dynamic-datasource-samples/tree/master/spring-boot-4/tx-local-sample](https://github.com/dynamic-datasource/dynamic-datasource-samples/tree/master/spring-boot-4/tx-local-sample)

数据库脚本已备好，可直接运行，接口文档在 `http://localhost:8080/doc.html`。

工程里 A、B、C 分别是 `OrderService`、`ProductService`、`AccountService`，对应三个独立数据库。下单流程会先扣商品库存、再扣用户余额，任一环节抛 `RuntimeException` 都会触发整体回滚。

```java
@Slf4j
@Service
@AllArgsConstructor
public class OrderService {

    private final OrderMapper orderMapper;
    private final AccountService accountService;
    private final ProductService productService;

    // 这里不需要 @DS("order")：order 就是默认库；如果开启事务的库不是默认库，则必须加
    @DSTransactional   // 在最外层开启事务
    public void placeOrder(PlaceOrderRequest request) {
        log.info("当前 XID: {}", TransactionContext.getXID());

        Order order = Order.builder()
                .userId(request.getUserId())
                .productId(request.getProductId())
                .status(OrderStatus.INIT)
                .amount(request.getAmount())
                .build();
        orderMapper.insert(order);

        // 扣减库存并计算总价（ProductService 上标了 @DS("product")）
        Double totalPrice = productService.reduceStock(request.getProductId(), request.getAmount());
        // 扣减余额（AccountService 上标了 @DS("account")）
        accountService.reduceBalance(request.getUserId(), totalPrice);

        order.setStatus(OrderStatus.SUCCESS);
        order.setTotalPrice(totalPrice);
        orderMapper.updateById(order);
    }
}
```

```java
@Slf4j
@Service
@RequiredArgsConstructor
public class ProductService {

    private final ProductMapper productMapper;

    @DS("product")
    public Double reduceStock(Long productId, Integer amount) {
        Product product = productMapper.selectById(productId);
        Assert.notNull(product, "商品不存在");

        Integer stock = product.getStock();
        if (stock < amount) {
            throw new RuntimeException("库存不足");   // 触发整体回滚
        }
        product.setStock(stock - amount);
        productMapper.updateById(product);
        return product.getPrice() * amount;
    }
}
```

## 原理介绍

核心思路是**代理 `Connection`**：每个被事务覆盖的数据源在首次使用时，框架从连接池取出真实连接并包一层 `ConnectionProxy`，按 XID 放进 `ConnectionFactory` 统一持有。业务方法正常返回则整体提交，抛异常则整体回滚。

涉及的组件：

| 组件 | 职责 |
| :--- | :--- |
| `TransactionalTemplate` | 传播行为、挂起/恢复、Savepoint 编排 |
| `TransactionContext` | XID 与事务同步器（Synchronization）的持有 |
| `ConnectionFactory` | 按 XID 管理各库的 `ConnectionProxy`，负责最终 commit / rollback |
| `LocalTxUtil` | 编程式入口：`startTransaction` / `commit` / `rollback` |

## 相关阅读

- [事务选型指南](/docs/tx) —— 什么时候该用它，什么时候不该
- [事务常见问题](/docs/tx/faq) —— 混用陷阱与不回滚的排查