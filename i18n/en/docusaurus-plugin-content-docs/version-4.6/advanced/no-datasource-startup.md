# Startup Without Datasources

## Overview

Scenario: some systems need no datasource at all when starting up, and add every datasource dynamically afterwards.

## Configuration

Basically nothing has to be configured; you may configure global Druid / HikariCP parameters if needed.

See the corresponding chapters for global Druid and HikariCP parameters.

```yaml
spring:
  datasource:
    dynamic:
      primary: master # the default datasource or datasource group, defaults to master
      strict: false # strict mode, off by default. When on, an unmatched datasource name throws instead of falling back to the default datasource.
```

Because no primary datasource can be matched, you will see a log line like this at startup.

```text
dynamic-datasource initial loaded 0 datasource,Please add your primary datasource or check your configuration
```

Starting without datasources usually goes together with adding/removing datasources dynamically after startup, described in the advanced usage chapter.
