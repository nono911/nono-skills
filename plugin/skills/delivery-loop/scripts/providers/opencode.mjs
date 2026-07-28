import { currentHost, parseEventStructuredOutput } from '../provider-contract.mjs';

function permissionConfig(mode) {
  return {
    $schema: 'https://opencode.ai/config.json',
    permission: {
      '*': 'deny',
      read: {
        '*': 'allow',
        '*.env': 'deny',
        '*.env.*': 'deny',
        '*.env.example': 'allow',
      },
      glob: 'allow',
      grep: 'allow',
      list: 'allow',
      edit: mode === 'implement' ? 'allow' : 'deny',
      external_directory: 'deny',
      bash: 'deny',
      task: 'deny',
      skill: 'deny',
      lsp: 'deny',
      question: 'deny',
      webfetch: 'deny',
      websearch: 'deny',
      todowrite: 'deny',
    },
  };
}

export function buildOpenCodeArgs({ cwd, prompt }) {
  return [
    '--pure',
    'run',
    '--auto',
    '--format',
    'json',
    '--dir',
    cwd,
    prompt,
  ];
}

export const openCodeAdapter = {
  name: 'opencode',
  displayName: 'OpenCode',
  command: 'opencode',
  versionArgs: ['--version'],
  helpProbes: [['--help'], ['run', '--help']],
  requiredFlags: ['--pure', '--auto', '--format', '--dir'],
  limits: {},
  schemaEnforced: false,
  roles: {
    review: { supported: true, boundary: 'pure mode with deny-by-default inline permissions' },
    implement: { supported: true, boundary: 'workspace-only edit permission; shell, external paths, plugins, and subagents denied' },
  },
  capabilities: {
    headless: true,
    input: 'argument',
    structuredOutput: 'validated-prompt-json',
    permissionBoundary: 'deny-by-default-tools',
    sandbox: 'workspace-path-permissions',
    sessionPersistence: 'local',
    budgets: ['wall-time'],
  },
  isCurrentHost(env) {
    return currentHost(env, ['opencode', 'OPENCODE_SESSION_ID']);
  },
  async prepare(options) {
    return {
      args: buildOpenCodeArgs(options),
      input: undefined,
      env: {
        ...options.env,
        OPENCODE_CONFIG_CONTENT: JSON.stringify(permissionConfig(options.mode)),
        OPENCODE_DISABLE_AUTOUPDATE: '1',
      },
      parse(stdout) {
        return {
          output: parseEventStructuredOutput(stdout, 'OpenCode'),
          usage: {},
        };
      },
    };
  },
};
