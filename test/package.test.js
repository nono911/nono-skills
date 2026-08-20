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

test('npm metadata stays focused on product capabilities', async () => {
  const packageJson = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
  for (const keyword of ['agent-skills', 'software-engineering', 'code-review', 'agent-orchestration']) {
    assert.equal(packageJson.keywords.includes(keyword), true, `missing keyword ${keyword}`);
  }
  assert.ok(packageJson.keywords.length <= 15, 'keyword list should remain focused');
  for (const keyword of ['claude-code', 'qwen-code', 'opencode', 'codewhale', 'antigravity', 'superpowers-alternative']) {
    assert.equal(packageJson.keywords.includes(keyword), false, `competitor keyword should not be used for discovery: ${keyword}`);
  }
});

test('npm package includes runtime assets and excludes development state', async () => {
  const npmArgs = ['pack', '--json', '--dry-run'];
  const npmCli = process.env.npm_execpath;
  const command = npmCli ? process.execPath : (process.platform === 'win32' ? 'npm.cmd' : 'npm');
  const args = npmCli ? [npmCli, ...npmArgs] : npmArgs;
  const { stdout } = await exec(command, args, {
    cwd: root,
    shell: process.platform === 'win32' && !npmCli,
  });
  const [{ files }] = JSON.parse(stdout);
  const names = files.map((file) => file.path);
  for (const required of [
    'bin/cli.js', 'src/cli.js', 'plugin/.codex-plugin/plugin.json',
    'evals/skill-behavior.json', 'scripts/eval-skills.mjs',
    'evals/host-behavior.json', 'scripts/eval-host.mjs', 'src/host-eval.js',
    'scripts/adapters/codex.mjs', 'src/codex-host-adapter.js',
    'evals/fixtures/stable-repository/package.json',
    'evals/fixtures/stable-repository/src/parser.js',
    'evals/fixtures/stable-repository/test/parser.test.js',
    'plugin/references/workspaces.md', 'plugin/references/finding-rubric.md',
    'plugin/references/branch-naming.md',
    'scripts/sync-portable-resources.mjs',
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
    'plugin/skills/write-guide/references/ui-guides.md',
    'plugin/skills/write-guide/references/output-formats.md',
    'plugin/skills/delivery-loop/references/branch-naming.md',
    'plugin/skills/bugfix-loop/references/branch-naming.md',
    'templates/AGENTS.md', 'README.md', 'CHANGELOG.md', 'LICENSE',
  ]) assert.equal(names.includes(required), true, `missing ${required}`);
  assert.equal(expectedSkills.length, 21);
  for (const name of expectedSkills) {
    for (const required of [
      `plugin/skills/${name}/SKILL.md`,
      `plugin/skills/${name}/agents/openai.yaml`,
      `plugin/skills/${name}/references/workspaces.md`,
    ]) assert.equal(names.includes(required), true, `missing ${required}`);
  }
  for (const name of [
    'acceptance-verify',
    'architecture-review',
    'bugfix-loop',
    'delivery-loop',
    'fix-findings',
    'release-readiness',
    'review',
    'security-review',
  ]) {
    assert.equal(
      names.includes(`plugin/skills/${name}/references/finding-rubric.md`),
      true,
      `missing finding rubric for ${name}`,
    );
  }
  assert.equal(names.some((name) => name.startsWith('templates/docs/agent/')), false);
  assert.equal(names.some((name) => name.startsWith('test/')), false);
  assert.equal(names.some((name) => name.startsWith('docs/')), false);
  assert.equal(names.some((name) => name.startsWith('benchmarks/')), false);
  assert.equal(names.some((name) => name.startsWith('.superpowers/')), false);
  assert.equal(names.some((name) => name.includes('.installer-state')), false);
  assert.equal(names.some((name) => name.includes('backup')), false);
});
