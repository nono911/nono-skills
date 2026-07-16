# Adaptive Workspaces Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Release Nono Skills 0.2.0 with consent-aware, per-feature durable workspaces that Codex manages automatically while leaving small tasks artifact-free.

**Architecture:** A single bundled workspace protocol owns transient-versus-durable classification, human consent, work-item identity, resolution, lifecycle, and failure behavior. The existing 15 public skills reference that protocol and keep only intent-specific rules; optional project initialization creates repository guidance only, while uninstall explicitly protects user-owned work-item files.

**Tech Stack:** Node.js 20+ ESM, built-in `node:test`, Markdown Codex skills and references, dependency-free npm package, Codex plugin manifest.

## Global Constraints

- Keep exactly 15 public `engineering:*` skills; add no user-facing `work` command or mandatory router skill.
- `npx nono-skills install` must be sufficient for normal use after starting a new Codex task.
- New durable workspaces live under `docs/agent/work/<work-id>/` and require consent when Codex proposes them.
- Explicit user requests for a spec, plan, log, findings tracker, handoff, or named work item already provide artifact consent within that scope.
- Simple one-shot work creates no workflow artifacts unless the user asks.
- Recency alone never selects a work item.
- `npx nono-skills init` remains optional and creates repository guidance only.
- Existing 0.1.0 singleton artifacts are never moved, merged, or deleted automatically.
- Work-item directories are user-owned and must survive uninstall and project purge.
- Runtime dependencies remain empty and Node.js remains `>=20`.
- Prefix every shell command with `rtk` as required by the repository environment.
- Do not add bundled/runtime requirements for Superpowers, worktrees, TDD, or subagents.
- Do not add a global mutable index, archive moves, or cross-feature ADR management in 0.2.0.
- Do not commit work-item artifacts automatically.
- Publishing, pushing, disabling Superpowers, and other external actions remain separate authorization gates.

---

### Task 1: Add the shared adaptive-workspace protocol

**Files:**
- Create: `plugin/references/workspaces.md`
- Modify: `plugin/skills/plan/SKILL.md`
- Modify: `plugin/skills/implement/SKILL.md`
- Modify: `scripts/validate.mjs`
- Modify: `test/bundle.test.js`

**Interfaces:**
- Produces: `plugin/references/workspaces.md`, the canonical contract for classification, consent, work IDs, resolution, lifecycle, artifact creation, and failure fallback.
- Consumes: each selected skill reads the protocol through the relative path `../../references/workspaces.md`.
- Preserves: `plan` remains planning-only and `implement` remains implementation-focused; neither becomes a workflow router.

- [ ] **Step 1: Write failing protocol and pilot-skill tests**

Add this test to `test/bundle.test.js`:

```js
test('adaptive workspace protocol defines persistence and consent boundaries', async () => {
  const protocol = await readFile(path.join(root, 'plugin', 'references', 'workspaces.md'), 'utf8');
  assert.match(protocol, /Classify the task as transient or durable/);
  assert.match(protocol, /Keep localized one-shot work transient/);
  assert.match(protocol, /Explicit requests for a spec, plan, progress log/);
  assert.match(protocol, /ask once before creating the workspace/);
  assert.match(protocol, /Recency alone is never sufficient/);
  assert.match(protocol, /Ask the user when multiple items remain plausible/);
  assert.match(protocol, /docs\/agent\/work\/<work-id>\/spec\.md/);
  assert.match(protocol, /If the user declines/);
  assert.match(protocol, /Reopening completed work changes its status to `active`/);

  for (const name of ['plan', 'implement']) {
    const skill = await readFile(path.join(root, 'plugin', 'skills', name, 'SKILL.md'), 'utf8');
    assert.match(skill, /Read `\.\.\/\.\.\/references\/workspaces\.md`/);
  }
});
```

- [ ] **Step 2: Run the test and verify the missing-reference failure**

Run:

```bash
rtk node --test test/bundle.test.js
```

