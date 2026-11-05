---
name: retro
description: Use when the user asks to retrospect on an agent session or recurring workflow friction and improve future runs; ordinary completion or code review alone does not trigger it.
---

# Retro

## Purpose

Turn observed session friction into a small set of evidence-backed improvements to the agent's working environment.

## Workspace protocol

Read `references/workspaces.md` once per agent task before selecting or creating workflow artifacts; reuse it unless repository scope or task authority changes. This skill owns only the task-specific behavior below.

## Inputs

- The requested session or work item; default to the current task
- Available task history, user corrections, repository instructions, checks, and tooling
- Relevant local run records or insights when present; ordinary work needs no managed run

## Outputs

- Usually one to three worthwhile recommendations, or no change when evidence does not justify one
- For each: observed friction and source, supported or uncertain cause, smallest proposed change and target, expected benefit, and how to verify it
- Applied changes and actual checks only when remediation is also requested; otherwise recommendations

## Rules

- Inspect evidence for the requested scope. Use current task context first; search older session logs only when the user selects that history. State coverage gaps and never imply access to missing conversations.
- Use existing run summaries and insights as advisory evidence. A review count or provider name alone does not establish a cause, model quality, wasted tokens, or a repeated pattern.
- Look for costly navigation, missed checks, contradictory or ineffective instructions, repeated corrections, unnecessary tool work, and missing information. Investigate only categories supported by the session; do not fill a checklist.
- Inspect relevant existing scripts, CI, documentation, and skills before suggesting additions. Prefer wiring a useful existing check, adding a navigation pointer, or removing a conflicting instruction over new machinery.
- Use deterministic checks for mechanically testable failures and concise guidance for judgment. One incident can justify a narrow fix, but not a universal rule or a claim of recurrence.
- Rank by observed impact, evidence strength, recurrence, and cost to change. Recommendations are improvement proposals, not automatically actionable code-review findings.
- A retrospective request authorizes inspection and recommendations. If the user also requests fixes, implement scoped reversible environment improvements and verify them without asking again for that same authority. Changes to global instructions, unrelated repositories, external systems, permissions, or business decisions need their own scope.
- Keep reports in chat unless a durable artifact is requested or already approved. Retain only sanitized evidence links and short observations; do not copy full transcripts, source, secrets, personal data, or private reasoning into memory or run records.
- Measure comparable work after an accepted change using available outcome, correction, tool-call, duration, or token data. Label expected benefits as hypotheses until measured; do not claim model training or automatic learning.
- Do not start another delivery or review loop, extend budgets, reopen findings, or silently rewrite skills. A caller may offer a retro after repeated friction or exhaustion; starting it still requires a user request.

## Decision-log updates

Record accepted improvements and the evidence and measurement that justify retaining or reverting them. Routine observations need no permanent log.
When durable state is approved, append accepted environment changes, supporting evidence, and follow-up measurements to the selected work item's decisions.md; otherwise return recommendations in chat.

## Escalate to the human

Ask only when the target session is ambiguous, missing evidence changes the recommendation, proposals change business or architecture decisions, or a requested fix exceeds current authority. Continue with clearly scoped observations when history is incomplete.
