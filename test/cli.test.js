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
    purgeProject: undefined, help: true, version: false,
  });
});

test('parseArgs reads init target and safety flags', () => {
  assert.deepEqual(parseArgs(['init', 'my repo', '--force', '--dry-run']), {
    command: 'init', target: 'my repo', force: true, dryRun: true,
    purgeProject: undefined, help: false, version: false,
  });
});

test('parseArgs reads uninstall purge target', () => {
  assert.equal(parseArgs(['uninstall', '--purge-project', '/tmp/app']).purgeProject, '/tmp/app');
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