Expected: FAIL with `ENOENT` for `plugin/references/workspaces.md`.

- [ ] **Step 3: Create the canonical protocol**

Create `plugin/references/workspaces.md` with this complete contract:

```markdown
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
```

- [ ] **Step 4: Convert `plan` and `implement` to the shared contract**

Insert after `## Purpose` content in both skills:

```markdown
## Workspace protocol

Read `../../references/workspaces.md` before selecting or creating workflow artifacts. Follow it for persistence, consent, work-item resolution, and lifecycle; this skill owns only the task-specific behavior below.
```

In `plan/SKILL.md`, replace the singleton-path input bullet with:

```markdown
- The selected work item's spec, plan, and decisions when durable state is active
```

Replace the conditional artifact output bullet with:

```markdown
- For approved durable work, updated `spec.md` and `plan.md` in the selected work-item directory
```

End its decision-log section with:

```markdown
When durable state is approved, append the decision to the selected work item's `decisions.md`; otherwise include it in the final response.
```

End `implement/SKILL.md`'s decision-log section with:

```markdown
When durable state is approved, append the decision to the selected work item's `decisions.md` and update its plan or handoff when applicable; otherwise include it in the final response.
```

- [ ] **Step 5: Keep validation green during the two-stage migration**

In the existing all-skills loop in `test/bundle.test.js`, temporarily replace the legacy-only assertion with:

```js
assert.ok(
  skill.includes('Read `../../references/workspaces.md`')
    || skill.includes('create workflow artifacts only when the user requests them'),
  `${name} must use the adaptive protocol or the legacy fallback during migration`,
);
```

Replace the plan-specific assertions with a transitional form that expects the converted plan skill but the still-legacy `AGENTS.md` template:

```js
test('plan uses selected work-item artifacts and repository guidance stays concise', async () => {
  const plan = await readFile(path.join(root, 'plugin', 'skills', 'plan', 'SKILL.md'), 'utf8');
  const agents = await readFile(path.join(root, 'templates', 'AGENTS.md'), 'utf8');

  assert.match(plan, /selected work item's spec, plan, and decisions/);
  assert.match(agents, /Do not create missing workflow artifacts unless the user requests/);
  assert.match(agents, /\$engineering:<skill>/);
  assert.ok(agents.length < 3_500, 'AGENTS.md should remain concise');
});
```

In `scripts/validate.mjs`, read and validate the protocol before the skill loop:

```js
const workspaceProtocol = await readFile(path.join(root, 'plugin', 'references', 'workspaces.md'), 'utf8');
assert.match(workspaceProtocol, /Classify the task as transient or durable/);
assert.match(workspaceProtocol, /ask once before creating the workspace/);
```

Temporarily replace the legacy-only assertion inside the validator's skill loop with:

```js
assert.ok(
  content.includes('Read `../../references/workspaces.md`')
    || content.includes('create workflow artifacts only when the user requests them'),
  `${expectedName} must use the adaptive protocol or the legacy fallback during migration`,
);
```

- [ ] **Step 6: Run focused tests and full validation**

Run:

```bash
rtk node --test test/bundle.test.js
rtk npm test
rtk npm run validate
```

Expected: PASS. `plan` and `implement` satisfy the new protocol path while the remaining 13 skills satisfy the temporary legacy branch.

- [ ] **Step 7: Commit the shared protocol**

```bash
rtk git add plugin/references/workspaces.md plugin/skills/plan/SKILL.md plugin/skills/implement/SKILL.md scripts/validate.mjs test/bundle.test.js
rtk git commit -m "feat(workflow): add adaptive workspace protocol"
```

---

### Task 2: Adopt the protocol across all 15 skills

