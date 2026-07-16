#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { run } from '../src/cli.js';
import { createHandlers } from '../src/commands.js';

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packageJson = JSON.parse(await readFile(path.join(packageRoot, 'package.json'), 'utf8'));
const context = {
  packageRoot,
  packageVersion: packageJson.version,
  home: os.homedir(),
  cwd: process.cwd(),
  stdout: process.stdout,
  stderr: process.stderr,
};
context.handlers = createHandlers(context);

process.exitCode = await run(process.argv.slice(2), context);
