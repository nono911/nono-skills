import { createHash } from 'node:crypto';
import { readdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

const IGNORED_FILE_NAMES = new Set(['.DS_Store']);

export async function listFiles(root, relative = '') {
  const directory = path.join(root, relative);
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (IGNORED_FILE_NAMES.has(entry.name)) continue;
    // Persist and compare relative paths in one portable format. Node's path.join
    // still accepts these paths when resolving them on Windows.
    const child = relative ? `${relative}/${entry.name}` : entry.name;
    if (entry.isDirectory()) files.push(...await listFiles(root, child));
    else if (entry.isFile()) files.push(child);
  }
  return files;
}

export async function sha256File(file) {
  const content = await readFile(file);
  return createHash('sha256').update(content).digest('hex');
}

export async function filesEqual(left, right) {
  try {
    return await sha256File(left) === await sha256File(right);
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}

export async function writeFileAtomic(file, content) {
  const temporary = `${file}.tmp-${process.pid}-${Date.now()}`;
  await writeFile(temporary, content, { mode: 0o600 });
  await rename(temporary, file);
}
