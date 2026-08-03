---
name: debug
description: Use when behavior is wrong, failing, flaky, slow, inconsistent, or unexplained and the root cause must be isolated from runtime evidence; use bugfix-loop only when its full isolated fix-and-review workflow is explicitly requested.
---

# Debug

## Purpose

Reproduce the symptom, trace the failing path, falsify competing hypotheses, isolate root cause, and verify the requested resolution.

## Workspace protocol

Read `references/workspaces.md` once per agent task before selecting or creating workflow artifacts; reuse it unless repository scope or task authority changes. This skill owns only the task-specific behavior below.

## Inputs

- Exact symptom, error, payload, timing, environment, and expected behavior
- Relevant logs, traces, code paths, stored data, configuration, and recent changes
- Reproduction access and constraints

## Outputs

- Minimal reproduction or strongest available evidence
- Root cause with causal chain, not just correlation
- If fixes are authorized: minimal fix, regression test, and verification
- If diagnosis-only: recommended next action without source edits

## Workflow

1. Reproduce the symptom at the observed boundary and capture the smallest reliable evidence.
2. Trace backward through the real runtime and data path; state competing hypotheses and what would falsify each one.
3. Run the cheapest discriminating check first, changing one variable at a time and preserving useful raw evidence.
4. Isolate the causal mechanism before patching unless containment of an active incident is explicitly authorized.
5. When fixes are authorized, make the smallest supported change, reproduce again, and run adjacent regression checks.

## Decision-log updates

Record confirmed root cause, discarded high-likelihood hypotheses, material diagnostic pivots, chosen remediation tradeoffs, and remaining uncertainty. Avoid logging every command.
When durable state is approved, append the validated root cause, rejected material hypotheses, and consequential fix choices to the selected work item's decisions.md and create handoff.md only when work remains; for a selected approved durable work item with an existing plan.md, update only relevant plan-item status and verification evidence for the performed debugging scope, never invent unrelated work, and do not mark the work completed unless the workspace lifecycle criteria are satisfied; otherwise include material decisions and performed-scope verification in the final response.

## Escalate to the human

Escalate when reproduction risks data or availability, required logs or access need new authority, evidence suggests an active incident or security issue, or multiple fixes imply materially different product behavior.
