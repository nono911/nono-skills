import assert from 'node:assert/strict';

export const canonicalSkillNames = Object.freeze([
  'api-design',
  'architecture-review',
  'brainstorm',
  'database-design',
  'debug',
  'delivery-loop',
  'estimate',
  'fix-findings',
  'implement',
  'migration',
  'plan',
  'refactor',
  'release-readiness',
  'review',
  'security-review',
  'test',
]);

export const initialSkillMetadataBudget = 8_000;

function protocolClause(id, text) {
  return Object.freeze({ id, text });
}

export const workspaceProtocolClauses = Object.freeze([
  protocolClause('document.title', '# Adaptive Workspaces'),
  protocolClause('document.purpose', 'Use this protocol before deciding whether to create, select, or update workflow artifacts. The active skill still owns its task-specific behavior.'),
  protocolClause('classification.heading', '## 1. Classify persistence'),
  protocolClause('classification.transient-durable', 'Classify the task as transient or durable using judgment, not fixed size thresholds.'),
  protocolClause('classification.transient-default', 'Durable state is justified when the user asks for it, work is likely to cross Codex tasks or owners, multiple outcomes need tracking, migration/security/release/compatibility risk is material, findings need a fix lifecycle, or decisions must survive the conversation. Keep localized one-shot work transient unless the user asks otherwise.'),
  protocolClause('repository.heading', '## 2. Resolve repository scope'),
  protocolClause('repository.primary-folder', 'Anchor durable artifacts to the applicable repository root and repository instructions. In a desktop multi-folder project, use the primary folder for Git operations and automatic discovery of `AGENTS.md`, skills, and `config.toml`; never infer that a secondary folder is primary merely because its files are in scope.'),
  protocolClause('consent.heading', '## 3. Establish consent'),
  protocolClause('consent.explicit', 'Explicit requests for a spec, plan, progress log, decision log, findings tracker, handoff, or named existing work item already grant artifact consent for that scope.'),
  protocolClause('consent.proposed', 'When Codex decides a new durable workspace would help, state why, the proposed path, scope, and initial files, then ask once before creating the workspace. Approval covers only artifact maintenance inside that work-item scope.'),
  protocolClause('consent.decline', 'If the user declines, create no equivalent files elsewhere. Continue safely in chat and report material decisions and residual risk in the final response.'),
  protocolClause('resolution.heading', '## 4. Resolve or create the work item'),
  protocolClause('resolution.precedence', 'Resolve in this order:'),
  protocolClause('resolution.current-task', '1. the work item already approved in the current Codex task'),
  protocolClause('resolution.explicit-id', '2. an explicit work ID, path, issue, or ticket from the user'),
  protocolClause('resolution.issue-match', '3. an exact issue or ticket metadata match'),
  protocolClause('resolution.branch-match', '4. an exact current non-default branch match to one active item'),
  protocolClause('resolution.scope-match', '5. one active item whose goal and scope clearly match'),
  protocolClause('resolution.recency-ambiguity', 'Recency alone is never sufficient. Ask the user when multiple items remain plausible.'),
  protocolClause('resolution.new-id', 'For new work, prefer `issue-<number>-<slug>` when an issue exists; otherwise use `YYYY-MM-DD-<goal-slug>`. Add a numeric suffix on collision and never overwrite unrelated contents.'),
  protocolClause('workspace.heading', '## 5. Maintain the workspace'),
  protocolClause('workspace.anchor', 'The anchor is `docs/agent/work/<work-id>/spec.md` with YAML front matter containing `work_id`, `title`, `status`, optional `issue`, optional `branch`, `created`, and `updated`. Status is `active`, `blocked`, `completed`, or `superseded`.'),
  protocolClause('workspace.creation-updated', 'Start every new approved work item with `status: active`; set both `created` and `updated` when creating its anchor. Refresh `updated` on every authoritative work-item artifact or status mutation. Keep the current status truthful so work-item resolution never relies on stale `active` metadata.'),
  protocolClause('lifecycle.blocked', 'Use `blocked` only when in-scope progress cannot continue because of a concrete unresolved dependency, missing input or authority, or required external change. Record the blocker and resumption condition in `plan.md` or `handoff.md` as applicable; return the status to `active` and refresh `updated` when the blocker is resolved.'),
  protocolClause('lifecycle.completed', 'Use `completed` only when all in-scope acceptance criteria and tracked plan items are satisfied, required verification evidence is recorded, and no unresolved blocking findings or work remain. Set the status to `completed` and refresh `updated`; do not move or delete the work-item directory.'),
  protocolClause('lifecycle.superseded', 'Use `superseded` only when the work is intentionally replaced. Record the reason and successor or reference as a material decision, set the status to `superseded`, and refresh `updated`; do not move or delete the work-item directory.'),
  protocolClause('lifecycle.reopen', 'Reopening completed work changes its status to `active`, refreshes `updated`, and records the material reason.'),
  protocolClause('artifacts.lazy', 'Create files lazily:'),
  protocolClause('artifacts.spec', '- `spec.md` for every approved durable work item'),
  protocolClause('artifacts.plan', '- `plan.md` when outcomes, dependencies, or verification targets need tracking'),
  protocolClause('artifacts.decisions', '- `decisions.md` on the first material decision'),
  protocolClause('artifacts.findings', '- `findings.md` when findings need lifecycle tracking'),
  protocolClause('artifacts.handoff', '- `handoff.md` only when work remains or ownership changes'),
  protocolClause('artifacts.no-global-index', 'Do not create a global mutable index or move completed work-item directories. Log only contractual choices, meaningful ambiguity resolutions, accepted risks or tradeoffs, material re-plans, and assumptions future work must preserve.'),
  protocolClause('scope.heading', '## 6. Respect scope and failures'),
  protocolClause('scope.authority', 'The original request controls authority. A local implementation request permits in-scope repository edits and non-destructive validation, while a planning, review, or diagnostic request stops before implementation. Commits, pushes, merges, deployments, production or external-system mutation, destructive actions, significant spend, breaking behavior, and material scope expansion require explicit authorization.'),
  protocolClause('legacy.preservation', 'Repository instructions override the default artifact location. If creation fails, report exactly what exists and continue in chat when safe. Never silently create artifacts at another path. Treat existing 0.1.0 singleton files as legacy user content: read them only when explicitly named or unambiguously relevant, and never move, merge, or delete them automatically.'),
]);

export function assertCanonicalSkillInventory(actualNames) {
  assert.deepEqual(
    [...actualNames].sort(),
    [...canonicalSkillNames].sort(),
    'plugin skill inventory must contain exactly the 16 canonical skills',
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

export function assertWorkspaceProtocolContract(content) {
  const authoritativeLines = content
    .split(/\r?\n/)
    .filter((line) => line.trim() !== '');

  for (const clause of workspaceProtocolClauses) {
    assert.equal(
      authoritativeLines.filter((line) => line === clause.text).length,
      1,
      `workspace protocol must include ${clause.id} exactly once`,
    );
  }

  assert.deepEqual(
    authoritativeLines,
    workspaceProtocolClauses.map((clause) => clause.text),
    'workspace protocol must contain only canonical authoritative clauses in order',
  );
}
