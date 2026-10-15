---
title: "自定义数据源来源"
description: "数据源来源的默认实现是 YmlDynamicDataSourceProvider，其从 yaml 或 properties 中读取信息并解析出所有数据源信息。"
---

# 自定义数据源来源

## 基础介绍

数据源来源的默认实现是`YmlDynamicDataSourceProvider`，其从 yaml 或 properties 中读取信息并解析出所有数据源信息。

```java
public interface DynamicDataSourceProvider {

    /**
     * 加载所有数据源
     *
     * @return 所有数据源，key为数据源名称
     */
    Map<String, DataSource> loadDataSources();
}
```

## 自定义示例

可以参考  `AbstractJdbcDataSourceProvider`  （仅供参考）来实现从 JDBC 数据库中获取数据库连接信息。

```java
@Bean
public DynamicDataSourceProvider jdbcDynamicDataSourceProvider() {
    return new AbstractJdbcDataSourceProvider("org.h2.Driver", "jdbc:h2:mem:test", "sa", "") {
        @Override
        protected Map<String, DataSourceProperty> executeStmt(Statement statement) throws SQLException {
            ResultSet rs = statement.executeQuery("select * from DB");
            while (rs.next()) {
                String name = rs.getString("name");
                String username = rs.getString("username");
                String password = rs.getString("password");
                String url = rs.getString("url");
                String driver = rs.getString("driver");
                DataSourceProperty property = new DataSourceProperty();
                property.setUsername(username);
                property.setPassword(password);
                property.setUrl(url);
                property.setDriverClassName(driver);
                map.put(name, property);
            }
            return map;
        }
    };
}
```

PS: 从 3.4.0 开始，可以注入多个 DynamicDataSourceProvider 的 Bean 以实现同时从多个不同来源加载数据源，注意同名会被覆盖。