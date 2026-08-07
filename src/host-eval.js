import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { outputAssertionFailures } from './eval-output.js';
import { canonicalSkillNames } from './plugin-contract.js';

const outputAssertionNames = new Set(['contains_all', 'contains_any', 'not_contains']);
const performanceBudgetNames = new Set([
  'min_questions',
  'max_questions',
  'max_activated_skills',
  'max_tool_calls_before_first_action',
  'max_loaded_skill_bodies',
  'max_loaded_references',
  'max_first_action_tax_ratio',
]);
const metricNames = Object.freeze([
  'duration_ms',
  'time_to_first_action_ms',
  'tool_calls',
  'tool_calls_before_first_action',
  'loaded_skill_bodies',
  'loaded_references',
  'questions',
]);

function assertStringList(value, label, { allowEmpty = false } = {}) {
  assert.ok(Array.isArray(value), `${label} must be an array`);
  if (!allowEmpty) assert.ok(value.length > 0, `${label} must not be empty`);
  assert.equal(new Set(value).size, value.length, `${label} must not contain duplicates`);
  for (const item of value) {
    assert.equal(typeof item, 'string', `${label} entries must be strings`);
    assert.ok(item.trim(), `${label} entries must not be blank`);
  }
}

function assertKnownSkills(value, label, { allowEmpty = false } = {}) {
  assertStringList(value, label, { allowEmpty });
  for (const skill of value) {
    assert.ok(canonicalSkillNames.includes(skill), `${label} contains unknown skill ${skill}`);
  }
}

function assertOutputContract(value, label) {
  assert.ok(value && typeof value === 'object' && !Array.isArray(value), `${label} must be an object`);
  assert.ok(Object.keys(value).length > 0, `${label} must not be empty`);
  for (const [name, entries] of Object.entries(value)) {
    assert.ok(outputAssertionNames.has(name), `${label} contains unknown assertion ${name}`);
    assertStringList(entries, `${label}.${name}`);
  }
}

function assertPerformanceBudget(value, label) {
  assert.ok(value && typeof value === 'object' && !Array.isArray(value), `${label} must be an object`);
  assert.ok(Object.keys(value).length > 0, `${label} must not be empty`);
  for (const [name, budget] of Object.entries(value)) {
    assert.ok(performanceBudgetNames.has(name), `${label} contains unknown budget ${name}`);
    assert.equal(typeof budget, 'number', `${label}.${name} must be a number`);
    assert.ok(Number.isFinite(budget) && budget >= 0, `${label}.${name} must be non-negative`);
    if (name !== 'max_first_action_tax_ratio') {
      assert.ok(Number.isInteger(budget), `${label}.${name} must be an integer`);
    }
  }
  if (value.min_questions !== undefined && value.max_questions !== undefined) {
    assert.ok(value.min_questions <= value.max_questions, `${label} question bounds are inverted`);
  }
}

export function assertHostEvalCorpus(corpus) {
  assert.ok(corpus && typeof corpus === 'object' && !Array.isArray(corpus), 'host eval corpus must be an object');
  assert.equal(corpus.schema_version, 1, 'host eval corpus schema_version must be 1');
  assert.ok(Array.isArray(corpus.cases) && corpus.cases.length > 0, 'host eval corpus cases must not be empty');
  const ids = new Set();
  for (const entry of corpus.cases) {
    assert.ok(entry && typeof entry === 'object' && !Array.isArray(entry), 'host eval case must be an object');
    assert.equal(typeof entry.id, 'string', 'host eval case id must be a string');
    assert.match(entry.id, /^[a-z0-9][a-z0-9-]+$/, `${entry.id} must be kebab-case`);
    assert.equal(ids.has(entry.id), false, `duplicate host eval case ${entry.id}`);
    ids.add(entry.id);
    assert.ok(canonicalSkillNames.includes(entry.skill), `${entry.id} names unknown skill ${entry.skill}`);
    for (const name of ['skill_prompt', 'baseline_prompt']) {
      assert.equal(typeof entry[name], 'string', `${entry.id}.${name} must be a string`);
      assert.ok(entry[name].trim().length >= 20, `${entry.id}.${name} must be representative`);
    }
    assert.ok(entry.expect && typeof entry.expect === 'object' && !Array.isArray(entry.expect), `${entry.id}.expect must be an object`);
    assertKnownSkills(entry.expect.activate, `${entry.id}.expect.activate`);
    assert.ok(entry.expect.activate.includes(entry.skill), `${entry.id} must activate its owning skill`);
    assertKnownSkills(entry.expect.forbid, `${entry.id}.expect.forbid`, { allowEmpty: true });
    for (const skill of entry.expect.activate) {
      assert.equal(entry.expect.forbid.includes(skill), false, `${entry.id} cannot activate and forbid ${skill}`);
    }
    assertOutputContract(entry.expect.output, `${entry.id}.expect.output`);
    assertPerformanceBudget(entry.expect.performance, `${entry.id}.expect.performance`);
  }
  return Object.freeze({ cases: corpus.cases.length });
}

export async function loadHostEvalCorpus(file) {
  const corpus = JSON.parse(await readFile(file, 'utf8'));
  assertHostEvalCorpus(corpus);
  return corpus;
}

