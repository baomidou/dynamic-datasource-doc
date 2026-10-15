---
title: "Database Password Encryption"
description: "With Druid you can encrypt with its own ConfigTools. But what if your project uses HikariCP, BeeCP, or no pool at all, and you still want the database credentials encrypted?"
---

# Database Password Encryption

## Overview

With Druid you can encrypt with its own `ConfigTools`. But what if your project uses HikariCP, BeeCP, or no pool at all, and you still want the database credentials encrypted?

This framework ships an independent encryption capability that **does not depend on any connection pool** and supports wrapping `url`, `username`, `password` (and any other configuration value you want masked) in `ENC(...)`.

The algorithm is **RSA**, and the key direction is the opposite of "textbook RSA":

> **Encrypt with the private key, decrypt with the public key.** The public key can be published freely (it is only used to decrypt at runtime), while the private key stays on the machine that generates the ciphertext.

This direction is deliberate — the configuration only ever needs the public key (`public-key`); the private key never enters a configuration file, ordinary developers never touch it, and the exposure surface is smaller.

## Usage

### 1 · Generate a key pair and the ciphertext

```java
import com.baomidou.dynamic.datasource.toolkit.CryptoUtils;

public class Demo {

    public static void main(String[] args) throws Exception {
        // generate a key pair: arr[0] = private key, arr[1] = public key
        String[] arr = CryptoUtils.genKeyPair(512);

        System.out.println("privateKey: " + arr[0]);   // keep it on the generating side only, never in configuration
        System.out.println("publicKey:  " + arr[1]);   // put this into public-key

        // encrypt with the 【private key】
        System.out.println("url: " + CryptoUtils.encrypt(arr[0], "jdbc:mysql://127.0.0.1:3306/order"));
        System.out.println("username: " + CryptoUtils.encrypt(arr[0], "root"));
        System.out.println("password: " + CryptoUtils.encrypt(arr[0], "123456"));
    }
}
```

::::danger[You must use your own key pair]
`CryptoUtils` contains a built-in default key pair, and it is written in open-source code — **encrypting with the default public key provides no confidentiality at all**, since anyone with this framework can decrypt your password. It only prevents the plaintext from being seen at a glance.

In production **always** generate your own key pair with `genKeyPair`, configure the public key in `public-key`, and never commit the private key.
::::

::::warning[keySize must be 512]
The block thresholds inside `CryptoUtils` are hard-coded as `MAX_ENCRYPT_BLOCK = 53` / `MAX_DECRYPT_BLOCK = 64` (which correspond to a 512-bit key).

Passing a larger size (1024, 2048, …) still generates a key pair and still encrypts, but **decryption fails outright when a single RSA ciphertext block is split at 64 bytes**. To keep decryption working, `genKeyPair` must be called with `512`.
::::

Handling long values: a single block holds at most 53 bytes; anything longer is **encrypted in blocks** automatically, so even a very long JDBC URL can be encrypted without splitting it yourself.

### 2 · Configure it in YAML

The `xxx` wrapped inside `ENC(xxx)` is the string produced by the previous step.

```yaml
spring:
  datasource:
    dynamic:
      public-key: MFwwDQYJKoZIhvcNAQEB...   # the public key generated above
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
          public-key: MFwwDQYJKoZI...       # each datasource may set its own; otherwise it inherits the global one
```

Resolution priority: **per-datasource `public-key` > global `public-key` > built-in default**.

## Custom decryption

If your company requires its own crypto stack (a KMS, or a national cipher algorithm, say), implement `DataSourceInitEvent` and register it as a bean. Supported since 3.5.0.

```java
public interface DataSourceInitEvent {

    /**
     * runs before the pool is created (can be used to decrypt parameters)
     *
     * @param dataSourceProperty basic datasource information
     */
    void beforeCreate(DataSourceProperty dataSourceProperty);

    /**
     * runs after the pool is created
     *
     * @param dataSource the connection pool
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
            // optional: hook after the pool has been created
        }
    };
}
```

The default implementation is `EncDataSourceInitEvent`, i.e. the `ENC(...)` mechanism. A custom implementation **replaces** the default behaviour; do not mix the two.

## Common errors and pitfalls

| Error / problem | Cause and fix |
| :--- | :--- |
| `Data must not be longer than 53 bytes` ([#367](https://github.com/baomidou/dynamic-datasource/issues/367)) | a single block is capped at 53 bytes, so **encrypting with a third-party tool always hits this**. Use `CryptoUtils.encrypt(...)`: its blocking logic matches the decryption side exactly |
| `could not decrypt an ENC(...) property, check the public-key configuration` (4.6+) | fail-fast by design: wrong public key, mismatched length, or truncated ciphertext. Before 4.6 the ciphertext was passed to the database as if it were plaintext, showing up as an inexplicable `Access denied` — upgrading is recommended to get an accurate error ([#490](https://github.com/baomidou/dynamic-datasource/issues/490)) |
| a datasource-level `public-key` has no effect ([#598](https://github.com/baomidou/dynamic-datasource/issues/598), [#623](https://github.com/baomidou/dynamic-datasource/issues/623)) | the per-datasource `public-key` wins over the global one; make sure it is configured under that datasource node and that the key text is complete (Base64, no line breaks) |
| `url: ENC(...)` fails to decrypt ([#720](https://github.com/baomidou/dynamic-datasource/issues/720)) | `url` goes through decryption as well; make sure the ciphertext contains no extra spaces or line breaks |
| conflict with [jasypt](https://github.com/ulisesbocchio/jasypt-spring-boot) ([#168](https://github.com/baomidou/dynamic-datasource/issues/168), [#672](https://github.com/baomidou/dynamic-datasource/issues/672)) | jasypt's default syntax is **also** `ENC(...)`, so the two fight over decryption. Change jasypt's prefix/suffix (`jasypt.encryptor.property.prefix` / `suffix`) to avoid the collision, or use only one of them |

::::warning[The built-in default key is public]
The default key pair shipped with the framework is written in open-source code: it **protects against shoulder surfing and accidental disclosure, not against a determined attacker**. In production, generate your own key pair with `genKeyPair` as shown above, or plug in a KMS. `public-key` is the "decryption key" and is not sensitive by itself; the private key is only used for offline encryption and must **not** be committed to the repository.
::::

## Why not encrypt with the public key and decrypt with the private one?

This design was kept by the author after studying Druid's implementation. Druid's author wenshao explained the trade-off in [issue #960](https://github.com/alibaba/druid/issues/960): the configuration side only needs to hold the public key, while the private key can be kept in the hands of a few people, limiting "who is able to produce ciphertext".

If your environment has a hard requirement on the key direction, replace the mechanism with your own `DataSourceInitEvent` implementation as shown above.

## Further reading

- [Full configuration reference](../guide/configuration) — the inheritance rules of `public-key` and `lazy`
- [Custom datasource provider](../custom/datasource-provider) — move the whole configuration to an external config center
- [FAQ quick reference](../faq) — the entry point for other frequent problems