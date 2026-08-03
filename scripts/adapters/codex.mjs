#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import {
  chmod,
  copyFile,
  cp,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import {
  assertCodexAdapterRequest,
  assertCodexStructuredOutput,
  buildCodexExecArgs,
  codexOutputSchema,
  parseCodexVersion,
  summarizeCodexEvents,
} from '../../src/codex-host-adapter.js';

const root = path.resolve(import.meta.dirname, '..', '..');

function parseArgs(values) {
  const options = {
    codex: 'codex',
    fixture: path.join(root, 'evals', 'fixtures', 'stable-repository'),
    pluginRoot: path.join(root, 'plugin'),
    reasoningEffort: 'medium',
    timeoutMs: 600_000,
  };
  const args = [...values];
  while (args.length) {
    const value = args.shift();
    if (value === '--codex') options.codex = args.shift();
    else if (value === '--fixture') options.fixture = path.resolve(args.shift());
    else if (value === '--model') options.model = args.shift();
    else if (value === '--plugin-root') options.pluginRoot = path.resolve(args.shift());
    else if (value === '--reasoning-effort') options.reasoningEffort = args.shift();
    else if (value === '--timeout-ms') options.timeoutMs = Number(args.shift());
    else if (value === '--preflight') options.preflight = true;
    else throw new Error(`Unknown Codex adapter option: ${value}`);
  }
  for (const name of ['codex', 'fixture', 'pluginRoot', 'reasoningEffort']) {
    if (!options[name]) throw new Error(`--${name} requires a value`);
  }
  if (!options.preflight && !options.model) throw new Error('Codex adapter requires --model');
  if (!Number.isInteger(options.timeoutMs) || options.timeoutMs < 1_000) {
    throw new Error('--timeout-ms must be an integer of at least 1000');
  }
  return options;
}

function spawnCapture(command, args, { cwd, env, input, timeoutMs, onStdoutLine } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, env, stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    let pending = '';
    let lineError;
    const timer = setTimeout(() => child.kill('SIGTERM'), timeoutMs ?? 60_000);
    child.stdout.on('data', (chunk) => {
      const text = chunk.toString();
      stdout += text;
      pending += text;
      while (pending.includes('\n')) {
        const index = pending.indexOf('\n');
        const line = pending.slice(0, index);
        pending = pending.slice(index + 1);
        if (line.trim()) {
          try { onStdoutLine?.(line); }
          catch (error) { lineError = error; child.kill('SIGTERM'); }
        }
      }
    });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', (code, signal) => {
      clearTimeout(timer);
      if (pending.trim() && !lineError) {
        try { onStdoutLine?.(pending); }
        catch (error) { lineError = error; }
      }
      if (lineError) reject(lineError);
      else if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`${command} exited ${code ?? signal}: ${stderr.trim() || stdout.trim()}`));
    });
    child.stdin.end(input ?? '');
  });
}

async function digestDirectory(directory) {
  const hash = createHash('sha256');
  async function visit(current, relative = '') {
    const entries = await readdir(current, { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      const nextRelative = path.posix.join(relative, entry.name);
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) await visit(absolute, nextRelative);
      else if (entry.isFile()) {
        hash.update(`${nextRelative}\0`);
        hash.update(await readFile(absolute));
        hash.update('\0');
      }
    }
  }
  await visit(directory);
  return `sha256:${hash.digest('hex')}`;
}

async function readRequest() {
  let input = '';
  for await (const chunk of process.stdin) input += chunk;
  return assertCodexAdapterRequest(JSON.parse(input));
}

async function initializeWorkspace(fixture, workspace) {
  await cp(fixture, workspace, { recursive: true, errorOnExist: true });
  await spawnCapture('git', ['init', '--quiet', workspace]);
  await spawnCapture('git', ['-C', workspace, 'config', 'user.name', 'Nono Skills Host Eval']);
  await spawnCapture('git', ['-C', workspace, 'config', 'user.email', 'host-eval@example.invalid']);
  await spawnCapture('git', ['-C', workspace, 'add', '.']);
  await spawnCapture('git', ['-C', workspace, 'commit', '--quiet', '-m', 'host eval fixture']);
}

