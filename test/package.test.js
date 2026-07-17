import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';
import test from 'node:test';

import { expectedDurableEndings } from '../src/skill-contract.js';

const exec = promisify(execFile);
const root = path.resolve(import.meta.dirname, '..');
const expectedSkills = Object.keys(expectedDurableEndings).sort();

test('npm package includes runtime assets and excludes development state', async () => {
  const { stdout } = await exec('npm', ['pack', '--json', '--dry-run'], { cwd: root });
  const [{ files }] = JSON.parse(stdout);
  const names = files.map((file) => file.path);
  for (const required of [
    'bin/cli.js', 'src/cli.js', 'plugin/.codex-plugin/plugin.json',
    'plugin/references/workspaces.md', 'templates/AGENTS.md', 'README.md', 'LICENSE',
  ]) assert.equal(names.includes(required), true, `missing ${required}`);
  assert.equal(expectedSkills.length, 15);
  for (const name of expectedSkills) {
    for (const required of [
      `plugin/skills/${name}/SKILL.md`,
      `plugin/skills/${name}/agents/openai.yaml`,
    ]) assert.equal(names.includes(required), true, `missing ${required}`);
  }
  assert.equal(names.some((name) => name.startsWith('templates/docs/agent/')), false);
  assert.equal(names.some((name) => name.startsWith('test/')), false);
  assert.equal(names.some((name) => name.startsWith('docs/')), false);
  assert.equal(names.some((name) => name.startsWith('.superpowers/')), false);
  assert.equal(names.some((name) => name.includes('.installer-state')), false);
  assert.equal(names.some((name) => name.includes('backup')), false);
});
