import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { createHandlers } from '../src/commands.js';

function writer() {
  let value = '';
  return { stream: { write(chunk) { value += chunk; } }, read: () => value };
}

test('init creates only repository guidance and preserves legacy artifacts', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'engineering-command-'));
  const packageRoot = path.join(root, 'package');
  const target = path.join(root, 'project');
  await mkdir(path.join(packageRoot, 'templates'), { recursive: true });
  await mkdir(path.join(target, 'docs', 'agent'), { recursive: true });
  await writeFile(path.join(packageRoot, 'templates', 'AGENTS.md'), 'rules');
  await writeFile(path.join(target, 'docs', 'agent', 'spec.md'), 'legacy spec');

  const stdout = writer();
  const handlers = createHandlers({
    packageRoot, home: path.join(root, 'home'), cwd: root,
    packageVersion: '0.2.0', stdout: stdout.stream, stderr: writer().stream,
  });

  assert.equal(await handlers.init({ target, force: false, dryRun: false }), 0);
  assert.equal(await readFile(path.join(target, 'AGENTS.md'), 'utf8'), 'rules');
  assert.equal(await readFile(path.join(target, 'docs', 'agent', 'spec.md'), 'utf8'), 'legacy spec');
  const state = JSON.parse(await readFile(path.join(target, '.codex-engineering-skills.json'), 'utf8'));
  assert.deepEqual(Object.keys(state.files), ['AGENTS.md']);
  assert.match(stdout.read(), /Created 1/);
});

test('init command refuses all writes when a conflict exists', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'engineering-command-'));
  const packageRoot = path.join(root, 'package');
  const target = path.join(root, 'project');
  await mkdir(path.join(packageRoot, 'templates'), { recursive: true });
  await mkdir(target, { recursive: true });
  await writeFile(path.join(packageRoot, 'templates', 'AGENTS.md'), 'rules');
  await writeFile(path.join(packageRoot, 'templates', 'new.md'), 'new');
  await writeFile(path.join(target, 'AGENTS.md'), 'custom');
  const stderr = writer();
  const handlers = createHandlers({ packageRoot, home: path.join(root, 'home'), cwd: root, packageVersion: '0.1.0', stdout: writer().stream, stderr: stderr.stream });
  assert.equal(await handlers.init({ target, force: false, dryRun: false }), 1);
  await assert.rejects(stat(path.join(target, 'new.md')), { code: 'ENOENT' });
  assert.match(stderr.read(), /Conflicts/);
});

test('init without a target writes to the discovered Git root and reports it', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'engineering-command-root-'));
  const packageRoot = path.join(root, 'package');
  const gitRoot = path.join(root, 'repo');
  const nested = path.join(gitRoot, 'packages', 'api');
  await mkdir(path.join(packageRoot, 'templates'), { recursive: true });
  await mkdir(nested, { recursive: true });
  await writeFile(path.join(packageRoot, 'templates', 'AGENTS.md'), 'rules');
  const stdout = writer();
  const handlers = createHandlers({
    packageRoot,
    home: path.join(root, 'home'),
    cwd: nested,
    packageVersion: '0.7.0',
    stdout: stdout.stream,
    stderr: writer().stream,
    findGitRoot: async () => gitRoot,
  });

  assert.equal(await handlers.init({ target: undefined, force: false, dryRun: false }), 0);
  assert.equal(await readFile(path.join(gitRoot, 'AGENTS.md'), 'utf8'), 'rules');
  assert.match(stdout.read(), new RegExp(`Target: ${gitRoot.replaceAll('\\', '\\\\')}`));
});

test('doctor command returns failure when checks fail', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'engineering-command-'));
  const stdout = writer();
  const handlers = createHandlers({
    packageRoot: root, home: path.join(root, 'home'), cwd: root, packageVersion: '0.1.0',
    stdout: stdout.stream, stderr: writer().stream,
    runCodex: async () => ({ code: 127, stdout: '', stderr: 'not found' }),
  });
  assert.equal(await handlers.doctor({}), 1);
  assert.match(stdout.read(), /FAIL codex/);
});

test('purge preflight fails before uninstall when project state is missing', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'engineering-command-'));
  let uninstallCalls = 0;
  const handlers = createHandlers({
    packageRoot: root, home: path.join(root, 'home'), cwd: root, packageVersion: '0.1.0',
    stdout: writer().stream, stderr: writer().stream,
    uninstallPlugin: async () => { uninstallCalls += 1; },
  });
  await assert.rejects(handlers.uninstall({ purgeProject: path.join(root, 'missing') }), /ownership state not found/);
  assert.equal(uninstallCalls, 0);
});
