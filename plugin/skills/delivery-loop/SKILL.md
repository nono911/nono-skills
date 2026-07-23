---
name: delivery-loop
description: "Use only when explicitly invoked to deliver a feature in an approved isolated Git worktree through implementation, local commits, fresh read-only engineering:review rounds, validated fixes, and re-review until clean."
---

# Delivery Loop

## Purpose

Deliver a feature through an isolated, auditable implement-review-fix cycle while keeping implementation, independent review, and external actions under clear authority.

## Workspace protocol

Read `../../references/workspaces.md` before selecting or creating workflow artifacts. Follow it for persistence, consent, work-item resolution, and lifecycle; this skill owns only the task-specific behavior below.

## Inputs

- Feature request, acceptance criteria, and review priorities
- Repository instructions, verification commands, Git identity and commit rules
- Base revision, existing work-item state, current worktrees, and unrelated user changes

## Outputs

- One approved isolated worktree and feature branch, or an explicitly approved fallback
- One verified implementation commit
- Evidence-backed review rounds with finding dispositions
- One final review-fix commit when review produced code changes
- Final verification evidence, worktree path, branch, commit identifiers, and residual risks

## Preconditions

- Inspect the repository root, current checkout, worktree list, base ref and SHA, staged, unstaged, and untracked changes before editing.
- Reuse the current checkout only when it is already an isolated worktree dedicated to this feature and its base is unambiguous.
- Before implementation, confirm explicit authority for up to two local commits. Combine it with new-worktree approval when needed; when reusing an existing worktree, request only missing commit authority.
- Otherwise propose the exact base revision, branch, and worktree path, then request one scoped approval covering worktree and branch creation plus up to two local commits unless the initial request already authorizes every action.
- If the user declines worktree creation, do not silently fall back to the current checkout; ask whether to continue there with explicit commit authority or stop.
- Worktree approval does not authorize push, merge, deploy, production mutation, worktree removal, or branch deletion.
- Preserve unrelated user changes in every checkout. Never stash, reset, move, include, or delete them to prepare this workflow.
- Follow applicable repository instructions and verify any required Git remote or identity conditions immediately before each commit.
- Establish the required test, lint, typecheck, build, and review commands before implementation.

## Phase 1: Isolate, implement, and commit

1. After approval, create the proposed worktree and branch from the recorded base SHA. Perform every workflow write and check in that isolated path.
2. Keep the original agent as orchestrator and explicitly use `$engineering:implement` to deliver the smallest complete feature with appropriate tests.
3. Run verification in proportion to risk and resolve failures caused by the feature.
4. Inspect the complete feature diff against the base SHA and confirm commit scope.
5. Create the authorized implementation commit using the repository's commit convention. Do not push.

## Phase 2: Review until clean

1. Use a fresh reviewer subagent for every round and explicitly instruct it to use `$engineering:review`. Keep it read-only: no delegation, edits, staging, commits, reverts, or worktree mutation.
2. Give the reviewer the exact worktree path, base SHA, current HEAD, acceptance criteria, repository guidance, verification evidence, complete current diff, and prior finding dispositions. Pass accepted decisions needed to interpret requirements, not the implementer's conclusions.
3. Require an independent full-diff review before reconciling prior findings, followed by either `CLEAN` or findings ordered by severity. Each finding must include a stable ID, location, evidence, impact, and remediation direction.
4. Add a separate read-only specialist round only when the change makes security, architecture, or migration risk material; explicitly use `$engineering:security-review`, `$engineering:architecture-review`, or `$engineering:migration` in assessment-only mode as appropriate and keep the same evidence boundary.
5. Reject style-only preferences, unsupported speculation, duplicates, and findings already enforced by tooling. Independently validate every actionable finding before editing.
6. Keep the original agent as fixer and explicitly use `$engineering:fix-findings` for validated findings. Do not let reviewer agents modify the feature.
7. Add regression coverage when viable, run the relevant verification, then start a fresh reviewer over the complete current diff. Continue until all required reviewers return `CLEAN` and required checks pass.

## Loop controls

- Treat `CLEAN` as no actionable correctness, compatibility, security, reliability, maintainability, or test-coverage defect; suggestions do not block completion unless the user makes them required.
- Default to at most five review rounds. Stop earlier and escalate when the same finding repeats after a verified fix, reviewers conflict on material behavior, or safe progress needs a product decision.
- Never hide, downgrade, or close a disputed finding merely to terminate the loop.
- Never push, merge, deploy, remove the worktree, delete the branch, or mutate external systems unless separately authorized.

## Phase 3: Verify and commit final fixes

1. Run the full required verification after the clean review.
2. Inspect the isolated worktree and stage only validated delivery-loop fixes.
3. If review caused code changes, create the final review-fix commit using the repository's commit convention. If review was clean before any fixes, do not create an empty commit unless the user explicitly requires one and confirms that audit convention.
4. Preserve the worktree and branch for inspection by default. Report their paths, the baseline, both commit identifiers when present, review-round count, finding dispositions, verification evidence, and unresolved risks.
5. Do not claim completion when blocking findings or required checks remain.

## Decision-log updates

Record material finding disputes, remediation tradeoffs, accepted risks, loop termination decisions, and why any review finding was not fixed.
When durable state is approved, update the selected work item's findings.md with review-round status and verification evidence and append material remediation or accepted-risk decisions to decisions.md; otherwise report loop state and decisions in the final response.

## Escalate to the human

Escalate when the base, branch, worktree path, or existing worktree ownership is ambiguous; isolation cannot be created safely; required approval, commit authority, remote, or Git identity is missing; acceptance criteria conflict with a finding; a fix changes a public contract; reviewers materially disagree; or the loop reaches its round limit with actionable findings remaining.
