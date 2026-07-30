---
name: delivery-loop
description: "Use only when explicitly invoked to deliver a feature in approved isolated Git worktrees through orchestrated implementation, optional delegated agents, local commits, fresh read-only review rounds, validated fixes, and re-review until clean."
---

# Delivery Loop

## Purpose

Deliver a feature through an isolated implement-review-fix loop.

## Workspace protocol

Read `references/workspaces.md` once per agent task before selecting or creating workflow artifacts; reuse it unless repository scope or task authority changes. This skill owns only the task-specific behavior below.

## Companions and delegation

- Refer to companion skills by their frontmatter names, such as `implement` or `review`. Invoke them through the host's native skill mechanism and any namespace assigned at installation; never assume a literal invocation prefix.
- Core companions are `implement`, `review`, and `fix-findings`. Use `plan` when durable multi-step planning is warranted, `acceptance-verify` when a runnable user journey is material, and security, architecture, or migration specialists only when the changed risk requires them.
- Confirm required companions are available where used. Accept a fallback only when it preserves authority and read/write boundaries.
- Keep the original agent as orchestrator. Delegate only bounded work that benefits from separate context; keep small or coupled work local.
- At the approval gate, offer `Native subagents (default)`, `External CLI agents`, and `Hybrid`.
- If the user approves without selecting a choice, use Native subagents.
- Do not probe, propose, or invoke external providers unless the user explicitly selects External or Hybrid, names an external provider, or asks for external-agent options.
- Read `references/agent-delegation.md` only after External or Hybrid is selected, then follow its provider, consent, isolation, result, and fallback contracts.
- Require explicit per-run consent before sending repository content to an external provider.
- Never invoke an external provider that owns the current host task; use that host's native agent mechanism instead.
- Use one writer per file-ownership boundary, isolate every delegated writer in an approved child worktree, and keep integration, verification, Git operations, and official commits with the orchestrator.

## Inputs

- Feature request, acceptance criteria, repository instructions, and required checks
- Base revision, worktree state, unrelated changes, Git identity rules, and current authority
- Execution mode and approved provider limits when applicable

## Outputs

- One approved isolated implementation and commit
- Up to five sequential review-fix rounds, stopping when clean
- A second commit only for validated later fixes that pass fresh review
- Verification, delegation, commit, and residual-risk evidence

## Approval and isolation

- Inspect repository scope, checkout, worktrees, base SHA, HEAD, and all change states before editing.
- If the task already runs in a host-managed worktree, reuse it and never create a nested worktree. A detached HEAD is valid until the user chooses to create a branch or hand off the task; do not move the task or check the same branch out elsewhere.
- Otherwise reuse the checkout only when it is a dedicated worktree for this feature with an unambiguous base.
- If neither reuse case applies, propose the exact base revision, branch, and worktree path, then request one scoped approval covering their creation and up to two local commits unless the initial request already authorizes every action.
- Invoking `delivery-loop` alone is not worktree or commit authority. Only an explicit initial authorization for the exact proposed actions satisfies those gates.
- When reusing any worktree, request only missing authority for up to two local commits.
- If the user declines required worktree creation, do not continue this loop in the current checkout. Ask whether to switch to ordinary implementation there with explicit write and commit authority or stop; the switched path is outside delivery-loop completion.
- Approval in this workflow covers only the proposed worktree or branch creation and up to two local commits; push, merge, deploy, external mutation, task handoff, worktree removal, and branch deletion remain separate actions.
- Preserve unrelated changes; never stash, reset, move, include, or delete them. Follow repository instructions and verify required remote and identity conditions before each commit.
- Do not copy ignored files or secrets or change host worktree rules without authorization.
- Before implementation, confirm the host can create a fresh isolated read-only reviewer agent or subagent. If it cannot, disclose the limitation before editing and ask whether to switch to ordinary implementation with a non-independent self-review or stop. That degraded path is outside delivery-loop completion and must never report `CLEAN` or independently reviewed.

## Implement and commit

