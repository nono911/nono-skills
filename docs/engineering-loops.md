# Engineering loops

`delivery-loop` and `bugfix-loop` are explicit workflows for changes that justify isolation, independent review, and a bounded remediation cycle. Ordinary implementation does not activate them automatically.

## Shared authority boundary

Invoking a loop does not by itself authorize a new worktree, commits, push, merge, deploy, production mutation, external providers, or cleanup. A host-managed worktree is reused when practical. Otherwise the agent proposes the base revision, branch, worktree path, and up to two local commits for one approval.

The two commits are:

1. The implementation or bugfix commit, amendable before first review.
2. One optional unpushed review-fix commit, amendable across later fix cycles.

Push, merge, deploy, worktree removal, and branch deletion remain separately authorized.

## Delivery loop

1. Confirm acceptance outcomes, affected risks, repository rules, isolation, and authority.
2. Use `plan` for multi-step work; broad work should be proposed as independently verifiable slices.
3. Start or resume a managed delivery run.
4. Activate `implement`, verify the affected behavior, and record the exact HEAD.
5. Acquire a review lease for that HEAD and use a fresh read-only reviewer with `review`.
6. Triage findings without changing their claimed impact severity. Activate `fix-findings` only for evidence-supported actionable findings; retain non-blocking, deferred, accepted, and unvalidated items in the residual ledger.
7. Verify the new HEAD and review it under a fresh lease.
8. Stop early when no actionable findings remain; after final verification report `CLEAN` or `CLEAN_WITH_RESIDUALS` from the controller and always list residuals.

If startup finds an active schema-v1 run, the loop reports its ID and pauses for
human approval. Approval permits one linked v2 successor at the current HEAD;
the controller preserves the legacy run unchanged and never purges it as an
upgrade shortcut.

## Bugfix loop

1. Define observed versus expected behavior and safe reproduction evidence.
2. Start or resume a managed bugfix run.
3. Activate `debug` to support a causal chain before changing production code.
4. Activate `test` for the smallest stable regression proof and confirm it fails for the expected reason.
5. Activate `implement` for the minimal compatible root-cause fix.
6. Verify, commit, review the exact HEAD, triage, and remediate as in the delivery loop.

If the symptom cannot be reproduced safely or no pre-fix failure can be demonstrated, the agent reports the evidence gap instead of claiming a proven fix.

## Sequential review budget

A review batch covers one exact HEAD and includes the general reviewer plus any risk-required security, architecture, or migration specialists. Findings are triaged and, when valid, fixed and verified before the next batch.

```text
batch 1 -> triage -> fix 1 -> verify -> batch 2 -> ... -> batch 5
```

The fixed run budget is five review batches, four fix cycles, and one retry for a reviewer that returns no usable verdict. A clean batch stops early. An actionable batch-five finding produces `BUDGET_EXHAUSTED` and a recovery record; it does not receive another fix inside the exhausted run.

## Reviewer independence

The reviewer must be a fresh project-scoped read-only agent or subagent, receive the complete diff and relevant evidence, and be unable to mutate the worktree or delegate. Read-only review may execute existing safe, non-destructive checks but may not change reviewed source. If the host cannot provide that boundary, the named loop stops. The agent may offer ordinary implementation with disclosed self-review, but that path cannot report independent `CLEAN`.

## Native and external execution

Native agents or subagents from the active host are the default. External or Hybrid execution is used only after explicit selection and consent. External results must echo the task identity, role, source scope, snapshot, and result contract. A provider that implemented a change cannot be the sole general reviewer for that change.
