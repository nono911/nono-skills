import { currentHost, parseJsonObject } from '../provider-contract.mjs';

function scopedToolPath(cwd) {
  const normalized = cwd.replaceAll('\\', '/').replace(/\/+$/, '');
  if (/[(),]/.test(normalized)) {
    throw new Error('Claude Code worktree path cannot contain parentheses or commas');
  }
  return `${normalized}/**`;
}

export function buildClaudeArgs({
  mode,
  cwd,
  schema,
  maxBudgetUsd,
  maxTurns,
} = {}) {
  const review = mode === 'review';
  const scopedPath = scopedToolPath(cwd);
  const tools = review ? 'Read' : 'Read,Edit,Write';
  const allowedTools = review
    ? `Read(${scopedPath})`
    : `Read(${scopedPath}),Edit(${scopedPath}),Write(${scopedPath})`;
  const args = [
    '-p',
    '--safe-mode',
    '--no-session-persistence',
    '--output-format',
    'json',
    '--permission-mode',
    'dontAsk',
    '--tools',
    tools,
    '--allowedTools',
    allowedTools,
    '--json-schema',
    JSON.stringify(schema),
  ];
  if (maxBudgetUsd !== undefined) args.push('--max-budget-usd', String(maxBudgetUsd));
  if (maxTurns !== undefined) args.push('--max-turns', String(maxTurns));
  return args;
}

export const claudeAdapter = {
  name: 'claude',
  displayName: 'Claude Code',
  command: 'claude',
  versionArgs: ['--version'],
  helpProbes: [['--help']],
  requiredFlags: [
    '--print',
    '--output-format',
    '--permission-mode',
    '--tools',
    '--allowedTools',
    '--no-session-persistence',
    '--safe-mode',
    '--json-schema',
  ],
  limits: {
    maxBudgetUsd: '--max-budget-usd',
    maxTurns: '--max-turns',
  },
  schemaEnforced: true,
  roles: {
    review: { supported: true, boundary: 'scoped read tools; no shell' },
    implement: { supported: true, boundary: 'scoped file edits in an approved child worktree; no shell' },
  },
  capabilities: {
    headless: true,
    input: 'stdin',
    structuredOutput: 'json-schema',
    permissionBoundary: 'scoped-tools',
    sandbox: 'tool-policy',
    sessionPersistence: 'ephemeral',
    budgets: ['cost', 'turns', 'wall-time'],
  },
  isCurrentHost(env) {
    return currentHost(env, ['claude', 'claude-code', 'CLAUDECODE', 'CLAUDE_CODE_SESSION_ID']);
  },
  async prepare(options) {
    return {
      args: buildClaudeArgs(options),
      input: options.prompt,
      env: options.env,
      parse(stdout) {
        const response = parseJsonObject(stdout, 'Claude Code');
        if (
          response.type !== 'result'
          || response.subtype !== 'success'
          || response.is_error === true
        ) {
          throw new Error(`Claude Code returned an unsuccessful result: ${response.subtype ?? 'unknown'}`);
        }
        return {
          output: response.structured_output,
          usage: {
            totalCostUsd: response.total_cost_usd,
            durationMs: response.duration_ms,
            numTurns: response.num_turns,
          },
        };
      },
    };
  },
};
