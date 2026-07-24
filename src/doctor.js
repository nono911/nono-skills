import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

import { listFiles } from './fs-safe.js';
import { canonicalSkillNames, initialSkillMetadataBudget } from './plugin-contract.js';
import { verifyOwnership } from './plugin-state.js';

export const recommendedCodexVersion = '0.145.0';

async function exists(file) {
  try { await stat(file); return true; }
  catch (error) { if (error.code === 'ENOENT') return false; throw error; }
}

function parseVersion(value) {
  const match = value.match(/\b(\d+)\.(\d+)\.(\d+)\b/);
  return match ? match.slice(1).map(Number) : null;
}

function compareVersions(left, right) {
  for (let index = 0; index < 3; index += 1) {
    if (left[index] !== right[index]) return left[index] - right[index];
  }
  return 0;
}

function inspectSkillMetadata(entries) {
  const parsed = entries.map(({ relative, content }) => ({
    relative,
    name: content.match(/^name:\s*(.+)$/m)?.[1]?.trim(),
    description: content.match(/^description:\s*"?(.+?)"?$/m)?.[1]?.trim(),
  }));
  const invalid = parsed.filter(({ name, description }) => !name || !description);
  if (invalid.length) {
    return {
      status: 'fail',
      detail: `invalid metadata: ${invalid.map(({ relative }) => relative).join(', ')}`,
    };
  }

  const duplicates = [...new Set(
    parsed
      .map(({ name }) => name)
      .filter((name, index, names) => names.indexOf(name) !== index),
  )];
  if (duplicates.length) {
    return { status: 'fail', detail: `duplicate names: ${duplicates.join(', ')}` };
  }

  const characters = parsed.reduce(
    (total, { relative, name, description }) => (
      total + relative.length + name.length + description.length
    ),
    0,
  );
  return {
    status: characters <= initialSkillMetadataBudget ? 'pass' : 'warn',
    detail: `${characters}/${initialSkillMetadataBudget} name, description, and relative path characters`,
  };
}

export async function diagnose({ home, packageVersion, runCodex }) {
  const checks = [];
  const codex = await runCodex(['--version']);
  checks.push({ name: 'codex', status: codex.code === 0 ? 'pass' : 'fail', detail: codex.stdout || codex.stderr || 'unavailable' });
  if (codex.code === 0) {
    const installed = parseVersion(codex.stdout);
    const recommended = parseVersion(recommendedCodexVersion);
    checks.push({
      name: 'codex-version',
      status: installed && recommended && compareVersions(installed, recommended) >= 0 ? 'pass' : 'warn',
      detail: installed
        ? `installed ${installed.join('.')}; recommended ${recommendedCodexVersion}+`
        : `could not parse; recommended ${recommendedCodexVersion}+`,
    });
  }

  const pluginRoot = path.join(home, 'plugins', 'engineering');
  const statePath = path.join(pluginRoot, '.installer-state.json');
  const sourceExists = await exists(pluginRoot);
  checks.push({ name: 'source', status: sourceExists ? 'pass' : 'fail', detail: sourceExists ? pluginRoot : 'plugin source missing' });

  if (!sourceExists || !await exists(statePath)) {
    checks.push({ name: 'ownership', status: 'fail', detail: 'installer ownership manifest missing' });
    checks.push({ name: 'version', status: 'fail', detail: 'version unavailable' });
    checks.push({ name: 'skills', status: 'fail', detail: 'skills unavailable' });
  } else {
    const state = JSON.parse(await readFile(statePath, 'utf8'));
    const ownership = await verifyOwnership(state, pluginRoot);
    checks.push({ name: 'ownership', status: ownership.valid ? 'pass' : 'fail', detail: ownership.valid ? 'checksums match' : `changed: ${ownership.mismatches.join(', ')}` });
    checks.push({ name: 'version', status: state.packageVersion === packageVersion ? 'pass' : 'warn', detail: `installed ${state.packageVersion}; package ${packageVersion}` });
    const files = await listFiles(path.join(pluginRoot, 'skills'));
    const skillFiles = files.filter((file) => file.endsWith('/SKILL.md') || file === 'SKILL.md');
    const count = skillFiles.length;
    checks.push({ name: 'skills', status: count === canonicalSkillNames.length ? 'pass' : 'fail', detail: `${count} skills found` });
    const metadata = await Promise.all(skillFiles.map(async (relative) => ({
      relative,
      content: await readFile(path.join(pluginRoot, 'skills', relative), 'utf8'),
    })));
    checks.push({ name: 'skill-metadata', ...inspectSkillMetadata(metadata) });
  }

  const registration = codex.code === 0 ? await runCodex(['plugin', 'list']) : codex;
  const registered = registration.code === 0 && registration.stdout.includes('engineering@');
  checks.push({ name: 'registration', status: registered ? 'pass' : 'fail', detail: registered ? 'installed and visible' : registration.stderr || 'not registered' });
  return checks;
}
