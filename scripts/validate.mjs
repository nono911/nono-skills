import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { listFiles } from '../src/fs-safe.js';
import {
  assertCanonicalSkillInventory,
  assertSkillDiscoveryContract,
  assertWorkspaceProtocolContract,
} from '../src/plugin-contract.js';
import {
  assertSkillWorkspaceContract,
  expectedDurableEndings,
} from '../src/skill-contract.js';
import { loadSkillEvalCorpus } from '../src/skill-eval.js';

const root = path.resolve(import.meta.dirname, '..');
const packageJson = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
const plugin = JSON.parse(await readFile(path.join(root, 'plugin', '.codex-plugin', 'plugin.json'), 'utf8'));
assert.equal(plugin.name, 'engineering');
assert.equal(plugin.version, packageJson.version);
await loadSkillEvalCorpus(path.join(root, 'evals', 'skill-behavior.json'));

const skillRoot = path.join(root, 'plugin', 'skills');
const skillFiles = (await listFiles(skillRoot)).filter((file) => file.endsWith('/SKILL.md'));
const skillNames = skillFiles.map((file) => file.split('/')[0]);
assertCanonicalSkillInventory(skillNames);
assert.deepEqual(
  skillNames.sort(),
  Object.keys(expectedDurableEndings).sort(),
);
const discoveryMetadata = [];
const workspaceProtocol = await readFile(path.join(root, 'plugin', 'references', 'workspaces.md'), 'utf8');
const loopController = await readFile(path.join(root, 'plugin', 'runtime', 'loop-controller.mjs'), 'utf8');
const evidenceContract = await readFile(path.join(root, 'plugin', 'runtime', 'evidence-contract.md'), 'utf8');
assertWorkspaceProtocolContract(workspaceProtocol);
for (const relative of skillFiles) {
  const expectedName = relative.split('/')[0];
  const content = await readFile(path.join(skillRoot, relative), 'utf8');
  const metadata = await readFile(path.join(skillRoot, expectedName, 'agents', 'openai.yaml'), 'utf8');
  const bundledWorkspaceProtocol = await readFile(
    path.join(skillRoot, expectedName, 'references', 'workspaces.md'),
    'utf8',
  );
  const shortDescription = metadata.match(/short_description: "([^"]+)"/)?.[1];
  const description = content.match(/^description:\s*"?(.+?)"?$/m)?.[1]?.trim();
  assert.match(content, new RegExp(`^---\\nname: ${expectedName}\\ndescription: .+\\n---`, 's'));
  assert.ok(description, `${expectedName} must define a description`);
  discoveryMetadata.push({ name: expectedName, description, relative });
  assert.equal(
    bundledWorkspaceProtocol,
    workspaceProtocol,
    `${expectedName} must bundle the canonical workspace protocol`,
  );
  assert.doesNotMatch(
    content,
    /TODO|Superpowers|\.codex\/skills|\bCodex\b|\$engineering:|\.\.\/\.\.\/references\/workspaces\.md|engineering_reviewer/,
  );
  assertSkillWorkspaceContract(expectedName, content);
  assert.ok(shortDescription && shortDescription.length >= 25 && shortDescription.length <= 64);
  assert.doesNotMatch(metadata, /Reusable engineering workflow|for this task\./);
  assert.match(metadata, new RegExp(`default_prompt: ".*\\$${expectedName.replaceAll('-', '\\-')}\\b`));
  if (expectedName === 'delivery-loop' || expectedName === 'bugfix-loop') {
    assert.match(
      metadata,
      /^policy:\n  allow_implicit_invocation: false$/m,
      `${expectedName} must require explicit invocation`,
    );
    assert.equal(
      await readFile(path.join(skillRoot, expectedName, 'scripts', 'loop-controller.mjs'), 'utf8'),
      loopController,
      `${expectedName} must bundle the canonical loop controller`,
    );
    assert.equal(
      await readFile(path.join(skillRoot, expectedName, 'references', 'evidence-contract.md'), 'utf8'),
      evidenceContract,
      `${expectedName} must bundle the canonical evidence contract`,
    );
  }
}
assertSkillDiscoveryContract(discoveryMetadata);

console.log(`Validated engineering plugin ${plugin.version} with ${skillFiles.length} skills.`);
