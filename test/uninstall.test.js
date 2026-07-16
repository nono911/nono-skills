import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { installPlugin } from '../src/plugin-install.js';
import { purgeProject, uninstallPlugin } from '../src/uninstall.js';

async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'engineering-uninstall-'));
  const home = path.join(root, 'home');
  const packageRoot = path.join(root, 'package');
  await mkdir(path.join(packageRoot, 'plugin', '.codex-plugin'), { recursive: true });
  await mkdir(path.join(packageRoot, 'plugin', 'skills', 'plan'), { recursive: true });
  await writeFile(path.join(packageRoot, 'plugin', '.codex-plugin', 'plugin.json'), JSON.stringify({ name: 'engineering', version: '0.1.0' }));
  await writeFile(path.join(packageRoot, 'plugin', 'skills', 'plan', 'SKILL.md'), 'plan');
  const calls = [];
  const runCodex = async (args) => {
    calls.push(args);
    if (args[0] === '--version') return { code: 0, stdout: 'codex', stderr: '' };
    if (args[1] === 'list') return { code: 0, stdout: 'engineering@personal installed, enabled', stderr: '' };
    return { code: 0, stdout: 'ok', stderr: '' };
  };
  await installPlugin({ home, packageRoot, runCodex, clock: () => 'test', packageVersion: '0.1.0' });
  return { root, home, runCodex, calls };
}

test('uninstall removes owned plugin and preserves unrelated marketplace entries', async () => {
  const { home, runCodex, calls } = await fixture();
  const marketplacePath = path.join(home, '.agents', 'plugins', 'marketplace.json');
  const marketplace = JSON.parse(await readFile(marketplacePath, 'utf8'));
  marketplace.plugins.unshift({ name: 'other' });
  await writeFile(marketplacePath, JSON.stringify(marketplace));
  const result = await uninstallPlugin({ home, runCodex });
  assert.equal(result.status, 'uninstalled');
  assert.deepEqual(calls.at(-1), ['plugin', 'remove', 'engineering@personal']);
  await assert.rejects(stat(path.join(home, 'plugins', 'engineering')), { code: 'ENOENT' });
  assert.deepEqual(JSON.parse(await readFile(marketplacePath, 'utf8')).plugins, [{ name: 'other' }]);
});

test('uninstall refuses drifted plugin files', async () => {
  const { home, runCodex } = await fixture();
  await writeFile(path.join(home, 'plugins', 'engineering', 'foreign.txt'), 'mine');
  await assert.rejects(uninstallPlugin({ home, runCodex }), /foreign.txt/);
});

test('purge deletes unchanged project files and preserves modified files', async () => {
  const targetRoot = await mkdtemp(path.join(os.tmpdir(), 'engineering-purge-'));
  await writeFile(path.join(targetRoot, 'same.md'), 'same');
  await writeFile(path.join(targetRoot, 'changed.md'), 'changed');
  const digest = (value) => createHash('sha256').update(value).digest('hex');
  const result = await purgeProject({ targetRoot, recordedChecksums: { 'same.md': digest('same'), 'changed.md': digest('original') } });
  assert.deepEqual(result.removed, ['same.md']);
  assert.deepEqual(result.preserved, ['changed.md']);
  await assert.rejects(stat(path.join(targetRoot, 'same.md')), { code: 'ENOENT' });
  assert.equal(await readFile(path.join(targetRoot, 'changed.md'), 'utf8'), 'changed');
});
