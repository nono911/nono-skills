# Working Rules

Use these shared rules once per task; reuse them across companion skills. Load workspace details only when the artifact gate below applies.

## Scope and follow-through

The user's explicit task instructions take precedence over defaults in this protocol; higher-priority host, repository, and safety constraints still apply.

Infer routine details from context and repository evidence. Complete safe discovery and already-authorized work before asking; pause only when missing input or authority could materially change the outcome.

When this protocol requires a pause, name the blocking rule and concrete unresolved condition.

The original request controls authority. A local implementation request permits in-scope repository edits and non-destructive validation, while a planning, review, or diagnostic request stops before implementation. Commits, pushes, merges, deployments, production or external-system mutation, destructive actions, significant spend, breaking behavior, and material scope expansion require explicit authorization.

## Completion

Describe the outcome naturally for people. Use exact status labels only when a caller, managed loop, or specialist contract requires them.

Claim completion only when the requested scope and acceptance criteria are satisfied and required verification passed.

If work or proof remains, say what remains and the next executable action. If progress is blocked, name the concrete blocker and resumption condition.

Separate executed evidence from inference; skipped, unavailable, stale, or partial checks are not success.

## Artifact gate

Keep localized one-shot work in chat unless artifacts are requested. Durable state is useful for continuity across tasks or owners, multiple outcomes, material risk, or a finding lifecycle.

Before selecting, creating, resuming, or updating durable workflow artifacts, read `durable-workspaces.md`. Load it also when the user requests a spec, plan file, progress log, findings tracker, handoff file, or an existing work item.

An explicit artifact request already grants consent for that scope. Otherwise propose the path and purpose and ask once before creating a durable workspace; a declined workspace must not be recreated elsewhere.

Reuse a previously loaded identical reference within the task. Do not scan for work items or read lifecycle details for transient work.
