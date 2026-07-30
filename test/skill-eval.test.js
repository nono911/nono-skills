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
  assert.deepEqual(summary, { skills: 18, cases: 90, categories: 5 });

  for (const skill of canonicalSkillNames) {
    const categories = corpus.cases
      .filter((evalCase) => evalCase.skill === skill)
      .map((evalCase) => evalCase.category)
      .sort();
    assert.deepEqual(categories, [...skillEvalCategories].sort());
  }
});

test('behavioral scorer accepts provider-neutral conforming results', async () => {
  const corpus = await loadSkillEvalCorpus(corpusPath);
  const score = scoreSkillEvalResults(corpus, perfectResults(corpus));
  assert.deepEqual(
    { ok: score.ok, total: score.total, submitted: score.submitted,
      passed: score.passed, failed: score.failed, missing: score.missing },
    { ok: true, total: 90, submitted: 90, passed: 90, failed: 0, missing: 0 },
  );
  assert.deepEqual(score.failures, []);
});

test('behavioral scorer reports activation and output failures by case', async () => {
  const corpus = await loadSkillEvalCorpus(corpusPath);
  const results = perfectResults(corpus);
  const target = results.results.find(({ case_id }) => case_id === 'plan-direct');
  target.activated_skills = ['brainstorm'];
  target.output = 'No acceptance evidence was produced.';

  const score = scoreSkillEvalResults(corpus, results);
  assert.equal(score.ok, false);
  assert.equal(score.failed, 1);
  assert.equal(score.passed, 89);
  assert.equal(score.failures[0].case_id, 'plan-direct');
  assert.match(score.failures[0].reasons.join('\n'), /expected activation: plan/);
  assert.match(score.failures[0].reasons.join('\n'), /forbidden activation: brainstorm/);
  assert.match(score.failures[0].reasons.join('\n'), /output missing/);
});

test('behavioral scorer supports partial exploratory runs explicitly', async () => {
  const corpus = await loadSkillEvalCorpus(corpusPath);
  const results = perfectResults(corpus);
  results.results = results.results.slice(0, 1);

  const strict = scoreSkillEvalResults(corpus, results);
  assert.equal(strict.ok, false);
  assert.equal(strict.missing, 89);

  const partial = scoreSkillEvalResults(corpus, results, { allowMissing: true });
  assert.equal(partial.ok, true);
  assert.equal(partial.passed, 1);
  assert.equal(partial.missing, 89);
});

test('behavioral eval CLI validates the corpus and scores captured host results', async () => {
  const { stdout: validateOutput } = await exec(
    process.execPath,
    ['scripts/eval-skills.mjs', 'validate'],
    { cwd: root },
  );
  assert.equal(
    validateOutput,
    'Validated 90 behavioral cases across 18 skills and 5 categories.\n',
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
    assert.equal(scoreOutput, 'Behavioral eval: 90/90 passed; 0 failed; 0 missing.\n');
    assert.equal(stderr, '');
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});
