import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { listFiles } from '../src/fs-safe.js';
import {
  assertWorkspaceProtocolContract,
  assertSkillDiscoveryContract,
  canonicalSkillNames,
  workspaceProtocolClauses,
} from '../src/plugin-contract.js';
import {
  assertSkillWorkspaceContract,
  expectedDurableEndings,
  expectedRequiredResponsibilityLines,
  expectedSkillWordBudgets,
} from '../src/skill-contract.js';

const root = path.resolve(import.meta.dirname, '..');
const packageVersion = JSON.parse(
  await readFile(path.join(root, 'package.json'), 'utf8'),
).version;
const expectedSkills = canonicalSkillNames;
const expectedDiscoveryKeywords = [
  'codex',
  'agent-skills',
  'ai-coding-agent',
  'software-engineering',
  'developer-tools',
  'code-review',
  'bug-fix',
  'qa-testing',
  'security-review',
  'engineering-loop',
  'review-fix-loop',
  'agent-evaluation',
  'multi-agent',
  'agent-orchestration',
];
const representativeProtocolClauseIds = [
  'classification.transient-durable',
  'classification.transient-default',
  'repository.primary-folder',
  'consent.explicit',
  'consent.proposed',
  'consent.decline',
  'resolution.precedence',
  'resolution.recency-ambiguity',
  'workspace.anchor',
  'workspace.creation-updated',
  'lifecycle.blocked',
  'lifecycle.completed',
  'lifecycle.superseded',
  'lifecycle.reopen',
  'artifacts.lazy',
  'artifacts.no-global-index',
  'scope.authority',
  'legacy.preservation',
];
const workspaceSection = `## Workspace protocol

Read \`references/workspaces.md\` once per agent task before selecting or creating workflow artifacts; reuse it unless repository scope or task authority changes. This skill owns only the task-specific behavior below.`;
const apiDesignEnding = "When durable state is approved, append contract choices and compatibility consequences to the selected work item's decisions.md; otherwise include them in the final response.";
const planDurableOutput = '- For approved durable work, updated `spec.md` and `plan.md` in the selected work-item directory';
const scopedPlanMaintenanceEndings = Object.freeze({
  debug: "When durable state is approved, append the validated root cause, rejected material hypotheses, and consequential fix choices to the selected work item's decisions.md and create handoff.md only when work remains; for a selected approved durable work item with an existing plan.md, update only relevant plan-item status and verification evidence for the performed debugging scope, never invent unrelated work, and do not mark the work completed unless the workspace lifecycle criteria are satisfied; otherwise include material decisions and performed-scope verification in the final response.",
  refactor: "When durable state is approved, append boundary changes, compatibility assumptions, and accepted tradeoffs to the selected work item's decisions.md; for a selected approved durable work item with an existing plan.md, update only relevant plan-item status and verification evidence for the performed refactoring scope, never invent unrelated work, and do not mark the work completed unless the workspace lifecycle criteria are satisfied; otherwise include material decisions and performed-scope verification in the final response.",
  test: "When durable state is approved, append material test-boundary, fidelity, or coverage-risk decisions to the selected work item's decisions.md; for a selected approved durable work item with an existing plan.md, update only relevant plan-item status and verification evidence for the performed testing scope, never invent unrelated work, and do not mark the work completed unless the workspace lifecycle criteria are satisfied; otherwise include material decisions and performed-scope verification in the final response.",
});
const releaseReadResponsibility = '- For a selected work item, read its acceptance criteria, current plan state, findings, and verification evidence when available before judging readiness; reading this state neither authorizes release nor by itself requires artifact mutation.';

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
  assert.equal(
    result.stdout,
    `Validated engineering plugin ${packageVersion} with 21 skills.\n`,
  );
  assert.equal(result.stderr, '');
}

async function validateMutatedSkill(name, mutate) {
  return validateMutatedFixture(async (fixtureRoot) => {
    const skillPath = path.join(fixtureRoot, 'plugin', 'skills', name, 'SKILL.md');
    const content = await readFile(skillPath, 'utf8');
    const mutated = mutate(content);
    assert.notEqual(mutated, content, `${name} test mutation must change the skill`);
    await writeFile(skillPath, mutated, 'utf8');
  });
}

async function withValidationFixture(run) {
  const fixtureRoot = await mkdtemp(path.join(tmpdir(), 'nono-skills-validate-'));
  try {
    await Promise.all(['package.json', 'plugin', 'scripts', 'src', 'evals'].map((relative) => cp(
      path.join(root, relative),
      path.join(fixtureRoot, relative),
      { recursive: true },
    )));
    return await run(fixtureRoot);
  } finally {
    await rm(fixtureRoot, { recursive: true, force: true });
  }
}

async function validateUnmodifiedFixture() {
  return withValidationFixture((fixtureRoot) => runPackageValidation(fixtureRoot));
}

async function validateMutatedFixture(mutate) {
  return withValidationFixture(async (fixtureRoot) => {
    assertValidationPasses(runPackageValidation(fixtureRoot));
    await mutate(fixtureRoot);
    return runPackageValidation(fixtureRoot);
  });
}

