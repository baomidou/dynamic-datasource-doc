# 集成 JNDI

JNDI是什么？ https://blog.csdn.net/zhaosg198312/article/details/3979435

用到JNDI大部分应该是老项目了。 如无需求不建议继续使用JNDI数据源。

```yaml
spring:
  datasource:
    dynamic:
      datasource:
          db1:
            jndi_name: xxx
          db2:
            jndi_name: xxx
```