---
title: "动态添加/移除数据源"
description: "多租户场景里常见这样的需求：新租户进来时需要在不重启应用的前提下增加一个数据源，租户注销时再把它摘掉。"
---

# 动态添加/移除数据源

## 基础介绍

多租户场景里常见这样的需求：新租户进来时需要**在不重启应用的前提下**增加一个数据源，租户注销时再把它摘掉。

`DynamicRoutingDataSource` 为此提供了 `addDataSource` / `removeDataSource` 两个方法，配合 `DefaultDataSourceCreator` 就能在运行期创建任意连接池。

## 使用步骤

```java
import com.baomidou.dynamic.datasource.DynamicRoutingDataSource;
import com.baomidou.dynamic.datasource.creator.DataSourceProperty;
import com.baomidou.dynamic.datasource.creator.DefaultDataSourceCreator;
import com.baomidou.dynamic.datasource.creator.jndi.JndiDataSourceCreator;
import org.springframework.beans.BeanUtils;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import javax.sql.DataSource;
import java.util.Set;

@RestController
@RequestMapping("/datasources")
public class DataSourceController {

    private final DataSource dataSource;
    private final DefaultDataSourceCreator dataSourceCreator;
    private final JndiDataSourceCreator jndiDataSourceCreator;

    public DataSourceController(DataSource dataSource,
                                DefaultDataSourceCreator dataSourceCreator,
                                JndiDataSourceCreator jndiDataSourceCreator) {
        this.dataSource = dataSource;
        this.dataSourceCreator = dataSourceCreator;
        this.jndiDataSourceCreator = jndiDataSourceCreator;
    }

    @GetMapping
    public Set<String> now() {
        DynamicRoutingDataSource ds = (DynamicRoutingDataSource) dataSource;
        return ds.getDataSources().keySet();
    }

    /**
     * 通用添加（推荐）：由 DefaultDataSourceCreator 根据环境自动选择连接池。
     * 选择顺序：druid > hikaricp > beecp > dbcp2 > basic
     */
    @PostMapping("/add")
    public Set<String> add(@Validated @RequestBody DataSourceDTO dto) {
        DataSourceProperty property = new DataSourceProperty();
        BeanUtils.copyProperties(dto, property);

        DynamicRoutingDataSource ds = (DynamicRoutingDataSource) dataSource;
        DataSource newDataSource = dataSourceCreator.createDataSource(property);
        ds.addDataSource(dto.getPoolName(), newDataSource);
        return ds.getDataSources().keySet();
    }

    @PostMapping("/addJndi")
    public Set<String> addJndi(String poolName, String jndiName) {
        DynamicRoutingDataSource ds = (DynamicRoutingDataSource) dataSource;
        DataSource newDataSource = jndiDataSourceCreator.createDataSource(jndiName);
        ds.addDataSource(poolName, newDataSource);
        return ds.getDataSources().keySet();
    }

    @DeleteMapping
    public String remove(String name) {
        DynamicRoutingDataSource ds = (DynamicRoutingDataSource) dataSource;
        ds.removeDataSource(name);
        return "删除成功";
    }
}
```

:::tip[统一用 DefaultDataSourceCreator]
`DefaultDataSourceCreator` 按环境自动挑选连接池，并且**会自动处理懒加载、`ENC()` 解密与初始化脚本**。

各个具体的创建器（`DruidDataSourceCreator`、`HikariDataSourceCreator` 等）虽然也可以单独注入使用，但它们绕过了上述统一处理，只建议在明确知道原因时使用。
:::

## 行为细节

`addDataSource(String name, DataSource dataSource)`：

- 以 `name` 为 key 覆盖写入（同名会替换旧数据源）
- 按命名规则把新数据源**自动归入对应分组**——加入 `slave_3` 会自动进 `slave` 组，成为负载均衡的一个成员
- 方法带 `synchronized`，并发安全

`removeDataSource(String name)`：

- 名称不能为空
- 组内成员被移除后为空时，**该组会被自动清理**
- 同样带 `synchronized`

## 注意事项

:::danger[不要移除正在被使用的数据源]
`removeDataSource` 只是把数据源从路由表中摘掉，它**不会**等你在途的请求结束。