**Files:**
- Modify: `plugin/skills/api-design/SKILL.md`
- Modify: `plugin/skills/architecture-review/SKILL.md`
- Modify: `plugin/skills/brainstorm/SKILL.md`
- Modify: `plugin/skills/database-design/SKILL.md`
- Modify: `plugin/skills/debug/SKILL.md`
- Modify: `plugin/skills/estimate/SKILL.md`
- Modify: `plugin/skills/fix-findings/SKILL.md`
- Modify: `plugin/skills/migration/SKILL.md`
- Modify: `plugin/skills/refactor/SKILL.md`
- Modify: `plugin/skills/release-readiness/SKILL.md`
- Modify: `plugin/skills/review/SKILL.md`
- Modify: `plugin/skills/security-review/SKILL.md`
- Modify: `plugin/skills/test/SKILL.md`
- Modify: `scripts/validate.mjs`
- Modify: `test/bundle.test.js`

**Interfaces:**
- Consumes: all 15 skills load `../../references/workspaces.md` before artifact selection or creation.
- Produces: each skill records only intent-specific durable state in the selected work-item directory.
- Preserves: exact 15-skill public surface and existing frontmatter/UI metadata.

- [ ] **Step 1: Replace the old all-skills fallback test with the protocol contract**

In `test/bundle.test.js`, replace `every skill has specific UI metadata and safe artifact fallback` with:

```js
test('every skill has specific UI metadata and uses the workspace protocol', async () => {
  for (const name of expectedSkills) {
    const skillRoot = path.join(root, 'plugin', 'skills', name);
    const skill = await readFile(path.join(skillRoot, 'SKILL.md'), 'utf8');
    const metadata = await readFile(path.join(skillRoot, 'agents', 'openai.yaml'), 'utf8');
    const shortDescription = metadata.match(/short_description: "([^"]+)"/)?.[1];

    assert.ok(shortDescription, `${name} must define a short_description`);
    assert.ok(shortDescription.length >= 25 && shortDescription.length <= 64,
      `${name} short_description must be 25-64 characters`);
    assert.doesNotMatch(metadata, /Reusable engineering workflow|for this task\./);
    assert.match(metadata, new RegExp(`default_prompt: ".*\\$${name.replaceAll('-', '\\-')}\\b`));
    assert.match(skill, /Read `\.\.\/\.\.\/references\/workspaces\.md`/);
    assert.doesNotMatch(skill, /docs\/agent\/(?:spec|plan|decision-log|findings|handoff)\.md/);
  }
});
```

- [ ] **Step 2: Run the bundle test and verify the 13 unconverted skills fail**

Run:

```bash
rtk node --test test/bundle.test.js
```

Expected: FAIL on the first remaining skill without the protocol reference.

- [ ] **Step 3: Add the shared protocol section to the remaining skills**

Insert this exact section after each remaining skill's purpose:

```markdown
## Workspace protocol

