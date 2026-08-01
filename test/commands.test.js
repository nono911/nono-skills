import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { createHandlers } from '../src/commands.js';

function writer() {
  let value = '';
  return { stream: { write(chunk) { value += chunk; } }, read: () => value };
}

test('init creates only repository guidance and preserves legacy artifacts', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'engineering-command-'));
  const packageRoot = path.join(root, 'package');
  const target = path.join(root, 'project');
  await mkdir(path.join(packageRoot, 'templates'), { recursive: true });
  await mkdir(path.join(target, 'docs', 'agent'), { recursive: true });
  await writeFile(path.join(packageRoot, 'templates', 'AGENTS.md'), 'rules');
  await writeFile(path.join(target, 'docs', 'agent', 'spec.md'), 'legacy spec');

  const stdout = writer();
  const handlers = createHandlers({
    packageRoot, home: path.join(root, 'home'), cwd: root,
    packageVersion: '0.2.0', stdout: stdout.stream, stderr: writer().stream,
  });

  assert.equal(await handlers.init({ target, force: false, dryRun: false }), 0);
  assert.equal(await readFile(path.join(target, 'AGENTS.md'), 'utf8'), 'rules');
  assert.equal(await readFile(path.join(target, 'docs', 'agent', 'spec.md'), 'utf8'), 'legacy spec');
  const state = JSON.parse(await readFile(path.join(target, '.codex-engineering-skills.json'), 'utf8'));
  assert.deepEqual(Object.keys(state.files), ['AGENTS.md']);
  assert.match(stdout.read(), /Created 1/);
});

test('init command refuses all writes when a conflict exists', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'engineering-command-'));
  const packageRoot = path.join(root, 'package');
  const target = path.join(root, 'project');
  await mkdir(path.join(packageRoot, 'templates'), { recursive: true });
  await mkdir(target, { recursive: true });
  await writeFile(path.join(packageRoot, 'templates', 'AGENTS.md'), 'rules');
  await writeFile(path.join(packageRoot, 'templates', 'new.md'), 'new');
  await writeFile(path.join(target, 'AGENTS.md'), 'custom');
  const stderr = writer();
  const handlers = createHandlers({ packageRoot, home: path.join(root, 'home'), cwd: root, packageVersion: '0.1.0', stdout: writer().stream, stderr: stderr.stream });
  assert.equal(await handlers.init({ target, force: false, dryRun: false }), 1);
  await assert.rejects(stat(path.join(target, 'new.md')), { code: 'ENOENT' });
  assert.match(stderr.read(), /Conflicts/);
});

test('init without a target writes to the discovered Git root and reports it', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'engineering-command-root-'));
  const packageRoot = path.join(root, 'package');
  const gitRoot = path.join(root, 'repo');
  const nested = path.join(gitRoot, 'packages', 'api');
  await mkdir(path.join(packageRoot, 'templates'), { recursive: true });
  await mkdir(nested, { recursive: true });
  await writeFile(path.join(packageRoot, 'templates', 'AGENTS.md'), 'rules');
  const stdout = writer();
  const handlers = createHandlers({
    packageRoot,
    home: path.join(root, 'home'),
    cwd: nested,
    packageVersion: '0.8.0',
    stdout: stdout.stream,
    stderr: writer().stream,
    findGitRoot: async () => gitRoot,
  });

  assert.equal(await handlers.init({ target: undefined, force: false, dryRun: false }), 0);
  assert.equal(await readFile(path.join(gitRoot, 'AGENTS.md'), 'utf8'), 'rules');
  assert.match(stdout.read(), new RegExp(`Target: ${gitRoot.replaceAll('\\', '\\\\')}`));
});

test('doctor command returns failure when checks fail', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'engineering-command-'));
  const stdout = writer();
  const handlers = createHandlers({
    packageRoot: root, home: path.join(root, 'home'), cwd: root, packageVersion: '0.1.0',
    stdout: stdout.stream, stderr: writer().stream,
    runCodex: async () => ({ code: 127, stdout: '', stderr: 'not found' }),
  });
  assert.equal(await handlers.doctor({}), 1);
  assert.match(stdout.read(), /FAIL codex/);
});

test('agents setup enables compatible local providers without invoking them', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'engineering-command-'));
  const stdout = writer();
  const enabled = [];
  const handlers = createHandlers({
    packageRoot: root,
    home: path.join(root, 'home'),
    cwd: root,
    packageVersion: '0.8.0',
    stdout: stdout.stream,
    stderr: writer().stream,
    agentBridge: {
      listAgentProviders: async () => [{
        name: 'claude', displayName: 'Claude Code', available: true,
        compatible: true, enabled: undefined, version: '2.1.220',
        roles: { review: true, implement: true },
      }],
      setAgentProviderEnabled: async ({ provider, enabled: state }) => {
        enabled.push({ provider, enabled: state });
      },
      setAgentProviderPolicy: async () => {},
    },
  });

  assert.equal(await handlers.agents({ agentCommand: 'setup' }), 0);
  assert.deepEqual(enabled, [{ provider: 'claude', enabled: true }]);
  assert.match(stdout.read(), /ENABLED claude/);
  assert.match(stdout.read(), /per-run consent/);
});

