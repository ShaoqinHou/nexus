import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

export const DEFAULT_POLICY_NAMES = [
  'records',
  'files',
  'guide',
  'design',
  'routing',
  'deployment',
  'hooks',
  'gates',
];

export function loadCodexWorkflow(root, options = {}) {
  const codexDir = options.codexDir || '.codex';
  const codex = join(root, codexDir);
  const profilePath = join(codex, 'workflow', 'profile.json');
  const profile = readJsonFile(profilePath, {});
  const policyRoot = join(codex, 'workflow', 'policy');
  const policyNames = options.policyNames || DEFAULT_POLICY_NAMES;
  const policy = {};
  for (const name of policyNames) {
    policy[name] = readJsonFile(join(policyRoot, `${name}.json`), {});
  }
  return {
    root,
    codex,
    profile,
    policy,
    files: {
      profile: relativeProjectPath(root, profilePath),
      policies: policyNames.map((name) => relativeProjectPath(root, join(policyRoot, `${name}.json`))),
    },
  };
}

export function findWorkflowRoot(start = process.cwd(), options = {}) {
  const codexDir = options.codexDir || '.codex';
  let dir = resolve(start);
  let firstCodexRoot = null;
  while (dir !== dirname(dir)) {
    if (existsSync(join(dir, codexDir, 'workflow', 'profile.json'))) return dir;
    if (!firstCodexRoot && existsSync(join(dir, codexDir))) firstCodexRoot = dir;
    dir = dirname(dir);
  }
  return firstCodexRoot || resolve(start);
}

export function readJsonFile(path, fallback = {}) {
  if (!existsSync(path)) return fallback;
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    throw new Error(`Could not parse workflow JSON ${path}: ${error.message}`);
  }
}

export function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null || value === '') return [];
  return [value];
}

export function pathMatchesPattern(file, pattern) {
  const f = String(file || '').replaceAll('\\', '/');
  const p = String(pattern || '').replaceAll('\\', '/');
  if (!p) return false;
  if (p.endsWith('/')) return f.startsWith(p);
  if (!p.includes('*')) return f === p || f.startsWith(`${p}/`);
  const globstar = '__CODEX_WORKFLOW_GLOBSTAR__';
  const escaped = p
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replaceAll('**', globstar)
    .replaceAll('*', '[^/]*')
    .replaceAll(globstar, '.*');
  return new RegExp(`^${escaped}$`).test(f);
}

export function pathMatchesAny(file, patterns = []) {
  return asArray(patterns).some((pattern) => pathMatchesPattern(file, pattern));
}

export function pathMatchesPolicy(file, policy = {}) {
  if (Array.isArray(policy)) return pathMatchesAny(file, policy);
  if (pathMatchesAny(file, policy.exclude || policy.excludes || [])) return false;
  return pathMatchesAny(file, policy.include || policy.includes || []);
}

function relativeProjectPath(root, path) {
  return path.replace(root, '').replace(/^[/\\]/, '').replaceAll('\\', '/');
}
