import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import test from 'node:test';

import { canonicalSkillNames } from '../src/plugin-contract.js';

const exec = promisify(execFile);
const root = path.resolve(import.meta.dirname, '..');
const expectedSkills = canonicalSkillNames;

test('npm metadata advertises the supported external agent harnesses', async () => {
  const packageJson = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
  for (const keyword of [
    'multi-agent-cli',
    'agent-orchestration',
    'claude-code',
    'qwen-code',
    'opencode',
    'codewhale',
    'antigravity',
  ]) {
    assert.equal(packageJson.keywords.includes(keyword), true, `missing keyword ${keyword}`);
  }
});

test('npm package includes runtime assets and excludes development state', async () => {
  const { stdout } = await exec('npm', ['pack', '--json', '--dry-run'], { cwd: root });
  const [{ files }] = JSON.parse(stdout);
  const names = files.map((file) => file.path);
  for (const required of [
    'bin/cli.js', 'src/cli.js', 'plugin/.codex-plugin/plugin.json',
    'evals/skill-behavior.json', 'scripts/eval-skills.mjs',
    'plugin/references/workspaces.md', 'scripts/sync-portable-resources.mjs',
    'plugin/skills/delivery-loop/references/agent-delegation.md',
    'plugin/skills/delivery-loop/scripts/agent-bridge.mjs',
    'plugin/skills/delivery-loop/scripts/provider-contract.mjs',
    'plugin/skills/delivery-loop/scripts/providers/index.mjs',
    'plugin/skills/delivery-loop/scripts/providers/claude.mjs',
    'plugin/skills/delivery-loop/scripts/providers/codex.mjs',
    'plugin/skills/delivery-loop/scripts/providers/qwen.mjs',
    'plugin/skills/delivery-loop/scripts/providers/opencode.mjs',
    'plugin/skills/delivery-loop/scripts/providers/codewhale.mjs',
    'plugin/skills/delivery-loop/scripts/providers/antigravity.mjs',
    'templates/AGENTS.md', 'README.md', 'LICENSE',
  ]) assert.equal(names.includes(required), true, `missing ${required}`);
  assert.equal(expectedSkills.length, 18);
  for (const name of expectedSkills) {
    for (const required of [
      `plugin/skills/${name}/SKILL.md`,
      `plugin/skills/${name}/agents/openai.yaml`,
      `plugin/skills/${name}/references/workspaces.md`,
    ]) assert.equal(names.includes(required), true, `missing ${required}`);
  }
  assert.equal(names.some((name) => name.startsWith('templates/docs/agent/')), false);
  assert.equal(names.some((name) => name.startsWith('test/')), false);
  assert.equal(names.some((name) => name.startsWith('docs/')), false);
  assert.equal(names.some((name) => name.startsWith('.superpowers/')), false);
  assert.equal(names.some((name) => name.includes('.installer-state')), false);
  assert.equal(names.some((name) => name.includes('backup')), false);
});
