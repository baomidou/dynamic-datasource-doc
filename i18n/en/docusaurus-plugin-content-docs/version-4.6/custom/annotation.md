---
title: "Custom Annotations"
description: "If you only have a handful of fixed databases, you can define your own annotation to replace @DS."
---

# Custom Annotations

## Overview

If you only have a handful of fixed databases, you can define your own annotation to replace `@DS`.

Custom annotations are recommended from version 3.2.1 onwards. The framework also ships with built-in `@Master` and `@Slave` annotations.

## How to use

Below we define a custom annotation for the product database, so that it is easier to use later in the code.

### 1. Define your own annotation and let it inherit from `DS`.

```java
import com.baomidou.dynamic.datasource.annotation.DS;
import java.lang.annotation.*;

@Target({ElementType.TYPE, ElementType.METHOD})
@Retention(RetentionPolicy.RUNTIME)
@Documented
@DS("product")
public @interface Product {
}
```

### 2. Put the annotation on the method or class that needs to switch datasource.

```java
@Service
@Product
public class ProductServiceImpl implements ProductService {

    @Product
    public List selectAll() {
      return  jdbcTemplate.queryForList("select * from products");
    }
}
```