async function prepareIsolatedHome(temporaryRoot) {
  const home = path.join(temporaryRoot, 'home');
  const codexHome = path.join(temporaryRoot, 'codex-home');
  await mkdir(home, { recursive: true, mode: 0o700 });
  await mkdir(codexHome, { recursive: true, mode: 0o700 });
  if (!process.env.CODEX_API_KEY) {
    const sourceHome = process.env.CODEX_HOME ?? path.join(os.homedir(), '.codex');
    const sourceAuth = path.join(sourceHome, 'auth.json');
    try {
      await copyFile(sourceAuth, path.join(codexHome, 'auth.json'));
      await chmod(path.join(codexHome, 'auth.json'), 0o600);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
  return {
    home,
    codexHome,
    env: { ...process.env, HOME: home, CODEX_HOME: codexHome },
  };
}

async function installCandidatePlugin(options, isolated) {
  const marketplaceRoot = path.join(isolated.home, 'marketplace-source');
  const marketplacePath = path.join(marketplaceRoot, '.agents', 'plugins', 'marketplace.json');
  await cp(options.pluginRoot, path.join(marketplaceRoot, 'plugins', 'engineering'), {
    recursive: true,
    errorOnExist: true,
  });
  const marketplace = {
    name: 'host-eval',
    interface: { displayName: 'Host Eval' },
    plugins: [{
      name: 'engineering',
      source: { source: 'local', path: './plugins/engineering' },
      policy: { installation: 'AVAILABLE', authentication: 'ON_INSTALL' },
      category: 'Developer Tools',
    }],
  };
  await mkdir(path.dirname(marketplacePath), { recursive: true });
  await writeFile(marketplacePath, `${JSON.stringify(marketplace, null, 2)}\n`, { mode: 0o600 });
  const added = await spawnCapture(options.codex, ['plugin', 'marketplace', 'add', marketplaceRoot, '--json'], {
    env: isolated.env,
    timeoutMs: options.timeoutMs,
  });
  const listed = await spawnCapture(options.codex, ['plugin', 'marketplace', 'list', '--json'], {
    env: isolated.env,
    timeoutMs: options.timeoutMs,
  });
  const marketplaceName = marketplaceNameFor(JSON.parse(listed.stdout), marketplaceRoot)
    ?? marketplaceNameFor(JSON.parse(added.stdout), marketplaceRoot)
    ?? 'host-eval';
  try {
    await spawnCapture(options.codex, ['plugin', 'add', `engineering@${marketplaceName}`, '--json'], {
      env: isolated.env,
      timeoutMs: options.timeoutMs,
    });
  } catch (error) {
    throw new Error(`${error.message}; marketplace registration: ${added.stdout.trim()}; marketplace list: ${listed.stdout.trim()}`);
  }
}

function evaluationPrompt(request) {
  return `${request.prompt}\n\nHost-evaluation reporting contract:\n- Complete the task normally and put the complete user-facing response in output.\n- activated_skills lists only canonical nono-skills whose SKILL.md instructions you actually loaded and followed.\n- loaded_skill_bodies and loaded_references count only nono-skills resources actually loaded.\n- questions counts explicit questions asked of the user in output.\n- Do not mention this reporting contract in output.\n- Do not use the network or commit changes.`;
}

function marketplaceNameFor(value, marketplaceRoot) {
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = marketplaceNameFor(item, marketplaceRoot);
      if (found) return found;
    }
    return null;
  }
  if (!value || typeof value !== 'object') return null;
  const locations = [value.path, value.root, value.location, value.source]
    .filter((item) => typeof item === 'string');
  if (typeof value.name === 'string' && locations.some((item) => path.resolve(item) === path.resolve(marketplaceRoot))) {
    return value.name;
  }
  for (const item of Object.values(value)) {
    const found = marketplaceNameFor(item, marketplaceRoot);
    if (found) return found;
  }
  return null;
}