Read `../../references/workspaces.md` before selecting or creating workflow artifacts. Follow it for persistence, consent, work-item resolution, and lifecycle; this skill owns only the task-specific behavior below.
```

Replace old singleton/fallback wording with these exact intent-specific endings:

```text
api-design: When durable state is approved, append contract choices and compatibility consequences to the selected work item's decisions.md; otherwise include them in the final response.
architecture-review: When durable state is approved, append structural tradeoffs or accepted architecture risk to the selected work item's decisions.md and track actionable defects in findings.md; otherwise report them in the final response.
brainstorm: When durable state is approved, append the accepted direction, recurring tradeoffs, assumptions, and next experiment to the selected work item's decisions.md; otherwise include them in the final response.
database-design: When durable state is approved, append invariant, consistency, migration, and operational choices to the selected work item's decisions.md; otherwise include them in the final response.
debug: When durable state is approved, append the validated root cause, rejected material hypotheses, and consequential fix choices to the selected work item's decisions.md and create handoff.md only when work remains; otherwise include them in the final response.
estimate: When durable state is approved, append scope interpretations, estimation model changes, and accepted schedule tradeoffs to the selected work item's decisions.md; otherwise include them in the final response.
fix-findings: When durable state is approved, update the selected work item's findings.md with status and verification evidence, and append material remediation tradeoffs to decisions.md; otherwise report state changes and decisions in the final response.
migration: When durable state is approved, append compatibility, sequencing, rollback, and point-of-no-return choices to the selected work item's decisions.md; otherwise include them in the final response.
refactor: When durable state is approved, append boundary changes, compatibility assumptions, and accepted tradeoffs to the selected work item's decisions.md; otherwise include them in the final response.
release-readiness: When durable state is approved, append only accepted release risk, waivers, rollback choices, and readiness-scope decisions to the selected work item's decisions.md; otherwise include them in the final response.
review: When durable state is approved, track defects and their lifecycle in the selected work item's findings.md and append only review-scope or accepted-risk decisions to decisions.md; otherwise report them in the final response.
security-review: When durable state is approved, track sanitized vulnerabilities in the selected work item's findings.md and append accepted security tradeoffs, threat assumptions, compensating controls, or risk acceptance to decisions.md; otherwise report them in the final response.
test: When durable state is approved, append material test-boundary, fidelity, or coverage-risk decisions to the selected work item's decisions.md; otherwise include them in the final response.
```

Do not change each skill's escalation rules or add mandatory approval gates beyond the shared protocol.

- [ ] **Step 4: Make package validation enforce the same contract**

In `scripts/validate.mjs`, retain the protocol assertions added in Task 1 and replace the temporary dual-path assertion with:

```js
assert.match(content, /Read `\.\.\/\.\.\/references\/workspaces\.md`/);
assert.doesNotMatch(content, /docs\/agent\/(?:spec|plan|decision-log|findings|handoff)\.md/);
```

- [ ] **Step 5: Run bundle and full validation**

Run:

```bash
rtk node --test test/bundle.test.js
rtk npm run validate
```

Expected: PASS and `Validated engineering plugin 0.1.0 with 15 skills.` until the version bump in Task 7.

- [ ] **Step 6: Commit the complete skill migration**

```bash
rtk git add plugin/skills scripts/validate.mjs test/bundle.test.js
rtk git commit -m "refactor(skills): adopt workspace lifecycle protocol"
```

---

### Task 3: Make project initialization guidance-only

**Files:**
- Modify: `templates/AGENTS.md`
- Delete: `templates/docs/agent/spec.md`
- Delete: `templates/docs/agent/plan.md`
- Delete: `templates/docs/agent/decision-log.md`
- Delete: `templates/docs/agent/findings.md`
- Delete: `templates/docs/agent/handoff.md`
- Modify: `src/cli.js`
- Modify: `test/bundle.test.js`
- Modify: `test/commands.test.js`

**Interfaces:**
- Preserves: `npx nono-skills init [directory]`, `--dry-run`, and `--force` behavior.
- Produces: initialization copies and owns only `AGENTS.md` from the released template set.
- Preserves: existing singleton files and user modifications without migration or deletion.

- [ ] **Step 1: Write failing bundle and command tests for guidance-only init**

Replace the template bundle test with:

```js
test('project initialization bundles repository guidance only', async () => {
  assert.deepEqual(await listFiles(path.join(root, 'templates')), ['AGENTS.md']);
});
```

In the plan-and-guidance test, replace the legacy `AGENTS.md` assertion with:

```js
assert.match(agents, /docs\/agent\/work\/<work-id>\//);
assert.match(agents, /ask before creating a new durable workspace/);
```

Replace the first command test fixture and assertions with:

```js
test('init creates only repository guidance and preserves legacy artifacts', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'engineering-command-'));
  const packageRoot = path.join(root, 'package');
  const target = path.join(root, 'project');
  await mkdir(path.join(packageRoot, 'templates'), { recursive: true });
  await mkdir(path.join(target, 'docs', 'agent'), { recursive: true });
  await writeFile(path.join(packageRoot, 'templates', 'AGENTS.md'), 'rules');
  await writeFile(path.join(target, 'docs', 'agent', 'spec.md'), 'legacy spec');

  const stdout = writer();
  const handlers = createHandlers({
    packageRoot, home: path.join(root, 'home'), cwd: root,
    packageVersion: '0.2.0', stdout: stdout.stream, stderr: writer().stream,
  });

  assert.equal(await handlers.init({ target, force: false, dryRun: false }), 0);
  assert.equal(await readFile(path.join(target, 'AGENTS.md'), 'utf8'), 'rules');
  assert.equal(await readFile(path.join(target, 'docs', 'agent', 'spec.md'), 'utf8'), 'legacy spec');
  const state = JSON.parse(await readFile(path.join(target, '.codex-engineering-skills.json'), 'utf8'));
  assert.deepEqual(Object.keys(state.files), ['AGENTS.md']);
  assert.match(stdout.read(), /Created 1/);
});
```

- [ ] **Step 2: Run focused tests and verify old templates violate the contract**

Run:

```bash
rtk node --test test/bundle.test.js test/commands.test.js
```

Expected: FAIL because `templates/` still contains the five singleton files.

- [ ] **Step 3: Remove singleton templates and update guidance**

Delete the five `templates/docs/agent/*.md` files. Replace `templates/AGENTS.md`'s `## Task artifacts` section with:

```markdown
## Durable task state

Keep simple, one-shot work artifact-free. Ask before creating a new durable workspace unless the user explicitly requested durable artifacts or named an existing work item.

Approved work lives under `docs/agent/work/<work-id>/`. Keep each feature isolated, let its `spec.md` define scope and status, record only material decisions, and never select another work item by recency alone. Repository-specific instructions override the default location.
```

Change the `init` help line in `src/cli.js` to:

```text
  init [directory]        Add optional repository guidance
```

- [ ] **Step 4: Run init, bundle, and project-init tests**

Run:

```bash
rtk node --test test/bundle.test.js test/commands.test.js test/cli.test.js test/project-init.test.js
```

Expected: PASS. The generic project-init helper still supports multiple files in isolated tests, while the released template set contains only `AGENTS.md`.

- [ ] **Step 5: Commit guidance-only initialization**

```bash
rtk git add templates src/cli.js test/bundle.test.js test/commands.test.js
rtk git commit -m "refactor(init): keep project setup guidance-only"
```

---

### Task 4: Protect user-owned work items during purge

**Files:**
- Modify: `src/uninstall.js`
- Modify: `test/uninstall.test.js`

**Interfaces:**
- Produces: `isWorkItemArtifact(relative) -> boolean` as a private path-policy helper.
- Preserves: `purgeProject({ targetRoot, recordedChecksums }) -> { removed, preserved }` return shape.
- Guarantees: any recorded path below `docs/agent/work/` is preserved even when its checksum matches.

- [ ] **Step 1: Write a failing purge-protection test**

Add to `test/uninstall.test.js`:

```js
test('purge always preserves user-owned work-item artifacts', async () => {
  const targetRoot = await mkdtemp(path.join(os.tmpdir(), 'engineering-purge-'));
  const relative = 'docs/agent/work/2026-07-16-user-auth/spec.md';
  const file = path.join(targetRoot, relative);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, 'approved durable state');
  const digest = createHash('sha256').update('approved durable state').digest('hex');

  const result = await purgeProject({ targetRoot, recordedChecksums: { [relative]: digest } });

  assert.deepEqual(result.removed, []);
  assert.deepEqual(result.preserved, [relative]);
  assert.equal(await readFile(file, 'utf8'), 'approved durable state');
});
```

- [ ] **Step 2: Run the test and verify current purge deletes the file**

Run:

```bash
rtk node --test test/uninstall.test.js
```

Expected: FAIL because `result.removed` currently contains the work-item path.

- [ ] **Step 3: Add the explicit user-data guard**

Add above `purgeProject` in `src/uninstall.js`:

```js
function isWorkItemArtifact(relative) {
  const normalized = relative.replaceAll('\\', '/');
  return normalized.startsWith('docs/agent/work/');
}
```

Add at the start of the checksum loop:

```js
if (isWorkItemArtifact(relative)) {
  preserved.push(relative);
  continue;
}
```

- [ ] **Step 4: Run uninstall and command tests**

Run:

```bash
rtk node --test test/uninstall.test.js test/commands.test.js
```

Expected: PASS, including unchanged-template deletion and modified-file preservation.

- [ ] **Step 5: Commit the purge safeguard**

```bash
rtk git add src/uninstall.js test/uninstall.test.js
rtk git commit -m "fix(uninstall): preserve durable work artifacts"
```

---

### Task 5: Document the zero-ceremony, consent-aware workflow

**Files:**
- Modify: `README.md`

**Interfaces:**
- Documents: install-first natural usage, adaptive persistence, single consent gate, resumption rules, optional explicit skill invocation, optional `init`, legacy preservation, and maintenance commands.
- Preserves: the 15-skill intent table and safe Superpowers removal guidance.

- [ ] **Step 1: Capture the README contract as a failing bundle assertion**

Add to `test/bundle.test.js`:

```js
test('README documents adaptive consent-aware workspaces', async () => {
  const readme = await readFile(path.join(root, 'README.md'), 'utf8');
  assert.match(readme, /Small tasks stay artifact-free/);
  assert.match(readme, /docs\/agent\/work\/<work-id>\//);
  assert.match(readme, /asks once before creating it/);
  assert.match(readme, /`init` is optional/);
  assert.doesNotMatch(readme, /Project artifacts include.*docs\/agent\/.*templates/);
});
```

- [ ] **Step 2: Run the bundle test and verify README mismatch**

Run:

```bash
rtk node --test test/bundle.test.js
```

Expected: FAIL because README still describes singleton templates and opt-in artifact creation through `init`.

- [ ] **Step 3: Rewrite the workflow and initialization sections**

Replace the top-level workflow copy with:

```markdown
## How it works

- Install once, start a new Codex task, and ask for engineering work naturally. Explicit `$engineering:<skill>` invocation remains optional.
- Small tasks stay artifact-free.
- For work worth resuming or tracking, Codex proposes an isolated `docs/agent/work/<work-id>/` workspace and asks once before creating it.
- An explicit request for a spec, plan, log, findings tracker, handoff, or named existing work item already grants artifact consent for that scope.
- After approval, Codex maintains that work item's spec, plan, material decisions, findings, and handoff as needed without asking for every file update.
- Codex asks again only for an ambiguous work-item match, material scope expansion, or an action that needs new authority.
```

Immediately after installation, add this natural-language example:

````markdown
Then work normally:

```text
Implement user authentication and keep me updated.
```

For a durable task, Codex may propose:

```text
This work has multiple stages and should remain resumable. I propose
docs/agent/work/2026-07-16-user-auth/ for its spec, plan, and material
decisions. Approve this workspace?
```

Declining keeps the work in the current conversation and creates no workflow files.
````

Replace `## Initialize a project` with:

````markdown
## Optional repository guidance

`init` is optional. The plugin works without it. Run this only when the repository needs a starter `AGENTS.md` for its setup commands, architecture rules, verification commands, and local conventions:

```bash
npx nono-skills init
```

Initialization no longer creates task artifacts. Existing 0.1.0 singleton files under `docs/agent/` are preserved and new durable work uses per-work-item directories.
````

Update the safety model to state that Codex-proposed workspaces require consent, work-item directories are user-owned, and purge never removes them.

- [ ] **Step 4: Run bundle tests and scan for stale singleton guidance**

Run:

```bash
rtk node --test test/bundle.test.js
rtk rg -n "Project artifacts include|Without initialization|docs/agent/(spec|plan|decision-log|findings|handoff)\.md" README.md templates plugin/skills
```

Expected: test PASS and `rg` returns no stale default-singleton guidance.

- [ ] **Step 5: Commit the usage documentation**

```bash
rtk git add README.md test/bundle.test.js
rtk git commit -m "docs(readme): explain adaptive workspace consent"
```

---

### Task 6: Forward-test workspace behavior with fresh context

**Files:**
- Create: `docs/validation/2026-07-16-adaptive-workspaces.md`
- Modify only on a failed scenario: `plugin/references/workspaces.md`
- Modify only on a failed scenario: the relevant `plugin/skills/<name>/SKILL.md`
- Modify only on a failed scenario: `test/bundle.test.js`

**Interfaces:**
- Consumes: the released workspace protocol plus one intent skill per scenario, without prior conversation history.
- Produces: a validation record containing expected and observed classification, consent, selection, artifact, and escalation behavior.
- Preserves: no forward-test prompt may write to the real repository, live plugin installation, or external systems.

- [ ] **Step 1: Define the exact fresh-context scenario matrix**

Use one fresh forward-test agent per row. Give it only the workspace protocol, the named skill, the synthetic request/fixture, and this output schema:

```json
{
  "classification": "transient | durable",
  "ask_before_artifacts": true,
  "selected_work_id": "string | null",
  "artifact_actions": ["string"],
  "human_question": "string | null",
  "reason": "string"
}
```

Expected scenarios:

| Scenario | Skill | Synthetic input | Expected behavior |
|---|---|---|---|
| Trivial edit | `implement` | Fix one obvious typo; no artifact request | `transient`; no question; no artifacts |
| Explicit durable plan | `plan` | Create a plan and decision log for user authentication | `durable`; no redundant consent question; create `spec.md` and `plan.md`; create `decisions.md` only on a material decision |
| Agent-proposed workspace | `implement` | Multi-stage authentication spanning API, database, migration, and tests | `durable`; propose one path and ask before any artifact |
| Declined workspace | `implement` | Same complex task plus user decline in supplied conversation state | no artifacts; continue in chat within existing implementation authority |
| Exact resume | `fix-findings` | Explicitly continue `issue-123-user-auth` with one matching fixture | select `issue-123-user-auth`; no new-workspace question; update its findings only |
| Ambiguous resume | `plan` | Two active fixtures plausibly match “continue auth work” | ask the user to choose; update neither item |
| Reopen completed | `implement` | Explicitly reopen one completed work item | select it; change status to `active`; record the reopening reason in `decisions.md` |

- [ ] **Step 2: Run each scenario with a fresh agent and capture raw outcomes**

Do not let a test agent infer from prior scenario messages. Do not ask it to praise or review the skill; ask it to decide the first workflow action from the supplied instructions and fixture.

Expected: all seven JSON results conform to the schema and match the matrix. Any extra user question, silent workspace creation, recency-only selection, or real file write is a failure.

- [ ] **Step 3: Fix and rerun any failed scenario before recording success**

For each failure:

1. add the smallest clarifying protocol or skill sentence that resolves the observed ambiguity
2. add a matching static assertion to `test/bundle.test.js`
3. run `rtk node --test test/bundle.test.js` and `rtk npm run validate`
4. rerun only the failed fresh-agent scenario, then rerun the full seven-scenario matrix

Do not weaken expected outcomes to match an incorrect agent response.

- [ ] **Step 4: Write the validation record**

Create `docs/validation/2026-07-16-adaptive-workspaces.md` with:

```markdown
# Adaptive Workspaces Forward-Test Report

Date: 2026-07-16
Protocol: `plugin/references/workspaces.md`
Result: pass

| Scenario | Expected | Observed | Result |
|---|---|---|---|
| Trivial edit | Transient, no artifacts | Transient, no artifacts | Pass |
| Explicit durable plan | Durable, no redundant question | Durable, no redundant question | Pass |
| Agent-proposed workspace | Ask before artifacts | Asked before artifacts | Pass |
| Declined workspace | No files, continue in chat | No files, continued in chat | Pass |
| Exact resume | Select explicit item | Selected explicit item | Pass |
| Ambiguous resume | Ask user, update neither | Asked user, updated neither | Pass |
| Reopen completed | Activate and log reason | Activated and logged reason | Pass |

No scenario wrote to the repository, live plugin installation, or external systems. Raw structured outcomes were inspected during execution; this report records the verified contract without conversation transcripts.
```

Use `Result: fail` and record exact mismatches if any scenario still fails; do not proceed to release preparation with a failing report.

- [ ] **Step 5: Verify and commit the behavioral evidence**

Run:

```bash
rtk npm test
rtk npm run validate
rtk git diff --check
```

Expected: PASS.

Commit the report plus any protocol/test corrections produced by failed scenarios:

```bash
rtk git add docs/validation/2026-07-16-adaptive-workspaces.md plugin/references plugin/skills test/bundle.test.js
rtk git commit -m "test(skills): record workspace forward tests"
```

---

### Task 7: Prepare and verify release 0.2.0

**Files:**
- Modify: `package.json`
- Modify: `plugin/.codex-plugin/plugin.json`
- Modify: `test/package.test.js`

**Interfaces:**
- Produces: npm package and plugin manifest version `0.2.0`.
- Packages: `plugin/references/workspaces.md` with all 15 skills.
- Excludes: removed singleton templates, tests, design docs, installer state, and backups.

- [ ] **Step 1: Tighten package-content tests before bumping the version**

In `test/package.test.js`, add `plugin/references/workspaces.md` to the required file list and add:

```js
assert.equal(names.some((name) => name.startsWith('templates/docs/agent/')), false);
```

In the manifest test in `test/bundle.test.js`, add:

```js
assert.equal(packageJson.version, '0.2.0');
assert.equal(plugin.version, '0.2.0');
```

- [ ] **Step 2: Run package and bundle tests and verify the version assertions fail**

Run:

```bash
rtk node --test test/package.test.js test/bundle.test.js
```

Expected: FAIL because both manifests remain at `0.1.0`.

- [ ] **Step 3: Bump package and plugin versions together**

In `package.json`, set:

```json
"version": "0.2.0"
```

In `plugin/.codex-plugin/plugin.json`, set:

```json
"version": "0.2.0"
```

Do not modify registry, repository, author, license, engine, or runtime-dependency metadata.

- [ ] **Step 4: Run the complete automated verification suite**

Run:

```bash
rtk npm test
rtk npm run validate
rtk npm pack --json --dry-run
```

Expected:

- all Node tests pass
- validation prints `Validated engineering plugin 0.2.0 with 15 skills.`
- the dry-run package contains the shared protocol and no singleton templates

- [ ] **Step 5: Pack and smoke-test the executable without publishing**

Run:

```bash
rtk npm pack
rtk npm exec --yes --package=./nono-skills-0.2.0.tgz -- nono-skills --version
```

Expected: tarball creation succeeds and version output is `0.2.0`.

Run install/update/doctor/uninstall only against an isolated temporary home or the existing test harness; do not mutate the user's live plugin installation as part of release verification.

- [ ] **Step 6: Review release diff and commit**

Run:

```bash
rtk git diff --check
rtk git status --short
```

Confirm there are no placeholders, stale singleton defaults, accidental runtime Superpowers references, untracked secrets, or package contents outside the declared release scope.

Commit:

```bash
rtk git add package.json plugin/.codex-plugin/plugin.json test/package.test.js
rtk git commit -m "chore(release): prepare 0.2.0"
```

## Final verification and handoff

- [ ] Run `rtk npm test`, `rtk npm run validate`, and `rtk npm pack --json --dry-run` again from the final commit.
- [ ] Report exact test counts, validation output, tarball contents summary, commit list, and clean/dirty worktree state.
- [ ] Do not push or publish 0.2.0 until the human explicitly authorizes those external actions after reviewing local verification.
