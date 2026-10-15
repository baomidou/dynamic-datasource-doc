---
title: "Integrating JNDI"
description: "JNDI datasources are provided by the container (Tomcat, WebLogic, etc.). See JNDI overview for background."
---

# Integrating JNDI

JNDI datasources are provided by the container (Tomcat, WebLogic, etc.). See [JNDI overview](https://blog.csdn.net/zhaosg198312/article/details/3979435) for background.

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