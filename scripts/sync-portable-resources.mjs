import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { canonicalSkillNames } from '../src/plugin-contract.js';

const root = path.resolve(import.meta.dirname, '..');
const skillsRoot = path.join(root, 'plugin', 'skills');
const canonicalWorkspacePath = path.join(root, 'plugin', 'references', 'workspaces.md');
const canonicalLoopControllerPath = path.join(root, 'plugin', 'runtime', 'loop-controller.mjs');
const canonicalEvidenceContractPath = path.join(root, 'plugin', 'runtime', 'evidence-contract.md');
const legacyWorkspaceInstruction = 'Read `../../references/workspaces.md` once per Codex task before selecting or creating workflow artifacts; reuse it unless repository scope or task authority changes. This skill owns only the task-specific behavior below.';
const portableWorkspaceInstruction = 'Read `references/workspaces.md` once per agent task before selecting or creating workflow artifacts; reuse it unless repository scope or task authority changes. This skill owns only the task-specific behavior below.';

const canonicalWorkspace = await readFile(canonicalWorkspacePath, 'utf8');
const canonicalLoopController = await readFile(canonicalLoopControllerPath, 'utf8');
const canonicalEvidenceContract = await readFile(canonicalEvidenceContractPath, 'utf8');
const skillNames = [...canonicalSkillNames].sort();

for (const skillName of skillNames) {
  const skillRoot = path.join(skillsRoot, skillName);
  const skillPath = path.join(skillRoot, 'SKILL.md');
  const referencePath = path.join(skillRoot, 'references', 'workspaces.md');
  let content = await readFile(skillPath, 'utf8');

  if (content.includes(legacyWorkspaceInstruction)) {
    content = content.replace(legacyWorkspaceInstruction, portableWorkspaceInstruction);
  }
  if (content.split(portableWorkspaceInstruction).length - 1 !== 1) {
    throw new Error(`${skillName} must include the portable workspace instruction exactly once`);
  }

  await writeFile(skillPath, content);
  await mkdir(path.dirname(referencePath), { recursive: true });
  await writeFile(referencePath, canonicalWorkspace);
}

for (const skillName of ['bugfix-loop', 'delivery-loop']) {
  const skillRoot = path.join(skillsRoot, skillName);
  const controllerPath = path.join(skillRoot, 'scripts', 'loop-controller.mjs');
  const evidencePath = path.join(skillRoot, 'references', 'evidence-contract.md');
  await mkdir(path.dirname(controllerPath), { recursive: true });
  await mkdir(path.dirname(evidencePath), { recursive: true });
  await writeFile(controllerPath, canonicalLoopController, { mode: 0o755 });
  await writeFile(evidencePath, canonicalEvidenceContract);
}

process.stdout.write(`Synchronized portable resources for ${skillNames.length} skills and 2 controlled loops.\n`);
