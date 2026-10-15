# Integrating JNDI

What is JNDI? https://blog.csdn.net/zhaosg198312/article/details/3979435

Most projects using JNDI these days are legacy ones. Unless you have to, staying on a JNDI datasource is not recommended.

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
