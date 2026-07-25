---
name: database-design
description: Use when designing or changing persistent data models, schemas, constraints, indexes, transactions, tenancy, retention, or query patterns.
---

# Database Design

## Purpose

Create a data model that enforces domain invariants, serves proven access patterns, evolves safely, and has explicit consistency and lifecycle semantics.

## Workspace protocol

Read `references/workspaces.md` once per agent task before selecting or creating workflow artifacts; reuse it unless repository scope or task authority changes. This skill owns only the task-specific behavior below.

## Inputs

- Domain concepts, invariants, lifecycle, ownership, and access patterns
- Expected cardinality, volume, growth, concurrency, latency, tenancy, and retention
- Existing schema, queries, migrations, engine capabilities, and operational constraints

## Outputs

- Entities, relationships, keys, constraints, indexes, transaction boundaries, and lifecycle rules
- Query and write-path implications with migration considerations
- Validation approach for correctness, performance, backup, and recovery

## Rules

- Start with invariants and access patterns, not a table inventory.
- Define canonical ownership and avoid duplicated mutable truth without reconciliation.
- Use database constraints for enforceable invariants where appropriate.
- Design indexes from real query shapes and write cost; verify with plans or representative data when possible.
- Make tenancy, authorization boundaries, time zones, precision, deletion, audit, and retention explicit.
- Separate schema design from authorization to run production migrations.

## Decision-log updates

Record data ownership, normalization tradeoffs, identifiers, consistency model, transaction boundaries, retention, tenant isolation, and irreversible schema choices. Link migration and rollback implications.
When durable state is approved, append invariant, consistency, migration, and operational choices to the selected work item's decisions.md; otherwise include them in the final response.

## Escalate to the human

Escalate when domain truth is ambiguous, data classification or retention needs ownership, consistency and availability goals conflict, projected scale lacks evidence, or a design requires destructive migration, downtime, or irreversible data transformation.
