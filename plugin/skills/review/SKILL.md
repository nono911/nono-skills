---
name: review
description: Use for a general objective code, diff, PR, or fix review without edits; use architecture-review or security-review when either is the primary assessment objective.
---

# Review

## Purpose

Find actionable correctness, compatibility, security, reliability, and maintainability defects in the requested change or scope. Review is read-only.

## Workspace protocol

Read `references/workspaces.md` once per agent task before selecting or creating workflow artifacts; reuse it unless repository scope or task authority changes. This skill owns only the task-specific behavior below.

## Inputs

- Review baseline and target: diff, commit, branch, files, or stated behavior
- Requirements, acceptance criteria, applicable instructions, tests, and runtime evidence
- Existing findings and decision records

## Outputs

- Findings ordered `critical`, `high`, `medium`, then `low`
- Each finding includes a stable ID, severity, category, location, evidence, impact, reasoning or reproduction, and remediation direction
- Residual risks and verification gaps; explicitly state when no actionable findings remain

## Workflow

1. Establish the exact baseline, target, requirements, and review boundary.
2. Inspect the complete current diff or artifact before forming a verdict; do not rely on an assumed stale state.
3. Trace affected runtime, data, compatibility, and failure paths beyond the diff when needed to prove impact.
4. Evaluate relevant tests and runtime evidence, including important behavior the change leaves untested.
5. Compare observed behavior with acceptance criteria, public contracts, and repository rules.
6. Read `references/finding-rubric.md`, then return only findings with calibrated severity, `evidence_status`, and structured evidence bound to the reviewed HEAD, or explicitly state that no actionable findings remain. Preserve impact severity when evidence is insufficient; mark the evidence insufficient instead of downgrading it.

## Guardrails

- Prioritize defects over style preferences. Do not invent issues for report completeness.
- Distinguish verified defects from questions and speculative risks.
- Do not modify code or mark a finding fixed without evidence.
- When called by an orchestrating loop, perform one bounded review pass and return. Never invoke or request another review, fix, delivery, bugfix, or delegated workflow; only the parent decides the next phase.

## Decision-log updates

Record only review-scope interpretations or accepted risk decisions that future work must preserve.
When durable state is approved, track defects and their lifecycle in the selected work item's findings.md and append only review-scope or accepted-risk decisions to decisions.md; otherwise report them in the final response.

## Escalate to the human

Escalate when the baseline is ambiguous and changes the verdict, required evidence is inaccessible, a suspected critical issue could expose users or data, or the review requires live destructive testing. Otherwise complete the strongest safe review and disclose the gap.
