#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import {
  assertHostEvalCorpus,
  loadHostEvalCorpus,
  scoreHostEvalResults,
} from '../src/host-eval.js';

const root = path.resolve(import.meta.dirname, '..');
const defaultCorpus = path.join(root, 'evals', 'host-behavior.json');

function usage() {
  console.error(`Usage:
  node scripts/eval-host.mjs validate [corpus.json]
  node scripts/eval-host.mjs cases [corpus.json]
  node scripts/eval-host.mjs score <results.json> [corpus.json] [--allow-missing]
  node scripts/eval-host.mjs run --adapter <executable> --output <results.json>
      [--adapter-arg <value> ...] [--corpus <corpus.json>]`);
}

async function readJson(file) {
  return JSON.parse(await readFile(path.resolve(file), 'utf8'));
}

function requestFor(evalCase, variant) {
  return {
    protocol_version: 1,
    case_id: evalCase.id,
    variant,
    prompt: variant === 'skill' ? evalCase.skill_prompt : evalCase.baseline_prompt,
    skills_enabled: variant === 'skill',
    isolation: 'fresh-session',
    response_contract: {
      activated_skills: 'canonical nono-skills names only',
      output: 'final user-facing text',
      metrics: [
        'duration_ms',
        'time_to_first_action_ms',
        'tool_calls',
        'tool_calls_before_first_action',
        'loaded_skill_bodies',
        'loaded_references',
        'questions',
      ],
    },
  };
}

function runAdapter(executable, args, request) {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, { stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Host eval adapter failed for ${request.case_id}/${request.variant}: ${stderr.trim() || `exit ${code}`}`));
        return;
      }
      try {
        resolve(JSON.parse(stdout));
      } catch {
        reject(new Error(`Host eval adapter returned malformed JSON for ${request.case_id}/${request.variant}`));
      }
    });
    child.stdin.end(`${JSON.stringify(request)}\n`);
  });
}

function parseRunArgs(args) {
  const options = { adapterArgs: [], corpus: defaultCorpus };
  const values = [...args];
  while (values.length) {
    const value = values.shift();
    if (value === '--adapter') options.adapter = values.shift();
    else if (value === '--adapter-arg') options.adapterArgs.push(values.shift());
    else if (value === '--output') options.output = values.shift();
    else if (value === '--corpus') options.corpus = values.shift();
    else throw new Error(`Unknown host eval option: ${value}`);
  }
  if (!options.adapter) throw new Error('host eval run requires --adapter');
  if (!options.output) throw new Error('host eval run requires --output');
  if (options.adapterArgs.some((value) => value === undefined)) {
    throw new Error('--adapter-arg requires a value');
  }
  return options;
}

async function capture(options) {
  const corpus = await loadHostEvalCorpus(options.corpus);
  const results = [];
  let host;
  for (const evalCase of corpus.cases) {
    const skillResponse = await runAdapter(
      options.adapter,
      options.adapterArgs,
      requestFor(evalCase, 'skill'),
    );
    const baselineResponse = await runAdapter(
      options.adapter,
      options.adapterArgs,
      requestFor(evalCase, 'baseline'),
    );
    host ??= skillResponse.host;
    if (JSON.stringify(skillResponse.host) !== JSON.stringify(host)
      || JSON.stringify(baselineResponse.host) !== JSON.stringify(host)) {
      throw new Error('Host eval adapter changed host identity during one run');
    }
    results.push({
      case_id: evalCase.id,
      skill: {
        activated_skills: skillResponse.activated_skills,
        output: skillResponse.output,
        metrics: skillResponse.metrics,
      },
      baseline: {
        activated_skills: baselineResponse.activated_skills,
        output: baselineResponse.output,
        metrics: baselineResponse.metrics,
      },
    });
  }
  const captured = { schema_version: 1, host, results };
  const score = scoreHostEvalResults(corpus, captured);
  await writeFile(path.resolve(options.output), `${JSON.stringify(captured, null, 2)}\n`, { mode: 0o600 });
  return score;
}

const [command = 'validate', ...rawArgs] = process.argv.slice(2);
const allowMissing = rawArgs.includes('--allow-missing');
const args = rawArgs.filter((argument) => argument !== '--allow-missing');

try {
  if (command === 'validate') {
    const corpus = await loadHostEvalCorpus(args[0] ?? defaultCorpus);
    const summary = assertHostEvalCorpus(corpus);
    console.log(`Validated ${summary.cases} black-box host behavior cases.`);
  } else if (command === 'cases') {
    const corpus = await loadHostEvalCorpus(args[0] ?? defaultCorpus);
    for (const evalCase of corpus.cases) {
      console.log(JSON.stringify(requestFor(evalCase, 'skill')));
      console.log(JSON.stringify(requestFor(evalCase, 'baseline')));
    }
  } else if (command === 'score') {
    if (!args[0]) throw new Error('host eval score requires a results file');
    const corpus = await loadHostEvalCorpus(args[1] ?? defaultCorpus);
    const score = scoreHostEvalResults(corpus, await readJson(args[0]), { allowMissing });
    console.log(`Host eval: ${score.passed}/${score.total} passed; ${score.failed} failed; ${score.missing} missing.`);
    console.log(`Median first-action tax: ${score.performance.median_first_action_tax_ratio ?? 'n/a'}x; duration tax: ${score.performance.median_duration_tax_ratio ?? 'n/a'}x.`);
    for (const failure of score.failures) console.error(`${failure.case_id}: ${failure.reasons.join('; ')}`);
    if (!score.ok) process.exitCode = 1;
  } else if (command === 'run') {
    const score = await capture(parseRunArgs(args));
    console.log(`Host eval: ${score.passed}/${score.total} passed; ${score.failed} failed; ${score.missing} missing.`);
    console.log(`Median first-action tax: ${score.performance.median_first_action_tax_ratio ?? 'n/a'}x; duration tax: ${score.performance.median_duration_tax_ratio ?? 'n/a'}x.`);
    for (const failure of score.failures) console.error(`${failure.case_id}: ${failure.reasons.join('; ')}`);
    if (!score.ok) process.exitCode = 1;
  } else {
    usage();
    process.exitCode = 2;
  }
} catch (error) {
  console.error(error?.stack ?? error);
  process.exitCode = 1;
}
