import { readFile, rm, stat } from 'node:fs/promises';
import path from 'node:path';

import { sha256File } from './fs-safe.js';
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

  const removal = await runCodex(['plugin', 'remove', 'engineering']);
  if (removal.code !== 0) throw new Error(removal.stderr || 'Codex plugin removal failed');
  const next = removeMarketplaceEntry(marketplace, 'engineering');
  await writeJsonAtomic(marketplacePath, next.marketplace);
  await rm(pluginRoot, { recursive: true });
  return { status: 'uninstalled', projectArtifactsPreserved: true };
}

export async function purgeProject({ targetRoot, recordedChecksums }) {
  const removed = [];
  const preserved = [];
  for (const [relative, expected] of Object.entries(recordedChecksums).sort(([a], [b]) => a.localeCompare(b))) {
    const file = path.join(targetRoot, relative);
    try {
      if (await sha256File(file) === expected) {
        await rm(file);
        removed.push(relative);
      } else preserved.push(relative);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
  return { removed, preserved };
}
