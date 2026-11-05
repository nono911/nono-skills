import assert from 'node:assert/strict';

export const canonicalSkillNames = Object.freeze([
  'acceptance-verify',
  'api-design',
  'architecture-review',
  'brainstorm',
  'bugfix-loop',
  'communicate-clearly',
  'database-design',
  'debug',
  'delivery-loop',
  'estimate',
  'fix-findings',
  'handoff',
  'implement',
  'migration',
  'plan',
  'refactor',
  'release-readiness',
  'retro',
  'review',
  'security-review',
  'test',
  'write-guide',
]);

export const initialSkillMetadataBudget = 8_000;

function protocolClause(id, text) {
  return Object.freeze({ id, text });
}

export const workspaceProtocolClauses = Object.freeze([
  protocolClause("document.title", "# Working Rules"),
  protocolClause("document.purpose", "Use these shared rules once per task; reuse them across companion skills. Load workspace details only when the artifact gate below applies."),
  protocolClause("stance.heading", "## Scope and follow-through"),
  protocolClause("stance.user-priority", "The user's explicit task instructions take precedence over defaults in this protocol; higher-priority host, repository, and safety constraints still apply."),
  protocolClause("stance.follow-through", "Infer routine details from context and repository evidence. Complete safe discovery and already-authorized work before asking; pause only when missing input or authority could materially change the outcome."),
  protocolClause("stance.transparency", "When this protocol requires a pause, name the blocking rule and concrete unresolved condition."),
  protocolClause("scope.authority", "The original request controls authority. A local implementation request permits in-scope repository edits and non-destructive validation, while a planning, review, or diagnostic request stops before implementation. Commits, pushes, merges, deployments, production or external-system mutation, destructive actions, significant spend, breaking behavior, and material scope expansion require explicit authorization."),
  protocolClause("completion.heading", "## Completion"),
  protocolClause("completion.outcomes", "Describe the outcome naturally for people. Use exact status labels only when a caller, managed loop, or specialist contract requires them."),
  protocolClause("completion.complete", "Claim completion only when the requested scope and acceptance criteria are satisfied and required verification passed."),
  protocolClause("completion.partial", "If work or proof remains, say what remains and the next executable action. If progress is blocked, name the concrete blocker and resumption condition."),
  protocolClause("completion.evidence", "Separate executed evidence from inference; skipped, unavailable, stale, or partial checks are not success."),
  protocolClause("classification.heading", "## Artifact gate"),
  protocolClause("classification.transient-default", "Keep localized one-shot work in chat unless artifacts are requested. Durable state is useful for continuity across tasks or owners, multiple outcomes, material risk, or a finding lifecycle."),
  protocolClause("classification.routing", "Before selecting, creating, resuming, or updating durable workflow artifacts, read `durable-workspaces.md`. Load it also when the user requests a spec, plan file, progress log, findings tracker, handoff file, or an existing work item."),
  protocolClause("consent.explicit", "An explicit artifact request already grants consent for that scope. Otherwise propose the path and purpose and ask once before creating a durable workspace; a declined workspace must not be recreated elsewhere."),
  protocolClause("classification.reuse", "Reuse a previously loaded identical reference within the task. Do not scan for work items or read lifecycle details for transient work."),
]);

