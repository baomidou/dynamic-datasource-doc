---
layout: home

hero:
  name: dynamic-datasource
  text: Spring Boot 多数据源框架
  tagline: 一行 @DS 注解切换数据源 · 本地多库事务 · 动态增删数据源 · 读写分离
  actions:
    - theme: brand
      text: 快速开始
      link: /guide/basics
    - theme: alt
      text: 排查「切换失败」
      link: /guide/switching-failure
    - theme: alt
      text: GitHub
      link: https://github.com/baomidou/dynamic-datasource

features:
  - icon: 🔀
    title: 一行注解切换数据源
    details: 在 Service 方法上标注 @DS("slave") 即可路由到目标库或组，支持 SpEL 动态 key、无注解切换与读写分离插件。
  - icon: 🧩
    title: 连接池无侵入集成
    details: 原生适配 Druid / HikariCP / BeeCP / DBCP2 / JNDI，全局与单库两级配置，创建即接管。
  - icon: 🧾
    title: 本地多库事务
    details: "@DSTransactional 在一个事务中绑定多个库的连接统一提交/回滚；另提供 Seata AT/XA 与 Atomikos 集成方案。"
  - icon: 🧵
    title: 动态数据源管理
    details: 运行时增删数据源、懒启动、无数据源启动、数据源清单来自引导库，多租户场景的基石。
---
