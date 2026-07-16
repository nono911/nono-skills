---
name: debug
description: Use when behavior is wrong, failing, flaky, slow, inconsistent, or unexplained and the root cause must be isolated from runtime evidence.
---

# Debug

## Purpose

Reproduce the symptom, trace the failing path, falsify competing hypotheses, isolate root cause, and verify the requested resolution.

## Inputs

- Exact symptom, error, payload, timing, environment, and expected behavior
- Relevant logs, traces, code paths, stored data, configuration, and recent changes
- Reproduction access and constraints

## Outputs

- Minimal reproduction or strongest available evidence
- Root cause with causal chain, not just correlation
- If fixes are authorized: minimal fix, regression test, and verification
- If diagnosis-only: recommended next action without source edits

## Rules

- Start at the observed boundary and trace backward through the real runtime and data path.
- State hypotheses with evidence that would falsify each one; test the cheapest discriminating check first.
- Change one variable at a time and preserve useful raw evidence.
- Do not patch before identifying the causal mechanism unless containing an active incident is explicitly authorized.
- Reproduce again after the fix and run adjacent regression checks.

## Decision-log updates

Record confirmed root cause, discarded high-likelihood hypotheses, material diagnostic pivots, chosen remediation tradeoffs, and remaining uncertainty. Avoid logging every command.

## Escalate to the human

Escalate when reproduction risks data or availability, required logs or access need new authority, evidence suggests an active incident or security issue, or multiple fixes imply materially different product behavior.

