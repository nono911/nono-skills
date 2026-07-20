---
name: review-loop
description: "Use when the user explicitly requests a two-commit feature workflow: implement and commit once, run independent read-only code-review rounds, fix validated findings, re-review until clean, then commit the final review fixes."
---

# Review Loop

## Purpose

Deliver a feature through an auditable implement-commit-review-fix-review cycle while keeping review independent from code modification.

## Workspace protocol

Read `../../references/workspaces.md` before selecting or creating workflow artifacts. Follow it for persistence, consent, work-item resolution, and lifecycle; this skill owns only the task-specific behavior below.

## Inputs

- Feature request, acceptance criteria, and review priorities
- Repository instructions, verification commands, commit rules, and review baseline
- Existing work-item state and unrelated working-tree changes

## Outputs

- One verified implementation commit
- Evidence-backed review rounds with finding dispositions
- One final review-fix commit when review produced code changes
- Final verification evidence, commit identifiers, and residual risks

## Preconditions

- Require explicit user authorization before creating either commit; invoking the skill without a commit request does not authorize commits.
- Confirm the repository baseline and inspect staged, unstaged, and untracked changes before editing. Do not absorb unrelated user changes into either commit.
- Follow applicable repository instructions and verify any required Git remote or identity conditions immediately before each commit.
- Establish the required test, lint, typecheck, build, and review commands before implementation.

## Phase 1: Implement and commit

1. Record the starting revision as the feature baseline.
2. Implement the smallest complete feature and add or update tests for changed behavior.
3. Run verification in proportion to risk and resolve failures caused by the feature.
4. Inspect the complete feature diff against the starting revision and confirm commit scope.
5. Create the implementation commit using the repository's commit convention. Do not push.

## Phase 2: Review until clean

1. Use a fresh reviewer subagent for every round. Instruct it not to delegate or modify, stage, commit, or revert files; use a read-only sandbox when the client supports one, and verify the worktree is unchanged after review.
2. Give the reviewer the acceptance criteria, repository guidance, verification evidence, and the complete current feature diff from the starting revision, including relevant untracked files.
3. Require either `CLEAN` or findings ordered by severity. Each finding must include a stable ID, location, evidence, impact, and remediation direction.
4. Reject style-only preferences, unsupported speculation, duplicates, and findings already enforced by tooling. Independently validate every actionable finding before editing.
5. Keep the original agent as the default fixer and orchestrator; delegate fixes only when they are independent, non-overlapping, and safe in the shared worktree.
6. Fix validated findings at the causal path, add regression coverage when viable, and run the relevant verification.
7. Start a fresh review round over the entire current feature diff, not only the latest fix. Continue until the reviewer returns `CLEAN` and required verification passes.

## Loop controls

- Treat `CLEAN` as no actionable correctness, compatibility, security, reliability, maintainability, or test-coverage defect; suggestions do not block completion unless the user makes them required.
- Default to at most five review rounds. Stop earlier and escalate when the same finding repeats after a verified fix, reviewers conflict on material behavior, or safe progress needs a product decision.
- Never hide, downgrade, or close a disputed finding merely to terminate the loop.
- Never push, deploy, or mutate external systems unless separately authorized.

## Phase 3: Verify and commit final fixes

1. Run the full required verification after the clean review.
2. Inspect the complete working tree and stage only review-loop fixes.
3. If review caused code changes, create the final review-fix commit using the repository's commit convention. If review was clean before any fixes, do not create an empty commit unless the user explicitly requires one and confirms that audit convention.
4. Report the baseline, both commit identifiers when present, review-round count, finding dispositions, verification evidence, and unresolved risks. Do not claim completion when blocking findings or required checks remain.

## Decision-log updates

Record material finding disputes, remediation tradeoffs, accepted risks, loop termination decisions, and why any review finding was not fixed.
When durable state is approved, update the selected work item's findings.md with review-round status and verification evidence and append material remediation or accepted-risk decisions to decisions.md; otherwise report loop state and decisions in the final response.

## Escalate to the human

Escalate when the working tree cannot be committed without mixing unrelated changes, commit authorization or required Git identity is missing, acceptance criteria conflict with a finding, a fix changes a public contract, reviewers materially disagree, or the loop reaches its round limit with actionable findings remaining.