如果此刻正好有线程拿到这个数据源准备取连接，就会拿到 `null` 并抛出 `NullPointerException`（严格模式下也拦不住这类竞态）。

生产环境的正确做法是分两步：

1. **先摘流量**：把该库从分组中移出（例如换个名字让 `slave` 组不再包含它），等待在途请求结束
2. **再调用移除**：确认没有活跃连接后执行 `removeDataSource`

也可以考虑开启 [`grace-destroy`](/docs/advanced/graceful-shutdown)，让连接池在关闭前等待活跃连接归还。
:::

其他两点：

- 运行期新增的数据源**同样会被 Actuator 端点统计到**，可用它验证是否添加成功，见[运维端点与指标](/docs/advanced/observability)。
- 数据源清单如果来自外部（配置中心、引导库），更适合实现 `DynamicDataSourceProvider`，见[自定义数据源来源](/docs/custom/datasource-provider)。

## 常见问题

### 集群/多实例部署，是不是每台机器都要 add？

是。`addDataSource` 只作用于**当前 JVM**（[#233](https://github.com/baomidou/dynamic-datasource/issues/233)）。常见方案有三种：

1. 每台实例启动时从同一个来源（引导库 / 配置中心）加载**全量清单**，运行期不再动态增删；
2. 管理操作通过 MQ 或发布订阅**广播**到所有实例；
3. 把数据源配置交给配置中心，接入刷新（见[配置中心刷新数据源](/docs/next/advanced/refresh-datasource)）。

### 怎么让「数据源清单」本身存库？

继承 `AbstractJdbcDataSourceProvider`，从引导库查出 `Map<String, DataSourceProperty>` 返回即可（[#107](https://github.com/baomidou/dynamic-datasource/issues/107)、[#302](https://github.com/baomidou/dynamic-datasource/issues/302)）。引导库自身的连接信息仍然写在配置文件里——这也是「引导」二字的含义。更完整的扩展说明见[自定义数据源来源](/docs/custom/datasource-provider)。

### 引导库里没有数据时启动会报错吗？

自定义 provider 返回 `null` 或空 Map，在旧版本会直接 NPE（[#302](https://github.com/baomidou/dynamic-datasource/issues/302)）；当前版本已兼容 `null`（启动后得到空清单并打印警告日志）。自己写 provider 时仍建议对空结果做兜底。

### 运行中重复 add 同名数据源会怎样？

**同名会替换**：旧池被关闭，新池生效。可用于「换库不停机」的滚动切换。

### add/remove 与正在执行的请求冲突怎么办？

两个方法都是 `synchronized` 的，路由侧对「删除瞬间的并发读」也做了空值防护（不会把 `null` 连接交给调用方）。但业务上仍应按上面的[注意事项](#注意事项)先摘流量再移除。

## 源码分析

`DataSourceCreator` 是创建器的统一抽象，`DefaultDataSourceCreator` 按注册顺序取第一个 `support()` 返回 `true` 的实现：

```java
public interface DataSourceCreator {

    /**
     * 通过属性创建数据源
     *
     * @param dataSourceProperty 数据源属性
     * @return 被创建的数据源
     */
    DataSource createDataSource(DataSourceProperty dataSourceProperty);

    /**
     * 当前创建器是否支持根据此属性创建
     *
     * @param dataSourceProperty 数据源属性
     * @return 是否支持
     */
    boolean support(DataSourceProperty dataSourceProperty);
}
```

- `BasicDataSourceCreator` 使用 Spring 原生的创建方式，只支持最基础配置，且**不做池化**。
- `JndiDataSourceCreator` 比较特殊：直接按 `jndiName` 从容器查找，不参与 `support()` 自动选择链。
- 其余实现分别对应 Druid / HikariCP / BeeCP / DBCP2 / C3P0 / Oracle UCP / Atomikos。

## 示例项目

[https://github.com/dynamic-datasource/dynamic-datasource-samples/tree/master/spring-boot-4/add-remove-datasource-sample](https://github.com/dynamic-datasource/dynamic-datasource-samples/tree/master/spring-boot-4/add-remove-datasource-sample)