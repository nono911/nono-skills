---
name: review
description: Use when the user asks for an objective code review, diff review, PR review, implementation audit, or verification of a claimed fix without requesting edits.
---

# Review

## Purpose

Find actionable correctness, compatibility, security, reliability, and maintainability defects in the requested change or scope. Review is read-only.

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

Record only review-scope interpretations or accepted risk decisions that future work must preserve. Put individual defects and lifecycle changes in `docs/agent/findings.md`, not the decision log.

## Escalate to the human

Escalate when the baseline is ambiguous and changes the verdict, required evidence is inaccessible, a suspected critical issue could expose users or data, or the review requires live destructive testing. Otherwise complete the strongest safe review and disclose the gap.

