import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { promisify } from 'node:util';

import { canonicalSkillNames } from '../src/plugin-contract.js';
import {
  assertSkillEvalCorpus,
  loadSkillEvalCorpus,
  scoreSkillEvalResults,
  skillEvalCategories,
} from '../src/skill-eval.js';

const exec = promisify(execFile);
const root = path.resolve(import.meta.dirname, '..');
const corpusPath = path.join(root, 'evals', 'skill-behavior.json');

function satisfyingOutput(evalCase) {
  const output = evalCase.expect.output;
  return [
    ...(output?.contains_all ?? []),
    ...(output?.contains_any?.slice(0, 1) ?? []),
  ].join(' | ');
}

function perfectResults(corpus) {
  return {
    schema_version: 1,
    host: { name: 'test-host', model: 'test-model', version: '1.0.0' },
    results: corpus.cases.map((evalCase) => ({
      case_id: evalCase.id,
      activated_skills: evalCase.expect.activate,
      output: satisfyingOutput(evalCase),
    })),
  };
}

test('behavioral corpus covers every skill and activation category', async () => {
  const corpus = await loadSkillEvalCorpus(corpusPath);
  const summary = assertSkillEvalCorpus(corpus);
  assert.deepEqual(summary, { skills: 21, cases: 105, categories: 5 });

  for (const skill of canonicalSkillNames) {
    const categories = corpus.cases
      .filter((evalCase) => evalCase.skill === skill)
      .map((evalCase) => evalCase.category)
      .sort();
    assert.deepEqual(categories, [...skillEvalCategories].sort());
  }
});

test('behavioral corpus asserts the highest-risk neighboring skill boundaries', async () => {
  const corpus = await loadSkillEvalCorpus(corpusPath);
  const boundaries = [
    ['plan', 'brainstorm'],
    ['review', 'architecture-review'],
    ['review', 'security-review'],
    ['debug', 'bugfix-loop'],
    ['test', 'acceptance-verify'],
    ['implement', 'fix-findings'],
    ['communicate-clearly', 'handoff'],
    ['communicate-clearly', 'write-guide'],
    ['migration', 'database-design'],
  ];
  for (const [left, right] of boundaries) {
    assert.ok(corpus.cases.some((evalCase) => (
      evalCase.expect.activate.includes(left) && evalCase.expect.forbid.includes(right)
    ) || (
      evalCase.expect.activate.includes(right) && evalCase.expect.forbid.includes(left)
    )), `missing asserted activation boundary ${left}<->${right}`);
  }
});

test('explicit handoff activation and redaction cases are non-vacuous', async () => {
  const corpus = await loadSkillEvalCorpus(corpusPath);
  const indirect = corpus.cases.find((entry) => entry.id === 'handoff-indirect');
  assert.deepEqual(indirect.expect.activate, []);
  assert.ok(indirect.expect.forbid.includes('handoff'));

  const redaction = corpus.cases.find((entry) => entry.id === 'handoff-edge');
  assert.ok(redaction.expect.output.not_contains.length >= 4);
  for (const sentinel of redaction.expect.output.not_contains) {
    assert.ok(
      redaction.prompt.includes(sentinel),
      `handoff redaction prompt must contain forbidden sentinel ${sentinel}`,
    );
  }
});

test('behavioral scorer rejects leaked handoff redaction sentinels', async () => {
  const corpus = await loadSkillEvalCorpus(corpusPath);
  const results = perfectResults(corpus);
  const redaction = corpus.cases.find((entry) => entry.id === 'handoff-edge');
  const leaked = redaction.expect.output.not_contains[0];
  results.results.find((entry) => entry.case_id === redaction.id).output = `sanitized ${leaked}`;

  const score = scoreSkillEvalResults(corpus, results);
  const failure = score.failures.find((entry) => entry.case_id === redaction.id);
  assert.match(failure.reasons.join('\n'), /output contains forbidden text/);
});

test('behavioral scorer accepts provider-neutral conforming results', async () => {
  const corpus = await loadSkillEvalCorpus(corpusPath);
  const score = scoreSkillEvalResults(corpus, perfectResults(corpus));
  assert.deepEqual(
    { ok: score.ok, total: score.total, submitted: score.submitted,
      passed: score.passed, failed: score.failed, missing: score.missing },
    { ok: true, total: 105, submitted: 105, passed: 105, failed: 0, missing: 0 },
  );
  assert.deepEqual(score.failures, []);
  assert.equal(score.activation.asserted_precision, 1);
  assert.equal(score.activation.recall, 1);
  assert.equal(score.activation.forbidden_activations, 0);
  assert.equal(score.activation.unasserted_activations, 0);
  assert.deepEqual(score.activation.boundary_confusions, []);
});

