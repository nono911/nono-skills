#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import path from 'node:path';

import {
  assertSkillEvalCorpus,
  loadSkillEvalCorpus,
  scoreSkillEvalResults,
} from '../src/skill-eval.js';

const root = path.resolve(import.meta.dirname, '..');
const defaultCorpus = path.join(root, 'evals', 'skill-behavior.json');

function usage() {
  console.error(`Usage:
  npm run eval:skills
  node scripts/eval-skills.mjs validate [corpus.json]
  node scripts/eval-skills.mjs cases [corpus.json]
  node scripts/eval-skills.mjs score <results.json> [corpus.json] [--allow-missing]`);
}

async function readJson(file) {
  return JSON.parse(await readFile(path.resolve(file), 'utf8'));
}

const [command = 'validate', ...rawArgs] = process.argv.slice(2);
const allowMissing = rawArgs.includes('--allow-missing');
const args = rawArgs.filter((argument) => argument !== '--allow-missing');

try {
  if (command === 'validate') {
    const corpus = await loadSkillEvalCorpus(args[0] ?? defaultCorpus);
    const summary = assertSkillEvalCorpus(corpus);
    console.log(
      `Validated ${summary.cases} behavioral cases across ${summary.skills} skills and ${summary.categories} categories.`,
    );
  } else if (command === 'cases') {
    const corpus = await loadSkillEvalCorpus(args[0] ?? defaultCorpus);
    for (const { id, skill, category, prompt } of corpus.cases) {
      console.log(JSON.stringify({ case_id: id, skill, category, prompt }));
    }
  } else if (command === 'score') {
    if (!args[0]) {
      usage();
      process.exitCode = 2;
    } else {
      const corpus = await loadSkillEvalCorpus(args[1] ?? defaultCorpus);
      const results = await readJson(args[0]);
      const score = scoreSkillEvalResults(corpus, results, { allowMissing });
      console.log(
        `Behavioral eval: ${score.passed}/${score.total} passed; ${score.failed} failed; ${score.missing} missing.`,
      );
      for (const failure of score.failures) {
        console.error(`${failure.case_id}: ${failure.reasons.join('; ')}`);
      }
      if (!score.ok) process.exitCode = 1;
    }
  } else {
    usage();
    process.exitCode = 2;
  }
} catch (error) {
  console.error(error?.stack ?? error);
  process.exitCode = 1;
}
