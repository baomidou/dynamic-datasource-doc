---
title: "Integrating Quartz"
description: "---"
---

# Integrating Quartz

## Overview

- Quartz on GitHub [https://github.com/quartz-scheduler/quartz](https://github.com/quartz-scheduler/quartz)
- Quartz documentation [http://www.quartz-scheduler.org/](http://www.quartz-scheduler.org/)

---
Quartz is a scheduling framework, often used to coordinate scheduled jobs in a distributed system.

Quartz usually needs to run outside the main business database. In a Spring Boot application it can be run as follows.

## How to use

### 1. Add the `quartz-starter` dependency.

[![](https://img.shields.io/maven-central/v/org.quartz-scheduler/quartz.svg)](http://mvnrepository.com/artifact/org.quartz-scheduler/quartz)

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-quartz</artifactId>
</dependency>
```

### 2. Configure the datasource.

Depending on your needs, either configure a standalone datasource for Quartz, or register the Quartz datasource as one of the dynamic datasources.

In general, pick one of the two. If you never need to "switch to the quartz database from business code", a standalone configuration is recommended.

```yml
spring:
  datasource: # standalone quartz configuration
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
        quartz:  # register the quartz datasource as one of the dynamic datasources
          username: root
          password: your-password
          url: jdbc:mysql://host:3306/quartz
          driver-class-name: com.mysql.cj.jdbc.Driver
  quartz:
    job-store-type: jdbc
    jdbc:
      initialize-schema: always
```

### 3. Create a job.

A job that prints `hello world` once per second.

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
The matching auto-configuration.
```java
@Configuration
public class QuartzCommonAutoConfiguration {

    @Bean
    public JobDetail job() {
        return JobBuilder.newJob(HelloworldJob.class)
                .withIdentity("myJob1", "myJobGroup1")
                // JobDataMap can pass parameters to the job's execute method
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
### 4. Configure the datasource Quartz actually uses.

There are two ways; pick either one. Method 1 is recommended — it is simpler.

#### 4.1 Method 1: a custom `SchedulerFactoryBeanCustomizer`.

```yaml
spring:
  datasource: # standalone quartz configuration
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

    // to use one of the dynamic datasources, enable the configuration below and disable the one above.
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

#### 4.2 Method 2: point Quartz at its datasource with `@QuartzDataSource`.

```java
@Configuration
public class MyQuartzAutoConfigurationMode2 {

    @Autowired
    private DataSourceProperties dataSourceProperties;
    @Autowired
    private DynamicDataSourceProperties properties;

    // use this style from 3.4.0 onwards; for older versions read  Advanced - manual multi-datasource injection
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

    // to use one of the dynamic datasources, enable the configuration below and disable the one above.
//    @QuartzDataSource
//    @Bean
//    public DataSource quartzDataSource(DataSource dataSource) {
//        DynamicRoutingDataSource ds = (DynamicRoutingDataSource) dataSource;
//        return ds.getDataSource("quartz");
//    }
}
```

## Sample project

https://github.com/dynamic-datasource/dynamic-datasource-samples/tree/master/spring-boot-4/quartz-sample