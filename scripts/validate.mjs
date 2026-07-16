import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { listFiles } from '../src/fs-safe.js';

const root = path.resolve(import.meta.dirname, '..');
const packageJson = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
const plugin = JSON.parse(await readFile(path.join(root, 'plugin', '.codex-plugin', 'plugin.json'), 'utf8'));
assert.equal(plugin.name, 'engineering');
assert.equal(plugin.version, packageJson.version);

const skillRoot = path.join(root, 'plugin', 'skills');
const skillFiles = (await listFiles(skillRoot)).filter((file) => file.endsWith('/SKILL.md'));
assert.equal(skillFiles.length, 15);
for (const relative of skillFiles) {
  const expectedName = relative.split(path.sep)[0];
  const content = await readFile(path.join(skillRoot, relative), 'utf8');
  assert.match(content, new RegExp(`^---\\nname: ${expectedName}\\ndescription: .+\\n---`, 's'));
  assert.doesNotMatch(content, /TODO|Superpowers|\.codex\/skills/);
}

console.log(`Validated engineering plugin ${plugin.version} with ${skillFiles.length} skills.`);
