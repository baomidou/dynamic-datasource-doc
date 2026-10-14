# 懒启动数据源

## 基础介绍

懒启动：连接池创建出来后并不会立即初始化连接池，等需要使用connection的时候再初始化。

暂时只支持Druid和HikariCp和BeeCp连接池。

主要场景可能适合于数据源很多，又不需要启动立即初始化的情况，可以减少系统启动时间。

**缺点**在于，如果参数配置有误，则启动的时候不知道，初始化的时候失败，可能一直抛异常。

## 配置使用

```yaml
spring:
  datasource:
    dynamic:
      primary: master #设置默认的数据源或者数据源组,默认值即为master
      strict: false #设置严格模式,默认false不启动. 启动后在未匹配到指定数据源时候会抛出异常,不启动则使用默认数据源.
      lazy: true #默认false非懒启动，系统加载到数据源立即初始化连接池
      datasource:
        master:
          url: jdbc:mysql://xx.xx.xx.xx:3306/dynamic
          username: root
          password: 123456
          driver-class-name: com.mysql.jdbc.Driver
          lazy: true #表示这个数据源懒启动
        db1:
          url: jdbc:mysql://xx.xx.xx.xx:3307/dynamic
          username: root
          password: 123456
          driver-class-name: com.mysql.jdbc.Driver
        db2:
          url: jdbc:mysql://xx.xx.xx.xx:3307/dynamic
          username: root
          password: 123456
          driver-class-name: com.mysql.jdbc.Driver
```