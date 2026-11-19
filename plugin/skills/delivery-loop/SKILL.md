---
name: delivery-loop
description: "Use when the user requests delivery-loop or complete isolated feature delivery with local commits and bounded independent review; use implement for ordinary feature work."
---

# Delivery Loop

## Purpose

Deliver a feature through an isolated implement-review-fix loop.

## Workspace protocol

Read `references/workspaces.md` once per agent task before selecting or creating workflow artifacts; reuse it unless repository scope or task authority changes. This skill owns only the task-specific behavior below.

## Evidence control

- Before implementation, read `references/evidence-contract.md` and start or resume one local run through the bundled controller. An active schema-v1 run still requires explicit approval for a linked v2 successor; never purge legacy evidence or ask the user to operate the controller.
- Before review or finding triage, read `references/finding-rubric.md` and apply its severity and disposition contract.
- Treat the controller-issued run ID, evidence events, review leases, snapshots, and immutable budgets as authoritative across continuation, compaction, replanning, providers, and child returns. Never edit controller state directly or replace a rejected transition with prose.
- Record implementation, verification, review, finding triage, fixes, blocks, and completion through Evidence Contract v2. Keep prompts, conversations, source, diffs, terminal logs, environment values, and secrets out of evidence.
- Use the controller's capability plan and local insights only as evidence-linked advice for specialist selection. They never expand authority, scope, cost, or budgets or silently modify policy.
- If strict control cannot execute or persist, stop this named loop. Offer ordinary implementation only with separate authority and never claim bounded or independently reviewed completion.

## Companions and delegation

- Refer to companions by frontmatter name, invoke them through the host's native mechanism, and never assume a literal invocation prefix.
- Core companions are `implement`, `review`, and `fix-findings`. Use `plan` when durable multi-step planning is warranted, `acceptance-verify` when a runnable user journey is material, and security, architecture, or migration specialists only when the changed risk requires them.
- Before delegation, read `references/delegation-selection.md`.
- Use the active host's native subagents without a mode-selection question. Offer External or Hybrid only when the user requests them, names a provider, or asks for options.
- Probe or invoke external providers only after External, Hybrid, a named provider, or an options request. Then read `references/agent-delegation.md`, obtain explicit per-run consent before sharing source, and never invoke the current host externally.
- Match agents to required roles and enforceable capabilities rather than provider names. Use one writer per file boundary, isolate delegated writers, and keep integration, verification, Git operations, and official commits with the orchestrator.

## Inputs

- Feature scope, acceptance criteria, repository rules, and checks
- Base revision, worktree state, unrelated changes, Git identity rules, and current authority
- Execution mode and approved provider limits when applicable

## Outputs

- One isolated feature implementation and up to two local commits
- Evidence-linked execution within the fixed review and fix budgets
- One optional review-fix commit, independently reviewed

## Defaults and isolation

- Before isolation, check that scope fits one independently verifiable change. Otherwise activate `plan`, propose coherent slices, and ask which to deliver before creating artifacts, worktrees, or controller state.
- Inspect scope, worktrees, base SHA, HEAD, and changes before editing.
- Reuse a host-managed worktree without nesting or renaming it. Otherwise use a dedicated task worktree and read `references/branch-naming.md` before creating its branch. Never move a detached task or check out its branch elsewhere.
- An explicit request to execute `delivery-loop`, by name or equivalent full-workflow intent, authorizes task worktrees, up to two loop-owned local commits, and native subagents without another confirmation. Discovery, discussion, planning-only requests, and ordinary implementation do not.
- User, repository, and host restrictions override these defaults. If isolation or commits are prohibited, report the conflict and stop this loop; do not bypass controls or silently degrade it.
- For a new worktree, use the requested base or current committed HEAD, a contextual branch, and an unused path. Briefly announce the selection and proceed; ask only when the intended base or scope cannot be established safely.
- Push, merge, release, deploy, external mutation, worktree removal, and branch deletion need separate authorization.
- Preserve unrelated changes and follow repository remote and identity rules before each commit. Never include uncommitted user work without task authority.
- Do not copy ignored files or secrets or change host worktree rules without authorization.
- Before editing, require a fresh isolated read-only reviewer for the selected mode; otherwise stop without claiming independent review or switching providers.

## Implement and commit

