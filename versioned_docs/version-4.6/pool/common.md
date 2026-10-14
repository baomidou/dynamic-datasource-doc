# 连接池必读

1. 每个数据源都有一个type来指定连接池。
2. 每个数据源甚至可以使用不同的连接池，如无特殊需要并不建议。
2. type **不是必填字段** ，在没有设置type的时候系统会自动按以下顺序查找并使用连接池。
Druid>HikariCp>BeeCp>DBCP2>Spring Basic。

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
          type: com.zaxxer.hikari.HikariDataSource #使用Hikaricp
        db2:
          url: jdbc:mysql://xx.xx.xx.xx:3307/dynamic
          username: root
          password: 123456
          driver-class-name: com.mysql.jdbc.Driver
          type: com.alibaba.druid.pool.DruidDataSource #使用Druid
        db3:
          url: jdbc:mysql://xx.xx.xx.xx:3308/dynamic
          username: root
          password: 123456
          driver-class-name: com.mysql.jdbc.Driver
          type: cn.beecp.BeeDataSource #使用beecp
```