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

test('bundle contains every project artifact template', async () => {
  const expected = [
    'AGENTS.md', 'docs/agent/decision-log.md', 'docs/agent/findings.md',
    'docs/agent/handoff.md', 'docs/agent/plan.md', 'docs/agent/spec.md',
  ];
  assert.deepEqual(await listFiles(path.join(root, 'templates')), expected);
});
