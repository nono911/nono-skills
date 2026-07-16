import { cp, mkdir, readFile, rename, rm, stat } from 'node:fs/promises';
import path from 'node:path';

import { listFiles } from './fs-safe.js';
import {
  createOwnershipManifest, readMarketplace, upsertMarketplaceEntry,
  verifyOwnership, writeJsonAtomic,
} from './plugin-state.js';

const PLUGIN_NAME = 'engineering';
const MARKETPLACE_ENTRY = {
  name: PLUGIN_NAME,
  source: { source: 'local', path: './plugins/engineering' },
  policy: { installation: 'AVAILABLE', authentication: 'ON_INSTALL' },
  category: 'Developer Tools',
};

async function exists(file) {
  try { await stat(file); return true; }
  catch (error) { if (error.code === 'ENOENT') return false; throw error; }
}

async function readJson(file) {
  return JSON.parse(await readFile(file, 'utf8'));
}

function withCachebuster(version, cachebuster) {
  return `${version.split('+')[0]}+codex.${cachebuster}`;
}

async function transact(context, requireExisting) {
  const { home, packageRoot, runCodex, packageVersion } = context;
  const cachebuster = context.clock();
  const preflight = await runCodex(['--version']);
  if (preflight.code !== 0) throw new Error(`Codex CLI is unavailable: ${preflight.stderr || 'version check failed'}`);

  const pluginsRoot = path.join(home, 'plugins');
  const destination = path.join(pluginsRoot, PLUGIN_NAME);
  const statePath = path.join(destination, '.installer-state.json');
  const marketplacePath = path.join(home, '.agents', 'plugins', 'marketplace.json');
  const oldMarketplace = await readMarketplace(marketplacePath);
  const destinationExists = await exists(destination);
  if (requireExisting && !destinationExists) throw new Error('Engineering plugin is not installed');

  let oldState;
  if (destinationExists) {
    if (!await exists(statePath)) throw new Error('Existing engineering plugin is not owned by this installer');
    oldState = await readJson(statePath);
    const ownership = await verifyOwnership(oldState, destination);
    if (!ownership.valid) throw new Error(`Existing engineering plugin is not owned safely; changed files: ${ownership.mismatches.join(', ')}`);
  }

  await mkdir(pluginsRoot, { recursive: true });
  const stage = path.join(pluginsRoot, `.engineering-stage-${process.pid}-${Date.now()}`);
  const backup = path.join(pluginsRoot, `.engineering-backup-${process.pid}-${Date.now()}`);
  let movedExisting = false;
  let installedStage = false;
  try {
    await cp(path.join(packageRoot, 'plugin'), stage, { recursive: true, errorOnExist: true });
    const pluginJsonPath = path.join(stage, '.codex-plugin', 'plugin.json');
    const plugin = await readJson(pluginJsonPath);
    plugin.version = withCachebuster(plugin.version, cachebuster);
    await writeJsonAtomic(pluginJsonPath, plugin);
    const files = await listFiles(stage);
    const manifest = await createOwnershipManifest({
      packageVersion,
      pluginVersion: plugin.version,
      marketplaceName: oldMarketplace?.name ?? 'personal',
      root: stage,
      files,
    });
    await writeJsonAtomic(path.join(stage, '.installer-state.json'), manifest);

    if (oldState && JSON.stringify(oldState.files) === JSON.stringify(manifest.files) && oldState.packageVersion === manifest.packageVersion) {
      await rm(stage, { recursive: true, force: true });
      return { status: 'unchanged', pluginVersion: plugin.version };
    }

    if (destinationExists) {
      await rename(destination, backup);
      movedExisting = true;
    }
    await rename(stage, destination);
    installedStage = true;

    const marketplaceResult = upsertMarketplaceEntry(oldMarketplace, MARKETPLACE_ENTRY);
    await writeJsonAtomic(marketplacePath, marketplaceResult.marketplace);
    const marketplaceName = marketplaceResult.marketplace.name;
    const registration = await runCodex(['plugin', 'add', `${PLUGIN_NAME}@${marketplaceName}`]);
    if (registration.code !== 0) throw new Error(registration.stderr || 'Codex plugin registration failed');
    const verification = await runCodex(['plugin', 'list']);
    if (verification.code !== 0 || !verification.stdout.includes(`${PLUGIN_NAME}@`)) {
      throw new Error(verification.stderr || 'Codex plugin verification failed');
    }
    await rm(backup, { recursive: true, force: true });
    return { status: destinationExists ? 'updated' : 'installed', pluginVersion: plugin.version };
  } catch (error) {
    await rm(stage, { recursive: true, force: true });
    if (installedStage) await rm(destination, { recursive: true, force: true });
    if (movedExisting && await exists(backup)) await rename(backup, destination);
    if (oldMarketplace === null) await rm(marketplacePath, { force: true });
    else await writeJsonAtomic(marketplacePath, oldMarketplace);
    throw error;
  }
}

export function installPlugin(context) {
  return transact(context, false);
}

export function updatePlugin(context) {
  return transact(context, true);
}
