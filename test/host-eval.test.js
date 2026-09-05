import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { promisify } from 'node:util';

import {
  assertHostEvalCorpus,
  loadHostEvalCorpus,
  scoreHostEvalResults,
} from '../src/host-eval.js';

const exec = promisify(execFile);
const root = path.resolve(import.meta.dirname, '..');
const corpusPath = path.join(root, 'evals', 'host-behavior.json');

const metrics = Object.freeze({
  duration_ms: 100,
  time_to_first_action_ms: 20,
  tool_calls: 2,
  tool_calls_before_first_action: 1,
  loaded_skill_bodies: 1,
  loaded_references: 1,
  questions: 0,
});

function outputFor(evalCase) {
  return [
    ...(evalCase.expect.output.contains_all ?? []),
    ...(evalCase.expect.output.contains_any?.slice(0, 1) ?? []),
  ].join(' | ');
}

function conformingResults(corpus) {
  return {
    schema_version: 1,
    host: { name: 'test-host', model: 'test-model', version: '1.0.0' },
    results: corpus.cases.map((evalCase) => ({
      case_id: evalCase.id,
      skill: {
        activated_skills: evalCase.expect.activate,
        output: outputFor(evalCase),
        metrics: {
          ...metrics,
          questions: evalCase.expect.performance.min_questions ?? 0,
        },
      },
      baseline: {
        activated_skills: [],
        output: 'baseline result',
        metrics,
      },
    })),
  };
}

test('black-box corpus defines bounded fast paths and requirement discovery cases', async () => {
  const corpus = await loadHostEvalCorpus(corpusPath);
  assert.deepEqual(assertHostEvalCorpus(corpus), { cases: 10 });
  assert.ok(corpus.cases.some((entry) => entry.id === 'plan-complete-fast-path'));
  assert.ok(corpus.cases.some((entry) => entry.id === 'plan-small-scope-calibration'));
  assert.ok(corpus.cases.some((entry) => entry.id === 'brainstorm-small-scope-calibration'));
  assert.ok(corpus.cases.some((entry) => entry.id === 'implement-low-impact-verification'));
  assert.ok(corpus.cases.some((entry) => entry.id === 'delivery-large-scope-slicing'));
  assert.ok(corpus.cases.some((entry) => entry.id === 'communicate-simple-fast-path'));
  assert.ok(corpus.cases.some((entry) => entry.id === 'handoff-chat-fast-path'));
  const planSmall = corpus.cases.find((entry) => entry.id === 'plan-small-scope-calibration');
  const brainstormSmall = corpus.cases.find(
    (entry) => entry.id === 'brainstorm-small-scope-calibration',
  );
  const implementLowImpact = corpus.cases.find(
    (entry) => entry.id === 'implement-low-impact-verification',
  );
  const communication = corpus.cases.find(
    (entry) => entry.id === 'communicate-simple-fast-path',
  );
  assert.equal(planSmall.expect.performance.max_output_words, 220);
  assert.equal(brainstormSmall.expect.performance.max_output_words, 180);
  assert.equal(implementLowImpact.expect.performance.max_tool_calls, 6);
  assert.equal(communication.expect.performance.max_output_words, 24);
  assert.equal(planSmall.expect.output.not_contains, undefined);
  assert.equal(brainstormSmall.expect.output.not_contains, undefined);
});

test('black-box corpus does not claim unobserved TDD action ordering', async () => {
  const corpus = await loadHostEvalCorpus(corpusPath);
  const implement = corpus.cases.find((entry) => entry.id === 'implement-small-fast-path');
  const asserted = [
    ...(implement.expect.output.contains_all ?? []),
    ...(implement.expect.output.contains_any ?? []),
  ];
  assert.equal(asserted.includes('RED'), false);
  assert.equal(asserted.includes('GREEN'), false);

  const assurance = await readFile(path.join(root, 'docs', 'assurance.md'), 'utf8');
  assert.match(assurance, /does not observe or prove file-edit or test-execution ordering/);
});