function assertValidationFails(result, expectedDiagnostic) {
  assertSpawnCompleted(result);
  assert.equal(
    result.status,
    1,
    `validation unexpectedly passed\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
  );
  assert.equal(result.stdout, '');
  if (typeof expectedDiagnostic === 'string') {
    const actualDiagnostic = result.stderr.match(
      /AssertionError \[ERR_ASSERTION\]: ([^\r\n]+)/,
    )?.[1];
    assert.equal(actualDiagnostic, expectedDiagnostic);
  } else {
    assert.match(result.stderr, expectedDiagnostic);
  }
}

async function validateMutatedProtocol(clause) {
  return validateMutatedFixture(async (fixtureRoot) => {
    const protocolPath = path.join(fixtureRoot, 'plugin', 'references', 'workspaces.md');
    const content = await readFile(protocolPath, 'utf8');
    const mutated = content.replace(`${clause.text}\n`, '');
    assert.notEqual(mutated, content, `${clause.id} test mutation must change the protocol`);
    await writeFile(protocolPath, mutated, 'utf8');
  });
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
  assert.match(packageJson.version, /^\d+\.\d+\.\d+$/);
  assert.equal(packageJson.version, packageVersion);
  assert.equal(plugin.version, packageJson.version);
  assert.equal(plugin.skills, './skills/');
  assert.equal(plugin.author.name.length > 0, true);
  assert.equal(plugin.interface.displayName, 'Engineering');
  assert.ok(
    plugin.interface.defaultPrompt.includes(
      'Use $engineering:handoff to prepare a continuation handoff for the next agent.',
    ),
    'explicit-only handoff starter must name the native Codex skill',
  );
  assert.equal(
    plugin.interface.defaultPrompt.includes('Prepare a continuation handoff for the next agent.'),
    false,
    'plugin manifest must not advertise a bare prompt for an explicit-only skill',
  );
  assert.equal(packageJson.repository.url, 'git+https://github.com/nono911/nono-skills.git');
  assert.equal(packageJson.publishConfig.access, 'public');
  assert.equal(plugin.repository, 'https://github.com/nono911/nono-skills');
});

test('package discovery metadata describes the engineering-loop product', async () => {
  const packageJson = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
  const plugin = JSON.parse(await readFile(path.join(root, 'plugin', '.codex-plugin', 'plugin.json'), 'utf8'));
  const readme = await readFile(path.join(root, 'README.md'), 'utf8');
  assert.equal(packageJson.description, 'Reusable engineering skills and bounded review-fix loops for Codex and other Agent Skills hosts.');
  assert.deepEqual(packageJson.keywords, expectedDiscoveryKeywords);
  assert.deepEqual(plugin.keywords, expectedDiscoveryKeywords);
  assert.match(readme, /^# Nono Skills\n/);
  assert.match(readme, /A reusable software-engineering skill pack for Codex and other Agent Skills hosts/);
  assert.doesNotMatch(packageJson.keywords.join(' '), /claude|qwen|opencode|codewhale|antigravity|cursor|copilot|superpowers/);
});

test('bundle contains exactly the validated 21-skill set', async () => {
  const files = await listFiles(path.join(root, 'plugin', 'skills'));
  const skillFiles = files.filter((file) => file.endsWith('/SKILL.md'));
  const discoveryMetadata = [];
  assert.deepEqual(skillFiles.map((file) => file.split('/')[0]).sort(), expectedSkills);
  for (const relative of skillFiles) {
    const content = await readFile(path.join(root, 'plugin', 'skills', relative), 'utf8');
    const name = relative.split('/')[0];
    const description = content.match(/^description:\s*"?(.+?)"?$/m)?.[1]?.trim();
    assert.match(content, new RegExp(`^---\\nname: ${name}\\ndescription: .+\\n---`, 's'));
    assert.ok(description, `${name} must define a description`);
    discoveryMetadata.push({ name, description, relative });
    assert.doesNotMatch(content, /TODO|Superpowers|\.codex\/skills/);
    assert.doesNotThrow(
      () => assertSkillWorkspaceContract(name, content.replaceAll('\n', '\r\n')),
      `${name} contract should accept CRLF input`,
    );
  }
  assert.doesNotThrow(() => assertSkillDiscoveryContract(discoveryMetadata));
});

test('shared workspace protocol contract accepts the released protocol', async () => {
  const protocol = await readFile(path.join(root, 'plugin', 'references', 'workspaces.md'), 'utf8');
  assert.doesNotThrow(() => assertWorkspaceProtocolContract(protocol));

  for (const id of representativeProtocolClauseIds) {
    const clause = workspaceProtocolClauses.find((candidate) => candidate.id === id);
    assert.ok(clause, `workspace protocol contract must expose ${id}`);
    const mutated = protocol.replace(`${clause.text}\n`, '');
    assert.notEqual(mutated, protocol, `${id} deletion mutation must change the protocol`);
    assert.throws(
      () => assertWorkspaceProtocolContract(mutated),
      new RegExp(`workspace protocol must include ${id.replaceAll('.', '\\.')} exactly once`),
    );
  }
});

for (const id of representativeProtocolClauseIds) {
  test(`package validation rejects removal of workspace protocol clause ${id}`, async () => {
    const clause = workspaceProtocolClauses.find((candidate) => candidate.id === id);
    assert.ok(clause, `workspace protocol contract must expose ${id}`);
    const result = await validateMutatedProtocol(clause);
    assertValidationFails(result, `workspace protocol must include ${id} exactly once`);
  });
}

test('README is a concise and honest product introduction', async () => {
  const readme = await readFile(path.join(root, 'README.md'), 'utf8');
  assert.ok(readme.split('\n').length <= 200, 'README should stay under 200 lines');
  assert.match(readme, /experimental \(`0\.x`\)/);
  assert.match(readme, /## Quick start/);
  assert.match(readme, /## Requirements/);
  assert.match(readme, /## Why Nono Skills/);
  assert.match(readme, /## Host support/);
  assert.match(readme, /no Nono Skills behavioral scorecard published yet/);
  assert.match(readme, /Pin exact versions in repeatable setups/);
  assert.match(readme, /paired black-box scenarios/);
  assert.match(readme, /npx skills@latest add nono911\/nono-skills/);
  assert.match(readme, /Validated 105 behavioral cases across 21 skills and 5 categories/);
  assert.match(readme, /CONTRIBUTING\.md/);
  assert.match(readme, /The controller cannot force a model to activate a skill or call the controller/);
  assert.match(readme, /They are not tamper-proof and are not a security boundary/);
  assert.match(readme, /Review is sequential, not five reviews launched at once/);
  assert.match(readme, /runs supersede <legacy-run-id> --confirm/);
  for (const name of expectedSkills) {
    assert.match(readme, new RegExp('\\| [^\\n]+ \\| `' + name + '` \\|'));
  }

  const lines = readme.split('\n');
  for (const command of [
    'npx nono-skills doctor',
    'npx nono-skills agents doctor',
    'npx nono-skills eval',
    'npx nono-skills update',
    'npx nono-skills uninstall',
  ]) {
    assert.ok(lines.includes(command), `README must document ${command}`);
  }
});

test('contribution guidance keeps public changes evidence-aware', async () => {
  const contributing = await readFile(path.join(root, 'CONTRIBUTING.md'), 'utf8');
  assert.match(contributing, /Node\.js 20 or newer/);
  assert.match(contributing, /npm run eval:skills/);
  assert.match(contributing, /Keep skill bodies host-neutral and concise/);
  assert.match(contributing, /committed raw capture and exact host identity/);
});

test('every skill has specific UI metadata and uses the workspace protocol', async () => {
  const canonicalWorkspaceProtocol = await readFile(
    path.join(root, 'plugin', 'references', 'workspaces.md'),
    'utf8',
  );
  for (const name of expectedSkills) {
    const skillRoot = path.join(root, 'plugin', 'skills', name);
    const skill = await readFile(path.join(skillRoot, 'SKILL.md'), 'utf8');
    const metadata = await readFile(path.join(skillRoot, 'agents', 'openai.yaml'), 'utf8');
    const bundledWorkspaceProtocol = await readFile(
      path.join(skillRoot, 'references', 'workspaces.md'),
      'utf8',
    );
    const shortDescription = metadata.match(/short_description: "([^"]+)"/)?.[1];

    assert.equal(
      bundledWorkspaceProtocol,
      canonicalWorkspaceProtocol,
      `${name} must be self-contained with the canonical workspace protocol`,
    );
    assert.doesNotMatch(
      skill,
      /\bCodex\b|\$engineering:|\.\.\/\.\.\/references\/workspaces\.md|engineering_reviewer/,
      `${name} must keep its portable instructions host-neutral`,
    );
    assert.ok(shortDescription, `${name} must define a short_description`);
    assert.ok(shortDescription.length >= 25 && shortDescription.length <= 64,
      `${name} short_description must be 25-64 characters`);
    assert.doesNotMatch(metadata, /Reusable engineering workflow|for this task\./);
    assert.match(metadata, new RegExp(`default_prompt: ".*\\$${name.replaceAll('-', '\\-')}\\b`));
    if (['bugfix-loop', 'delivery-loop', 'handoff'].includes(name)) {
      assert.match(
        metadata,
        /^policy:\n  allow_implicit_invocation: false$/m,
        `${name} must require explicit invocation`,
      );
    }
    assertSkillWorkspaceContract(name, skill);
  }
});

