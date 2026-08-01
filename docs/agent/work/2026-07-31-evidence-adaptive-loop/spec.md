---
work_id: 2026-07-31-evidence-adaptive-loop
title: Evidence-driven adaptive engineering loops
status: completed
branch: main
created: 2026-07-31
updated: 2026-08-01
---

# Goal

Release `nono-skills` 0.12.0 with provider-neutral engineering loops that preserve evidence across host sessions, enforce bounded review/fix transitions, choose agents from verified capabilities, and derive local recommendations from completed runs without training or silently changing policy.

# Scope

- Add a portable deterministic controller bundled with both `delivery-loop` and `bugfix-loop`.
- Store repository-local run state and evidence beneath the Git common directory, never in tracked source.
- Require structured evidence for implementation, verification, review, fix, block, and completion transitions.
- Enforce immutable budgets, review leases, snapshot identity, replay rejection, and terminal recovery semantics.
- Extend agent selection with explicit role and capability requirements while preserving Native-first behavior and external-agent consent.
- Produce privacy-preserving completed-run summaries and evidence-backed repository insights.
- Expose optional inspection commands without adding mandatory setup or new public skills.
- Preserve all existing installation modes and keep unrelated skills free of controller overhead.

# Non-goals

- Train, fine-tune, or modify model weights.
- Store full prompts, conversations, source, diffs, terminal logs, secrets, or environment values as learning data.
- Let history change permissions, external cost, hard budgets, acceptance criteria, or findings automatically.
- Add cloud telemetry, a daemon, a dashboard, global provider rankings, or automatic skill rewriting.
- Build a general multi-feature program orchestrator in this release.

# Acceptance Contract

## AC-1 — Evidence-gated transitions

Observable outcome: every state-changing loop phase accepts a versioned evidence envelope and rejects missing, malformed, stale, mismatched, or phase-incompatible evidence.

Verification boundary: controller unit and CLI integration tests.

Expected evidence: successful fixtures for every event type and negative fixtures for invalid run IDs, HEADs, leases, outcomes, and required phase fields.

## AC-2 — Durable repository-local identity

Observable outcome: a run receives a package-owned `run_id` independent of host session IDs and can be resumed by canonical worktree identity after process or context restart.

Verification boundary: temporary Git repository tests, including linked worktree-compatible Git common-directory resolution.

Expected evidence: persisted manifest/state/event files outside the tracked worktree and successful reload in a new controller instance.

## AC-3 — Immutable adaptive budget

Observable outcome: the controller permits at most five review batches, four fix cycles, and one no-verdict retry for a run; continuation, provider changes, process restart, or arbitrary caller input cannot raise or reset those limits.

Verification boundary: exhaustive transition and restart tests.

Expected evidence: rejected sixth batch, rejected fifth-batch fix, rejected second retry, and unchanged limits after reload.

## AC-4 — Review leases and snapshot integrity

Observable outcome: each review batch is bound to one lease and HEAD; duplicate HEAD review, replayed completion, stale lease, simultaneous active review, or mismatched output is rejected.

Verification boundary: unit, concurrency, and external bridge contract tests.

Expected evidence: one accepted transition and deterministic errors for every replay/staleness case.

## AC-5 — Safe terminal recovery

Observable outcome: actionable findings in batch five transition the run to `BUDGET_EXHAUSTED` without authorizing mutation, fix, clean status, or completion, and emit a recovery summary for explicit narrower follow-up.

Verification boundary: controller transition and skill contract tests.

Expected evidence: terminal state containing remaining finding IDs, reviewed HEAD, limitations, and parent-link guidance.

## AC-6 — Evidence-driven adaptation

Observable outcome: risk evidence may select or omit relevant specialist capabilities and may stop early, while hard budgets and authority remain unchanged.

Verification boundary: capability-router tests and behavioral evaluation cases.

Expected evidence: reasoned selections for security, architecture, migration, and acceptance risks plus rejection when no eligible provider preserves the boundary.

## AC-7 — Capability-aware, provider-neutral agents

Observable outcome: eligible agents are filtered by availability, compatibility, role, policy, and required capabilities rather than provider name; Native remains the default and External or Hybrid still requires explicit consent.

Verification boundary: provider registry and selection tests across every bundled adapter.

Expected evidence: deterministic selection report with eligible, rejected, and missing-capability reasons.

## AC-8 — Local experience memory

Observable outcome: terminal runs produce redacted summaries and repository insights whose recommendations cite supporting runs; no recommendation silently changes policy.

Verification boundary: summary, aggregation, privacy, and sparse-history tests.

Expected evidence: local insight records containing counts and run references but no prompts, diffs, source, secrets, or raw command output.

## AC-9 — Transparent inspection and control

Observable outcome: optional commands can list/show runs, print repository insights, and purge package-owned evidence; normal skill use requires no manual controller command.

Verification boundary: CLI parsing/handler tests and filesystem safety tests.

Expected evidence: stable machine-readable output, conservative purge behavior, and unchanged normal install/update flow.

## AC-10 — Portable fail-closed behavior

Observable outcome: controller assets are self-contained in both loop skills and work on Windows, macOS, and Linux; if strict control cannot run, the explicit loop stops or offers an ordinary degraded workflow that cannot claim bounded independent completion.

Verification boundary: portable-resource sync, package-content, skill-contract, and CI tests.

Expected evidence: identical controller/reference resources in both skills and explicit fail-closed instructions.

## AC-11 — Progressive-disclosure compatibility

Observable outcome: existing skill names and invocation UX remain stable, non-loop skills load no new runtime context, and loop SKILL bodies remain within enforced word budgets.

Verification boundary: package validation, metadata, word-budget, and behavioral activation tests.

Expected evidence: unchanged 18-skill inventory, passing activation corpus, and package dry-run.

# Rollback

The runtime is additive and repository-local. Rollback consists of restoring the 0.11.1 skill/runtime bundle; existing `.git/nono-skills` evidence remains inert and must not be removed automatically. A future controller must reject unsupported evidence schema versions rather than mutating them.
