import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { currentHost, parseJsonObject } from '../provider-contract.mjs';

export function buildCodexArgs({ mode, cwd, schemaFile }) {
  return [
    'exec',
    '--ephemeral',
    '--ignore-user-config',
    '--disable',
    'multi_agent',
    '-c',
    'approval_policy="never"',
    '--sandbox',
    mode === 'review' ? 'read-only' : 'workspace-write',
    '-C',
    cwd,
    '--output-schema',
    schemaFile,
    '--color',
    'never',
    '-',
  ];
}

export const codexAdapter = {
  name: 'codex',
  displayName: 'OpenAI Codex',
  command: 'codex',
  versionArgs: ['--version'],
  helpProbes: [['exec', '--help']],
  requiredFlags: [
    '--sandbox',
    '--cd',
    '--ephemeral',
    '--ignore-user-config',
    '--output-schema',
    '--disable',
  ],
  limits: {},
  schemaEnforced: true,
  roles: {
    review: { supported: true, boundary: 'native read-only sandbox' },
    implement: { supported: true, boundary: 'native workspace-write sandbox in an approved child worktree' },
  },
  capabilities: {
    guarantees: ['headless', 'structured-output', 'read-only-review', 'isolated-write', 'no-delegation', 'ephemeral-session', 'wall-time-budget'],
    headless: true,
    input: 'stdin',
    structuredOutput: 'json-schema',
    permissionBoundary: 'native-sandbox',
    sandbox: 'read-only-or-workspace-write',
    sessionPersistence: 'ephemeral',
    budgets: ['wall-time'],
  },
  isCurrentHost(env) {
    return currentHost(env, ['codex', 'CODEX_THREAD_ID', 'CODEX_CI']);
  },
  async prepare(options) {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'nono-codex-schema-'));
    const schemaFile = path.join(directory, 'result.schema.json');
    await writeFile(schemaFile, `${JSON.stringify(options.schema)}\n`, { mode: 0o600 });
    return {
      args: buildCodexArgs({ ...options, schemaFile }),
      input: options.prompt,
      env: options.env,
      parse(stdout) {
        return { output: parseJsonObject(stdout, 'OpenAI Codex'), usage: {} };
      },
      async cleanup() {
        await rm(directory, { recursive: true, force: true });
      },
    };
  },
};
