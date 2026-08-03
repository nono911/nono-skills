# Finding Rubric

Use this reference when producing, triaging, or fixing review, QA, architecture, or security findings. It keeps severity, actionability, and loop behavior consistent without turning preferences or speculative risks into defects.

## Finding threshold

A finding is a concrete, evidence-backed defect in the reviewed scope. It must identify an observable failure or violated requirement, show why the current artifact causes it, and give a practical remediation direction.

Do not report style preferences, unproven possibilities, unrelated pre-existing defects, or questions as findings. Report them separately as non-finding notes only when they materially help the user.

## Severity

- `critical`: a supported path to severe user harm, exploitable security compromise, unrecoverable data loss, or broad production outage that warrants immediate escalation.
- `high`: a concrete defect that materially breaks an acceptance criterion, public contract, security boundary, data integrity, or a common production path.
- `medium`: a supported defect with limited blast radius, an edge-condition failure, or a meaningful reliability or maintainability impact with a viable workaround.
- `low`: a concrete minor defect or improvement with no material effect on required behavior, safety, compatibility, or release readiness. Low findings are non-blocking and do not consume a loop fix cycle.

Severity describes impact. It does not by itself prove that the item belongs in the current fix scope.

## Evidence

Keep severity independent from evidence strength. Never downgrade impact merely because evidence is incomplete. Record `evidence_status` as `supported` or `insufficient`; only supported findings may become actionable.

Every finding uses a structured evidence object:

- `kind`: `failing-check`, `reproduction`, `trace`, `static-path`, or `observation`
- `head_sha`: the exact reviewed HEAD
- `summary`: a concise observed fact, never raw output
- optional `reference`: a check selector, repository-relative locator, or artifact identifier
- optional `digest`: a `sha256:` digest for an externally retained artifact

Evidence kinds are not a strength ranking. A safe static path can support a severe security defect; a failing check can still be wrong. The controller validates shape and HEAD binding, not the truth of a host-reported result.

Read-only review forbids modifying reviewed source. It may run existing safe, non-destructive checks. Do not create tests in the reviewed worktree merely to strengthen a finding; use an authorized ephemeral scratch location or disclose the verification gap.

## Triage dispositions

- `actionable`: validated, caused or materially exposed by the reviewed change, inside the approved scope, and required to fix in this run. Only `critical`, `high`, or `medium` findings may be actionable.
- `non-blocking`: a valid `low` finding preserved for optional follow-up. It never enters the current fix queue.
- `out-of-scope`: a valid finding that is unrelated to the reviewed change or requires authority outside the approved work. Preserve it for explicit follow-up rather than silently expanding scope.
- `duplicate`: the same causal defect and remediation are already represented by another finding.
- `stale`: the cited artifact or behavior is no longer present in the reviewed snapshot.
- `not-reproducible`: the available evidence cannot validate the claimed defect after a proportionate attempt.
- `accepted-risk`: the risk is understood and explicitly accepted by an authorized human; include the approval evidence.
- `unvalidated`: the claim has insufficient evidence. Preserve it as an unresolved observation; do not relabel it low or send it to a fix cycle.

Do not downgrade severity merely to finish a loop. Use `unvalidated` when evidence is insufficient, `not-reproducible` only after a proportionate attempt, and `out-of-scope` when authority or scope is missing.

Every disposition includes an allowed `reason_code` and concise `summary`.
Codes are exact and case-sensitive:

| Disposition | Allowed reason codes | Additional proof |
|---|---|---|
| `actionable` | `IN_SCOPE_VALIDATED` | Evidence status is `supported`; severity is critical, high, or medium. |
| `non-blocking` | `LOW_SEVERITY` | Severity is `low`. |
| `out-of-scope` | `PREEXISTING_UNRELATED`, `DIFFERENT_SUBSYSTEM`, `OUTSIDE_APPROVED_SCOPE` | Matching `causal_relation` plus `scope_ref`. |
| `duplicate` | `SAME_ROOT_CAUSE` | `duplicate_of` points to another known finding. |
| `stale` | `SUPERSEDED_BY_FIX` | `superseded_by` identifies the replacing fix or artifact. |
| `not-reproducible` | `ENV_DEPENDENT`, `INSUFFICIENT_REPRO_STEPS`, `CONTRADICTED_BY_CHECK` | Non-empty `attempted` checks at the current HEAD; a contradicted claim needs a passing counter-check. |
| `accepted-risk` | `OWNER_ACCEPTED` | `accepted_by.type: human`, human identity, and approval reference. |
| `unvalidated` | `INSUFFICIENT_EVIDENCE`, `UNVERIFIED_OBSERVATION` | Evidence status is `insufficient`. |

