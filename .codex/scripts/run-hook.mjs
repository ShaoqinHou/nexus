#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const event = process.argv[2] || '';
const allowed = new Set(['session-start', 'pre-tool-use', 'post-tool-use', 'stop']);
if (!allowed.has(event)) {
  console.error(`Unknown Nexus hook event: ${event}`);
  process.exit(2);
}

const root = findRoot(process.cwd());
const script = join(root, '.codex', 'scripts', 'nexus-workflow.mjs');
if (!existsSync(script)) {
  console.error('Nexus hook script not found.');
  process.exit(0);
}

const stdin = readStdin();
const result = spawnSync(process.execPath, [script, 'hook', event], {
  cwd: root,
  input: stdin,
  encoding: 'utf8',
});
if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);
process.exit(result.status ?? 1);

function findRoot(start) {
  let dir = resolve(start);
  while (dir !== dirname(dir)) {
    if (existsSync(join(dir, '.codex', 'scripts', 'nexus-workflow.mjs'))) return dir;
    dir = dirname(dir);
  }
  return resolve(start);
}

function readStdin() {
  try {
    return readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}
