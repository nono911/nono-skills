import assert from 'node:assert/strict';
import { mkdtemp, realpath, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  buildClaudeArgs,
  buildCodeWhaleArgs,
  buildCodexArgs,
  buildOpenCodeArgs,
  buildQwenArgs,
  inspectAgentProvider,
  listAgentProviders,
  providerAdapters,
  readAgentConfig,
  runCommand,
  runExternalAgent,
  selectAgentProviders,
  setAgentProviderEnabled,
  setAgentProviderPolicy,
} from '../plugin/skills/delivery-loop/scripts/agent-bridge.mjs';
import {
  reviewSchema,
} from '../plugin/skills/delivery-loop/scripts/provider-contract.mjs';

const help = {
  claude: [
    '--print',
    '--output-format',
    '--permission-mode',
    '--tools',
    '--allowedTools',
    '--no-session-persistence',
    '--safe-mode',
    '--json-schema',
    '--max-budget-usd',
    '--max-turns',
  ].join('\n'),
  codex: [
    '--sandbox',
    '--cd',
    '--ephemeral',
    '--ignore-user-config',
    '--output-schema',
    '--disable',
  ].join('\n'),
  qwen: [
    '--safe-mode',
    '--sandbox',
    '--approval-mode',
    '--exclude-tools',
    '--json-schema',
    '--max-session-turns',
    '--max-tool-calls',
    '--max-wall-time',
  ].join('\n'),
  opencodeRoot: '--pure\n',
  opencodeRun: '--auto\n--format\n--dir\n',
  codewhaleRoot: '--approval-policy\n--sandbox-mode\n--workspace\n',
  codewhaleExec: '--auto\n--json\n',
  antigravity: '--sandbox\n',
};

const versions = {
  claude: '2.1.220',
  codex: '0.145.0',
  qwen: '0.16.2',
  opencode: '1.3.0',
  codewhale: '0.8.62',
  agy: '1.1.0',
};

const taskPacket = {
  task_id: 'review-1',
  role: 'review',
  base_sha: 'abc123',
  head_sha: 'def456',
  input_digest: `sha256:${'a'.repeat(64)}`,
  goal: 'review the current diff',
  read_scope: ['approved worktree'],
  write_scope: [],
  forbidden_actions: [
    'delegate again',
    'read secrets',
    'commit',
    'push',
    'merge',
    'deploy',
    'change external state',
  ],
};

function taskPacketFor(worktree, overrides = {}) {
  return { ...taskPacket, worktree, ...overrides };
}

const reviewOutput = {
  task_id: taskPacket.task_id,
  base_sha: taskPacket.base_sha,
  input_digest: taskPacket.input_digest,
  status: 'completed',
  scope_completed: true,
  summary: 'Reviewed the current diff',
  files: [],
  verification: [],
  verification_not_run: [],
  assumptions: [],
  risks: [],
  questions: [],
  decision_log_records: [],
  findings: [],
};

function providerRunner(calls, output = reviewOutput) {
  return async (command, args, options = {}) => {
    calls.push({ command, args, options });
    if (args[0] === '--version') {
      return { code: 0, stdout: `${versions[command] ?? versions.agy}\n`, stderr: '' };
    }
    if (command === 'codex' && args[0] === 'exec' && args[1] === '--help') {
      return { code: 0, stdout: help.codex, stderr: '' };
    }
    if (command === 'opencode' && args[0] === '--help') {
      return { code: 0, stdout: help.opencodeRoot, stderr: '' };
    }
    if (command === 'opencode' && args[0] === 'run' && args[1] === '--help') {
      return { code: 0, stdout: help.opencodeRun, stderr: '' };
    }
    if (command === 'codewhale' && args[0] === '--help') {
      return { code: 0, stdout: help.codewhaleRoot, stderr: '' };
    }
    if (command === 'codewhale' && args[0] === 'exec' && args[1] === '--help') {
      return { code: 0, stdout: help.codewhaleExec, stderr: '' };
    }
    if (command === 'codewhale' && args[0] === 'doctor') {
      return {
        code: 0,
        stdout: JSON.stringify({
          sandbox: { available: true, kind: 'test-sandbox' },
          capability: { resolved_provider: 'deepseek', resolved_model: 'deepseek-v4-pro' },
        }),
        stderr: '',
      };
    }
    if (args[0] === '--help') {
      return { code: 0, stdout: help[command] ?? help.antigravity, stderr: '' };
    }
    if (command === 'claude') {
      return {
        code: 0,
        stdout: JSON.stringify({
          type: 'result',
          subtype: 'success',
          is_error: false,
          total_cost_usd: 0.04,
          duration_ms: 1200,
          num_turns: 4,
          structured_output: output,
        }),
        stderr: '',
      };
    }
    if (command === 'opencode') {
      return {
        code: 0,
        stdout: `${JSON.stringify({ type: 'text', part: { text: JSON.stringify(output) } })}\n`,
        stderr: '',
      };
    }
    if (command === 'codewhale') {
      return {
        code: 0,
        stdout: JSON.stringify({ response: JSON.stringify(output) }),
        stderr: '',
      };
    }
    return { code: 0, stdout: `${JSON.stringify(output)}\n`, stderr: '' };
  };
}

