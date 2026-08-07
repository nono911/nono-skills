import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { outputAssertionFailures } from './eval-output.js';
import { canonicalSkillNames } from './plugin-contract.js';

export const skillEvalCategories = Object.freeze([
  'direct',
  'indirect',
  'incomplete',
  'negative',
  'edge',
]);

const outputAssertionNames = Object.freeze([
  'contains_all',
  'contains_any',
  'not_contains',
]);

function assertStringArray(value, label, { allowEmpty = false } = {}) {
  assert.ok(Array.isArray(value), `${label} must be an array`);
  if (!allowEmpty) assert.ok(value.length > 0, `${label} must not be empty`);
  assert.equal(new Set(value).size, value.length, `${label} must not contain duplicates`);
  for (const entry of value) {
    assert.equal(typeof entry, 'string', `${label} entries must be strings`);
    assert.ok(entry.trim().length > 0, `${label} entries must not be blank`);
  }
}

function assertKnownSkills(skills, label) {
  assertStringArray(skills, label, { allowEmpty: true });
  for (const skill of skills) {
    assert.ok(canonicalSkillNames.includes(skill), `${label} contains unknown skill ${skill}`);
  }
}

function assertOutputAssertions(output, label) {
  assert.ok(output && typeof output === 'object' && !Array.isArray(output),
    `${label} must be an object`);
  const keys = Object.keys(output);
  assert.ok(keys.length > 0, `${label} must define at least one assertion`);
  for (const key of keys) {
    assert.ok(outputAssertionNames.includes(key), `${label} contains unknown assertion ${key}`);
    assertStringArray(output[key], `${label}.${key}`);
  }
}

export function assertSkillEvalCorpus(corpus) {
  assert.ok(corpus && typeof corpus === 'object' && !Array.isArray(corpus),
    'skill eval corpus must be an object');
  assert.equal(corpus.schema_version, 1, 'skill eval corpus schema_version must be 1');
  assertStringArray(corpus.skills, 'skill eval corpus skills');
  assert.deepEqual(
    [...corpus.skills].sort(),
    [...canonicalSkillNames].sort(),
    'skill eval corpus must use the canonical skill inventory',
  );
  assert.ok(Array.isArray(corpus.cases), 'skill eval corpus cases must be an array');

  const expectedCaseCount = canonicalSkillNames.length * skillEvalCategories.length;
  assert.equal(
    corpus.cases.length,
    expectedCaseCount,
    `skill eval corpus must define exactly ${expectedCaseCount} cases`,
  );

  const ids = new Set();
  const outputCoverage = new Set();
  const categoryCoverage = new Map(
    canonicalSkillNames.map((skill) => [skill, new Set()]),
  );

  for (const entry of corpus.cases) {
    assert.ok(entry && typeof entry === 'object' && !Array.isArray(entry),
      'each skill eval case must be an object');
    const { id, skill, category, prompt, expect } = entry;
    assert.equal(typeof id, 'string', 'skill eval case id must be a string');
    assert.equal(id, `${skill}-${category}`, `skill eval case ${id} must use <skill>-<category>`);
    assert.equal(ids.has(id), false, `skill eval case id ${id} must be unique`);
    ids.add(id);

    assert.ok(canonicalSkillNames.includes(skill), `${id} must name a canonical skill`);
    assert.ok(skillEvalCategories.includes(category), `${id} must use a canonical category`);
    assert.equal(
      categoryCoverage.get(skill).has(category),
      false,
      `${skill} must define category ${category} only once`,
    );
    categoryCoverage.get(skill).add(category);

    assert.equal(typeof prompt, 'string', `${id} prompt must be a string`);
    assert.ok(prompt.trim().length >= 20, `${id} prompt must be representative, not a label`);
    assert.ok(expect && typeof expect === 'object' && !Array.isArray(expect),
      `${id} expect must be an object`);
    assertKnownSkills(expect.activate, `${id} expect.activate`);
    assertKnownSkills(expect.forbid, `${id} expect.forbid`);
    for (const activated of expect.activate) {
      assert.equal(
        expect.forbid.includes(activated),
        false,
        `${id} cannot both activate and forbid ${activated}`,
      );
    }
    assert.ok(
      expect.activate.length + expect.forbid.length > 0,
      `${id} must assert at least one activation boundary`,
    );

    if (category === 'direct' || category === 'incomplete') {
      assert.ok(expect.activate.includes(skill), `${id} must activate its owning skill`);
    }
    if (category === 'negative') {
      assert.ok(expect.forbid.includes(skill), `${id} must forbid its owning skill`);
    }
    if (category === 'edge') {
      assert.ok(
        expect.activate.includes(skill) || expect.forbid.includes(skill),
        `${id} must assert its owning skill at the edge boundary`,
      );
    }

    if (expect.output !== undefined) {
      assertOutputAssertions(expect.output, `${id} expect.output`);
      outputCoverage.add(skill);
    }
  }

  for (const skill of canonicalSkillNames) {
    assert.deepEqual(
      [...categoryCoverage.get(skill)].sort(),
      [...skillEvalCategories].sort(),
      `${skill} must cover every skill eval category`,
    );
    assert.ok(outputCoverage.has(skill), `${skill} must have output-quality coverage`);
  }

  return Object.freeze({
    skills: canonicalSkillNames.length,
    cases: corpus.cases.length,
    categories: skillEvalCategories.length,
  });
}

