# Decisions

## D-1 — Treat evidence as the foundation

Evidence Contract v1 is the input to controller transitions, capability routing, local summaries, and future behavioral regressions. Free-form prose may accompany evidence but cannot authorize a state change.

Affected plan items: 1–7.

## D-2 — Learn through local experience memory, not model training

Version 0.12.0 stores redacted structured outcomes in the repository's Git common directory and produces advisory insights. It does not train models, transmit telemetry, or modify skills, budgets, permissions, findings, or acceptance criteria automatically.

Affected plan items: 2, 5, 6.

## D-3 — Keep adaptive choices inside immutable safety bounds

The controller may select relevant capabilities, omit unnecessary specialists, stop early, or recommend scope reduction. Five review batches, four fix cycles, one no-verdict retry, authority boundaries, and terminal exhaustion semantics are fixed for the run.

Affected plan items: 1, 3, 4, 7.

## D-4 — Preserve portable skill installation

The loop controller and its reference contract must be self-contained inside each loop skill. Maintain one canonical copy and synchronize generated portable copies so Codex plugins and individual skill installers receive equivalent behavior.

Affected plan items: 4, 7.

## D-5 — Reuse one amendable review-fix commit

Each fix cycle still requires a new committed HEAD for clean review isolation, but the approved final history remains at most two commits. The first fix cycle creates one loop-owned, unpushed review-fix commit; later cycles amend only that commit before the next leased review. Existing or shared commits are never rewritten.

Affected plan items: 1, 4, 7.

## D-6 — Local release candidate is ready; release actions remain separate

All local prepublish gates pass for version 0.12.0 and the package contains the intended runtime without durable development artifacts. Commit, push, remote CI, tag, and npm publish remain distinct actions requiring their normal authority; this readiness verdict does not perform them.

Affected plan item: 8.

## D-7 — Discover requirements adaptively without another public skill

Reopen the 0.12.0 candidate to add a compact discovery gate directly to `brainstorm` and `plan`. Agents inspect available evidence first, ask only one to three decision-changing questions, and proceed with disclosed reversible assumptions. This protects user intent without imposing an interview workflow on complete or low-risk requests.

Affected plan item: 9.
