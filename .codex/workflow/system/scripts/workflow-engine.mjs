import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

export const DEFAULT_POLICY_NAMES = [
  'records',
  'compatibility',
  'files',
  'guide',
  'adapters',
  'portability',
  'routing',
  'intake',
  'hooks',
  'gates',
];

export function loadCodexWorkflow(root, options = {}) {
  const codexDir = options.codexDir || '.codex';
  const strictPolicy = options.strictPolicy !== false;
  const codex = join(root, codexDir);
  const profilePath = join(codex, 'workflow', 'profile.json');
  const profile = strictPolicy ? readRequiredJsonFile(profilePath) : readJsonFile(profilePath, {});
  const policyRoot = join(codex, 'workflow', 'policy');
  const manifestPath = join(policyRoot, 'manifest.json');
  const explicitPolicyNames = Array.isArray(options.policyNames);
  const manifest = explicitPolicyNames && !existsSync(manifestPath)
    ? {}
    : (strictPolicy ? readRequiredJsonFile(manifestPath) : readJsonFile(manifestPath, {}));
  const policyNames = options.policyNames
    || policyNamesFromManifest(manifest, strictPolicy);
  const policy = { manifest };
  for (const name of policyNames) {
    const policyPath = join(policyRoot, `${name}.json`);
    policy[name] = strictPolicy ? readRequiredJsonFile(policyPath) : readJsonFile(policyPath, {});
  }
  return {
    root,
    codex,
    profile,
    policy,
    policyNames,
    files: {
      profile: relativeProjectPath(root, profilePath),
      manifest: relativeProjectPath(root, manifestPath),
      policies: [manifestPath, ...policyNames.map((name) => join(policyRoot, `${name}.json`))]
        .map((path) => relativeProjectPath(root, path)),
    },
  };
}

function policyNamesFromManifest(manifest, strictPolicy) {
  if (Array.isArray(manifest.policyNames) && manifest.policyNames.length) return manifest.policyNames;
  if (strictPolicy) {
    throw new Error('Workflow policy manifest must declare a non-empty policyNames array.');
  }
  return DEFAULT_POLICY_NAMES;
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

export function readRequiredJsonFile(path) {
  if (!existsSync(path)) throw new Error(`Missing required workflow JSON ${path}`);
  return readJsonFile(path, {});
}

export function requiredProfileString(workflow, path) {
  const value = nestedValue(workflow?.profile || {}, path);
  if (!value || typeof value !== 'string') {
    throw new Error(`Workflow profile ${path} must be a non-empty string.`);
  }
  return value;
}

export function requiredPolicySection(workflow, sectionName) {
  const section = workflow?.policy?.[sectionName];
  if (!section || typeof section !== 'object') {
    throw new Error(`Workflow policy ${sectionName}.json is required.`);
  }
  return section;
}

export function requiredPolicyString(workflow, sectionName, path) {
  const value = nestedValue(requiredPolicySection(workflow, sectionName), path);
  if (!value || typeof value !== 'string') {
    throw new Error(`Workflow policy ${sectionName}.${path} must be a non-empty string.`);
  }
  return value;
}

export function requiredPolicyArray(workflow, sectionName, path) {
  const value = nestedValue(requiredPolicySection(workflow, sectionName), path);
  if (!Array.isArray(value) || !value.length) {
    throw new Error(`Workflow policy ${sectionName}.${path} must be a non-empty array.`);
  }
  return value;
}

export function requiredPolicyObject(workflow, sectionName, path) {
  const value = nestedValue(requiredPolicySection(workflow, sectionName), path);
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`Workflow policy ${sectionName}.${path} must be an object.`);
  }
  return value;
}

export function publicSanitizerForbiddenStrings(workflow, root = '') {
  return asArray(workflow?.policy?.guide?.publicSanitizer?.forbiddenStrings)
    .map((value) => policyText(value, root))
    .filter(Boolean);
}

export function applyPublicSanitizer(value, workflow, root = '') {
  let safe = String(value || '');
  for (const rule of asArray(workflow?.policy?.guide?.publicSanitizer?.redactions)) {
    const replacement = String(rule?.replacement ?? 'redacted');
    if (rule?.literal) {
      safe = safe.replaceAll(policyText(rule.literal, root), replacement);
    } else if (rule?.pattern) {
      safe = safe.replace(new RegExp(policyText(rule.pattern, root), rule.flags || 'g'), replacement);
    }
  }
  return safe;
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

export function tomlSectionLines(text, section = '') {
  const target = String(section || '');
  let current = '';
  const lines = [];
  for (const line of String(text || '').split(/\r?\n/)) {
    const match = line.match(/^\s*\[([^\]]+)\]\s*$/);
    if (match) {
      current = match[1];
      continue;
    }
    if (current === target) lines.push(line);
  }
  return lines;
}

export function tomlValueInSection(text, section, key) {
  const escaped = String(key || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`^\\s*${escaped}\\s*=\\s*(.+?)\\s*(?:#.*)?$`);
  for (const line of tomlSectionLines(text, section)) {
    const match = line.match(pattern);
    if (match) return match[1].trim();
  }
  return undefined;
}

export function tomlHasKeyInSection(text, section, key) {
  return tomlValueInSection(text, section, key) !== undefined;
}

export function tomlBooleanInSection(text, section, key) {
  const value = tomlValueInSection(text, section, key);
  if (value === 'true') return true;
  if (value === 'false') return false;
  return undefined;
}

function relativeProjectPath(root, path) {
  return path.replace(root, '').replace(/^[/\\]/, '').replaceAll('\\', '/');
}

function nestedValue(source, path) {
  return String(path || '').split('.').reduce((current, key) => current?.[key], source);
}

function policyText(value, root = '') {
  return String(value || '')
    .replaceAll('{rootPosix}', String(root || '').replaceAll('\\', '/'))
    .replaceAll('{root}', String(root || ''));
}
