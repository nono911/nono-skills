# Adaptive Workspaces

Use this protocol before deciding whether to create, select, or update workflow artifacts. The active skill still owns its task-specific behavior.

## 1. Classify persistence

Classify the task as transient or durable using judgment, not fixed size thresholds.

Durable state is justified when the user asks for it, work is likely to cross Codex tasks or owners, multiple outcomes need tracking, migration/security/release/compatibility risk is material, findings need a fix lifecycle, or decisions must survive the conversation. Keep localized one-shot work transient unless the user asks otherwise.

## 2. Establish consent

Explicit requests for a spec, plan, progress log, decision log, findings tracker, handoff, or named existing work item already grant artifact consent for that scope.

When Codex decides a new durable workspace would help, state why, the proposed path, scope, and initial files, then ask once before creating the workspace. Approval covers artifact maintenance inside that work-item scope; it does not authorize unrelated implementation, commits, pushes, deployments, production changes, destructive actions, external writes, or spend.

If the user declines, create no equivalent files elsewhere. Continue safely in chat and report material decisions and residual risk in the final response.

## 3. Resolve or create the work item

Resolve in this order:

1. the work item already approved in the current Codex task
2. an explicit work ID, path, issue, or ticket from the user
3. an exact issue or ticket metadata match
4. an exact current non-default branch match to one active item
5. one active item whose goal and scope clearly match

Recency alone is never sufficient. Ask the user when multiple items remain plausible.

For new work, prefer `issue-<number>-<slug>` when an issue exists; otherwise use `YYYY-MM-DD-<goal-slug>`. Add a numeric suffix on collision and never overwrite unrelated contents.

## 4. Maintain the workspace

The anchor is `docs/agent/work/<work-id>/spec.md` with YAML front matter containing `work_id`, `title`, `status`, optional `issue`, optional `branch`, `created`, and `updated`. Status is `active`, `blocked`, `completed`, or `superseded`.

Reopening completed work changes its status to `active` and records the reason as a material decision.

Create files lazily:

- `spec.md` for every approved durable work item
- `plan.md` when outcomes, dependencies, or verification targets need tracking
- `decisions.md` on the first material decision
- `findings.md` when findings need lifecycle tracking
- `handoff.md` only when work remains or ownership changes

Do not create a global mutable index or move completed work-item directories. Log only contractual choices, meaningful ambiguity resolutions, accepted risks or tradeoffs, material re-plans, and assumptions future work must preserve.

## 5. Respect scope and failures

The original request controls implementation authority: an implementation request permits ordinary in-repository edits, while a planning request stops after planning. Ask again for material scope expansion, breaking or destructive behavior, production or external-system mutation, or significant spend.

Repository instructions override the default artifact location. If creation fails, report exactly what exists and continue in chat when safe. Never silently create artifacts at another path. Treat existing 0.1.0 singleton files as legacy user content: read them only when explicitly named or unambiguously relevant, and never move or delete them automatically.