function gitRunner(worktree) {
  return async (command, args) => {
    assert.equal(command, 'git');
    if (args.includes('--show-toplevel')) {
      return { code: 0, stdout: `${worktree}\n`, stderr: '' };
    }
    if (args.at(-1) === 'HEAD') {
      return { code: 0, stdout: `${taskPacket.head_sha}\n`, stderr: '' };
    }
    if (args.includes('status')) return { code: 0, stdout: '', stderr: '' };
    if (args.includes('cat-file')) return { code: 0, stdout: '', stderr: '' };
    throw new Error(`Unexpected Git probe: ${args.join(' ')}`);
  };
}

test('provider registry exposes native adapters and detects Antigravity without automating its TUI', async () => {
  assert.deepEqual(Object.keys(providerAdapters), [
    'claude',
    'codex',
    'qwen',
    'opencode',
    'codewhale',
    'antigravity',
  ]);
  const calls = [];
  const inspected = await inspectAgentProvider('antigravity', {
    runCommand: providerRunner(calls),
    env: {},
  });
  assert.equal(inspected.available, true);
  assert.equal(inspected.compatible, false);
  assert.deepEqual(inspected.roles, { review: false, implement: false });
  assert.match(inspected.detail, /TUI-first/);
  assert.ok(providerAdapters.codex.capabilities.guarantees.includes('no-delegation'));
  assert.deepEqual(providerAdapters.antigravity.capabilities.guarantees, ['interactive-only']);
});

test('capability-aware selection filters boundaries and uses local history only as a tie-break', () => {
  const providers = [
    {
      name: 'first',
      displayName: 'First',
      enabled: true,
      available: true,
      compatible: true,
      policy: 'review-only',
      roles: { review: true, implement: false },
      capabilities: { guarantees: ['headless', 'structured-output', 'no-delegation', 'read-only-review'] },
    },
    {
      name: 'second',
      displayName: 'Second',
      available: true,
      compatible: true,
      policy: 'isolated-writer',
      roles: { review: true, implement: true },
      capabilities: { guarantees: ['headless', 'structured-output', 'no-delegation', 'read-only-review', 'isolated-write'] },
    },
    {
      name: 'interactive',
      displayName: 'Interactive',
      available: true,
      compatible: false,
      roles: { review: false, implement: false },
      capabilities: { guarantees: ['interactive-only'] },
    },
  ];
  const selected = selectAgentProviders({
    providers,
    role: 'review',
    requiredCapabilities: ['headless', 'structured-output', 'no-delegation'],
    history: {
      first: { samples: 4, clean: 1, findings: 1, no_verdict: 2 },
      second: { samples: 4, clean: 2, findings: 2, no_verdict: 0 },
    },
  });
  assert.deepEqual(selected.eligible.map((item) => item.provider), ['first', 'second']);
  assert.equal(selected.eligible[0].enabled, true);
  assert.deepEqual(selected.rejected[0], {
    provider: 'interactive',
    reasons: ['incompatible', 'does not support review', 'missing capabilities: headless, structured-output, no-delegation, read-only-review'],
  });

  const writers = selectAgentProviders({
    providers,
    role: 'implement',
    requiredCapabilities: ['headless', 'no-delegation'],
  });
  assert.deepEqual(writers.eligible.map((item) => item.provider), ['second']);
  assert.ok(writers.rejected.find((item) => item.provider === 'first').reasons.includes('durable policy is review-only'));
});

