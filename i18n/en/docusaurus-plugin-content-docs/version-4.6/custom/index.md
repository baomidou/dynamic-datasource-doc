---
title: "Customization"
description: "This chapter explains how to extend the framework's default behavior."
---

# Customization

This chapter explains how to extend the framework's default behavior.

| Extension point | Description |
| :--- | :--- |
| **Custom annotation** | The default `@DS` annotation is not enough and you want your own annotation. See [Custom annotation](/docs/custom/annotation). |
| **Custom datasource provider** | The default provider is based on yml/properties configuration; the framework supports loading and initializing datasources from several places at the same time. Commonly used in multi-tenant systems to load the datasources of different tenants from a single tenant registry database. See [Custom datasource provider](/docs/custom/datasource-provider). |
| **Custom load balancing strategy** | The built-in choices are round-robin and random. Extension is supported. See [Custom load balancing strategy](/docs/custom/load-balance-strategy). |
| **Custom aspect** | Switch datasources **without annotations**, driven by configuration. For example, every `Service` method under a given package whose name starts with `select*` goes to `slave`, while those starting with `add*` go to `master`. See [No-annotation approach](/docs/no-annotation). |