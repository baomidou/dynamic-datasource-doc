---
title: "GraalVM 原生镜像"
description: "Spring Boot 3 之后，把应用编译成 GraalVM Native Image 是降低启动时间与内存占用的常见手段。多数据源场景下，障碍在于大量反射：连接池创建、属性绑定、@DS 注解解析都依赖运行时反射，AOT 编译时无法推断。"
---

# GraalVM 原生镜像

## 概述

Spring Boot 3 之后，把应用编译成 GraalVM Native Image 是降低启动时间与内存占用的常见手段。多数据源场景下，障碍在于**大量反射**：连接池创建、属性绑定、`@DS` 注解解析都依赖运行时反射，AOT 编译时无法推断。

本框架提供了官方的 **GraalVM Reachability Metadata**，作为独立构件发布，覆盖：

- 本框架自身（`@DS` 解析、连接池装配、属性绑定涉及的反射点）
- Druid
- HikariCP

## 使用方式

**Starter 用户通常无需任何操作。** 元数据已经提交到官方的 [GraalVM Reachability Metadata Repository](https://github.com/oracle/graalvm-reachability-metadata)，`native-image-maven-plugin` / `org.graalvm.buildtools.native` 会自动拉取。

如果你需要手工引入构件：

```xml
<dependency>
    <groupId>com.baomidou</groupId>
    <artifactId>dynamic-datasource-native-metadata</artifactId>
    <version>${version}</version>
    <classifier>metadata</classifier>
</dependency>
```

## 构建与测试

```bash
# 构建原生镜像
./gradlew nativeCompile

# 运行原生测试（CI 的准入门禁）
./gradlew nativeTest
```

Gradle 侧的 AOT 配置、工具链与发布流程见主仓库的 [CONTRIBUTING.md](https://github.com/baomidou/dynamic-datasource/blob/master/CONTRIBUTING.md)。

## 注意事项

:::warning[务必在原生镜像上跑一遍你的集成测试]
元数据只覆盖框架与上述两个连接池的反射点。以下情况仍可能需要在你的项目里补充 `reflect-config.json`：

- 使用 **其他连接池**（BeeCP、C3P0、Oracle UCP）或自定义 `DataSourceCreator`
- 自定义 `DsProcessor` 中用到了框架无法静态推断的 SpEL 表达式
- 业务代码里通过反射访问数据源配置对象

遇到 `ClassNotFoundException` 或反射相关的 `NativeImageError` 时，先用 `--trace-class-initialization` 定位，再补配置。
:::

其他边界：

- 原生镜像下 **JDBC 驱动**自身的元数据需要由驱动提供（MySQL Connector/J 等主流驱动已支持），请确认驱动版本。
- 本项目**不提供完整的 JPMS `module-info`**，模块名契约是 manifest 中的 `Automatic-Module-Name`。
- 每次提交都会跑 `nativeTest`，所以官方构件在发布前一定经过原生镜像验证——问题通常出在你的**自定义扩展**上。