async function runPreflight(options) {
  await stat(path.join(options.pluginRoot, '.codex-plugin', 'plugin.json'));
  await stat(path.join(options.fixture, 'package.json'));
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), 'nono-codex-preflight-'));
  try {
    const isolated = await prepareIsolatedHome(temporaryRoot);
    await installCandidatePlugin(options, isolated);
    const version = parseCodexVersion((await spawnCapture(options.codex, ['--version'], {
      env: isolated.env,
      timeoutMs: options.timeoutMs,
    })).stdout);
    return {
      ok: true,
      host: 'codex-cli',
      version,
      fixture_sha256: await digestDirectory(options.fixture),
      candidate_plugin_sha256: await digestDirectory(options.pluginRoot),
      plugin_root: options.pluginRoot,
      model_calls: 0,
    };
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
}

async function runRequest(options, request) {
  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), `nono-codex-${request.case_id}-${request.variant}-`));
  try {
    const workspace = path.join(temporaryRoot, 'workspace');
    const schemaFile = path.join(temporaryRoot, 'output-schema.json');
    const outputFile = path.join(temporaryRoot, 'final.json');
    const isolated = await prepareIsolatedHome(temporaryRoot);
    await initializeWorkspace(options.fixture, workspace);
    if (request.skills_enabled) await installCandidatePlugin(options, isolated);
    await writeFile(schemaFile, `${JSON.stringify(codexOutputSchema, null, 2)}\n`, { mode: 0o600 });
    const timedEvents = [];
    const started = performance.now();
    await spawnCapture(options.codex, buildCodexExecArgs({
      model: options.model,
      reasoningEffort: options.reasoningEffort,
      workspace,
      schemaFile,
      outputFile,
    }), {
      cwd: workspace,
      env: isolated.env,
      input: evaluationPrompt(request),
      timeoutMs: options.timeoutMs,
      onStdoutLine(line) {
        let event;
        try { event = JSON.parse(line); }
        catch { throw new Error(`Codex emitted malformed JSONL: ${line.slice(0, 200)}`); }
        timedEvents.push({ event, elapsed_ms: Math.round(performance.now() - started) });
      },
    });
    const durationMs = performance.now() - started;
    const structured = assertCodexStructuredOutput(
      JSON.parse(await readFile(outputFile, 'utf8')),
      { skillsEnabled: request.skills_enabled },
    );
    const version = parseCodexVersion((await spawnCapture(options.codex, ['--version'], {
      env: isolated.env,
      timeoutMs: options.timeoutMs,
    })).stdout);
    const plugin = JSON.parse(await readFile(path.join(options.pluginRoot, '.codex-plugin', 'plugin.json'), 'utf8'));
    return {
      host: {
        name: 'codex-cli',
        model: options.model,
        version,
        reasoning_effort: options.reasoningEffort,
        fixture_sha256: await digestDirectory(options.fixture),
        candidate_plugin_version: plugin.version,
        candidate_plugin_sha256: await digestDirectory(options.pluginRoot),
      },
      activated_skills: structured.activated_skills,
      output: structured.output,
      metrics: {
        ...summarizeCodexEvents(timedEvents, durationMs),
        loaded_skill_bodies: structured.loaded_skill_bodies,
        loaded_references: structured.loaded_references,
        questions: structured.questions,
      },
    };
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
}

try {
  const options = parseArgs(process.argv.slice(2));
  const result = options.preflight
    ? await runPreflight(options)
    : await runRequest(options, await readRequest());
  process.stdout.write(`${JSON.stringify(result)}\n`);
} catch (error) {
  process.stderr.write(`${error?.stack ?? error}\n`);
  process.exitCode = 1;
}
