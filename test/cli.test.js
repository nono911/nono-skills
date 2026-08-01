import assert from 'node:assert/strict';
import test from 'node:test';

import { parseArgs, run } from '../src/cli.js';

function output() {
  let value = '';
  return {
    stream: { write(chunk) { value += String(chunk); } },
    read: () => value,
  };
}

test('parseArgs defaults to help', () => {
  assert.deepEqual(parseArgs([]), {
    command: 'help', target: undefined, force: false, dryRun: false,
    purgeProject: undefined, agentCommand: undefined, provider: undefined, agentPolicy: undefined,
    runCommand: undefined, runId: undefined,
    help: true, version: false,
  });
});

test('parseArgs reads init target and safety flags', () => {
  assert.deepEqual(parseArgs(['init', 'my repo', '--force', '--dry-run']), {
    command: 'init', target: 'my repo', force: true, dryRun: true,
    purgeProject: undefined, agentCommand: undefined, provider: undefined, agentPolicy: undefined,
    runCommand: undefined, runId: undefined,
    help: false, version: false,
  });
});

test('parseArgs reads uninstall purge target', () => {
  assert.equal(parseArgs(['uninstall', '--purge-project', '/tmp/app']).purgeProject, '/tmp/app');
});

test('parseArgs reads agent bridge commands', () => {
  assert.deepEqual(parseArgs(['agents', 'enable', 'claude']), {
    command: 'agents', target: undefined, force: false, dryRun: false,
    purgeProject: undefined, agentCommand: 'enable', provider: 'claude', agentPolicy: undefined,
    runCommand: undefined, runId: undefined,
    help: false, version: false,
  });
  assert.equal(parseArgs(['agents']).agentCommand, 'list');
  assert.equal(parseArgs(['agents', 'policy', 'qwen', 'review-only']).agentPolicy, 'review-only');
  assert.throws(() => parseArgs(['agents', 'enable']), /requires a provider/);
  assert.throws(() => parseArgs(['agents', 'policy', 'qwen']), /requires a policy/);
  assert.throws(() => parseArgs(['agents', 'policy', 'qwen', 'full-access']), /Unknown external agent policy/);
  assert.throws(() => parseArgs(['agents', 'wat']), /Unknown agents command/);
});

test('parseArgs reads run inspection and purge commands', () => {
  const show = parseArgs(['runs', 'show', 'run-1', '/tmp/repo']);
  assert.equal(show.runCommand, 'show');
  assert.equal(show.runId, 'run-1');
  assert.equal(show.target, '/tmp/repo');
  const purge = parseArgs(['runs', 'purge', '--force']);
  assert.equal(purge.runCommand, 'purge');
  assert.equal(purge.force, true);
  assert.equal(parseArgs(['insights', '/tmp/repo']).target, '/tmp/repo');
  assert.throws(() => parseArgs(['runs', 'show']), /requires a run ID/);
  assert.throws(() => parseArgs(['runs', 'wat']), /Unknown runs command/);
});

test('parseArgs reads behavioral eval commands and honest scoring options', () => {
  assert.equal(parseArgs(['eval']).evalCommand, 'validate');
  assert.equal(parseArgs(['eval', 'cases']).evalCommand, 'cases');
  const score = parseArgs(['eval', 'score', 'results.json', '--allow-missing', '--json']);
  assert.equal(score.evalCommand, 'score');
  assert.equal(score.resultsFile, 'results.json');
  assert.equal(score.allowMissing, true);
  assert.equal(score.json, true);
  assert.throws(() => parseArgs(['eval', 'score']), /requires a results file/);
  assert.throws(() => parseArgs(['eval', 'wat']), /Unknown eval command/);
});

test('run rejects an unknown command', async () => {
  const stdout = output();
  const stderr = output();
  const code = await run(['wat'], { stdout: stdout.stream, stderr: stderr.stream, handlers: {} });
  assert.equal(code, 1);
  assert.match(stderr.read(), /Unknown command: wat/);
});

test('run prints version without dispatching', async () => {
  const stdout = output();
  const code = await run(['--version'], {
    stdout: stdout.stream, stderr: output().stream, version: '1.2.3', handlers: {},
  });
  assert.equal(code, 0);
  assert.equal(stdout.read(), '1.2.3\n');
});

test('run prints the package version supplied by the executable', async () => {
  const stdout = output();
  const code = await run(['--version'], {
    stdout: stdout.stream, stderr: output().stream, packageVersion: '0.2.0', handlers: {},
  });
  assert.equal(code, 0);
  assert.equal(stdout.read(), '0.2.0\n');
});

test('run rejects a version request when the package version is unavailable', async () => {
  const stdout = output();
  const stderr = output();
  const code = await run(['--version'], {
    stdout: stdout.stream, stderr: stderr.stream, handlers: {},
  });
  assert.equal(code, 1);
  assert.equal(stdout.read(), '');
  assert.equal(stderr.read(), 'Package version is unavailable\n');
});

test('run dispatches parsed options to a command handler', async () => {
  let received;
  const code = await run(['init', 'repo', '--dry-run'], {
    stdout: output().stream,
    stderr: output().stream,
    handlers: { init: async (options) => { received = options; return 0; } },
  });
  assert.equal(code, 0);
  assert.equal(received.command, 'init');
  assert.equal(received.target, 'repo');
  assert.equal(received.dryRun, true);
});

test('run reports command failures without an unhandled rejection', async () => {
  const stderr = output();
  const code = await run(['install'], {
    stdout: output().stream,
    stderr: stderr.stream,
    handlers: { install: async () => { throw new Error('safe failure'); } },
  });
  assert.equal(code, 1);
  assert.equal(stderr.read(), 'safe failure\n');
});
