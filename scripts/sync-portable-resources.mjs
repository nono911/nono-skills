import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { canonicalSkillNames } from '../src/plugin-contract.js';

const root = path.resolve(import.meta.dirname, '..');
const skillsRoot = path.join(root, 'plugin', 'skills');
const canonicalWorkspacePath = path.join(root, 'plugin', 'references', 'workspaces.md');
const legacyWorkspaceInstruction = 'Read `../../references/workspaces.md` once per Codex task before selecting or creating workflow artifacts; reuse it unless repository scope or task authority changes. This skill owns only the task-specific behavior below.';
const portableWorkspaceInstruction = 'Read `references/workspaces.md` once per agent task before selecting or creating workflow artifacts; reuse it unless repository scope or task authority changes. This skill owns only the task-specific behavior below.';

const canonicalWorkspace = await readFile(canonicalWorkspacePath, 'utf8');
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

process.stdout.write(`Synchronized portable workspace resources for ${skillNames.length} skills.\n`);
