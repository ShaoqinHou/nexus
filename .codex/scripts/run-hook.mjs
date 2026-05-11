#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { findWorkflowRoot, loadCodexWorkflow } from './workflow-engine.mjs';

const event = process.argv[2] || '';
const allowed = new Set(['session-start', 'pre-tool-use', 'post-tool-use', 'stop']);
if (!allowed.has(event)) {
  console.error(`Unknown Codex workflow hook event: ${event}`);
  process.exit(2);
}

const root = findWorkflowRoot(process.cwd());
let script = '';
try {
  const workflow = loadCodexWorkflow(root);
  const configured = workflow.profile?.paths?.workflowWrapper;
  if (!configured) throw new Error('profile.paths.workflowWrapper is missing');
  script = resolve(root, configured);
} catch (error) {
  console.error(`Could not load Codex workflow profile for hook dispatch: ${error.message || error}`);
  process.exit(event === 'pre-tool-use' ? 1 : 0);
}

if (!existsSync(script)) {
  console.error(`Codex workflow hook wrapper not found: ${script}`);
  process.exit(event === 'pre-tool-use' ? 1 : 0);
}

const stdin = readStdin();
const result = spawnSync(process.execPath, [script, 'hook', event], {
  cwd: root,
  input: stdin,
  encoding: 'utf8',
  timeout: 30000,
  maxBuffer: 1024 * 1024,
});
if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);
process.exit(result.status ?? 1);

function readStdin() {
  try {
    return readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}
