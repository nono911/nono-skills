---
name: bugfix-loop
description: "Use only when explicitly invoked to prove, fix, regression-test, commit, and review a bug in an isolated Git worktree."
---

# Bugfix Loop

## Purpose

Prove and fix a defect with regression protection and independent review.

## Workspace protocol

Read `references/workspaces.md` once per agent task before selecting or creating workflow artifacts; reuse it unless repository scope or task authority changes. This skill owns only the task-specific behavior below.

## Evidence control

- After approval, read `references/evidence-contract.md` and use the bundled controller before diagnosis or implementation. Start or resume one local run. If active schema-v1 blocks startup, show its ID and obtain approval for a linked v2 successor. Never ask the user to operate the controller or silently purge legacy evidence.
- Before review or finding triage, read `references/finding-rubric.md` and apply its severity and disposition contract.
- Treat the controller-issued run ID, evidence events, review leases, snapshots, and immutable budgets as authoritative across continuation, compaction, replanning, providers, and child returns. Never edit controller state directly or replace a rejected transition with prose.
- Record diagnosis, implementation, verification, review, finding triage, fixes, blocks, and completion through Evidence Contract v2. Keep prompts, conversations, source, diffs, terminal logs, environment values, and secrets out of evidence.
- Use the controller's capability plan and local insights only as evidence-linked advice for specialist selection. They never expand authority, scope, cost, or budgets or silently modify policy.
- If strict control cannot execute or persist, stop this named loop. Offer ordinary bug fixing only with separate authority and never claim bounded or independently reviewed completion.

## Companions

- Refer to companions by frontmatter name, invoke them through the host mechanism, and never assume a literal invocation prefix.
- Core companions are `debug`, `test`, `implement`, `review`, and `fix-findings`. Use `acceptance-verify` when the symptom is a runnable user journey and security, architecture, or migration specialists only when the changed risk requires them.
- Keep the original agent as orchestrator and Git owner. Use fresh agents only for read-only review or justified specialist assessment.
- Match agents to required roles and enforceable capabilities rather than provider names; Native remains the default and external execution retains its consent boundary.

## Inputs

- Observed versus expected behavior, impact, and reproduction evidence
- Repository rules, checks, base, worktrees, unrelated changes, and Git rules

## Outputs

- Pre-fix evidence, a supported causal chain, and a focused failing regression proof
- One approved isolated fix commit
- Evidence-linked execution within five review batches, four fix cycles, and one no-verdict retry
- A second commit only for validated later fixes that pass fresh review
- Verification, review, commit, and residual-risk evidence

## Approval and isolation

- Inspect repository scope, worktrees, base SHA, HEAD, and change states before editing.
- Reuse a host-managed worktree without nesting or renaming it. Otherwise use a dedicated task worktree with an unambiguous base, read `references/branch-naming.md` before proposing its branch, and never move a detached task or check out its branch elsewhere.
- Otherwise propose the exact base, branch, and worktree and request one approval for creation and two local commits unless already authorized. The bugfix commit may be amended before review; one unpushed review-fix commit may be amended later.
- Invocation alone grants neither worktree nor commit authority. In a reused worktree request only missing authority for up to two named local commits and repeat excluded actions.
- If required isolation is declined, stop this loop and offer ordinary bug fixing in the checkout only with explicit write and commit authority.
- Approval covers isolation and two loop-owned commits; push, merge, deploy, external mutation, handoff, removal, and deletion remain separate.
- Preserve unrelated changes; follow remote and identity rules before each commit.
- Do not copy ignored files or secrets or change host worktree rules without authorization.
- Before editing require a fresh isolated read-only reviewer. Otherwise offer ordinary bug fixing with disclosed self-review or stop; that path cannot report `CLEAN`.

## Reproduce and prove

1. Create a CLI worktree and branch only when approved and required; otherwise remain in the approved isolated environment.
2. For a runnable user-facing symptom activate source-read-only `acceptance-verify` to capture the boundary failure.
3. Activate `debug` to trace the runtime and data path, falsify alternatives, and support a root cause before changing production code.
4. Preserve the smallest useful reproduction, expected result, and causal evidence; ingest the supported chain.
5. Activate `test` for the smallest stable regression proof; before fixing, confirm it fails through the supported causal path rather than setup error.
6. When reproduction or automation is unsafe, use the strongest repeatable evidence and disclose the gap. Escalate if no pre-fix failure can be shown.

