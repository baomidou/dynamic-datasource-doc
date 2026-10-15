---
title: "Dynamic Datasource Resolution"
description: "By default a chain of three processors handles dynamic parameter resolution: header -> session -> spel."
---

# Dynamic Datasource Resolution

## Overview

By default a chain of three processors handles dynamic parameter resolution: header -> session -> spel.
Every parameter starting with `#` resolves its datasource from the arguments.

```java
@DS("#session.tenantName")// from the session
public List selectSpelBySession() {
	return userMapper.selectUsers();
}

@DS("#header.tenantName")// from the header
public List selectSpelByHeader() {
	return userMapper.selectUsers();
}

@DS("#tenantName")// from an argument, using spel
public List selectSpelByKey(String tenantName) {
	return userMapper.selectUsers();
}

@DS("#user.tenantName")// from a complex argument, using spel
public List selecSpelByTenant(User user) {
	return userMapper.selectUsers();
}
```

## How to extend it?

1. I want to resolve the parameter from a cookie?

2. I want to compute it from other environment properties?

Take the header processor as a model: extend `DsProcessor`; return `true` from `matches` when it applies, and resolve the datasource from `doDetermineDatasource`; otherwise the chain moves on to the next processor.

---

## 1. Write your own processor.
```java
public class DsHeaderProcessor extends DsProcessor {

    private static final String HEADER_PREFIX = "#header";

    @Override
    public boolean matches(String key) {
        return key.startsWith(HEADER_PREFIX);
    }

    @Override
    public String doDetermineDatasource(MethodInvocation invocation, String key) {
        HttpServletRequest request = ((ServletRequestAttributes) RequestContextHolder.getRequestAttributes()).getRequest();
        return request.getHeader(key.substring(8));
    }
}
```

## 2. After overriding, register a processor chain in the resolution order you want.

```java
@Configuration
public class MyDynamicDataSourceConfig{

   @Bean
   public DsProcessor dsProcessor() {
        DsHeaderProcessor headerProcessor = new DsHeaderProcessor();
        DsSessionProcessor sessionProcessor = new DsSessionProcessor();
        DsSpelExpressionProcessor spelExpressionProcessor = new DsSpelExpressionProcessor();
        headerProcessor.setNextProcessor(sessionProcessor);
        sessionProcessor.setNextProcessor(spelExpressionProcessor);
        return headerProcessor;
   }
}
```

## Usage on Mapper interface methods

```java
public interface UserMapper{
    // the prefix can be p0 or a0
    @DS("#p0.tenantName")
    public List selecSpelByTenant(User user);
}
```

For methods declared on an interface, the default compiler settings do not write the parameter metadata into the bytecode, so Spring EL cannot see the parameter names and only the default naming scheme works:

1. first parameter: p0, a0 (with `-parameters` added, the real name can be used, e.g. `#user` here)
2. second parameter: p1, a1
3. third parameter: P2, a2

You can make the compiler write interface parameter information into the bytecode by changing the Maven or Java compiler configuration.

Maven configuration:
```xml
    <plugin>
        <groupId>org.apache.maven.plugins</groupId>
        <artifactId>maven-compiler-plugin</artifactId>
        <!-- the minimum maven-compiler-plugin version that supports <parameters>true</parameters> is 3.6.2 -->
        <version>3.6.2</version>
        <configuration>
            <source>${java.version}</source>
            <target>${java.version}</target>
            <parameters>true</parameters>
        </configuration>
    </plugin>
```

IntelliJ IDEA Java compiler option: ` -parameters`
> the minimum Java version supporting `-parameters` is 1.8