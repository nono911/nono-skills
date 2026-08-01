import { currentHost } from '../provider-contract.mjs';

export const antigravityAdapter = {
  name: 'antigravity',
  displayName: 'Google Antigravity',
  command: 'agy',
  versionArgs: ['--version'],
  helpProbes: [['--help']],
  requiredFlags: [],
  limits: {},
  schemaEnforced: false,
  automationUnsupported: 'official AGY CLI is TUI-first; install google-antigravity SDK for a future programmatic adapter',
  roles: {
    review: { supported: false, boundary: 'no verified one-shot CLI contract' },
    implement: { supported: false, boundary: 'no verified one-shot CLI contract' },
  },
  capabilities: {
    guarantees: ['interactive-only'],
    headless: false,
    input: 'interactive-tui',
    structuredOutput: 'none',
    permissionBoundary: 'interactive',
    sandbox: 'interactive-settings',
    sessionPersistence: 'local',
    budgets: [],
    sdkPackage: 'google-antigravity',
  },
  isCurrentHost(env) {
    return currentHost(env, ['antigravity', 'agy', 'ANTIGRAVITY_SESSION_ID']);
  },
};
