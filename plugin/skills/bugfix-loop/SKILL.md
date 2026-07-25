---
name: bugfix-loop
description: "Use only when explicitly invoked to diagnose, reproduce, fix, regression-test, locally commit, and independently review a software bug in an approved isolated Git worktree."
---

# Bugfix Loop

## Purpose

Prove a reported defect, isolate its causal chain, deliver the smallest regression-protected fix, and independently review it through a bounded auditable loop.

## Workspace protocol

Read `../../references/workspaces.md` once per Codex task before selecting or creating workflow artifacts; reuse it unless repository scope or task authority changes. This skill owns only the task-specific behavior below.

## Inputs

- Observed symptom, expected behavior, impact, frequency, and environment
- Available reproduction steps, logs, traces, payloads, data, and recent changes
- Repository instructions, verification commands, Git identity and commit rules
- Base revision, current worktrees, existing work-item state, and unrelated user changes

## Outputs

- One approved isolated environment: the current Codex-managed worktree, an existing dedicated worktree, or a newly created CLI worktree
- Pre-fix evidence that reproduces the symptom or a clearly disclosed evidence gap
- A supported root cause and causal chain
- A focused regression test or repeatable check that fails for the expected pre-fix reason
- Pre-fix and post-fix acceptance evidence when the symptom is a runnable user journey
- One verified minimal-fix commit
- Up to five sequential evidence-backed review rounds with finding dispositions
- One final review-fix commit when review produced code changes
- Final verification evidence, environment kind, worktree path, branch or detached HEAD, commit identifiers, review-round count, and residual risks

## Preconditions

- Inspect the repository root, primary-folder context when available, current checkout, worktree list, base ref and SHA, HEAD state, and staged, unstaged, and untracked changes before editing.
- If the task already runs in a Codex-managed worktree, reuse it and never create a nested worktree. A detached HEAD is valid until the user chooses Create branch or Handoff; do not move the chat or check the same branch out elsewhere.
- Otherwise reuse the current checkout only when it is an existing dedicated worktree for this bug with an unambiguous base.
- If neither reuse case applies, propose the exact base revision, branch, and worktree path, then request one scoped approval covering their creation and up to two local commits unless the initial request already authorizes every action.
- When reusing any worktree, request only missing authority for up to two local commits.
- When only commit authority is missing, ask: "May I create up to two local commits in the current approved worktree—one bugfix commit and, only if review produces code changes followed by a clean review, one final review-fix commit? This does not authorize push, merge, deploy, Handoff, worktree removal, or branch deletion."
- If the user declines worktree creation, do not silently fall back to the current checkout; ask whether to continue there with explicit commit authority or stop.
- Approval in this workflow covers only the proposed worktree or branch creation and up to two local commits; push, merge, deploy, external mutation, Handoff, worktree removal, and branch deletion remain separate actions.
- Preserve unrelated user changes in every checkout. Never stash, reset, move, include, or delete them to prepare this workflow.
- If a managed worktree lacks ignored setup files, identify the minimum requirement. Do not edit `.worktreeinclude` or copy ignored files or secrets without explicit authorization.
- Follow applicable repository instructions and verify any required Git remote or identity conditions immediately before each commit.
- Establish required reproduction, test, lint, typecheck, build, and review commands before changing production code.

## Phase 1: Reproduce and prove

1. After approval, create a CLI worktree and branch only when required. Otherwise remain in the approved current worktree and perform every workflow write and check there.
2. When the symptom is a runnable user-facing journey, explicitly use `$engineering:acceptance-verify` as a source-read-only QA specialist to capture the observed boundary failure.
3. Keep the original agent as orchestrator and explicitly use `$engineering:debug` to trace the real runtime and data path, falsify plausible alternatives, and support a root cause before changing production code.
4. Preserve the smallest useful pre-fix evidence, including the command, input, observed result, and expected result.
5. Keep the original agent in control and explicitly use `$engineering:test` to add the smallest stable regression test or repeatable check. Run it before the fix and confirm it fails because of the supported causal path, not because of an unrelated setup error.
6. If reproduction is unsafe or an automated regression test is not viable, use the strongest safe repeatable evidence and disclose the limitation. Escalate before committing a claimed fix when no pre-fix failure can be demonstrated.

## Phase 2: Fix, verify, and commit

