---
name: delivery-loop
description: "Use only when explicitly invoked to deliver a feature in approved isolated Git worktrees through orchestrated implementation, optional delegated agents, local commits, fresh read-only review rounds, validated fixes, and re-review until clean."
---

# Delivery Loop

## Purpose

Deliver a feature through an isolated implement-review-fix loop.

## Workspace protocol

Read `references/workspaces.md` once per agent task before selecting or creating workflow artifacts; reuse it unless repository scope or task authority changes. This skill owns only the task-specific behavior below.

## Evidence control

- After approval, read `references/evidence-contract.md` and use the bundled controller before implementation. Start or resume one local run. If active schema-v1 blocks startup, show its ID and obtain approval for a linked v2 successor. Never ask the user to operate the controller or silently purge legacy evidence.
- Before review or finding triage, read `references/finding-rubric.md` and apply its severity and disposition contract.
- Treat the controller-issued run ID, evidence events, review leases, snapshots, and immutable budgets as authoritative across continuation, compaction, replanning, providers, and child returns. Never edit controller state directly or replace a rejected transition with prose.
- Record implementation, verification, review, finding triage, fixes, blocks, and completion through Evidence Contract v2. Keep prompts, conversations, source, diffs, terminal logs, environment values, and secrets out of evidence.
- Use the controller's capability plan and local insights only as evidence-linked advice for specialist selection. They never expand authority, scope, cost, or budgets or silently modify policy.
- If strict control cannot execute or persist, stop this named loop. Offer ordinary implementation only with separate authority and never claim bounded or independently reviewed completion.

## Companions and delegation

- Refer to companions by frontmatter name, invoke them through the host's native mechanism, and never assume a literal invocation prefix.
- Core companions are `implement`, `review`, and `fix-findings`. Use `plan` when durable multi-step planning is warranted, `acceptance-verify` when a runnable user journey is material, and security, architecture, or migration specialists only when the changed risk requires them.
- Keep the original agent as orchestrator and delegate only bounded work.
- At approval offer `Native subagents (default)`, `External CLI agents`, and `Hybrid`; an unspecified choice means Native.
- Probe or invoke external providers only after External, Hybrid, a named provider, or an options request. Then read `references/agent-delegation.md`, obtain explicit per-run consent before sharing source, and never invoke the current host externally.
- Match agents to required roles and enforceable capabilities rather than provider names. Use one writer per file boundary, isolate delegated writers, and keep integration, verification, Git operations, and official commits with the orchestrator.

## Inputs

- Feature request, acceptance criteria, repository instructions, and required checks
- Base revision, worktree state, unrelated changes, Git identity rules, and current authority
- Execution mode and approved provider limits when applicable

## Outputs

- One approved isolated implementation and commit
- Evidence-linked execution with no more than five review batches, four fix cycles, and one no-verdict retry for the entire run
- A second commit only for validated later fixes that pass fresh review
- Verification, delegation, commit, and residual-risk evidence

## Approval and isolation

- Before isolation approval, decide whether the request fits one independently verifiable change. Otherwise activate `plan`, propose coherent slices, and ask which to deliver before creating artifacts, a worktree, or a controller run.
- Inspect repository scope, worktrees, base SHA, HEAD, and change states before editing.
- Reuse a host-managed worktree without nesting; otherwise reuse only a dedicated feature worktree with an unambiguous base. Do not move a detached task or check its branch out elsewhere.
- Otherwise propose the exact base, branch, and worktree and request one approval for creation and two local commits unless already authorized. The implementation commit may be amended before review; one unpushed review-fix commit may be amended later.
- Invocation alone grants neither worktree nor commit authority. In a reused worktree request only missing authority for up to two local commits.
- If required isolation is declined, stop this loop and offer ordinary implementation in the checkout only with explicit write and commit authority.
- Approval covers isolation and two loop-owned commits; push, merge, deploy, external mutation, handoff, removal, and deletion remain separate.
- Preserve unrelated changes and follow repository remote and identity rules before each commit.
- Do not copy ignored files or secrets or change host worktree rules without authorization.
- Before editing require a fresh isolated read-only reviewer. Otherwise offer ordinary implementation with disclosed self-review or stop; that path cannot report `CLEAN`.

## Implement and commit

