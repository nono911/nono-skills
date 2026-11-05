import { spawnSync } from 'node:child_process';
import { realpathSync } from 'node:fs';
import path from 'node:path';

const blocked = () => ({ error: new Error('Fixture sandbox unavailable'), status: null });

// No legacy/full-access fallback: post-run checks execute model-edited code.
// home must be a fresh, credential-free directory outside the model workspace.
export function createCodexFixtureRunner({ codex, home, workspace, run = spawnSync }) {
  const env = {
    PATH: (process.env.PATH ?? '').split(path.delimiter)
      .filter((entry) => path.isAbsolute(entry) && !entry.startsWith(workspace)).join(path.delimiter),
    HOME: home, USERPROFILE: home, CODEX_HOME: home,
    TMPDIR: home, TMP: home, TEMP: home,
    GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: path.join(home, 'empty-gitconfig'),
    OPENSSL_CONF: process.platform === 'win32' ? 'NUL' : '/dev/null',
    ...(process.env.SystemRoot ? { SystemRoot: process.env.SystemRoot } : {}),
  };
  const options = { cwd: home, env, encoding: 'utf8', timeout: 15_000, maxBuffer: 1_048_576 };
  const help = run(codex, ['sandbox', '--help'], options);
  if (help.status !== 0 || !help.stdout?.includes('--permission-profile')) return blocked;
  const filesystem = {
    ':root': 'deny', ':minimal': 'read',
    [realpathSync(workspace)]: 'read',
    [realpathSync(process.execPath)]: 'read',
  };
  // Allow exact loaded runtime libraries, never an entire installation prefix
  // or user home. Unresolvable loader aliases must fail the preflight closed.
  for (const library of process.report.getReport().sharedObjects) {
    if (path.isAbsolute(library)) {
      try { filesystem[realpathSync(library)] = 'read'; } catch { /* virtual library */ }
    }
  }
  const entries = Object.entries(filesystem).map(([key, value]) => `${JSON.stringify(key)}=${JSON.stringify(value)}`);
  const args = ['sandbox', '--permission-profile', 'nono-fixture', '--cd', home,
    '--config', `permissions.nono-fixture={filesystem={${entries.join(',')}},network={enabled=false}}`, '--'];
  const probe = run(codex, [...args, process.execPath, '-e', 'process.exit(0)'], options);
  if (probe.error || probe.signal || probe.status !== 0) return () => ({
    ...blocked(), error: new Error(`Fixture sandbox unavailable: ${probe.error?.message ?? probe.stderr ?? probe.status}`),
  });
  return (command, commandArgs) => run(codex, [...args, process.execPath, '-e', `
    const { spawnSync } = require('node:child_process');
    const result = spawnSync(${JSON.stringify(command)}, ${JSON.stringify(commandArgs)}, {
      cwd: ${JSON.stringify(workspace)}, stdio: 'inherit', env: process.env,
    });
    process.exit(result.error || result.signal ? 125 : result.status ?? 125);
  `], options);
}
