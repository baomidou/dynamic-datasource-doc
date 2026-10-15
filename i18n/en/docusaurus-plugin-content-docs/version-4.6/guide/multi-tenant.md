# Multi-Tenancy Best Practices

## Overview

There are many multi-tenancy approaches
[https://zhuanlan.zhihu.com/p/143737554](https://zhuanlan.zhihu.com/p/143737554).
We are a multi-datasource framework and only support the "different databases" model.

## Key points

Say we are designing a multi-tenant system with one database per city: `shanghai`, `chengdu`, `guangzhou` so far.

How do different tenants get routed to their database dynamically?

If a single request never touches more than one tenant, the interceptor from the no-annotation approach is recommended.

After login, return the tenant information to the front end, and let every later request carry a header such as `tenant: shanghai`. The interceptor sets the datasource manually, so all subsequent requests use the `shanghai` database.

If other databases are involved as well, that is fine too: keep the same approach and switch with `@DS` wherever another database is needed.

As you can see the author leans towards the no-annotation approach, because `@DS` is AOP-based overall and carries more overhead and more code intrusion than an interceptor.

If you dislike interceptors and prefer `@DS`, read **Advanced Usage - dynamic datasource resolution**.

## Scenarios

Each scenario is a step up from the previous one.

## Scenario 1: few, fairly fixed tenants

If your tenants are stable — maybe one new tenant every six months — just configure them in yml as usual.

## Scenario 2: many but still fairly fixed tenants

Documentation to look at
1. Customization - custom datasource provider
2. Advanced usage - startup without datasources

Combining the two: you can start with no datasource configured and load them all from a database dynamically, which keeps the yml small.

## Scenario 3: many, non-fixed tenants

Some systems need tenants added and removed dynamically.

Documentation to look at
Advanced usage - adding/removing datasources at runtime

With that you can add and remove datasources while the system is running.

## Scenario 4: many, non-fixed tenants across multiple services

In larger systems, a single machine serving all tenants is no longer enough and the system has to be split into several services. At that point dynamic addition raises a question: an "add datasource" request is routed to only one instance, so how do all machines add the datasource?

Documentation to look at
Advanced usage - manual multi-datasource injection
Knowledge base - auxiliary knowledge

The answer: **combine it with an interceptor.**

Keep a non-tenant primary database with a table holding the tenant information; adding a tenant means inserting its database information into that tenant table.

Inject the multiple datasources manually in the interceptor: parse the tenant header sent by the front end, `guangzhou` for instance. Then read all currently known database names from the multi-datasource, check whether it exists, and if not look it up in the primary database and add it dynamically.

That way every machine gradually loads the new tenant's datasource.

But how do all services drop a datasource? Try combining it with a Redis listener: every machine listens for one event message.
