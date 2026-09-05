---
name: test
description: Use when software behavior needs automated unit, integration, contract, end-to-end, edge-case, or regression tests, or coverage assessment; use acceptance-verify for manual runtime QA of a running user journey.
---

# Test

## Purpose

Create the smallest reliable test set that proves important behavior and failure modes through stable public seams.

## Workspace protocol

Read `references/workspaces.md` once per agent task before selecting or creating workflow artifacts; reuse it unless repository scope or task authority changes. This skill owns only the task-specific behavior below.

## Inputs

- Behavioral contract, bug report, acceptance criteria, or changed code
- Existing test architecture, fixtures, commands, and coverage gaps
- Relevant runtime, data, and external-system boundaries

## Outputs

- Focused automated tests and minimal necessary test utilities
- Exact commands and results
- Acceptance-linked proof showing `RED`, `GREEN`, or a disclosed non-TDD limitation when implementation is in scope
- Documented gaps that cannot be tested safely or deterministically

## Rules

- Prefer behavior assertions over implementation-detail assertions.
- Map each applicable acceptance criterion or changed observable behavior to the test boundary that proves it; keep a trivial single outcome artifact-light.
- When paired with implementation and a viable deterministic harness, establish `RED` first with the smallest behavioral test and confirm it fails for the intended reason rather than setup error; after implementation, establish `GREEN` and keep it green through refactoring.
- Treat an explicit request for TDD or test-first development as a sequencing requirement. If the behavior already passes, refine the proof or report that no meaningful red phase exists; never break production code to manufacture failure.
- For a bug, first demonstrate the failure when practical, then verify the fix.
- Cover happy path, meaningful boundaries, errors, permissions, and regression risk in proportion to impact.
- Stop when the smallest reliable set proves the requested behavior and required checks pass. Broaden or repeat only when a failure, subsequent edit, or uncovered material risk justifies it.
- Use real components where practical; mock only unstable or external boundaries.
- Eliminate flaky timing, shared-state leakage, order dependence, and production dependencies.
- Do not change production semantics merely to make a weak test pass.

## Decision-log updates

Record material test-boundary choices, intentionally excluded coverage, chosen substitutes for unavailable dependencies, and risk accepted because a scenario cannot be automated. Routine test cases do not need entries.
When durable state is approved, append material test-boundary, fidelity, or coverage-risk decisions to the selected work item's decisions.md; for a selected approved durable work item with an existing plan.md, update only relevant plan-item status and verification evidence for the performed testing scope, never invent unrelated work, and do not mark the work completed unless the workspace lifecycle criteria are satisfied; otherwise include material decisions and performed-scope verification in the final response.

## Escalate to the human

Escalate when validation requires production data or destructive actions, expected behavior is undefined, the available environment cannot provide meaningful proof, or the requested test conflicts with privacy, cost, or reliability constraints.
