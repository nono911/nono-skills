---
name: review
description: Use for a general objective code, diff, PR, or fix review without edits; use security-review when security is the primary assessment objective.
---

# Review

## Purpose

Find actionable correctness, compatibility, security, reliability, and maintainability defects in the requested change or scope. Review is read-only.

## Workspace protocol

Read `../../references/workspaces.md` before selecting or creating workflow artifacts. Follow it for persistence, consent, work-item resolution, and lifecycle; this skill owns only the task-specific behavior below.

## Inputs

- Review baseline and target: diff, commit, branch, files, or stated behavior
- Requirements, acceptance criteria, applicable instructions, tests, and runtime evidence
- Existing findings and decision records

## Outputs

- Findings ordered `critical`, `high`, `medium`, then `low`
- Each finding includes location, evidence, impact, reasoning or reproduction, and remediation direction
- Residual risks and verification gaps; explicitly state when no actionable findings remain

## Rules

- Establish the exact review boundary and inspect the current artifact, not an assumed stale state.
- Trace affected runtime and data paths beyond the diff when needed to prove impact.
- Prioritize defects over style preferences. Do not invent issues for report completeness.
- Distinguish verified defects from questions and speculative risks.
- Do not modify code or mark a finding fixed without evidence.

## Decision-log updates

Record only review-scope interpretations or accepted risk decisions that future work must preserve.
When durable state is approved, track defects and their lifecycle in the selected work item's findings.md and append only review-scope or accepted-risk decisions to decisions.md; otherwise report them in the final response.

## Escalate to the human

Escalate when the baseline is ambiguous and changes the verdict, required evidence is inaccessible, a suspected critical issue could expose users or data, or the review requires live destructive testing. Otherwise complete the strongest safe review and disclose the gap.
