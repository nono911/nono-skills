---
name: release-readiness
description: Use when a change, branch, build, migration, or release candidate must be assessed before merge, deployment, rollout, or handoff.
---

# Release Readiness

## Purpose

Produce an evidence-backed `ready`, `not ready`, or `ready with accepted risks` verdict. Assessment does not authorize release actions.

## Inputs

- Release scope, target environment, acceptance criteria, and rollout expectations
- Current worktree or candidate, CI results, tests, findings, migrations, docs, and operational signals
- Rollback, observability, compatibility, and ownership information

## Outputs

- Verdict with blockers, accepted risks, and evidence
- Checklist covering code quality, tests, build, security, data change, compatibility, observability, rollback, docs, and support readiness as applicable
- Exact unverified items and required next actions

## Rules

- Inspect current state; do not rely on stale claims that checks passed.
- Run the strongest safe local checks and distinguish local proof from CI, staging, and production proof.
- Treat code complete, merge ready, deploy ready, deployed, and verified in production as separate states.
- Block on open critical or high findings unless risk is explicitly accepted by the proper owner.
- Do not merge, tag, publish, deploy, or migrate without explicit authorization.

## Decision-log updates

Record risk acceptance, waived gates, rollout or rollback choices, and readiness verdict changes with evidence. Link unresolved findings and owners.
Use an existing `docs/agent/decision-log.md`. If it is absent, include the decision in the final response; create workflow artifacts only when the user requests them.

## Escalate to the human

Escalate for blocked gates, missing rollback for high-risk changes, unresolved ownership, destructive migration, compliance or security risk, production action, or any request to waive a required control.
