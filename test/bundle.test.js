import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { listFiles } from '../src/fs-safe.js';
import { assertSkillWorkspaceContract } from '../src/skill-contract.js';

const root = path.resolve(import.meta.dirname, '..');
const expectedSkills = [
  'api-design', 'architecture-review', 'brainstorm', 'database-design', 'debug',
  'estimate', 'fix-findings', 'implement', 'migration', 'plan', 'refactor',
  'release-readiness', 'review', 'security-review', 'test',
];
const workspaceSection = `## Workspace protocol

Read \`../../references/workspaces.md\` before selecting or creating workflow artifacts. Follow it for persistence, consent, work-item resolution, and lifecycle; this skill owns only the task-specific behavior below.`;
const apiDesignEnding = "When durable state is approved, append contract choices and compatibility consequences to the selected work item's decisions.md; otherwise include them in the final response.";
const planDurableOutput = '- For approved durable work, updated `spec.md` and `plan.md` in the selected work-item directory';

function runPackageValidation(fixtureRoot) {
  return spawnSync(process.execPath, ['scripts/validate.mjs'], {
    cwd: fixtureRoot,
    encoding: 'utf8',
  });
}

function assertSpawnCompleted(result) {
  assert.equal(result.error, undefined, 'validator process must start without a spawn error');
  assert.equal(result.signal, null, 'validator process must exit without a signal');
}

function assertValidationPasses(result) {
  assertSpawnCompleted(result);
  assert.equal(
    result.status,
    0,
    `validation unexpectedly failed\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
  );
}

async function validateMutatedSkill(name, mutate) {
  const fixtureRoot = await mkdtemp(path.join(tmpdir(), 'nono-skills-validate-'));
  try {
    await Promise.all(['package.json', 'plugin', 'scripts', 'src'].map((relative) => cp(
      path.join(root, relative),
      path.join(fixtureRoot, relative),
      { recursive: true },
    )));
    assertValidationPasses(runPackageValidation(fixtureRoot));

    const skillPath = path.join(fixtureRoot, 'plugin', 'skills', name, 'SKILL.md');
    const content = await readFile(skillPath, 'utf8');
    const mutated = mutate(content);
    assert.notEqual(mutated, content, `${name} test mutation must change the skill`);
    await writeFile(skillPath, mutated, 'utf8');
    return runPackageValidation(fixtureRoot);
  } finally {
    await rm(fixtureRoot, { recursive: true, force: true });
  }
}

function assertValidationFails(result, expectedDiagnostic) {
  assertSpawnCompleted(result);
  assert.equal(
    result.status,
    1,
    `validation unexpectedly passed\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
  );
  assert.match(result.stderr, expectedDiagnostic);
}

async function readApiDesignSkill() {
  return readFile(path.join(root, 'plugin', 'skills', 'api-design', 'SKILL.md'), 'utf8');
}

async function readPlanSkill() {
  return readFile(path.join(root, 'plugin', 'skills', 'plan', 'SKILL.md'), 'utf8');
}

function addDecisionLine(content, line) {
  return content.replace(apiDesignEnding, `${line}\n${apiDesignEnding}`);
}

test('plugin manifest matches the npm package', async () => {
  const packageJson = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
  const plugin = JSON.parse(await readFile(path.join(root, 'plugin', '.codex-plugin', 'plugin.json'), 'utf8'));
  assert.equal(plugin.name, 'engineering');
  assert.equal(plugin.version, packageJson.version);
  assert.equal(plugin.skills, './skills/');
  assert.equal(plugin.author.name.length > 0, true);
  assert.equal(plugin.interface.displayName, 'Engineering');
  assert.equal(packageJson.repository.url, 'git+https://github.com/nono911/nono-skills.git');
  assert.equal(packageJson.publishConfig.access, 'public');
  assert.equal(plugin.repository, 'https://github.com/nono911/nono-skills');
});

test('bundle contains exactly the validated 15-skill set', async () => {
  const files = await listFiles(path.join(root, 'plugin', 'skills'));
  const skillFiles = files.filter((file) => file.endsWith('/SKILL.md'));
  assert.deepEqual(skillFiles.map((file) => file.split(path.sep)[0]).sort(), expectedSkills);
  for (const relative of skillFiles) {
    const content = await readFile(path.join(root, 'plugin', 'skills', relative), 'utf8');
    const name = relative.split(path.sep)[0];
    assert.match(content, new RegExp(`^---\\nname: ${name}\\ndescription: .+\\n---`, 's'));
    assert.doesNotMatch(content, /TODO|Superpowers|\.codex\/skills/);
  }
});

