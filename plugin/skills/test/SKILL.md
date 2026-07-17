---
name: test
description: Use when software behavior needs new or improved unit, integration, contract, end-to-end, edge-case, or regression tests, or when test coverage must be assessed.
---

# Test

## Purpose

Create the smallest reliable test set that proves important behavior and failure modes through stable public seams.

## Workspace protocol

Read `../../references/workspaces.md` before selecting or creating workflow artifacts. Follow it for persistence, consent, work-item resolution, and lifecycle; this skill owns only the task-specific behavior below.

## Inputs

- Behavioral contract, bug report, acceptance criteria, or changed code
- Existing test architecture, fixtures, commands, and coverage gaps
- Relevant runtime, data, and external-system boundaries

## Outputs

- Focused automated tests and minimal necessary test utilities
- Exact commands and results
- Documented gaps that cannot be tested safely or deterministically

## Rules

- Prefer behavior assertions over implementation-detail assertions.
- For a bug, first demonstrate the failure when practical, then verify the fix.
- Cover happy path, meaningful boundaries, errors, permissions, and regression risk in proportion to impact.
- Use real components where practical; mock only unstable or external boundaries.
- Eliminate flaky timing, shared-state leakage, order dependence, and production dependencies.
- Do not change production semantics merely to make a weak test pass.

## Decision-log updates

Record material test-boundary choices, intentionally excluded coverage, chosen substitutes for unavailable dependencies, and risk accepted because a scenario cannot be automated. Routine test cases do not need entries.
When durable state is approved, append material test-boundary, fidelity, or coverage-risk decisions to the selected work item's decisions.md; for a selected approved durable work item with an existing plan.md, update only relevant plan-item status and verification evidence for the performed testing scope, never invent unrelated work, and do not mark the work completed unless the workspace lifecycle criteria are satisfied; otherwise include material decisions and performed-scope verification in the final response.

## Escalate to the human

Escalate when validation requires production data or destructive actions, expected behavior is undefined, the available environment cannot provide meaningful proof, or the requested test conflicts with privacy, cost, or reliability constraints.