test('Claude uses worktree-scoped file tools and no shell', () => {
  const args = buildClaudeArgs({
    mode: 'implement',
    cwd: '/tmp/feature',
    schema: reviewSchema,
    maxBudgetUsd: 0.5,
    maxTurns: 20,
  });
  assert.deepEqual(args.slice(0, 2), ['-p', '--safe-mode']);
  assert.equal(args[args.indexOf('--tools') + 1], 'Read,Edit,Write');
  assert.equal(
    args[args.indexOf('--allowedTools') + 1],
    'Read(/tmp/feature/**),Edit(/tmp/feature/**),Write(/tmp/feature/**)',
  );
  assert.equal(args.some((arg) => arg.includes('Bash')), false);
  assert.equal(args[args.indexOf('--max-budget-usd') + 1], '0.5');
});

test('Codex, Qwen, OpenCode, and CodeWhale builders enforce their role boundaries', () => {
  const codex = buildCodexArgs({
    mode: 'review',
    cwd: '/tmp/feature',
    schemaFile: '/tmp/schema.json',
  });
  assert.equal(codex[codex.indexOf('--sandbox') + 1], 'read-only');
  assert.ok(codex.includes('--ephemeral'));
  assert.ok(codex.includes('--ignore-user-config'));
  assert.equal(codex.at(-1), '-');

  const qwen = buildQwenArgs({
    mode: 'implement',
    schema: reviewSchema,
    maxTurns: 20,
    maxToolCalls: 50,
    timeoutMs: 120_000,
  });
  assert.ok(qwen.includes('--safe-mode'));
  assert.ok(qwen.includes('--sandbox'));
  assert.equal(qwen[qwen.indexOf('--approval-mode') + 1], 'auto-edit');
  assert.match(qwen[qwen.indexOf('--exclude-tools') + 1], /shell/);
  assert.match(qwen[qwen.indexOf('--exclude-tools') + 1], /agent/);

  const opencode = buildOpenCodeArgs({ cwd: '/tmp/feature', prompt: 'packet' });
  assert.deepEqual(opencode.slice(0, 3), ['--pure', 'run', '--auto']);
  assert.equal(opencode[opencode.indexOf('--dir') + 1], '/tmp/feature');

  const codewhale = buildCodeWhaleArgs({
    mode: 'implement',
    cwd: '/tmp/feature',
    prompt: 'packet',
  });
  assert.equal(codewhale[codewhale.indexOf('--sandbox-mode') + 1], 'workspace-write');
  assert.ok(codewhale.includes('--auto'));
  assert.ok(codewhale.includes('--json'));
});

test('provider inspection performs only local version, help, and declared doctor probes', async () => {
  const calls = [];
  const qwen = await inspectAgentProvider('qwen', {
    runCommand: providerRunner(calls),
    env: {},
  });
  assert.equal(qwen.available, true);
  assert.equal(qwen.compatible, true);
  assert.equal(qwen.version, '0.16.2');
  assert.deepEqual(qwen.limits, { maxTurns: true, maxToolCalls: true });
  assert.deepEqual(calls.map(({ args }) => args), [['--version'], ['--help']]);
  assert.equal(calls.every(({ options }) => options.input === undefined), true);

  const whaleCalls = [];
  const whale = await inspectAgentProvider('codewhale', {
    runCommand: providerRunner(whaleCalls),
    env: {},
  });
  assert.equal(whale.compatible, true);
  assert.deepEqual(whale.identity, {
    harness: 'codewhale',
    provider: 'deepseek',
    model: 'deepseek-v4-pro',
  });
  assert.deepEqual(
    whaleCalls.map(({ args }) => args),
    [['--version'], ['--help'], ['exec', '--help'], ['doctor', '--json']],
  );
});