test('adaptive workspace protocol defines persistence and consent boundaries', async () => {
  const protocol = await readFile(path.join(root, 'plugin', 'references', 'workspaces.md'), 'utf8');
  assert.match(protocol, /Classify the task as transient or durable/);
  assert.match(protocol, /Keep localized one-shot work transient/);
  assert.match(protocol, /Explicit requests for a spec, plan, progress log/);
  assert.match(protocol, /ask once before creating the workspace/);
  assert.match(protocol, /Recency alone is never sufficient/);
  assert.match(protocol, /Ask the user when multiple items remain plausible/);
  assert.match(protocol, /docs\/agent\/work\/<work-id>\/spec\.md/);
  assert.match(protocol, /If the user declines/);
  assert.match(protocol, /Reopening completed work changes its status to `active`/);
  assert.match(protocol, /never move, merge, or delete them automatically/);

  for (const name of ['plan', 'implement']) {
    const skill = await readFile(path.join(root, 'plugin', 'skills', name, 'SKILL.md'), 'utf8');
    assert.match(skill, /Read `\.\.\/\.\.\/references\/workspaces\.md`/);
  }
});

test('README documents adaptive consent-aware workspaces', async () => {
  const readme = await readFile(path.join(root, 'README.md'), 'utf8');
  assert.match(
    readme,
    /They do not impose mandatory design or implementation approval gates, worktrees, test-first development, or subagent orchestration\./,
  );
  assert.match(
    readme,
    /The only built-in gate is consent before Codex creates a durable workspace that the user did not explicitly request\./,
  );
  assert.doesNotMatch(readme, /They do not impose mandatory approval gates/);
  assert.match(readme, /Small tasks stay artifact-free/);
  assert.match(readme, /docs\/agent\/work\/<work-id>\//);
  assert.match(readme, /asks once before creating it/);
  assert.match(
    readme,
    /An explicit request for a spec, plan, log, findings tracker, handoff, or named existing work item already grants artifact consent for that scope/,
  );
  assert.match(
    readme,
    /Codex asks again only for an ambiguous work-item match, material scope expansion, or an action that needs new authority/,
  );
  assert.match(readme, /`init` is optional/);
  assert.match(readme, /Initialization no longer creates task artifacts/);
  assert.match(readme, /Existing 0\.1\.0 singleton files under `docs\/agent\/` are preserved/);
  assert.match(
    readme,
    /Purge never removes user-owned `docs\/agent\/work\/<work-id>\/` directories/,
  );

  const readmeSkills = [...new Set(
    [...readme.matchAll(/\$engineering:([a-z][a-z0-9-]*)/g)].map((match) => match[1]),
  )].sort();
  assert.deepEqual(readmeSkills, expectedSkills);

  const lines = readme.split('\n');
  for (const command of [
    'npx nono-skills doctor',
    'npx nono-skills update',
    'npx nono-skills uninstall',
  ]) {
    assert.ok(lines.includes(command), `README must document ${command}`);
  }

  const verifySkills = readme.indexOf('verify the `engineering:*` skills first');
  const disableReversibly = readme.indexOf('disable it reversibly');
  const uninstallSuperpowers = readme.indexOf('uninstall Superpowers from the plugin browser');
  assert.ok(verifySkills >= 0, 'README must verify engineering skills before removing Superpowers');
  assert.ok(disableReversibly > verifySkills, 'README must disable Superpowers reversibly after verification');
  assert.ok(uninstallSuperpowers > disableReversibly, 'README must uninstall Superpowers only after disabling it');
  assert.match(readme, /The CLI never disables or removes Superpowers automatically/);

  for (const stalePhrase of ['Project artifacts include', 'Without initialization']) {
    assert.equal(readme.includes(stalePhrase), false, `README must not contain ${stalePhrase}`);
  }
  for (const legacyPath of [
    'docs/agent/spec.md',
    'docs/agent/plan.md',
    'docs/agent/decisions.md',
    'docs/agent/decision-log.md',
    'docs/agent/findings.md',
    'docs/agent/handoff.md',
  ]) {
    assert.equal(readme.includes(legacyPath), false, `README must not recommend ${legacyPath}`);
  }
});

test('every skill has specific UI metadata and uses the workspace protocol', async () => {
  for (const name of expectedSkills) {
    const skillRoot = path.join(root, 'plugin', 'skills', name);
    const skill = await readFile(path.join(skillRoot, 'SKILL.md'), 'utf8');
    const metadata = await readFile(path.join(skillRoot, 'agents', 'openai.yaml'), 'utf8');
    const shortDescription = metadata.match(/short_description: "([^"]+)"/)?.[1];

    assert.ok(shortDescription, `${name} must define a short_description`);
    assert.ok(shortDescription.length >= 25 && shortDescription.length <= 64,
      `${name} short_description must be 25-64 characters`);
    assert.doesNotMatch(metadata, /Reusable engineering workflow|for this task\./);
    assert.match(metadata, new RegExp(`default_prompt: ".*\\$${name.replaceAll('-', '\\-')}\\b`));
    assertSkillWorkspaceContract(name, skill);
  }
});

