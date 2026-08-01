---
name: plan
description: Use when a software direction is defined enough to map multi-step, cross-cutting, risky, or long-running work into a verifiable execution plan; use brainstorm first when the direction is still open.
---

# Plan

## Purpose

Turn the request and repository evidence into a decision-ready spec and a concise, verifiable execution map. Plan to the level warranted by risk; do not add ceremony to trivial work.

## Workspace protocol

Read `references/workspaces.md` once per agent task before selecting or creating workflow artifacts; reuse it unless repository scope or task authority changes. This skill owns only the task-specific behavior below.

## Inputs

- User goal, constraints, and expected behavior
- Applicable `AGENTS.md`, current code, tests, docs, issues, and runtime evidence
- The selected work item's spec, plan, and decisions when durable state is active

## Outputs

- A requirement snapshot separating confirmed intent, observed behavior, inferences, and blocking questions
- A decision-ready spec and concise execution map with an Acceptance Contract of testable criteria
- For approved durable work, updated `spec.md` and `plan.md` in the selected work-item directory
- A short summary of assumptions and human decisions needed

## Rules

- Inspect the real code path before decomposing implementation work.
- Summarize the affected user or operator, desired observable behavior, must-have and must-not behavior, constraints, and success signals; separate confirmed intent, observed current behavior, inferences, and unknowns.
- Ask only when an unresolved choice changes user-visible behavior, acceptance criteria, scope, compatibility, or irreversible risk. Ask one to three highest-leverage questions per round; never ask for facts safely discoverable from the repository.
- Do not call a spec decision-ready or finalize its Acceptance Contract while such a blocking choice remains. Use `brainstorm` when the product or technical direction is still genuinely open.
- State reversible low-impact assumptions and proceed when they cannot materially change the contract.
- Define an Acceptance Contract with stable `AC-<number>` identifiers for every user-visible or externally observable outcome.
- For each acceptance criterion, state the observable outcome, verification boundary, and expected evidence; include at least one verification method.
- Link each execution-plan outcome to the affected acceptance IDs when applicable; do not invent acceptance criteria for purely enabling internal tasks.
- Add negative, compatibility, rollout, or rollback criteria only when material to the risk.
- Keep work items outcome-based and independently verifiable; avoid file-by-file pseudo-instructions.
- Include compatibility, migration, rollout, observability, and rollback work only when relevant.
- Do not edit production code while the request is planning-only.
- Re-plan when new evidence invalidates a premise rather than defending the old plan.

## Decision-log updates

Record scope interpretations, contract choices, rejected approaches with non-obvious tradeoffs, and material re-plans. Link each entry to the affected plan item.
When durable state is approved, append the decision to the selected work item's `decisions.md`; otherwise include it in the final response.

## Escalate to the human

Escalate when competing interpretations change user-visible behavior, a required system or owner is outside scope, risk cannot be bounded, or the plan requires destructive operations, production access, significant spend, or a product decision. Otherwise state reasonable assumptions and proceed.
