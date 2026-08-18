import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { diagnose } from '../src/doctor.js';
import { createOwnershipManifest, writeJsonAtomic } from '../src/plugin-state.js';
import { canonicalSkillNames } from '../src/plugin-contract.js';

async function installedFixture({ skills = canonicalSkillNames.length, packageVersion = '0.1.0' } = {}) {
  const home = await mkdtemp(path.join(os.tmpdir(), 'engineering-doctor-'));
  const pluginRoot = path.join(home, 'plugins', 'engineering');
  await mkdir(path.join(pluginRoot, '.codex-plugin'), { recursive: true });
  await writeFile(path.join(pluginRoot, '.codex-plugin', 'plugin.json'), JSON.stringify({ name: 'engineering', version: '0.1.0+codex.test' }));
  for (let index = 0; index < skills; index += 1) {
    await mkdir(path.join(pluginRoot, 'skills', `skill-${index}`), { recursive: true });
    await writeFile(path.join(pluginRoot, 'skills', `skill-${index}`, 'SKILL.md'), `---\nname: skill-${index}\ndescription: test\n---\n`);
  }
  const files = ['.codex-plugin/plugin.json', ...Array.from({ length: skills }, (_, index) => `skills/skill-${index}/SKILL.md`)];
  const manifest = await createOwnershipManifest({ packageVersion, pluginVersion: '0.1.0+codex.test', marketplaceName: 'personal', root: pluginRoot, files });
  await writeJsonAtomic(path.join(pluginRoot, '.installer-state.json'), manifest);
  return { home, pluginRoot };
}

const codexOk = async (args) => args[0] === '--version'
  ? { code: 0, stdout: 'codex-cli 0.145.0', stderr: '' }
  : { code: 0, stdout: 'engineering@personal installed, enabled', stderr: '' };

test('doctor passes a healthy 21-skill installation', async () => {
  const { home } = await installedFixture();
  const checks = await diagnose({ home, packageVersion: '0.1.0', runCodex: codexOk });
  assert.equal(checks.every((check) => check.status === 'pass'), true);
});

test('doctor reports missing installation and unavailable Codex', async () => {
  const home = await mkdtemp(path.join(os.tmpdir(), 'engineering-doctor-'));
  const checks = await diagnose({ home, packageVersion: '0.1.0', runCodex: async () => ({ code: 127, stdout: '', stderr: 'not found' }) });
  assert.equal(checks.find((check) => check.name === 'codex').status, 'fail');
  assert.equal(checks.find((check) => check.name === 'ownership').status, 'fail');
});

test('doctor reports version mismatch and drift', async () => {
  const { home, pluginRoot } = await installedFixture({ packageVersion: '0.0.9' });
  await writeFile(path.join(pluginRoot, 'skills', 'skill-0', 'SKILL.md'), 'changed');
  const checks = await diagnose({ home, packageVersion: '0.1.0', runCodex: codexOk });
  assert.equal(checks.find((check) => check.name === 'version').status, 'warn');
  assert.equal(checks.find((check) => check.name === 'ownership').status, 'fail');
});

test('doctor warns when Codex is older than the recommended runtime', async () => {
  const { home } = await installedFixture();
  const checks = await diagnose({
    home,
    packageVersion: '0.1.0',
    runCodex: async (args) => args[0] === '--version'
      ? { code: 0, stdout: 'codex-cli 0.144.6', stderr: '' }
      : { code: 0, stdout: 'engineering@personal installed, enabled', stderr: '' },
  });
  assert.equal(checks.find((check) => check.name === 'codex-version').status, 'warn');
});

test('doctor fails duplicate installed skill names', async () => {
  const { home, pluginRoot } = await installedFixture();
  await writeFile(
    path.join(pluginRoot, 'skills', 'skill-1', 'SKILL.md'),
    '---\nname: skill-0\ndescription: test\n---\n',
  );
  const statePath = path.join(pluginRoot, '.installer-state.json');
  const files = [
    '.codex-plugin/plugin.json',
    ...Array.from(
      { length: canonicalSkillNames.length },
      (_, index) => `skills/skill-${index}/SKILL.md`,
    ),
  ];
  const manifest = await createOwnershipManifest({
    packageVersion: '0.1.0',
    pluginVersion: '0.1.0+codex.test',
    marketplaceName: 'personal',
    root: pluginRoot,
    files,
  });
  await writeJsonAtomic(statePath, manifest);
  const checks = await diagnose({ home, packageVersion: '0.1.0', runCodex: codexOk });
  assert.equal(checks.find((check) => check.name === 'skill-metadata').status, 'fail');
});
