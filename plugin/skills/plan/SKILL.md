---
name: plan
description: Use when a software direction is defined enough to map multi-step, cross-cutting, risky, or long-running work into a concrete execution plan before implementation.
---

# Plan

## Purpose

Turn the request and repository evidence into a decision-ready spec and a concise, verifiable execution map. Plan to the level warranted by risk; do not add ceremony to trivial work.

## Inputs

- User goal, constraints, and expected behavior
- Applicable `AGENTS.md`, current code, tests, docs, issues, and runtime evidence
- Existing `docs/agent/spec.md`, `plan.md`, and `decision-log.md`

## Outputs

- A decision-ready spec and concise execution map with testable acceptance criteria
- When the artifact files already exist or the user requests durable planning, updated `docs/agent/spec.md` and `docs/agent/plan.md`
- A short summary of assumptions and human decisions needed

## Rules

- Inspect the real code path before decomposing implementation work.
- Separate confirmed facts, inferences, and unresolved choices.
- Keep work items outcome-based and independently verifiable; avoid file-by-file pseudo-instructions.
- Include compatibility, migration, rollout, observability, and rollback work only when relevant.
- Do not edit production code while the request is planning-only.
- Re-plan when new evidence invalidates a premise rather than defending the old plan.

## Decision-log updates

Record scope interpretations, contract choices, rejected approaches with non-obvious tradeoffs, and material re-plans. Link each entry to the affected plan item.
Use an existing `docs/agent/decision-log.md`. If it is absent, include the decision in the final response; create workflow artifacts only when the user requests them.

## Escalate to the human

Escalate when competing interpretations change user-visible behavior, a required system or owner is outside scope, risk cannot be bounded, or the plan requires destructive operations, production access, significant spend, or a product decision. Otherwise state reasonable assumptions and proceed.
