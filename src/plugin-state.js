import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { listFiles, sha256File } from './fs-safe.js';

export async function readMarketplace(file) {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

export function upsertMarketplaceEntry(input, entry) {
  const marketplace = structuredClone(input ?? {
    name: 'personal', interface: { displayName: 'Personal' }, plugins: [],
  });
  marketplace.plugins ??= [];
  const index = marketplace.plugins.findIndex((plugin) => plugin.name === entry.name);
  if (index === -1) {
    marketplace.plugins.push(structuredClone(entry));
    return { marketplace, change: 'created' };
  }
  const existing = marketplace.plugins[index];
  if (existing.source?.source !== 'local' || existing.source?.path !== entry.source.path) {
    throw new Error(`Marketplace entry ${entry.name} is not owned by this installer`);
  }
  if (JSON.stringify(existing) === JSON.stringify(entry)) return { marketplace, change: 'unchanged' };
  marketplace.plugins[index] = structuredClone(entry);
  return { marketplace, change: 'updated' };
}

export function removeMarketplaceEntry(input, pluginName) {
  const marketplace = structuredClone(input);
  const before = marketplace.plugins?.length ?? 0;
  marketplace.plugins = (marketplace.plugins ?? []).filter((plugin) => plugin.name !== pluginName);
  return { marketplace, removed: marketplace.plugins.length !== before };
}

export async function writeJsonAtomic(file, value) {
  await mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.tmp-${process.pid}-${Date.now()}`;
  try {
    await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
    await rename(temporary, file);
  } catch (error) {
    await rm(temporary, { force: true });
    throw error;
  }
}

export async function createOwnershipManifest({ packageVersion, pluginVersion, marketplaceName, root, files }) {
  const checksums = {};
  for (const relative of [...files].sort()) checksums[relative] = await sha256File(path.join(root, relative));
  return {
    schemaVersion: 1,
    packageVersion,
    pluginVersion,
    marketplaceName,
    files: checksums,
  };
}

export async function verifyOwnership(manifest, root) {
  const mismatches = [];
  for (const [relative, expected] of Object.entries(manifest.files ?? {}).sort(([a], [b]) => a.localeCompare(b))) {
    try {
      if (await sha256File(path.join(root, relative)) !== expected) mismatches.push(relative);
    } catch (error) {
      if (error.code === 'ENOENT') mismatches.push(relative);
      else throw error;
    }
  }
  const expectedFiles = new Set(Object.keys(manifest.files ?? {}));
  const actualFiles = (await listFiles(root)).filter((relative) => relative !== '.installer-state.json');
  for (const relative of actualFiles) {
    if (!expectedFiles.has(relative)) mismatches.push(relative);
  }
  mismatches.sort();
  return { valid: mismatches.length === 0, mismatches };
}
