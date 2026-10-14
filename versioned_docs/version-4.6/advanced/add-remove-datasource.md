# 动态添加/移除数据源

## 基础介绍

主要在多租户场景中，常常新的一个租户进来需要动态的添加一个数据源到库中，使得系统不用重启即可切换数据源。

## 使用步骤

```java
import com.baomidou.dynamic.datasource.DynamicRoutingDataSource;
import com.baomidou.dynamic.datasource.creator.*;
import com.baomidou.dynamic.datasource.spring.boot.autoconfigure.DataSourceProperty;
import com.baomidou.samples.ds.dto.DataSourceDTO;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiOperation;
import org.springframework.beans.BeanUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import javax.sql.DataSource;
import java.util.Set;

@RestController
@RequestMapping("/datasources")
@Api(tags = "添加删除数据源")
public class DataSourceController {

    @Autowired
    private DataSource dataSource;
   // private final DataSourceCreator dataSourceCreator; //3.3.1及以下版本使用这个通用，强烈推荐sb2用户至少升级到3.5.2版本

    @Autowired
    private DefaultDataSourceCreator dataSourceCreator;
//如果是用4.x以上版本，因为要和spring解绑，重构了一些东西，比如缺少了懒启动和启动初始化数据库。不太建议用以下独立的创建器，只建议用上面的DefaultDataSourceCreator 
    @Autowired
    private BasicDataSourceCreator basicDataSourceCreator;
    @Autowired
    private JndiDataSourceCreator jndiDataSourceCreator;
    @Autowired
    private DruidDataSourceCreator druidDataSourceCreator;
    @Autowired
    private HikariDataSourceCreator hikariDataSourceCreator;
    @Autowired
    private BeeCpDataSourceCreator beeCpDataSourceCreator;
    @Autowired
    private Dbcp2DataSourceCreator dbcp2DataSourceCreator;

    @GetMapping
    @ApiOperation("获取当前所有数据源")
    public Set<String> now() {
        DynamicRoutingDataSource ds = (DynamicRoutingDataSource) dataSource;
        return ds.getDataSources().keySet();
    }

    //通用数据源会根据maven中配置的连接池根据顺序依次选择。
    //默认的顺序为druid>hikaricp>beecp>dbcp>spring basic
    @PostMapping("/add")
    @ApiOperation("通用添加数据源（推荐）")
    public Set<String> add(@Validated @RequestBody DataSourceDTO dto) {
        DataSourceProperty dataSourceProperty = new DataSourceProperty();
        BeanUtils.copyProperties(dto, dataSourceProperty);
        DynamicRoutingDataSource ds = (DynamicRoutingDataSource) dataSource;
        DataSource dataSource = dataSourceCreator.createDataSource(dataSourceProperty);
        ds.addDataSource(dto.getPoolName(), dataSource);
        return ds.getDataSources().keySet();
    }

    @PostMapping("/addBasic(强烈不推荐，除了用了马上移除)")
    @ApiOperation(value = "添加基础数据源", notes = "调用Springboot内置方法创建数据源，兼容1,2")
    public Set<String> addBasic(@Validated @RequestBody DataSourceDTO dto) {
        DataSourceProperty dataSourceProperty = new DataSourceProperty();
        BeanUtils.copyProperties(dto, dataSourceProperty);
        DynamicRoutingDataSource ds = (DynamicRoutingDataSource) dataSource;
        DataSource dataSource = basicDataSourceCreator.createDataSource(dataSourceProperty);
        ds.addDataSource(dto.getPoolName(), dataSource);
        return ds.getDataSources().keySet();
    }

    @PostMapping("/addJndi")
    @ApiOperation("添加JNDI数据源")
    public Set<String> addJndi(String pollName, String jndiName) {
        DynamicRoutingDataSource ds = (DynamicRoutingDataSource) dataSource;
        DataSource dataSource = jndiDataSourceCreator.createDataSource(jndiName);
        ds.addDataSource(poolName, dataSource);
        return ds.getDataSources().keySet();
    }

    @PostMapping("/addDruid")
    @ApiOperation("基础Druid数据源")
    public Set<String> addDruid(@Validated @RequestBody DataSourceDTO dto) {
        DataSourceProperty dataSourceProperty = new DataSourceProperty();
        BeanUtils.copyProperties(dto, dataSourceProperty);
        dataSourceProperty.setLazy(true);
        DynamicRoutingDataSource ds = (DynamicRoutingDataSource) dataSource;
        DataSource dataSource = druidDataSourceCreator.createDataSource(dataSourceProperty);
        ds.addDataSource(dto.getPoolName(), dataSource);
        return ds.getDataSources().keySet();
    }

    @PostMapping("/addHikariCP")
    @ApiOperation("基础HikariCP数据源")
    public Set<String> addHikariCP(@Validated @RequestBody DataSourceDTO dto) {
        DataSourceProperty dataSourceProperty = new DataSourceProperty();
        BeanUtils.copyProperties(dto, dataSourceProperty);
        dataSourceProperty.setLazy(true);//3.4.0版本以下如果有此属性，需手动设置，不然会空指针。
        DynamicRoutingDataSource ds = (DynamicRoutingDataSource) dataSource;
        DataSource dataSource = hikariDataSourceCreator.createDataSource(dataSourceProperty);
        ds.addDataSource(dto.getPoolName(), dataSource);
        return ds.getDataSources().keySet();
    }

    @PostMapping("/addBeeCp")
    @ApiOperation("基础BeeCp数据源")
    public Set<String> addBeeCp(@Validated @RequestBody DataSourceDTO dto) {
        DataSourceProperty dataSourceProperty = new DataSourceProperty();
        BeanUtils.copyProperties(dto, dataSourceProperty);
        dataSourceProperty.setLazy(true);//3.4.0版本以下如果有此属性，需手动设置，不然会空指针。
        DynamicRoutingDataSource ds = (DynamicRoutingDataSource) dataSource;
        DataSource dataSource = beeCpDataSourceCreator.createDataSource(dataSourceProperty);
        ds.addDataSource(dto.getPoolName(), dataSource);
        return ds.getDataSources().keySet();
    }

    @PostMapping("/addDbcp")
    @ApiOperation("基础Dbcp数据源")
    public Set<String> addDbcp(@Validated @RequestBody DataSourceDTO dto) {
        DataSourceProperty dataSourceProperty = new DataSourceProperty();
        BeanUtils.copyProperties(dto, dataSourceProperty);
        dataSourceProperty.setLazy(true);//3.4.0版本以下如果有此属性，需手动设置，不然会空指针。
        DynamicRoutingDataSource ds = (DynamicRoutingDataSource) dataSource;
        DataSource dataSource = dbcp2DataSourceCreator.createDataSource(dataSourceProperty);
        ds.addDataSource(dto.getPoolName(), dataSource);
        return ds.getDataSources().keySet();
    }

    @DeleteMapping
    @ApiOperation("删除数据源")
    public String remove(String name) {
        DynamicRoutingDataSource ds = (DynamicRoutingDataSource) dataSource;
        ds.removeDataSource(name);
        return "删除成功";
    }
}
```

## 示例项目

https://github.com/dynamic-datasource/dynamic-datasource-samples/tree/master/spring-boot-4/add-remove-datasource-sample

## 源码分析

![](/img/screenshot_1620832554404.png)

~~~
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
~~~

DataSourceCreator是一个接口，定义了根据参数创建数据源的接口。
其他creator实现此接口，本项目暂时实现了Druid和Hikaricp的等连接池的实现。
BasicDataSourceCreator 是调用Spring原生的创建方式，只支持最最原始的基础配置。
DefaultDataSourceCreator  是一个通用的创建器，其根据环境自动选择连接池，
