import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { createCodexFixtureRunner } from '../src/codex-fixture-sandbox.js';

test('fixture sandbox rejects unsupported hosts and failed preflight without executing model code', async () => {
  let calls = 0;
  const run = createCodexFixtureRunner({ codex: 'codex', home: '/unused', workspace: '/unused',
    run: () => { calls += 1; return { status: 1, stdout: '' }; },
  });
  assert.ok(run('node', ['malicious.js']).error);
  assert.equal(calls, 1);
});

test('local sandbox denies outside reads, writes, and network for fixture code', {
  skip: process.env.NONO_SANDBOX_SMOKE !== '1',
}, async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'nono-sandbox-smoke-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const home = path.join(root, 'home');
  const workspace = path.join(root, 'workspace');
  const outside = path.join(root, 'outside.txt');
  await mkdir(home);
  await mkdir(workspace);
  await writeFile(outside, 'fixture-only canary');
  const run = createCodexFixtureRunner({ codex: 'codex', home, workspace });
  const result = run(process.execPath, ['-e', `
    const assert = require('node:assert/strict');
    const fs = require('node:fs');
    assert.throws(() => fs.readFileSync(${JSON.stringify(outside)}));
    assert.throws(() => fs.writeFileSync('denied.txt', 'no'));
    assert.equal(process.env.CODEX_API_KEY, undefined);
    assert.equal(process.env.NODE_OPTIONS, undefined);
    const server = require('node:net').createServer();
    server.once('error', (error) => assert.ok(['EPERM', 'EACCES'].includes(error.code)));
    server.listen(0, '127.0.0.1', () => { server.close(); process.exitCode = 1; });
  `]);
  assert.equal(result.status, 0, result.error?.message ?? result.stderr);
});

test('fixture runner uses a credential-free deny-by-default sandbox with no fallback', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'nono-sandbox-unit-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const home = path.join(root, 'home');
  const workspace = path.join(root, 'workspace');
  await mkdir(home);
  await mkdir(workspace);
  const calls = [];
  const execute = (command, args, options) => {
    calls.push({ command, args, options });
    return { status: 0, stdout: '--permission-profile' };
  };
  const run = createCodexFixtureRunner({ codex: 'codex', home, workspace, run: execute });
  run(process.execPath, ['--test']);
  assert.equal(calls.length, 3);
  const call = calls[2];
  assert.equal(call.command, 'codex');
  assert.deepEqual(call.args.slice(0, 5), ['sandbox', '--permission-profile', 'nono-fixture', '--cd', home]);
  assert.match(call.args[6], /":root"="deny"/);
  assert.match(call.args[6], /network=\{enabled=false\}/);
  assert.equal(call.options.env.HOME, home);
  assert.equal(call.options.env.CODEX_HOME, home);
  for (const key of ['CODEX_API_KEY', 'OPENAI_API_KEY', 'NODE_OPTIONS', 'SSH_AUTH_SOCK']) {
    assert.equal(call.options.env[key], undefined);
  }
  const unavailable = createCodexFixtureRunner({ codex: 'codex', home, workspace,
    run: (_command, args) => args.includes('--help')
      ? { status: 0, stdout: '--permission-profile' } : { status: 1 },
  });
  assert.ok(unavailable(process.execPath, ['--test']).error);
});
