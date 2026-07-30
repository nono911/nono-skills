---
name: bugfix-loop
description: "Use only when explicitly invoked to diagnose, reproduce, fix, regression-test, locally commit, and independently review a software bug in an approved isolated Git worktree."
---

# Bugfix Loop

## Purpose

Prove a defect, fix its supported cause with regression protection, and independently review the result.

## Workspace protocol

Read `references/workspaces.md` once per agent task before selecting or creating workflow artifacts; reuse it unless repository scope or task authority changes. This skill owns only the task-specific behavior below.

## Companions

- Refer to companion skills by their frontmatter names, such as `debug` or `review`. Invoke them through the host's native skill mechanism and any namespace assigned at installation; never assume a literal invocation prefix.
- Core companions are `debug`, `test`, `implement`, `review`, and `fix-findings`. Use `acceptance-verify` when the symptom is a runnable user journey and security, architecture, or migration specialists only when the changed risk requires them.
- Confirm required companions are available where used. Accept a fallback only when it preserves authority and read/write boundaries.
- Keep the original agent as orchestrator and Git owner. Use fresh agents only for read-only review or justified specialist assessment.

## Inputs

- Observed and expected behavior, impact, frequency, environment, and reproduction evidence
- Repository rules, recent changes, checks, base, worktrees, unrelated changes, and Git rules

## Outputs

- Pre-fix evidence, a supported causal chain, and a focused failing regression proof
- One approved isolated minimal fix and commit
- Up to five sequential review-fix rounds, stopping when clean
- A second commit only for validated later fixes that pass fresh review
- Verification, review, commit, and residual-risk evidence

## Approval and isolation

- Inspect repository scope, checkout, worktrees, base SHA, HEAD, and all change states before editing.
- If the task already runs in a host-managed worktree, reuse it and never create a nested worktree. A detached HEAD is valid until the user chooses to create a branch or hand off the task; do not move the task or check the same branch out elsewhere.
- Otherwise reuse the checkout only when it is a dedicated worktree for this bug with an unambiguous base.
- If neither reuse case applies, propose the exact base revision, branch, and worktree path, then request one scoped approval covering their creation and up to two local commits unless the initial request already authorizes every action.
- Invoking `bugfix-loop` alone is not worktree or commit authority. Only an explicit initial authorization for the exact proposed actions satisfies those gates.
- When reusing any worktree, request only missing authority for up to two local commits.
- When only commit authority is missing, request the two named local commits and repeat the excluded actions.
- If the user declines required worktree creation, do not continue this loop in the current checkout. Ask whether to switch to ordinary bug fixing there with explicit write and commit authority or stop; the switched path is outside bugfix-loop completion.
- Approval in this workflow covers only the proposed worktree or branch creation and up to two local commits; push, merge, deploy, external mutation, task handoff, worktree removal, and branch deletion remain separate actions.
- Preserve unrelated changes; never stash, reset, move, include, or delete them. Follow repository instructions and verify required remote and identity conditions before each commit.
- Do not copy ignored files or secrets or change host worktree rules without authorization.
- Before changing production code, confirm the host can create a fresh isolated read-only reviewer agent or subagent. If it cannot, disclose the limitation before editing and ask whether to switch to ordinary bug fixing with a non-independent self-review or stop. That degraded path is outside bugfix-loop completion and must never report `CLEAN` or independently reviewed.

## Reproduce and prove

1. Create a CLI worktree and branch only when approved and required; otherwise remain in the approved isolated environment.
2. When the symptom is a runnable user-facing journey, explicitly activate the companion `acceptance-verify` skill as a source-read-only QA specialist to capture the observed boundary failure.
3. Keep the original agent as orchestrator and explicitly activate the companion `debug` skill to trace the real runtime and data path, falsify plausible alternatives, and support a root cause before changing production code.
4. Preserve the smallest useful command, input, observed and expected result, and causal evidence.
5. Keep the original agent in control and explicitly activate the companion `test` skill to add the smallest stable regression test or repeatable check. Run it before the fix and confirm it fails because of the supported causal path, not because of an unrelated setup error.
6. If reproduction or automation is unsafe, use the strongest repeatable evidence and disclose the gap. Escalate when no pre-fix failure can be shown.