1. Create the required task worktree and branch under the defaults above, or reuse existing task isolation.
2. For multi-step work activate `plan` before implementation; keep small well-defined features artifact-light and follow workspace consent for durable state.
3. Keep the original agent as orchestrator and activate `implement` for the smallest complete TDD-preferred feature with acceptance-linked proof.
4. For a material runnable journey activate source-read-only `acceptance-verify`, resolve validated failures, and rerun affected scenarios.
5. Validate delegated scope and claims, verify in proportion to risk, and exclude out-of-scope changes.
6. Stage only in-scope changes, create the implementation commit, then ingest its implementation and verification evidence. Amend only loop-owned unpushed commits; the implementation commit is amendable only before review.

## Review and fix

1. Before every round, obtain a controller review lease for the exact HEAD and capability-matched reviewer batch. Use a fresh project-scoped read-only reviewer agent or subagent, activate `review`, and forbid delegation or mutation. If unavailable, stop; a non-independent fallback cannot report `CLEAN`.
2. The controller exclusively owns the review-batch counter; the original orchestrator owns transitions. Every child performs one leased bounded pass, returns Evidence Contract output, and never invokes or requests another review or loop.
3. Supply snapshot, criteria, causal evidence where relevant, checks, full diff, guidance, dispositions, and accepted decisions.
4. Require `CLEAN` or findings following the evidence contract.
5. Include required read-only specialists in this batch.
6. Ingest the review, preserve claimed severity, and record one structured disposition for every finding before editing. Low findings are `non-blocking`; unrelated valid defects are `out-of-scope`; insufficient claims are `unvalidated` and never enter a fix cycle.
7. Keep the original agent as fixer and activate `fix-findings` once for actionable findings. Validate the changed scope and dispositions; never let a reviewer modify the feature.
8. Create the loop-owned review-fix commit on the first fix cycle and amend only that unpushed commit on later cycles. Ingest the new committed HEAD and verification evidence, then acquire a fresh lease.

## Loop controls

- One round is one batch over one HEAD.
- Run rounds sequentially: review, validate and fix findings, verify, then start a fresh review. Never launch all five rounds at once.
- `CLEAN` means no actionable defect; optional suggestions do not block.
- The controller enforces five batches, four fix cycles, and one no-verdict retry for the entire delivery run. Its persisted counters are monotonic and non-renewable; `continue`, extra commit authority, provider changes, or more-round requests never reset or extend them.
- Never review the same HEAD twice. The sole no-verdict retry reuses its numbered batch and a fresh lease.
- Stop for repeated findings, material reviewer conflict, or needed product decisions. If observed friction recurs or the budget is exhausted, briefly offer `retro`; run it only on request, without changing this run's outcome or budget.
- If fifth-batch triage confirms an actionable defect, accept the controller's `BUDGET_EXHAUSTED` transition, do not mutate, and report its recovery record. A narrower linked run needs explicit approval and never makes this run `CLEAN`.
- Keep external calls within their approved bound.
- Never hide, downgrade, or close a disputed finding to terminate the loop.

## Finalize

1. After clean review, read `references/verification.md`; reuse only valid results and run missing or invalidated required checks and affected scenarios. Ingest final evidence at the current HEAD.
2. If final verification changes state, fix and freshly review within the remaining budget; otherwise do not claim `CLEAN` or commit it.
3. Stage only validated delivery-loop fixes.
4. Keep validated later fixes in the single loop-owned review-fix commit, amending it before each fresh review when needed; do not create an empty or third commit.
5. Complete the controller run only after final evidence passes. Preserve worktrees unless removal is authorized. Lead the report with outcome, commits, acceptance-to-proof mapping, budgets, findings, checks, delegation, insights, and risks. Always print the controller's `CLEAN` or `CLEAN_WITH_RESIDUALS` completion kind and list every residual finding with severity, disposition, reason code, and location.

## Decision-log updates

Record material finding disputes, remediation tradeoffs, accepted risks, loop termination decisions, and why any review finding was not fixed.
When durable state is approved, update the selected work item's findings.md with review-round status and verification evidence and append material remediation or accepted-risk decisions to decisions.md; otherwise report loop state and decisions in the final response.

## Escalate to the human

Escalate when isolation or repository ownership is ambiguous; required authority, consent, access, remote, or identity is missing; external providers disagree on acceptance behavior; a fix changes a public contract; reviewers materially disagree; or the fifth round ends without a clean independently reviewed state.
