# Evidence Contract and Loop Controller

Read this reference only after an explicit `delivery-loop` or `bugfix-loop` invocation is approved. The controller is mandatory for bounded-loop completion; it is not a user setup step.

## Contract

Every caller-supplied evidence envelope uses schema version 2:

```json
{
  "schema_version": 2,
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
- `review.completed`: `outcome: clean|findings|no-verdict`, the active `lease_id`, and a findings array. Each finding has `id`, `severity`, `category`, `location`, `evidence_status`, structured `evidence`, `impact`, and `remediation`. Evidence points to the reviewed HEAD and never changes severity automatically.
- `findings.triaged`: `outcome: completed` and exactly one structured disposition per pending finding: `actionable`, `non-blocking`, `out-of-scope`, `duplicate`, `stale`, `not-reproducible`, `accepted-risk`, or `unvalidated`. Every disposition has its allowed `reason_code` and concise `summary`; disposition-specific proof is mandatory.
- `fix.completed`: a committed new `head_sha`, non-empty `files`, and exactly one `fixed|blocked` disposition per actionable finding.
- `run.completed`: `outcome: completed` after review and final verification. The controller derives `completion_kind: clean|clean_with_residuals`; callers cannot choose it.
- `run.blocked` and `run.resumed`: use their matching outcome and explain limitations or resumption evidence.

## Finding decisions

Read `finding-rubric.md` before producing or triaging findings. Severity describes impact; disposition describes what the current run may do about it.

- `actionable` is limited to evidence-supported `critical`, `high`, or `medium` findings that the reviewed change caused or materially exposed and that are inside the approved scope.
- A valid `low` finding uses `non-blocking` and never consumes a fix cycle.
- A valid finding outside the reviewed change or current authority uses `out-of-scope`; it must not silently expand the run.
- A claim with insufficient evidence uses `unvalidated`; it remains visible but never enters a fix cycle.
- Unsupported preferences and speculative risks are not findings.

The controller enforces evidence shape and HEAD binding, known severities and disposition-specific proof, the `low`/`non-blocking` pairing, an explicit `accepted_by.type: human` approval record for accepted risk, and attempted checks for not-reproducible claims. It preserves unresolved items in a residual ledger. The host remains responsible for whether reported observations are true; structured evidence is host-observed, not a security boundary.

Schema-version-1 runs remain available through `list` and `status` for read-only inspection. Resume and every mutation are rejected with an explicit version error. An active v1 run may be replaced only after human approval by creating a linked v2 successor; the v1 event chain remains untouched and records `superseded_by_run_id` in inspection output. Never migrate, delete, or replace an old run silently.

## Automatic protocol

Resolve this skill's `scripts/loop-controller.mjs`; never ask the user to run it. Use a temporary owner-readable JSON file for caller evidence and remove it after ingestion.

1. After workflow approval and before implementation, start or resume the run:

```text
node <skill-root>/scripts/loop-controller.mjs start --kind <delivery|bugfix> \
  --worktree <approved-worktree> --acceptance <AC-1,AC-2> \
  --risks <risk-signals> --json
```

If `start` reports an active read-only v1 run, show its ID and obtain explicit
human approval. After approval, invoke the controller yourself; never ask the
user to operate it and never purge legacy evidence:

```text
node <skill-root>/scripts/loop-controller.mjs supersede \
  --worktree <approved-worktree> --run-id <legacy-run-id> --confirm --json
```

The command inherits kind, acceptance IDs, and risk signals, starts from the
current committed HEAD, records `supersedes_run_id`, and is idempotent.

2. Record each completed phase through `milestone`, `verify`, `findings-triage`, `fix-complete`, `complete`, `block`, or `resume` with `--run-id` and `--evidence-file`.
3. Before any reviewer starts, acquire a lease:

```text
node <skill-root>/scripts/loop-controller.mjs review-begin \
  --worktree <worktree> --run-id <run> --head <HEAD> \
  --reviewers <general,required-specialists> --json
```

4. Put the issued `run_id`, `lease_id`, batch, attempt, and HEAD in every reviewer task. Ingest its one-pass result with `review-complete`; reject results the controller rejects.
5. A findings result must be triaged before mutation. Only evidence-supported actionable `critical`, `high`, or `medium` findings enter `fix-complete`; every unresolved non-actionable item remains in the residual ledger.
6. Report the controller's status and consumed budgets in progress updates.

Do not edit controller state, event files, budget fields, or hashes directly. Do not replace a rejected transition with prose. A failure to execute or persist strict control ends the named loop; offer ordinary implementation or bug fixing only as a separately approved degraded workflow that cannot claim bounded or independently reviewed completion.

The controller enforces transitions only after an agent starts a managed run and continues to invoke it. Skill activation, controller invocation, reviewer independence, and the truthfulness of supplied evidence remain host- and model-dependent. The hash chain is tamper-evident, not tamper-proof, and is not a security boundary.

## Fixed and adaptive behavior

The controller may recommend specialists from risk signals and repository-local history. The orchestrator may omit irrelevant specialists or stop early when evidence is complete. It must never change the controller's five review batches, four fix cycles, one no-verdict retry, permissions, external cost, or user-approved scope.

The fifth batch may be triaged but not fixed. Actionable findings produce `BUDGET_EXHAUSTED` and a recovery record. Do not continue the run or create a successor automatically; offer a narrower linked run, explicit risk acceptance, or stop.

Completed summaries and insights are local, redacted, advisory, and evidence-linked. A completed run with residual findings reports `clean_with_residuals`, never plain `clean`. These records never train a model or silently modify skills or policy.