For `out-of-scope`, the required reason/relation pairs are
`PREEXISTING_UNRELATED`/`preexisting`,
`DIFFERENT_SUBSYSTEM`/`unrelated`, and
`OUTSIDE_APPROVED_SCOPE`/`outside-authority`. A changed file alone neither
proves nor disproves scope.

## Disposition payload examples

Place one object per pending finding in the `dispositions` array of a
`findings.triaged` evidence envelope. Replace IDs, HEADs, identities, and
references with truthful values from the current run.

```json
[
  {
    "finding_id": "REV-001",
    "disposition": "actionable",
    "reason_code": "IN_SCOPE_VALIDATED",
    "summary": "The reviewed change violates AC-2 on the supported path."
  },
  {
    "finding_id": "REV-002",
    "disposition": "non-blocking",
    "reason_code": "LOW_SEVERITY",
    "summary": "The validated minor defect does not affect required behavior."
  },
  {
    "finding_id": "REV-003",
    "disposition": "out-of-scope",
    "reason_code": "OUTSIDE_APPROVED_SCOPE",
    "summary": "Remediation requires a service outside the approved work.",
    "causal_relation": "outside-authority",
    "scope_ref": "approved scope: booking-api only"
  },
  {
    "finding_id": "REV-004",
    "disposition": "duplicate",
    "reason_code": "SAME_ROOT_CAUSE",
    "summary": "REV-001 already represents the same cause and remediation.",
    "duplicate_of": "REV-001"
  },
  {
    "finding_id": "REV-005",
    "disposition": "stale",
    "reason_code": "SUPERSEDED_BY_FIX",
    "summary": "The cited branch no longer exists at the controlled HEAD.",
    "superseded_by": "commit a78bbcc"
  },
  {
    "finding_id": "REV-006",
    "disposition": "not-reproducible",
    "reason_code": "CONTRADICTED_BY_CHECK",
    "summary": "The focused counter-check passes at the reviewed snapshot.",
    "attempted": [
      {
        "check": "npm test -- booking-cancel",
        "at_head": "a78bbcc",
        "result": "passed"
      }
    ]
  },
  {
    "finding_id": "REV-007",
    "disposition": "accepted-risk",
    "reason_code": "OWNER_ACCEPTED",
    "summary": "The release owner accepted the bounded compatibility risk.",
    "accepted_by": {
      "type": "human",
      "identity": "release-owner@example.com",
      "approval_ref": "task comment 1842"
    }
  },
  {
    "finding_id": "REV-008",
    "disposition": "unvalidated",
    "reason_code": "INSUFFICIENT_EVIDENCE",
    "summary": "The observation is not yet supported by reproducible evidence."
  }
]
```

## Required finding shape

Every finding contains:

- stable `id`
- `severity` and `category`
- repository-relative `location`
- `evidence_status` and structured evidence bound to the reviewed HEAD
- concrete impact
- remediation direction

Keep observed facts separate from inferred causes. Avoid full source, diffs, terminal logs, credentials, or sensitive payloads.

## Example

Good finding:

```text
ID: REV-004
Severity: high
Category: compatibility
Location: src/config/load.js:48
Evidence status: supported
Evidence: static-path at HEAD a78bbcc; `value || 30` replaces the supported value 0 with 30. Reference: src/config/load.js:48.
Impact: Users cannot disable the timeout although 0 is part of the documented public contract.
Remediation: Default only when the value is null or undefined and add a regression case for 0.
```

Rejected as a finding:

```text
Severity: low
Location: src/config/load.js
Evidence: This function feels complex and might be cleaner with another helper.
```

This is a style preference without a demonstrated failure, impact, or precise remediation. Omit it from findings; mention it only as an optional note if it materially aids future work.
