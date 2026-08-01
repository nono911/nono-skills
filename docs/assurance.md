# Assurance boundaries

Nono Skills combines model-interpreted instructions with a deterministic controller used by the two explicit engineering loops. Those layers provide different guarantees.

## Skill layer

Skills define triggers, inputs, outputs, guardrails, evidence expectations, and human-escalation boundaries. The host decides whether a skill is discoverable and activated, and the model interprets its instructions. The pack cannot force activation or prevent a model from ignoring a skill.

## Controller layer

After an agent starts a managed run and continues to invoke the controller, the controller can reject invalid state transitions. It validates:

- Fixed run budgets: five review batches, four fix cycles, and one no-verdict retry.
- Review leases bound to one exact Git HEAD and one declared reviewer batch.
- Duplicate, stale, replayed, malformed, or out-of-order transitions.
- Acceptance IDs, finding dispositions, verification evidence shape, and terminal conditions.

The controller cannot force its own invocation. Reviewer independence, tool permissions, source isolation, and the truthfulness of evidence supplied by an agent remain host- and environment-dependent.

## Evidence records

Managed runs live outside tracked source under the repository Git common directory:

```text
.git/nono-skills/runs/<run-id>/
```

Records are structured, snapshot-bound, and hash-chained. The chain makes later edits detectable when validated; it is not tamper-proof, an audit authority, or a security boundary. Anyone with sufficient filesystem access can alter or delete local evidence.

The schema is designed for outcomes, identifiers, finding summaries, verification labels, and limitations. It rejects known prompt, conversation, source, diff, terminal-output, environment, and secret payload fields. This reduces accidental collection but cannot prove that arbitrary free-text labels are non-sensitive.

Completed summaries and repository insights are local, redacted, evidence-linked, and advisory. They do not train a model, rewrite skills, change permissions, extend budgets, accept risk, or send telemetry.

## Evaluation boundary

Repository tests validate deterministic contracts and controller behavior. The skill-behavior corpus validates expected activation metadata and output contracts without model calls. The paired host evaluator runs fresh skill-enabled and skill-disabled sessions through a user-supplied adapter and measures activation, questions, reference loading, pre-action calls, first-action skill tax, and duration tax.

Scored host captures report asserted activation precision and recall, forbidden and unasserted activations, per-skill counts, a full case-owner activation matrix, and sparse boundary confusions. These checks improve observability and regression detection. They do not guarantee identical behavior across models, hosts, prompts, repositories, or tool configurations.

## Claim vocabulary

Project documentation uses these terms deliberately:

- **Enforced:** rejected by deterministic code after a managed run exists.
- **Validated:** checked by tests or evaluation against a stated corpus.
- **Guided:** expressed in skill instructions and dependent on host/model compliance.
- **Advisory:** derived information that cannot change authority or policy.
