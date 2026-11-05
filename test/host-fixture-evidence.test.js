import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { captureFixtureEvidence } from '../src/host-fixture-evidence.js';

async function fixture(t) {
  const workspace = await mkdtemp(path.join(os.tmpdir(), 'nono-fixture-proof-'));
  t.after(() => rm(workspace, { recursive: true, force: true }));
  await cp(path.resolve(import.meta.dirname, '../evals/fixtures/stable-repository'), workspace, { recursive: true });
  for (const args of [
    ['init', '--quiet'], ['add', '.'],
    ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '--quiet', '-m', 'test: initialize fixture'],
  ]) {
    const result = spawnSync('git', args, { cwd: workspace, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
  }
  return workspace;
}

function statuses(evidence) {
  return Object.fromEntries(evidence.map((item) => [item.id, item.status]));
}

test('runner detects the original null defect despite passing original fixture tests', async (t) => {
  const workspace = await fixture(t);
  assert.deepEqual(statuses(await captureFixtureEvidence(workspace, 'implement-small-fast-path', { run: spawnSync })), {
    'parser-contract': 'failed', 'regression-test-change': 'failed', 'fixture-tests': 'passed',
  });
  const source = path.join(workspace, 'src/parser.js');
  await writeFile(source, (await readFile(source, 'utf8')).replace('return input.items', 'if (input == null) return [];\n  return input.items'));
  const regression = path.join(workspace, 'test/parser.test.js');
  await writeFile(regression, (await readFile(regression, 'utf8')) + "\ntest('null input is empty', () => assert.deepEqual(parseItems(null), []));\n");
  assert.deepEqual(statuses(await captureFixtureEvidence(workspace, 'implement-small-fast-path', { run: spawnSync })), {
    'parser-contract': 'passed', 'regression-test-change': 'passed', 'fixture-tests': 'passed',
  });
  await rm(regression);
  await writeFile(path.join(workspace, 'test/README.md'), 'Not executable regression coverage');
  assert.equal(statuses(await captureFixtureEvidence(workspace, 'implement-small-fast-path', { run: spawnSync }))['regression-test-change'], 'failed');
});

test('metadata proof checks actual JSON and rejects unrelated file changes', async (t) => {
  const workspace = await fixture(t);
  assert.equal(statuses(await captureFixtureEvidence(workspace, 'implement-low-impact-verification', { run: spawnSync }))['package-description'], 'failed');
  const file = path.join(workspace, 'package.json');
  const value = JSON.parse(await readFile(file, 'utf8'));
  value.description = 'Nono Skills host evaluation fixture';
  await writeFile(file, JSON.stringify(value));
  assert.deepEqual(statuses(await captureFixtureEvidence(workspace, 'implement-low-impact-verification', { run: spawnSync })), {
    'package-description': 'passed', 'metadata-only-change': 'passed', 'fixture-tests': 'passed',
  });
  value.scripts.test = 'echo skipped';
  await writeFile(file, JSON.stringify(value));
  assert.equal(statuses(await captureFixtureEvidence(workspace, 'implement-low-impact-verification', { run: spawnSync }))['metadata-only-change'], 'failed');
  value.scripts.test = 'node --test';
  await writeFile(file, JSON.stringify(value));
  await writeFile(path.join(workspace, 'extra.txt'), 'unrelated');
  assert.equal(statuses(await captureFixtureEvidence(workspace, 'implement-low-impact-verification', { run: spawnSync }))['metadata-only-change'], 'failed');
});

test('unsupported cases produce no fabricated observations and command failures remain blocked', async (t) => {
  assert.deepEqual(await captureFixtureEvidence('/unused', 'plan-small-scope-calibration'), []);
  const workspace = await fixture(t);
  const result = await captureFixtureEvidence(workspace, 'implement-small-fast-path', {
    run: () => ({ error: new Error('unavailable') }),
  });
  assert.ok(result.every((item) => item.status === 'blocked'));
});

test('fixture checks fail closed when no sandbox runner is supplied', async (t) => {
  const workspace = await fixture(t);
  const result = await captureFixtureEvidence(workspace, 'implement-small-fast-path');
  assert.equal(result.length, 3);
  assert.ok(result.every((item) => item.status === 'blocked'));
});
