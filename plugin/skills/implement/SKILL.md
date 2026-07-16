---
name: implement
description: Use when the user asks to build, change, or complete software from a requirement, spec, issue, or existing plan.
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
- Updated plan status and handoff when work remains
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

## Escalate to the human

Escalate when acceptance criteria conflict, implementation requires a breaking or destructive change, credentials or production data are required, an external action needs new authority, or the only viable approach materially expands scope. Routine code-level choices do not require escalation.

