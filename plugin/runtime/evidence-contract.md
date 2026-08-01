# Evidence Contract and Loop Controller

Read this reference only after an explicit `delivery-loop` or `bugfix-loop` invocation is approved. The controller is mandatory for bounded-loop completion; it is not a user setup step.

## Contract

Every caller-supplied evidence envelope uses schema version 1:

```json
{
  "schema_version": 1,
  "event_type": "verification.completed",
  "run_id": "controller-issued-id",
  "actor": {
    "provider": "host-or-provider",
    "role": "orchestrator-or-worker",
    "capabilities": ["structured-output"]
  },
  "snapshot": {
    "base_sha": "run-base",
    "head_sha": "controlled-head"
  },
  "acceptance_ids": ["AC-1"],
  "outcome": "passed",
  "verification": {
    "performed": ["stable check and result"],
    "not_run": []
  },
  "limitations": []
}
```

Never put full prompts, conversations, source, diffs, terminal output, environment values, credentials, or secrets in evidence. Use repository-relative locations, concise observations, and digests. The controller writes package-owned state beneath the Git common directory, outside tracked source.

Event-specific fields:

- `diagnosis.completed`: `outcome: completed` and non-empty `causal_chain`.
- `implementation.completed`: `outcome: completed`, a committed new `head_sha`, and non-empty `files`.
- `verification.completed`: `outcome: passed|failed|blocked`; passed evidence names at least one performed check, failed evidence includes one structured `finding`, and blocked evidence names at least one limitation. A pre-review failure returns to implementation; a final failure enters a fix and fresh-review path only when both budgets remain.
- `review.completed`: `outcome: clean|findings|no-verdict`, the active `lease_id`, and a findings array. Each finding has `id`, `severity`, `category`, `location`, `evidence`, `impact`, and `remediation`.
- `findings.triaged`: `outcome: completed` and exactly one evidence-backed disposition per pending finding: `actionable`, `duplicate`, `stale`, `not-reproducible`, or `accepted-risk`.
- `fix.completed`: a committed new `head_sha`, non-empty `files`, and exactly one `fixed|blocked` disposition per actionable finding.
- `run.completed`: `outcome: completed` after clean review and final verification.
- `run.blocked` and `run.resumed`: use their matching outcome and explain limitations or resumption evidence.

## Automatic protocol

Resolve this skill's `scripts/loop-controller.mjs`; never ask the user to run it. Use a temporary owner-readable JSON file for caller evidence and remove it after ingestion.

1. After workflow approval and before implementation, start or resume the run:

```text
node <skill-root>/scripts/loop-controller.mjs start --kind <delivery|bugfix> \
  --worktree <approved-worktree> --acceptance <AC-1,AC-2> \
  --risks <risk-signals> --json
```

2. Record each completed phase through `milestone`, `verify`, `findings-triage`, `fix-complete`, `complete`, `block`, or `resume` with `--run-id` and `--evidence-file`.
3. Before any reviewer starts, acquire a lease:

```text
node <skill-root>/scripts/loop-controller.mjs review-begin \
  --worktree <worktree> --run-id <run> --head <HEAD> \
  --reviewers <general,required-specialists> --json
```

4. Put the issued `run_id`, `lease_id`, batch, attempt, and HEAD in every reviewer task. Ingest its one-pass result with `review-complete`; reject results the controller rejects.
5. A findings result must be triaged before mutation. Only actionable findings enter `fix-complete`.
6. Report the controller's status and consumed budgets in progress updates.

Do not edit controller state, event files, budget fields, or hashes directly. Do not replace a rejected transition with prose. A failure to execute or persist strict control ends the named loop; offer ordinary implementation or bug fixing only as a separately approved degraded workflow that cannot claim bounded or independently reviewed completion.

## Fixed and adaptive behavior

The controller may recommend specialists from risk signals and repository-local history. The orchestrator may omit irrelevant specialists or stop early when evidence is complete. It must never change the controller's five review batches, four fix cycles, one no-verdict retry, permissions, external cost, or user-approved scope.

The fifth batch may be triaged but not fixed. Actionable findings produce `BUDGET_EXHAUSTED` and a recovery record. Do not continue the run or create a successor automatically; offer a narrower linked run, explicit risk acceptance, or stop.

Completed summaries and insights are local, redacted, advisory, and evidence-linked. They never train a model or silently modify skills or policy.
