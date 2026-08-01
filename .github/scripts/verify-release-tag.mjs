#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..', '..');
const packageJson = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
const tag = process.argv[2] ?? process.env.RELEASE_TAG;
const expected = `v${packageJson.version}`;

if (!tag) throw new Error('Release tag is required through RELEASE_TAG or the first argument');
if (tag !== expected) throw new Error(`Release tag ${tag} does not match package version ${expected}`);

console.log(`Release tag ${tag} matches nono-skills ${packageJson.version}.`);