export async function loadSkillEvalCorpus(file) {
  const corpus = JSON.parse(await readFile(file, 'utf8'));
  assertSkillEvalCorpus(corpus);
  return corpus;
}

function assertSkillEvalResults(corpus, results) {
  assert.ok(results && typeof results === 'object' && !Array.isArray(results),
    'skill eval results must be an object');
  assert.equal(results.schema_version, 1, 'skill eval results schema_version must be 1');
  assert.ok(results.host && typeof results.host === 'object' && !Array.isArray(results.host),
    'skill eval results.host must be an object');
  for (const name of ['name', 'model', 'version']) {
    assert.equal(typeof results.host[name], 'string', `skill eval results.host.${name} must be a string`);
    assert.ok(results.host[name].trim(), `skill eval results.host.${name} must not be blank`);
  }
  assert.ok(Array.isArray(results.results), 'skill eval results.results must be an array');

  const knownCases = new Set(corpus.cases.map(({ id }) => id));
  const seen = new Set();
  for (const entry of results.results) {
    assert.ok(entry && typeof entry === 'object' && !Array.isArray(entry),
      'each skill eval result must be an object');
    assert.equal(typeof entry.case_id, 'string', 'skill eval result case_id must be a string');
    assert.ok(knownCases.has(entry.case_id), `unknown skill eval case ${entry.case_id}`);
    assert.equal(seen.has(entry.case_id), false, `duplicate skill eval result ${entry.case_id}`);
    seen.add(entry.case_id);
    assertKnownSkills(entry.activated_skills, `${entry.case_id} activated_skills`);
    assert.equal(typeof entry.output, 'string', `${entry.case_id} output must be a string`);
  }
}

function evaluateCase(evalCase, result) {
  const failures = [];
  const activated = new Set(result.activated_skills);
  for (const skill of evalCase.expect.activate) {
    if (!activated.has(skill)) failures.push(`expected activation: ${skill}`);
  }
  for (const skill of evalCase.expect.forbid) {
    if (activated.has(skill)) failures.push(`forbidden activation: ${skill}`);
  }

  const output = evalCase.expect.output;
  if (output) failures.push(...outputAssertionFailures(output, result.output));
  return failures;
}

function ratio(numerator, denominator) {
  return denominator === 0 ? null : numerator / denominator;
}

