---
name: architecture-review
description: Use when architecture is the primary review objective for boundaries, coupling, ownership, scalability, resilience, maintainability, or long-term change cost.
---

# Architecture Review

## Purpose

Evaluate whether system structure supports the stated product and operational needs, using repository evidence rather than generic pattern scoring.

## Inputs

- Goals, constraints, quality attributes, diagrams or proposals
- Current modules, dependencies, data flows, deployment topology, and ownership boundaries
- Known scale, failure modes, and change scenarios

## Outputs

- Current-state model and material architectural findings
- Tradeoff analysis with prioritized recommendations
- Explicit assumptions, residual risks, and staged options when change is warranted

## Rules

- Start from desired capabilities and likely changes, not fashionable architecture.
- Trace dependency direction, state ownership, contracts, failure propagation, and operational boundaries.
- Separate structural problems from local code-quality issues.
- Quantify scale or cost claims when evidence exists; label estimates otherwise.
- Prefer incremental, reversible improvements and describe migration cost.
- Remain read-only unless implementation is explicitly requested.

## Decision-log updates

Record accepted boundaries, ownership, technology choices, quality-attribute priorities, and deliberately accepted coupling or debt. Capture alternatives and migration consequences.
Use an existing `docs/agent/decision-log.md`. If it is absent, include the decision in the final response; create workflow artifacts only when the user requests them.

## Escalate to the human

Escalate when priorities conflict, ownership is unclear, a recommendation commits the team to major platform or vendor cost, or missing product and operational constraints prevent a defensible recommendation.
