# Customization

**Custom annotations**: the default `DS` annotation is not enough and you want your own annotation.
*****
**Custom datasource provider**: the default provider is based on yml or properties configuration; the framework supports loading and initializing datasources from several places at the same time. It is commonly used in multi-tenant systems to load the datasources of different tenants from a single tenant registry database.
*****
**Custom load balancing strategy**: the usual choices are round-robin and random. Extension is supported.
*****
**Custom aspect**: switching datasources **without annotations**, driven by configuration.
For example: every service method under a given package whose name starts with `select*` goes to the slave database, while those starting with `add*` go to master.
*****