1. Create a CLI worktree and branch only when approved and required; otherwise remain in the approved isolated environment.
2. For multi-step work activate `plan` before implementation; keep small well-defined features artifact-light and follow workspace consent for durable state.
3. Keep the original agent as orchestrator and activate `implement` for the smallest complete TDD-preferred feature with acceptance-linked proof.
4. For a material runnable journey activate source-read-only `acceptance-verify`, resolve validated failures, and rerun affected scenarios.
5. Validate delegated scope and claims, verify in proportion to risk, and exclude out-of-scope changes.
6. Stage only in-scope changes, create the authorized implementation commit, then ingest its implementation and verification evidence.

## Review and fix

1. Before every round, obtain a controller review lease for the exact HEAD and capability-matched reviewer batch. Use a fresh project-scoped read-only reviewer agent or subagent, activate `review`, and forbid delegation or mutation. If unavailable, stop; a non-independent fallback cannot report `CLEAN`.
2. The controller exclusively owns the review-batch counter; the original orchestrator owns transitions. Every child performs one leased bounded pass, returns Evidence Contract output, and never invokes or requests another review or loop.
3. Give each reviewer the exact snapshot, criteria, checks, full diff, guidance, prior dispositions, and accepted decisions.
4. Require `CLEAN` or findings with stable ID, severity, category, location, evidence, impact, and remediation.
5. Add a risk-required read-only specialist to the same batch.
6. Ingest the review, preserve claimed severity, and record one structured disposition for every finding before editing. Low findings are `non-blocking`; unrelated valid defects are `out-of-scope`; insufficient claims are `unvalidated` and never enter a fix cycle.
7. Keep the original agent as fixer and activate `fix-findings` once for actionable findings. Validate the changed scope and dispositions; never let a reviewer modify the feature.
8. Create the loop-owned review-fix commit on the first fix cycle and amend only that unpushed commit on later cycles. Ingest the new committed HEAD and verification evidence, then acquire a fresh lease.

## Loop controls

- One round is one batch over one HEAD: the general reviewer plus risk-required specialists.
- Run rounds sequentially: review, validate and fix findings, verify, then start a fresh review. Never launch all five rounds at once.
- `CLEAN` means no actionable defect; optional suggestions do not block.
- The controller enforces five batches, four fix cycles, and one no-verdict retry for the entire delivery run. Its persisted counters are monotonic and non-renewable; `continue`, extra commit authority, provider changes, or more-round requests never reset or extend them.
- Never review the same HEAD twice. The sole no-verdict retry reuses its numbered batch and a fresh lease.
- Stop earlier for a repeated finding, material reviewer conflict, or needed product decision.
- If fifth-batch triage confirms an actionable defect, accept the controller's `BUDGET_EXHAUSTED` transition, do not mutate, and report its recovery record. A narrower linked run needs explicit approval and never makes this run `CLEAN`.
- Keep external calls within their approved bound.
- Never hide, downgrade, or close a disputed finding to terminate the loop.

## Finalize

1. After a clean review, run all required checks and affected acceptance scenarios, then ingest final verification evidence.
2. If final verification changes state, fix and freshly review within the remaining budget; otherwise do not claim `CLEAN` or commit it.
3. Inspect the worktree and stage only validated delivery-loop fixes.
4. Keep validated later fixes in the single loop-owned review-fix commit, amending it before each fresh review when needed; do not create an empty or third commit.
5. Complete the controller run only after final evidence passes. Preserve worktrees unless removal is authorized. Lead the report with outcome, commits, acceptance-to-proof mapping, budgets, findings, checks, delegation, insights, and risks. Always print the controller's `CLEAN` or `CLEAN_WITH_RESIDUALS` completion kind and list every residual finding with severity, disposition, reason code, and location.
6. Do not claim completion while blocking findings or required checks remain.

## Decision-log updates

Record material finding disputes, remediation tradeoffs, accepted risks, loop termination decisions, and why any review finding was not fixed.
When durable state is approved, update the selected work item's findings.md with review-round status and verification evidence and append material remediation or accepted-risk decisions to decisions.md; otherwise report loop state and decisions in the final response.

## Escalate to the human

Escalate when isolation or repository ownership is ambiguous; required authority, consent, access, remote, or identity is missing; external providers disagree on acceptance behavior; a fix changes a public contract; reviewers materially disagree; or the fifth round ends without a clean independently reviewed state.
