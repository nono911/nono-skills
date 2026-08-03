# Assurance boundaries

Nono Skills combines model-interpreted instructions with a deterministic controller used by the two explicit engineering loops. Those layers provide different guarantees.

## Skill layer

Skills define triggers, inputs, outputs, guardrails, evidence expectations, and human-escalation boundaries. The host decides whether a skill is discoverable and activated, and the model interprets its instructions. The pack cannot force activation or prevent a model from ignoring a skill.

## Controller layer

After an agent starts a managed run and continues to invoke the controller, the controller can reject invalid state transitions. It validates:

- Fixed run budgets: five review batches, four fix cycles, and one no-verdict retry.
- Review leases bound to one exact Git HEAD and one declared reviewer batch.
- Duplicate, stale, replayed, malformed, or out-of-order transitions.
- Acceptance IDs, finding evidence bound to the reviewed HEAD, disposition-specific proof, residual findings, and terminal conditions.
- Evidence-supported actionability without automatically rewriting claimed impact severity.

The controller cannot force its own invocation. Reviewer independence, tool permissions, source isolation, and the truthfulness of evidence supplied by an agent remain host- and environment-dependent.

## Evidence records

Managed runs live outside tracked source under the repository Git common directory:

```text
.git/nono-skills/runs/<run-id>/
```

Records are structured, snapshot-bound, and hash-chained. The chain makes later edits detectable when validated; it is not tamper-proof, an audit authority, or a security boundary. Anyone with sufficient filesystem access can alter or delete local evidence.

Evidence Contract v2 is designed for outcomes, identifiers, structured finding observations, disposition reasons, verification labels, residuals, and limitations. It rejects known prompt, conversation, source, diff, terminal-output, environment, and secret payload fields. This reduces accidental collection but cannot prove that host-reported observations are true or that arbitrary free-text labels are non-sensitive.

Schema-v1 runs remain readable through list and status operations. The controller rejects resume and mutation instead of silently migrating them. With explicit human confirmation, `runs supersede` may create one linked v2 successor at the current HEAD; it does not alter the v1 chain, import its proof, accept its risks, or delete it.

Completed summaries and repository insights are local, redacted, evidence-linked, and advisory. `clean_with_residuals` is a qualified completion and preserves every unresolved non-actionable item. These records do not train a model, rewrite skills, change permissions, extend budgets, accept risk, or send telemetry.

## Evaluation boundary

Repository tests validate deterministic contracts and controller behavior. The skill-behavior corpus validates expected activation metadata and output contracts without model calls. The paired host evaluator runs fresh skill-enabled and skill-disabled sessions through a user-supplied adapter and measures activation, questions, reference loading, pre-action calls, first-action skill tax, and duration tax.

Scored host captures report asserted activation precision and recall, forbidden and unasserted activations, per-skill counts, a full case-owner activation matrix, and sparse boundary confusions. These checks improve observability and regression detection. They do not guarantee identical behavior across models, hosts, prompts, repositories, or tool configurations.

## Claim vocabulary

Project documentation uses these terms deliberately:

- **Enforced:** rejected by deterministic code after a managed run exists.
- **Validated:** checked by tests or evaluation against a stated corpus.
- **Guided:** expressed in skill instructions and dependent on host/model compliance.
- **Advisory:** derived information that cannot change authority or policy.