function assertMetrics(metrics, label) {
  assert.ok(metrics && typeof metrics === 'object' && !Array.isArray(metrics), `${label} must be an object`);
  for (const name of metricNames) {
    assert.equal(typeof metrics[name], 'number', `${label}.${name} must be a number`);
    assert.ok(Number.isInteger(metrics[name]) && metrics[name] >= 0, `${label}.${name} must be a non-negative integer`);
  }
}

function assertVariant(value, label) {
  assert.ok(value && typeof value === 'object' && !Array.isArray(value), `${label} must be an object`);
  assertKnownSkills(value.activated_skills, `${label}.activated_skills`, { allowEmpty: true });
  assert.equal(typeof value.output, 'string', `${label}.output must be a string`);
  assertMetrics(value.metrics, `${label}.metrics`);
}

function assertHostEvalResults(corpus, results) {
  assert.ok(results && typeof results === 'object' && !Array.isArray(results), 'host eval results must be an object');
  assert.equal(results.schema_version, 1, 'host eval results schema_version must be 1');
  assert.ok(results.host && typeof results.host === 'object' && !Array.isArray(results.host), 'host eval results.host must be an object');
  for (const name of ['name', 'model', 'version']) {
    assert.equal(typeof results.host[name], 'string', `host eval host.${name} must be a string`);
    assert.ok(results.host[name].trim(), `host eval host.${name} must not be blank`);
  }
  assert.ok(Array.isArray(results.results), 'host eval results.results must be an array');
  const known = new Set(corpus.cases.map((entry) => entry.id));
  const seen = new Set();
  for (const entry of results.results) {
    assert.ok(known.has(entry.case_id), `unknown host eval case ${entry.case_id}`);
    assert.equal(seen.has(entry.case_id), false, `duplicate host eval result ${entry.case_id}`);
    seen.add(entry.case_id);
    assertVariant(entry.skill, `${entry.case_id}.skill`);
    assertVariant(entry.baseline, `${entry.case_id}.baseline`);
    assert.deepEqual(
      entry.baseline.activated_skills,
      [],
      `${entry.case_id}.baseline must not activate nono-skills`,
    );
  }
}

function performanceFailures(contract, skill, baseline) {
  const failures = [];
  const compare = (name, actual, operator, expected) => {
    if (!operator(actual, expected)) failures.push(`${name} was ${actual}, budget ${expected}`);
  };
  if (contract.min_questions !== undefined) compare('questions', skill.questions, (a, b) => a >= b, contract.min_questions);
  if (contract.max_questions !== undefined) compare('questions', skill.questions, (a, b) => a <= b, contract.max_questions);
  if (contract.max_activated_skills !== undefined) compare('activated skills', skill.activated_skills, (a, b) => a <= b, contract.max_activated_skills);
  if (contract.max_tool_calls_before_first_action !== undefined) compare('tool calls before first action', skill.tool_calls_before_first_action, (a, b) => a <= b, contract.max_tool_calls_before_first_action);
  if (contract.max_loaded_skill_bodies !== undefined) compare('loaded skill bodies', skill.loaded_skill_bodies, (a, b) => a <= b, contract.max_loaded_skill_bodies);
  if (contract.max_loaded_references !== undefined) compare('loaded references', skill.loaded_references, (a, b) => a <= b, contract.max_loaded_references);
  const ratio = (skill.time_to_first_action_ms + 1) / (baseline.time_to_first_action_ms + 1);
  if (contract.max_first_action_tax_ratio !== undefined) compare('first-action tax ratio', ratio, (a, b) => a <= b, contract.max_first_action_tax_ratio);
  return { failures, ratio };
}

function median(values) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.floor((sorted.length - 1) / 2)];
}

export function scoreHostEvalResults(corpus, results, { allowMissing = false } = {}) {
  const inventory = assertHostEvalCorpus(corpus);
  assertHostEvalResults(corpus, results);
  const byId = new Map(results.results.map((entry) => [entry.case_id, entry]));
  const failures = [];
  const firstActionRatios = [];
  const durationRatios = [];
  let passed = 0;
  for (const evalCase of corpus.cases) {
    const result = byId.get(evalCase.id);
    if (!result) {
      if (!allowMissing) failures.push({ case_id: evalCase.id, reasons: ['missing result'] });
      continue;
    }
    const reasons = [];
    const activated = new Set(result.skill.activated_skills);
    for (const skill of evalCase.expect.activate) {
      if (!activated.has(skill)) reasons.push(`expected activation: ${skill}`);
    }
    for (const skill of evalCase.expect.forbid) {
      if (activated.has(skill)) reasons.push(`forbidden activation: ${skill}`);
    }
    reasons.push(...outputAssertionFailures(evalCase.expect.output, result.skill.output));
    const performance = performanceFailures(
      evalCase.expect.performance,
      { ...result.skill.metrics, activated_skills: result.skill.activated_skills.length },
      result.baseline.metrics,
    );
    reasons.push(...performance.failures);
    firstActionRatios.push(performance.ratio);
    durationRatios.push((result.skill.metrics.duration_ms + 1) / (result.baseline.metrics.duration_ms + 1));
    if (reasons.length > 0) failures.push({ case_id: evalCase.id, reasons });
    else passed += 1;
  }
  return Object.freeze({
    ok: failures.length === 0,
    total: inventory.cases,
    submitted: results.results.length,
    passed,
    failed: failures.length,
    missing: inventory.cases - results.results.length,
    performance: {
      median_first_action_tax_ratio: median(firstActionRatios),
      median_duration_tax_ratio: median(durationRatios),
    },
    failures,
  });
}