function activationReport(corpus, byId) {
  const perSkill = Object.fromEntries(canonicalSkillNames.map((skill) => [skill, {
    expected: 0,
    correct: 0,
    missed: 0,
    forbidden_opportunities: 0,
    forbidden_activations: 0,
  }]));
  const caseOwnerMatrix = Object.fromEntries(canonicalSkillNames.map((owner) => [
    owner,
    Object.fromEntries(canonicalSkillNames.map((activated) => [activated, 0])),
  ]));
  const boundaryConfusions = new Map();
  let unassertedActivations = 0;

  for (const evalCase of corpus.cases) {
    const result = byId.get(evalCase.id);
    if (!result) continue;
    const activated = new Set(result.activated_skills);
    for (const skill of result.activated_skills) caseOwnerMatrix[evalCase.skill][skill] += 1;
    for (const skill of evalCase.expect.activate) {
      perSkill[skill].expected += 1;
      if (activated.has(skill)) perSkill[skill].correct += 1;
      else perSkill[skill].missed += 1;
    }
    for (const skill of evalCase.expect.forbid) {
      perSkill[skill].forbidden_opportunities += 1;
      if (!activated.has(skill)) continue;
      perSkill[skill].forbidden_activations += 1;
      const expected = evalCase.expect.activate.length > 0
        ? evalCase.expect.activate.join('+')
        : 'none';
      const key = `${expected}\u0000${skill}`;
      const confusion = boundaryConfusions.get(key) ?? {
        expected,
        activated: skill,
        count: 0,
        case_ids: [],
      };
      confusion.count += 1;
      confusion.case_ids.push(evalCase.id);
      boundaryConfusions.set(key, confusion);
    }
    for (const skill of result.activated_skills) {
      if (!evalCase.expect.activate.includes(skill) && !evalCase.expect.forbid.includes(skill)) {
        unassertedActivations += 1;
      }
    }
  }

  const totals = Object.values(perSkill).reduce((summary, skill) => ({
    expected: summary.expected + skill.expected,
    correct: summary.correct + skill.correct,
    missed: summary.missed + skill.missed,
    forbidden_opportunities: summary.forbidden_opportunities + skill.forbidden_opportunities,
    forbidden_activations: summary.forbidden_activations + skill.forbidden_activations,
  }), {
    expected: 0,
    correct: 0,
    missed: 0,
    forbidden_opportunities: 0,
    forbidden_activations: 0,
  });
  return {
    ...totals,
    unasserted_activations: unassertedActivations,
    asserted_precision: ratio(totals.correct, totals.correct + totals.forbidden_activations),
    recall: ratio(totals.correct, totals.expected),
    forbidden_activation_rate: ratio(
      totals.forbidden_activations,
      totals.forbidden_opportunities,
    ),
    per_skill: perSkill,
    case_owner_activation_matrix: caseOwnerMatrix,
    boundary_confusions: [...boundaryConfusions.values()].sort(
      (left, right) => right.count - left.count
        || left.expected.localeCompare(right.expected)
        || left.activated.localeCompare(right.activated),
    ),
  };
}

export function scoreSkillEvalResults(corpus, results, { allowMissing = false } = {}) {
  const inventory = assertSkillEvalCorpus(corpus);
  assertSkillEvalResults(corpus, results);
  const byId = new Map(results.results.map((entry) => [entry.case_id, entry]));
  const failures = [];
  let passed = 0;

  for (const evalCase of corpus.cases) {
    const result = byId.get(evalCase.id);
    if (!result) {
      if (!allowMissing) failures.push({ case_id: evalCase.id, reasons: ['missing result'] });
      continue;
    }
    const reasons = evaluateCase(evalCase, result);
    if (reasons.length > 0) failures.push({ case_id: evalCase.id, reasons });
    else passed += 1;
  }

  const missing = inventory.cases - results.results.length;
  const activation = activationReport(corpus, byId);
  return Object.freeze({
    ok: failures.length === 0,
    host: results.host,
    total: inventory.cases,
    submitted: results.results.length,
    passed,
    failed: failures.length,
    missing,
    activation,
    failures,
  });
}
