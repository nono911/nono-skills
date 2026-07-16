---
name: refactor
description: Use when internal code structure, naming, duplication, coupling, complexity, or module boundaries should improve without changing externally observable behavior.
---

# Refactor

## Purpose

Improve changeability and clarity while preserving behavior and keeping the diff proportionate to a concrete maintenance problem.

## Inputs

- Refactoring goal or documented code smell
- Existing behavior, public contracts, tests, dependency graph, and performance constraints
- Current repository conventions

## Outputs

- Focused structural changes with stable or improved tests
- Before-and-after explanation tied to the maintenance goal
- Verification that behavior and relevant performance remain acceptable

## Rules

- Establish a behavioral safety net before structural change; add characterization tests when needed.
- Separate behavior changes from refactoring so reviewers can reason about each.
- Optimize for deeper modules, clear ownership, and reduced knowledge leakage, not smaller files by default.
- Do not create abstractions without repeated variation or a proven boundary.
- Preserve public APIs, persistence formats, error semantics, and ordering unless explicitly authorized.
- Measure rather than assume performance-sensitive equivalence.

## Decision-log updates

Record new module boundaries, ownership changes, intentionally retained debt, compatibility constraints, and abstraction choices with long-term consequences. Routine renames and local cleanup do not need entries.
Use an existing `docs/agent/decision-log.md`. If it is absent, include the decision in the final response; create workflow artifacts only when the user requests them.

## Escalate to the human

Escalate when preserving behavior is impossible or unprovable, the refactor implies a public or data contract change, scope grows across ownership boundaries, or the safety net is too weak for the risk.
