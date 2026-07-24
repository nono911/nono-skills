import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  applyProjectInit,
  planProjectInit,
  resolveProjectTarget,
} from '../src/project-init.js';

async function fixture() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'engineering-init-'));
  const templateRoot = path.join(root, 'templates');
  const targetRoot = path.join(root, 'target with spaces');
  await mkdir(path.join(templateRoot, 'docs', 'agent'), { recursive: true });
  await mkdir(targetRoot, { recursive: true });
  await writeFile(path.join(templateRoot, 'AGENTS.md'), 'rules\n');
  await writeFile(path.join(templateRoot, 'docs', 'agent', 'plan.md'), 'plan\n');
  return { root, templateRoot, targetRoot };
}

test('creates every missing project artifact', async () => {
  const { templateRoot, targetRoot } = await fixture();
  const actions = await planProjectInit({ templateRoot, targetRoot, force: false, dryRun: false, clock: () => 'stamp' });
  assert.deepEqual(actions.map((action) => action.type), ['create', 'create']);
  await applyProjectInit(actions);
  assert.equal(await readFile(path.join(targetRoot, 'AGENTS.md'), 'utf8'), 'rules\n');
});

test('skips identical files and reports differing files as conflicts', async () => {
  const { templateRoot, targetRoot } = await fixture();
  await writeFile(path.join(targetRoot, 'AGENTS.md'), 'rules\n');
  await mkdir(path.join(targetRoot, 'docs', 'agent'), { recursive: true });
  await writeFile(path.join(targetRoot, 'docs', 'agent', 'plan.md'), 'custom\n');
  const actions = await planProjectInit({ templateRoot, targetRoot, force: false, dryRun: false, clock: () => 'stamp' });
  assert.deepEqual(actions.map((action) => action.type), ['skip', 'conflict']);
  await applyProjectInit(actions);
  assert.equal(await readFile(path.join(targetRoot, 'docs', 'agent', 'plan.md'), 'utf8'), 'custom\n');
});

test('dry-run plans creates without writing', async () => {
  const { templateRoot, targetRoot } = await fixture();
  const actions = await planProjectInit({ templateRoot, targetRoot, force: false, dryRun: true, clock: () => 'stamp' });
  assert.equal(actions.every((action) => action.dryRun), true);
  await applyProjectInit(actions);
  await assert.rejects(readFile(path.join(targetRoot, 'AGENTS.md')), { code: 'ENOENT' });
});

test('force backs up conflicts before replacing them', async () => {
  const { templateRoot, targetRoot } = await fixture();
  await writeFile(path.join(targetRoot, 'AGENTS.md'), 'custom\n');
  const actions = await planProjectInit({ templateRoot, targetRoot, force: true, dryRun: false, clock: () => '20260716T120000' });
  const replacement = actions.find((action) => action.relative === 'AGENTS.md');
  assert.equal(replacement.type, 'replace');
  await applyProjectInit(actions);
  assert.equal(await readFile(path.join(targetRoot, 'AGENTS.md'), 'utf8'), 'rules\n');
  assert.equal(await readFile(replacement.backup, 'utf8'), 'custom\n');
});

test('defaults project initialization to the Git root', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'engineering-init-root-'));
  const nested = path.join(root, 'packages', 'api');
  await mkdir(nested, { recursive: true });
  const target = await resolveProjectTarget({
    cwd: nested,
    target: undefined,
    findRoot: async () => root,
  });
  assert.equal(target, root);
});

test('explicit project target overrides Git-root discovery', async () => {
  let discoveryCalls = 0;
  const target = await resolveProjectTarget({
    cwd: '/tmp/current',
    target: '../chosen',
    findRoot: async () => {
      discoveryCalls += 1;
      return '/tmp/repo';
    },
  });
  assert.equal(target, '/tmp/chosen');
  assert.equal(discoveryCalls, 0);
});