test('behavioral scorer requires explicit host, model, and version identity', async () => {
  const corpus = await loadSkillEvalCorpus(corpusPath);
  const missingHost = perfectResults(corpus);
  delete missingHost.host;
  assert.throws(
    () => scoreSkillEvalResults(corpus, missingHost),
    /results\.host must be an object/,
  );
  const missingVersion = perfectResults(corpus);
  delete missingVersion.host.version;
  assert.throws(
    () => scoreSkillEvalResults(corpus, missingVersion),
    /results\.host\.version must be a string/,
  );
});

test('behavioral scorer reports activation and output failures by case', async () => {
  const corpus = await loadSkillEvalCorpus(corpusPath);
  const results = perfectResults(corpus);
  const baselinePlanBrainstorm = scoreSkillEvalResults(corpus, results)
    .activation.case_owner_activation_matrix.plan.brainstorm;
  const target = results.results.find(({ case_id }) => case_id === 'plan-direct');
  target.activated_skills = ['brainstorm'];
  target.output = 'No acceptance evidence was produced.';

  const score = scoreSkillEvalResults(corpus, results);
  assert.equal(score.ok, false);
  assert.equal(score.failed, 1);
  assert.equal(score.passed, 104);
  assert.equal(score.failures[0].case_id, 'plan-direct');
  assert.match(score.failures[0].reasons.join('\n'), /expected activation: plan/);
  assert.match(score.failures[0].reasons.join('\n'), /forbidden activation: brainstorm/);
  assert.match(score.failures[0].reasons.join('\n'), /output missing/);
  assert.equal(score.activation.missed, 1);
  assert.equal(score.activation.forbidden_activations, 1);
  assert.equal(score.activation.unasserted_activations, 0);
  assert.deepEqual(score.activation.boundary_confusions, [{
    expected: 'plan',
    activated: 'brainstorm',
    count: 1,
    case_ids: ['plan-direct'],
  }]);
  assert.equal(
    score.activation.case_owner_activation_matrix.plan.brainstorm,
    baselinePlanBrainstorm + 1,
  );
});

test('behavioral scorer supports partial exploratory runs explicitly', async () => {
  const corpus = await loadSkillEvalCorpus(corpusPath);
  const results = perfectResults(corpus);
  results.results = results.results.slice(0, 1);

  const strict = scoreSkillEvalResults(corpus, results);
  assert.equal(strict.ok, false);
  assert.equal(strict.missing, 104);

  const partial = scoreSkillEvalResults(corpus, results, { allowMissing: true });
  assert.equal(partial.ok, true);
  assert.equal(partial.passed, 1);
  assert.equal(partial.missing, 104);
});

test('behavioral eval CLI validates the corpus and scores captured host results', async () => {
  const { stdout: validateOutput } = await exec(
    process.execPath,
    ['scripts/eval-skills.mjs', 'validate'],
    { cwd: root },
  );
  assert.equal(
    validateOutput,
    'Validated 105 behavioral cases across 21 skills and 5 categories.\n',
  );

  const corpus = JSON.parse(await readFile(corpusPath, 'utf8'));
  const fixture = await mkdtemp(path.join(tmpdir(), 'nono-skills-eval-'));
  try {
    const resultsPath = path.join(fixture, 'results.json');
    await writeFile(resultsPath, `${JSON.stringify(perfectResults(corpus), null, 2)}\n`);
    const { stdout: scoreOutput, stderr } = await exec(
      process.execPath,
      ['scripts/eval-skills.mjs', 'score', resultsPath],
      { cwd: root },
    );
    assert.match(scoreOutput, /^Host: test-host 1\.0\.0; model test-model\.\nBehavioral eval: 105\/105 passed; 0 failed; 0 missing\.\n/);
    assert.match(scoreOutput, /Activation: asserted precision 1\.000; recall 1\.000; forbidden 0\/\d+; unasserted 0\./);
    assert.equal(stderr, '');
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});
