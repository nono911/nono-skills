import { execFile } from 'node:child_process';
import { copyFile, mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';

import { filesEqual, listFiles } from './fs-safe.js';

const execFileAsync = promisify(execFile);

async function exists(file) {
  try {
    await stat(file);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}

export async function findGitRoot(cwd) {
  try {
    const { stdout } = await execFileAsync(
      'git',
      ['-C', cwd, 'rev-parse', '--show-toplevel'],
      { encoding: 'utf8' },
    );
    const root = stdout.trim();
    return root || null;
  } catch {
    return null;
  }
}

export async function resolveProjectTarget({
  cwd,
  target,
  findRoot = findGitRoot,
}) {
  if (target !== undefined) return path.resolve(cwd, target);
  const gitRoot = await findRoot(cwd);
  return gitRoot ? path.resolve(gitRoot) : path.resolve(cwd);
}

export async function planProjectInit({ templateRoot, targetRoot, force = false, dryRun = false, clock = () => new Date().toISOString().replaceAll(/[-:.]/g, '') }) {
  const files = await listFiles(templateRoot);
  const actions = [];
  const stamp = clock();
  for (const relative of files) {
    const source = path.join(templateRoot, relative);
    const destination = path.join(targetRoot, relative);
    let type = 'create';
    let backup;
    if (await exists(destination)) {
      if (await filesEqual(source, destination)) type = 'skip';
      else if (force) {
        type = 'replace';
        backup = path.join(targetRoot, '.codex-engineering-skills-backup', stamp, relative);
      } else type = 'conflict';
    }
    actions.push({ type, source, destination, relative, backup, dryRun });
  }
  return actions;
}

export async function applyProjectInit(actions) {
  const results = [];
  for (const action of actions) {
    if (action.dryRun || action.type === 'skip' || action.type === 'conflict') {
      results.push({ ...action, applied: false });
      continue;
    }
    await mkdir(path.dirname(action.destination), { recursive: true });
    if (action.type === 'replace') {
      await mkdir(path.dirname(action.backup), { recursive: true });
      await copyFile(action.destination, action.backup);
    }
    await copyFile(action.source, action.destination);
    results.push({ ...action, applied: true });
  }
  return results;
}
