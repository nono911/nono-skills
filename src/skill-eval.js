import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

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

  const normalizedOutput = result.output.toLocaleLowerCase('en-US');
  const output = evalCase.expect.output;
  if (output?.contains_all) {
    for (const text of output.contains_all) {
      if (!normalizedOutput.includes(text.toLocaleLowerCase('en-US'))) {
        failures.push(`output missing: ${JSON.stringify(text)}`);
      }
    }
  }
  if (output?.contains_any && !output.contains_any.some(
    (text) => normalizedOutput.includes(text.toLocaleLowerCase('en-US')),
  )) {
    failures.push(`output missing any of: ${output.contains_any.map(JSON.stringify).join(', ')}`);
  }
  if (output?.not_contains) {
    for (const text of output.not_contains) {
      if (normalizedOutput.includes(text.toLocaleLowerCase('en-US'))) {
        failures.push(`output contains forbidden text: ${JSON.stringify(text)}`);
      }
    }
  }
  return failures;
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
  return Object.freeze({
    ok: failures.length === 0,
    total: inventory.cases,
    submitted: results.results.length,
    passed,
    failed: failures.length,
    missing,
    failures,
  });
}
