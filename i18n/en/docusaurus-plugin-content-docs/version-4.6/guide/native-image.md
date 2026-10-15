# GraalVM Native Image

## Overview

Since Spring Boot 3, compiling an application into a GraalVM Native Image is a common way to cut startup time and memory footprint. In a multi-datasource scenario the obstacle is **heavy reflection**: pool creation, property binding and `@DS` annotation resolution all rely on runtime reflection that AOT compilation cannot infer.

This framework ships official **GraalVM Reachability Metadata**, published as a separate artifact, covering:

- the framework itself (the reflection points involved in `@DS` resolution, pool assembly and property binding)
- Druid
- HikariCP

## How to use it

**Starter users normally need to do nothing.** The metadata has been submitted to the official [GraalVM Reachability Metadata Repository](https://github.com/oracle/graalvm-reachability-metadata), and `native-image-maven-plugin` / `org.graalvm.buildtools.native` pulls it automatically.

If you need to add the artifact manually:

```xml
<dependency>
    <groupId>com.baomidou</groupId>
    <artifactId>dynamic-datasource-native-metadata</artifactId>
    <version>${version}</version>
    <classifier>metadata</classifier>
</dependency>
```

## Building and testing

```bash
# build the native image
./gradlew nativeCompile

# run the native tests (the CI gate)
./gradlew nativeTest
```

The Gradle-side AOT configuration, toolchain and release process are described in the main repository's [CONTRIBUTING.md](https://github.com/baomidou/dynamic-datasource/blob/master/CONTRIBUTING.md).

## Notes

:::warning[Always run your integration tests on the native image]
The metadata only covers the framework and the two pools above. You may still need to add a `reflect-config.json` in your own project when:

- you use **another pool** (BeeCP, C3P0, Oracle UCP) or a custom `DataSourceCreator`
- a custom `DsProcessor` uses SpEL expressions the framework cannot infer statically
- business code accesses datasource configuration objects reflectively

On a `ClassNotFoundException` or a reflection-related `NativeImageError`, locate it with `--trace-class-initialization` first, then add the configuration.
:::

Other boundaries:

- In a native image the **JDBC driver's** own metadata must be provided by the driver (mainstream drivers such as MySQL Connector/J already support it), so check your driver version.
- This project does **not** ship a complete JPMS `module-info`; the stable contract for the module name is the `Automatic-Module-Name` in the manifest.
- `nativeTest` runs on every commit, so official artifacts are always verified against a native image before release — problems usually come from your **custom extensions**.
