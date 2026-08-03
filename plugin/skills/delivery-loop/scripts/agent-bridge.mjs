#!/usr/bin/env node

import { spawn } from 'node:child_process';
import {
  mkdir,
  readFile,
  realpath,
  rename,
  stat,
  writeFile,
} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  composeAgentPrompt,
  schemaForMode,
  versionFrom,
} from './provider-contract.mjs';
import { buildClaudeArgs, claudeAdapter } from './providers/claude.mjs';
import { buildCodeWhaleArgs } from './providers/codewhale.mjs';
import { buildCodexArgs } from './providers/codex.mjs';
import { buildOpenCodeArgs } from './providers/opencode.mjs';
import { providerAdapters } from './providers/index.mjs';
import { buildQwenArgs } from './providers/qwen.mjs';

const schemaVersion = 2;
const defaultTimeoutMs = 10 * 60 * 1000;
const defaultMaxTurns = 20;
const defaultMaxToolCalls = 50;
const probeTimeoutMs = 5_000;
const hardKillGraceMs = 5_000;
const providerPolicies = new Set(['review-only', 'isolated-writer']);

function providerAdapter(provider) {
  const adapter = providerAdapters[provider];
  if (!adapter) throw new Error(`Unsupported external agent provider: ${provider}`);
  return adapter;
}

function configFile(home) {
  return path.join(home, '.nono-skills', 'agents.json');
}

function nonEmptyString(value, label) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value;
}

function positiveNumber(value, label) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) throw new Error(`${label} must be positive`);
  return parsed;
}

function killProcessTree(child, signal) {
  if (process.platform !== 'win32' && child.pid) {
    try {
      process.kill(-child.pid, signal);
      return;
    } catch {
      // Fall through when the process group no longer exists.
    }
  }
  child.kill(signal);
}

export function runCommand(
  command,
  args,
  {
    cwd = process.cwd(),
    env = process.env,
    input,
    timeoutMs = defaultTimeoutMs,
    killGraceMs = hardKillGraceMs,
  } = {},
) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd,
      env,
      detached: process.platform !== 'win32',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    let settled = false;
    let timeout;
    let hardKill;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      clearTimeout(hardKill);
      resolve(result);
    };
    timeout = setTimeout(() => {
      timedOut = true;
      killProcessTree(child, 'SIGTERM');
      hardKill = setTimeout(() => {
        if (!settled) killProcessTree(child, 'SIGKILL');
      }, killGraceMs);
    }, timeoutMs);

    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', (error) => {
      finish({ code: 127, stdout, stderr: error.message });
    });
    child.on('close', (code) => {
      finish({
        code: timedOut ? 124 : (code ?? 1),
        stdout,
        stderr: timedOut
          ? `${stderr}${stderr && !stderr.endsWith('\n') ? '\n' : ''}External agent timed out after ${timeoutMs}ms`
          : stderr,
      });
    });

    if (input === undefined) child.stdin.end();
    else child.stdin.end(input);
  });
}

function normalizedConfig(parsed) {
  if (
    parsed?.providers === null
    || typeof parsed?.providers !== 'object'
    || Array.isArray(parsed.providers)
  ) {
    throw new Error('External agent configuration has an unsupported schema');
  }
  if (parsed.schemaVersion === schemaVersion) return parsed;
  if (parsed.schemaVersion === 1) {
    return {
      schemaVersion,
      providers: Object.fromEntries(Object.entries(parsed.providers).map(([name, value]) => {
        const migrated = {};
        if (value?.enabled !== undefined) migrated.enabled = value.enabled;
        if (value?.policy !== undefined) migrated.policy = value.policy;
        return [name, migrated];
      })),
    };
  }
  throw new Error('External agent configuration has an unsupported schema');
}

export async function readAgentConfig({ home = os.homedir() } = {}) {
  try {
    return normalizedConfig(JSON.parse(await readFile(configFile(home), 'utf8')));
  } catch (error) {
    if (error.code === 'ENOENT') return { schemaVersion, providers: {} };
    throw error;
  }
}

