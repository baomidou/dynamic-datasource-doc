---
title: "Unavailable Versions"
description: "Some versions have known problems and are strongly discouraged. For new projects, use the latest version directly."
---

# Unavailable Versions

Some versions have known problems and are strongly discouraged. For new projects, use the latest version directly.

## Versions that are not recommended

| Version | Problem |
| :--- | :--- |
| v4.0.0 | Forces a dependency on MyBatis and others. |
| v3.6.0 / v3.6.1 | Broken dynamic resolution of `@DS("#header.xx")`; harmless if you do not use it. |
| v3.3.3 | Serious bug: the Advisor fails to start, so datasource switching stops working. |
| v3.3.0 | Forces a dependency on Seata at startup after packaging. |
| v3.1.0 | Uses `NamedInheritableThreadLocal`, which breaks datasource switching under high concurrency. |
| v2.3.3 | Nested datasource switching falls back to the primary datasource. |
| v2.3.2 / v2.3.1 / v2.2.2 | Contain bugs that can no longer be reproduced; avoid them. |

See [Version history and selection](/docs/guide/version-history) for upgrade guidance.