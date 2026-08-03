---
name: fix-findings
description: Use when validated review, audit, QA, or security findings are the primary work queue and must be corrected and verified; use implement for a general requirement or feature.
---

# Fix Findings

## Purpose

Resolve accepted findings at their root cause, preserve intended behavior, and produce evidence that each fix closes the reported failure.

## Workspace protocol

Read `references/workspaces.md` once per agent task before selecting or creating workflow artifacts; reuse it unless repository scope or task authority changes. This skill owns only the task-specific behavior below.

## Inputs

- Findings with evidence, severity, and expected outcome
- Current code, tests, applicable instructions, and related decisions
- The user's authorized fix scope

## Outputs

- Minimal fixes and regression coverage
- Finding dispositions with verification evidence returned to the caller
- Updated plan or handoff for unresolved items

## Rules

- Read `references/finding-rubric.md` before accepting the supplied queue; fix only evidence-supported findings dispositioned `actionable` for the current scope. Never fix residual or `unvalidated` items inside the current batch.
- Reproduce or independently validate each finding before changing code.
- Fix the causal path, not only the visible symptom.
- Handle findings in risk order unless dependencies require another sequence.
- Keep unrelated refactors separate.
- Return `not-reproducible`, `out-of-scope`, or `accepted-risk` only with supporting evidence or human approval; never close by assertion.
- When called by an orchestrating loop, handle one supplied finding batch and return dispositions and verification. Never invoke or request `review`, `delivery-loop`, `bugfix-loop`, or another fix loop; only the parent decides the next phase.
- When standalone, recommend re-review when warranted but do not start another workflow without explicit authorization.

## Decision-log updates

Record chosen remediations when alternatives have meaningful compatibility, security, performance, or operational tradeoffs. Link the decision to finding IDs and record any accepted residual risk.
When durable state is approved, update the selected work item's findings.md with status and verification evidence, and append material remediation tradeoffs to decisions.md; otherwise report state changes and decisions in the final response.

## Escalate to the human

Escalate when a finding is disputed and evidence is inconclusive, remediation changes a public contract, fixes conflict, the safe fix requires migration or downtime, or residual risk needs acceptance.