1. Keep the original agent as implementer and explicitly use `$engineering:implement` to correct the supported root cause with the smallest compatible change.
2. Run the regression proof again and require it to pass. Reproduce the original symptom when safe and run adjacent checks in proportion to risk.
3. Inspect the complete bugfix diff against the base SHA and confirm that diagnostic scaffolding, temporary instrumentation, secrets, generated noise, and unrelated changes are excluded.
4. Create the authorized bugfix commit using the repository's commit convention.

## Phase 3: Review until clean

1. For every round, prefer a fresh project-scoped `engineering_reviewer` agent. If unavailable, use a fresh reviewer subagent. Explicitly instruct either reviewer to use `$engineering:review` and keep it read-only: no delegation, edits, staging, commits, reverts, or worktree mutation.
2. Give the reviewer the exact worktree path, base SHA, current HEAD, expected behavior, supported root cause, pre-fix regression and acceptance evidence when available, verification evidence, complete current diff, repository guidance, and prior finding dispositions. Pass accepted decisions needed to interpret requirements, not the fixer's conclusions.
3. Require an independent full-diff review before reconciling prior findings, followed by either `CLEAN` or findings ordered by severity. Each finding must include a stable ID, location, evidence, impact, and remediation direction.
4. Add a separate read-only specialist to the same round only when the fix makes security, architecture, or migration risk material; explicitly use `$engineering:security-review`, `$engineering:architecture-review`, or `$engineering:migration` in assessment-only mode as appropriate and keep the same evidence boundary.
5. Reject style-only preferences, unsupported speculation, duplicates, and findings already enforced by tooling. Independently validate every actionable finding before editing.
6. Keep the original agent as fixer and explicitly use `$engineering:fix-findings` for validated findings. Do not let reviewer agents modify the bugfix.
7. Add or strengthen regression coverage when viable, rerun relevant verification, and start the next fresh full-diff reviewer batch only after the current findings are resolved or dispositioned.

## Loop controls

- One review round means one complete reviewer batch over the same HEAD: the general engineering reviewer plus every specialist required by the current risk. Count the batch as one round, not each reviewer.
- Run rounds sequentially. Never start future review rounds in advance; after a round finds actionable defects, validate, fix, and verify them before starting the next round.
- Treat `CLEAN` as no actionable correctness, compatibility, security, reliability, maintainability, or test-coverage defect; suggestions do not block completion unless the user makes them required.
- Default to at most five review rounds. Stop earlier and escalate when the same finding repeats after a verified fix, reviewers conflict on material behavior, or safe progress needs a product decision.
- If the fifth reviewer batch still finds an actionable defect, validate and fix it only when safe within current authority, rerun verification, then stop and escalate because proving the new state requires a sixth review. Do not claim a clean loop or create the final review-fix commit without new direction.
- Never hide, downgrade, or close a disputed finding merely to terminate the loop.

## Phase 4: Verify and commit final fixes

1. After a clean review, run the full required verification, repeat the original reproduction when safe, and rerun affected `$engineering:acceptance-verify` scenarios when applicable.
2. If final verification produces an actionable failure, independently validate it, keep the original agent as fixer, rerun affected verification, and start a fresh complete reviewer batch over the changed HEAD within the five-round limit. Never commit a changed state merely because its previous HEAD was clean.
3. Inspect the isolated worktree and stage only validated bugfix-loop fixes.
4. If review caused code changes, create the final review-fix commit using the repository's commit convention. If review was clean before any fixes, do not create an empty commit unless the user explicitly requires one and confirms that audit convention.
5. Preserve permanent and CLI-created worktrees for inspection; leave Codex-managed worktree lifecycle to the app. Report the environment kind, worktree path, branch or detached HEAD, baseline, both commit identifiers when present, supported root cause, pre-fix and post-fix evidence, review-round count, finding dispositions, verification evidence, and unresolved risks.
6. Do not claim completion when the root cause is unsupported, regression proof is absent without a disclosed limitation, blocking findings remain, or required checks fail.

## Decision-log updates

Record the supported root cause, discarded high-likelihood hypotheses, material evidence gaps, remediation tradeoffs, finding disputes, accepted risks, and loop termination decisions.
When durable state is approved, update the selected work item's findings.md with reproduction, root-cause, regression, review-round, and verification evidence and append material remediation or accepted-risk decisions to decisions.md; otherwise report loop state and decisions in the final response.

## Escalate to the human

Escalate when expected behavior is undefined; reproduction risks data, privacy, cost, or availability; the primary folder, base, worktree, or environment ownership is ambiguous; required access or authority is missing; no safe evidence can distinguish the root cause; the minimal fix changes a public contract; reviewers materially disagree; or the fifth review round ends without a clean independently reviewed state.
