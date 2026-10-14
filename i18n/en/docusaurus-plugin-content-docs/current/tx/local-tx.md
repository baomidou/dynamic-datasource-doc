# Local Transactions

## Background

Multi-datasource transactions have always been a hard problem. The usual solutions are:

1. Build a multi-datasource transaction manually with Atomikos — suitable for projects with few datasources, light configuration and modest performance requirements. The hard part is the amount of manual configuration.
2. Use a distributed transaction solution such as Seata — the hard part is running and maintaining a central coordinator such as seata-server.

Every solution has its scenarios. The questions the author keeps receiving are:

1. Why does switching datasources fail after I add a transaction annotation?
2. I understand this involves distributed transactions, but I do not want Seata. My scenario is simple — is there a solution without third-party dependencies?

## Introduction

Since 3.3.0, a connection-proxy-based solution was contributed by a Seata core contributor (https://github.com/a364176773).
It is recommended to start from 3.4.0, which fixed an issue where older versions errored when `@DSTransactional` was used without `@DS`.

## Attributes

```java
@Target({ElementType.TYPE, ElementType.METHOD})
public @interface DSTransactional {

    /** Exceptions that trigger a rollback. Defaults to {Exception.class}. */
    Class<? extends Throwable>[] rollbackFor() default {Exception.class};

    /** Exceptions that must NOT trigger a rollback. */
    Class<? extends Throwable>[] noRollbackFor() default {};

    /** Propagation behaviour, REQUIRED by default. */
    DsPropagation propagation() default DsPropagation.REQUIRED;
}
```

:::warning[Rollback rules differ from Spring]
`rollbackFor` defaults to `{Exception.class}`, so **all exceptions — checked ones included — trigger a rollback**.

Spring's `@Transactional` only rolls back on `RuntimeException` and `Error` by default. Do not assume the two behave the same; use `noRollbackFor` to opt out explicitly.
:::

`DsPropagation` mirrors Spring's seven levels: `REQUIRED` (default), `REQUIRES_NEW`, `NOT_SUPPORTED`, `SUPPORTS`, `NEVER`, `MANDATORY` and `NESTED` (savepoint-based when a transaction is already active).

## Transaction event listeners

Work that must only happen after the transaction settles (sending a message, evicting a cache) does not belong inside the transaction. Attach it with `@DsTxEventListener`:

```java
@Component
public class OrderTxListener {

    @DsTxEventListener   // phase defaults to AFTER_COMMIT
    public void onCommitted(OrderCreatedEvent event) {
        messageProducer.send(event);
    }

    @DsTxEventListener(phase = TransactionPhase.AFTER_ROLLBACK)
    public void onRolledBack(OrderCreatedEvent event) {
        log.warn("Order failed and rolled back: {}", event.getOrderId());
    }
}
```

It is an alias of Spring's `@EventListener`, so `classes` and `condition` (SpEL) are supported as well.

## Notes

The implementation commits in a loop and rolls back in a loop. It assumes the databases themselves do not fail. If a database crashes during the commit phase, datasources that already committed cannot be rolled back — this is **not** a strict two-phase commit. Use Seata when you need a complete distributed transaction.

1. Spring's native transaction is **not** supported — they can be used separately, but **never mixed**.
2. Only suitable for local multi-datasource scenarios inside a single application. For async and microservice cases, use Seata.
3. Read-only transactions and isolation levels are **not** configurable; only propagation is.
4. The annotation has also been supported on classes since 4.1.4.
5. Do not confuse `com.baomidou.dynamic.datasource.tx.TransactionContext.getXID()` (local transactions) with Seata's `io.seata.core.context.RootContext.getXID()`.

## Usage

Annotate the outermost method with `@DSTransactional`; everything it calls keeps switching datasources with `@DS` as usual.

```java
//AService calls BService and CService; A, B and C are different datasources.

public class AService {
    
    @DS("a")//not needed if a is the default datasource
    @DSTransactional
    public void dosomething(){
        BService.dosomething();
        CService.dosomething();
    }
}

public class BService {
    
    @DS("b")
    public void dosomething(){
        //dosomething
    }
}

public class CService {
    
    @DS("c")
    public void dosomething(){
        //dosomething
    }
}
```

If any step under `@DSTransactional` throws, the whole multi-datasource transaction rolls back.
Does it matter if B and C are also annotated with `@DSTransactional`? No.

## Sample project

https://github.com/dynamic-datasource/dynamic-datasource-samples/tree/master/spring-boot-4/tx-local-sample

A complete sample project with prepared databases; run the tests directly. `http://localhost:8080/doc.html`

A, B and C correspond to OrderService, ProductService and AccountService, each backed by its own database.

Placing an order deducts stock from the product database and balance from the account database.
Insufficient stock or balance throws a RuntimeException and triggers a global rollback.

```java
@Slf4j
@Service
@AllArgsConstructor
public class OrderService {

    private final OrderMapper orderMapper;
    private final AccountService accountService;
    private final ProductService productService;
    
    //@DS("order") not needed here because order is the default database; required if the transaction starts elsewhere
    @DSTransactional //the transaction is started here
    public void placeOrder(PlaceOrderRequest request) {
        log.info("=============ORDER START=================");
        Long userId = request.getUserId();
        Long productId = request.getProductId();
        Integer amount = request.getAmount();
        log.info("Received order request, user:{}, product:{}, amount:{}", userId, productId, amount);

        log.info("Current XID: {}", TransactionContext.getXID());

        Order order = Order.builder()
                .userId(userId)
                .productId(productId)
                .status(OrderStatus.INIT)
                .amount(amount)
                .build();

        orderMapper.insert(order);
        log.info("Order created, waiting for stock deduction and payment");
        // deduct stock and compute the total price
        Double totalPrice = productService.reduceStock(productId, amount);
        // deduct balance
        accountService.reduceBalance(userId, totalPrice);

        order.setStatus(OrderStatus.SUCCESS);
        order.setTotalPrice(totalPrice);
        orderMapper.updateById(order);
        log.info("Order placed successfully");
        log.info("=============ORDER END=================");
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
        log.info("=============PRODUCT START=================");
        log.info("Current XID: {}", TransactionContext.getXID());

        // check stock
        Product product = productMapper.selectById(productId);
        Assert.notNull(product, "product not found");
        Integer stock = product.getStock();
        log.info("Product {} has stock {}, requested {}", productId, stock, amount);

        if (stock < amount) {
            log.warn("Product {} stock insufficient, current stock:{}", productId, stock);
            throw new RuntimeException("stock insufficient");
        }
        log.info("Deducting stock of product {}, unit price {}", productId, product.getPrice());
        // deduct stock
        int currentStock = stock - amount;
        product.setStock(currentStock);
        productMapper.updateById(product);
        double totalPrice = product.getPrice() * amount;
        log.info("Stock of product {} deducted to {}, total price of {} items is {} ", productId, currentStock, amount, totalPrice);
        log.info("=============PRODUCT END=================");
        return totalPrice;
    }
}
```

```java
@Slf4j
@Service
@RequiredArgsConstructor
public class AccountService {

    private final AccountMapper accountMapper;

    @DS("account")
    public void reduceBalance(Long userId, Double price) {
        log.info("=============ACCOUNT START=================");
        log.info("Current XID: {}", TransactionContext.getXID());

        Account account = accountMapper.selectById(userId);
        Assert.notNull(account, "user not found");
        Double balance = account.getBalance();
        log.info("User {} balance is {}, order total {}", userId, balance, price);

        if (balance < price) {
            log.warn("User {} balance insufficient, current balance:{}", userId, balance);
            throw new RuntimeException("balance insufficient");
        }
        log.info("Deducting balance of user {}", userId);
        double currentBalance = account.getBalance() - price;
        account.setBalance(currentBalance);
        accountMapper.updateById(account);
        log.info("Balance of user {} deducted to {}", userId, currentBalance);
        log.info("=============ACCOUNT END=================");
    }
}
```

![](/img/screenshot_1624150848767.png)

## How it works

The core idea is proxying connections: one connection per participating database is wrapped in a `ConnectionProxy`, registered into a `ConnectionFactory` under a shared XID, and committed or rolled back together at the outermost boundary.

| Component | Responsibility |
| :--- | :--- |
| `TransactionalTemplate` | Propagation behaviour, suspend/resume, savepoint orchestration |
| `TransactionContext` | Holds the XID and transaction synchronizations |
| `ConnectionFactory` | Owns the per-database `ConnectionProxy` instances and performs the final commit / rollback |
| `LocalTxUtil` | Programmatic entry points: `startTransaction` / `commit` / `rollback` |

Source: [TransactionalTemplate](https://github.com/baomidou/dynamic-datasource/blob/master/dynamic-datasource-spring/src/main/java/com/baomidou/dynamic/datasource/tx/TransactionalTemplate.java)
