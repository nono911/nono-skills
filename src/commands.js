import { readFile, rm, stat } from 'node:fs/promises';
import path from 'node:path';

import { runCodex as defaultRunCodex } from './codex.js';
import { diagnose } from './doctor.js';
import { listFiles, sha256File } from './fs-safe.js';
import { installPlugin, updatePlugin } from './plugin-install.js';
import { writeJsonAtomic } from './plugin-state.js';
import { applyProjectInit, planProjectInit } from './project-init.js';
import { purgeProject, uninstallPlugin } from './uninstall.js';

async function exists(file) {
  try { await stat(file); return true; }
  catch (error) { if (error.code === 'ENOENT') return false; throw error; }
}

function timestamp() {
  return new Date().toISOString().replaceAll(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

export function createHandlers(base) {
  const stdout = base.stdout ?? process.stdout;
  const stderr = base.stderr ?? process.stderr;
  const runCodex = base.runCodex ?? defaultRunCodex;
  const removePlugin = base.uninstallPlugin ?? uninstallPlugin;
  const pluginContext = () => ({
    home: base.home,
    packageRoot: base.packageRoot,
    packageVersion: base.packageVersion,
    runCodex,
    clock: base.clock ?? timestamp,
  });

  return {
    async install() {
      const result = await installPlugin(pluginContext());
      stdout.write(`Engineering plugin ${result.status} (${result.pluginVersion}). Start a new Codex task to activate it.\n`);
      return 0;
    },

    async update() {
      const result = await updatePlugin(pluginContext());
      stdout.write(`Engineering plugin ${result.status} (${result.pluginVersion}). Start a new Codex task to activate it.\n`);
      return 0;
    },

    async init(options) {
      const targetRoot = path.resolve(base.cwd, options.target ?? '.');
      const templateRoot = path.join(base.packageRoot, 'templates');
      const actions = await planProjectInit({
        templateRoot, targetRoot, force: options.force, dryRun: options.dryRun, clock: base.clock ?? timestamp,
      });
      const conflicts = actions.filter((action) => action.type === 'conflict');
      if (conflicts.length) {
        stderr.write(`Conflicts detected; no files written:\n${conflicts.map((action) => `- ${action.relative}`).join('\n')}\nUse --force to back up and replace them.\n`);
        return 1;
      }
      const results = await applyProjectInit(actions);
      if (!options.dryRun) {
        const files = await listFiles(templateRoot);
        const checksums = {};
        for (const relative of files) checksums[relative] = await sha256File(path.join(targetRoot, relative));
        await writeJsonAtomic(path.join(targetRoot, '.codex-engineering-skills.json'), {
          schemaVersion: 1, packageVersion: base.packageVersion, files: checksums,
        });
      }
      const count = (type) => results.filter((result) => result.type === type).length;
      stdout.write(`${options.dryRun ? 'Would create' : 'Created'} ${count('create')}, replaced ${count('replace')}, skipped ${count('skip')}.\n`);
      return 0;
    },

    async doctor() {
      const checks = await diagnose({ home: base.home, packageVersion: base.packageVersion, runCodex });
      for (const check of checks) stdout.write(`${check.status.toUpperCase()} ${check.name}: ${check.detail}\n`);
      return checks.some((check) => check.status === 'fail') ? 1 : 0;
    },

    async uninstall(options) {
      let purgeState;
      let purgeTarget;
      if (options.purgeProject) {
        purgeTarget = path.resolve(base.cwd, options.purgeProject);
        const statePath = path.join(purgeTarget, '.codex-engineering-skills.json');
        if (!await exists(statePath)) throw new Error(`Project ownership state not found: ${statePath}`);
        purgeState = JSON.parse(await readFile(statePath, 'utf8'));
      }
      await removePlugin({ home: base.home, runCodex });
      stdout.write('Engineering plugin uninstalled. Project artifacts were preserved.\n');
      if (purgeState) {
        const statePath = path.join(purgeTarget, '.codex-engineering-skills.json');
        const result = await purgeProject({ targetRoot: purgeTarget, recordedChecksums: purgeState.files });
        if (result.preserved.length === 0) await rm(statePath);
        stdout.write(`Purged ${result.removed.length}; preserved ${result.preserved.length} modified files.\n`);
      }
      return 0;
    },
  };
}
