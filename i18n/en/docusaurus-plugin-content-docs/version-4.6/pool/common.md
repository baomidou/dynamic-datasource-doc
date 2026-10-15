# Connection Pool Essentials

1. Every datasource has a `type` that selects its connection pool.
2. Each datasource may even use a different pool — not recommended unless you really need it.
3. `type` is **not required**. When it is not set, the framework looks up and uses a pool in the following order.
   Druid > HikariCP > BeeCP > DBCP2 > Spring Basic.

```yaml
spring:
  datasource:
    dynamic:
      primary: db1
      datasource:
        db1:
          url: jdbc:mysql://xx.xx.xx.xx:3306/dynamic
          username: root
          password: 123456
          driver-class-name: com.mysql.jdbc.Driver
          type: com.zaxxer.hikari.HikariDataSource # use HikariCP
        db2:
          url: jdbc:mysql://xx.xx.xx.xx:3307/dynamic
          username: root
          password: 123456
          driver-class-name: com.mysql.jdbc.Driver
          type: com.alibaba.druid.pool.DruidDataSource # use Druid
        db3:
          url: jdbc:mysql://xx.xx.xx.xx:3308/dynamic
          username: root
          password: 123456
          driver-class-name: com.mysql.jdbc.Driver
          type: cn.beecp.BeeDataSource # use BeeCP
```