test('black-box scorer combines behavior and skill-tax budgets', async () => {
  const corpus = await loadHostEvalCorpus(corpusPath);
  const results = conformingResults(corpus);
  const score = scoreHostEvalResults(corpus, results);
  assert.equal(score.ok, true);
  assert.equal(score.passed, 10);
  assert.equal(score.performance.median_first_action_tax_ratio, 1);

  results.results[0].skill.metrics.questions = 4;
  results.results[0].skill.metrics.time_to_first_action_ms = 1000;
  const failed = scoreHostEvalResults(corpus, results);
  assert.equal(failed.ok, false);
  assert.match(failed.failures[0].reasons.join('\n'), /questions/);
  assert.match(failed.failures[0].reasons.join('\n'), /first-action tax ratio/);

  const planSmall = results.results.find(
    (entry) => entry.case_id === 'plan-small-scope-calibration',
  );
  planSmall.skill.output = Array.from({ length: 221 }, () => 'word').join(' ');
  const verbose = scoreHostEvalResults(corpus, results);
  const planFailure = verbose.failures.find(
    (entry) => entry.case_id === 'plan-small-scope-calibration',
  );
  assert.match(planFailure.reasons.join('\n'), /output words was 221, budget 220/);

  const implementLowImpact = results.results.find(
    (entry) => entry.case_id === 'implement-low-impact-verification',
  );
  implementLowImpact.skill.metrics.tool_calls = 7;
  const overtested = scoreHostEvalResults(corpus, results);
  const implementationFailure = overtested.failures.find(
    (entry) => entry.case_id === 'implement-low-impact-verification',
  );
  assert.match(implementationFailure.reasons.join('\n'), /tool calls was 7, budget 6/);
});

test('positive output assertions treat hyphenated and spaced wording as equivalent', async () => {
  const corpus = await loadHostEvalCorpus(corpusPath);
  const results = conformingResults(corpus);
  const communication = results.results.find(
    (entry) => entry.case_id === 'communicate-simple-fast-path',
  );
  communication.skill.output = 'The optional field is backward-compatible and requires no migration.';
  assert.equal(scoreHostEvalResults(corpus, results).ok, true);
});

test('host result validation rejects a contaminated baseline activation', async () => {
  const corpus = await loadHostEvalCorpus(corpusPath);
  const results = conformingResults(corpus);
  results.results[0].baseline.activated_skills = ['plan'];
  assert.throws(
    () => scoreHostEvalResults(corpus, results),
    /baseline must not activate nono-skills/,
  );
});

test('host eval CLI validates cases and runs a fresh-process adapter for both variants', async (t) => {
  const fixture = await mkdtemp(path.join(os.tmpdir(), 'nono-host-eval-'));
  t.after(() => rm(fixture, { recursive: true, force: true }));
  const corpus = {
    schema_version: 1,
    cases: [{
      id: 'plan-fast-path',
      skill: 'plan',
      skill_prompt: 'Use $plan to produce a concise acceptance plan with evidence.',
      baseline_prompt: 'Produce a concise acceptance plan with evidence and no extra ceremony.',
      expect: {
        activate: ['plan'],
        forbid: [],
        output: { contains_all: ['acceptance', 'evidence'] },
        performance: {
          max_questions: 0,
          max_activated_skills: 1,
          max_tool_calls: 2,
          max_tool_calls_before_first_action: 1,
          max_loaded_skill_bodies: 1,
          max_loaded_references: 0,
          max_output_words: 10,
          max_first_action_tax_ratio: 2,
        },
      },
    }],
  };
  const customCorpus = path.join(fixture, 'corpus.json');
  const adapter = path.join(fixture, 'adapter.mjs');
  const output = path.join(fixture, 'results.json');
  await writeFile(customCorpus, `${JSON.stringify(corpus)}\n`);
  await writeFile(adapter, `
let input = '';
for await (const chunk of process.stdin) input += chunk;
const request = JSON.parse(input);
console.log(JSON.stringify({
  host: { name: 'fixture', model: 'fixture-model', version: '1' },
  activated_skills: request.skills_enabled ? ['plan'] : [],
  output: 'acceptance evidence',
  metrics: {
    duration_ms: 10,
    time_to_first_action_ms: 5,
    tool_calls: 1,
    tool_calls_before_first_action: 1,
    loaded_skill_bodies: request.skills_enabled ? 1 : 0,
    loaded_references: 0,
    questions: 0
  }
}));
`);

  const { stdout: validateOutput } = await exec(process.execPath, [
    'scripts/eval-host.mjs', 'validate', customCorpus,
  ], { cwd: root });
  assert.equal(validateOutput, 'Validated 1 black-box host behavior cases.\n');

  const { stdout: runOutput } = await exec(process.execPath, [
    'scripts/eval-host.mjs', 'run',
    '--adapter', process.execPath,
    '--adapter-arg', adapter,
    '--output', output,
    '--corpus', customCorpus,
  ], { cwd: root });
  assert.match(runOutput, /Host eval: 1\/1 passed/);
  const captured = JSON.parse(await readFile(output, 'utf8'));
  assert.equal(captured.results[0].skill.activated_skills[0], 'plan');
  assert.equal(captured.results[0].baseline.activated_skills.length, 0);
});
