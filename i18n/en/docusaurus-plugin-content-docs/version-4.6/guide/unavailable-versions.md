# Unavailable Versions

Some versions have known problems and are strongly discouraged.

Using the latest version is highly recommended.

## The following versions are not recommended.

- v4.0.0 forces a dependency on mybatis and others.
- v3.6.0 / v3.6.1 have a broken dynamic resolution of `DS(#header.xx)`; harmless if you do not use it.
- v3.3.3 has a serious bug — the Advisor fails to start, so datasource switching stops working.
- v3.3.0 forces a dependency on seata at startup after packaging.
- v3.1.0 uses `NamedInheritableThreadLocal`, which breaks datasource switching under high concurrency.
- v2.3.3 nested datasource switching falls back to the primary datasource.
- v2.3.2 do not remember the exact bug; just do not use it.
- v2.3.1 do not remember the exact bug; just do not use it.
- v2.2.2 do not remember the exact bug; just do not use it.
