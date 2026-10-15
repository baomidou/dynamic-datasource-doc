---
title: "Seata Transactions"
description: "Once Seata is enabled inside dynamic-datasource-spring-boot-starter, the component wraps the DataSource with a DataSourceProxy automatically, so keep compatibility as follows."
---

# Seata Transactions

## Overview

- Seata on GitHub [https://github.com/seata/seata](https://github.com/seata/seata)
- Seata documentation [https://seata.io/zh-cn/docs/overview/what-is-seata.html](https://seata.io/zh-cn/docs/overview/what-is-seata.html)
- Seata samples [https://github.com/seata/seata-samples](https://github.com/seata/seata-samples)
- latest Seata version
[![](https://img.shields.io/maven-central/v/io.seata/seata-all.svg)](http://mvnrepository.com/artifact/io.seata/seata-all).

> PS: scenarios that need distributed transactions are mostly a product of microservice adoption. Bringing "multiple datasources + distributed transactions" into a monolith is not recommended — split it up as soon as you can. It is only suitable as a transitional solution.

## Notes

Once Seata is enabled inside `dynamic-datasource-spring-boot-starter`, the component wraps the `DataSource` with a `DataSourceProxy` automatically, so keep compatibility as follows.

1. If you use `seata-all`, do not use the `@EnableAutoDataSourceProxy` annotation.

2. If you use `seata-spring-boot-starter`, disable automatic proxying.

```yaml
seata:
  enable-auto-data-source-proxy: false
```

## Sample project

https://github.com/dynamic-datasource/dynamic-datasource-samples/tree/master/spring-boot-4/tx-seata-sample

This project combines multiple datasources + druid + seata + mybatisPlus.

It simulates a user placing an order: deduct the product stock and deduct the user's balance, roughly split into an order service + a product service + an account service.

### Environment setup

Everything is deployed with Docker for a quick demo; for production, follow the official Seata documentation.

1. Prepare `seata-server`.

```shell
docker run --name seata-server -p 8091:8091 -d seataio/seata-server
```

2. Prepare a MySQL database with the account `root` and the password `123456`.

```shell
docker run --name mysql -p 3306:3306 -e MYSQL_ROOT_PASSWORD=123456 -d mysql:5.7
```

3. Create the databases.

Create the three databases `seata_order`, `seata_product` and `seata_account` to simulate connecting to different databases.

```sql
CREATE DATABASE IF NOT EXISTS seata_order;
CREATE DATABASE IF NOT EXISTS seata_product;
CREATE DATABASE IF NOT EXISTS seata_account;
```

4. Prepare the database scripts.

Under each database, create the relevant tables; Seata needs `undo_log` to track and roll back.

You do not need to prepare these scripts yourself: this project already ships them under `resources/db`, and thanks to the multi-datasource automatic script execution they run automatically once the application starts.

### Project setup

1. Add the dependencies: seata + druid + mybatisPlus + dynamic-datasource + mysql + lombok.

```xml
<dependency>
    <groupId>io.seata</groupId>
    <artifactId>seata-spring-boot-starter</artifactId>
    <version>${seata.version}</version>
</dependency>
<dependency>
    <groupId>com.baomidou</groupId>
    <artifactId>dynamic-datasource-spring-boot-starter</artifactId>
    <version>${dynamic-datasource.version}</version>
</dependency>
<!-- omitted; see the sample project for the complete dependency list -->
```

::::warning[Seata version differences]
Seata 2.x changed the package structure and the configuration items significantly, and the official documentation has moved to [seata.apache.org](https://seata.apache.org/). The sample project always follows the latest version; the configuration snippets on this page mostly use the 1.x style, so check the official migration notes before upgrading.
::::

2. Write the yaml configuration.

```yaml
spring:
  application:
    name: dynamic
  datasource:
    dynamic:
      primary: order
      strict: true
      seata: true    # enable the seata proxy; every datasource is proxied by default, and any single one can opt out
      seata-mode: AT # XA and AT are supported, AT is the default
      datasource:
        order:
          username: root
          password: 123456
          url: jdbc:mysql://host:3306/seata_order?useUnicode=true&characterEncoding=utf8&allowMultiQueries=true&useSSL=false
          driver-class-name: com.mysql.cj.jdbc.Driver
          init:
            schema: classpath:db/schema-order.sql
        account:
          username: root
          password: 123456
          url: jdbc:mysql://host:3306/seata_account?useUnicode=true&characterEncoding=utf8&allowMultiQueries=true&useSSL=false
          driver-class-name: com.mysql.cj.jdbc.Driver
          init:
            schema: classpath:db/schema-account.sql
        product:
          username: root
          password: 123456
          url: jdbc:mysql://host:3306/seata_product?useUnicode=true&characterEncoding=utf8&allowMultiQueries=true&useSSL=false
          driver-class-name: com.mysql.cj.jdbc.Driver
          init:
            schema: classpath:db/schema-product.sql
        test:
          username: sa
          password: ""
          url: jdbc:h2:mem:test
          driver-class-name: org.h2.Driver
          seata: false # this datasource does not need seata
seata:
  enabled: true
  application-id: applicationName
  tx-service-group: my_test_tx_group
  enable-auto-data-source-proxy: false   # must be false
  service:
    vgroup-mapping:
      my_test_tx_group: default  # the key must match the value of tx-service-group above
    grouplist:
      default: host:8091 # the seata-server address is only needed with the file registry
  config:
    type: file
  registry:
    type: file
```

### Writing the code

Refer to the code below for the controller, service, mapper, entity, dto and so on.

Order service

```java
@Slf4j
@Service
public class OrderServiceImpl implements OrderService {

  @Resource
  private OrderDao orderDao;
  @Autowired
  private AccountService accountService;
  @Autowired
  private ProductService productService;
  
  @DS("order")// every layer needs the multi-datasource annotation to select its database
  @Override
  @GlobalTransactional // important: the first method that opens the transaction must carry seata's global transaction annotation
  public void placeOrder(PlaceOrderRequest request) {
    log.info("=============ORDER START=================");
    Long userId = request.getUserId();
    Long productId = request.getProductId();
    Integer amount = request.getAmount();
    log.info("received an order request, user:{}, product:{}, amount:{}", userId, productId, amount);

    log.info("current XID: {}", RootContext.getXID());

    Order order = Order.builder()
        .userId(userId)
        .productId(productId)
        .status(OrderStatus.INIT)
        .amount(amount)
        .build();

    orderDao.insert(order);
    log.info("order created in phase one, waiting for stock deduction and payment");
    // deduct stock and compute the total price
    Double totalPrice = productService.reduceStock(productId, amount);
    // deduct the balance
    accountService.reduceBalance(userId, totalPrice);

    order.setStatus(OrderStatus.SUCCESS);
    order.setTotalPrice(totalPrice);
    orderDao.updateById(order);
    log.info("order placed successfully");
    log.info("=============ORDER END=================");
  }
}
```

Product service

```java
@Slf4j
@Service
public class ProductServiceImpl implements ProductService {

  @Resource
  private ProductDao productDao;

  @DS("product")
  @Override
  public Double reduceStock(Long productId, Integer amount) {
    log.info("=============PRODUCT START=================");
    log.info("current XID: {}", RootContext.getXID());

    // check the stock
    Product product = productDao.selectById(productId);
    Integer stock = product.getStock();
    log.info("stock of product {} is {}, the ordered amount is {}", productId, stock, amount);

    if (stock < amount) {
      log.warn("product {} is out of stock, current stock:{}", productId, stock);
      throw new RuntimeException("out of stock");
    }
    log.info("deducting stock of product {}, unit price is {}", productId, product.getPrice());
    // deduct the stock
    int currentStock = stock - amount;
    product.setStock(currentStock);
    productDao.updateById(product);
    double totalPrice = product.getPrice() * amount;
    log.info("stock of product {} deducted, remaining stock is {}, total price of {} items is {} ", productId, currentStock, amount, totalPrice);
    log.info("=============PRODUCT END=================");
    return totalPrice;
  }
}
```

Account service

```java
@Slf4j
@Service
public class AccountServiceImpl implements AccountService {

  @Resource
  private AccountDao accountDao;

  @DS("account")
  @Override
  public void reduceBalance(Long userId, Double price) {
    log.info("=============ACCOUNT START=================");
    log.info("current XID: {}", RootContext.getXID());

    Account account = accountDao.selectById(userId);
    Double balance = account.getBalance();
    log.info("balance of user {} is {}, total price of the products is {}", userId, balance, price);

    if (balance < price) {
      log.warn("user {} has insufficient balance, current balance:{}", userId, balance);
      throw new RuntimeException("insufficient balance");
    }
    log.info("deducting the balance of user {}", userId);
    double currentBalance = account.getBalance() - price;
    account.setBalance(currentBalance);
    accountDao.updateById(account);
    log.info("balance of user {} deducted, remaining balance is {}", userId, currentBalance);
    log.info("=============ACCOUNT END=================");
  }

}
```

### Testing

The automatically executed schema scripts set the product price to 10, the total product quantity to 20 and the user balance to 50 by default.

After starting the project, run the following from the command line.

1. Simulate a normal order: buy one product.

```shell
curl -X POST \
  http://localhost:8080/order/placeOrder \
  -H 'Content-Type: application/json' \
  -d '{
    "userId": 1,
    "productId": 1,
    "amount": 1
}'
```

2. Simulate insufficient stock: the transaction rolls back.

```shell
curl -X POST \
  http://localhost:8080/order/placeOrder \
  -H 'Content-Type: application/json' \
  -d '{
    "userId": 1,
    "productId": 1,
    "amount": 22
}'
```

3. Simulate an insufficient user balance: the transaction rolls back.

```shell
curl -X POST \
  http://localhost:8080/order/placeOrder \
  -H 'Content-Type: application/json' \
  -d '{
    "userId": 1,
    "productId": 1,
    "amount": 6
}'
```

Watch the runtime log — at this point the full distributed transaction integration walkthrough is complete.