1. Create a CLI worktree and branch only when approved and required; otherwise remain in the approved isolated environment.
2. When the feature warrants multi-step planning, explicitly activate the companion `plan` skill before implementation. Keep the plan in the current conversation unless a durable work-item workspace is approved; for a small well-defined feature, keep orchestration lightweight and do not create artifacts merely to satisfy the loop.
3. Keep the original agent as orchestrator and explicitly activate the companion `implement` skill to deliver the smallest complete feature with appropriate tests.
4. When a runnable user-facing journey is material, explicitly activate the companion `acceptance-verify` skill as a source-read-only QA specialist against the acceptance criteria. Keep the original agent as implementer, resolve validated failures, and rerun affected scenarios.
5. Validate scope, identity, files, evidence, and claims before integrating delegated work.
6. Verify in proportion to risk, inspect the base diff, stage only in-scope changes, and create the authorized implementation commit.

## Review and fix

1. For every round, use a fresh project-scoped read-only reviewer agent or subagent. Instruct it to activate `review` and forbid delegation or mutation. If it becomes unavailable, stop; a non-independent fallback is outside delivery-loop completion and must not report `CLEAN`.
2. Every reviewer returns findings, questions, and proposed decision-log records to the original orchestrator; only the orchestrator may update approved durable state.
3. Give the reviewer the exact snapshot, criteria, guidance, checks, full diff, prior dispositions, and accepted requirement decisions.
4. Require `CLEAN` or severity-ordered findings with stable ID, location, evidence, impact, and remediation.
5. Add a read-only security, architecture, or migration specialist to the same round only when the changed risk requires it.
6. Reject preferences, unsupported claims, duplicates, and stale findings; validate actionable findings before editing.
7. Keep the original agent as fixer and explicitly activate the companion `fix-findings` skill for validated findings. Do not let reviewer agents modify the feature.
8. Add viable regression coverage, verify fixes, then freshly review the complete new state.

## Loop controls

- One review round means one complete reviewer batch over the same HEAD: the general engineering reviewer plus every specialist required by the current risk. Count the batch as one round, not each reviewer.
- Run rounds sequentially: review, validate and fix findings, verify, then start a fresh review. Never launch all five rounds at once.
- `CLEAN` means no actionable defect; optional suggestions do not block.
- Default to at most five review rounds. Stop earlier and escalate when the same finding repeats after a verified fix, reviewers conflict on material behavior, or safe progress needs a product decision.
- If the fifth round finds an actionable defect, fix and verify only when safe within current authority, then stop without claiming `CLEAN` or creating the final commit because the changed state needs a sixth review.
- Keep external calls within the approved bound and never run extra calls merely to consume the allowance.
- Never hide, downgrade, or close a disputed finding to terminate the loop.

## Finalize

1. After a clean review, run all required checks and affected acceptance scenarios.
2. If final verification changes the state, activate `fix-findings`, fix, and start a fresh complete review within the five-round limit; with no round remaining, do not claim `CLEAN` or commit the changed state.
3. Inspect the worktree and stage only validated delivery-loop fixes.
4. If validated post-implementation fixes changed code and the resulting state passed fresh review and final verification, create the final review-fix commit. Do not create an empty second commit unless explicitly required.
5. Preserve worktrees unless removal is authorized. Report environment, commits, rounds, findings, checks, delegation, and residual risks.
6. Do not claim completion while blocking findings or required checks remain.

## Decision-log updates

Record material finding disputes, remediation tradeoffs, accepted risks, loop termination decisions, and why any review finding was not fixed.
When durable state is approved, update the selected work item's findings.md with review-round status and verification evidence and append material remediation or accepted-risk decisions to decisions.md; otherwise report loop state and decisions in the final response.

## Escalate to the human

Escalate when isolation or repository ownership is ambiguous; required authority, consent, access, remote, or identity is missing; external providers disagree on acceptance behavior; a fix changes a public contract; reviewers materially disagree; or the fifth round ends without a clean independently reviewed state.
