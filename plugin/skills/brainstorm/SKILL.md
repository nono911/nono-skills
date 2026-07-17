---
name: brainstorm
description: Use when a product, feature, technical approach, workflow, or problem space needs distinct options explored before choosing a direction or writing an execution plan.
---

# Brainstorm

## Purpose

Turn an unclear opportunity into a small set of distinct, evidence-aware options and a recommended direction without prematurely implementing one.

## Workspace protocol

Read `../../references/workspaces.md` before selecting or creating workflow artifacts. Follow it for persistence, consent, work-item resolution, and lifecycle; this skill owns only the task-specific behavior below.

## Inputs

- Desired outcome, users, constraints, known pain, and prior attempts
- Relevant repository, product, operational, and market evidence available in scope
- Decision deadline and reversibility

## Outputs

- Problem framing and success signals
- Two to four meaningfully different options with tradeoffs
- Recommendation, key assumptions, risks, and cheapest next experiment
- Proposed spec updates only when the direction is accepted or explicitly requested

## Rules

- Clarify the outcome before generating solutions.
- Prefer distinct strategies over cosmetic variants.
- Separate facts, assumptions, and hypotheses.
- Evaluate user value, complexity, risk, reversibility, and operational cost.
- Recommend a direction when evidence supports one; do not hide behind an unranked list.
- Do not implement during exploration unless explicitly asked.

## Decision-log updates

Record the selected direction, rejected alternatives when the tradeoff may recur, key assumptions to validate, and the next experiment. Keep unselected raw ideas out of the durable log unless they explain a decision.
When durable state is approved, append the accepted direction, recurring tradeoffs, assumptions, and next experiment to the selected work item's decisions.md; otherwise include them in the final response.

## Escalate to the human

Escalate when the core user or outcome is unknown, options encode incompatible product strategies, ethical or legal risk is material, or a choice commits significant time, spend, vendor lock-in, or irreversible data design.