test('package validation rejects a negated workspace instruction', async () => {
  const result = await validateMutatedSkill('api-design', (content) => content.replace(
    'Read `../../references/workspaces.md`',
    'Do not Read `../../references/workspaces.md`',
  ));
  assertValidationFails(result, /must use the exact Workspace protocol section/);
});

test('package validation rejects a misplaced workspace section', async () => {
  const result = await validateMutatedSkill('api-design', (content) => content
    .replace(`${workspaceSection}\n\n`, '')
    .replace('\n## Outputs\n', `\n${workspaceSection}\n\n## Outputs\n`));
  assertValidationFails(result, /must place the Workspace protocol section immediately after Purpose/);
});

test('package validation rejects a missing skill-specific durable-state ending', async () => {
  const result = await validateMutatedSkill('api-design', (content) => content.replace(
    `${apiDesignEnding}\n`,
    '',
  ));
  assertValidationFails(result, /must end Decision-log updates with its durable-state contract/);
});

test('package validation rejects the wrong skill-specific durable-state ending', async () => {
  const wrongEnding = "When durable state is approved, append boundary changes, compatibility assumptions, and accepted tradeoffs to the selected work item's decisions.md; otherwise include them in the final response.";
  const result = await validateMutatedSkill('api-design', (content) => content.replace(
    apiDesignEnding,
    wrongEnding,
  ));
  assertValidationFails(result, /must end Decision-log updates with its durable-state contract/);
});

test('package validation rejects a contextual bare legacy singleton filename', async () => {
  const result = await validateMutatedSkill('api-design', (content) => content.replace(
    apiDesignEnding,
    `Use an existing decision-log.md when durable state is approved.\n${apiDesignEnding}`,
  ));
  assertValidationFails(result, /must not reference legacy singleton workflow artifacts/);
});

test('contract normalizes rendered-equivalent ATX section headings', async () => {
  const content = (await readApiDesignSkill())
    .replace('## Purpose\n', '## Purpose ###  \n')
    .replace('## Workspace protocol\n', '## Workspace protocol ##  \n')
    .replace('## Decision-log updates\n', '## Decision-log updates ####  \n');
  assert.doesNotThrow(() => assertSkillWorkspaceContract('api-design', content));
});

test('contract parses normalized required headings with trailing HTML comments', async () => {
  const content = (await readApiDesignSkill())
    .replace('## Purpose\n', '## Purpose ### <!-- purpose -->\n')
    .replace('## Workspace protocol\n', '## Workspace protocol ## <!-- workspace -->\n')
    .replace('## Decision-log updates\n', '## Decision-log updates #### <!-- decisions -->\n');
  assert.doesNotThrow(() => assertSkillWorkspaceContract('api-design', content));
});

test('contract ignores headings and artifact references in fenced examples', async () => {
  const fencedExample = `\`\`\`markdown
## Workspace protocol ###
## Decision-log updates ##
Use the current spec.md and decision-log.md.
\`\`\`

`;
  const content = (await readApiDesignSkill()).replace(
    '## Workspace protocol\n',
    `${fencedExample}## Workspace protocol\n`,
  );
  assert.doesNotThrow(() => assertSkillWorkspaceContract('api-design', content));
});

