---
title: "数据库密码加密"
description: "用 Druid 时可以直接用它自带的 ConfigTools 加密。但如果项目用的是 HikariCP、BeeCP 或者干脆不用连接池，又想加密数据库信息呢？"
---

# 数据库密码加密

## 基础介绍

用 Druid 时可以直接用它自带的 `ConfigTools` 加密。但如果项目用的是 HikariCP、BeeCP 或者干脆不用连接池，又想加密数据库信息呢？

本框架内置了一套独立的加解密能力，**不依赖任何连接池**，支持对 `url`、`username`、`password`（以及任何需要脱敏的配置项）做 `ENC(...)` 包裹。

使用的算法是 **RSA**，密钥方向与「教科书 RSA」相反：

> **私钥加密，公钥解密。** 公钥可以放心发布出去（只用于运行时解密），私钥只在生成密文的那台机器上使用。

这个方向是刻意为之——配置里只需要公钥（`public-key`），私钥永远不进配置文件，普通开发者接触不到，泄露面更小。

## 使用步骤

### 1 · 生成密钥对与密文

```java
import com.baomidou.dynamic.datasource.toolkit.CryptoUtils;

public class Demo {

    public static void main(String[] args) throws Exception {
        // 生成密钥对：arr[0] = 私钥，arr[1] = 公钥
        String[] arr = CryptoUtils.genKeyPair(512);

        System.out.println("privateKey: " + arr[0]);   // 只留在生成端，不要进配置
        System.out.println("publicKey:  " + arr[1]);   // 填到 public-key

        // 用【私钥】加密
        System.out.println("url: " + CryptoUtils.encrypt(arr[0], "jdbc:mysql://127.0.0.1:3306/order"));
        System.out.println("username: " + CryptoUtils.encrypt(arr[0], "root"));
        System.out.println("password: " + CryptoUtils.encrypt(arr[0], "123456"));
    }
}
```

:::danger[必须使用自定义密钥对]
`CryptoUtils` 内置了一组默认密钥对，且它写在开源代码里——**用默认公钥加密等于没有保密性**，任何拿到本框架的人都能解出你的密码。它只能起到「防止明文被一眼看到」的作用。

生产环境**务必**用 `genKeyPair` 生成自己的密钥对，把公钥配到 `public-key`，并且不要提交私钥。
:::

:::warning[keySize 必须是 512]
`CryptoUtils` 内部的分段加解密阈值是写死的 `MAX_ENCRYPT_BLOCK = 53` / `MAX_DECRYPT_BLOCK = 64`（对应 512 位密钥）。

传入更大的位数（如 1024、2048）能生成密钥对、也能加密，但**解密时按 64 字节切分单个 RSA 密文块会直接报错**。要保持解密可用，`genKeyPair` 的参数只能用 `512`。
:::

超长内容的处理：单段最多 53 字节，超过会自动**分段加密**，所以很长的 JDBC URL 也能正常加密，无需自己切分。

### 2 · 在 YAML 中配置

`ENC(xxx)` 中包裹的 `xxx` 就是上一步生成的字符串。

```yaml
spring:
  datasource:
    dynamic:
      public-key: MFwwDQYJKoZIhvcNAQEB...   # 上一步生成的公钥
      datasource:
        master:
          url: ENC(xxxxx)
          username: ENC(xxxxx)
          password: ENC(xxxxx)
          driver-class-name: com.mysql.cj.jdbc.Driver
        slave_1:
          url: ENC(xxxxx)
          username: ENC(xxxxx)
          password: ENC(xxxxx)
          driver-class-name: com.mysql.cj.jdbc.Driver
          public-key: MFwwDQYJKoZI...       # 每个数据源可独立设置，不写则继承全局
```

解析优先级：**单数据源的 `public-key` > 全局 `public-key` > 内置默认值**。

## 自定义解密

如果公司要求用自己的加解密方案（比如接 KMS、国密算法），实现 `DataSourceInitEvent` 并注册为 Bean 即可。从 3.5.0 开始支持。

```java
public interface DataSourceInitEvent {

    /**
     * 连接池创建前执行（可用于参数解密）
     *
     * @param dataSourceProperty 数据源基础信息
     */
    void beforeCreate(DataSourceProperty dataSourceProperty);

    /**
     * 连接池创建后执行
     *
     * @param dataSource 连接池
     */
    void afterCreate(DataSource dataSource);
}
```

```java
@Bean
public DataSourceInitEvent myInitEvent() {
    return new DataSourceInitEvent() {
        @Override
        public void beforeCreate(DataSourceProperty property) {
            property.setPassword(kmsDecrypt(property.getPassword()));
            property.setUrl(kmsDecrypt(property.getUrl()));
            property.setUsername(kmsDecrypt(property.getUsername()));
        }

        @Override
        public void afterCreate(DataSource dataSource) {
            // 可选：连接池创建后的钩子
        }
    };
}
```

框架默认的实现是 `EncDataSourceInitEvent`，也就是 `ENC(...)` 这一套。自定义实现会**替换**默认行为，两者不要混用。

## 为什么不是公钥加密、私钥解密？

这是作者参考 Druid 的实现方式保留的设计。Druid 作者 wenshao 在 [issue #960](https://github.com/alibaba/druid/issues/960) 中解释过取舍：配置侧只需要持有公钥，私钥可以被控制在少数人手里，从而限制「谁能生成密文」。

如果你所在的环境对密钥方向有硬性要求，用上面的 `DataSourceInitEvent` 替换成自己的实现即可。

## 相关阅读

- [完整配置参考](/docs/guide/configuration) —— `public-key` 与 `lazy` 的继承规则
- [自定义数据源来源](/docs/custom/datasource-provider) —— 把配置整体搬到外部配置中心