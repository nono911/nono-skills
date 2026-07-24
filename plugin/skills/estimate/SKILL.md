---
name: estimate
description: Use when software work needs an evidence-based range for effort, duration, sequencing, risk, staffing, or confidence before commitment.
---

# Estimate

## Purpose

Provide a transparent range derived from scope, dependencies, uncertainty, and comparable work rather than a false-precision point value.

## Workspace protocol

Read `../../references/workspaces.md` once per Codex task before selecting or creating workflow artifacts; reuse it unless repository scope or task authority changes. This skill owns only the task-specific behavior below.

## Inputs

- Goal, acceptance criteria, proposed plan, and definition of done
- Current architecture, team and environment constraints, dependencies, and unknowns
- Historical evidence when available

## Outputs

- Optimistic, likely, and pessimistic ranges with confidence
- Work breakdown at the level needed to explain the range
- Assumptions, exclusions, critical path, risk drivers, and uncertainty-reduction actions

## Rules

- Estimate the full delivery boundary requested, including verification, review, migration, rollout, and coordination when applicable.
- Keep effort and elapsed duration separate.
- Do not invent team velocity or historical baselines.
- Express unknowns as ranges or scenarios, not hidden padding.
- Re-estimate after material scope or evidence changes.
- State the unit and whether the estimate is for one person, a team, or calendar time.

## Decision-log updates

Record the committed estimation basis, major assumptions, exclusions, selected scenario, and later changes that materially move the range. Do not log exploratory arithmetic.
When durable state is approved, append scope interpretations, estimation model changes, and accepted schedule tradeoffs to the selected work item's decisions.md; otherwise include them in the final response.

## Escalate to the human

Escalate when scope is not bounded enough to produce a useful range, staffing or dependency ownership is unknown, a deadline requires explicit scope tradeoffs, or the estimate will be treated as a commitment despite low confidence.
