---
name: implement
description: Use for general software implementation from a requirement, spec, issue, or plan; use fix-findings instead when validated findings are the primary work queue.
---

# Implement

## Purpose

Deliver the smallest complete change that satisfies the contract, preserves unrelated behavior, and is verified in proportion to risk.

## Workspace protocol

Read `references/workspaces.md` once per agent task before selecting or creating workflow artifacts; reuse it unless repository scope or task authority changes. This skill owns only the task-specific behavior below.

## Inputs

- User request and acceptance criteria
- Applicable repository instructions and live code paths
- Existing spec, plan, decisions, findings, and tests

## Outputs

- Scoped source, test, configuration, migration, or documentation changes
- Updated existing plan status and handoff when those artifacts are in use and work remains
- Acceptance-linked verification evidence and a concise change summary

## Rules

- Trace current behavior before editing and follow established project patterns unless evidence justifies a change.
- Prefer the smallest coherent vertical slice over speculative infrastructure.
- Keep compatibility unless a breaking change is explicitly authorized.
- Before production edits, map each applicable acceptance criterion or changed observable behavior to its strongest practical proof. Use a compact Behavior-to-Proof table only for multiple criteria or material risk.
- When changed behavior is deterministic through a viable automated harness, prefer red-green-refactor: add the smallest behavioral test, run it and confirm the intended failure, implement the minimum change to pass, then refactor while the focused tests remain green.
- Treat an explicit user request for TDD or test-first development as a requirement. If a meaningful red phase is impossible, stop and explain the evidence gap instead of silently switching workflows.
- Do not manufacture a red phase for documentation, generated output, exploratory prototypes, behavior already covered by a passing test, or work without a viable deterministic harness. Use the strongest safe proof and disclose why test-first was not used.
- Add or update tests for changed behavior when a viable harness exists, then run broader checks in proportion to risk.
- Do not silently weaken tests, validation, security, typing, or error handling to make checks pass.

## Decision-log updates

Record material implementation choices, deviations from the plan, assumptions that affect behavior, accepted tradeoffs, and why a simpler or established pattern was not used. Include verification or follow-up consequences.
When durable state is approved, append the decision to the selected work item's `decisions.md` and update its plan or handoff when applicable; otherwise include it in the final response.

## Escalate to the human

Escalate when acceptance criteria conflict, implementation requires a breaking or destructive change, credentials or production data are required, or the only viable approach materially expands scope. Routine code-level choices do not require escalation.
