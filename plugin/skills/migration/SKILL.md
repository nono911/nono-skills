---
name: migration
description: Use when data, schema, API, dependency, platform, infrastructure, or runtime state must move between versions or systems while preserving service and recoverability.
---

# Migration

## Purpose

Design or execute a staged, observable, reversible transition with explicit compatibility windows, validation, and cleanup.

## Inputs

- Source and target states, invariants, data volume, traffic, and downtime tolerance
- Producers, consumers, schemas, deployment topology, ownership, and operational constraints
- Backfill, rollback, compliance, and retention requirements

## Outputs

- Migration phases, compatibility strategy, validation, monitoring, rollback, and cleanup criteria
- If execution is authorized: migrations, adapters, backfills, tests, and runbook changes
- Reconciliation evidence and remaining risk

## Rules

- Inspect all readers and writers before changing shared state.
- Prefer expand-migrate-contract for live systems: introduce compatibility, move traffic or data, verify, then remove old paths.
- Make reruns idempotent and define partial-failure recovery.
- Validate counts plus business invariants; do not treat command success as data correctness.
- Separate source implementation from production execution authorization.
- Preserve backups and rollback paths appropriate to impact.

## Decision-log updates

Record compatibility windows, cutover criteria, data ownership, transformation rules, rollback limits, accepted downtime, and irreversible checkpoints. Link evidence for completing each phase.

## Escalate to the human

Escalate before destructive or irreversible steps, production backfills or cutovers, downtime, data loss or semantic ambiguity, privacy-sensitive movement, or rollback beyond the stated tolerance.

