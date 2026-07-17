import { createHash } from 'node:crypto';
import { constants } from 'node:fs';
import { lstat, open, readFile, realpath, rm, stat } from 'node:fs/promises';
import path from 'node:path';

import { readMarketplace, removeMarketplaceEntry, verifyOwnership, writeJsonAtomic } from './plugin-state.js';

async function exists(file) {
  try { await stat(file); return true; }
  catch (error) { if (error.code === 'ENOENT') return false; throw error; }
}

export async function uninstallPlugin({ home, runCodex }) {
  const pluginRoot = path.join(home, 'plugins', 'engineering');
  const statePath = path.join(pluginRoot, '.installer-state.json');
  if (!await exists(statePath)) throw new Error('Engineering plugin is not owned by this installer');
  const state = JSON.parse(await readFile(statePath, 'utf8'));
  const ownership = await verifyOwnership(state, pluginRoot);
  if (!ownership.valid) throw new Error(`Engineering plugin ownership check failed: ${ownership.mismatches.join(', ')}`);

  const marketplacePath = path.join(home, '.agents', 'plugins', 'marketplace.json');
  const marketplace = await readMarketplace(marketplacePath);
  const entry = marketplace?.plugins?.find((plugin) => plugin.name === 'engineering');
  if (!entry || entry.source?.source !== 'local' || entry.source?.path !== './plugins/engineering') {
    throw new Error('Engineering marketplace entry is not owned by this installer');
  }

  const removal = await runCodex(['plugin', 'remove', `engineering@${state.marketplaceName}`]);
  if (removal.code !== 0) throw new Error(removal.stderr || 'Codex plugin removal failed');
  const next = removeMarketplaceEntry(marketplace, 'engineering');
  await writeJsonAtomic(marketplacePath, next.marketplace);
  await rm(pluginRoot, { recursive: true });
  return { status: 'uninstalled', projectArtifactsPreserved: true };
}

function recordedPathPolicy(relative) {
  const normalized = relative.replaceAll('\\', '/');
  if (path.posix.isAbsolute(normalized) || /^[A-Za-z]:\//.test(normalized)) {
    return { safe: false };
  }
  const canonical = path.posix.normalize(normalized);
  if (canonical === '..' || canonical.startsWith('../')) {
    return { safe: false };
  }
  return {
    safe: true,
    canonical,
    isWorkItem: canonical.toLowerCase().startsWith('docs/agent/work/'),
  };
}

function isStrictDescendant(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative !== ''
    && relative !== '..'
    && !relative.startsWith(`..${path.sep}`)
    && !path.isAbsolute(relative);
}

function sameFileSnapshot(left, right) {
  return left.dev === right.dev
    && left.ino === right.ino
    && left.mode === right.mode
    && left.size === right.size
    && left.mtimeNs === right.mtimeNs
    && left.ctimeNs === right.ctimeNs;
}

function isUnsafePathError(error) {
  return error.code === 'ELOOP' || error.code === 'ENOTDIR';
}

async function inspectDescendant(root, candidate) {
  if (!isStrictDescendant(root, candidate)) return { status: 'unsafe' };
  const relative = path.relative(root, candidate);
  let current = root;
  let snapshot;
  for (const component of relative.split(path.sep)) {
    current = path.join(current, component);
    try {
      snapshot = await lstat(current, { bigint: true });
    } catch (error) {
      if (error.code === 'ENOENT') return { status: 'missing' };
      if (isUnsafePathError(error)) return { status: 'unsafe' };
      throw error;
    }
    if (snapshot.isSymbolicLink()) return { status: 'unsafe' };
  }
  return { status: 'safe', snapshot };
}

async function validatePhysicalCandidate({ lexicalRoot, physicalRoot, candidate, expected }) {
  const lexical = await inspectDescendant(lexicalRoot, candidate);
  if (lexical.status !== 'safe') {
    return expected && lexical.status === 'missing' ? { status: 'unsafe' } : lexical;
  }

  let physical;
  try {
    physical = await realpath(candidate);
  } catch (error) {
    if (error.code === 'ENOENT' || isUnsafePathError(error)) return { status: 'unsafe' };
    throw error;
  }
  if (!isStrictDescendant(physicalRoot, physical)) return { status: 'unsafe' };

  const physicalInspection = await inspectDescendant(physicalRoot, physical);
  const lexicalConfirmation = await inspectDescendant(lexicalRoot, candidate);
  if (physicalInspection.status !== 'safe' || lexicalConfirmation.status !== 'safe') {
    return { status: 'unsafe' };
  }

  let physicalConfirmation;
  try {
    physicalConfirmation = await realpath(candidate);
  } catch (error) {
    if (error.code === 'ENOENT' || isUnsafePathError(error)) return { status: 'unsafe' };
    throw error;
  }
  if (physicalConfirmation !== physical
    || !sameFileSnapshot(lexical.snapshot, physicalInspection.snapshot)
    || !sameFileSnapshot(lexical.snapshot, lexicalConfirmation.snapshot)) {
    return { status: 'unsafe' };
  }
  if (expected && (expected.physical !== physical || !sameFileSnapshot(expected.snapshot, lexical.snapshot))) {
    return { status: 'unsafe' };
  }
  return { status: 'safe', physical, snapshot: lexical.snapshot };
}

async function hashValidatedFile(file, expectedSnapshot) {
  let handle;
  try {
    handle = await open(file, constants.O_RDONLY | constants.O_NOFOLLOW);
  } catch (error) {
    if (error.code === 'ENOENT' || isUnsafePathError(error)) return { status: 'unsafe' };
    throw error;
  }
  try {
    const before = await handle.stat({ bigint: true });
    if (!sameFileSnapshot(before, expectedSnapshot)) return { status: 'unsafe' };
    const content = await handle.readFile();
    const after = await handle.stat({ bigint: true });
    if (!sameFileSnapshot(before, after)) return { status: 'unsafe' };
    return { status: 'safe', digest: createHash('sha256').update(content).digest('hex') };
  } finally {
    await handle.close();
  }
}

export async function purgeProject({ targetRoot, recordedChecksums }) {
  const removed = [];
  const preserved = [];
  const lexicalRoot = path.resolve(targetRoot);
  let physicalRoot;
  try {
    physicalRoot = await realpath(lexicalRoot);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  for (const [relative, expected] of Object.entries(recordedChecksums).sort(([a], [b]) => a.localeCompare(b))) {
    const policy = recordedPathPolicy(relative);
    if (!policy.safe || policy.isWorkItem) {
      preserved.push(relative);
      continue;
    }
    if (!physicalRoot) continue;
    const file = path.resolve(lexicalRoot, ...policy.canonical.split('/'));
    try {
      const beforeHash = await validatePhysicalCandidate({ lexicalRoot, physicalRoot, candidate: file });
      if (beforeHash.status === 'missing') continue;
      if (beforeHash.status !== 'safe') {
        preserved.push(relative);
        continue;
      }
      const hash = await hashValidatedFile(beforeHash.physical, beforeHash.snapshot);
      if (hash.status !== 'safe' || hash.digest !== expected) {
        preserved.push(relative);
        continue;
      }
      const beforeRemoval = await validatePhysicalCandidate({
        lexicalRoot, physicalRoot, candidate: file, expected: beforeHash,
      });
      if (beforeRemoval.status !== 'safe') {
        preserved.push(relative);
        continue;
      }
      await rm(beforeRemoval.physical);
      removed.push(relative);
    } catch (error) {
      if (error.code === 'ENOENT') preserved.push(relative);
      else throw error;
    }
  }
  return { removed, preserved };
}
