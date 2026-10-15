# Transaction Concepts

### What is a transaction?

A **transaction** is the smallest unit of work in database operations: a series of operations executed as a single logical unit of work. These operations are submitted to the system as one whole — either all of them run, or none of them do. A transaction is an indivisible set of operations (a logical unit of work).

**The four properties of a transaction:**
> 1. Atomicity
> A transaction is the logical unit of work of the database; every operation it contains is either all done or all not done.
> 2. Consistency
> The result of a transaction must take the database from one consistent state to another. So when the database contains only the results of successfully committed transactions, it is said to be in a consistent state. If a failure occurs while the database system is running and some transactions are interrupted before completing, part of the changes those unfinished transactions made may already have been written to the physical database, which leaves the database in an incorrect, or inconsistent, state.
> 3. Isolation
> The execution of one transaction cannot be disturbed by other transactions. In other words, the operations and data used inside one transaction are isolated from other concurrent transactions, and concurrently executing transactions cannot interfere with each other.
> 4. Durability
> Also called permanence: once a transaction is committed, its changes to the data in the database should be permanent. Subsequent operations or failures must not have any effect on its result.

### Handling transactions with plain JDBC.

```java
try{
    connection.setAutoCommit( false);
      // here the connection performs a series of operations on the database, CRUD
    connection.commit();// commit when no exception occurred
}catch(Exception ex){
    connection.rollback();  // roll back on exception
}finally{
    connection.setAutoCommit( true);
}
```

This is the core of a transaction: all operations must succeed together, and any error rolls everything back.

### Handling transactions with Spring.

Opening a transaction in Spring is simple: add the `@Transactional` annotation to the method or class that needs one.

```java
@Transactional
public void test() {
      Aservice.dosometing();
      Bservice.dosometing();
}
```

With `@Transactional`, **Spring guarantees that the same connection is reused for the whole transaction.**
With the default configuration, any `RuntimeException` raised inside the transaction triggers a rollback.