async function writeAgentConfig(config, { home = os.homedir() } = {}) {
  const destination = configFile(home);
  await mkdir(path.dirname(destination), { recursive: true });
  const temporary = `${destination}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temporary, `${JSON.stringify(config, null, 2)}\n`, { mode: 0o600 });
  await rename(temporary, destination);
}

export async function setAgentProviderEnabled({
  home = os.homedir(),
  provider,
  enabled,
}) {
  providerAdapter(provider);
  if (typeof enabled !== 'boolean') throw new Error('enabled must be true or false');
  const config = await readAgentConfig({ home });
  const previous = config.providers[provider] ?? {};
  config.providers[provider] = {
    ...previous,
    enabled,
    policy: previous.policy ?? 'review-only',
  };
  await writeAgentConfig(config, { home });
  return config;
}

export async function setAgentProviderPolicy({
  home = os.homedir(),
  provider,
  policy,
}) {
  providerAdapter(provider);
  if (!providerPolicies.has(policy)) {
    throw new Error(`Unsupported external agent policy: ${policy}`);
  }
  const config = await readAgentConfig({ home });
  config.providers[provider] = {
    ...config.providers[provider],
    enabled: true,
    policy,
  };
  await writeAgentConfig(config, { home });
  return config;
}

function roleMap(adapter, overrides = {}) {
  return Object.fromEntries(['review', 'implement'].map((mode) => [
    mode,
    overrides[mode] ?? adapter.roles[mode].supported,
  ]));
}

export async function inspectAgentProvider(
  provider,
  {
    runCommand: execute = runCommand,
    env = process.env,
  } = {},
) {
  const adapter = providerAdapter(provider);
  const base = {
    name: provider,
    displayName: adapter.displayName,
    command: adapter.command,
    capabilities: adapter.capabilities,
    roles: roleMap(adapter),
  };
  if (adapter.isCurrentHost?.(env)) {
    return {
      ...base,
      available: true,
      compatible: false,
      roles: { review: false, implement: false },
      version: undefined,
      identity: { harness: provider },
      detail: `self-recursion blocked because the current task is owned by ${adapter.displayName}`,
    };
  }

  const versionResult = await execute(
    adapter.command,
    adapter.versionArgs,
    { env, timeoutMs: probeTimeoutMs },
  );
  if (versionResult.code !== 0) {
    return {
      ...base,
      available: false,
      compatible: false,
      roles: { review: false, implement: false },
      version: undefined,
      identity: { harness: provider },
      detail: versionResult.stderr.trim() || 'command not found',
    };
  }

  let helpOutput = '';
  for (const args of adapter.helpProbes) {
    const result = await execute(
      adapter.command,
      args,
      { env, timeoutMs: probeTimeoutMs },
    );
    if (result.code !== 0) {
      return {
        ...base,
        available: true,
        compatible: false,
        roles: { review: false, implement: false },
        version: versionFrom(`${versionResult.stdout}\n${versionResult.stderr}`),
        identity: { harness: provider },
        detail: result.stderr.trim() || `help probe failed: ${args.join(' ')}`,
      };
    }
    helpOutput += `\n${result.stdout}\n${result.stderr}`;
  }

  const missingFlags = adapter.requiredFlags.filter((flag) => !helpOutput.includes(flag));
  let extra = {};
  if (missingFlags.length === 0 && adapter.inspectExtra) {
    extra = await adapter.inspectExtra({
      execute,
      env,
      timeoutMs: probeTimeoutMs,
    });
  }
  const roles = missingFlags.length === 0
    ? roleMap(adapter, extra.roles)
    : { review: false, implement: false };
  const limits = Object.fromEntries(Object.entries(adapter.limits).map(([name, flag]) => [
    name,
    helpOutput.includes(flag),
  ]));
  const runnableRole = roles.review || roles.implement;
  const compatible = (
    missingFlags.length === 0
    && !adapter.automationUnsupported
    && runnableRole
  );
  const detail = missingFlags.length
    ? `missing required flags: ${missingFlags.join(', ')}`
    : adapter.automationUnsupported
      ?? extra.detail
      ?? (compatible ? 'local noninteractive bridge is compatible' : 'no safe automated role is available');
  return {
    ...base,
    available: true,
    compatible,
    roles,
    limits,
    version: versionFrom(`${versionResult.stdout}\n${versionResult.stderr}`),
    identity: extra.identity ?? { harness: provider },
    detail,
  };
}

export async function listAgentProviders({
  home = os.homedir(),
  runCommand: execute = runCommand,
  env = process.env,
} = {}) {
  const config = await readAgentConfig({ home });
  return Promise.all(Object.keys(providerAdapters).map(async (provider) => ({
    ...await inspectAgentProvider(provider, { runCommand: execute, env }),
    enabled: config.providers[provider]?.enabled,
    policy: config.providers[provider]?.policy,
  })));
}

export function selectAgentProviders({
  providers,
  role,
  requiredCapabilities = [],
  history = {},
} = {}) {
  if (!Array.isArray(providers)) throw new Error('providers must be an array');
  if (!['review', 'implement'].includes(role)) throw new Error('role must be review or implement');
  if (
    !Array.isArray(requiredCapabilities)
    || requiredCapabilities.some((value) => typeof value !== 'string' || value.trim() === '')
    || new Set(requiredCapabilities).size !== requiredCapabilities.length
  ) {
    throw new Error('requiredCapabilities must be a unique string list');
  }
  const roleGuarantee = role === 'review' ? 'read-only-review' : 'isolated-write';
  const required = [...new Set([...requiredCapabilities, roleGuarantee])];
  const eligible = [];
  const rejected = [];
  for (const provider of providers) {
    const reasons = [];
    if (provider.enabled === false) reasons.push('disabled by user');
    if (!provider.available) reasons.push('unavailable');
    if (!provider.compatible) reasons.push('incompatible');
    if (provider.roles?.[role] !== true) reasons.push(`does not support ${role}`);
    if (role === 'implement' && provider.policy === 'review-only') {
      reasons.push('durable policy is review-only');
    }
    const guarantees = provider.capabilities?.guarantees ?? [];
    const missing = required.filter((capability) => !guarantees.includes(capability));
    if (missing.length) reasons.push(`missing capabilities: ${missing.join(', ')}`);
    if (reasons.length) {
      rejected.push({ provider: provider.name, reasons });
      continue;
    }
    const observations = history[provider.name] ?? {};
    const samples = Number.isInteger(observations.samples) ? observations.samples : 0;
    const valid = (observations.clean ?? 0) + (observations.findings ?? 0);
    const reliability = samples >= 3 ? valid / samples : null;
    eligible.push({
      provider: provider.name,
      displayName: provider.displayName,
      required_capabilities: required,
      guarantees,
      enabled: provider.enabled === true,
      history: { samples, reliability },
      reasons: [
        'available, compatible, and role-eligible',
        `provides ${required.join(', ')}`,
        ...(reliability === null
          ? ['insufficient local history for a reliability tie-break']
          : [`local valid-output rate ${valid}/${samples}`]),
      ],
    });
  }
  eligible.sort((left, right) => (
    Number(right.enabled) - Number(left.enabled)
    || (right.history.reliability ?? -1) - (left.history.reliability ?? -1)
    || left.provider.localeCompare(right.provider)
  ));
  return { role, required_capabilities: required, eligible, rejected };
}

function assertStringList(output, name, providerName) {
  if (
    !Array.isArray(output[name])
    || output[name].some((item) => typeof item !== 'string' || item.trim() === '')
    || new Set(output[name]).size !== output[name].length
  ) {
    throw new Error(`${providerName} returned invalid structured output: ${name}`);
  }
}

function assertPacketStringList(packet, name, { allowEmpty = true } = {}) {
  if (
    !Array.isArray(packet[name])
    || (!allowEmpty && packet[name].length === 0)
    || packet[name].some((item) => typeof item !== 'string' || item.trim() === '')
    || new Set(packet[name]).size !== packet[name].length
  ) {
    throw new Error(`External agent task packet has invalid ${name}`);
  }
}

function parseTaskPacket(prompt, mode) {
  let packet;
  try {
    packet = JSON.parse(prompt);
  } catch {
    throw new Error('External agent task packet must be valid JSON');
  }
  if (packet === null || typeof packet !== 'object' || Array.isArray(packet)) {
    throw new Error('External agent task packet must be a JSON object');
  }
  for (const name of ['task_id', 'base_sha', 'head_sha', 'input_digest', 'worktree']) {
    nonEmptyString(packet[name], `task packet ${name}`);
  }
  if (packet.role !== mode) {
    throw new Error(`task packet role must match external agent mode: ${mode}`);
  }
  if (!/^sha256:[0-9a-f]{64}$/.test(packet.input_digest)) {
    throw new Error('task packet input_digest must be a sha256 digest');
  }
  assertPacketStringList(packet, 'read_scope', { allowEmpty: false });
  assertPacketStringList(packet, 'write_scope', { allowEmpty: mode === 'review' });
  if (mode === 'review' && packet.write_scope.length !== 0) {
    throw new Error('review task packet write_scope must be empty');
  }
  assertPacketStringList(packet, 'forbidden_actions', { allowEmpty: false });
  for (const action of [
    'delegate again',
    'read secrets',
    'commit',
    'push',
    'merge',
    'deploy',
    'change external state',
  ]) {
    if (!packet.forbidden_actions.includes(action)) {
      throw new Error(`task packet must forbid: ${action}`);
    }
  }
  if (packet.loop_context !== undefined) {
    if (mode !== 'review' || packet.loop_context === null || typeof packet.loop_context !== 'object' || Array.isArray(packet.loop_context)) {
      throw new Error('task packet loop_context is supported only for controlled reviews');
    }
    for (const name of ['run_id', 'lease_id', 'head_sha']) {
      nonEmptyString(packet.loop_context[name], `task packet loop_context ${name}`);
    }
    for (const name of ['batch', 'attempt']) {
      if (!Number.isInteger(packet.loop_context[name]) || packet.loop_context[name] < 1) {
        throw new Error(`task packet loop_context ${name} must be a positive integer`);
      }
    }
    if (packet.loop_context.head_sha !== packet.head_sha) {
      throw new Error('task packet loop_context head_sha must match the approved HEAD');
    }
  }
  return packet;
}

async function gitProbe(executeGit, canonicalCwd, args, env, failure) {
  const result = await executeGit(
    'git',
    ['-C', canonicalCwd, ...args],
    { env, timeoutMs: probeTimeoutMs },
  );
  if (result.code !== 0) {
    throw new Error(`${failure}: ${result.stderr.trim() || `exit ${result.code}`}`);
  }
  return result.stdout;
}

async function assertWorktreeSnapshot(packet, canonicalCwd, mode, {
  runGitCommand: executeGit,
  env,
  phase,
}) {
  const head = await gitProbe(
    executeGit,
    canonicalCwd,
    ['rev-parse', 'HEAD'],
    env,
    `Cannot read approved worktree HEAD ${phase}`,
  );
  if (head.trim() !== packet.head_sha) {
    throw new Error(`task packet head_sha does not match the approved worktree HEAD ${phase}`);
  }
  if (mode === 'review') {
    const status = await gitProbe(
      executeGit,
      canonicalCwd,
      ['status', '--porcelain=v1', '-z', '--untracked-files=all'],
      env,
      `Cannot inspect approved review worktree ${phase}`,
    );
    if (status !== '') {
      throw new Error(`External review requires a clean approved worktree ${phase}`);
    }
  }
}

async function validateTaskWorktree(packet, cwd, mode, {
  runGitCommand: executeGit = runCommand,
  env = process.env,
} = {}) {
  const [canonicalPacketWorktree, canonicalCwd] = await Promise.all([
    realpath(packet.worktree),
    realpath(cwd),
  ]);
  if (canonicalPacketWorktree !== canonicalCwd) {
    throw new Error('task packet worktree must match external agent cwd');
  }
  const root = await gitProbe(
    executeGit,
    canonicalCwd,
    ['rev-parse', '--show-toplevel'],
    env,
    'External agent cwd is not a Git worktree',
  );
  const canonicalRoot = await realpath(root.trim());
  if (canonicalRoot !== canonicalCwd) {
    throw new Error('External agent cwd must be the approved Git worktree root');
  }
  await assertWorktreeSnapshot(packet, canonicalCwd, mode, {
    runGitCommand: executeGit,
    env,
    phase: 'before external execution',
  });
  const base = await executeGit(
    'git',
    ['-C', canonicalCwd, 'cat-file', '-e', `${packet.base_sha}^{commit}`],
    { env, timeoutMs: probeTimeoutMs },
  );
  if (base.code !== 0) {
    throw new Error('task packet base_sha is not a commit in the approved worktree');
  }
  return canonicalCwd;
}

function validateStructuredOutput(output, mode, packet, providerName) {
  if (output === null || typeof output !== 'object' || Array.isArray(output)) {
    throw new Error(`${providerName} returned no structured output`);
  }
  for (const name of ['task_id', 'base_sha', 'input_digest']) {
    if (output[name] !== packet[name]) {
      throw new Error(`${providerName} returned mismatched structured output: ${name}`);
    }
  }
  if (packet.loop_context !== undefined) {
    if (JSON.stringify(output.loop_context) !== JSON.stringify(packet.loop_context)) {
      throw new Error(`${providerName} returned mismatched structured output: loop_context`);
    }
  }
  if (!['completed', 'blocked', 'failed'].includes(output.status)) {
    throw new Error(`${providerName} returned invalid structured output: status`);
  }
  if (typeof output.scope_completed !== 'boolean') {
    throw new Error(`${providerName} returned invalid structured output: scope_completed`);
  }
  if (typeof output.summary !== 'string' || output.summary.trim() === '') {
    throw new Error(`${providerName} returned invalid structured output: summary`);
  }
  for (const name of [
    'files',
    'verification',
    'verification_not_run',
    'assumptions',
    'risks',
    'questions',
    'decision_log_records',
  ]) {
    assertStringList(output, name, providerName);
  }
  if (mode === 'review') {
    if (!Array.isArray(output.findings)) {
      throw new Error(`${providerName} returned invalid structured output: findings`);
    }
    const findingIds = new Set();
    let previousSeverity = -1;
    const severityOrder = ['critical', 'high', 'medium', 'low'];
    for (const finding of output.findings) {
      if (finding === null || typeof finding !== 'object' || Array.isArray(finding)) {
        throw new Error(`${providerName} returned invalid structured output: finding`);
      }
      const severity = severityOrder.indexOf(finding.severity);
      if (severity === -1) {
        throw new Error(`${providerName} returned invalid structured output: finding severity`);
      }
      if (severity < previousSeverity) {
        throw new Error(`${providerName} returned findings outside severity order`);
      }
      previousSeverity = severity;
      for (const name of ['id', 'category', 'location', 'impact', 'remediation']) {
        if (typeof finding[name] !== 'string' || finding[name].trim() === '') {
          throw new Error(`${providerName} returned invalid structured output: finding ${name}`);
        }
      }
      if (!['supported', 'insufficient'].includes(finding.evidence_status)) {
        throw new Error(`${providerName} returned invalid structured output: finding evidence_status`);
      }
      if (finding.evidence === null || typeof finding.evidence !== 'object' || Array.isArray(finding.evidence)) {
        throw new Error(`${providerName} returned invalid structured output: finding evidence`);
      }
      if (!['failing-check', 'reproduction', 'trace', 'static-path', 'observation'].includes(finding.evidence.kind)) {
        throw new Error(`${providerName} returned invalid structured output: finding evidence kind`);
      }
      const expectedEvidenceHead = packet.loop_context?.head_sha ?? packet.head_sha;
      if (finding.evidence.head_sha !== expectedEvidenceHead) {
        throw new Error(`${providerName} returned mismatched structured output: finding evidence head_sha`);
      }
      if (typeof finding.evidence.summary !== 'string' || finding.evidence.summary.trim() === '') {
        throw new Error(`${providerName} returned invalid structured output: finding evidence summary`);
      }
      if (
        finding.evidence.reference !== undefined
        && (typeof finding.evidence.reference !== 'string' || finding.evidence.reference.trim() === '')
      ) {
        throw new Error(`${providerName} returned invalid structured output: finding evidence reference`);
      }
      if (
        finding.evidence.digest !== undefined
        && !/^sha256:[a-f0-9]{64}$/.test(finding.evidence.digest)
      ) {
        throw new Error(`${providerName} returned invalid structured output: finding evidence digest`);
      }
      if (findingIds.has(finding.id)) {
        throw new Error(`${providerName} returned duplicate finding ID: ${finding.id}`);
      }
      findingIds.add(finding.id);
    }
  }
  if (output.status !== 'completed' || output.scope_completed !== true) {
    throw new Error(`${providerName} did not complete the approved scope: ${output.summary}`);
  }
  return output;
}

function assertPolicyAllows(config, provider, mode) {
  const state = config.providers[provider];
  if (state?.enabled === false) {
    throw new Error(`External agent provider is disabled: ${provider}`);
  }
  if (mode === 'implement' && state?.policy === 'review-only') {
    throw new Error(`External agent provider policy is review-only: ${provider}`);
  }
}

export async function runExternalAgent({
  home = os.homedir(),
  provider,
  mode,
  cwd,
  prompt,
  consent = false,
  maxBudgetUsd,
  maxTurns,
  maxToolCalls,
  timeoutMs = defaultTimeoutMs,
  runCommand: execute = runCommand,
  runGitCommand: executeGit = runCommand,
  env = process.env,
}) {
  if (consent !== true) {
    throw new Error('External agent execution requires explicit per-run consent');
  }
  const adapter = providerAdapter(provider);
  nonEmptyString(cwd, 'cwd');
  nonEmptyString(prompt, 'prompt');
  const packet = parseTaskPacket(prompt, mode);
  const resolvedTimeoutMs = positiveNumber(timeoutMs, 'timeoutMs');
  const requestedMaxTurns = maxTurns === undefined
    ? undefined
    : positiveNumber(maxTurns, 'maxTurns');
  const requestedMaxToolCalls = maxToolCalls === undefined
    ? undefined
    : positiveNumber(maxToolCalls, 'maxToolCalls');
  const requestedBudget = maxBudgetUsd === undefined
    ? undefined
    : positiveNumber(maxBudgetUsd, 'maxBudgetUsd');
  const directory = await stat(cwd);
  if (!directory.isDirectory()) throw new Error(`External agent cwd is not a directory: ${cwd}`);

  const config = await readAgentConfig({ home });
  assertPolicyAllows(config, provider, mode);
  const canonicalCwd = await validateTaskWorktree(packet, cwd, mode, {
    runGitCommand: executeGit,
    env,
  });
  const inspected = await inspectAgentProvider(provider, { runCommand: execute, env });
  if (!inspected.available) throw new Error(`${adapter.displayName} is unavailable: ${inspected.detail}`);
  if (!inspected.compatible) throw new Error(`${adapter.displayName} is incompatible: ${inspected.detail}`);
  if (!inspected.roles[mode]) {
    throw new Error(`${adapter.displayName} does not provide a safe ${mode} role`);
  }
  for (const [name, value] of Object.entries({
    maxBudgetUsd: requestedBudget,
    maxTurns: requestedMaxTurns,
    maxToolCalls: requestedMaxToolCalls,
  })) {
    if (value !== undefined && inspected.limits[name] !== true) {
      throw new Error(`${adapter.displayName} cannot enforce ${name}`);
    }
  }

  const schema = schemaForMode(mode, { requireLoopContext: packet.loop_context !== undefined });
  const resolvedMaxTurns = inspected.limits.maxTurns
    ? requestedMaxTurns ?? defaultMaxTurns
    : undefined;
  const resolvedMaxToolCalls = inspected.limits.maxToolCalls
    ? requestedMaxToolCalls ?? defaultMaxToolCalls
    : undefined;
  const baseOptions = {
    mode,
    cwd: canonicalCwd,
    schema,
    packet,
    maxBudgetUsd: requestedBudget,
    maxTurns: resolvedMaxTurns,
    maxToolCalls: resolvedMaxToolCalls,
    timeoutMs: resolvedTimeoutMs,
    env,
  };
  let execution;
  try {
    const agentPrompt = composeAgentPrompt({
      packet: prompt,
      mode,
      schema,
      schemaEnforced: adapter.schemaEnforced,
    });
    execution = await adapter.prepare({
      ...baseOptions,
      prompt: agentPrompt,
    });

    const result = await execute(adapter.command, execution.args, {
      cwd: canonicalCwd,
      env: execution.env,
      input: execution.input,
      timeoutMs: resolvedTimeoutMs,
    });
    await assertWorktreeSnapshot(packet, canonicalCwd, mode, {
      runGitCommand: executeGit,
      env,
      phase: 'after external execution',
    });
    if (result.code !== 0) {
      throw new Error(`${adapter.displayName} failed: ${result.stderr.trim() || `exit ${result.code}`}`);
    }
    const parsed = execution.parse(result.stdout);
    return {
      provider,
      mode,
      identity: parsed.identity ?? inspected.identity,
      output: validateStructuredOutput(parsed.output, mode, packet, adapter.displayName),
      usage: parsed.usage ?? {},
    };
  } finally {
    await execution?.cleanup?.();
  }
}

function parseBridgeArgs(argv) {
  const args = [...argv];
  const command = args.shift() ?? 'help';
  const options = {
    command,
    provider: undefined,
    mode: undefined,
    cwd: undefined,
    promptFile: undefined,
    consent: false,
    json: false,
    maxBudgetUsd: undefined,
    maxTurns: undefined,
    maxToolCalls: undefined,
    timeoutMs: undefined,
    requiredCapabilities: [],
  };
  while (args.length) {
    const arg = args.shift();
    if (arg === '--provider') options.provider = args.shift();
    else if (arg === '--mode') options.mode = args.shift();
    else if (arg === '--cwd') options.cwd = args.shift();
    else if (arg === '--prompt-file') options.promptFile = args.shift();
    else if (arg === '--consent') options.consent = true;
    else if (arg === '--json') options.json = true;
    else if (arg === '--max-budget-usd') options.maxBudgetUsd = args.shift();
    else if (arg === '--max-turns') options.maxTurns = args.shift();
    else if (arg === '--max-tool-calls') options.maxToolCalls = args.shift();
    else if (arg === '--timeout-ms') options.timeoutMs = args.shift();
    else if (arg === '--require') {
      options.requiredCapabilities = (args.shift() ?? '').split(',').map((value) => value.trim()).filter(Boolean);
    }
    else throw new Error(`Unknown bridge option: ${arg}`);
  }
  return options;
}

const bridgeHelp = `agent-bridge <command> [options]

Commands:
  detect --json
  select --mode <review|implement> --require <capability,...> --json
  run --provider <claude|codex|qwen|opencode|codewhale> --mode <review|implement>
      --cwd <path> --prompt-file <path> --consent
      [--max-budget-usd <amount>] [--max-turns <count>]
      [--max-tool-calls <count>] [--timeout-ms <milliseconds>]
`;

export async function runAgentBridgeCli(
  argv,
  {
    home = process.env.NONO_SKILLS_HOME ?? os.homedir(),
    stdout = process.stdout,
    stderr = process.stderr,
    runCommand: execute = runCommand,
    env = process.env,
  } = {},
) {
  try {
    const options = parseBridgeArgs(argv);
    if (options.command === 'help' || options.command === '--help') {
      stdout.write(bridgeHelp);
      return 0;
    }
    if (options.command === 'detect') {
      const providers = await listAgentProviders({ home, runCommand: execute, env });
      stdout.write(`${JSON.stringify(providers, null, options.json ? 2 : 0)}\n`);
      return 0;
    }
    if (options.command === 'select') {
      nonEmptyString(options.mode, 'mode');
      const providers = await listAgentProviders({ home, runCommand: execute, env });
      const selection = selectAgentProviders({
        providers,
        role: options.mode,
        requiredCapabilities: options.requiredCapabilities,
      });
      stdout.write(`${JSON.stringify(selection, null, options.json ? 2 : 0)}\n`);
      return selection.eligible.length === 0 ? 1 : 0;
    }
    if (options.command === 'run') {
      nonEmptyString(options.provider, 'provider');
      nonEmptyString(options.mode, 'mode');
      nonEmptyString(options.cwd, 'cwd');
      nonEmptyString(options.promptFile, 'promptFile');
      const prompt = await readFile(options.promptFile, 'utf8');
      const result = await runExternalAgent({
        home,
        provider: options.provider,
        mode: options.mode,
        cwd: path.resolve(options.cwd),
        prompt,
        consent: options.consent,
        maxBudgetUsd: options.maxBudgetUsd,
        maxTurns: options.maxTurns,
        maxToolCalls: options.maxToolCalls,
        timeoutMs: options.timeoutMs ?? defaultTimeoutMs,
        runCommand: execute,
        env,
      });
      stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      return 0;
    }
    throw new Error(`Unknown bridge command: ${options.command}`);
  } catch (error) {
    stderr.write(`${error.message}\n`);
    return 1;
  }
}

export {
  buildClaudeArgs,
  buildCodeWhaleArgs,
  buildCodexArgs,
  buildOpenCodeArgs,
  buildQwenArgs,
  claudeAdapter,
  providerAdapters,
};

const invokedPath = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : undefined;
if (invokedPath === import.meta.url) {
  process.exitCode = await runAgentBridgeCli(process.argv.slice(2));
}
