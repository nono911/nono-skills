---
name: implement
description: Use for general software implementation from a requirement, spec, issue, or plan; use fix-findings instead when validated findings are the primary work queue.
---

# Implement

## Purpose

Deliver the smallest complete change that satisfies the contract, preserves unrelated behavior, and is verified in proportion to risk.

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
Use an existing `docs/agent/decision-log.md`. If it is absent, include the decision in the final response; create workflow artifacts only when the user requests them.

## Escalate to the human

Escalate when acceptance criteria conflict, implementation requires a breaking or destructive change, credentials or production data are required, an external action needs new authority, or the only viable approach materially expands scope. Routine code-level choices do not require escalation.
