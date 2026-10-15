# Custom Datasource Provider

## Overview

The default provider implementation is `YmlDynamicDataSourceProvider`, which reads information from yaml or properties and parses out every datasource.

```java
public interface DynamicDataSourceProvider {

    /**
     * Load all datasources
     *
     * @return all datasources, keyed by datasource name
     */
    Map<String, DataSource> loadDataSources();
}
```

## Custom example

You can refer to `AbstractJdbcDataSourceProvider` (for reference only) to read connection information from a JDBC database.

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

PS: since 3.4.0 you can register several `DynamicDataSourceProvider` beans to load datasources from multiple different sources at the same time. Note that datasources sharing the same name override each other.
