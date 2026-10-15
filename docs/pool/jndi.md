---
title: "集成 JNDI"
description: "JNDI 数据源由容器（Tomcat、WebLogic 等）提供。相关概念可参考 JNDI 简介。"
---

# 集成 JNDI

JNDI 数据源由容器（Tomcat、WebLogic 等）提供。相关概念可参考 [JNDI 简介](https://blog.csdn.net/zhaosg198312/article/details/3979435)。

用到 JNDI 的多数是历史遗留项目，如无特殊需求不建议继续使用 JNDI 数据源。

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