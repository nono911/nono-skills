import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  createOwnershipManifest, readMarketplace, removeMarketplaceEntry,
  upsertMarketplaceEntry, verifyOwnership, writeJsonAtomic,
} from '../src/plugin-state.js';

const entry = {
  name: 'engineering',
  source: { source: 'local', path: './plugins/engineering' },
  policy: { installation: 'AVAILABLE', authentication: 'ON_INSTALL' },
  category: 'Developer Tools',
};

test('creates a personal marketplace and preserves unrelated metadata', () => {
  const initial = { name: 'personal', interface: { displayName: 'Mine', extra: true }, plugins: [{ name: 'other' }] };
  const result = upsertMarketplaceEntry(initial, entry);
  assert.equal(result.change, 'created');
  assert.deepEqual(result.marketplace.interface, initial.interface);
  assert.deepEqual(result.marketplace.plugins.map((plugin) => plugin.name), ['other', 'engineering']);
});

test('same marketplace entry is idempotent', () => {
  const result = upsertMarketplaceEntry({ name: 'personal', plugins: [entry] }, entry);
  assert.equal(result.change, 'unchanged');
});

test('refuses to replace a foreign engineering entry', () => {
  const foreign = { ...entry, source: { source: 'local', path: './plugins/somewhere-else' } };
  assert.throws(() => upsertMarketplaceEntry({ name: 'personal', plugins: [foreign] }, entry), /not owned/);
});

test('removes only engineering from the marketplace', () => {
  const other = { name: 'other' };
  const result = removeMarketplaceEntry({ name: 'personal', plugins: [other, entry] }, 'engineering');
  assert.equal(result.removed, true);
  assert.deepEqual(result.marketplace.plugins, [other]);
});

test('reads missing marketplace as null and writes JSON atomically', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'engineering-state-'));
  const file = path.join(root, 'nested', 'marketplace.json');
  assert.equal(await readMarketplace(file), null);
  await writeJsonAtomic(file, { name: 'personal', plugins: [entry] });
  assert.equal(JSON.parse(await readFile(file, 'utf8')).plugins[0].name, 'engineering');
  assert.deepEqual((await readdir(path.dirname(file))).sort(), ['marketplace.json']);
});

test('ownership verification reports changed and missing files', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'engineering-owner-'));
  await mkdir(path.join(root, 'skills'), { recursive: true });
  await writeFile(path.join(root, 'skills', 'plan.md'), 'plan');
  await writeFile(path.join(root, 'skills', 'review.md'), 'review');
  const manifest = await createOwnershipManifest({
    packageVersion: '0.1.0', pluginVersion: '0.1.0', marketplaceName: 'personal',
    root, files: ['skills/plan.md', 'skills/review.md'],
  });
  assert.equal((await verifyOwnership(manifest, root)).valid, true);
  await writeFile(path.join(root, 'skills', 'plan.md'), 'changed');
  await rm(path.join(root, 'skills', 'review.md'));
  const result = await verifyOwnership(manifest, root);
  assert.equal(result.valid, false);
  assert.deepEqual(result.mismatches, ['skills/plan.md', 'skills/review.md']);
});