test('agents policy persists an isolated writer only for an implementation-capable provider', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'engineering-command-'));
  const stdout = writer();
  const policies = [];
  const handlers = createHandlers({
    packageRoot: root,
    home: path.join(root, 'home'),
    cwd: root,
    packageVersion: '0.8.0',
    stdout: stdout.stream,
    stderr: writer().stream,
    agentBridge: {
      listAgentProviders: async () => [{
        name: 'qwen', displayName: 'Qwen Code', available: true,
        compatible: true, enabled: true, version: '0.16.2',
        roles: { review: true, implement: true },
      }],
      setAgentProviderEnabled: async () => {},
      setAgentProviderPolicy: async (value) => { policies.push(value); },
    },
  });

  assert.equal(await handlers.agents({
    agentCommand: 'policy',
    provider: 'qwen',
    agentPolicy: 'isolated-writer',
  }), 0);
  assert.deepEqual(policies, [{
    home: path.join(root, 'home'),
    provider: 'qwen',
    policy: 'isolated-writer',
  }]);
  assert.match(stdout.read(), /POLICY qwen: isolated-writer/);
  assert.match(stdout.read(), /per-run consent/);
});

test('agents list distinguishes available, incompatible, and unavailable providers', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'engineering-command-'));
  const stdout = writer();
  const handlers = createHandlers({
    packageRoot: root,
    home: path.join(root, 'home'),
    cwd: root,
    packageVersion: '0.8.0',
    stdout: stdout.stream,
    stderr: writer().stream,
    agentBridge: {
      listAgentProviders: async () => [
        {
          name: 'claude', displayName: 'Claude Code', available: true,
          compatible: true, roles: { review: true, implement: true },
          detail: 'compatible',
        },
        {
          name: 'opencode', displayName: 'OpenCode', available: true,
          compatible: false, roles: { review: false, implement: false },
          detail: 'missing safe flags',
        },
        {
          name: 'qwen', displayName: 'Qwen Code', available: false,
          compatible: false, roles: { review: false, implement: false },
          detail: 'command not found',
        },
      ],
      setAgentProviderEnabled: async () => {},
      setAgentProviderPolicy: async () => {},
    },
  });

  assert.equal(await handlers.agents({ agentCommand: 'list' }), 0);
  assert.match(stdout.read(), /AVAILABLE claude:/);
  assert.match(stdout.read(), /INCOMPATIBLE opencode:/);
  assert.match(stdout.read(), /UNAVAILABLE qwen:/);
});

test('agents doctor fails only when an enabled provider is unavailable', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'engineering-command-'));
  const stdout = writer();
  const handlers = createHandlers({
    packageRoot: root,
    home: path.join(root, 'home'),
    cwd: root,
    packageVersion: '0.8.0',
    stdout: stdout.stream,
    stderr: writer().stream,
    agentBridge: {
      listAgentProviders: async () => [{
        name: 'claude', displayName: 'Claude Code', available: false,
        compatible: false, enabled: true, version: undefined,
        detail: 'command not found',
      }],
      setAgentProviderEnabled: async () => {},
      setAgentProviderPolicy: async () => {},
    },
  });

  assert.equal(await handlers.agents({ agentCommand: 'doctor' }), 1);
  assert.match(stdout.read(), /FAIL claude/);
});

test('run evidence commands inspect insights and require force for purge', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'engineering-command-'));
  const stdout = writer();
  const calls = [];
  const handlers = createHandlers({
    packageRoot: root,
    home: path.join(root, 'home'),
    cwd: root,
    packageVersion: '0.12.0',
    stdout: stdout.stream,
    stderr: writer().stream,
    loopController: {
      async listRuns(options) {
        calls.push(['list', options]);
        return [{ run_id: 'run-1', status: 'COMPLETE' }];
      },
      async showRun(options) {
        calls.push(['show', options]);
        return { state: { run_id: options.runId } };
      },
      async repositoryInsights(options) {
        calls.push(['insights', options]);
        return { completed_runs: 1, recommendations: [] };
      },
      async purgeRepositoryEvidence(options) {
        calls.push(['purge', options]);
        return { removed_runs: 1, repository: options.worktree };
      },
    },
  });

  assert.equal(await handlers.runs({ runCommand: 'list' }), 0);
  assert.equal(await handlers.runs({ runCommand: 'show', runId: 'run-1' }), 0);
  assert.equal(await handlers.insights({}), 0);
  await assert.rejects(handlers.runs({ runCommand: 'purge', force: false }), /requires --force/);
  assert.equal(await handlers.runs({ runCommand: 'purge', force: true }), 0);
  assert.deepEqual(calls.map(([name]) => name), ['list', 'show', 'insights', 'purge']);
  assert.ok(calls.every(([, options]) => options.worktree === root));
  assert.match(stdout.read(), /run-1/);
  assert.match(stdout.read(), /completed_runs/);
  assert.match(stdout.read(), /Purged 1 local loop run/);
});

test('purge preflight fails before uninstall when project state is missing', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'engineering-command-'));
  let uninstallCalls = 0;
  const handlers = createHandlers({
    packageRoot: root, home: path.join(root, 'home'), cwd: root, packageVersion: '0.1.0',
    stdout: writer().stream, stderr: writer().stream,
    uninstallPlugin: async () => { uninstallCalls += 1; },
  });
  await assert.rejects(handlers.uninstall({ purgeProject: path.join(root, 'missing') }), /ownership state not found/);
  assert.equal(uninstallCalls, 0);
});
