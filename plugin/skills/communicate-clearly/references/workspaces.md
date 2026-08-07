# Adaptive Workspaces

Use this protocol before deciding whether to create, select, or update workflow artifacts. The active skill still owns its task-specific behavior.

## 1. Classify persistence

Classify the task as transient or durable using judgment, not fixed size thresholds.

Durable state is justified when the user asks for it, work is likely to cross agent tasks or owners, multiple outcomes need tracking, migration/security/release/compatibility risk is material, findings need a fix lifecycle, or decisions must survive the conversation. Keep localized one-shot work transient unless the user asks otherwise.

## 2. Resolve repository scope

Anchor durable artifacts to the applicable repository root and repository instructions. In a desktop multi-folder project, use the host's primary folder for repository operations and instruction discovery; never infer that a secondary folder is primary merely because its files are in scope.

## 3. Establish consent

Explicit requests for a spec, plan, progress log, decision log, findings tracker, handoff, or named existing work item already grant artifact consent for that scope.

When the agent decides a new durable workspace would help, state why, the proposed path, scope, and initial files, then ask once before creating the workspace. Approval covers only artifact maintenance inside that work-item scope.

If the user declines, create no equivalent files elsewhere. Continue safely in chat and report material decisions and residual risk in the final response.

## 4. Resolve or create the work item

Resolve in this order:

1. the work item already approved in the current agent task
2. an explicit work ID, path, issue, or ticket from the user
3. an exact issue or ticket metadata match
4. an exact current non-default branch match to one active item
5. one active item whose goal and scope clearly match

Recency alone is never sufficient. Ask the user when multiple items remain plausible.

For new work, prefer `issue-<number>-<slug>` when an issue exists; otherwise use `YYYY-MM-DD-<goal-slug>`. Add a numeric suffix on collision and never overwrite unrelated contents.

## 5. Maintain the workspace

The anchor is `docs/agent/work/<work-id>/spec.md` with YAML front matter containing `work_id`, `title`, `status`, optional `issue`, optional `branch`, `created`, and `updated`. Status is `active`, `blocked`, `completed`, or `superseded`.

Start every new approved work item with `status: active`; set both `created` and `updated` when creating its anchor. Refresh `updated` on every authoritative work-item artifact or status mutation. Keep the current status truthful so work-item resolution never relies on stale `active` metadata.

Use `blocked` only when in-scope progress cannot continue because of a concrete unresolved dependency, missing input or authority, or required external change. Record the blocker and resumption condition in `plan.md` or `handoff.md` as applicable; return the status to `active` and refresh `updated` when the blocker is resolved.

Use `completed` only when all in-scope acceptance criteria and tracked plan items are satisfied, required verification evidence is recorded, and no unresolved blocking findings or work remain. Set the status to `completed` and refresh `updated`; do not move or delete the work-item directory.

Use `superseded` only when the work is intentionally replaced. Record the reason and successor or reference as a material decision, set the status to `superseded`, and refresh `updated`; do not move or delete the work-item directory.

Reopening completed work changes its status to `active`, refreshes `updated`, and records the material reason.

Create files lazily:

- `spec.md` for every approved durable work item
- `plan.md` when outcomes, dependencies, or verification targets need tracking
- `decisions.md` on the first material decision
- `findings.md` when findings need lifecycle tracking
- `handoff.md` only when work remains or ownership changes

Do not create a global mutable index or move completed work-item directories. Log only contractual choices, meaningful ambiguity resolutions, accepted risks or tradeoffs, material re-plans, and assumptions future work must preserve.

## 6. Respect scope and failures

The original request controls authority. A local implementation request permits in-scope repository edits and non-destructive validation, while a planning, review, or diagnostic request stops before implementation. Commits, pushes, merges, deployments, production or external-system mutation, destructive actions, significant spend, breaking behavior, and material scope expansion require explicit authorization.

Repository instructions override the default artifact location. If creation fails, report exactly what exists and continue in chat when safe. Never silently create artifacts at another path. Treat existing 0.1.0 singleton files as legacy user content: read them only when explicitly named or unambiguously relevant, and never move, merge, or delete them automatically.
