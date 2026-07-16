import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { listFiles } from '../src/fs-safe.js';

test('listFiles ignores macOS metadata at every depth', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'nono-skills-files-'));
  try {
    await mkdir(path.join(root, 'nested'));
    await writeFile(path.join(root, '.DS_Store'), 'metadata');
    await writeFile(path.join(root, 'nested', '.DS_Store'), 'metadata');
    await writeFile(path.join(root, 'nested', 'kept.md'), 'kept');

    assert.deepEqual(await listFiles(root), ['nested/kept.md']);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