test('acceptance-verify owns source-read-only browser QA verdicts', async () => {
  const content = await readFile(
    path.join(root, 'plugin', 'skills', 'acceptance-verify', 'SKILL.md'),
    'utf8',
  );
  const metadata = await readFile(
    path.join(root, 'plugin', 'skills', 'acceptance-verify', 'agents', 'openai.yaml'),
    'utf8',
  );
  for (const responsibility of expectedRequiredResponsibilityLines['acceptance-verify']) {
    assert.equal(
      content.split(responsibility).length - 1,
      1,
      'acceptance-verify must include each workflow responsibility exactly once',
    );
  }
  assert.match(content, /QA, manual UI testing, UAT, browser testing, or acceptance verification/);
  assert.match(content, /use test when the primary goal is to author automated tests/);
  assert.match(content, /`PASSED`, `FAILED`, or `BLOCKED`/);
  assert.match(content, /Inspect the rendered interface visually/);
  assert.match(metadata, /display_name: "Acceptance Verify"/);
  assert.doesNotMatch(metadata, /allow_implicit_invocation: false/);
  assert.doesNotThrow(() => assertSkillWorkspaceContract('acceptance-verify', content));
});

test('contract rejects deleted acceptance-verify responsibilities', async () => {
  for (const responsibility of expectedRequiredResponsibilityLines['acceptance-verify']) {
    const result = await validateMutatedSkill('acceptance-verify', (content) => content.replace(
      `${responsibility}\n`,
      '',
    ));
    assertValidationFails(result, /must include each required responsibility line exactly once/);
  }
});

test('delivery-loop owns isolation approval and explicit child-skill composition', async () => {
  const content = await readFile(
    path.join(root, 'plugin', 'skills', 'delivery-loop', 'SKILL.md'),
    'utf8',
  );
  for (const responsibility of expectedRequiredResponsibilityLines['delivery-loop']) {
    assert.equal(
      content.split(responsibility).length - 1,
      1,
      'delivery-loop must include each workflow responsibility exactly once',
    );
  }
  assert.match(content, /controller enforces five batches, four fix cycles, and one no-verdict retry/);
  assert.match(content, /persisted counters are monotonic and non-renewable/);
  assert.match(content, /leased bounded pass/);
  assert.match(content, /Never review the same HEAD twice/);
  assert.match(content, /`BUDGET_EXHAUSTED` transition/);
  assert.match(content, /One round is one batch over one HEAD/);
  assert.match(content, /Reuse a host-managed worktree without nesting/);
  assert.match(content, /fresh project-scoped read-only reviewer agent/);
  assert.match(content, /never assume a literal invocation prefix/);
  assert.match(content, /strict control cannot execute or persist/);
  assert.match(content, /activate `plan` before implementation/);
  assert.match(content, /references\/evidence-contract\.md/);
  assert.match(content, /references\/agent-delegation\.md/);
  assert.match(content, /explicit per-run consent/);
  assert.match(content, /one writer per file boundary/);
  assert.match(content, /never invoke the current host externally/);
  assert.match(content, /`Native subagents \(default\)`, `External CLI agents`, and `Hybrid`/);
  assert.match(content, /an unspecified choice means Native/);
  assert.match(content, /Probe or invoke external providers only after External, Hybrid/);
  assert.doesNotThrow(() => assertSkillWorkspaceContract('delivery-loop', content));
});

