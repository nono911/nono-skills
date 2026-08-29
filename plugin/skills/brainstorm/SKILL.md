---
name: brainstorm
description: Use when a product, feature, technical approach, workflow, or problem space needs proportionate, distinct options explored before a direction is chosen; use plan after the direction and constraints are sufficiently settled.
---

# Brainstorm

## Purpose

Turn an unclear opportunity into the smallest useful set of evidence-aware options and a proportionate recommended direction without prematurely implementing one.

## Workspace protocol

Read `references/workspaces.md` once per agent task before selecting or creating workflow artifacts; reuse it unless repository scope or task authority changes. This skill owns only the task-specific behavior below.

## Inputs

- Desired outcome, users, constraints, known pain, and prior attempts
- Relevant repository, product, operational, and market evidence available in scope
- Decision deadline and reversibility

## Outputs

- A requirement snapshot separating confirmed intent, evidence-backed inference, and open questions
- Problem framing and success signals
- The smallest viable direction plus only the materially distinct alternatives needed to make the decision
- Recommendation, key assumptions, risks, and cheapest next experiment
- A concise `Not now` boundary with concrete reconsideration triggers only when likely scope expansion needs containment
- Proposed spec updates only when the direction is accepted or explicitly requested

## Rules

- Inspect available user statements and in-scope evidence before questioning. Repository evidence shows current behavior, not desired user intent.
- Establish the affected user or operator, problem or outcome, success signal, must-have and must-not behavior, and material constraints before ranking options.
- Mark each material requirement as confirmed, inferred, or unknown.
- Ask only when an unknown would change user-visible outcomes or option ranking. Ask one to three highest-leverage questions per round; never ask for facts safely discoverable from the repository.
- State a reversible low-impact assumption and proceed when it cannot materially change the recommendation. Do not recommend while the core user, outcome, or success signal remains unknown.
- Reflect the settled requirement snapshot before presenting options.
- Prefer distinct strategies over cosmetic variants.
- Default to the smallest sufficient direction that satisfies the confirmed outcome and constraints; prefer reuse of existing product and technical paths before proposing new machinery.
- Scale the option set to the decision. Do not invent alternatives to fill a quota; for a small reversible choice, one recommendation and one brief materially different alternative are enough.
- Every recommended component must map to a confirmed requirement, in-scope evidence, or material current risk. Reject platform-building, generalized frameworks, and future-proofing justified only by hypothetical scale or unspecified reuse.
- Evaluate user value, complexity, risk, reversibility, and operational cost.
- Recommend a direction when evidence supports one; do not hide behind an unranked list.
- Keep optional enhancements and future possibilities outside the recommendation. Mention them only as `Not now` with a concrete signal that would justify reconsideration.
- Do not implement during exploration unless explicitly asked.

## Decision-log updates

Record the selected direction, rejected alternatives when the tradeoff may recur, key assumptions to validate, and the next experiment. Keep unselected raw ideas out of the durable log unless they explain a decision.
When durable state is approved, append the accepted direction, recurring tradeoffs, assumptions, and next experiment to the selected work item's decisions.md; otherwise include them in the final response.

## Escalate to the human

Escalate when the core user or outcome is unknown, options encode incompatible product strategies, ethical or legal risk is material, or a choice commits significant time, spend, vendor lock-in, or irreversible data design.