export const durableWorkspaceProtocolClauses = Object.freeze([
  protocolClause("durable.title", "# Durable Workspaces"),
  protocolClause("durable.purpose", "Read after the artifact gate in `workspaces.md` selects durable work. Preserve existing artifact consent, scope, and lifecycle state."),
  protocolClause("repository.heading", "## 2. Resolve repository scope"),
  protocolClause("repository.primary-folder", "Anchor durable artifacts to the applicable repository root and repository instructions. In a desktop multi-folder project, use the host's primary folder for repository operations and instruction discovery; never infer that a secondary folder is primary merely because its files are in scope."),
  protocolClause("consent.heading", "## 3. Establish consent"),
  protocolClause("consent.explicit", "Explicit requests for a spec, plan, progress log, decision log, findings tracker, handoff, or named existing work item already grant artifact consent for that scope."),
  protocolClause("consent.proposed", "When the agent decides a new durable workspace would help, state why, the proposed path, scope, and initial files, then ask once before creating the workspace. Approval covers only artifact maintenance inside that work-item scope."),
  protocolClause("consent.decline", "If the user declines, create no equivalent files elsewhere. Continue safely in chat and report material decisions and residual risk in the final response."),
  protocolClause("resolution.heading", "## 4. Resolve or create the work item"),
  protocolClause("resolution.precedence", "Resolve in this order:"),
  protocolClause("resolution.current-task", "1. the work item already approved in the current agent task"),
  protocolClause("resolution.explicit-id", "2. an explicit work ID, path, issue, or ticket from the user"),
  protocolClause("resolution.issue-match", "3. an exact issue or ticket metadata match"),
  protocolClause("resolution.branch-match", "4. an exact current non-default branch match to one active item"),
  protocolClause("resolution.scope-match", "5. one active item whose goal and scope clearly match"),
  protocolClause("resolution.recency-ambiguity", "Recency alone is never sufficient. Ask the user when multiple items remain plausible."),
  protocolClause("resolution.new-id", "For new work, prefer `issue-<number>-<slug>` when an issue exists; otherwise use `YYYY-MM-DD-<goal-slug>`. Add a numeric suffix on collision and never overwrite unrelated contents."),
  protocolClause("workspace.heading", "## 5. Maintain the workspace"),
  protocolClause("workspace.anchor", "The anchor is `docs/agent/work/<work-id>/spec.md` with YAML front matter containing `work_id`, `title`, `status`, optional `issue`, optional `branch`, `created`, and `updated`. Status is `active`, `blocked`, `completed`, or `superseded`."),
  protocolClause("workspace.creation-updated", "Start every new approved work item with `status: active`; set both `created` and `updated` when creating its anchor. Refresh `updated` on every authoritative work-item artifact or status mutation. Keep the current status truthful so work-item resolution never relies on stale `active` metadata."),
  protocolClause("lifecycle.blocked", "Use `blocked` only when in-scope progress cannot continue because of a concrete unresolved dependency, missing input or authority, or required external change. Record the blocker and resumption condition in `plan.md` or `handoff.md` as applicable; return the status to `active` and refresh `updated` when the blocker is resolved."),
  protocolClause("lifecycle.completed", "Use `completed` only when all in-scope acceptance criteria and tracked plan items are satisfied, required verification evidence is recorded, and no unresolved blocking findings or work remain. Set the status to `completed` and refresh `updated`; do not move or delete the work-item directory."),
  protocolClause("lifecycle.superseded", "Use `superseded` only when the work is intentionally replaced. Record the reason and successor or reference as a material decision, set the status to `superseded`, and refresh `updated`; do not move or delete the work-item directory."),
  protocolClause("lifecycle.reopen", "Reopening completed work changes its status to `active`, refreshes `updated`, and records the material reason."),
  protocolClause("artifacts.lazy", "Create files lazily:"),
  protocolClause("artifacts.spec", "- `spec.md` for every approved durable work item"),
  protocolClause("artifacts.plan", "- `plan.md` when outcomes, dependencies, or verification targets need tracking"),
  protocolClause("artifacts.decisions", "- `decisions.md` on the first material decision"),
  protocolClause("artifacts.findings", "- `findings.md` when findings need lifecycle tracking"),
  protocolClause("artifacts.handoff", "- `handoff.md` only when work remains or ownership changes"),
  protocolClause("artifacts.no-global-index", "Do not create a global mutable index or move completed work-item directories. Log only contractual choices, meaningful ambiguity resolutions, accepted risks or tradeoffs, material re-plans, and assumptions future work must preserve."),
  protocolClause("scope.heading", "## 6. Respect scope and failures"),
  protocolClause("legacy.preservation", "Repository instructions override the default artifact location. If creation fails, report exactly what exists and continue in chat when safe. Never silently create artifacts at another path. Treat existing 0.1.0 singleton files as legacy user content: read them only when explicitly named or unambiguously relevant, and never move, merge, or delete them automatically."),
]);

export function assertCanonicalSkillInventory(actualNames) {
  assert.deepEqual(
    [...actualNames].sort(),
    [...canonicalSkillNames].sort(),
    `plugin skill inventory must contain exactly the ${canonicalSkillNames.length} canonical skills`,
  );
}

export function assertSkillDiscoveryContract(entries) {
  const names = entries.map(({ name }) => name);
  assert.equal(
    new Set(names).size,
    names.length,
    'skill discovery metadata must use unique names',
  );
  for (const { name, description } of entries) {
    assert.match(
      description,
      /^Use (?:when|for|only)\b/,
      `${name} description must front-load its use case`,
    );
  }
  const characters = entries.reduce(
    (total, { name, description, relative = '' }) => (
      total + name.length + description.length + relative.length
    ),
    0,
  );
  assert.ok(
    characters <= initialSkillMetadataBudget,
    `skill discovery name, description, and relative path metadata must fit within ${initialSkillMetadataBudget} characters`,
  );
  return characters;
}

function assertProtocolContract(content, clauses, label) {
  const authoritativeLines = content
    .split(/\r?\n/)
    .filter((line) => line.trim() !== '');

  for (const clause of clauses) {
    assert.equal(
      authoritativeLines.filter((line) => line === clause.text).length,
      1,
      `${label} must include ${clause.id} exactly once`,
    );
  }

  assert.deepEqual(
    authoritativeLines,
    clauses.map((clause) => clause.text),
    `${label} must contain only canonical authoritative clauses in order`,
  );
}

export function assertWorkspaceProtocolContract(content) {
  assertProtocolContract(content, workspaceProtocolClauses, 'workspace protocol');
}

export function assertDurableWorkspaceProtocolContract(content) {
  assertProtocolContract(content, durableWorkspaceProtocolClauses, 'durable workspace protocol');
}
