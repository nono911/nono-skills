---
name: handoff
description: Use only when explicitly asked to prepare a continuation packet, session transfer, or ownership handoff so another agent or human can resume unfinished work without replaying the conversation.
---

# Handoff

## Purpose

Create a compact, evidence-linked continuation packet that lets the next owner resume safely from the current state.

## Workspace protocol

Read `references/workspaces.md` once per agent task before selecting or creating workflow artifacts; reuse it unless repository scope or task authority changes. This skill owns only the task-specific behavior below.

## Inputs

- The next owner's intended objective and any user-specified focus
- Current acceptance criteria, plan state, decisions, findings, and blockers
- Repository, worktree, branch, HEAD, diff, verification, and external-item state that can be safely inspected

## Outputs

- One continuation packet in chat, an explicitly requested path, or the selected work item's approved continuation artifact
- References to authoritative artifacts and the next executable action
- Suggested skills or required capabilities, without assuming a particular provider

## Rules

- Inspect current state rather than relying on conversation memory. Separate verified facts, inferences, and items the next owner must re-check.
- Include the objective, in-scope and out-of-scope boundaries, acceptance status, completed work, current repository state, material decisions, verification performed, unresolved findings or blockers, residual risks, and the next executable action.
- Name the active repository, worktree, branch, and HEAD when relevant. Report a dirty state and changed-file scope without pasting the full diff.
- Reference specs, plans, decisions, issues, commits, diffs, and evidence by path, identifier, or URL. Do not duplicate content already authoritative elsewhere.
- Suggest only skills or capabilities that fit the remaining work. Do not automatically start them, delegate, or claim that the next owner has them installed.
- Redact secrets, credentials, tokens, personal data, raw prompts, private reasoning, environment values, and unnecessary logs. Preserve only the minimum sanitized evidence needed to continue.
- Keep the packet concise but complete. Tailor it to the user's stated next-session purpose and omit history that does not change the next action.
- If an approved durable work item exists and work remains or ownership changes, update its continuation artifact. Otherwise return the packet in chat unless the user explicitly requested another path; do not create a new work-item workspace merely to store a handoff.
- Do not edit production source, stage, commit, push, merge, deploy, change external work items, or alter workflow status as part of preparing the handoff.

## Decision-log updates

Record a handoff decision only when ownership, scope, accepted risk, or the resumption strategy materially changes. The packet itself is not a substitute for an existing decision record.
When durable state is approved and work remains or ownership changes, update the selected work item's handoff.md with the continuation packet; otherwise return the packet in the final response.

## Escalate to the human

Escalate when multiple active work items could be the target, current repository state conflicts with recorded state, the requested destination would overwrite unrelated content, or safe continuation would require disclosing sensitive information. Otherwise state re-checks and proceed.
