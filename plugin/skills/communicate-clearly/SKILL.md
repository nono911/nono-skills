---
name: communicate-clearly
description: Use when the primary task is to explain, summarize, compare options, report status, request a decision, rewrite human-facing text, or draft or update work items such as epics, stories, issues, tickets, tasks, and subtasks; do not activate solely to restyle implementation, review, testing, or debugging work.
---

# Communicate Clearly

## Purpose

Make human-facing communication direct, audience-appropriate, and as brief as possible without dropping facts needed for a decision or action.

## Workspace protocol

Read `references/workspaces.md` once per agent task before selecting or creating workflow artifacts; reuse it unless repository scope or task authority changes. This skill owns only the task-specific behavior below.

## Inputs

- The user's question, requested language, depth, format, and intended audience
- Verified facts, relevant evidence, uncertainty, blockers, and available next actions
- Existing project terminology and the active platform schema when drafting work items

## Outputs

- A direct answer, explanation, comparison, status report, or decision request
- A human-readable work-item draft or authorized update when that is the primary task
- Explicit uncertainty and next action only when they materially help the reader

## Rules

- Identify what the reader needs to understand, decide, or do. Follow the user's requested language, depth, tone, and format over defaults in this skill.
- Lead with the answer, outcome, or requested decision. Follow with only decision-relevant evidence, uncertainty, blockers, and a next action that actually exists.
- Answer every material part of the request exactly once. Do not repeat the prompt, narrate routine tool use, add generic introductions or closings, or duplicate a conclusion in a second summary.
- Keep simple answers to a sentence or short paragraph. Add headings, lists, tables, examples, or background only when they materially improve comprehension.
- Distinguish observed facts, supported inferences, assumptions, and unknowns. Do not expose private chain-of-thought; provide concise reasons and evidence instead.
- Use established repository or domain vocabulary when available. Define an ambiguous term once rather than replacing it with invented jargon.
- Preserve exact code, commands, structured data, logs, quotations, legal text, and user-designated verbatim content. Never shorten away safety, compatibility, cost, or uncertainty that changes a decision.
- Keep progress updates brief and new-information-only. Make the final response self-contained even when earlier updates are collapsed.
- When work items are the primary output, read `references/work-items.md`. Shape the content here; let the active project-management connector discover and apply the platform's native schema.
- External creation or mutation requires the user's scoped request and a capable connector. Without both, produce a draft and state that no external item changed.
- Compose with the technical skill that owns implementation, review, testing, or debugging. This skill owns human-facing communication, not the underlying engineering operation.

## Decision-log updates

Record only wording or framing choices that materially change scope, ownership, acceptance, risk, or the action expected from a stakeholder. Routine editing and formatting need no decision entry.
When durable state is approved, append only communication choices that change scope, ownership, acceptance, or stakeholder action to the selected work item's decisions.md; otherwise return the communication in the final response.

## Escalate to the human

Escalate when the intended audience or requested decision is unknown and would materially change the message, supplied facts conflict, a required caveat cannot be preserved in the requested format, or an external target or mutation scope is ambiguous. Do not escalate for routine wording choices.
