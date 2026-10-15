---
title: "自定义"
description: "本章介绍如何扩展本框架的默认行为。"
---

# 自定义

本章介绍如何扩展本框架的默认行为。

| 扩展点 | 说明 |
| :--- | :--- |
| **自定义注解** | 不满足于默认的 `@DS` 注解，希望自定义注解。见[自定义注解](/docs/custom/annotation) |
| **自定义数据源来源** | 默认数据源来源基于 yml/properties 配置，组件支持同时从多个来源加载初始化数据源。常用于多租户系统，从租户信息库加载不同租户的数据源。见[自定义数据源来源](/docs/custom/datasource-provider) |
| **自定义负载均衡策略** | 内置轮询、随机，支持扩展。见[自定义负载均衡策略](/docs/custom/load-balance-strategy) |
| **自定义切面** | 支持**不使用注解**，通过配置切换数据源。例如某个包下所有以 `select*` 开头的 `Service` 方法走 `slave` 库、以 `add*` 开头的走 `master` 库。见[无注解方案](/docs/no-annotation) |