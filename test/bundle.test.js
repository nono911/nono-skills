import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { listFiles } from '../src/fs-safe.js';
import { assertSkillWorkspaceContract } from '../src/skill-contract.js';

const root = path.resolve(import.meta.dirname, '..');
const expectedSkills = [
  'api-design', 'architecture-review', 'brainstorm', 'database-design', 'debug',
  'estimate', 'fix-findings', 'implement', 'migration', 'plan', 'refactor',
  'release-readiness', 'review', 'security-review', 'test',
];
const workspaceSection = `## Workspace protocol

Read \`../../references/workspaces.md\` before selecting or creating workflow artifacts. Follow it for persistence, consent, work-item resolution, and lifecycle; this skill owns only the task-specific behavior below.`;
const apiDesignEnding = "When durable state is approved, append contract choices and compatibility consequences to the selected work item's decisions.md; otherwise include them in the final response.";

async function validateMutatedSkill(name, mutate) {
  const fixtureRoot = await mkdtemp(path.join(tmpdir(), 'nono-skills-validate-'));
  try {
    await Promise.all(['package.json', 'plugin', 'scripts', 'src'].map((relative) => cp(
      path.join(root, relative),
      path.join(fixtureRoot, relative),
      { recursive: true },
    )));
    const skillPath = path.join(fixtureRoot, 'plugin', 'skills', name, 'SKILL.md');
    const content = await readFile(skillPath, 'utf8');
    const mutated = mutate(content);
    assert.notEqual(mutated, content, `${name} test mutation must change the skill`);
    await writeFile(skillPath, mutated, 'utf8');
    return spawnSync(process.execPath, ['scripts/validate.mjs'], {
      cwd: fixtureRoot,
      encoding: 'utf8',
    });
  } finally {
    await rm(fixtureRoot, { recursive: true, force: true });
  }
}

function assertValidationFails(result) {
  assert.notEqual(
    result.status,
    0,
    `validation unexpectedly passed\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
  );
}

test('plugin manifest matches the npm package', async () => {
  const packageJson = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
  const plugin = JSON.parse(await readFile(path.join(root, 'plugin', '.codex-plugin', 'plugin.json'), 'utf8'));
  assert.equal(plugin.name, 'engineering');
  assert.equal(plugin.version, packageJson.version);
  assert.equal(plugin.skills, './skills/');
  assert.equal(plugin.author.name.length > 0, true);
  assert.equal(plugin.interface.displayName, 'Engineering');
  assert.equal(packageJson.repository.url, 'git+https://github.com/nono911/nono-skills.git');
  assert.equal(packageJson.publishConfig.access, 'public');
  assert.equal(plugin.repository, 'https://github.com/nono911/nono-skills');
});

test('bundle contains exactly the validated 15-skill set', async () => {
  const files = await listFiles(path.join(root, 'plugin', 'skills'));
  const skillFiles = files.filter((file) => file.endsWith('/SKILL.md'));
  assert.deepEqual(skillFiles.map((file) => file.split(path.sep)[0]).sort(), expectedSkills);
  for (const relative of skillFiles) {
    const content = await readFile(path.join(root, 'plugin', 'skills', relative), 'utf8');
    const name = relative.split(path.sep)[0];
    assert.match(content, new RegExp(`^---\\nname: ${name}\\ndescription: .+\\n---`, 's'));
    assert.doesNotMatch(content, /TODO|Superpowers|\.codex\/skills/);
  }
});

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
  assert.match(protocol, /never move, merge, or delete them automatically/);

  for (const name of ['plan', 'implement']) {
    const skill = await readFile(path.join(root, 'plugin', 'skills', name, 'SKILL.md'), 'utf8');
    assert.match(skill, /Read `\.\.\/\.\.\/references\/workspaces\.md`/);
  }
});

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
    assertSkillWorkspaceContract(name, skill);
  }
});

test('package validation rejects a negated workspace instruction', async () => {
  const result = await validateMutatedSkill('api-design', (content) => content.replace(
    'Read `../../references/workspaces.md`',
    'Do not Read `../../references/workspaces.md`',
  ));
  assertValidationFails(result);
});

test('package validation rejects a misplaced workspace section', async () => {
  const result = await validateMutatedSkill('api-design', (content) => content
    .replace(`${workspaceSection}\n\n`, '')
    .replace('\n## Outputs\n', `\n${workspaceSection}\n\n## Outputs\n`));
  assertValidationFails(result);
});

test('package validation rejects a missing skill-specific durable-state ending', async () => {
  const result = await validateMutatedSkill('api-design', (content) => content.replace(
    `${apiDesignEnding}\n`,
    '',
  ));
  assertValidationFails(result);
});

test('package validation rejects the wrong skill-specific durable-state ending', async () => {
  const wrongEnding = "When durable state is approved, append boundary changes, compatibility assumptions, and accepted tradeoffs to the selected work item's decisions.md; otherwise include them in the final response.";
  const result = await validateMutatedSkill('api-design', (content) => content.replace(
    apiDesignEnding,
    wrongEnding,
  ));
  assertValidationFails(result);
});

test('package validation rejects a contextual bare legacy singleton filename', async () => {
  const result = await validateMutatedSkill('api-design', (content) => content.replace(
    apiDesignEnding,
    `Use an existing decision-log.md when durable state is approved.\n${apiDesignEnding}`,
  ));
  assertValidationFails(result);
});

test('plan uses selected work-item artifacts and repository guidance stays concise', async () => {
  const plan = await readFile(path.join(root, 'plugin', 'skills', 'plan', 'SKILL.md'), 'utf8');
  const agents = await readFile(path.join(root, 'templates', 'AGENTS.md'), 'utf8');

  assert.match(plan, /selected work item's spec, plan, and decisions/);
  assert.match(agents, /Do not create missing workflow artifacts unless the user requests/);
  assert.match(agents, /\$engineering:<skill>/);
  assert.ok(agents.length < 3_500, 'AGENTS.md should remain concise');
});

test('bundle contains every project artifact template', async () => {
  const expected = [
    'AGENTS.md', 'docs/agent/decision-log.md', 'docs/agent/findings.md',
    'docs/agent/handoff.md', 'docs/agent/plan.md', 'docs/agent/spec.md',
  ];
  assert.deepEqual(await listFiles(path.join(root, 'templates')), expected);
});
