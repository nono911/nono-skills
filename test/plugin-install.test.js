import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { installPlugin, updatePlugin } from '../src/plugin-install.js';

async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'engineering-install-'));
  const home = path.join(root, 'home');
  const packageRoot = path.join(root, 'package');
  await mkdir(path.join(packageRoot, 'plugin', '.codex-plugin'), { recursive: true });
  await mkdir(path.join(packageRoot, 'plugin', 'skills', 'plan'), { recursive: true });
  await writeFile(path.join(packageRoot, 'plugin', '.codex-plugin', 'plugin.json'), JSON.stringify({ name: 'engineering', version: '0.1.0' }));
  await writeFile(path.join(packageRoot, 'plugin', 'skills', 'plan', 'SKILL.md'), 'plan-v1\n');
  return { root, home, packageRoot };
}

function successfulCodex(calls) {
  return async (args) => {
    calls.push(args);
    if (args[0] === '--version') return { code: 0, stdout: 'codex-cli 0.144.4\n', stderr: '' };
    if (args[1] === 'list') return { code: 0, stdout: 'engineering@personal installed, enabled\n', stderr: '' };
    return { code: 0, stdout: 'installed\n', stderr: '' };
  };
}

test('installs plugin source, marketplace entry, and ownership manifest', async () => {
  const { home, packageRoot } = await fixture();
  const calls = [];
  const result = await installPlugin({ home, packageRoot, runCodex: successfulCodex(calls), clock: () => '20260716-120000', packageVersion: '0.1.0' });
  assert.equal(result.status, 'installed');
  const plugin = JSON.parse(await readFile(path.join(home, 'plugins', 'engineering', '.codex-plugin', 'plugin.json'), 'utf8'));
  assert.equal(plugin.version, '0.1.0+codex.20260716-120000');
  const marketplace = JSON.parse(await readFile(path.join(home, '.agents', 'plugins', 'marketplace.json'), 'utf8'));
  assert.equal(marketplace.plugins[0].name, 'engineering');
  assert.equal(JSON.parse(await readFile(path.join(home, 'plugins', 'engineering', '.installer-state.json'), 'utf8')).packageVersion, '0.1.0');
  assert.deepEqual(calls.at(-1), ['plugin', 'list']);
});

test('owned reinstall is idempotent', async () => {
  const { home, packageRoot } = await fixture();
  const runCodex = successfulCodex([]);
  await installPlugin({ home, packageRoot, runCodex, clock: () => 'same', packageVersion: '0.1.0' });
  const result = await installPlugin({ home, packageRoot, runCodex, clock: () => 'same', packageVersion: '0.1.0' });
  assert.equal(result.status, 'unchanged');
});

test('refuses unrecognized files added to an owned plugin', async () => {
  const { home, packageRoot } = await fixture();
  const runCodex = successfulCodex([]);
  await installPlugin({ home, packageRoot, runCodex, clock: () => 'same', packageVersion: '0.1.0' });
  await writeFile(path.join(home, 'plugins', 'engineering', 'foreign.txt'), 'mine');
  await assert.rejects(
    installPlugin({ home, packageRoot, runCodex, clock: () => 'same', packageVersion: '0.1.0' }),
    /foreign.txt/,
  );
});

test('refuses an existing plugin without installer ownership', async () => {
  const { home, packageRoot } = await fixture();
  await mkdir(path.join(home, 'plugins', 'engineering'), { recursive: true });
  await writeFile(path.join(home, 'plugins', 'engineering', 'foreign.txt'), 'mine');
  await assert.rejects(
    installPlugin({ home, packageRoot, runCodex: successfulCodex([]), clock: () => 'now', packageVersion: '0.1.0' }),
    /not owned/,
  );
});

test('failed Codex registration restores source and marketplace', async () => {
  const { home, packageRoot } = await fixture();
  const marketplacePath = path.join(home, '.agents', 'plugins', 'marketplace.json');
  await mkdir(path.dirname(marketplacePath), { recursive: true });
  await writeFile(marketplacePath, JSON.stringify({ name: 'personal', plugins: [{ name: 'other' }] }));
  const runCodex = async (args) => {
    if (args[0] === '--version') return { code: 0, stdout: 'codex', stderr: '' };
    return { code: 1, stdout: '', stderr: 'registration failed' };
  };
  await assert.rejects(installPlugin({ home, packageRoot, runCodex, clock: () => 'now', packageVersion: '0.1.0' }), /registration failed/);
  await assert.rejects(stat(path.join(home, 'plugins', 'engineering')), { code: 'ENOENT' });
  assert.deepEqual(JSON.parse(await readFile(marketplacePath, 'utf8')).plugins, [{ name: 'other' }]);
});

test('missing Codex fails before filesystem mutation', async () => {
  const { home, packageRoot } = await fixture();
  const runCodex = async () => ({ code: 127, stdout: '', stderr: 'not found' });
  await assert.rejects(installPlugin({ home, packageRoot, runCodex, clock: () => 'now', packageVersion: '0.1.0' }), /Codex CLI/);
  await assert.rejects(stat(path.join(home, 'plugins')), { code: 'ENOENT' });
});

test('update replaces an owned plugin and cachebuster', async () => {
  const { home, packageRoot } = await fixture();
  const runCodex = successfulCodex([]);
  await installPlugin({ home, packageRoot, runCodex, clock: () => 'first', packageVersion: '0.1.0' });
  await writeFile(path.join(packageRoot, 'plugin', 'skills', 'plan', 'SKILL.md'), 'plan-v2\n');
  const result = await updatePlugin({ home, packageRoot, runCodex, clock: () => 'second', packageVersion: '0.2.0' });
  assert.equal(result.status, 'updated');
  const plugin = JSON.parse(await readFile(path.join(home, 'plugins', 'engineering', '.codex-plugin', 'plugin.json'), 'utf8'));
  assert.equal(plugin.version, '0.1.0+codex.second');
  assert.equal(await readFile(path.join(home, 'plugins', 'engineering', 'skills', 'plan', 'SKILL.md'), 'utf8'), 'plan-v2\n');
});