test('delivery-loop bundles a provider-neutral delegation contract and safe bridge', async () => {
  const reference = await readFile(
    path.join(root, 'plugin', 'skills', 'delivery-loop', 'references', 'agent-delegation.md'),
    'utf8',
  );
  const bridge = await readFile(
    path.join(root, 'plugin', 'skills', 'delivery-loop', 'scripts', 'agent-bridge.mjs'),
    'utf8',
  );
  const providerContract = await readFile(
    path.join(root, 'plugin', 'skills', 'delivery-loop', 'scripts', 'provider-contract.mjs'),
    'utf8',
  );
  const providers = await readFile(
    path.join(root, 'plugin', 'skills', 'delivery-loop', 'scripts', 'providers', 'index.mjs'),
    'utf8',
  );
  assert.match(reference, /task packet/i);
  assert.match(reference, /Claude Code/);
  assert.match(reference, /OpenAI Codex/);
  assert.match(reference, /Qwen Code/);
  assert.match(reference, /OpenCode/);
  assert.match(reference, /CodeWhale/);
  assert.match(reference, /Google Antigravity/);
  assert.match(reference, /per-run consent/);
  assert.match(reference, /Read this reference only after the user selects External or Hybrid/);
  assert.match(reference, /Never invoke\s+the current host harness as an external child/);
  assert.match(reference, /input_digest/);
  assert.match(reference, /loop_context/);
  assert.match(reference, /select --mode <review\|implement>/);
  assert.match(reference, /must not be (?:its|the) sole\s+general reviewer/);
  assert.ok(
    reference.trim().split(/\s+/).length <= 800,
    'external delegation reference must stay concise because it joins the active context',
  );
  assert.match(bridge, /buildClaudeArgs/);
  assert.match(bridge, /runExternalAgent/);
  assert.match(bridge, /selectAgentProviders/);
  assert.match(bridge, /scope_completed/);
  assert.match(bridge, /SIGKILL/);
  assert.match(providerContract, /composeAgentPrompt/);
  assert.match(providers, /claudeAdapter/);
  assert.match(providers, /codexAdapter/);
  assert.match(providers, /qwenAdapter/);
  assert.match(providers, /openCodeAdapter/);
  assert.match(providers, /codeWhaleAdapter/);
  assert.match(providers, /antigravityAdapter/);
  assert.doesNotMatch(bridge, /dangerously-skip-permissions/);
});

test('contract rejects deleted delivery-loop workflow responsibilities', async () => {
  for (const responsibility of expectedRequiredResponsibilityLines['delivery-loop']) {
    const result = await validateMutatedSkill('delivery-loop', (content) => content.replace(
      `${responsibility}\n`,
      '',
    ));
    assertValidationFails(result, /must include each required responsibility line exactly once/);
  }
});

test('bugfix-loop requires evidence-first diagnosis and sequential review', async () => {
  const content = await readFile(
    path.join(root, 'plugin', 'skills', 'bugfix-loop', 'SKILL.md'),
    'utf8',
  );
  for (const responsibility of expectedRequiredResponsibilityLines['bugfix-loop']) {
    assert.equal(
      content.split(responsibility).length - 1,
      1,
      'bugfix-loop must include each workflow responsibility exactly once',
    );
  }
  assert.match(content, /support a root cause before changing production code/);
  assert.match(content, /fails through the supported causal path/);
  assert.match(content, /Run rounds sequentially\. Never start future review rounds in advance/);
  assert.match(content, /controller enforces five batches, four fix cycles, and one no-verdict retry/);
  assert.match(content, /persisted counters are monotonic and non-renewable/);
  assert.match(content, /leased bounded pass/);
  assert.match(content, /Never review the same HEAD twice/);
  assert.match(content, /fifth-batch triage confirms an actionable defect/);
  assert.match(content, /`BUDGET_EXHAUSTED` transition/);
  assert.match(content, /strict control cannot execute or persist/);
  assert.doesNotThrow(() => assertSkillWorkspaceContract('bugfix-loop', content));
});

