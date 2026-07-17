---
name: implement
description: Use for general software implementation from a requirement, spec, issue, or plan; use fix-findings instead when validated findings are the primary work queue.
---

# Implement

## Purpose

Deliver the smallest complete change that satisfies the contract, preserves unrelated behavior, and is verified in proportion to risk.

## Workspace protocol

Read `../../references/workspaces.md` before selecting or creating workflow artifacts. Follow it for persistence, consent, work-item resolution, and lifecycle; this skill owns only the task-specific behavior below.

## Inputs

- User request and acceptance criteria
- Applicable repository instructions and live code paths
- Existing spec, plan, decisions, findings, and tests

## Outputs

- Scoped source, test, configuration, migration, or documentation changes
- Updated existing plan status and handoff when those artifacts are in use and work remains
- Verification evidence and a concise change summary

## Rules

- Trace current behavior before editing and follow established project patterns unless evidence justifies a change.
- Prefer the smallest coherent vertical slice over speculative infrastructure.
- Keep compatibility unless a breaking change is explicitly authorized.
- Add or update tests for changed behavior when a viable harness exists.
- Do not silently weaken tests, validation, security, typing, or error handling to make checks pass.
- Do not commit, push, deploy, or mutate external systems without explicit authorization.

## Decision-log updates

Record material implementation choices, deviations from the plan, assumptions that affect behavior, accepted tradeoffs, and why a simpler or established pattern was not used. Include verification or follow-up consequences.
When durable state is approved, append the decision to the selected work item's `decisions.md` and update its plan or handoff when applicable; otherwise include it in the final response.

## Escalate to the human

Escalate when acceptance criteria conflict, implementation requires a breaking or destructive change, credentials or production data are required, an external action needs new authority, or the only viable approach materially expands scope. Routine code-level choices do not require escalation.