## Fix and commit

1. Keep the original agent as implementer and explicitly activate the companion `implement` skill to correct the supported root cause with the smallest compatible change.
2. Require the regression proof and safe original reproduction to pass, then run adjacent checks.
3. Inspect the base diff and exclude diagnostics, secrets, generated noise, and unrelated changes.
4. Create the authorized bugfix commit.

## Review and fix

1. For every round, use a fresh project-scoped read-only reviewer agent or subagent. Instruct it to activate `review` and forbid delegation or mutation. If it becomes unavailable, stop; a non-independent fallback is outside bugfix-loop completion and must not report `CLEAN`.
2. Every reviewer returns findings, questions, and proposed decision-log records to the original orchestrator; only the orchestrator may update approved durable state.
3. Give the reviewer the exact snapshot, expected behavior, causal and pre-fix evidence, checks, full diff, guidance, prior dispositions, and accepted decisions.
4. Require `CLEAN` or severity-ordered findings with stable ID, location, evidence, impact, and remediation.
5. Add a read-only security, architecture, or migration specialist to the same round only when the changed risk requires it.
6. Reject preferences, unsupported claims, duplicates, and stale findings; validate actionable findings before editing.
7. Keep the original agent as fixer and explicitly activate the companion `fix-findings` skill for validated findings. Do not let reviewer agents modify the bugfix.
8. Strengthen viable regression coverage, verify fixes, then freshly review the complete new state.

## Loop controls

- One review round means one complete reviewer batch over the same HEAD: the general engineering reviewer plus every specialist required by the current risk. Count the batch as one round, not each reviewer.
- Run rounds sequentially. Never start future review rounds in advance; after a round finds actionable defects, validate, fix, and verify them before starting the next round.
- `CLEAN` means no actionable defect; optional suggestions do not block.
- Default to at most five review rounds. Stop earlier and escalate when the same finding repeats after a verified fix, reviewers conflict on material behavior, or safe progress needs a product decision.
- If the fifth reviewer batch still finds an actionable defect, validate and fix it only when safe within current authority, rerun verification, then stop and escalate because proving the new state requires a sixth review. Do not claim a clean loop or create the final review-fix commit without new direction.
- Never hide, downgrade, or close a disputed finding to terminate the loop.

## Finalize

1. After a clean review, run all required checks, safe reproduction, and affected acceptance scenarios.
2. If final verification changes the state, activate `fix-findings`, fix, and start a fresh complete review within the five-round limit; with no round remaining, do not claim `CLEAN` or commit the changed state.
3. Inspect the worktree and stage only validated bugfix-loop fixes.
4. If validated post-implementation fixes changed code and the resulting state passed fresh review and final verification, create the final review-fix commit. Do not create an empty second commit unless explicitly required.
5. Preserve worktrees unless removal is authorized. Report environment, commits, causal evidence, checks, rounds, findings, and residual risks.
6. Do not claim completion when the cause is unsupported, regression proof is absent without a disclosed limitation, blocking findings remain, or required checks fail.

## Decision-log updates

Record the supported root cause, discarded high-likelihood hypotheses, evidence gaps, remediation tradeoffs, finding disputes, accepted risks, and loop termination decisions.
When durable state is approved, update the selected work item's findings.md with reproduction, root-cause, regression, review-round, and verification evidence and append material remediation or accepted-risk decisions to decisions.md; otherwise report loop state and decisions in the final response.

## Escalate to the human

Escalate when expected behavior is undefined; reproduction risks data, privacy, cost, or availability; isolation or repository ownership is ambiguous; authority or access is missing; evidence cannot distinguish the cause; the minimal fix changes a public contract; reviewers materially disagree; or the fifth round ends without a clean independently reviewed state.