test('external execution applies only provider limits that capability probes can enforce', async () => {
  const home = await mkdtemp(`${os.tmpdir()}/nono-agent-bridge-`);
  const calls = [];
  const withoutOptionalTurns = async (command, args, options = {}) => {
    if (command === 'claude' && args[0] === '--help') {
      return {
        code: 0,
        stdout: help.claude.replace('--max-turns', ''),
        stderr: '',
      };
    }
    return providerRunner(calls)(command, args, options);
  };
  const packet = taskPacketFor(home);
  await runExternalAgent({
    home,
    provider: 'claude',
    mode: 'review',
    cwd: home,
    prompt: JSON.stringify(packet),
    consent: true,
    runCommand: withoutOptionalTurns,
    runGitCommand: gitRunner(home),
    env: {},
  });
  assert.equal(calls.at(-1).args.includes('--max-turns'), false);

  await assert.rejects(
    runExternalAgent({
      home,
      provider: 'claude',
      mode: 'review',
      cwd: home,
      prompt: JSON.stringify(packet),
      consent: true,
      maxTurns: 8,
      runCommand: withoutOptionalTurns,
      runGitCommand: gitRunner(home),
      env: {},
    }),
    /cannot enforce maxTurns/,
  );
  await assert.rejects(
    runExternalAgent({
      home,
      provider: 'codex',
      mode: 'review',
      cwd: home,
      prompt: JSON.stringify(packet),
      consent: true,
      maxBudgetUsd: 1,
      runCommand: providerRunner([]),
      runGitCommand: gitRunner(home),
      env: {},
    }),
    /cannot enforce maxBudgetUsd/,
  );
});

test('provider inspection blocks self-recursion before any executable probe', async () => {
  const calls = [];
  const provider = await inspectAgentProvider('codex', {
    runCommand: providerRunner(calls),
    env: { CODEX_THREAD_ID: 'task-1' },
  });
  assert.equal(provider.compatible, false);
  assert.match(provider.detail, /self-recursion blocked/);
  assert.deepEqual(calls, []);
});

test('provider configuration migrates v1 and persists role policy', async () => {
  const home = await mkdtemp(`${os.tmpdir()}/nono-agent-bridge-`);
  const configDirectory = path.join(home, '.nono-skills');
  await import('node:fs/promises').then(({ mkdir }) => mkdir(configDirectory, { recursive: true }));
  await writeFile(
    path.join(configDirectory, 'agents.json'),
    JSON.stringify({ schemaVersion: 1, providers: { claude: { enabled: true } } }),
  );
  assert.deepEqual(await readAgentConfig({ home }), {
    schemaVersion: 2,
    providers: { claude: { enabled: true } },
  });
  await setAgentProviderPolicy({ home, provider: 'claude', policy: 'isolated-writer' });
  assert.deepEqual((await readAgentConfig({ home })).providers.claude, {
    enabled: true,
    policy: 'isolated-writer',
  });
});

test('provider listing combines capabilities, runtime identity, and durable policy', async () => {
  const home = await mkdtemp(`${os.tmpdir()}/nono-agent-bridge-`);
  await setAgentProviderEnabled({ home, provider: 'codewhale', enabled: true });
  const providers = await listAgentProviders({
    home,
    runCommand: providerRunner([]),
    env: {},
  });
  const provider = providers.find(({ name }) => name === 'codewhale');
  assert.equal(provider.enabled, true);
  assert.equal(provider.policy, 'review-only');
  assert.equal(provider.roles.review, true);
  assert.equal(provider.roles.implement, true);
  assert.equal(provider.identity.model, 'deepseek-v4-pro');
});

test('external execution requires consent and honors review-only policy', async () => {
  const home = await mkdtemp(`${os.tmpdir()}/nono-agent-bridge-`);
  await assert.rejects(
    runExternalAgent({
      home,
      provider: 'claude',
      mode: 'review',
      cwd: home,
      prompt: JSON.stringify(taskPacketFor(home)),
      runCommand: providerRunner([]),
      env: {},
    }),
    /explicit per-run consent/,
  );

  await setAgentProviderEnabled({ home, provider: 'claude', enabled: true });
  await assert.rejects(
    runExternalAgent({
      home,
      provider: 'claude',
      mode: 'implement',
      cwd: home,
      prompt: JSON.stringify(taskPacketFor(home, {
        role: 'implement',
        write_scope: ['src/'],
      })),
      consent: true,
      runCommand: providerRunner([]),
      runGitCommand: gitRunner(home),
      env: {},
    }),
    /policy is review-only/,
  );
});

