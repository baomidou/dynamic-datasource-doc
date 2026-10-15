---
title: "集成 Quartz"
description: "---"
---

# 集成 Quartz

## 基础介绍

- Quartz Github [https://github.com/quartz-scheduler/quartz](https://github.com/quartz-scheduler/quartz)
- Quartz 文档 [http://www.quartz-scheduler.org/](http://www.quartz-scheduler.org/)

---
Quartz 是一个定时任务框架，常常用于解决分布式系统下的定时任务协调问题。

Quartz 常常需要独立运行在主业务数据库外,在 springboot 场景中可以以下面方式运行。

## 使用方法

### 1. 项目引用 `quartz-starter`。
[![](https://img.shields.io/maven-central/v/org.quartz-scheduler/quartz.svg)](http://mvnrepository.com/artifact/org.quartz-scheduler/quartz)

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-quartz</artifactId>
</dependency>
```

### 2. 配置数据源参数。

根据需要可配置独立数据源的参数，或把 quartz 数据源也作为动态数据源的一个数据源。

一般来说两种方式按需二选一即可。如果没有「在业务里切到 quartz 库」的场景，建议就用独立配置。

```yml
spring:
  datasource: #独立quartz配置
    username: root
    password: your-password
    url: jdbc:mysql://host:3306/quartz
    driver-class-name: com.mysql.cj.jdbc.Driver
    dynamic:
      datasource:
        master:
          username: sa
          password: ""
          url: jdbc:h2:mem:test
          driver-class-name: org.h2.Driver
        quartz:  #把quartz数据源也作为动态数据源的一个数据源
          username: root
          password: your-password
          url: jdbc:mysql://host:3306/quartz
          driver-class-name: com.mysql.cj.jdbc.Driver
  quartz:
    job-store-type: jdbc
    jdbc:
      initialize-schema: always
```

### 3. 创建任务。

创建一个每秒打印一次 hello world 的任务。
```java
@Slf4j
public class HelloworldJob extends QuartzJobBean {

    private static int time = 0;

    @Override
    protected void executeInternal(JobExecutionContext jobExecutionContext) throws JobExecutionException {
        log.info("Hello world!:" + jobExecutionContext.getJobDetail().getKey() + "-" + (time++));
    }
}
```
对应的自动配置。
```java
@Configuration
public class QuartzCommonAutoConfiguration {

    @Bean
    public JobDetail job() {
        return JobBuilder.newJob(HelloworldJob.class)
                .withIdentity("myJob1", "myJobGroup1")
                //JobDataMap可以给任务execute传递参数
                .usingJobData("job_param", "job_param1")
                .storeDurably()
                .build();
    }

    @Bean
    public Trigger myTrigger(JobDetail jobDetail) {
        return TriggerBuilder.newTrigger()
                .forJob(jobDetail)
                .withIdentity("myTrigger1", "myTriggerGroup1")
                .usingJobData("job_trigger_param", "job_trigger_param1")
                .startNow()
                .withSchedule(CronScheduleBuilder.cronSchedule("0/1 * * * * ? *"))
                .build();
    }
}
```
### 4. 配置 Quartz 实际使用的数据源。

具体方式有二种，随意选择一种即可。建议方式一，简单点。

#### 4.1 方式一：自定义 SchedulerFactoryBeanCustomizer。

```yaml
spring:
  datasource: #独立quartz配置
    username: root
    password: your-password
    url: jdbc:mysql://host:3306/quartz
    driver-class-name: com.mysql.cj.jdbc.Driver
```

```java
@Configuration
public class MyQuartzAutoConfigurationMode1 {

    @Autowired
    private DataSourceProperties dataSourceProperties;

    @Order(1)
    @Bean
    public SchedulerFactoryBeanCustomizer schedulerFactoryBeanCustomizer() {
        DataSource dataSource = dataSourceProperties.initializeDataSourceBuilder().build();
        return schedulerFactoryBean -> {
            schedulerFactoryBean.setDataSource(dataSource);
            schedulerFactoryBean.setTransactionManager(new DataSourceTransactionManager(dataSource));
        };
    }

    //如果需要使用动态数据源里的某个数据源则打开以下配置，关闭上面配置。
//    @Order(1)
//    @Bean
//    public SchedulerFactoryBeanCustomizer schedulerFactoryBeanCustomizer(DataSource dataSource) {
//        DynamicRoutingDataSource ds = (DynamicRoutingDataSource) dataSource;
//        DataSource quartz = ds.getDataSource("quartz");
//        return schedulerFactoryBean -> {
//            schedulerFactoryBean.setDataSource(quartz);
//            schedulerFactoryBean.setTransactionManager(new DataSourceTransactionManager(quartz));
//        };
//    }

}
```

#### 4.2 方式二：使用 @QuartzDataSource 指明 Quartz 数据源。

```java
@Configuration
public class MyQuartzAutoConfigurationMode2 {

    @Autowired
    private DataSourceProperties dataSourceProperties;
    @Autowired
    private DynamicDataSourceProperties properties;

    //3.4.0版本及以上使用以下方式注入,老版本请阅读文档  进阶-手动注入多数据源
    @Primary
    @Bean
    public DataSource dataSource() {
        DynamicRoutingDataSource dataSource = new DynamicRoutingDataSource();
        dataSource.setPrimary(properties.getPrimary());
        dataSource.setStrict(properties.getStrict());
        dataSource.setStrategy(properties.getStrategy());
        dataSource.setP6spy(properties.getP6spy());
        dataSource.setSeata(properties.getSeata());
        return dataSource;
    }

    @QuartzDataSource
    @Bean
    public DataSource quartzDataSource() {
        return dataSourceProperties.initializeDataSourceBuilder().build();
    }

    //如果需要使用动态数据源里的某个数据源则打开以下配置，关闭上面配置。
//    @QuartzDataSource
//    @Bean
//    public DataSource quartzDataSource(DataSource dataSource) {
//        DynamicRoutingDataSource ds = (DynamicRoutingDataSource) dataSource;
//        return ds.getDataSource("quartz");
//    }
}
```

## 示例项目

https://github.com/dynamic-datasource/dynamic-datasource-samples/tree/master/spring-boot-4/quartz-sample