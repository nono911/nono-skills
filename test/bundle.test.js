import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

import { listFiles } from '../src/fs-safe.js';

const root = path.resolve(import.meta.dirname, '..');
const expectedSkills = [
  'api-design', 'architecture-review', 'brainstorm', 'database-design', 'debug',
  'estimate', 'fix-findings', 'implement', 'migration', 'plan', 'refactor',
  'release-readiness', 'review', 'security-review', 'test',
];

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

test('every skill has specific UI metadata and safe artifact fallback', async () => {
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
    assert.match(skill, /create workflow artifacts only when the user requests them/);
  }
});

test('plan artifacts are conditional and repository guidance stays concise', async () => {
  const plan = await readFile(path.join(root, 'plugin', 'skills', 'plan', 'SKILL.md'), 'utf8');
  const agents = await readFile(path.join(root, 'templates', 'AGENTS.md'), 'utf8');

  assert.match(plan, /artifact files already exist or the user requests durable planning/);
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
