---
name: delivery-loop
description: "Use only when explicitly invoked to deliver a feature in an approved isolated Git worktree through implementation, local commits, fresh read-only engineering:review rounds, validated fixes, and re-review until clean."
---

# Delivery Loop

## Purpose

Deliver a feature through an isolated, auditable implement-review-fix cycle with independent review and bounded human escalation.

## Workspace protocol

Read `../../references/workspaces.md` once per Codex task before selecting or creating workflow artifacts; reuse it unless repository scope or task authority changes. This skill owns only the task-specific behavior below.

## Inputs

- Feature request, acceptance criteria, and review priorities
- Repository instructions, verification commands, Git identity and commit rules
- Base revision, existing work-item state, current worktrees, and unrelated user changes

## Outputs

- One approved isolated environment: the current Codex-managed worktree, an existing dedicated worktree, or a newly created CLI worktree
- One verified implementation commit
- Acceptance-verification evidence when a runnable user journey is material
- Up to five evidence-backed review rounds with finding dispositions
- One final review-fix commit when review produced code changes
- Final verification evidence, environment kind, worktree path, branch or detached HEAD, commit identifiers, and residual risks

## Preconditions

- Inspect the repository root, primary-folder context when available, current checkout, worktree list, base ref and SHA, HEAD state, and staged, unstaged, and untracked changes before editing.
- If the task already runs in a Codex-managed worktree, reuse it and never create a nested worktree. A detached HEAD is valid until the user chooses Create branch or Handoff; do not move the chat or check the same branch out elsewhere.
- Otherwise reuse the current checkout only when it is an existing dedicated worktree for this feature with an unambiguous base.
- If neither reuse case applies, propose the exact base revision, branch, and worktree path, then request one scoped approval covering their creation and up to two local commits unless the initial request already authorizes every action.
- When reusing any worktree, request only missing authority for up to two local commits.
- If the user declines worktree creation, do not silently fall back to the current checkout; ask whether to continue there with explicit commit authority or stop.
- Approval in this workflow covers only the proposed worktree or branch creation and up to two local commits; push, merge, deploy, external mutation, Handoff, worktree removal, and branch deletion remain separate actions.
- Preserve unrelated user changes in every checkout. Never stash, reset, move, include, or delete them to prepare this workflow.
- If a managed worktree lacks ignored setup files, identify the minimum requirement. Do not edit `.worktreeinclude` or copy ignored files or secrets without explicit authorization.
- Follow applicable repository instructions and verify any required Git remote or identity conditions immediately before each commit.
- Establish the required test, lint, typecheck, build, and review commands before implementation.

## Phase 1: Isolate, implement, and commit

1. After approval, create a CLI worktree and branch only when required. Otherwise remain in the approved current worktree and perform every workflow write and check there.
2. Keep the original agent as orchestrator and explicitly use `$engineering:implement` to deliver the smallest complete feature with appropriate tests.
3. When a runnable user-facing journey is material, explicitly use `$engineering:acceptance-verify` as a source-read-only QA specialist against the acceptance criteria. Keep the original agent as implementer, resolve validated failures, and rerun affected scenarios.
4. Run verification in proportion to risk and resolve failures caused by the feature.
5. Inspect the complete feature diff against the base SHA and confirm commit scope.
6. Create the authorized implementation commit using the repository's commit convention.

## Phase 2: Review until clean

1. For every round, prefer a fresh project-scoped `engineering_reviewer` agent. If unavailable, use a fresh reviewer subagent. Explicitly instruct either reviewer to use `$engineering:review` and keep it read-only: no delegation, edits, staging, commits, reverts, or worktree mutation.
2. Give the reviewer the exact worktree path, base SHA, current HEAD, acceptance criteria, repository guidance, test and acceptance-verification evidence, complete current diff, and prior finding dispositions. Pass accepted decisions needed to interpret requirements, not the implementer's conclusions.
3. Require an independent full-diff review before reconciling prior findings, followed by either `CLEAN` or findings ordered by severity. Each finding must include a stable ID, location, evidence, impact, and remediation direction.
4. Add a separate read-only specialist round only when the change makes security, architecture, or migration risk material; explicitly use `$engineering:security-review`, `$engineering:architecture-review`, or `$engineering:migration` in assessment-only mode as appropriate and keep the same evidence boundary.
5. Reject style-only preferences, unsupported speculation, duplicates, and findings already enforced by tooling. Independently validate every actionable finding before editing.
6. Keep the original agent as fixer and explicitly use `$engineering:fix-findings` for validated findings. Do not let reviewer agents modify the feature.
7. Add regression coverage when viable, run the relevant verification, then start a fresh reviewer over the complete current diff. Continue until all required reviewers return `CLEAN` and required checks pass.

## Loop controls

- One review round means one complete reviewer batch over the same HEAD: the general engineering reviewer plus every specialist required by the current risk. Count the batch as one round, not each reviewer.
- Treat `CLEAN` as no actionable correctness, compatibility, security, reliability, maintainability, or test-coverage defect; suggestions do not block completion unless the user makes them required.
- Default to at most five review rounds. Stop earlier and escalate when the same finding repeats after a verified fix, reviewers conflict on material behavior, or safe progress needs a product decision.
- Never hide, downgrade, or close a disputed finding merely to terminate the loop.

## Phase 3: Verify and commit final fixes

1. Run the full required verification after the clean review, including affected `$engineering:acceptance-verify` scenarios when applicable.
2. If final verification produces an actionable failure, independently validate it, keep the original agent as fixer, rerun affected verification, and start a fresh complete reviewer batch over the changed HEAD within the five-round limit. Never commit a changed state merely because its previous HEAD was clean.
3. Inspect the isolated worktree and stage only validated delivery-loop fixes.
4. If review caused code changes, create the final review-fix commit using the repository's commit convention. If review was clean before any fixes, do not create an empty commit unless the user explicitly requires one and confirms that audit convention.
5. Preserve permanent and CLI-created worktrees for inspection; leave Codex-managed worktree lifecycle to the app. Report the environment kind, worktree path, branch or detached HEAD, baseline, both commit identifiers when present, review-round count, finding dispositions, verification evidence, and unresolved risks.
6. Do not claim completion when blocking findings or required checks remain.

## Decision-log updates

Record material finding disputes, remediation tradeoffs, accepted risks, loop termination decisions, and why any review finding was not fixed.
When durable state is approved, update the selected work item's findings.md with review-round status and verification evidence and append material remediation or accepted-risk decisions to decisions.md; otherwise report loop state and decisions in the final response.

## Escalate to the human

Escalate when the primary folder, base, branch, worktree path, environment ownership, or existing worktree purpose is ambiguous; isolation cannot be created safely; required approval, commit authority, remote, or Git identity is missing; acceptance criteria conflict with a finding; a fix changes a public contract; reviewers materially disagree; or the fifth review round ends with actionable findings remaining.