test('both controlled loops bundle identical evidence, branch naming, and controller resources', async () => {
  const canonicalController = await readFile(
    path.join(root, 'plugin', 'runtime', 'loop-controller.mjs'),
    'utf8',
  );
  const canonicalEvidence = await readFile(
    path.join(root, 'plugin', 'runtime', 'evidence-contract.md'),
    'utf8',
  );
  const canonicalBranchNaming = await readFile(
    path.join(root, 'plugin', 'references', 'branch-naming.md'),
    'utf8',
  );
  for (const name of ['bugfix-loop', 'delivery-loop']) {
    assert.equal(
      await readFile(path.join(root, 'plugin', 'skills', name, 'scripts', 'loop-controller.mjs'), 'utf8'),
      canonicalController,
    );
    assert.equal(
      await readFile(path.join(root, 'plugin', 'skills', name, 'references', 'evidence-contract.md'), 'utf8'),
      canonicalEvidence,
    );
    assert.equal(
      await readFile(path.join(root, 'plugin', 'skills', name, 'references', 'branch-naming.md'), 'utf8'),
      canonicalBranchNaming,
    );
  }
  assert.match(canonicalController, /review_batches: Object\.freeze\(\{ limit: 5 \}\)/);
  assert.match(canonicalController, /fix_cycles: Object\.freeze\(\{ limit: 4 \}\)/);
  assert.match(canonicalController, /no_verdict_retries: Object\.freeze\(\{ limit: 1 \}\)/);
  assert.match(canonicalController, /export const evidenceSchemaVersion = 2/);
  assert.match(canonicalController, /export const runSchemaVersion = 2/);
  assert.match(canonicalController, /completion_kind: completionKind/);
  assert.match(canonicalController, /export async function supersedeLegacyRun/);
  assert.match(canonicalEvidence, /Every caller-supplied evidence envelope uses schema version 2/);
  assert.match(canonicalEvidence, /clean_with_residuals/);
  assert.match(canonicalEvidence, /supersede.*--run-id <legacy-run-id> --confirm/s);
  assert.match(canonicalEvidence, /The controller enforces transitions only after an agent starts a managed run and continues to invoke it/);
  assert.match(canonicalEvidence, /The hash chain is tamper-evident, not tamper-proof, and is not a security boundary/);
  assert.doesNotMatch(canonicalEvidence, /scope_approval_required|human\.feedback\.recorded/);
  assert.match(canonicalBranchNaming, /Repository instructions, documented conventions/);
  assert.match(canonicalBranchNaming, /derive a host-neutral name from the primary change outcome/);
  assert.match(canonicalBranchNaming, /applies this reference automatically before branch approval/);
  assert.match(canonicalBranchNaming, /does not need to invoke a naming helper or supply a prefix/);
  assert.match(canonicalBranchNaming, /`hotfix\/` only for an explicitly urgent production repair/);
  assert.match(canonicalBranchNaming, /Do not use an agent or vendor prefix such as `codex\/`/);
});

test('finding producers and consumers bundle one calibrated finding rubric', async () => {
  const canonicalRubric = await readFile(
    path.join(root, 'plugin', 'references', 'finding-rubric.md'),
    'utf8',
  );
  const findingSkillNames = [
    'acceptance-verify',
    'architecture-review',
    'bugfix-loop',
    'delivery-loop',
    'fix-findings',
    'release-readiness',
    'review',
    'security-review',
  ];
  for (const name of findingSkillNames) {
    assert.equal(
      await readFile(path.join(root, 'plugin', 'skills', name, 'references', 'finding-rubric.md'), 'utf8'),
      canonicalRubric,
    );
  }
  assert.match(canonicalRubric, /Only `critical`, `high`, or `medium` findings may be actionable/);
  assert.match(canonicalRubric, /Low findings are non-blocking and do not consume a loop fix cycle/);
  assert.match(canonicalRubric, /Keep severity independent from evidence strength/);
  assert.match(canonicalRubric, /`accepted_by\.type: human`/);
  assert.match(canonicalRubric, /`unvalidated`/);
  for (const reasonCode of [
    'IN_SCOPE_VALIDATED',
    'LOW_SEVERITY',
    'PREEXISTING_UNRELATED',
    'DIFFERENT_SUBSYSTEM',
    'OUTSIDE_APPROVED_SCOPE',
    'SAME_ROOT_CAUSE',
    'SUPERSEDED_BY_FIX',
    'ENV_DEPENDENT',
    'INSUFFICIENT_REPRO_STEPS',
    'CONTRADICTED_BY_CHECK',
    'OWNER_ACCEPTED',
    'INSUFFICIENT_EVIDENCE',
    'UNVERIFIED_OBSERVATION',
  ]) assert.match(canonicalRubric, new RegExp(`\\b${reasonCode}\\b`));
  assert.match(canonicalRubric, /Good finding:/);
  assert.match(canonicalRubric, /Rejected as a finding:/);
});