test('contract rejects a duplicate normalized Purpose heading', async () => {
  const content = `${await readApiDesignSkill()}\n## Purpose ###  \n\nDuplicate purpose.\n`;
  assert.throws(
    () => assertSkillWorkspaceContract('api-design', content),
    /exactly one normalized Purpose section/,
  );
});

test('contract rejects a duplicate Purpose heading with a trailing HTML comment', async () => {
  const content = `${await readApiDesignSkill()}\n## Purpose <!-- duplicate -->\n\nDuplicate purpose.\n`;
  assert.throws(
    () => assertSkillWorkspaceContract('api-design', content),
    /exactly one normalized Purpose section/,
  );
});

test('contract rejects a duplicate normalized Workspace protocol heading', async () => {
  const content = (await readApiDesignSkill()).replace(
    '## Inputs\n',
    '## Workspace protocol ###  \n\nDuplicate protocol.\n\n## Inputs\n',
  );
  assert.throws(
    () => assertSkillWorkspaceContract('api-design', content),
    /exactly one normalized Workspace protocol section/,
  );
});

test('contract rejects a duplicate normalized Decision-log updates heading', async () => {
  const content = (await readApiDesignSkill()).replace(
    '## Escalate to the human\n',
    '## Decision-log updates ##  \n\nDuplicate decisions.\n\n## Escalate to the human\n',
  );
  assert.throws(
    () => assertSkillWorkspaceContract('api-design', content),
    /exactly one normalized Decision-log updates section/,
  );
});

test('contract accepts every current public allowlisted artifact line', async () => {
  for (const name of expectedSkills) {
    const content = await readFile(path.join(root, 'plugin', 'skills', name, 'SKILL.md'), 'utf8');
    assert.doesNotThrow(() => assertSkillWorkspaceContract(name, content));
  }
});

test('contract rejects a duplicate allowed durable ending outside its final section', async () => {
  const content = (await readApiDesignSkill()).replace(
    '## Inputs\n\n',
    `## Inputs\n\n${apiDesignEnding}\n\n`,
  );
  assert.throws(
    () => assertSkillWorkspaceContract('api-design', content),
    /must include each allowed authoritative workflow artifact line exactly once/,
  );
});

test('contract rejects a missing required plan output line', async () => {
  const content = (await readPlanSkill()).replace(`${planDurableOutput}\n`, '');
  assert.throws(
    () => assertSkillWorkspaceContract('plan', content),
    /must include each allowed authoritative workflow artifact line exactly once/,
  );
});

test('contract rejects a duplicate required plan output line', async () => {
  const content = (await readPlanSkill()).replace(
    planDurableOutput,
    `${planDurableOutput}\n${planDurableOutput}`,
  );
  assert.throws(
    () => assertSkillWorkspaceContract('plan', content),
    /must include each allowed authoritative workflow artifact line exactly once/,
  );
});

const scopedArtifactCases = [
  ['spec.md', "Use the selected work item's existing **spec.md**."],
  ['plan.md', "Use the selected work item's existing plan.md."],
  ['decisions.md', "Append to the selected work-item's `decisions.md`."],
  ['findings.md', 'Track **findings.md** in the selected work-item directory.'],
  ['handoff.md', 'Create the selected work item handoff.md.'],
];

for (const [filename, line] of scopedArtifactCases) {
  test(`contract rejects unallowlisted selected-work-item prose for ${filename}`, async () => {
    const content = addDecisionLine(await readApiDesignSkill(), line);
    assert.throws(
      () => assertSkillWorkspaceContract('api-design', content),
      /must use only allowed authoritative workflow artifact lines/,
    );
  });
}

const singletonArtifactCases = [
  ['spec.md', 'Use the current **spec.md**.'],
  ['plan.md', 'Use the existing shared plan.md.'],
  ['decisions.md', 'Append to existing shared decisions.md.'],
  ['findings.md', 'Track the existing shared **findings.md**.'],
  ['handoff.md', 'Create the current `handoff.md`.'],
];

for (const [filename, line] of singletonArtifactCases) {
  test(`contract rejects singleton scope for ${filename}`, async () => {
    const content = addDecisionLine(await readApiDesignSkill(), line);
    assert.throws(
      () => assertSkillWorkspaceContract('api-design', content),
      /must use only allowed authoritative workflow artifact lines/,
    );
  });
}

test('contract unconditionally rejects decision-log.md', async () => {
  const content = addDecisionLine(
    await readApiDesignSkill(),
    "Use the selected work item's **decision-log.md**.",
  );
  assert.throws(
    () => assertSkillWorkspaceContract('api-design', content),
    /must not reference legacy singleton workflow artifacts/,
  );
});

