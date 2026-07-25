---
name: delivery-loop
description: "Use only when explicitly invoked to deliver a feature in an approved isolated Git worktree through implementation, local commits, fresh read-only companion review rounds, validated fixes, and re-review until clean."
---

# Delivery Loop

## Purpose

Deliver a feature through an isolated, auditable implement-review-fix cycle with independent review and bounded human escalation.

## Workspace protocol

Read `references/workspaces.md` once per agent task before selecting or creating workflow artifacts; reuse it unless repository scope or task authority changes. This skill owns only the task-specific behavior below.

## Companion skill resolution

- Refer to companion skills by their frontmatter names, such as `implement` or `review`. Invoke them through the host's native skill mechanism and any namespace assigned at installation; never assume a literal invocation prefix.
- Core companions are `implement`, `review`, and `fix-findings`. Use `plan` when durable multi-step planning is warranted, `acceptance-verify` when a runnable user journey is material, and security, architecture, or migration specialists only when the changed risk requires them.
- After inspecting task shape and risk but before editing, confirm the companions required for this run are available in every agent context that must invoke them, including the fresh reviewer context. If one is unavailable, use an equivalent host capability only when it preserves the stated authority, evidence, and read/write boundary, and disclose the fallback; otherwise stop and escalate before editing.

## Inputs

- Feature request, acceptance criteria, and review priorities
- Repository instructions, verification commands, Git identity and commit rules
- Base revision, existing work-item state, current worktrees, and unrelated user changes

## Outputs

- One approved isolated environment: the current host-managed worktree, an existing dedicated worktree, or a newly created Git CLI worktree
- One verified implementation commit
- Acceptance-verification evidence when a runnable user journey is material
- Up to five evidence-backed review rounds with finding dispositions
- One final review-fix commit when validated post-implementation fixes changed code and the resulting state passed fresh review
- Final verification evidence, environment kind, worktree path, branch or detached HEAD, commit identifiers, and residual risks

## Preconditions

- Inspect the repository root, primary-folder context when available, current checkout, worktree list, base ref and SHA, HEAD state, and staged, unstaged, and untracked changes before editing.
- If the task already runs in a host-managed worktree, reuse it and never create a nested worktree. A detached HEAD is valid until the user chooses to create a branch or hand off the task; do not move the task or check the same branch out elsewhere.
- Otherwise reuse the current checkout only when it is an existing dedicated worktree for this feature with an unambiguous base.
- If neither reuse case applies, propose the exact base revision, branch, and worktree path, then request one scoped approval covering their creation and up to two local commits unless the initial request already authorizes every action.
- Invoking `delivery-loop` alone is not worktree or commit authority. Only an explicit initial authorization for the exact proposed actions satisfies those gates.
- When reusing any worktree, request only missing authority for up to two local commits.
- If the user declines required worktree creation, do not continue this loop in the current checkout. Ask whether to switch to ordinary implementation there with explicit write and commit authority or stop; the switched path is outside delivery-loop completion.
- Approval in this workflow covers only the proposed worktree or branch creation and up to two local commits; push, merge, deploy, external mutation, task handoff, worktree removal, and branch deletion remain separate actions.
- Preserve unrelated user changes in every checkout. Never stash, reset, move, include, or delete them to prepare this workflow.
- If a host-managed worktree lacks ignored setup files, identify the minimum requirement. Do not change host-specific worktree include rules or copy ignored files or secrets without explicit authorization.
- Follow applicable repository instructions and verify any required Git remote or identity conditions immediately before each commit.
- Establish the required test, lint, typecheck, build, and review commands before implementation.
- Before implementation, confirm the host can create a fresh isolated read-only reviewer agent or subagent. If it cannot, disclose the limitation before editing and ask whether to switch to ordinary implementation with a non-independent self-review or stop. That degraded path is outside delivery-loop completion and must never report `CLEAN` or independently reviewed. After switching, this loop ends; the ordinary workflow must establish its own isolation, verification, write, commit, and reporting boundaries.

## Phase 1: Isolate, implement, and commit

1. After approval, create a CLI worktree and branch only when required. Otherwise remain in the approved current worktree and perform every workflow write and check there.
2. When the feature warrants multi-step planning, explicitly activate the companion `plan` skill before implementation. Keep the plan in the current conversation unless a durable work-item workspace is approved; for a small well-defined feature, keep orchestration lightweight and do not create artifacts merely to satisfy the loop.
3. Keep the original agent as orchestrator and explicitly activate the companion `implement` skill to deliver the smallest complete feature with appropriate tests.
4. When a runnable user-facing journey is material, explicitly activate the companion `acceptance-verify` skill as a source-read-only QA specialist against the acceptance criteria. Keep the original agent as implementer, resolve validated failures, and rerun affected scenarios.
5. Run verification in proportion to risk and resolve failures caused by the feature.
6. Inspect the complete feature diff against the base SHA and confirm commit scope.
7. Create the authorized implementation commit using the repository's commit convention.