for (const provider of ['claude', 'codex', 'qwen', 'opencode', 'codewhale']) {
  test(`${provider} execution normalizes and validates the shared result contract`, async () => {
    const home = await mkdtemp(`${os.tmpdir()}/nono-agent-bridge-`);
    const calls = [];
    const packet = taskPacketFor(home);
    const result = await runExternalAgent({
      home,
      provider,
      mode: 'review',
      cwd: home,
      prompt: JSON.stringify(packet),
      consent: true,
      timeoutMs: 12_000,
      runCommand: providerRunner(calls),
      runGitCommand: gitRunner(home),
      env: {},
    });
    const execution = calls.at(-1);
    assert.equal(execution.command, provider === 'antigravity' ? 'agy' : provider);
    assert.equal(execution.options.cwd, await realpath(home));
    const deliveredPrompt = execution.options.input
      ?? execution.args.find((arg) => typeof arg === 'string' && arg.includes('TASK_PACKET:'));
    assert.match(deliveredPrompt, /bounded external software-engineering worker/);
    assert.match(deliveredPrompt, /"task_id":"review-1"/);
    assert.deepEqual(result.output, reviewOutput);
    assert.equal(result.identity.harness, provider);

    if (provider === 'opencode') {
      const config = JSON.parse(execution.options.env.OPENCODE_CONFIG_CONTENT);
      assert.equal(config.permission['*'], 'deny');
      assert.equal(config.permission.edit, 'deny');
      assert.equal(config.permission.external_directory, 'deny');
      assert.equal(config.permission.bash, 'deny');
    }
    if (provider === 'codewhale') {
      assert.equal(execution.options.env.CODEWHALE_ALLOW_SHELL, '0');
      assert.equal(execution.options.env.CODEWHALE_SANDBOX_MODE, 'read-only');
      assert.equal(execution.options.env.CODEWHALE_MAX_SUBAGENTS, '0');
    }
  });
}

test('controlled external reviews must echo the exact loop lease context', async () => {
  const home = await mkdtemp(`${os.tmpdir()}/nono-agent-bridge-`);
  const loopContext = {
    run_id: 'run-1',
    lease_id: 'lease-1',
    batch: 2,
    attempt: 1,
    head_sha: taskPacket.head_sha,
  };
  const packet = taskPacketFor(home, { loop_context: loopContext });
  const output = { ...reviewOutput, loop_context: loopContext };
  const result = await runExternalAgent({
    home,
    provider: 'codex',
    mode: 'review',
    cwd: home,
    prompt: JSON.stringify(packet),
    consent: true,
    runCommand: providerRunner([], output),
    runGitCommand: gitRunner(home),
    env: {},
  });
  assert.deepEqual(result.output.loop_context, loopContext);

  await assert.rejects(
    runExternalAgent({
      home,
      provider: 'codex',
      mode: 'review',
      cwd: home,
      prompt: JSON.stringify(packet),
      consent: true,
      runCommand: providerRunner([], {
        ...output,
        loop_context: { ...loopContext, lease_id: 'stale-lease' },
      }),
      runGitCommand: gitRunner(home),
      env: {},
    }),
    /mismatched structured output: loop_context/,
  );
});

test('external review findings require Evidence Contract categories', async () => {
  const home = await mkdtemp(`${os.tmpdir()}/nono-agent-bridge-`);
  await assert.rejects(
    runExternalAgent({
      home,
      provider: 'codex',
      mode: 'review',
      cwd: home,
      prompt: JSON.stringify(taskPacketFor(home)),
      consent: true,
      runCommand: providerRunner([], {
        ...reviewOutput,
        findings: [{
          id: 'F-1',
          severity: 'high',
          location: 'src/example.js:1',
          evidence: 'Observed incompatible behavior',
          impact: 'Acceptance behavior fails',
          remediation: 'Preserve the documented contract',
        }],
      }),
      runGitCommand: gitRunner(home),
      env: {},
    }),
    /finding category/,
  );
});

test('external execution rejects stale identity and incomplete scope for every adapter', async () => {
  const home = await mkdtemp(`${os.tmpdir()}/nono-agent-bridge-`);
  await assert.rejects(
    runExternalAgent({
      home,
      provider: 'qwen',
      mode: 'review',
      cwd: home,
      prompt: JSON.stringify(taskPacketFor(home)),
      consent: true,
      runCommand: providerRunner([], {
        ...reviewOutput,
        input_digest: `sha256:${'b'.repeat(64)}`,
      }),
      runGitCommand: gitRunner(home),
      env: {},
    }),
    /mismatched structured output: input_digest/,
  );
  await assert.rejects(
    runExternalAgent({
      home,
      provider: 'opencode',
      mode: 'review',
      cwd: home,
      prompt: JSON.stringify(taskPacketFor(home)),
      consent: true,
      runCommand: providerRunner([], {
        ...reviewOutput,
        status: 'blocked',
        scope_completed: false,
        summary: 'Need product clarification',
      }),
      runGitCommand: gitRunner(home),
      env: {},
    }),
    /did not complete the approved scope/,
  );
});