test('contract unconditionally rejects a legacy docs/agent singleton path', async () => {
  const content = addDecisionLine(
    await readApiDesignSkill(),
    "Use the selected work item's `docs/agent/findings.md`.",
  );
  assert.throws(
    () => assertSkillWorkspaceContract('api-design', content),
    /must not reference legacy singleton workflow artifacts/,
  );
});

test('contract rejects an emphasized legacy docs/agent singleton path', async () => {
  const content = addDecisionLine(
    await readApiDesignSkill(),
    "Use the selected work item's `docs/agent/`**findings.md**.",
  );
  assert.throws(
    () => assertSkillWorkspaceContract('api-design', content),
    /must not reference legacy singleton workflow artifacts/,
  );
});

test('contract rejects an inline-formatted decision-log filename', async () => {
  const content = addDecisionLine(
    await readApiDesignSkill(),
    "Use the selected work item's decision-**log.md**.",
  );
  assert.throws(
    () => assertSkillWorkspaceContract('api-design', content),
    /must not reference legacy singleton workflow artifacts/,
  );
});

test('contract rejects a link-formatted legacy docs/agent singleton path', async () => {
  const content = addDecisionLine(
    await readApiDesignSkill(),
    "Use the selected work item's docs/agent/[findings.md](https://example.test/findings).",
  );
  assert.throws(
    () => assertSkillWorkspaceContract('api-design', content),
    /must not reference legacy singleton workflow artifacts/,
  );
});

test('contract rejects a legacy singleton path in a Markdown link destination', async () => {
  const content = addDecisionLine(
    await readApiDesignSkill(),
    'Use [the legacy findings](docs/agent/findings.md).',
  );
  assert.throws(
    () => assertSkillWorkspaceContract('api-design', content),
    /must not reference legacy singleton workflow artifacts/,
  );
});

test('contract reports a later legacy path before an earlier allowlist violation', async () => {
  const content = addDecisionLine(
    await readApiDesignSkill(),
    `Use global spec.md.
Use docs/agent/findings.md.`,
  );
  assert.throws(
    () => assertSkillWorkspaceContract('api-design', content),
    /must not reference legacy singleton workflow artifacts/,
  );
});

test('contract rejects unallowlisted artifact prose with semicolon context', async () => {
  const content = addDecisionLine(
    await readApiDesignSkill(),
    'Do not use global spec.md; use the selected work item instead.',
  );
  assert.throws(
    () => assertSkillWorkspaceContract('api-design', content),
    /must use only allowed authoritative workflow artifact lines/,
  );
});

test('contract rejects unallowlisted artifact prose with later sentence context', async () => {
  const content = addDecisionLine(
    await readApiDesignSkill(),
    'Do not use global findings.md. Use the selected work item instead.',
  );
  assert.throws(
    () => assertSkillWorkspaceContract('api-design', content),
    /must use only allowed authoritative workflow artifact lines/,
  );
});

test('contract rejects unallowlisted artifact prose with comma-contrast context', async () => {
  const content = addDecisionLine(
    await readApiDesignSkill(),
    'Do not use global spec.md, but use the selected work item instead.',
  );
  assert.throws(
    () => assertSkillWorkspaceContract('api-design', content),
    /must use only allowed authoritative workflow artifact lines/,
  );
});

test('contract rejects an unpunctuated scoped/global contrast', async () => {
  const content = addDecisionLine(
    await readApiDesignSkill(),
    'Do not use global spec.md but use the selected work item instead',
  );
  assert.throws(
    () => assertSkillWorkspaceContract('api-design', content),
    /must use only allowed authoritative workflow artifact lines/,
  );
});

test('contract rejects mixed scoped and global artifacts on one line', async () => {
  const content = addDecisionLine(
    await readApiDesignSkill(),
    "Use the selected work item's spec.md and global findings.md.",
  );
  assert.throws(
    () => assertSkillWorkspaceContract('api-design', content),
    /must use only allowed authoritative workflow artifact lines/,
  );
});

test('contract rejects same-clause selected-work-item artifact prose outside the allowlist', async () => {
  const content = addDecisionLine(
    await readApiDesignSkill(),
    'Use spec.md from the selected work item; report failures in chat.',
  );
  assert.throws(
    () => assertSkillWorkspaceContract('api-design', content),
    /must use only allowed authoritative workflow artifact lines/,
  );
});

