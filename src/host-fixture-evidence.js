import { isDeepStrictEqual } from 'node:util';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const implementationCase = 'implement-small-fast-path';
const metadataCase = 'implement-low-impact-verification';

function observation(id, status) {
  return { id, status, source: 'runner' };
}

function commandStatus(result) {
  if (result.error || result.signal || result.status === 125) return 'blocked';
  return result.status === 0 ? 'passed' : 'failed';
}

// These checks belong to the fixed evaluation fixture, not to skill instructions
// or model-authored reports. Do not accept executable commands from a corpus.
export async function captureFixtureEvidence(workspace, caseId, { run } = {}) {
  if (![implementationCase, metadataCase].includes(caseId)) return [];
  const scopeId = caseId === metadataCase ? 'metadata-only-change' : 'regression-test-change';
  if (!run) return [caseId === metadataCase ? 'package-description' : 'parser-contract', scopeId, 'fixture-tests']
    .map((id) => observation(id, 'blocked'));
  const execute = (command, args) => run(command, args, {
    cwd: workspace, encoding: 'utf8', timeout: 15_000, maxBuffer: 1_048_576,
  });
  const observations = [];
  if (caseId === implementationCase) {
    const probe = execute(process.execPath, ['--input-type=module', '-e', `
      import assert from 'node:assert/strict';
      import { parseItems, parseRetryCount } from './src/parser.js';
      assert.deepEqual(parseItems(null), []);
      assert.deepEqual(parseItems(undefined), []);
      assert.deepEqual(parseItems({ items: [' one ', 2] }), ['one', '2']);
      assert.equal(parseRetryCount(0), 0);
      assert.equal(parseRetryCount(undefined), 3);
      assert.throws(() => parseRetryCount(-1));
    `]);
    observations.push(observation('parser-contract', commandStatus(probe)));
  } else {
    try {
      const metadata = JSON.parse(await readFile(path.join(workspace, 'package.json'), 'utf8'));
      observations.push(observation('package-description',
        metadata.description === 'Nono Skills host evaluation fixture' ? 'passed' : 'failed'));
    } catch {
      observations.push(observation('package-description', 'failed'));
    }
  }

  const tracked = execute('git', ['diff', '--no-ext-diff', '--no-textconv', '--name-only', 'HEAD', '--']);
  const untracked = execute('git', ['ls-files', '--others', '--exclude-standard']);
  if (commandStatus(tracked) !== 'passed' || commandStatus(untracked) !== 'passed') {
    observations.push(observation(scopeId, 'blocked'));
  } else {
    const changed = `${tracked.stdout}\n${untracked.stdout}`.split(/\r?\n/).filter(Boolean);
    let valid = changed.length === 1 && changed[0] === 'package.json';
    if (caseId === metadataCase && valid) {
      const original = execute('git', ['show', 'HEAD:package.json']);
      try {
        const current = JSON.parse(await readFile(path.join(workspace, 'package.json'), 'utf8'));
        const expected = { ...JSON.parse(original.stdout), description: 'Nono Skills host evaluation fixture' };
        valid = commandStatus(original) === 'passed' && isDeepStrictEqual(current, expected);
      } catch { valid = false; }
    }
    if (caseId === implementationCase) {
      const tests = await Promise.all(changed.filter((file) => /^test\/.*\.(?:cjs|mjs|js)$/.test(file)).map(async (file) => {
        try { return (await readFile(path.join(workspace, file), 'utf8')).trim().length > 0; }
        catch { return false; }
      }));
      valid = tests.some(Boolean);
    }
    observations.push(observation(scopeId, valid ? 'passed' : 'failed'));
  }
  observations.push(observation('fixture-tests', commandStatus(
    execute(process.execPath, ['--test']),
  )));
  return observations;
}
