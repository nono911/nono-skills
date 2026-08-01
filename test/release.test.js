import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { promisify } from 'node:util';

const exec = promisify(execFile);
const root = path.resolve(import.meta.dirname, '..');
const packageJson = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));

test('Git checkouts preserve LF for portable contract validation', async () => {
  const attributes = await readFile(path.join(root, '.gitattributes'), 'utf8');
  assert.match(attributes, /^\* text=auto eol=lf\n?$/);
});

test('release verification binds the GitHub release tag to the package version', async () => {
  const { stdout } = await exec(process.execPath, [
    '.github/scripts/verify-release-tag.mjs',
    `v${packageJson.version}`,
  ], { cwd: root });
  assert.equal(
    stdout,
    `Release tag v${packageJson.version} matches nono-skills ${packageJson.version}.\n`,
  );

  await assert.rejects(
    exec(process.execPath, ['.github/scripts/verify-release-tag.mjs', 'v999.999.999'], { cwd: root }),
    (error) => {
      assert.match(error.stderr, new RegExp(`does not match package version v${packageJson.version.replaceAll('.', '\\.')}\\b`));
      return true;
    },
  );
});

test('npm publish workflow uses trusted OIDC provenance and no long-lived token', async () => {
  const workflow = await readFile(path.join(root, '.github', 'workflows', 'publish.yml'), 'utf8');
  assert.match(workflow, /release:\n\s+types:\n\s+- published/);
  assert.match(workflow, /id-token: write/);
  assert.match(workflow, /actions\/checkout@v6/);
  assert.match(workflow, /actions\/setup-node@v6/);
  assert.match(workflow, /node \.github\/scripts\/verify-release-tag\.mjs/);
  assert.match(workflow, /npm run prepublishOnly/);
  assert.match(workflow, /npm publish --provenance --access public/);
  assert.doesNotMatch(workflow, /NPM_TOKEN|NODE_AUTH_TOKEN/);
});