test('review and debug use explicit evidence-first workflows', async () => {
  const review = await readFile(path.join(root, 'plugin', 'skills', 'review', 'SKILL.md'), 'utf8');
  const debug = await readFile(path.join(root, 'plugin', 'skills', 'debug', 'SKILL.md'), 'utf8');
  assert.match(review, /## Workflow\n\n1\. Establish the exact baseline/);
  assert.match(review, /6\. Read `references\/finding-rubric\.md`/);
  assert.match(debug, /## Workflow\n\n1\. Reproduce the symptom at the observed boundary/);
  assert.match(debug, /4\. Isolate the causal mechanism before patching/);
});

test('contract rejects deleted bugfix-loop workflow responsibilities', async () => {
  for (const responsibility of expectedRequiredResponsibilityLines['bugfix-loop']) {
    const result = await validateMutatedSkill('bugfix-loop', (content) => content.replace(
      `${responsibility}\n`,
      '',
    ));
    assertValidationFails(result, /must include each required responsibility line exactly once/);
  }
});

for (const name of ['fix-findings', 'review']) {
  test(`${name} returns control without starting a nested workflow`, async () => {
    const content = await readFile(
      path.join(root, 'plugin', 'skills', name, 'SKILL.md'),
      'utf8',
    );
    for (const responsibility of expectedRequiredResponsibilityLines[name]) {
      assert.equal(
        content.split(responsibility).length - 1,
        1,
        `${name} must include each child-loop boundary exactly once`,
      );
    }
    assert.doesNotThrow(() => assertSkillWorkspaceContract(name, content));
  });

  test(`contract rejects a deleted ${name} child-loop boundary`, async () => {
    for (const responsibility of expectedRequiredResponsibilityLines[name]) {
      const result = await validateMutatedSkill(name, (content) => content.replace(
        `${responsibility}\n`,
        '',
      ));
      assertValidationFails(result, /must include each required responsibility line exactly once/);
    }
  });
}

for (const [name, budget] of Object.entries(expectedSkillWordBudgets)) {
  test(`${name} stays within its progressive-disclosure budget`, async () => {
    const content = await readFile(
      path.join(root, 'plugin', 'skills', name, 'SKILL.md'),
      'utf8',
    );
    assert.doesNotThrow(() => assertSkillWorkspaceContract(name, content));
    assert.throws(
      () => assertSkillWorkspaceContract(name, `${content}\n${'padding '.repeat(budget + 1)}`),
      new RegExp(`${name} must stay within its ${budget}-word progressive-disclosure budget`),
    );
  });
}

for (const name of ['bugfix-loop', 'delivery-loop', 'handoff']) {
  test(`package validation rejects implicit ${name} metadata`, async () => {
    const result = await validateMutatedFixture(async (fixtureRoot) => {
      const metadataPath = path.join(
        fixtureRoot,
        'plugin',
        'skills',
        name,
        'agents',
        'openai.yaml',
      );
      const content = await readFile(metadataPath, 'utf8');
      const mutated = content.replace(
        'allow_implicit_invocation: false',
        'allow_implicit_invocation: true',
      );
      assert.notEqual(mutated, content, `${name} policy mutation must change metadata`);
      await writeFile(metadataPath, mutated, 'utf8');
    });
    assertValidationFails(result, `${name} must require explicit invocation`);
  });
}

test('package validation accepts an unmodified standalone fixture with exact output', async () => {
  assertValidationPasses(await validateUnmodifiedFixture());
});

test('package validation rejects a drifted bundled workspace protocol', async () => {
  const result = await validateMutatedFixture(async (fixtureRoot) => {
    const bundledPath = path.join(
      fixtureRoot,
      'plugin',
      'skills',
      'review',
      'references',
      'workspaces.md',
    );
    const content = await readFile(bundledPath, 'utf8');
    await writeFile(bundledPath, `${content}\nDrifted copy.\n`, 'utf8');
  });
  assertValidationFails(result, 'review must bundle the canonical workspace protocol');
});

test('package validation rejects a drifted bundled finding rubric', async () => {
  const result = await validateMutatedFixture(async (fixtureRoot) => {
    const bundledPath = path.join(
      fixtureRoot,
      'plugin',
      'skills',
      'review',
      'references',
      'finding-rubric.md',
    );
    const content = await readFile(bundledPath, 'utf8');
    await writeFile(bundledPath, `${content}\nDrifted copy.\n`, 'utf8');
  });
  assertValidationFails(result, 'review must bundle the canonical finding rubric');
});

test('package validation rejects a drifted bundled branch naming contract', async () => {
  const result = await validateMutatedFixture(async (fixtureRoot) => {
    const bundledPath = path.join(
      fixtureRoot,
      'plugin',
      'skills',
      'delivery-loop',
      'references',
      'branch-naming.md',
    );
    const content = await readFile(bundledPath, 'utf8');
    await writeFile(bundledPath, `${content}\nDrifted copy.\n`, 'utf8');
  });
  assertValidationFails(result, 'delivery-loop must bundle the canonical branch naming contract');
});

test('portable resource sync restores workspace, finding, evidence, and controller resources', async () => {
  await withValidationFixture(async (fixtureRoot) => {
    const skillPath = path.join(fixtureRoot, 'plugin', 'skills', 'review', 'SKILL.md');
    const bundledPath = path.join(
      fixtureRoot,
      'plugin',
      'skills',
      'review',
      'references',
      'workspaces.md',
    );
    const controllerPath = path.join(
      fixtureRoot,
      'plugin',
      'skills',
      'bugfix-loop',
      'scripts',
      'loop-controller.mjs',
    );
    const findingPath = path.join(
      fixtureRoot,
      'plugin',
      'skills',
      'review',
      'references',
      'finding-rubric.md',
    );
    const evidencePath = path.join(
      fixtureRoot,
      'plugin',
      'skills',
      'delivery-loop',
      'references',
      'evidence-contract.md',
    );
    const branchNamingPath = path.join(
      fixtureRoot,
      'plugin',
      'skills',
      'bugfix-loop',
      'references',
      'branch-naming.md',
    );
    const content = await readFile(skillPath, 'utf8');
    await writeFile(
      skillPath,
      content.replace(
        'Read `references/workspaces.md` once per agent task',
        'Read `../../references/workspaces.md` once per Codex task',
      ),
      'utf8',
    );
    await writeFile(bundledPath, 'stale\n', 'utf8');
    await writeFile(findingPath, 'stale\n', 'utf8');
    await writeFile(controllerPath, 'stale\n', 'utf8');
    await writeFile(evidencePath, 'stale\n', 'utf8');
    await writeFile(branchNamingPath, 'stale\n', 'utf8');

    const result = spawnSync(process.execPath, ['scripts/sync-portable-resources.mjs'], {
      cwd: fixtureRoot,
      encoding: 'utf8',
    });
    assertSpawnCompleted(result);
    assert.equal(result.status, 0);
    assert.equal(result.stdout, 'Synchronized portable resources for 21 skills, 8 finding consumers, and 2 controlled loops.\n');
    assert.equal(result.stderr, '');
    assertValidationPasses(runPackageValidation(fixtureRoot));
  });
});

test('package validation rejects deletion from inventory, ending map, and derived allowlist', async () => {
  const result = await validateMutatedFixture(async (fixtureRoot) => {
    await rm(path.join(fixtureRoot, 'plugin', 'skills', 'api-design'), {
      recursive: true,
      force: true,
    });
    const contractPath = path.join(fixtureRoot, 'src', 'skill-contract.js');
    const content = await readFile(contractPath, 'utf8');
    const mutated = content.replace(/^  'api-design': .+\n/m, '');
    assert.notEqual(mutated, content, 'expected-ending mutation must change the contract');
    await writeFile(contractPath, mutated, 'utf8');
  });
  assertValidationFails(
    result,
    'plugin skill inventory must contain exactly the 21 canonical skills',
  );
});

test('package validation rejects a negated workspace instruction', async () => {
  const result = await validateMutatedSkill('api-design', (content) => content.replace(
    'Read `references/workspaces.md`',
    'Do not Read `references/workspaces.md`',
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

test('test, debug, and refactor have exact scoped plan-maintenance endings', async () => {
  for (const [name, ending] of Object.entries(scopedPlanMaintenanceEndings)) {
    const content = await readFile(path.join(root, 'plugin', 'skills', name, 'SKILL.md'), 'utf8');
    assert.equal(expectedDurableEndings[name], ending);
    assert.equal(content.split(ending).length - 1, 1, `${name} must include its exact scoped ending once`);
    assert.doesNotThrow(() => assertSkillWorkspaceContract(name, content));
  }
});

test('contract rejects deleted scoped plan-maintenance responsibilities', async () => {
  for (const [name, ending] of Object.entries(scopedPlanMaintenanceEndings)) {
    const content = await readFile(path.join(root, 'plugin', 'skills', name, 'SKILL.md'), 'utf8');
    const mutated = content.replace(`${ending}\n`, '');
    assert.notEqual(mutated, content, `${name} deletion mutation must change the skill`);
    assert.throws(
      () => assertSkillWorkspaceContract(name, mutated),
      /must end Decision-log updates with its durable-state contract/,
    );
  }
});

test('contract rejects wrong scoped plan-maintenance endings', async () => {
  for (const [name, ending] of Object.entries(scopedPlanMaintenanceEndings)) {
    const content = await readFile(path.join(root, 'plugin', 'skills', name, 'SKILL.md'), 'utf8');
    const mutated = content.replace(
      ending,
      ending.replace('update only relevant plan-item status', 'update every plan-item status'),
    );
    assert.notEqual(mutated, content, `${name} wrong-ending mutation must change the skill`);
    assert.throws(
      () => assertSkillWorkspaceContract(name, mutated),
      /must end Decision-log updates with its durable-state contract/,
    );
  }
});

test('release-readiness has an exact selected-work-item read responsibility', async () => {
  const content = await readFile(
    path.join(root, 'plugin', 'skills', 'release-readiness', 'SKILL.md'),
    'utf8',
  );
  assert.equal(content.split(releaseReadResponsibility).length - 1, 1);
  assert.doesNotThrow(() => assertSkillWorkspaceContract('release-readiness', content));
});

test('contract rejects a deleted release-readiness read responsibility', async () => {
  const content = await readFile(
    path.join(root, 'plugin', 'skills', 'release-readiness', 'SKILL.md'),
    'utf8',
  );
  const mutated = content.replace(`${releaseReadResponsibility}\n`, '');
  assert.notEqual(mutated, content, 'release-readiness deletion mutation must change the skill');
  assert.throws(
    () => assertSkillWorkspaceContract('release-readiness', mutated),
    /must include each required responsibility line exactly once/,
  );
});

test('contract rejects a wrong release-readiness read responsibility', async () => {
  const content = await readFile(
    path.join(root, 'plugin', 'skills', 'release-readiness', 'SKILL.md'),
    'utf8',
  );
  const mutated = content.replace(
    releaseReadResponsibility,
    releaseReadResponsibility.replace('read its acceptance criteria', 'skip its acceptance criteria'),
  );
  assert.notEqual(mutated, content, 'release-readiness wrong-line mutation must change the skill');
  assert.throws(
    () => assertSkillWorkspaceContract('release-readiness', mutated),
    /must include each required responsibility line exactly once/,
  );
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
  for (const responsibility of expectedRequiredResponsibilityLines.plan) {
    assert.equal(
      plan.split(responsibility).length - 1,
      1,
      'plan must include each Acceptance Contract responsibility exactly once',
    );
  }
  assert.match(plan, /Acceptance Contract/);
  assert.match(plan, /`AC-<number>`/);
  assert.match(plan, /Behavior-to-Proof/);
  assert.match(agents, /docs\/agent\/work\/<work-id>\//);
  assert.match(agents, /ask before creating a new durable workspace/);
  assert.match(agents, /\$engineering:<skill>/);
  assert.ok(agents.length < 3_500, 'AGENTS.md should remain concise');
});

test('communicate-clearly stays human-facing and maps work items through connectors', async () => {
  const rootPath = path.join(root, 'plugin', 'skills', 'communicate-clearly');
  const skill = await readFile(path.join(rootPath, 'SKILL.md'), 'utf8');
  const workItems = await readFile(path.join(rootPath, 'references', 'work-items.md'), 'utf8');
  const metadata = await readFile(path.join(rootPath, 'agents', 'openai.yaml'), 'utf8');

  for (const responsibility of expectedRequiredResponsibilityLines['communicate-clearly']) {
    assert.equal(skill.split(responsibility).length - 1, 1);
  }
  assert.match(skill, /read `references\/work-items\.md`/);
  assert.match(skill, /Without both, produce a draft/);
  assert.doesNotMatch(metadata, /allow_implicit_invocation: false/);
  assert.match(workItems, /Map at runtime/);
  assert.match(workItems, /If no capable connector is available, return a copyable draft/);
  assert.doesNotThrow(() => assertSkillWorkspaceContract('communicate-clearly', skill));
});

test('write-guide owns evidence-grounded durable product guidance', async () => {
  const rootPath = path.join(root, 'plugin', 'skills', 'write-guide');
  const skill = await readFile(path.join(rootPath, 'SKILL.md'), 'utf8');
  const uiGuides = await readFile(path.join(rootPath, 'references', 'ui-guides.md'), 'utf8');
  const outputFormats = await readFile(path.join(rootPath, 'references', 'output-formats.md'), 'utf8');
  const metadata = await readFile(path.join(rootPath, 'agents', 'openai.yaml'), 'utf8');

  for (const responsibility of expectedRequiredResponsibilityLines['write-guide']) {
    assert.equal(skill.split(responsibility).length - 1, 1);
    assert.throws(
      () => assertSkillWorkspaceContract('write-guide', skill.replace(`${responsibility}\n`, '')),
      /must include each required responsibility line exactly once/,
    );
  }
  assert.match(skill, /`UNVERIFIED` or `BLOCKED`/);
  assert.match(skill, /Use `communicate-clearly` principles/);
  assert.match(uiGuides, /There is no universal screenshot size/);
  assert.match(uiGuides, /Do not ask the user to enumerate features, routes, controls, roles, or viewports/);
  assert.match(uiGuides, /accessibility tree, and visible DOM together/);
  assert.match(uiGuides, /Do not submit mutations, upload files, export data, purchase, message externally/);
  assert.match(uiGuides, /Stop after navigation and route reconciliation yield no new in-scope outcomes/);
  assert.match(uiGuides, /`1440x900` desktop, `768x1024` tablet, and `390x844` mobile/);
  assert.match(uiGuides, /Playwright `scale: "css"`/);
  assert.match(uiGuides, /material action -> guide section -> capture -> verification status/);
  assert.match(outputFormats, /Markdown or MDX as canonical source/);
  assert.match(outputFormats, /new standalone guide with no established destination or format/);
  assert.match(outputFormats, /also create a visually verified PDF when the host has a suitable capability/);
  assert.match(outputFormats, /activate the host's available PDF skill or equivalent/);
  assert.match(outputFormats, /applies this selection automatically/);
  assert.match(outputFormats, /does not need to invoke a PDF companion/);
  assert.match(outputFormats, /Keep PDF as a reproducible derivative, never the only editable source/);
  assert.match(outputFormats, /mark the PDF export `BLOCKED`/);
  assert.match(outputFormats, /Render every page to images/);
  assert.match(outputFormats, /Avoid orphan headings at a page bottom/);
  assert.match(outputFormats, /Repeat table headers on continued pages/);
  assert.match(outputFormats, /does not create wasteful or unexplained blank pages/);
  assert.match(outputFormats, /Repeat until the latest render has no material visual or pagination defect/);
  assert.doesNotMatch(metadata, /allow_implicit_invocation: false/);
  assert.doesNotThrow(() => assertSkillWorkspaceContract('write-guide', skill));
});

test('handoff is explicit, redacted, artifact-aware, and non-mutating', async () => {
  const rootPath = path.join(root, 'plugin', 'skills', 'handoff');
  const skill = await readFile(path.join(rootPath, 'SKILL.md'), 'utf8');
  const metadata = await readFile(path.join(rootPath, 'agents', 'openai.yaml'), 'utf8');

  for (const responsibility of expectedRequiredResponsibilityLines.handoff) {
    assert.equal(skill.split(responsibility).length - 1, 1);
  }
  assert.match(skill, /Use only when explicitly asked/);
  assert.match(metadata, /^policy:\n  allow_implicit_invocation: false$/m);
  assert.doesNotThrow(() => assertSkillWorkspaceContract('handoff', skill));
});

test('implementation and testing preserve TDD sequencing and acceptance-linked proof', async () => {
  for (const name of ['implement', 'test']) {
    const content = await readFile(
      path.join(root, 'plugin', 'skills', name, 'SKILL.md'),
      'utf8',
    );
    for (const responsibility of expectedRequiredResponsibilityLines[name]) {
      assert.equal(content.split(responsibility).length - 1, 1);
      assert.throws(
        () => assertSkillWorkspaceContract(name, content.replace(`${responsibility}\n`, '')),
        /must include each required responsibility line exactly once/,
      );
    }
    assert.doesNotThrow(() => assertSkillWorkspaceContract(name, content));
  }
});

test('brainstorm and plan enforce adaptive discovery and proportionate scope', async () => {
  for (const name of ['brainstorm', 'plan']) {
    const content = await readFile(
      path.join(root, 'plugin', 'skills', name, 'SKILL.md'),
      'utf8',
    );
    for (const responsibility of expectedRequiredResponsibilityLines[name]) {
      assert.equal(
        content.split(responsibility).length - 1,
        1,
        `${name} must include each discovery and scope responsibility exactly once`,
      );
      assert.throws(
        () => assertSkillWorkspaceContract(
          name,
          content.replace(`${responsibility}\n`, ''),
        ),
        /must include each required responsibility line exactly once/,
      );
    }
  }
});

test('project initialization bundles repository guidance and a reviewer agent', async () => {
  assert.deepEqual(await listFiles(path.join(root, 'templates')), [
    '.codex/agents/engineering-reviewer.toml',
    'AGENTS.md',
  ]);
  const reviewer = await readFile(
    path.join(root, 'templates', '.codex', 'agents', 'engineering-reviewer.toml'),
    'utf8',
  );
  assert.match(reviewer, /^name = "engineering_reviewer"$/m);
  assert.match(reviewer, /^sandbox_mode = "read-only"$/m);
  assert.match(reviewer, /\$engineering:review/);
  assert.doesNotMatch(reviewer, /^model\s*=/m);
  assert.doesNotMatch(reviewer, /^model_reasoning_effort\s*=/m);
});