## Phase 2: Review until clean

1. For every round, use a fresh project-scoped read-only reviewer agent when the host provides one; otherwise use a fresh reviewer subagent. Explicitly instruct the reviewer to activate the companion `review` skill and remain read-only: no delegation, edits, staging, commits, reverts, or worktree mutation. If fresh isolated review becomes unavailable after implementation, stop without substituting self-review or claiming `CLEAN`, then ask whether to hand off the incomplete state or continue outside the loop with a disclosed non-independent review.
2. Every reviewer returns findings, questions, and proposed decision-log records to the original orchestrator. Reviewer agents never update durable artifacts; only the original orchestrator may write validated dispositions or accepted decisions to an approved work-item workspace.
3. Give the reviewer the exact worktree path, base SHA, current HEAD, acceptance criteria, repository guidance, test and acceptance-verification evidence, complete current diff, and prior finding dispositions. Pass accepted decisions needed to interpret requirements, not the implementer's conclusions.
4. Require an independent full-diff review before reconciling prior findings, followed by either `CLEAN` or findings ordered by severity. Each finding must include a stable ID, location, evidence, impact, and remediation direction.
5. Add a separate read-only specialist round only when the change makes security, architecture, or migration risk material; explicitly activate the companion `security-review`, `architecture-review`, or `migration` skill in assessment-only mode as appropriate and keep the same evidence boundary.
6. Reject style-only preferences, unsupported speculation, duplicates, and findings already enforced by tooling. Independently validate every actionable finding before editing.
7. Keep the original agent as fixer and explicitly activate the companion `fix-findings` skill for validated findings. Do not let reviewer agents modify the feature.
8. Add regression coverage when viable, run the relevant verification, then start a fresh reviewer over the complete current diff. Continue until all required reviewers return `CLEAN` and required checks pass.

## Loop controls

- One review round means one complete reviewer batch over the same HEAD: the general engineering reviewer plus every specialist required by the current risk. Count the batch as one round, not each reviewer.
- Treat `CLEAN` as no actionable correctness, compatibility, security, reliability, maintainability, or test-coverage defect; suggestions do not block completion unless the user makes them required.
- Default to at most five review rounds. Stop earlier and escalate when the same finding repeats after a verified fix, reviewers conflict on material behavior, or safe progress needs a product decision.
- Never hide, downgrade, or close a disputed finding merely to terminate the loop.

## Phase 3: Verify and commit final fixes

1. Run the full required verification after the clean review, including affected companion `acceptance-verify` scenarios when applicable.
2. If final verification produces an actionable failure, independently validate it, keep the original agent as fixer, explicitly activate the companion `fix-findings` skill before editing, rerun affected verification, and start a fresh complete reviewer batch over the changed HEAD within the five-round limit. Never commit a changed state merely because its previous HEAD was clean. If no review round remains, fix and verify only when safe within current authority, then stop without committing the changed state or claiming `CLEAN` and escalate for direction on a sixth review.
3. Inspect the isolated worktree and stage only validated delivery-loop fixes.
4. If validated post-implementation fixes changed code—whether discovered by review or final verification—and the resulting state passed fresh review and final verification, create the final review-fix commit using the repository's commit convention. If no code changed after the implementation commit, do not create an empty second commit unless the user explicitly requires one and confirms that audit convention.
5. Preserve permanent and Git CLI-created worktrees for inspection; leave host-managed worktree lifecycle to the host. Report the environment kind, worktree path, branch or detached HEAD, baseline, both commit identifiers when present, review-round count, finding dispositions, verification evidence, and unresolved risks.
6. Do not claim completion when blocking findings or required checks remain.

## Decision-log updates

Record material finding disputes, remediation tradeoffs, accepted risks, loop termination decisions, and why any review finding was not fixed.
When durable state is approved, update the selected work item's findings.md with review-round status and verification evidence and append material remediation or accepted-risk decisions to decisions.md; otherwise report loop state and decisions in the final response.

## Escalate to the human

Escalate when the primary folder, base, branch, worktree path, environment ownership, or existing worktree purpose is ambiguous; isolation cannot be created safely; required approval, commit authority, remote, or Git identity is missing; acceptance criteria conflict with a finding; a fix changes a public contract; reviewers materially disagree; or the fifth review round ends with actionable findings remaining.