## Fix and commit

1. Activate `implement` to correct the supported root cause with the smallest compatible change.
2. Require the regression proof and safe original reproduction to pass and run adjacent checks.
3. Inspect the base diff and exclude diagnostics, secrets, generated noise, and unrelated changes.
4. Create the authorized bugfix commit, then ingest its implementation and verification evidence.

## Review and fix

1. Before every round, obtain a controller review lease for the exact HEAD and capability-matched reviewer batch. Use a fresh project-scoped read-only reviewer agent or subagent, activate `review`, and forbid delegation or mutation. If unavailable, stop; a non-independent fallback cannot report `CLEAN`.
2. The controller exclusively owns the review-batch counter; the original orchestrator owns transitions. Every child performs one leased bounded pass, returns Evidence Contract output, and never invokes or requests another review or loop.
3. Give each reviewer the exact snapshot, expected behavior, causal evidence, checks, full diff, guidance, prior dispositions, and accepted decisions.
4. Require `CLEAN` or findings with stable ID, severity, category, location, evidence, impact, and remediation.
5. Add a risk-required read-only specialist to the same batch.
6. Ingest the review, preserve claimed severity, and record one structured disposition for every finding before editing. Low findings are `non-blocking`; unrelated valid defects are `out-of-scope`; insufficient claims are `unvalidated` and never enter a fix cycle.
7. Keep the original agent as fixer and activate `fix-findings` once for actionable findings. Validate the changed scope and dispositions; never let a reviewer modify the bugfix.
8. Create the loop-owned review-fix commit on the first fix cycle and amend only that unpushed commit on later cycles. Strengthen regression proof, ingest the new committed HEAD and verification evidence, then acquire a fresh lease.

## Loop controls

- One round is one batch over one HEAD: the general reviewer plus risk-required specialists.
- Run rounds sequentially. Never start future review rounds in advance; after a round finds actionable defects, validate, fix, and verify them before starting the next round.
- `CLEAN` means no actionable defect; optional suggestions do not block.
- The controller enforces five batches, four fix cycles, and one no-verdict retry for the entire bugfix run. Its persisted counters are monotonic and non-renewable; `continue`, extra commit authority, provider changes, or more-round requests never reset or extend them.
- Never review the same HEAD twice. The sole no-verdict retry reuses its numbered batch and a fresh lease.
- Stop earlier for a repeated finding, material reviewer conflict, or needed product decision.
- If fifth-batch triage confirms an actionable defect, accept the controller's `BUDGET_EXHAUSTED` transition, do not mutate, and report its recovery record. A narrower linked run needs explicit approval and never makes this run `CLEAN`.
- Never hide, downgrade, or close a disputed finding to terminate the loop.

## Finalize

1. After clean review, run required checks, safe reproduction, and affected acceptance scenarios; ingest final evidence.
2. If final verification changes state, fix and freshly review within the remaining budget; otherwise do not claim `CLEAN` or commit it.
3. Inspect the worktree and stage only validated bugfix-loop fixes.
4. Keep validated later fixes in the single loop-owned review-fix commit, amending it before each fresh review when needed; do not create an empty or third commit.
5. Complete the controller run only after final evidence passes. Preserve worktrees unless removal is authorized and report commits, causal evidence, budgets, findings, checks, relevant local insights, and residual risks. Always print the controller's `CLEAN` or `CLEAN_WITH_RESIDUALS` completion kind and list every residual finding with severity, disposition, reason code, and location.
6. Do not claim completion when the cause is unsupported, regression proof is absent without a disclosed limitation, blocking findings remain, or required checks fail.

## Decision-log updates

Record the supported root cause, discarded high-likelihood hypotheses, evidence gaps, remediation tradeoffs, finding disputes, accepted risks, and loop termination decisions.
When durable state is approved, update the selected work item's findings.md with reproduction, root-cause, regression, review-round, and verification evidence and append material remediation or accepted-risk decisions to decisions.md; otherwise report loop state and decisions in the final response.

## Escalate to the human

Escalate when expected behavior is undefined; reproduction risks data, privacy, cost, or availability; isolation or repository ownership is ambiguous; authority or access is missing; evidence cannot distinguish the cause; the minimal fix changes a public contract; reviewers materially disagree; or the fifth round ends without a clean independently reviewed state.
