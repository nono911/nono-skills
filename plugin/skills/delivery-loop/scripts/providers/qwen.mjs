import { currentHost, parseJsonObject } from '../provider-contract.mjs';

export function buildQwenArgs({
  mode,
  schema,
  maxTurns,
  maxToolCalls,
  timeoutMs,
}) {
  const review = mode === 'review';
  return [
    '--safe-mode',
    '--sandbox',
    '--approval-mode',
    review ? 'plan' : 'auto-edit',
    '--exclude-tools',
    review
      ? 'agent,shell,write,edit,web_fetch,web_search'
      : 'agent,shell,web_fetch,web_search',
    '--json-schema',
    JSON.stringify(schema),
    '--max-session-turns',
    String(maxTurns),
    '--max-tool-calls',
    String(maxToolCalls),
    '--max-wall-time',
    `${Math.max(1, Math.ceil(timeoutMs / 1000))}s`,
  ];
}

export const qwenAdapter = {
  name: 'qwen',
  displayName: 'Qwen Code',
  command: 'qwen',
  versionArgs: ['--version'],
  helpProbes: [['--help']],
  requiredFlags: [
    '--safe-mode',
    '--sandbox',
    '--approval-mode',
    '--exclude-tools',
    '--json-schema',
    '--max-session-turns',
    '--max-tool-calls',
    '--max-wall-time',
  ],
  limits: {
    maxTurns: '--max-session-turns',
    maxToolCalls: '--max-tool-calls',
  },
  schemaEnforced: true,
  roles: {
    review: { supported: true, boundary: 'plan mode with write, shell, web, and subagent tools excluded' },
    implement: { supported: true, boundary: 'sandboxed auto-edit in an approved child worktree; no shell or subagents' },
  },
  capabilities: {
    headless: true,
    input: 'stdin',
    structuredOutput: 'json-schema',
    permissionBoundary: 'tool-exclusion-and-sandbox',
    sandbox: 'required-at-run',
    sessionPersistence: 'local-redacted',
    budgets: ['turns', 'tools', 'wall-time'],
  },
  isCurrentHost(env) {
    return currentHost(env, ['qwen', 'qwen-code', 'QWEN_CODE_SESSION_ID']);
  },
  async prepare(options) {
    return {
      args: buildQwenArgs(options),
      input: options.prompt,
      env: options.env,
      parse(stdout) {
        return { output: parseJsonObject(stdout, 'Qwen Code'), usage: {} };
      },
    };
  },
};