test('external execution binds packet role and worktree to the invocation', async () => {
  const home = await mkdtemp(`${os.tmpdir()}/nono-agent-bridge-`);
  const other = await mkdtemp(`${os.tmpdir()}/nono-agent-bridge-`);
  await assert.rejects(
    runExternalAgent({
      home,
      provider: 'claude',
      mode: 'implement',
      cwd: home,
      prompt: JSON.stringify(taskPacketFor(home)),
      consent: true,
      runCommand: providerRunner([]),
      runGitCommand: gitRunner(home),
      env: {},
    }),
    /role must match/,
  );
  await assert.rejects(
    runExternalAgent({
      home,
      provider: 'claude',
      mode: 'review',
      cwd: home,
      prompt: JSON.stringify(taskPacketFor(other)),
      consent: true,
      runCommand: providerRunner([]),
      runGitCommand: gitRunner(home),
      env: {},
    }),
    /worktree must match/,
  );
});

test('external review rejects a dirty snapshot and post-call worktree mutation', async () => {
  const home = await mkdtemp(`${os.tmpdir()}/nono-agent-bridge-`);
  const packet = taskPacketFor(home);
  const dirtyGit = async (command, args) => {
    if (args.includes('--show-toplevel')) {
      return { code: 0, stdout: `${home}\n`, stderr: '' };
    }
    if (args.at(-1) === 'HEAD') {
      return { code: 0, stdout: `${taskPacket.head_sha}\n`, stderr: '' };
    }
    if (args.includes('status')) {
      return { code: 0, stdout: ' M src/changed.js\0', stderr: '' };
    }
    if (args.includes('cat-file')) return { code: 0, stdout: '', stderr: '' };
    throw new Error(`Unexpected Git probe: ${command} ${args.join(' ')}`);
  };
  await assert.rejects(
    runExternalAgent({
      home,
      provider: 'claude',
      mode: 'review',
      cwd: home,
      prompt: JSON.stringify(packet),
      consent: true,
      runCommand: providerRunner([]),
      runGitCommand: dirtyGit,
      env: {},
    }),
    /clean approved worktree before external execution/,
  );

  let statusCalls = 0;
  const mutatedGit = async (command, args) => {
    if (args.includes('--show-toplevel')) {
      return { code: 0, stdout: `${home}\n`, stderr: '' };
    }
    if (args.at(-1) === 'HEAD') {
      return { code: 0, stdout: `${taskPacket.head_sha}\n`, stderr: '' };
    }
    if (args.includes('status')) {
      statusCalls += 1;
      return {
        code: 0,
        stdout: statusCalls === 1 ? '' : '?? unexpected.txt\0',
        stderr: '',
      };
    }
    if (args.includes('cat-file')) return { code: 0, stdout: '', stderr: '' };
    throw new Error(`Unexpected Git probe: ${command} ${args.join(' ')}`);
  };
  await assert.rejects(
    runExternalAgent({
      home,
      provider: 'claude',
      mode: 'review',
      cwd: home,
      prompt: JSON.stringify(packet),
      consent: true,
      runCommand: providerRunner([]),
      runGitCommand: mutatedGit,
      env: {},
    }),
    /clean approved worktree after external execution/,
  );
});

test('runCommand hard-kills a child that ignores the soft timeout', async () => {
  const started = Date.now();
  const result = await runCommand(
    process.execPath,
    ['-e', 'process.on("SIGTERM",()=>{});process.stdout.write("ready");setInterval(()=>{},1000)'],
    { timeoutMs: 200, killGraceMs: 100 },
  );
  assert.equal(result.code, 124);
  assert.match(result.stderr, /timed out/);
  assert.ok(Date.now() - started >= 250);
  assert.ok(Date.now() - started < 2_000);
});
