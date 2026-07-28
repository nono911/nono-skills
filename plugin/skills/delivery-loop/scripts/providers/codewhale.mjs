import { currentHost, parseEventStructuredOutput } from '../provider-contract.mjs';

export function buildCodeWhaleArgs({ mode, cwd, prompt }) {
  return [
    '--approval-policy',
    'never',
    '--sandbox-mode',
    mode === 'review' ? 'read-only' : 'workspace-write',
    '-C',
    cwd,
    'exec',
    '--auto',
    '--json',
    prompt,
  ];
}

export const codeWhaleAdapter = {
  name: 'codewhale',
  displayName: 'CodeWhale',
  command: 'codewhale',
  versionArgs: ['--version'],
  helpProbes: [['--help'], ['exec', '--help']],
  requiredFlags: [
    '--approval-policy',
    '--sandbox-mode',
    '--workspace',
    '--auto',
    '--json',
  ],
  limits: {},
  schemaEnforced: false,
  roles: {
    review: { supported: true, boundary: 'native read-only sandbox with shell disabled and delegation forbidden by contract' },
    implement: { supported: true, boundary: 'native workspace-write sandbox with shell disabled and delegation forbidden by contract' },
  },
  capabilities: {
    headless: true,
    input: 'argument',
    structuredOutput: 'validated-prompt-json',
    permissionBoundary: 'native-sandbox',
    sandbox: 'doctor-verified',
    sessionPersistence: 'local',
    budgets: ['wall-time'],
  },
  isCurrentHost(env) {
    return currentHost(env, ['codewhale', 'CODEWHALE_SESSION_ID']);
  },
  async inspectExtra({ execute, env, timeoutMs }) {
    const doctor = await execute('codewhale', ['doctor', '--json'], { env, timeoutMs });
    if (doctor.code !== 0) {
      return {
        roles: { review: false, implement: false },
        detail: `doctor probe failed: ${doctor.stderr.trim() || `exit ${doctor.code}`}`,
      };
    }
    try {
      const parsed = JSON.parse(doctor.stdout);
      const sandbox = parsed.sandbox?.available === true;
      return {
        roles: { review: sandbox, implement: sandbox },
        identity: {
          harness: 'codewhale',
          provider: parsed.capability?.resolved_provider,
          model: parsed.capability?.resolved_model,
        },
        detail: sandbox
          ? `sandbox available (${parsed.sandbox.kind ?? 'provider unknown'})`
          : 'CodeWhale reported no enforceable OS sandbox',
      };
    } catch {
      return {
        roles: { review: false, implement: false },
        detail: 'doctor returned malformed JSON',
      };
    }
  },
  async prepare(options) {
    const sandboxMode = options.mode === 'review' ? 'read-only' : 'workspace-write';
    return {
      args: buildCodeWhaleArgs(options),
      input: undefined,
      env: {
        ...options.env,
        CODEWHALE_ALLOW_SHELL: '0',
        CODEWHALE_APPROVAL_POLICY: 'never',
        CODEWHALE_SANDBOX_MODE: sandboxMode,
        CODEWHALE_MAX_SUBAGENTS: '1',
        CODEWHALE_VERBOSITY: 'concise',
      },
      parse(stdout) {
        return {
          output: parseEventStructuredOutput(stdout, 'CodeWhale'),
          usage: {},
        };
      },
    };
  },
};
