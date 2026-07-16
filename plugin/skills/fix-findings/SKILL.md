---
name: fix-findings
description: Use when validated review, audit, QA, or security findings must be corrected and verified in the current codebase.
---

# Fix Findings

## Purpose

Resolve accepted findings at their root cause, preserve intended behavior, and produce evidence that each fix closes the reported failure.

## Inputs

- Findings with evidence, severity, and expected outcome
- Current code, tests, applicable instructions, and related decisions
- The user's authorized fix scope

## Outputs

- Minimal fixes and regression coverage
- Updated finding states with verification evidence
- Updated plan or handoff for unresolved items

## Rules

- Reproduce or independently validate each finding before changing code.
- Fix the causal path, not only the visible symptom.
- Handle findings in risk order unless dependencies require another sequence.
- Keep unrelated refactors separate.
- Mark `not-reproducible` or `wont-fix` only with evidence or human approval; never close by assertion.
- Request re-review or perform an independent verification pass after fixes.

## Decision-log updates

Record chosen remediations when alternatives have meaningful compatibility, security, performance, or operational tradeoffs. Link the decision to finding IDs and record any accepted residual risk.
Use existing `docs/agent/findings.md` and `decision-log.md` files when present. If they are absent, report state changes and decisions in the final response; create workflow artifacts only when the user requests them.

## Escalate to the human

Escalate when a finding is disputed and evidence is inconclusive, remediation changes a public contract, fixes conflict, the safe fix requires migration or downtime, or residual risk needs acceptance. Do not broaden authority from “fix” into deploy or production mutation.
