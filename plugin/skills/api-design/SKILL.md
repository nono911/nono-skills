---
name: api-design
description: Use when creating or changing an HTTP, RPC, event, webhook, library, or internal service contract and consumers need a stable, evolvable interface.
---

# API Design

## Purpose

Define a consumer-centered contract with precise semantics, failure behavior, authorization, compatibility, and operability before or alongside implementation.

## Workspace protocol

Read `references/workspaces.md` once per agent task before selecting or creating workflow artifacts; reuse it unless repository scope or task authority changes. This skill owns only the task-specific behavior below.

## Inputs

- Consumer use cases, domain language, invariants, and quality constraints
- Existing APIs, conventions, clients, schemas, auth model, and versioning policy
- Expected scale, consistency, latency, and lifecycle needs

## Outputs

- Contract for operations, messages, fields, errors, auth, pagination, idempotency, and compatibility as applicable
- Examples for normal, boundary, and failure cases
- Implementation and migration considerations without speculative internals

## Rules

- Model domain capabilities, not current database tables or UI screens.
- Define presence, nullability, units, ordering, time semantics, identifiers, and error meanings explicitly.
- Design retries, idempotency, concurrency, pagination, rate limits, and partial failure where relevant.
- Apply least privilege and avoid leaking internal or sensitive data.
- Prefer additive evolution; identify every known consumer before breaking changes.
- Do not implement unless requested.

## Decision-log updates

Record public contract choices, compatibility policy, naming or semantic decisions likely to recur, idempotency and consistency guarantees, and rejected alternatives with consumer impact.
When durable state is approved, append contract choices and compatibility consequences to the selected work item's decisions.md; otherwise include them in the final response.

## Escalate to the human

Escalate when consumer requirements conflict, authorization ownership is unclear, semantics imply legal or financial commitments, a breaking change lacks a migration path, or reliability and consistency tradeoffs need product or platform ownership.