test('contract rejects an unapproved wrapped selected-work-item artifact list', async () => {
  const content = addDecisionLine(
    await readApiDesignSkill(),
    `Use the selected work item:
- spec.md
- \`plan.md\``,
  );
  assert.throws(
    () => assertSkillWorkspaceContract('api-design', content),
    /must use only allowed authoritative workflow artifact lines/,
  );
});

test('contract rejects a negated wrapped artifact list outside the allowlist', async () => {
  const content = addDecisionLine(
    await readApiDesignSkill(),
    `Do not use the selected work item:
- spec.md`,
  );
  assert.throws(
    () => assertSkillWorkspaceContract('api-design', content),
    /must use only allowed authoritative workflow artifact lines/,
  );
});

test('contract rejects an artifact list separated by an ignored region', async () => {
  const content = addDecisionLine(
    await readApiDesignSkill(),
    `Use the selected work item:
<!--
ignored separator
-->
- spec.md
`,
  );
  assert.throws(
    () => assertSkillWorkspaceContract('api-design', content),
    /must use only allowed authoritative workflow artifact lines/,
  );
});

test('contract rejects a durable ending hidden in an unclosed fence', async () => {
  const original = await readApiDesignSkill();
  const content = `${original.slice(0, original.indexOf(apiDesignEnding))}\`\`\`markdown
${apiDesignEnding}
`;
  assert.throws(
    () => assertSkillWorkspaceContract('api-design', content),
    /must end Decision-log updates with its durable-state contract/,
  );
});

test('contract accepts the exact durable ending followed by an inline HTML comment', async () => {
  const content = (await readApiDesignSkill()).replace(
    apiDesignEnding,
    `${apiDesignEnding} <!-- ignored -->`,
  );
  assert.doesNotThrow(() => assertSkillWorkspaceContract('api-design', content));
});

test('contract ignores indented code as non-authoritative', async () => {
  const indentedExample = `    ## Workspace protocol
    Use global spec.md and decision-log.md.

`;
  const content = (await readApiDesignSkill()).replace(
    '## Workspace protocol\n',
    `${indentedExample}## Workspace protocol\n`,
  );
  assert.doesNotThrow(() => assertSkillWorkspaceContract('api-design', content));
});

test('indented code does not hide following authoritative prose', async () => {
  const content = addDecisionLine(
    await readApiDesignSkill(),
    `    Use the selected work item's spec.md.
Use global findings.md.`,
  );
  assert.throws(
    () => assertSkillWorkspaceContract('api-design', content),
    /must use only allowed authoritative workflow artifact lines/,
  );
});

test('contract ignores multiline HTML comments as non-authoritative', async () => {
  const commentedExample = `<!--
## Workspace protocol
Use global spec.md and decision-log.md.
-->

`;
  const content = (await readApiDesignSkill()).replace(
    '## Workspace protocol\n',
    `${commentedExample}## Workspace protocol\n`,
  );
  assert.doesNotThrow(() => assertSkillWorkspaceContract('api-design', content));
});

test('a closed HTML comment does not hide following authoritative prose', async () => {
  const content = addDecisionLine(
    await readApiDesignSkill(),
    `<!--
Use the selected work item's spec.md.
-->
Use global handoff.md.`,
  );
  assert.throws(
    () => assertSkillWorkspaceContract('api-design', content),
    /must use only allowed authoritative workflow artifact lines/,
  );
});

test('plan uses selected work-item artifacts and repository guidance stays concise', async () => {
  const plan = await readFile(path.join(root, 'plugin', 'skills', 'plan', 'SKILL.md'), 'utf8');
  const agents = await readFile(path.join(root, 'templates', 'AGENTS.md'), 'utf8');

  assert.match(plan, /selected work item's spec, plan, and decisions/);
  assert.match(agents, /docs\/agent\/work\/<work-id>\//);
  assert.match(agents, /ask before creating a new durable workspace/);
  assert.match(agents, /\$engineering:<skill>/);
  assert.ok(agents.length < 3_500, 'AGENTS.md should remain concise');
});

test('project initialization bundles repository guidance only', async () => {
  assert.deepEqual(await listFiles(path.join(root, 'templates')), ['AGENTS.md']);
});
