#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { appendFileSync, existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve, relative, isAbsolute } from 'node:path';
import { platform, tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import {
  DEFAULT_POLICY_NAMES,
  findWorkflowRoot,
  applyPublicSanitizer,
  loadCodexWorkflow,
  pathMatchesPattern as workflowPathMatchesPattern,
  pathMatchesPolicy,
  readJsonFile,
  publicSanitizerForbiddenStrings,
  tomlBooleanInSection,
  tomlHasKeyInSection,
  tomlValueInSection,
} from './workflow-engine.mjs';

const START = process.cwd();
const ROOT = findWorkflowRoot(START);
const CODEX = join(ROOT, '.codex');
const WORKFLOW = loadCodexWorkflow(ROOT);
const PROFILE = WORKFLOW.profile || {};
const POLICY = WORKFLOW.policy || {};
const LOADED_POLICY_NAMES = WORKFLOW.policyNames || DEFAULT_POLICY_NAMES;
const RECORDS = profileProjectPath('records');
const STATE_DIR = profileProjectPath('state');
const RUNTIME_DIR = profileProjectPath('runtime');
const STATE_FILE = join(STATE_DIR, 'review-state.json');
const VERIFY_STATE_FILE = join(STATE_DIR, 'verify-state.json');
const AUDIT_STATE_FILE = join(STATE_DIR, 'audit-state.json');
const PATCH_STATE_FILE = join(STATE_DIR, 'patch-state.json');
const GUIDE_BROWSER_STATE_FILE = join(STATE_DIR, 'guide-browser-state.json');
const DASHBOARD_DIR = profileProjectPath('dashboardDir');
const ZOO_GUIDE_DIR = profileProjectPath('zooGuideDir');
const ZOO_GUIDE_MANIFEST = profileProjectPath('zooGuideManifest');
const ROUTING_SCENARIOS_FILE = POLICY.routing?.scenarioFile ? resolveProjectPath(POLICY.routing.scenarioFile) : profileProjectPath('routingScenarios');
const CURRENT_STATE_FILE = profileProjectPath('currentState');
const RISKS_FILE = profileProjectPath('risks');
const KNOWLEDGE_DIR = profileProjectPath('knowledgeDir');
const AGENTS_DIR = profileProjectPath('agentsDir');
const WORKFLOW_WRAPPER = profileProjectPath('workflowWrapper');
const GUIDE_BROWSER_FINAL_ARTIFACTS_DIR = profileProjectPath('guideBrowserFinalArtifacts');
const ROUTING_STATE_FILE = join(STATE_DIR, 'routing-state.json');
const COMMAND_RUNS_FILE = join(RUNTIME_DIR, 'command-runs.jsonl');
const PROFILE_ENV = PROFILE.env || {};
const PUBLIC_WORKFLOW_URL_ENV = PROFILE_ENV.publicWorkflowUrl || 'NEXUS_PUBLIC_WORKFLOW_URL';
const PUBLIC_GUIDE_URL = requiredPolicyString('deployment', 'publicGuideUrl');
const PUBLIC_ZOO_GUIDE_URL = requiredPolicyString('deployment', 'visualZooGuideUrl');
const PUBLIC_GUIDE_VERSION = requiredPolicyString('guide', 'version');
const ZOO_VISUAL_GUIDE_VERSION = requiredPolicyString('design', 'zooVisualGuideVersion');
const PUBLIC_GUIDE_CONTENT_HASH_PLACEHOLDER = requiredPolicyString('guide', 'contentHashPlaceholder');
const GUIDE_META_NAMES = requiredPolicyObject('guide', 'metaNames');
const GUIDE_TOKEN_SOURCE_LABEL = requiredPolicyString('guide', 'tokenSourceLabel');
const GUIDE_TITLES = requiredPolicyObject('guide', 'titles');
const ZOO_VISUAL_GUIDE_TITLE = requiredPolicyString('design', 'zooVisualGuideTitle');
const ZOO_VISUAL_REQUIRED_STRINGS = requiredPolicyArray('design', 'zooVisualGuideRequiredStrings');
const LOCAL_WEB_URL = requiredPolicyString('design', 'localWebUrl').replace(/\/$/, '');
const DESIGN_ROUTE = requiredPolicyString('design', 'designRoute').startsWith('/')
  ? requiredPolicyString('design', 'designRoute')
  : `/${requiredPolicyString('design', 'designRoute')}`;
const PRODUCTION_DESIGN_PATH = requiredPolicyString('design', 'productionDesignPath');
const DESIGN_REGISTRY_PATH = requiredPolicyString('design', 'registryPath');
const DESIGN_ZOO_ROUTE_PATH = requiredPolicyString('design', 'zooRoutePath');
const DESIGN_THEME_MATRIX_PATH = requiredPolicyString('design', 'themeMatrixPath');
const DESIGN_THEME_DIRECTORY_PATH = requiredPolicyString('design', 'themeDirectoryPath');
const RECORD_KINDS = requiredPolicyArray('records', 'kinds');
const EVIDENCE_RECORD_KINDS = requiredPolicyArray('records', 'evidenceKinds');
const GUIDE_RECORD_KINDS = requiredPolicyArray('records', 'guideKinds');
const SCHEMA_BY_KIND = POLICY.records?.schemaByKind || {};
const PREFIX_BY_KIND = POLICY.records?.prefixByKind || {};
const LEGACY_SCHEMA_BY_KIND = POLICY.records?.legacySchemaByKind || {};
const LEGACY_SCHEMA_RECORDS = new Set(POLICY.records?.legacySchemaRecords || []);
const RECORD_HISTORY_BASE_ENV = requiredPolicyNestedString('records', 'baseEnv.recordHistory');
const BRANCH_BASE_ENV = requiredPolicyNestedString('records', 'baseEnv.branch');
const INTAKE_POLICY = requiredPolicySection('intake');
const INTAKE_ENABLED = INTAKE_POLICY.enabled !== false;
const INTENT_RECORD_KIND = requiredPolicyNestedString('intake', 'recordKinds.intents');
const WORK_SLICE_RECORD_KIND = requiredPolicyNestedString('intake', 'recordKinds.workSlices');
const WORK_INTAKE_EVIDENCE_KINDS = requiredPolicyArray('intake', 'evidenceKinds').map(String);

function ensureDir(path) {
  mkdirSync(path, { recursive: true });
}

function resolveProjectPath(path) {
  return resolve(ROOT, path || '.');
}

function projectRel(path) {
  return relative(ROOT, isAbsolute(String(path || '')) ? path : resolveProjectPath(path)).replaceAll('\\', '/');
}

function profileProjectPath(key) {
  const value = PROFILE.paths?.[key];
  if (!value || typeof value !== 'string') {
    throw new Error(`Workflow profile paths.${key} must be configured.`);
  }
  return resolveProjectPath(value);
}

function profileProjectRel(key) {
  return projectRel(profileProjectPath(key));
}

function recordKindDirRel(kind) {
  return `${profileProjectRel('records')}/${kind}`.replaceAll('//', '/');
}

function requiredPolicySection(sectionName) {
  const section = POLICY[sectionName];
  if (!section || typeof section !== 'object') throw new Error(`Workflow policy ${sectionName}.json is required.`);
  return section;
}

function requiredPolicyString(sectionName, key) {
  const value = requiredPolicySection(sectionName)[key];
  if (!value || typeof value !== 'string') throw new Error(`Workflow policy ${sectionName}.${key} must be a non-empty string.`);
  return value;
}

function requiredPolicyArray(sectionName, key) {
  const value = requiredPolicySection(sectionName)[key];
  if (!Array.isArray(value) || !value.length) throw new Error(`Workflow policy ${sectionName}.${key} must be a non-empty array.`);
  return value;
}

function requiredPolicyObject(sectionName, key) {
  const value = requiredPolicySection(sectionName)[key];
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`Workflow policy ${sectionName}.${key} must be an object.`);
  return value;
}

function requiredPolicyNestedValue(sectionName, path, test, description) {
  const section = requiredPolicySection(sectionName);
  const value = String(path).split('.').reduce((current, key) => current?.[key], section);
  if (!test(value)) throw new Error(`Workflow policy ${sectionName}.${path} must be ${description}.`);
  return value;
}

function requiredPolicyNestedString(sectionName, path) {
  return requiredPolicyNestedValue(sectionName, path, (value) => typeof value === 'string' && value.length > 0, 'a non-empty string');
}

function requiredPolicyNestedArray(sectionName, path) {
  return requiredPolicyNestedValue(sectionName, path, (value) => Array.isArray(value) && value.length > 0, 'a non-empty array');
}

function designTokenSourceFile() {
  const file = POLICY.design?.tokenSource?.file;
  if (!file || typeof file !== 'string') throw new Error('Workflow policy design.tokenSource.file must be configured.');
  return file;
}

function readStdin() {
  try {
    return readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith('--')) {
      out._.push(arg);
      continue;
    }
    const key = arg.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) {
      out[key] = true;
    } else {
      out[key] = next;
      i++;
    }
  }
  return out;
}

function hasTopLevelHelp(argv) {
  const separator = argv.indexOf('--');
  const args = separator >= 0 ? argv.slice(0, separator) : argv;
  return args.includes('--help') || args.includes('-h');
}

function helpTextForCommand(commandName = '') {
  const script = 'node .codex/scripts/nexus-workflow.mjs';
  const usage = {
    'record-intent': `${script} record-intent --kind <kind> --status captured --summary "<user intent>"`,
    'record-work-slice': `${script} record-work-slice --intent <INTENT-id> --status active --summary "<lead interpretation>" --acceptance "<done signals>" --verification "<checks>"`,
    'close-work-slice': `${script} close-work-slice --slice <WORK-SLICE-id> --status done --notes "<evidence complete>"`,
    'record-patch': `${script} record-patch --summary "<summary>" --files "a,b" [--scope worktree|branch] [--worker <agent>] [--work-slice <id>]`,
    'record-review': `${script} record-review --scope worktree|branch --kind general|pattern|design|workflow|integrated --verdict pass|fail|needs-work --reviewer <name> --notes "<summary>"`,
    'record-verify': `${script} record-verify --scope worktree|branch --verdict pass|fail|partial|blocked --verifier <name> --commands "<timed-command-ids>" --notes "<summary>"`,
    'record-audit': `${script} record-audit --scope worktree|branch --verdict pass|fail|partial|blocked --auditor <name> --commands "<timed-command-ids>" --notes "<summary>"`,
    'record-deployment': `${script} record-deployment --summary "<deploy>" --target "<url>" --verdict pass|fail|partial|blocked --operator <name> --commands "<timed-command-ids>" --checks "<checks>"`,
    run: `${script} run --id <stable-id> --timeout-ms <ms> --warn-ms <ms> -- <command> [args...]`,
  };
  if (commandName && commandName !== 'help' && usage[commandName]) return `Usage:\n  ${usage[commandName]}`;
  return [
    'Usage:',
    `  ${script} <command> [options]`,
    '',
    `Common commands: status, health, release-gate, deployed-gate, ${Object.keys(usage).join(', ')}`,
    `Run ${script} <command> --help for command-specific usage where available.`,
  ].join('\n');
}

function sortedStringSet(values = []) {
  return [...new Set((values || []).map(String))].sort();
}

function sameStringSet(actual = [], expected = []) {
  return JSON.stringify(sortedStringSet(actual)) === JSON.stringify(sortedStringSet(expected));
}

function canonicalLadder(policy = POLICY) {
  const ladder = policy.gates?.canonicalLadder;
  if (!Array.isArray(ladder) || !ladder.length) throw new Error('Workflow policy gates.canonicalLadder must be a non-empty array.');
  return ladder.map(String);
}

function canonicalLadderCommands(policy = POLICY) {
  return canonicalLadder(policy).map((script) => `npm run ${script}`);
}

function canonicalLadderInline(policy = POLICY, html = escapeHtml) {
  return canonicalLadderCommands(policy).map((command) => `<code>${html(command)}</code>`).join(', ');
}

function guideResumePolicy() {
  return POLICY.guide?.resume && typeof POLICY.guide.resume === 'object' ? POLICY.guide.resume : {};
}

function guideResumeReadDocs() {
  return Array.isArray(guideResumePolicy().readDocs) ? guideResumePolicy().readDocs.map(String).filter(Boolean) : [];
}

function guideBranchCloseoutCommands() {
  return Array.isArray(guideResumePolicy().branchCloseoutCommands)
    ? guideResumePolicy().branchCloseoutCommands.map(String).filter(Boolean)
    : [];
}

function guideSessionStartPolicy() {
  return POLICY.guide?.sessionStart && typeof POLICY.guide.sessionStart === 'object' ? POLICY.guide.sessionStart : {};
}

function guideSessionStartReadDocs() {
  const policy = guideSessionStartPolicy();
  return Array.isArray(policy.readDocs) ? policy.readDocs.map((doc) => String(doc).replaceAll('{currentState}', profileProjectRel('currentState'))).filter(Boolean) : [];
}

function localDesignUrl(route = DESIGN_ROUTE) {
  const normalized = String(route || DESIGN_ROUTE).startsWith('/') ? String(route || DESIGN_ROUTE) : `/${String(route || DESIGN_ROUTE)}`;
  return `${LOCAL_WEB_URL}${normalized}`;
}

function gitDir() {
  const dotgit = join(ROOT, '.git');
  if (!existsSync(dotgit)) return null;
  const st = statSync(dotgit);
  if (st.isDirectory()) return dotgit;
  const text = readFileSync(dotgit, 'utf8').trim();
  const match = text.match(/^gitdir:\s*(.+)$/i);
  if (!match) return null;
  const raw = match[1].trim();
  return resolve(ROOT, raw).replaceAll('\\', '/');
}

function git(args, options = {}) {
  const gd = gitDir();
  const base = gd ? [`--git-dir=${gd}`, `--work-tree=${ROOT}`] : ['-C', ROOT];
  const result = spawnSync('git', [...base, ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: 30000,
    maxBuffer: 10 * 1024 * 1024,
    ...options,
  });
  return result;
}

function gitText(args) {
  const result = git(args);
  if (result.status !== 0) return '';
  return result.stdout.trim();
}

function changedFiles() {
  const tracked = gitText(['diff', '--name-only']).split(/\r?\n/).filter(Boolean);
  const staged = gitText(['diff', '--cached', '--name-only']).split(/\r?\n/).filter(Boolean);
  const untracked = gitText(['ls-files', '--others', '--exclude-standard']).split(/\r?\n/).filter(Boolean);
  return [...new Set([...tracked, ...staged, ...untracked])].sort();
}

function substantiveFiles(files = changedFiles()) {
  return files.filter((file) => {
    const f = file.replaceAll('\\', '/');
    if (RECORD_KINDS.some((kind) => f.startsWith(`${recordKindDirRel(kind)}/`)) && f !== profileProjectRel('risks')) return false;
    return pathMatchesPolicy(f, POLICY.files?.classifiers?.substantive || []);
  });
}

function verificationRelevantFiles(files = changedFiles()) {
  return substantiveFiles(files).filter((file) => {
    const f = file.replaceAll('\\', '/');
    return pathMatchesPolicy(f, POLICY.files?.classifiers?.verification || []);
  });
}

function auditRelevantFiles(files = changedFiles()) {
  return substantiveFiles(files).filter((file) => {
    const f = file.replaceAll('\\', '/');
    return pathMatchesPolicy(f, POLICY.files?.classifiers?.audit || []);
  });
}

function guideRelevantFiles(files = changedFiles()) {
  return files.filter((file) => {
    const f = file.replaceAll('\\', '/');
    return pathMatchesPolicy(f, POLICY.files?.classifiers?.guide || []);
  });
}

function zooVisualRelevantFiles(files = changedFiles()) {
  return files.filter((file) => {
    const f = file.replaceAll('\\', '/');
    return pathMatchesPolicy(f, POLICY.files?.classifiers?.zooVisual || []);
  });
}

function worktreeHashFromContent(files, content) {
  const payload = JSON.stringify({ files, content });
  return createHash('sha256').update(payload).digest('hex').slice(0, 16);
}

function worktreeContentEntries(files) {
  return files.map((file) => {
    const path = join(ROOT, file);
    try {
      const st = statSync(path);
      if (!st.isFile()) return [file, 'not-file'];
      return [file, fileContentEvidenceHash(path)];
    } catch {
      return [file, 'missing'];
    }
  });
}

function fileContentEvidenceHash(path) {
  const buffer = readFileSync(path);
  if (buffer.includes(0)) return createHash('sha256').update(buffer).digest('hex');
  return createHash('sha256').update(canonicalTextForHash(buffer.toString('utf8'))).digest('hex');
}

function worktreeHash() {
  const files = substantiveFiles();
  return worktreeHashFromContent(files, worktreeContentEntries(files));
}

function canonicalTextForHash(buffer) {
  return Buffer.from(String(buffer).replace(/\r\n/g, '\n'), 'utf8');
}

function nowIso() {
  return new Date().toISOString();
}

function loadJson(path, fallback) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return fallback;
  }
}

function saveJson(path, value) {
  ensureDir(dirname(path));
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function slug(text) {
  return String(text || 'record')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48) || 'record';
}

function recordPrefix(kind) {
  if (PREFIX_BY_KIND[kind]) return PREFIX_BY_KIND[kind];
  throw new Error(`Workflow records policy is missing prefixByKind.${kind}.`);
}

function recordSchema(kind) {
  if (SCHEMA_BY_KIND[kind]) return SCHEMA_BY_KIND[kind];
  throw new Error(`Workflow records policy is missing schemaByKind.${kind}.`);
}

function writeRecord(kind, title, body, frontmatter = {}) {
  const dir = join(RECORDS, kind);
  ensureDir(dir);
  const created = nowIso();
  const stem = `${recordPrefix(kind)}-${created.replace(/[-:]/g, '').replace(/\..+/, 'Z')}-${slug(title)}`;
  let id = stem;
  let path = join(dir, `${id}.md`);
  const fm = {
    schema: recordSchema(kind),
    id,
    created,
    ...frontmatter,
  };
  for (let attempt = 0; attempt < 20; attempt++) {
    id = attempt === 0 ? stem : `${stem}-${attempt + 1}`;
    path = join(dir, `${id}.md`);
    const textFrontmatter = { ...fm, id };
    const text = `---\n${Object.entries(textFrontmatter).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join('\n')}\n---\n\n# ${title}\n\n${body.trim()}\n`;
    try {
      writeFileSync(path, text, { flag: 'wx' });
      return { id, path };
    } catch (error) {
      if (error?.code === 'EEXIST') continue;
      throw error;
    }
  }
  throw new Error(`Could not create unique ${kind} record for title "${title}" after collision retries.`);
}

function parseRecordFrontmatter(text = '') {
  const match = String(text).match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  const out = {};
  for (const line of match[1].split(/\r?\n/)) {
    const item = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!item) continue;
    const [, key, rawValue] = item;
    try {
      out[key] = JSON.parse(rawValue);
    } catch {
      out[key] = rawValue.replace(/^"|"$/g, '').trim();
    }
  }
  return out;
}

function recordPathFor(kind, idOrPath = '') {
  const value = String(idOrPath || '').replaceAll('\\', '/');
  if (!value) return '';
  if (value.includes('/')) {
    if (isAbsolute(value) || value.includes('\0')) return '';
    const expectedDir = join(RECORDS, kind);
    const candidate = resolve(ROOT, value);
    const relToKind = relative(expectedDir, candidate).replaceAll('\\', '/');
    if (relToKind.startsWith('..') || relToKind === '' || isAbsolute(relToKind)) return '';
    return candidate;
  }
  return join(RECORDS, kind, `${value}.md`);
}

function recordFrontmatter(kind, idOrPath = '') {
  const path = recordPathFor(kind, idOrPath);
  if (!path || !existsSync(path)) return null;
  return parseRecordFrontmatter(readFileSync(path, 'utf8'));
}

function shouldValidateEvidenceReference(kind, idOrPath = '') {
  const value = String(idOrPath || '').replaceAll('\\', '/');
  return value.includes('/') || value.startsWith(`${recordPrefix(kind)}-`);
}

function evidenceRecordProblems(kind, idOrPath, expected = {}, label = `${kind} evidence record`) {
  const problems = [];
  if (!idOrPath) {
    problems.push(`${label} is missing a durable record reference.`);
    return problems;
  }
  const path = recordPathFor(kind, idOrPath);
  const rel = path ? relative(ROOT, path).replaceAll('\\', '/') : String(idOrPath || '');
  if (!path || !existsSync(path)) {
    problems.push(`${label} durable record is missing: ${rel}.`);
    return problems;
  }
  const fm = parseRecordFrontmatter(readFileSync(path, 'utf8'));
  if (fm.schema !== recordSchema(kind)) problems.push(`${label} ${rel} has schema ${fm.schema || '(missing)'}; expected ${recordSchema(kind)}.`);
  for (const [key, expectedValue] of Object.entries(expected)) {
    if (expectedValue === undefined || expectedValue === null) continue;
    const actualValue = fm[key];
    const ok = Array.isArray(expectedValue)
      ? sameStringSet(actualValue || [], expectedValue)
      : String(actualValue ?? '') === String(expectedValue);
    if (!ok) problems.push(`${label} ${rel} has ${key}=${JSON.stringify(actualValue ?? '')}; expected ${JSON.stringify(expectedValue)}.`);
  }
  return problems;
}

function nextPatchWorkers(previousWorkers = [], options = {}) {
  if (options.previousWasReviewed || options.explicitPatchRecord || options.previousHash !== options.currentHash) return [];
  return [...previousWorkers];
}

function invalidateGates(files, reason, source = 'workflow', metadata = {}) {
  const currentHash = worktreeHash();
  const patchState = loadJson(PATCH_STATE_FILE, { events: [] });
  const reviewState = loadJson(STATE_FILE, {});
  const previousHash = patchState.worktreeHash;
  const previousWasReviewed = previousHash && reviewState.worktreeHash === previousHash && reviewState.verdict === 'pass';
  const explicitPatchRecord = Boolean(metadata.patchId || metadata.patchRecord);
  const workers = nextPatchWorkers(patchState.workers || [], {
    previousWasReviewed,
    explicitPatchRecord,
    previousHash,
    currentHash,
  });
  const worker = metadata.worker || metadata.agent || (source !== 'codex-hook' ? source : '');
  if (worker && !workers.includes(worker)) workers.push(worker);
  patchState.worktreeHash = currentHash;
  patchState.lastChangedAt = nowIso();
  patchState.reason = reason;
  patchState.source = source;
  patchState.files = files;
  patchState.patchId = metadata.patchId || (previousHash === currentHash ? patchState.patchId : null) || null;
  patchState.patchRecord = metadata.patchRecord || (previousHash === currentHash ? patchState.patchRecord : null) || null;
  patchState.routingId = Object.hasOwn(metadata, 'routingId')
    ? metadata.routingId || null
    : (previousHash === currentHash ? patchState.routingId : null) || null;
  patchState.workers = workers;
  patchState.events = [
    {
      at: patchState.lastChangedAt,
      source,
      reason,
      files,
      worktreeHash: currentHash,
      patchId: metadata.patchId || null,
      patchRecord: metadata.patchRecord || null,
      routingId: metadata.routingId || null,
      worker: worker || null,
    },
    ...(patchState.events || []).slice(0, 24),
  ];
  saveJson(PATCH_STATE_FILE, patchState);

  reviewState.worktreeHash = null;
  reviewState.verdict = 'needs-review';
  reviewState.invalidatedAt = nowIso();
  reviewState.reason = reason;
  saveJson(STATE_FILE, reviewState);

  if (verificationRelevantFiles(files).length) {
    const verifyState = loadJson(VERIFY_STATE_FILE, {});
    verifyState.worktreeHash = null;
    verifyState.verdict = 'needs-verification';
    verifyState.invalidatedAt = nowIso();
    verifyState.reason = reason;
    saveJson(VERIFY_STATE_FILE, verifyState);
  }
  if (auditRelevantFiles(files).length) {
    const auditState = loadJson(AUDIT_STATE_FILE, {});
    auditState.worktreeHash = null;
    auditState.verdict = 'needs-audit';
    auditState.invalidatedAt = nowIso();
    auditState.reason = reason;
    saveJson(AUDIT_STATE_FILE, auditState);
  }
}

function readText(relPath, fallback = '') {
  const path = join(ROOT, relPath);
  try {
    return readFileSync(path, 'utf8');
  } catch {
    return fallback;
  }
}

function listRecords(kind) {
  const dir = join(RECORDS, kind);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => name.endsWith('.md'))
    .sort()
    .reverse()
    .map((name) => {
      const path = join(dir, name);
      const text = readFileSync(path, 'utf8');
      const title = (text.match(/^#\s+(.+)$/m)?.[1] || name).trim();
      const created = (text.match(/^created:\s+"?([^"\n]+)"?/m)?.[1] || '').trim();
      const verdict = (text.match(/^verdict:\s+"?([^"\n]+)"?/m)?.[1] || '').trim();
      const status = (text.match(/^status:\s+"?([^"\n]+)"?/m)?.[1] || '').trim();
      return {
        kind,
        name,
        title,
        created,
        verdict: verdict || status,
        rel: relative(ROOT, path).replaceAll('\\', '/'),
        excerpt: text.replace(/^---[\s\S]*?---/, '').replace(/^#.+$/m, '').trim().split(/\r?\n/).slice(0, 8).join('\n'),
      };
    });
}

function recordFrontmatters(kind) {
  const dir = join(RECORDS, kind);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => name.endsWith('.md'))
    .sort()
    .map((name) => {
      const path = join(dir, name);
      return {
        ...parseRecordFrontmatter(readFileSync(path, 'utf8')),
        rel: relative(ROOT, path).replaceAll('\\', '/'),
        name,
      };
    });
}

function branchIntroducedRecordPaths(kind, branch = branchEvidenceInfo()) {
  const dir = recordKindDirRel(kind);
  const paths = new Set();
  if (branch.mergeBase) {
    for (const line of gitText(['diff', '--name-only', '--diff-filter=A', `${branch.mergeBase}..HEAD`, '--', dir]).split(/\r?\n/).filter(Boolean)) {
      paths.add(line.replaceAll('\\', '/'));
    }
  }
  for (const file of changedFiles()) {
    const normalized = file.replaceAll('\\', '/');
    if (normalized.startsWith(`${dir}/`) && normalized.endsWith('.md')) paths.add(normalized);
  }
  return paths;
}

function branchRecordFrontmatters(kind, branch = branchEvidenceInfo()) {
  const introduced = branchIntroducedRecordPaths(kind, branch);
  return recordFrontmatters(kind).map((record) => ({
    ...record,
    branchIntroduced: introduced.has(record.rel),
  }));
}

function branchIntroducedRecords(records = []) {
  return records.filter((record) => record.branchIntroduced !== false);
}

function isLegacyAuditRecord(record) {
  if (record.kind !== 'reviews') return false;
  const title = String(record.title || '').trim();
  const name = String(record.name || '');
  return /^Audit\b/i.test(title) || /(?:^|-)audit-(?:pass|fail|needs-work|partial|blocked)(?:-|$)/i.test(name);
}

function displayRecords(records) {
  const out = Object.fromEntries(RECORD_KINDS.map((kind) => [kind, [...(records[kind] || [])]]));
  const legacyAudits = (records.reviews || [])
    .filter(isLegacyAuditRecord)
    .map((record) => ({ ...record, kind: 'audits', legacyKind: 'reviews' }));
  out.reviews = (records.reviews || []).filter((record) => !isLegacyAuditRecord(record));
  out.audits = [...(records.audits || []), ...legacyAudits]
    .sort((a, b) => String(b.created).localeCompare(String(a.created)));
  return out;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function publicGuideForbiddenStrings() {
  return publicSanitizerForbiddenStrings(WORKFLOW, ROOT);
}

function publicSafe(value) {
  return applyPublicSanitizer(value, WORKFLOW, ROOT);
}

function publicHtml(value) {
  return escapeHtml(publicSafe(value));
}

function recordCategory(kind, title = '') {
  const text = `${kind} ${title}`.toLowerCase();
  if (kind === 'deployments' || text.includes('server') || text.includes('deploy')) return 'Deployment';
  if (kind === 'tests' || kind === 'reviews' || kind === 'guide-browser' || text.includes('audit') || text.includes('verify')) return 'Validation';
  if (kind === INTENT_RECORD_KIND || kind === WORK_SLICE_RECORD_KIND || text.includes('intent') || text.includes('work slice')) return 'Work Intake';
  if (kind === 'pattern-proposals' || text.includes('pattern')) return 'Knowledge';
  if (kind === 'routing' || text.includes('routing') || text.includes('spark') || text.includes('worker')) return 'Agent Routing';
  return 'Workflow';
}

function uniqueExisting(files) {
  return [...new Set(files)].filter((file) => existsSync(join(ROOT, file)));
}

function csv(value) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function gitStatusEntries(pathspec = []) {
  const result = git(['status', '--porcelain=v1', '--', ...pathspec]);
  if (result.status !== 0) return [];
  return result.stdout.split(/\r?\n/).filter(Boolean).map((line) => {
    const status = line.slice(0, 2);
    const file = line.slice(3).replace(/^"|"$/g, '').replaceAll('\\', '/');
    return { status, file };
  });
}

function gitUntrackedEntries(pathspec = []) {
  const result = git(['ls-files', '--others', '--exclude-standard', '--', ...pathspec]);
  if (result.status !== 0) return [];
  return result.stdout
    .split(/\r?\n/)
    .map((file) => file.trim().replaceAll('\\', '/'))
    .filter(Boolean)
    .map((file) => ({ status: '??', file }));
}

function gitEvidenceStatusEntries(pathspec = []) {
  return mergeGitStatusWithUntrackedEntries(gitStatusEntries(pathspec), gitUntrackedEntries(pathspec));
}

function mergeGitStatusWithUntrackedEntries(statusEntries = [], untrackedEntries = []) {
  const byFile = new Map();
  for (const entry of statusEntries) byFile.set(entry.file, entry);
  for (const entry of untrackedEntries) byFile.set(entry.file, entry);
  return [...byFile.values()].sort((a, b) => a.file.localeCompare(b.file));
}

function gitStatusMap(pathspec = []) {
  return new Map(gitEvidenceStatusEntries(pathspec).map((entry) => [entry.file, entry.status]));
}

function gitRefExists(ref) {
  return git(['rev-parse', '--verify', '--quiet', ref]).status === 0;
}

function gitPathExistsAtHead(file) {
  if (!gitRefExists('HEAD')) return false;
  return git(['cat-file', '-e', `HEAD:${file}`]).status === 0;
}

function recordHistoryBase() {
  const configured = process.env[RECORD_HISTORY_BASE_ENV];
  if (configured && gitRefExists(configured)) return configured;
  for (const ref of ['origin/main', 'main']) {
    if (gitRefExists(ref)) return ref;
  }
  return '';
}

function evidenceRecordHistoryProblems() {
  const base = recordHistoryBase();
  if (!base) return [];
  const mergeBase = gitText(['merge-base', 'HEAD', base]);
  if (!mergeBase) return [];
  const paths = EVIDENCE_RECORD_KINDS.map(recordKindDirRel);
  const result = git(['log', '--reverse', '--name-status', '--format=commit %H', `${mergeBase}..HEAD`, '--', ...paths]);
  if (result.status !== 0) return [];
  return evidenceRecordHistoryProblemsFromLog(result.stdout, base);
}

function evidenceRecordHistoryProblemsFromLog(logText, base = 'base') {
  const problems = [];
  const seenAdded = new Set();
  for (const line of String(logText || '').split(/\r?\n/).filter(Boolean)) {
    if (line.startsWith('commit ')) continue;
    const [status, file] = line.split(/\t+/);
    const normalized = String(file || '').replaceAll('\\', '/');
    if (!normalized.endsWith('.md') || normalized.endsWith('/.gitkeep')) continue;
    if (status === 'A' && !seenAdded.has(normalized)) {
      seenAdded.add(normalized);
      continue;
    }
    problems.push(`Committed evidence record changed after first introduction relative to ${base}: ${status} ${normalized}. Evidence records are append-only; create a correction record instead.`);
  }
  return problems;
}

function branchEvidenceBase() {
  const configured = process.env[BRANCH_BASE_ENV] || process.env[RECORD_HISTORY_BASE_ENV];
  if (configured && gitRefExists(configured)) return configured;
  return recordHistoryBase();
}

function branchEvidenceInfo(base = branchEvidenceBase()) {
  if (!base) return { base: '', mergeBase: '', files: [], allFiles: [], hash: '' };
  const mergeBase = gitText(['merge-base', 'HEAD', base]);
  if (!mergeBase) return { base, mergeBase: '', files: [], allFiles: [], hash: '' };
  const committed = gitText(['diff', '--name-only', `${mergeBase}..HEAD`]).split(/\r?\n/).filter(Boolean);
  const allFiles = [...new Set([...committed, ...changedFiles()])].sort();
  const files = substantiveFiles(allFiles);
  const payload = {
    mergeBase,
    files,
    content: worktreeContentEntries(files),
  };
  const hash = files.length ? createHash('sha256').update(JSON.stringify(payload)).digest('hex').slice(0, 16) : '';
  return { base, mergeBase, files, allFiles, hash };
}

function branchEvidenceFrontmatter(branch = branchEvidenceInfo()) {
  if (!branch.hash) return {};
  return {
    branchBase: branch.base,
    branchMergeBase: branch.mergeBase,
    branchHash: branch.hash,
    branchFiles: branch.files,
  };
}

function branchScopedFrontmatter(scope, branch = branchEvidenceInfo()) {
  return scope === 'branch' ? branchEvidenceFrontmatter(branch) : {};
}

function stateCacheIntegrityProblems() {
  const problems = [];
  const patchState = loadJson(PATCH_STATE_FILE, {});
  const routingState = loadJson(ROUTING_STATE_FILE, {});
  const reviewState = loadJson(STATE_FILE, {});
  const verifyState = loadJson(VERIFY_STATE_FILE, {});
  const auditState = loadJson(AUDIT_STATE_FILE, {});
  const guideBrowserState = loadJson(GUIDE_BROWSER_STATE_FILE, {});

  if (patchState.patchId) {
    problems.push(...evidenceRecordProblems('patches', patchState.patchRecord || patchState.patchId, {
      id: patchState.patchId,
      worktreeHash: patchState.worktreeHash,
      routingId: patchState.routingId || '',
    }, 'patch state'));
  }
  if (routingState.routingId) {
    problems.push(...evidenceRecordProblems('routing', routingState.record || routingState.routingId, {
      id: routingState.routingId,
      route: routingState.route,
      worker: routingState.worker,
      worktreeHash: routingState.worktreeHash,
    }, 'routing state'));
  }

  const reviewKinds = reviewState.reviewKinds || {};
  for (const [kind, item] of Object.entries(reviewKinds)) {
    if (item?.verdict !== 'pass') continue;
    const recordProblems = evidenceRecordProblems('reviews', item.reviewRecord, {
      worktreeHash: item.worktreeHash,
      verdict: item.verdict,
      kind,
      patchId: item.patchId || '',
    }, `${kind} review state`);
    if (recordProblems.length && !recordHasReviewKind(kind, item.worktreeHash, { patchId: item.patchId || '' })) {
      problems.push(...recordProblems);
    }
  }
  if (reviewState.verdict === 'pass') {
    const kind = reviewState.kind || 'general';
    const recordProblems = evidenceRecordProblems('reviews', reviewState.reviewRecord, {
      worktreeHash: reviewState.worktreeHash,
      verdict: reviewState.verdict,
      kind,
      patchId: reviewState.patchId || '',
    }, 'review state');
    if (recordProblems.length && !recordHasReviewKind(kind, reviewState.worktreeHash, { patchId: reviewState.patchId || '' })) {
      problems.push(...recordProblems);
    }
  }
  if (verifyState.verdict === 'pass') {
    const recordProblems = evidenceRecordProblems('tests', verifyState.verifyRecord, {
      worktreeHash: verifyState.worktreeHash,
      verdict: verifyState.verdict,
    }, 'verification state');
    const referenceProblems = evidenceReferenceProblems(verifyState, 'verification state', { evidenceKind: 'verification' });
    if ((recordProblems.length || referenceProblems.length) && !recordHasVerificationPass(verifyState.worktreeHash)) {
      problems.push(...recordProblems, ...referenceProblems);
    }
  }
  if (auditState.verdict === 'pass') {
    const recordProblems = evidenceRecordProblems('audits', auditState.auditRecord, {
      worktreeHash: auditState.worktreeHash,
      verdict: auditState.verdict,
    }, 'audit state');
    const referenceProblems = evidenceReferenceProblems(auditState, 'audit state', { evidenceKind: 'audit' });
    if ((recordProblems.length || referenceProblems.length) && !recordHasAuditPass(auditState.worktreeHash)) {
      problems.push(...recordProblems, ...referenceProblems);
    }
  }
  if (guideBrowserState.verdict === 'pass') {
    problems.push(...evidenceRecordProblems('guide-browser', guideBrowserState.guideBrowserRecord, {
      guideArtifactHash: guideBrowserState.guideArtifactHash,
      verdict: guideBrowserState.verdict,
    }, 'guide browser state'));
  }
  return problems;
}

function evidenceStatusProblem(entry, trackedAtHead) {
  if (!entry.file.endsWith('.md') || entry.file.endsWith('/.gitkeep')) return '';
  if (entry.status === '??') return '';
  const status = entry.status.padEnd(2, ' ');
  const isNewStagedRecord = !trackedAtHead && status[0] === 'A' && status[1] === ' ';
  if (isNewStagedRecord) return '';
  if (!trackedAtHead && status[0] === 'A') {
    return `New evidence record has unstaged worktree changes: ${entry.status.trim() || entry.status} ${entry.file}. Stage the final record content before release.`;
  }
  return `Existing evidence record changed or was removed: ${entry.status.trim() || entry.status} ${entry.file}. Create a correction record instead of editing committed evidence.`;
}

function untrackedEvidenceRecordProblem(entry) {
  if (entry.status !== '??') return '';
  if (!entry.file.endsWith('.md') || entry.file.endsWith('/.gitkeep')) return '';
  return `Untracked evidence record is not commit-bound: ${entry.file}. Stage it or remove it before release so gates cannot rely on proof that will be omitted from git.`;
}

function recordIntegrityProblems() {
  const paths = EVIDENCE_RECORD_KINDS.map(recordKindDirRel);
  const entries = gitEvidenceStatusEntries(paths);
  const statusByFile = gitStatusMap(RECORD_KINDS.map(recordKindDirRel));
  const problems = [];
  for (const entry of entries) {
    const problem = evidenceStatusProblem(entry, gitPathExistsAtHead(entry.file));
    if (problem) problems.push(problem);
  }
  for (const entry of entries) {
    const problem = untrackedEvidenceRecordProblem(entry);
    if (problem) problems.push(problem);
  }
  for (const kind of RECORD_KINDS) {
    const dir = join(RECORDS, kind);
    if (!existsSync(dir)) continue;
    for (const name of readdirSync(dir).filter((item) => item.endsWith('.md'))) {
      const path = join(dir, name);
      const rel = relative(ROOT, path).replaceAll('\\', '/');
      const text = readFileSync(path, 'utf8');
      const schema = (text.match(/^schema:\s+"?([^"\n]+)"?/m)?.[1] || '').trim();
      const expected = recordSchema(kind);
      if (schema === expected) continue;
      const status = statusByFile.get(rel) || '';
      const legacyAllowed = (LEGACY_SCHEMA_BY_KIND[kind] || []).includes(schema)
        && status !== '??'
        && LEGACY_SCHEMA_RECORDS.has(rel);
      if (!legacyAllowed) problems.push(`Record ${rel} has schema ${schema || '(missing)'}; expected ${expected}.`);
    }
  }
  problems.push(...evidenceRecordHistoryProblems());
  problems.push(...stateCacheIntegrityProblems());
  return problems;
}

function commandRecordsCheck({ quiet = false } = {}) {
  const problems = recordIntegrityProblems();
  if (!quiet) {
    console.log(`record integrity problems: ${problems.length}`);
    for (const problem of problems) console.log(`- ${problem}`);
  }
  return problems.length === 0;
}

function argString(args, keys = [], fallback = '') {
  for (const key of keys) {
    if (args[key] !== undefined && args[key] !== true) return String(args[key]);
  }
  return fallback;
}

function argCsv(args, keys = []) {
  return csv(argString(args, keys, ''));
}

function allowedPolicyValues(key, fallback = []) {
  return Array.isArray(INTAKE_POLICY[key]) && INTAKE_POLICY[key].length ? INTAKE_POLICY[key].map(String) : fallback;
}

function workSliceIdsFromArgs(args) {
  return argCsv(args, ['workSliceIds', 'work-slices', 'work-slice-ids', 'work-slice', 'slice-ids', 'slice']);
}

function intentIdsFromArgs(args) {
  return argCsv(args, ['intentIds', 'intents', 'intent-ids', 'intent']);
}

function evidenceWorkSliceFrontmatter(args) {
  const workSliceIds = workSliceIdsFromArgs(args);
  return workSliceIds.length ? { workSliceIds } : {};
}

function workSliceIdsFromPatchRecord(patchId = '') {
  if (!patchId) return [];
  const patch = recordFrontmatter('patches', patchId);
  return csv(patch?.workSliceIds);
}

function inferredWorkSliceIds(args, context = {}) {
  const explicit = workSliceIdsFromArgs(args);
  if (explicit.length) return explicit;
  const ids = new Set();
  const patchId = context.patchId || args.patch || args['patch-id'] || '';
  for (const id of workSliceIdsFromPatchRecord(patchId)) ids.add(id);
  const hash = context.hash || worktreeHash();
  const scope = context.scope || args.scope || 'worktree';
  const branch = context.branch || branchEvidenceInfo();
  const patchState = loadJson(PATCH_STATE_FILE, {});
  if (patchState.worktreeHash === hash) {
    for (const id of workSliceIdsFromPatchRecord(patchState.patchId)) ids.add(id);
  }
  for (const patch of recordFrontmatters('patches')) {
    if (patch.worktreeHash === hash || (scope === 'branch' && branch?.hash && patch.branchHash === branch.hash)) {
      for (const id of csv(patch.workSliceIds)) ids.add(id);
    }
  }
  return [...ids].filter(Boolean);
}

function externalRefProblems(refs = [], label = 'external reference', options = {}) {
  const values = csv(Array.isArray(refs) ? refs.join(',') : refs);
  const mode = String(options.mode || INTAKE_POLICY.externalTrackerMode || 'optional').toLowerCase();
  const problems = [];
  if (!['optional', 'required', 'disabled'].includes(mode)) {
    problems.push(`intake externalTrackerMode ${mode} is unsupported; use optional|required|disabled.`);
    return problems;
  }
  if (mode === 'disabled' && values.length) problems.push(`${label} is not allowed because externalTrackerMode is disabled.`);
  if (mode === 'required' && !values.length) problems.push(`${label} is required because externalTrackerMode is required.`);
  const allowed = INTAKE_POLICY.externalRefPrefixes || ['github:', 'linear:', 'jira:', 'url:'];
  return problems.concat(values
    .filter((ref) => !allowed.some((prefix) => String(ref).startsWith(prefix)))
    .map((ref) => `${label} ${ref} does not use an allowed prefix: ${allowed.join(', ')}.`));
}

function stringSet(values = []) {
  if (values instanceof Set) return values;
  return new Set(csv(Array.isArray(values) ? values.join(',') : values).filter(Boolean));
}

function missingReferenceProblems(ids = [], existingIds = new Set(), label = 'record') {
  const existing = stringSet(existingIds);
  return csv(Array.isArray(ids) ? ids.join(',') : ids)
    .filter((id) => !existing.has(id))
    .map((id) => `${label} ${id} does not exist.`);
}

function intakeIntentWriteProblems(record = {}, options = {}) {
  const existingIntentIds = options.intentIds || recordFrontmatters(INTENT_RECORD_KIND).map((intent) => intent.id).filter(Boolean);
  return [
    ...missingReferenceProblems(record.parentIntentIds || [], existingIntentIds, 'parent intent'),
    ...missingReferenceProblems(record.supersedesIntentIds || [], existingIntentIds, 'superseded intent'),
    ...externalRefProblems(record.externalRefs || [], 'intent external reference'),
  ];
}

function intakeWorkSliceWriteProblems(record = {}, options = {}) {
  const existingIntentIds = options.intentIds || recordFrontmatters(INTENT_RECORD_KIND).map((intent) => intent.id).filter(Boolean);
  const existingSliceIds = options.workSliceIds || recordFrontmatters(WORK_SLICE_RECORD_KIND).map((slice) => slice.id).filter(Boolean);
  return [
    ...missingReferenceProblems(record.intentIds || [], existingIntentIds, 'source intent'),
    ...missingReferenceProblems(record.updatesWorkSliceId ? [record.updatesWorkSliceId] : [], existingSliceIds, 'updated work slice'),
    ...missingReferenceProblems(record.supersedesWorkSliceIds || [], existingSliceIds, 'superseded work slice'),
    ...missingReferenceProblems(record.blockedByWorkSliceIds || [], existingSliceIds, 'blocking work slice'),
    ...externalRefProblems(record.externalRefs || [], 'work slice external reference'),
  ];
}

function rejectIntakeWriteProblems(problems = [], commandName = 'record') {
  if (!problems.length) return;
  console.error(`${commandName} refused to create append-only intake evidence:`);
  for (const problem of problems) console.error(`- ${problem}`);
  process.exit(2);
}

function workSliceRootId(record, byId, seen = new Set()) {
  const id = String(record?.id || '');
  if (!id) return '';
  if (seen.has(id)) return id;
  seen.add(id);
  const parent = String(record?.updatesWorkSliceId || record?.rootWorkSliceId || '');
  if (!parent || !byId.has(parent)) return parent || id;
  return workSliceRootId(byId.get(parent), byId, seen);
}

function workSliceIndex(workSlices = recordFrontmatters(WORK_SLICE_RECORD_KIND)) {
  const byId = new Map(workSlices.filter((record) => record.id).map((record) => [record.id, record]));
  const rootById = new Map();
  for (const record of workSlices) rootById.set(record.id, workSliceRootId(record, byId));
  const latestByRoot = new Map();
  for (const record of workSlices) {
    const root = rootById.get(record.id) || record.id;
    const existing = latestByRoot.get(root);
    if (!existing || String(existing.created || '').localeCompare(String(record.created || '')) <= 0) {
      latestByRoot.set(root, record);
    }
  }
  return { byId, rootById, latestByRoot };
}

function workSliceRefRoot(ref, index) {
  const id = String(ref || '');
  if (!id) return '';
  return index.rootById.get(id) || (index.byId.has(id) ? id : '');
}

function recordWorkSliceRoots(record, index) {
  return argCsv(record, ['workSliceIds'])
    .map((ref) => workSliceRefRoot(ref, index))
    .filter(Boolean);
}

function recordsLinkedToWorkSlice(records = [], rootId, index) {
  return records.filter((record) => recordWorkSliceRoots(record, index).includes(rootId));
}

function validEvidenceForWorkSlice(records = [], rootId, index, extra = {}) {
  return recordsLinkedToWorkSlice(records, rootId, index).filter((record) => {
    if (extra.verdict && record.verdict !== extra.verdict) return false;
    if (extra.kind && record.kind !== extra.kind) return false;
    return true;
  });
}

function staleWorkSliceProblem(record, now = Date.now()) {
  const status = String(record.status || '').toLowerCase();
  const active = allowedPolicyValues('activeWorkSliceStatuses', ['ready', 'active', 'review']);
  if (!active.includes(status)) return '';
  const opened = Date.parse(record.openedAt || record.created || '');
  if (!Number.isFinite(opened)) return '';
  const threshold = Number(INTAKE_POLICY.staleActiveWorkSliceDays || 14);
  const ageDays = Math.floor((now - opened) / 86400000);
  if (ageDays <= threshold) return '';
  return `work slice ${record.id || record.name} has status ${status} for ${ageDays} days without blocked/deferred closeout.`;
}

function patchRequiresWorkSlice(record, options = {}) {
  if (!INTAKE_POLICY.requireWorkSliceForSubstantivePatches) return false;
  const files = Array.isArray(record.files) ? record.files : [];
  if (!substantiveFiles(files).length) return false;
  const currentHash = options.currentHash || '';
  const branchHash = options.branch?.hash || '';
  if (currentHash && record.worktreeHash === currentHash) return true;
  if (branchHash && record.branchHash === branchHash) return true;
  return false;
}

function recordMatchesCurrentEvidence(record, kind, options = {}) {
  const currentHash = options.currentHash || '';
  const branchHash = options.branch?.hash || '';
  if (currentHash && record.worktreeHash === currentHash) return true;
  if (branchHash && record.branchHash === branchHash) return true;
  if (kind === 'deployments' && branchHash && record.branchHash === branchHash) return true;
  return false;
}

function evidenceRecordRequiresWorkSlice(kind, record, options = {}) {
  if (kind === 'patches') return patchRequiresWorkSlice(record, options);
  if (!INTAKE_POLICY.requireWorkSliceForEvidenceRecords) return false;
  if (!recordMatchesCurrentEvidence(record, kind, options)) return false;
  if (kind === 'routing') return true;
  if (kind === 'deployments') return String(record.verdict || '').toLowerCase() === 'pass';
  if (['reviews', 'tests', 'audits'].includes(kind)) return String(record.verdict || '').toLowerCase() === 'pass';
  return false;
}

function workSliceRelevantFiles(rootId, latest, recordsByKind, index) {
  const files = new Set(Array.isArray(latest.files) ? latest.files : []);
  for (const patch of recordsLinkedToWorkSlice(recordsByKind.patches || [], rootId, index)) {
    for (const file of Array.isArray(patch.files) ? patch.files : []) files.add(file);
  }
  return [...files];
}

function intakeProblemsForState(state = {}, options = {}) {
  if (!INTAKE_ENABLED) return [];
  const problems = [];
  const intents = state.intents || [];
  const workSlices = state.workSlices || state['work-slices'] || [];
  const recordsByKind = {
    patches: state.patches || [],
    routing: state.routing || [],
    reviews: state.reviews || [],
    tests: state.tests || [],
    audits: state.audits || [],
    deployments: state.deployments || [],
  };
  const allowedIntentKinds = allowedPolicyValues('intentKinds', ['initial', 'idea', 'feature', 'bug', 'clarification', 'constraint', 'change-request', 'maintenance', 'research']);
  const allowedIntentStatuses = allowedPolicyValues('intentStatuses', ['captured', 'needs-clarification', 'accepted', 'converted', 'deferred', 'rejected', 'superseded']);
  const allowedWorkStatuses = allowedPolicyValues('workSliceStatuses', ['proposed', 'ready', 'active', 'blocked', 'review', 'verified', 'done', 'deferred', 'superseded']);
  const allowedSourceTypes = allowedPolicyValues('sourceTypes', ['user-intent', 'internal-maintenance', 'workflow-maintenance']);
  const sourceTypesWithoutIntent = new Set(allowedPolicyValues('sourceTypesWithoutIntent', ['internal-maintenance', 'workflow-maintenance']));
  const evidenceStatuses = new Set(allowedPolicyValues('evidenceRequiredStatuses', ['review', 'verified', 'done']));
  const closedStatuses = new Set(allowedPolicyValues('closedWorkSliceStatuses', ['verified', 'done', 'deferred', 'superseded']));
  const trackerMode = String(INTAKE_POLICY.externalTrackerMode || 'optional').toLowerCase();
  const intentIds = new Set(intents.map((record) => record.id).filter(Boolean));
  const index = workSliceIndex(workSlices);
  if (!['optional', 'required', 'disabled'].includes(trackerMode)) problems.push(`intake externalTrackerMode ${trackerMode} is unsupported; use optional|required|disabled.`);

  for (const intent of intents) {
    const label = intent.id || intent.name || '(unknown intent)';
    if (!allowedIntentKinds.includes(String(intent.kind || '').toLowerCase())) problems.push(`${label} has unsupported intent kind ${intent.kind || '(missing)'}.`);
    if (!allowedIntentStatuses.includes(String(intent.status || '').toLowerCase())) problems.push(`${label} has unsupported intent status ${intent.status || '(missing)'}.`);
    if (!intent.summary && !intent.publicSummary) problems.push(`${label} has no compact summary/publicSummary.`);
    for (const parent of csv(intent.parentIntentIds || intent.parents)) {
      if (!intentIds.has(parent)) problems.push(`${label} references missing parent intent ${parent}.`);
    }
    for (const superseded of csv(intent.supersedesIntentIds || intent.supersedes)) {
      if (!intentIds.has(superseded)) problems.push(`${label} supersedes missing intent ${superseded}.`);
    }
    problems.push(...externalRefProblems(intent.externalRefs || [], `${label} externalRef`, { mode: trackerMode }));
  }

  for (const slice of workSlices) {
    const label = slice.id || slice.name || '(unknown work slice)';
    const status = String(slice.status || '').toLowerCase();
    if (!allowedWorkStatuses.includes(status)) problems.push(`${label} has unsupported work-slice status ${slice.status || '(missing)'}.`);
    const sourceType = String(slice.sourceType || 'user-intent').toLowerCase();
    if (!allowedSourceTypes.includes(sourceType)) problems.push(`${label} has unsupported sourceType ${slice.sourceType || '(missing)'}.`);
    const sourceIds = csv(slice.intentIds || slice.intents);
    if (!sourceIds.length && !sourceTypesWithoutIntent.has(sourceType)) {
      problems.push(`${label} must link to at least one intentId or use an allowed sourceType (${[...sourceTypesWithoutIntent].join(', ')}).`);
    }
    for (const intentId of sourceIds) {
      if (!intentIds.has(intentId)) problems.push(`${label} references missing intent ${intentId}.`);
    }
    const updated = slice.updatesWorkSliceId || '';
    if (updated && !index.byId.has(updated)) problems.push(`${label} updates missing work slice ${updated}.`);
    if (!slice.acceptance && !['proposed', 'blocked', 'deferred', 'superseded'].includes(status)) {
      problems.push(`${label} has no acceptance criteria.`);
    }
    const stale = staleWorkSliceProblem(slice, options.now);
    if (stale) problems.push(stale);
    problems.push(...externalRefProblems(slice.externalRefs || [], `${label} externalRef`, { mode: trackerMode }));
  }

  for (const [kind, records] of Object.entries(recordsByKind)) {
    for (const record of records) {
      for (const ref of csv(record.workSliceIds)) {
        if (!workSliceRefRoot(ref, index)) problems.push(`${kind} record ${record.id || record.name || '(unknown)'} references missing work slice ${ref}.`);
      }
      if (evidenceRecordRequiresWorkSlice(kind, record, options) && !csv(record.workSliceIds).length) {
        problems.push(`${kind} record ${record.id || record.name || '(unknown)'} is current evidence but has no workSliceIds.`);
      }
    }
  }

  for (const patch of recordsByKind.patches) {
    if (patchRequiresWorkSlice(patch, options) && !csv(patch.workSliceIds).length) {
      problems.push(`patch ${patch.id || patch.name || '(unknown)'} touches substantive files but has no workSliceIds.`);
    }
  }

  for (const [rootId, latest] of index.latestByRoot.entries()) {
    const status = String(latest.status || '').toLowerCase();
    if (!evidenceStatuses.has(status)) continue;
    const files = workSliceRelevantFiles(rootId, latest, recordsByKind, index);
    if (!validEvidenceForWorkSlice(recordsByKind.patches, rootId, index).length) problems.push(`work slice ${rootId} is ${status} but has no linked patch record.`);
    if (!validEvidenceForWorkSlice(recordsByKind.reviews, rootId, index, { verdict: 'pass' }).length) problems.push(`work slice ${rootId} is ${status} but has no linked passing review record.`);
    if (verificationRelevantFiles(files).length && !validEvidenceForWorkSlice(recordsByKind.tests, rootId, index, { verdict: 'pass' }).length) {
      problems.push(`work slice ${rootId} changes verification-relevant files but has no linked passing verification record.`);
    }
    if (auditRelevantFiles(files).length && !validEvidenceForWorkSlice(recordsByKind.audits, rootId, index, { verdict: 'pass' }).length) {
      problems.push(`work slice ${rootId} changes audit-relevant files but has no linked passing audit record.`);
    }
    if (latest.deploymentRequired && !validEvidenceForWorkSlice(recordsByKind.deployments, rootId, index, { verdict: 'pass' }).length) {
      problems.push(`work slice ${rootId} requires deployment but has no linked passing deployment record.`);
    }
  }

  if (options.branch?.hash && substantiveFiles(options.branch.files || []).length) {
    const branchRoots = new Set();
    for (const patch of recordsByKind.patches) {
      if (patch.branchHash !== options.branch.hash) continue;
      for (const root of recordWorkSliceRoots(patch, index)) branchRoots.add(root);
    }
    for (const rootId of branchRoots) {
      const latest = index.latestByRoot.get(rootId);
      const status = String(latest?.status || '').toLowerCase();
      if (!closedStatuses.has(status)) {
        problems.push(`work slice ${rootId} is linked to current branch evidence but latest status ${status || '(missing)'} is not closed (${[...closedStatuses].join(', ')}).`);
      }
    }
  }

  return [...new Set(problems)].sort();
}

function intakeProblems(options = {}) {
  const branch = options.branch || branchEvidenceInfo();
  const state = {
    intents: recordFrontmatters(INTENT_RECORD_KIND),
    workSlices: recordFrontmatters(WORK_SLICE_RECORD_KIND),
    patches: recordFrontmatters('patches'),
    routing: recordFrontmatters('routing'),
    reviews: recordFrontmatters('reviews'),
    tests: recordFrontmatters('tests'),
    audits: recordFrontmatters('audits'),
    deployments: recordFrontmatters('deployments'),
  };
  return intakeProblemsForState(state, {
    branch,
    currentHash: options.currentHash || worktreeHash(),
    now: options.now,
  });
}

function commandWorkIntakeCheck({ quiet = false } = {}) {
  const problems = intakeProblems();
  if (!quiet) {
    console.log(`work intake problems: ${problems.length}`);
    for (const problem of problems) console.log(`- ${problem}`);
  }
  return problems.length === 0;
}

function routeFilesFromArgs(args) {
  return csv(args.files || args.scope || args['write-scope']);
}

function canonicalRouteName(route) {
  const raw = String(route || '').toLowerCase();
  return POLICY.routing?.routeAliases?.[raw] || raw;
}

function validRouteNames() {
  return requiredPolicyNestedArray('routing', 'validRoutes').map(String);
}

function defaultWorkerForRoute(route) {
  return POLICY.routing?.defaultWorkers?.[canonicalRouteName(route)] || '';
}

function leadWorkerId() {
  return defaultWorkerForRoute('lead');
}

function escalationWorkerId() {
  return defaultWorkerForRoute('escalate') || defaultWorkerForRoute('strong');
}

function fileMatchesPattern(file, pattern) {
  return workflowPathMatchesPattern(file, pattern);
}

function activeRoutingForPatch(files = [], routingState = loadJson(ROUTING_STATE_FILE, {})) {
  const status = String(routingState.status || '').toLowerCase();
  if (!routingState.routingId || !['active', 'escalated'].includes(status)) return null;
  const scope = routingState.files || routingState.writeScope || [];
  if (scope.length && files.length && !files.every((file) => scope.some((pattern) => fileMatchesPattern(file, pattern)))) return null;
  return routingState;
}

function routingScopeProblems(files = substantiveFiles()) {
  const routingState = loadJson(ROUTING_STATE_FILE, {});
  const patchState = loadJson(PATCH_STATE_FILE, {});
  return routingScopeProblemsForState(routingState, files, patchState);
}

function isLeadWorker(worker) {
  const value = String(worker || '').trim().toLowerCase();
  const leadAliases = requiredPolicyNestedArray('routing', 'leadAliases').map((alias) => String(alias).toLowerCase());
  return !value || leadAliases.includes(value);
}

function canonicalWorker(worker) {
  const value = String(worker || '').trim().toLowerCase();
  return isLeadWorker(value) ? 'lead' : value;
}

function splitWorkerNames(worker) {
  return String(worker || '')
    .split(/[+,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function patchParticipantsForHash(patchState = {}, currentHash = worktreeHash()) {
  const recordWorkers = recordFrontmatters('patches')
    .filter((record) => record.worktreeHash === currentHash)
    .flatMap((record) => splitWorkerNames(record.agent || record.worker));
  if (patchState.worktreeHash !== currentHash) {
    return [...new Set(recordWorkers.map(canonicalWorker).filter(Boolean))];
  }
  const eventWorkers = patchEventsForHash(patchState, currentHash)
    .flatMap((event) => splitWorkerNames(event.worker || event.source));
  const workers = [
    ...(patchState.workers || []),
    patchState.source,
    patchState.agent,
    ...eventWorkers,
    ...recordWorkers,
  ];
  return [...new Set(workers.map(canonicalWorker).filter(Boolean))];
}

function patchEventsForHash(patchState = {}, currentHash = worktreeHash()) {
  return (patchState.events || []).filter((event) => event.worktreeHash === currentHash);
}

function delegatedPatchEventsForHash(patchState = {}, currentHash = worktreeHash()) {
  const recordEvents = recordFrontmatters('patches')
    .filter((record) => record.worktreeHash === currentHash)
    .flatMap((record) => splitWorkerNames(record.agent || record.worker)
      .map(canonicalWorker)
      .filter((worker) => worker && worker !== 'lead')
      .map((worker) => ({
        at: record.created || '',
        source: record.agent || record.worker || worker,
        worker,
        files: record.files || [],
        worktreeHash: currentHash,
        patchId: record.id || '',
        patchRecord: record.rel || '',
        routingId: record.routingId || '',
      })));
  const events = patchEventsForHash(patchState, currentHash)
    .flatMap((event) => {
      const workers = splitWorkerNames(event.worker || event.source)
        .map(canonicalWorker)
        .filter((worker) => worker && worker !== 'lead');
      return workers.map((worker) => ({ ...event, worker }));
    });
  if (events.length || recordEvents.length) return [...events, ...recordEvents];
  if (patchState.worktreeHash !== currentHash) return [];
  return delegatedWorkersForHash(patchState, currentHash).map((worker) => ({
    at: patchState.lastChangedAt || '',
    source: patchState.source || worker,
    worker,
    files: patchState.files || [],
    worktreeHash: currentHash,
    patchId: patchState.patchId || '',
    patchRecord: patchState.patchRecord || '',
    routingId: patchState.routingId || '',
  }));
}

function requiresIntegratedReview(patchState = loadJson(PATCH_STATE_FILE, {}), currentHash = worktreeHash()) {
  const participants = patchParticipantsForHash(patchState, currentHash);
  const nonLead = participants.filter((worker) => worker !== 'lead');
  return nonLead.length > 1 || (nonLead.length === 1 && participants.includes('lead'));
}

function delegatedWorkersForHash(patchState = {}, currentHash = worktreeHash()) {
  return patchParticipantsForHash(patchState, currentHash).filter((worker) => worker !== 'lead');
}

function routingMatchesWorker(routingState = {}, worker = '') {
  const route = String(routingState.route || '').toLowerCase();
  const routedWorkers = splitWorkerNames(routingState.worker).map(canonicalWorker);
  const canonical = canonicalWorker(worker);
  if (routedWorkers.includes(canonical)) return true;
  if (route.includes('spark') && canonical.includes('spark')) return true;
  if (route.includes('strong') && canonical.includes('strong')) return true;
  if (route.includes('research') && (canonical.includes('research') || canonical === 'explorer')) return true;
  if (route.includes('review') && canonical.includes('review')) return true;
  return false;
}

function routingCloseoutRecord(routings = recordFrontmatters('routing'), routingId = '') {
  if (!routingId) return null;
  return routings.find((record) => record.completedRoutingId === routingId && String(record.status || '').toLowerCase() === 'completed') || null;
}

function routingScopeProblemsForState(routingState = {}, files = substantiveFiles(), patchState = loadJson(PATCH_STATE_FILE, {})) {
  const currentHash = routingState.currentHash || worktreeHash();
  const delegatedWorkers = delegatedWorkersForHash(patchState, currentHash);
  const delegatedEvents = delegatedPatchEventsForHash(patchState, currentHash);
  const problems = [];
  if (!files.length) return problems;
  if (routingState.routingId) {
    const routingRef = routingState.record || routingState.routingId;
    if (shouldValidateEvidenceReference('routing', routingRef)) problems.push(...evidenceRecordProblems('routing', routingRef, {
      id: routingState.routingId,
      route: routingState.route,
      worker: routingState.worker,
      worktreeHash: routingState.worktreeHash,
    }, 'routing state'));
  }
  if (patchState.patchId) {
    const patchRef = patchState.patchRecord || patchState.patchId;
    if (shouldValidateEvidenceReference('patches', patchRef)) problems.push(...evidenceRecordProblems('patches', patchRef, {
      id: patchState.patchId,
      worktreeHash: patchState.worktreeHash,
      routingId: patchState.routingId || '',
    }, 'patch state'));
  }
  for (const event of delegatedEvents) {
    const worker = canonicalWorker(event.worker || event.source);
    const routingId = event.routingId || '';
    if (!routingId) {
      problems.push(`Delegated worker patch ${event.patchId || '(unrecorded)'} by ${worker} is not linked to a routing preflight. Re-record the patch with --routing <ROUTING-id>.`);
      continue;
    }
    const routingRecord = recordFrontmatter('routing', routingId)
      || (routingState.routingId === routingId ? routingState : null);
    if (shouldValidateEvidenceReference('routing', routingId)) {
      problems.push(...evidenceRecordProblems('routing', routingId, { id: routingId }, `routing evidence for ${worker}`));
    }
    if (!routingRecord) continue;
    const closeout = routingCloseoutRecord(undefined, routingId);
    const stateCloseout = routingState.routingId === routingId && routingState.status === 'closed' && routingState.closeRecord;
    if (!closeout && !stateCloseout && !event.closeoutExempt) {
      problems.push(`Routing ${routingId} for delegated worker ${worker} has no completion record. Run complete-routing after the worker slice is integrated.`);
    }
    if (String(routingRecord.route || '').toLowerCase() === 'lead') {
      problems.push(`Delegated worker patch ${event.patchId || '(unrecorded)'} cannot be covered by lead-only routing ${routingId}.`);
    }
    if (!routingMatchesWorker(routingRecord, worker)) {
      problems.push(`Routing ${routingId} does not cover delegated worker ${worker}.`);
    }
    const routingRecordedAt = routingRecord.created || routingRecord.recordedAt || '';
    if (routingRecordedAt && event.at && routingRecordedAt > event.at) {
      problems.push(`Routing ${routingId} was recorded after delegated patch ${event.patchId || '(unrecorded)'}. Routing must be a preflight, not retroactive bookkeeping.`);
    }
    const route = String(routingRecord.route || '').toLowerCase();
    const allowed = routingRecord.files || routingRecord.writeScope || [];
    if (route.includes('spark') && !allowed.length) {
      problems.push(`Spark routing ${routingId} has no allowed write scope.`);
      continue;
    }
    if (allowed.length && !route.includes('lead')) {
      const outside = (event.files || []).filter((file) => !allowed.some((pattern) => fileMatchesPattern(file, pattern)));
      problems.push(...outside.map((file) => `${route}-routed patch ${event.patchId || '(unrecorded)'} changed outside its recorded scope: ${file}`));
    }
  }
  if (delegatedWorkers.length && !delegatedEvents.length && (!routingState.route || routingState.status === 'closed')) {
    problems.push(`Delegated worker(s) ${delegatedWorkers.join(', ')} changed the current worktree without routing event evidence. Record routing before review/commit.`);
  }
  if (delegatedEvents.length) return problems;
  if (!routingState.route || routingState.status === 'closed') return problems;
  const patchLinkedToRouting = patchState.worktreeHash === currentHash
    && patchState.routingId
    && routingState.routingId
    && patchState.routingId === routingState.routingId;
  if (delegatedWorkers.length) {
    if (!patchState.routingId) {
      problems.push(`Delegated worker patch ${patchState.patchId || '(unrecorded)'} is not linked to a routing preflight. Re-record the patch with --routing <ROUTING-id>.`);
    } else if (routingState.routingId !== patchState.routingId) {
      problems.push(`Delegated worker patch links to routing ${patchState.routingId}, but active routing is ${routingState.routingId || '(none)'}.`);
    }
    if (routingState.recordedAt && patchState.lastChangedAt && routingState.recordedAt > patchState.lastChangedAt) {
      problems.push(`Routing ${routingState.routingId || '(unrecorded)'} was recorded after delegated patch ${patchState.patchId || '(unrecorded)'}. Routing must be a preflight, not retroactive bookkeeping.`);
    }
    if (String(routingState.route || '').toLowerCase() === 'lead') {
      problems.push(`Delegated worker(s) ${delegatedWorkers.join(', ')} cannot be covered by a lead-only routing record.`);
    }
    const uncovered = delegatedWorkers.filter((worker) => !routingMatchesWorker(routingState, worker));
    for (const worker of uncovered) {
      problems.push(`Routing ${routingState.routingId || '(unrecorded)'} does not cover delegated worker ${worker}.`);
    }
  }
  if (routingState.worktreeHash && routingState.worktreeHash !== currentHash && !patchLinkedToRouting) {
    const currentLeadPatch = patchState.worktreeHash === currentHash
      && patchState.patchId
      && delegatedWorkers.length === 0;
    if (currentLeadPatch) return problems;
    problems.push(`Routing ${routingState.routingId || '(unrecorded)'} was recorded for worktree ${routingState.worktreeHash}, current worktree is ${currentHash}. Record a fresh routing decision.`);
    return problems;
  }
  if (!routingState.worktreeHash && !patchLinkedToRouting) {
    problems.push(`Routing ${routingState.routingId || '(unrecorded)'} has no worktree hash. Record a fresh routing decision.`);
    return problems;
  }
  const route = String(routingState.route);
  const allowed = routingState.files || routingState.writeScope || [];
  if (route.includes('spark') && !allowed.length) {
    problems.push(`Spark routing ${routingState.routingId || '(unrecorded)'} has no allowed write scope.`);
    return problems;
  }
  if (allowed.length && !route.includes('lead')) {
    const scopedFiles = patchLinkedToRouting && Array.isArray(patchState.files) && patchState.files.length
      ? patchState.files
      : files;
    const outside = scopedFiles.filter((file) => !allowed.some((pattern) => fileMatchesPattern(file, pattern)));
    problems.push(...outside.map((file) => `${route}-routed work changed outside its recorded scope: ${file}`));
  }
  return problems;
}

function commandRoutingCheck({ quiet = false } = {}) {
  const problems = routingScopeProblems();
  if (!quiet) {
    console.log(`routing problems: ${problems.length}`);
    for (const problem of problems) console.log(`- ${problem}`);
  }
  return problems.length === 0;
}

function requiredReviewKinds(files = substantiveFiles(), options = {}) {
  const kinds = new Set();
  const reviewPolicy = POLICY.files?.reviewKinds || {};
  if (files.length && reviewPolicy.general?.whenSubstantive !== false) kinds.add('general');
  for (const [kind, policy] of Object.entries(reviewPolicy)) {
    if (kind === 'general') continue;
    if (files.some((file) => pathMatchesPolicy(file.replaceAll('\\', '/'), policy))) kinds.add(kind);
  }
  const patchState = options.patchState === undefined ? loadJson(PATCH_STATE_FILE, {}) : options.patchState;
  if (options.integrated !== false && requiresIntegratedReview(patchState)) kinds.add('integrated');
  return [...kinds];
}

function requiredBranchReviewKinds(files) {
  return requiredReviewKinds(files, { patchState: {}, integrated: false });
}

function hasPatchCoverage(hash = worktreeHash()) {
  const files = substantiveFiles();
  if (!files.length) return true;
  const patchState = loadJson(PATCH_STATE_FILE, {});
  const stateOk = patchState.worktreeHash === hash
    && Boolean(patchState.patchId)
    && evidenceRecordProblems('patches', patchState.patchRecord || patchState.patchId, {
      id: patchState.patchId,
      worktreeHash: hash,
      routingId: patchState.routingId || '',
    }, 'patch state').length === 0;
  if (stateOk && files.every((file) => (patchState.files || []).some((pattern) => fileMatchesPattern(file, pattern)))) return true;
  const matching = recordFrontmatters('patches').filter((record) => record.worktreeHash === hash);
  if (!matching.length) return false;
  const covered = matching.flatMap((record) => record.files || []);
  return files.every((file) => covered.some((pattern) => fileMatchesPattern(file, pattern)));
}

function recordHasReviewKind(kind, hash, options = {}) {
  const patchId = options.patchId || '';
  return recordFrontmatters('reviews').some((record) => {
    if (record.worktreeHash !== hash || record.verdict !== 'pass' || (record.kind || 'general') !== kind) return false;
    if (patchId && record.patchId !== patchId) return false;
    return true;
  });
}

function reviewKindsFromRecords(hash) {
  const out = {};
  const reviews = recordFrontmatters('reviews')
    .filter((record) => record.worktreeHash === hash && record.verdict === 'pass')
    .sort((a, b) => String(a.created).localeCompare(String(b.created)));
  for (const record of reviews) {
    const kind = record.kind || 'general';
    out[kind] = {
      worktreeHash: hash,
      verdict: 'pass',
      reviewer: record.reviewer || 'unknown',
      reviewedAt: record.created || nowIso(),
      reviewRecord: record.rel || `.codex/workflow/records/reviews/${record.name}`,
      patchId: record.patchId || '',
    };
  }
  return out;
}

function stateHasReviewKind(state, kind, hash, options = {}) {
  const checkEvidence = options.checkEvidence !== false;
  const item = state.reviewKinds?.[kind];
  if (item?.worktreeHash === hash && item?.verdict === 'pass') {
    return !checkEvidence || evidenceRecordProblems('reviews', item.reviewRecord, {
      worktreeHash: hash,
      verdict: 'pass',
      kind,
      patchId: item.patchId || '',
    }, `${kind} review state`).length === 0;
  }
  if (state.worktreeHash === hash && state.verdict === 'pass' && (state.kind || 'general') === kind) {
    return !checkEvidence || evidenceRecordProblems('reviews', state.reviewRecord, {
      worktreeHash: hash,
      verdict: 'pass',
      kind,
      patchId: state.patchId || '',
    }, 'review state').length === 0;
  }
  return recordHasReviewKind(kind, hash, options);
}

function recordHasVerificationPass(hash) {
  return recordFrontmatters('tests').some((record) => record.worktreeHash === hash
    && record.verdict === 'pass'
    && !evidenceReferenceProblems(record, `verification record ${record.id || record.name}`, { evidenceKind: 'verification' }).length);
}

function recordHasAuditPass(hash) {
  return recordFrontmatters('audits').some((record) => record.worktreeHash === hash
    && record.verdict === 'pass'
    && !evidenceReferenceProblems(record, `audit record ${record.id || record.name}`, { evidenceKind: 'audit' }).length);
}

function zooRegistryProblems() {
  const registry = loadJson(join(ROOT, DESIGN_REGISTRY_PATH), { primitives: [], patterns: [] });
  const entries = [...(registry.primitives || []), ...(registry.patterns || [])];
  const zooText = readText(DESIGN_ZOO_ROUTE_PATH);
  const problems = [];
  for (const entry of entries) {
    if (!entry.path || !existsSync(join(ROOT, entry.path))) problems.push(`Registry entry ${entry.name || '(unnamed)'} points to missing file ${entry.path || '(missing path)'}.`);
    if (!entry.zooRoute) {
      problems.push(`Registry entry ${entry.name || '(unnamed)'} is missing zooRoute.`);
      continue;
    }
    const slugName = slugFromZooRoute(entry.zooRoute);
    const escapedSlug = slugName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const slugPattern = /^[A-Za-z_$][\w$]*$/.test(slugName)
      ? new RegExp(`(?:['"]${escapedSlug}['"]|\\b${escapedSlug})\\s*:`)
      : new RegExp(`['"]${escapedSlug}['"]\\s*:`);
    if (!slugPattern.test(zooText)) problems.push(`Registry entry ${entry.name || slugName} declares ${entry.zooRoute} but Zoo.tsx has no showcase mapping.`);
  }
  return problems;
}

function slugFromZooRoute(route) {
  const designPrefix = DESIGN_ROUTE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return String(route || '').replace(new RegExp(`^${designPrefix}\\/?`), '') || 'index';
}

function zooVisualEntries() {
  const tokenPath = designTokenSourceFile();
  const registry = loadJson(join(ROOT, DESIGN_REGISTRY_PATH), { primitives: [], patterns: [], tokens: {} });
  const foundations = [
    {
      slug: 'index',
      title: 'Zoo Index',
      kind: 'foundation',
      route: DESIGN_ROUTE,
      path: DESIGN_ZOO_ROUTE_PATH,
      purpose: 'Entry page for the live component catalog.',
    },
    {
      slug: 'tokens',
      title: 'Token Foundations',
      kind: 'foundation',
      route: `${DESIGN_ROUTE}/tokens`,
      path: tokenPath,
      purpose: 'Production token swatches for colors, radii, shadows, and hit targets.',
    },
    {
      slug: 'themes',
      title: 'Theme Matrix',
      kind: 'foundation',
      route: `${DESIGN_ROUTE}/themes`,
      path: DESIGN_THEME_MATRIX_PATH,
      purpose: 'All cuisine themes rendered side by side from real components.',
    },
  ];
  const components = [...(registry.primitives || []), ...(registry.patterns || [])].map((entry) => ({
    slug: slugFromZooRoute(entry.zooRoute),
    title: entry.name || slugFromZooRoute(entry.zooRoute),
    kind: entry.kind || 'component',
    route: entry.zooRoute || `${DESIGN_ROUTE}/${slugFromZooRoute(entry.zooRoute)}`,
    path: entry.path || '',
    spriteAsset: entry.spriteAsset || '',
    purpose: entry.purpose || '',
  }));
  const seen = new Set();
  return [...foundations, ...components].filter((entry) => {
    if (!entry.slug || seen.has(entry.slug)) return false;
    seen.add(entry.slug);
    return true;
  });
}

function zooVisualInputFiles() {
  const entries = zooVisualEntries();
  const registrySourceFiles = entries.flatMap((entry) => [entry.path, entry.spriteAsset]).filter(Boolean);
  const designPolicy = POLICY.design || {};
  const policyFiles = [...(designPolicy.visualSourceFiles || []), ...registrySourceFiles];
  const policyDirFiles = (designPolicy.visualSourceDirectories || [])
    .flatMap((entry) => {
      const dir = typeof entry === 'string' ? entry : entry.path;
      const maxDepth = typeof entry === 'string' ? 8 : Number(entry.maxDepth || 8);
      const limit = typeof entry === 'string' ? 600 : Number(entry.limit || 600);
      return listFilesUnder(dir, maxDepth, limit);
    });
  return uniqueExisting([
    ...policyFiles,
    ...policyDirFiles,
  ]);
}

function designThemeSourceDirectories(policy = POLICY.design || {}) {
  if (typeof policy.themeDirectoryPath === 'string' && policy.themeDirectoryPath) return [policy.themeDirectoryPath];
  return (policy.visualSourceDirectories || [])
    .map((entry) => (typeof entry === 'string' ? entry : entry.path))
    .filter((path) => typeof path === 'string' && path.includes('/theme/'));
}

function designThemeNames(registry = {}, policy = POLICY.design || {}, listChildDirectories = childDirs) {
  if (Array.isArray(registry.tokens?.themes) && registry.tokens.themes.length) {
    return registry.tokens.themes.map(String).sort();
  }
  const themeDirs = designThemeSourceDirectories(policy).flatMap((path) => listChildDirectories(path));
  return [...new Set(themeDirs)].sort();
}

function zooVisualSourceHash() {
  const files = zooVisualInputFiles().map((file) => ({
    file,
    hash: createHash('sha256').update(canonicalTextForHash(readFileSync(join(ROOT, file), 'utf8'))).digest('hex'),
  }));
  const manifest = existsSync(ZOO_GUIDE_MANIFEST)
    ? semanticZooManifest(loadJson(ZOO_GUIDE_MANIFEST, {}))
    : 'missing';
  const payload = JSON.stringify({
    version: ZOO_VISUAL_GUIDE_VERSION,
    files,
    manifest,
  });
  return createHash('sha256').update(payload).digest('hex').slice(0, 24);
}

function semanticZooManifest(manifest = {}) {
  return {
    schema: manifest.schema || '',
    contexts: (manifest.contexts || []).map((context) => ({
      id: context.id || '',
      label: context.label || '',
      mode: context.mode || '',
      theme: context.theme || '',
      viewport: context.viewport || {},
    })),
    targets: (manifest.targets || []).map((target) => ({
      slug: target.slug || '',
      title: target.title || '',
      kind: target.kind || '',
      route: target.route || '',
      path: target.path || '',
      purpose: target.purpose || '',
      contextId: target.contextId || '',
      contextLabel: target.contextLabel || '',
      mode: target.mode || '',
      theme: target.theme || '',
      verifiedMode: target.verifiedMode || '',
      verifiedTheme: target.verifiedTheme || '',
      verifiedChromeState: target.verifiedChromeState || {},
      viewport: target.viewport || {},
      fullPage: Boolean(target.fullPage),
      asset: publicZooAssetPath(target),
      sha256: target.sha256 || '',
    })),
  };
}

function publicZooAssetPath(target = {}) {
  const asset = String(target.asset || '').replaceAll('\\', '/');
  const zooDir = `${profileProjectRel('zooGuideDir')}/`;
  if (asset.startsWith(zooDir)) return asset.slice(zooDir.length);
  if (asset.startsWith('assets/')) return asset;
  if (asset) return asset;
  return target.contextId ? `assets/${target.contextId}/${target.slug || 'capture'}.jpg` : `assets/${target.slug || 'capture'}.jpg`;
}

function zooAssetProjectPath(target = {}) {
  const asset = String(target.asset || '').replaceAll('\\', '/');
  const zooDir = profileProjectRel('zooGuideDir');
  if (asset.startsWith(`${zooDir}/`)) return asset;
  if (asset.startsWith('assets/')) return `${zooDir}/${asset}`;
  if (asset) return asset;
  return target.contextId ? `${zooDir}/assets/${target.contextId}/${target.slug || 'capture'}.jpg` : `${zooDir}/assets/${target.slug || 'capture'}.jpg`;
}

function publicZooManifest(manifest = {}) {
  return {
    schema: manifest.schema || POLICY.design?.zooVisualManifestSchema || 'nexus-design-zoo-visual-manifest/v1',
    capturedAt: manifest.capturedAt || '',
    contexts: semanticZooManifest(manifest).contexts,
    targets: semanticZooManifest(manifest).targets,
  };
}

function zooManifestTargets() {
  const manifest = loadJson(ZOO_GUIDE_MANIFEST, {});
  return Array.isArray(manifest.targets) ? manifest.targets : [];
}

function zooManifestContexts() {
  const manifest = loadJson(ZOO_GUIDE_MANIFEST, {});
  if (Array.isArray(manifest.contexts) && manifest.contexts.length) return manifest.contexts;
  if (manifest.mode || manifest.theme || manifest.viewport) {
    return [{
      id: 'legacy',
      label: `${manifest.viewport?.width || 'unknown'}x${manifest.viewport?.height || 'unknown'} ${manifest.mode || 'unknown'} ${manifest.theme || 'unknown'}`,
      mode: manifest.mode || '',
      theme: manifest.theme || '',
      viewport: manifest.viewport || {},
    }];
  }
  return [];
}

function sha256File(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function zooVisualGuideProblems() {
  const entries = zooVisualEntries();
  const manifestTargets = zooManifestTargets();
  const contexts = zooManifestContexts();
  const manifestByContextSlug = new Map(manifestTargets.map((target) => [`${target.contextId || 'legacy'}:${target.slug}`, target]));
  const htmlPath = join(ZOO_GUIDE_DIR, 'index.html');
  const problems = [];
  if (!existsSync(ZOO_GUIDE_MANIFEST)) problems.push(`${profileProjectRel('zooGuideManifest')} is missing; run npm run workflow:capture-zoo-visuals.`);
  if (!existsSync(htmlPath)) problems.push(`${profileProjectRel('zooGuideDir')}/index.html is missing; run npm run workflow:zoo-visual-guide.`);
  if (existsSync(ZOO_GUIDE_MANIFEST)) {
    const manifestText = readFileSync(ZOO_GUIDE_MANIFEST, 'utf8');
    if (/\bbaseUrl\b|\bsourceUrl\b|127\.0\.0\.1|localhost|\.codex\/dashboard/i.test(manifestText)) {
      problems.push('visual Zoo/Gym manifest contains local capture URLs or repo-local asset paths; regenerate with npm run workflow:zoo-visual-guide.');
    }
  }
  if (contexts.length < 2) problems.push('visual Zoo/Gym manifest should include at least two visual contexts, including desktop/light and mobile/dark.');
  if (!contexts.some((context) => String(context.mode).toLowerCase() === 'dark')) problems.push('visual Zoo/Gym manifest is missing a dark-mode capture context.');
  if (!contexts.some((context) => Number(context.viewport?.width || 0) <= 480)) problems.push('visual Zoo/Gym manifest is missing a mobile-width capture context.');

  for (const context of contexts) {
    for (const entry of entries) {
      const target = manifestByContextSlug.get(`${context.id || 'legacy'}:${entry.slug}`);
      if (!target) {
        problems.push(`visual Zoo/Gym manifest is missing ${context.id || 'legacy'}/${entry.slug}.`);
        continue;
      }
      const asset = zooAssetProjectPath(target);
      const path = join(ROOT, asset);
      if (!existsSync(path)) {
        problems.push(`visual Zoo/Gym asset is missing for ${context.id}/${entry.slug}: ${asset}`);
        continue;
      }
      if (target.sha256 && sha256File(path) !== target.sha256) problems.push(`visual Zoo/Gym asset hash mismatch for ${context.id}/${entry.slug}: ${asset}`);
      const expectedMode = String(context.mode || '').toLowerCase();
      const actualMode = String(target.verifiedMode || '').toLowerCase();
      const expectedTheme = String(context.theme || '').toLowerCase();
      const actualTheme = String(target.verifiedTheme || '').toLowerCase();
      if (!actualMode) problems.push(`visual Zoo/Gym manifest is missing verifiedMode for ${context.id}/${entry.slug}.`);
      else if (expectedMode && actualMode !== expectedMode) problems.push(`visual Zoo/Gym verifiedMode mismatch for ${context.id}/${entry.slug}: expected ${expectedMode}, got ${actualMode}.`);
      if (!actualTheme) problems.push(`visual Zoo/Gym manifest is missing verifiedTheme for ${context.id}/${entry.slug}.`);
      else if (expectedTheme && actualTheme !== expectedTheme) problems.push(`visual Zoo/Gym verifiedTheme mismatch for ${context.id}/${entry.slug}: expected ${expectedTheme}, got ${actualTheme}.`);
      if (target.verifiedChromeState) {
        const chrome = target.verifiedChromeState;
        if (expectedMode === 'dark' && chrome.htmlDark !== true) problems.push(`visual Zoo/Gym manifest htmlDark mismatch for ${context.id}/${entry.slug}.`);
        if (expectedMode === 'light' && chrome.htmlDark !== false) problems.push(`visual Zoo/Gym manifest htmlDark mismatch for ${context.id}/${entry.slug}.`);
        if (expectedTheme && String(chrome.bodyTheme || '').toLowerCase() !== expectedTheme) problems.push(`visual Zoo/Gym manifest bodyTheme mismatch for ${context.id}/${entry.slug}.`);
        if (expectedTheme && String(chrome.scopeTheme || '').toLowerCase() !== expectedTheme) problems.push(`visual Zoo/Gym manifest scopeTheme mismatch for ${context.id}/${entry.slug}.`);
      }
    }
  }

  if (existsSync(htmlPath)) {
    const html = readFileSync(htmlPath, 'utf8');
    if (!html.includes(`name="${guideMetaName('version')}" content="${ZOO_VISUAL_GUIDE_VERSION}"`)) problems.push('visual Zoo/Gym guide version is stale; regenerate zoo/index.html.');
    if (htmlMetaContent(html, guideMetaName('sourceHash')) !== zooVisualSourceHash()) problems.push('visual Zoo/Gym guide source hash is stale; regenerate zoo/index.html.');
    if (!guideContentHashOk(html)) problems.push('visual Zoo/Gym guide content hash is stale or was edited outside the generator; regenerate zoo/index.html.');
    for (const required of ZOO_VISUAL_REQUIRED_STRINGS) {
      if (!html.includes(required)) problems.push(`visual Zoo/Gym guide is missing required content: ${required}`);
    }
    for (const forbidden of publicGuideForbiddenStrings()) {
      if (forbidden && html.includes(forbidden)) problems.push(`visual Zoo/Gym guide contains unsanitized private string: ${forbidden}`);
    }
    for (const context of contexts) {
      if (!html.includes(`data-context="${escapeHtml(context.id || 'legacy')}"`)) problems.push(`visual Zoo/Gym guide is missing context ${context.id || 'legacy'}.`);
      for (const entry of entries) {
        if (!html.includes(`data-slug="${escapeHtml(entry.slug)}" data-context="${escapeHtml(context.id || 'legacy')}"`)) problems.push(`visual Zoo/Gym guide is missing card for ${context.id || 'legacy'}/${entry.slug}.`);
      }
    }
  }
  return problems;
}

function markdownLite(md) {
  const lines = String(md).split(/\r?\n/);
  const html = [];
  let inList = false;
  for (const line of lines) {
    if (line.startsWith('# ')) {
      if (inList) { html.push('</ul>'); inList = false; }
      html.push(`<h1>${escapeHtml(line.slice(2))}</h1>`);
    } else if (line.startsWith('## ')) {
      if (inList) { html.push('</ul>'); inList = false; }
      html.push(`<h2>${escapeHtml(line.slice(3))}</h2>`);
    } else if (line.startsWith('### ')) {
      if (inList) { html.push('</ul>'); inList = false; }
      html.push(`<h3>${escapeHtml(line.slice(4))}</h3>`);
    } else if (/^\s*-\s+/.test(line)) {
      if (!inList) { html.push('<ul>'); inList = true; }
      html.push(`<li>${escapeHtml(line.replace(/^\s*-\s+/, ''))}</li>`);
    } else if (!line.trim()) {
      if (inList) { html.push('</ul>'); inList = false; }
    } else {
      if (inList) { html.push('</ul>'); inList = false; }
      html.push(`<p>${escapeHtml(line)}</p>`);
    }
  }
  if (inList) html.push('</ul>');
  return html.join('\n');
}

function countFilesUnder(relPath, maxDepth = 4) {
  const start = join(ROOT, relPath);
  if (!existsSync(start)) return 0;
  let count = 0;
  function walk(dir, depth) {
    if (depth > maxDepth) return;
    for (const name of readdirSync(dir)) {
      if (name === 'node_modules' || name === 'dist' || name === '.git') continue;
      const path = join(dir, name);
      const st = statSync(path);
      if (st.isDirectory()) walk(path, depth + 1);
      else count++;
    }
  }
  walk(start, 0);
  return count;
}

function childDirs(relPath) {
  const start = join(ROOT, relPath);
  if (!existsSync(start)) return [];
  return readdirSync(start)
    .filter((name) => {
      try {
        return statSync(join(start, name)).isDirectory() && !['node_modules', 'dist', '.git'].includes(name);
      } catch {
        return false;
      }
    })
    .sort();
}

function listFilesUnder(relPath, maxDepth = 2, limit = 20) {
  const start = join(ROOT, relPath);
  if (!existsSync(start)) return [];
  const files = [];
  function walk(dir, depth) {
    if (files.length >= limit || depth > maxDepth) return;
    for (const name of readdirSync(dir).sort()) {
      if (files.length >= limit) return;
      if (name === 'node_modules' || name === 'dist' || name === '.git') continue;
      const path = join(dir, name);
      const rel = relative(ROOT, path).replaceAll('\\', '/');
      const st = statSync(path);
      if (st.isDirectory()) walk(path, depth + 1);
      else files.push(rel);
    }
  }
  if (existsSync(start) && statSync(start).isDirectory()) walk(start, 0);
  return files;
}

function listAllFilesUnder(relPath, options = {}) {
  const start = join(ROOT, relPath);
  if (!existsSync(start)) return [];
  const skip = new Set(options.skipDirectories || []);
  const files = [];
  function walk(dir) {
    for (const name of readdirSync(dir).sort()) {
      if (name === '.git' || name === 'node_modules') continue;
      const path = join(dir, name);
      const rel = relative(ROOT, path).replaceAll('\\', '/');
      if ([...skip].some((pattern) => workflowPathMatchesPattern(rel, pattern))) continue;
      const st = statSync(path);
      if (st.isDirectory()) walk(path);
      else files.push(rel);
    }
  }
  walk(start);
  return files.sort();
}

function gitTrackedFiles(pathspec = '.') {
  return gitText(['ls-files', pathspec]).split(/\r?\n/).filter(Boolean).map((file) => file.replaceAll('\\', '/')).sort();
}

function publicGuideInputFiles() {
  const guidePolicy = POLICY.guide || {};
  const files = new Set(guidePolicy.sourceFiles || []);
  for (const entry of guidePolicy.sourceDirectories || []) {
    const dir = typeof entry === 'string' ? entry : entry.path;
    const maxDepth = typeof entry === 'string' ? 8 : Number(entry.maxDepth || 8);
    const limit = typeof entry === 'string' ? 600 : Number(entry.limit || 600);
    for (const file of listFilesUnder(dir, maxDepth, limit)) files.add(file);
  }
  for (const file of [...files]) {
    if ((guidePolicy.excludeSourcePatterns || []).some((pattern) => workflowPathMatchesPattern(file, pattern))) files.delete(file);
  }
  return [...files]
    .filter((file) => existsSync(join(ROOT, file)) && statSync(join(ROOT, file)).isFile())
    .sort();
}

function guideDocumentFiles() {
  const guidePolicy = POLICY.guide || {};
  const files = new Set(guidePolicy.documentFiles || []);
  for (const entry of guidePolicy.documentDirectories || []) {
    const dir = typeof entry === 'string' ? entry : entry.path;
    const maxDepth = typeof entry === 'string' ? 4 : Number(entry.maxDepth || 4);
    const limit = typeof entry === 'string' ? 100 : Number(entry.limit || 100);
    const extensions = new Set(typeof entry === 'string' ? ['.md'] : (entry.extensions || ['.md']));
    for (const file of listFilesUnder(dir, maxDepth, limit)) {
      if (!extensions.size || extensions.has(pathExtension(file))) files.add(file);
    }
  }
  return uniqueExisting([...files]).sort();
}

function dashboardKnowledgeSections() {
  const sections = POLICY.guide?.dashboardKnowledgeSections || [];
  if (!Array.isArray(sections) || !sections.length) return [];
  return sections.map((section) => ({
    id: String(section.id || '').trim(),
    title: String(section.title || '').trim(),
    file: String(section.file || '').trim(),
  })).filter((section) => section.id && section.title && section.file);
}

function requiredGuideSourceFiles() {
  return POLICY.guide?.requiredSourceFiles || [];
}

function publicGuideSourceHash() {
  const files = publicGuideInputFiles().map((file) => ({
    file,
    hash: createHash('sha256').update(canonicalTextForHash(readFileSync(join(ROOT, file), 'utf8'))).digest('hex'),
  }));
  const payload = JSON.stringify({
    version: PUBLIC_GUIDE_VERSION,
    branch: gitText(['branch', '--show-current']) || '(detached HEAD)',
    files,
  });
  return createHash('sha256').update(payload).digest('hex').slice(0, 24);
}

function guideRecordFeedFiles() {
  const files = new Set([
    profileProjectRel('currentState'),
    profileProjectRel('risks'),
  ]);
  const excludedKinds = new Set(POLICY.guide?.recordFeedExcludeKinds || []);
  for (const kind of GUIDE_RECORD_KINDS) {
    if (excludedKinds.has(kind)) continue;
    for (const record of listRecords(kind)) {
      if (record.rel) files.add(record.rel);
    }
  }
  return [...files]
    .filter((file) => existsSync(join(ROOT, file)) && statSync(join(ROOT, file)).isFile())
    .sort();
}

function guideRecordFeedHash() {
  const files = guideRecordFeedFiles().map((file) => ({
    file,
    hash: createHash('sha256').update(canonicalTextForHash(readFileSync(join(ROOT, file), 'utf8'))).digest('hex'),
  }));
  const payload = JSON.stringify({
    version: PUBLIC_GUIDE_VERSION,
    branch: gitText(['branch', '--show-current']) || '(detached HEAD)',
    files,
  });
  return createHash('sha256').update(payload).digest('hex').slice(0, 24);
}

function cssDeclarationValue(block, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = block.match(new RegExp(`${escaped}\\s*:\\s*([^;]+);`));
  return match?.[1]?.trim() || '';
}

function productionGuideTokenCss() {
  const tokenPolicy = POLICY.design?.tokenSource || {};
  const text = readText(designTokenSourceFile());
  const block = text.match(/:root\s*{([\s\S]*?)\n}/)?.[1] || '';
  const required = tokenPolicy.publicGuideTokens || [];
  return required.map((name) => {
    const value = cssDeclarationValue(block, name);
    if (!value) throw new Error(`Missing production token ${name} in ${designTokenSourceFile()}`);
    return `${name}: ${value};`;
  }).join('\n      ');
}

function htmlMetaContent(html, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return (html.match(new RegExp(`<meta\\s+name=["']${escaped}["']\\s+content=["']([^"']+)["']\\s*\\/?>`, 'i'))?.[1] || '').trim();
}

function guideMetaName(key) {
  const name = GUIDE_META_NAMES[key];
  if (!name || typeof name !== 'string') throw new Error(`Workflow guide metaNames.${key} must be configured.`);
  return name;
}

function guideMetaTag(key, value) {
  return `<meta name="${guideMetaName(key)}" content="${escapeHtml(value)}" />`;
}

function guideContentHash(html) {
  const escaped = guideMetaName('contentHash').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const canonical = String(html).replace(new RegExp(`(<meta\\s+name=["']${escaped}["']\\s+content=["'])[^"']*(["']\\s*\\/?>)`, 'i'), '$1$2');
  return createHash('sha256').update(canonical).digest('hex').slice(0, 24);
}

function normalizeGeneratedHtml(html) {
  return String(html).replace(/[ \t]+$/gm, '').trimEnd() + '\n';
}

function injectGuideContentHash(html) {
  const normalized = normalizeGeneratedHtml(html);
  return normalized.replace(PUBLIC_GUIDE_CONTENT_HASH_PLACEHOLDER, guideContentHash(normalized));
}

function guideContentHashOk(html) {
  const recorded = htmlMetaContent(html, guideMetaName('contentHash'));
  return Boolean(recorded) && recorded === guideContentHash(html);
}

function guideShellFingerprint(name, html) {
  if (!['index.html', 'public.html'].includes(name)) return null;
  const version = htmlMetaContent(html, guideMetaName('version'));
  const sourceHash = htmlMetaContent(html, guideMetaName('sourceHash'));
  const tokenSource = htmlMetaContent(html, guideMetaName('tokenSource'));
  if (!version || !sourceHash) return null;
  return {
    type: 'guide-shell',
    version,
    sourceHash,
    tokenSource,
  };
}

function countHtmlMatches(html, pattern) {
  return (String(html).match(pattern) || []).length;
}

function selfReferentialEvidenceKinds() {
  const configured = INTAKE_POLICY.guide?.selfReferentialEvidenceKinds || [];
  if (!Array.isArray(configured)) return new Set();
  const allowed = new Set(WORK_INTAKE_EVIDENCE_KINDS);
  return new Set(configured.map(String).filter((kind) => allowed.has(kind)));
}

function guideTraceEvidenceKinds() {
  const configured = INTAKE_POLICY.guide?.traceEvidenceKinds;
  const allowed = new Set(WORK_INTAKE_EVIDENCE_KINDS);
  const excluded = selfReferentialEvidenceKinds();
  if (!Array.isArray(configured) || !configured.length) return [...allowed].filter((kind) => !excluded.has(kind));
  return configured.map(String).filter((kind) => allowed.has(kind) && !excluded.has(kind));
}

function displayOnlyRecordLabel(kind, label = kind) {
  return (POLICY.guide?.displayOnlyRecordKinds || []).includes(kind) ? `${label} (display-only)` : label;
}

function workIntakeGuideContractProblems(html, label = 'guide', model = intakeModel()) {
  if (!INTAKE_ENABLED) return [];
  const problems = [];
  const maxTrace = Number(INTAKE_POLICY.guide?.maxTraceItems || 12);
  const traceRows = workIntakeTraceRows(model, maxTrace, { evidenceKinds: guideTraceEvidenceKinds() });
  if (traceRows.length && !html.includes('data-work-intake-trace-row=')) {
    problems.push(`${label} Work Intake trace is missing linked trace rows.`);
  }
  for (const row of traceRows) {
    const rootId = row.rootId;
    if (!html.includes(`data-work-intake-trace-row="${escapeHtml(rootId)}"`)) {
      problems.push(`${label} Work Intake trace is missing work slice ${rootId}.`);
    }
    for (const [kind, records] of Object.entries(row.evidence)) {
      for (const record of records.slice(0, Number(INTAKE_POLICY.guide?.maxEvidenceItemsPerSlice || 4))) {
        const id = recordDisplayId(record);
        if (id && !html.includes(`data-work-intake-evidence-id="${escapeHtml(id)}"`)) {
          problems.push(`${label} Work Intake trace is missing linked ${kind} evidence ${id}.`);
        }
      }
    }
  }
  const catalog = featureCatalogEntries(model).slice(0, Number(INTAKE_POLICY.guide?.maxFeatureCatalogItems || 12));
  if (catalog.length && !html.includes('data-work-intake-feature=')) {
    problems.push(`${label} Feature Catalog is missing intent-centered feature entries.`);
  }
  for (const entry of catalog) {
    const id = recordDisplayId(entry.intent);
    if (id && !html.includes(`data-work-intake-feature="${escapeHtml(id)}"`)) {
      problems.push(`${label} Feature Catalog is missing intent ${id}.`);
    }
  }
  if (catalog.length && countHtmlMatches(html, /data-work-intake-feature=/g) === countHtmlMatches(html, /data-work-intake-active-slice=/g)) {
    const featureIds = [...String(html).matchAll(/data-work-intake-feature="([^"]+)"/g)].map((match) => match[1]).join('|');
    const activeIds = [...String(html).matchAll(/data-work-intake-active-slice="([^"]+)"/g)].map((match) => match[1]).join('|');
    if (featureIds === activeIds) problems.push(`${label} Feature Catalog duplicates active work-slice rows instead of intent-centered feature entries.`);
  }
  if (!html.includes('data-work-intake-warning-state=')) {
    problems.push(`${label} Work Intake warnings are not represented with a deterministic warning state.`);
  }
  return problems;
}

function guideViewContractProblems(html, label = 'guide', options = {}) {
    const contract = POLICY.guide?.viewContract || {};
    const requiredStrings = contract.requiredStrings || [];
    const problems = [];
  for (const required of requiredStrings) {
    if (!html.includes(required)) problems.push(`${label} is missing guide view contract item: ${required}`);
  }
  const headings = contract.timelineCategoryHeadings || ['Workflow', 'Validation', 'Knowledge', 'Agent Routing', 'Deployment'];
    const recordCategoryCount = headings
      .map((heading) => html.includes(`<h3>${escapeHtml(heading)}</h3>`) ? 1 : 0)
      .reduce((sum, value) => sum + value, 0);
    if (recordCategoryCount < Number(contract.minTimelineCategories || 3)) problems.push(`${label} event timeline is missing multiple workflow record categories.`);
    if (options.intakeModel) problems.push(...workIntakeGuideContractProblems(html, label, options.intakeModel));
    return problems;
  }

function guideArtifactHash() {
  const payload = {};
  for (const name of POLICY.guide?.artifacts || ['index.html', 'public.html', 'zoo/index.html', 'zoo/manifest.json']) {
    const path = join(DASHBOARD_DIR, name);
    if (!existsSync(path)) {
      payload[name] = 'missing';
      continue;
    }
    const buffer = readFileSync(path);
    const html = name.endsWith('.html') ? buffer.toString('utf8') : '';
    payload[name] = guideShellFingerprint(name, html) || createHash('sha256').update(buffer).digest('hex');
  }
  for (const target of zooManifestTargets()) {
    const asset = zooAssetProjectPath(target);
    const path = join(ROOT, asset);
    payload[asset] = existsSync(path) ? createHash('sha256').update(readFileSync(path)).digest('hex') : 'missing';
  }
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex').slice(0, 24);
}

function artifactEvidenceForFiles(files = []) {
  return csv(Array.isArray(files) ? files.join(',') : files)
    .map((file) => {
      const path = join(ROOT, file);
      const st = existsSync(path) ? statSync(path) : null;
      return {
        file,
        sha256: st?.isFile() ? sha256File(path) : 'missing',
        bytes: st?.isFile() ? st.size : 0,
      };
    });
}

function isRemoteArtifact(ref = '') {
  return /^https?:\/\//i.test(String(ref || ''));
}

function normalizedProjectArtifact(ref = '') {
  const value = String(ref || '').replaceAll('\\', '/').trim();
  if (!value || isRemoteArtifact(value) || isAbsolute(value) || value.includes('\0')) return '';
  const resolved = resolve(ROOT, value);
  const rel = relative(ROOT, resolved).replaceAll('\\', '/');
  if (!rel || rel.startsWith('..') || isAbsolute(rel)) return '';
  return rel;
}

function artifactInputProblems(artifacts = [], options = {}) {
  const problems = [];
  const commandIds = csv(options.commandIds || []);
  for (const artifact of csv(Array.isArray(artifacts) ? artifacts.join(',') : artifacts)) {
    if (isRemoteArtifact(artifact)) {
      if (!commandIds.length) problems.push(`remote artifact ${artifact} requires command evidence that fetched or validated it.`);
      continue;
    }
    const rel = normalizedProjectArtifact(artifact);
    if (!rel) {
      problems.push(`artifact must be a project-relative file path or URL: ${artifact}`);
      continue;
    }
    if (rel.startsWith('.codex/workflow/runtime/') || rel.startsWith('.codex/workflow/state/')) {
      problems.push(`artifact ${rel} is mutable runtime/state data and cannot be durable pass evidence.`);
      continue;
    }
    const path = join(ROOT, rel);
    if (!existsSync(path)) {
      problems.push(`artifact file is missing: ${rel}`);
      continue;
    }
    if (!statSync(path).isFile()) problems.push(`artifact path is not a file: ${rel}`);
  }
  return problems;
}

function artifactEvidenceForRefs(artifacts = []) {
  return artifactEvidenceForFiles(csv(Array.isArray(artifacts) ? artifacts.join(',') : artifacts)
    .map(normalizedProjectArtifact)
    .filter(Boolean)
    .filter((file) => !file.startsWith('.codex/workflow/runtime/') && !file.startsWith('.codex/workflow/state/')));
}

function artifactReferenceProblemsForRecord(record, label = 'artifact evidence') {
  const artifacts = csv(record.artifacts || record.evidence);
  if (!artifacts.length) return [];
  const commandIds = csv(record.commandIds);
  const problems = artifactInputProblems(artifacts, { commandIds });
  const localArtifacts = artifacts
    .map(normalizedProjectArtifact)
    .filter(Boolean)
    .filter((file) => !file.startsWith('.codex/workflow/runtime/') && !file.startsWith('.codex/workflow/state/'));
  const embedded = Array.isArray(record.artifactEvidence) ? record.artifactEvidence : [];
  if (localArtifacts.length && !embedded.length) {
    problems.push(`${label} references local artifacts but does not embed artifactEvidence hashes.`);
    return problems;
  }
  const byFile = new Map(embedded.map((entry) => [entry.file, entry]));
  for (const file of localArtifacts) {
    const entry = byFile.get(file);
    const path = join(ROOT, file);
    if (!entry) {
      problems.push(`${label} is missing embedded artifactEvidence for ${file}.`);
      continue;
    }
    if (!existsSync(path)) {
      problems.push(`${label} artifact is missing: ${file}.`);
      continue;
    }
    const st = statSync(path);
    const actualHash = sha256File(path);
    if (entry.sha256 !== actualHash) problems.push(`${label} artifact hash mismatch for ${file}.`);
    if (Number(entry.bytes || 0) !== st.size) problems.push(`${label} artifact size mismatch for ${file}.`);
  }
  const extra = embedded.map((entry) => entry.file).filter((file) => !localArtifacts.includes(file));
  if (extra.length) problems.push(`${label} embeds artifactEvidence not listed in artifacts: ${extra.join(', ')}.`);
  return problems;
}

function artifactEvidenceProblems(evidence, label = 'artifact evidence') {
  const required = [...(Array.isArray(evidence?.screenshots) ? evidence.screenshots : []), evidence?.summaryFile]
    .filter(Boolean);
  const entries = Array.isArray(evidence?.evidenceArtifacts) ? evidence.evidenceArtifacts : [];
  const problems = [];
  if (!required.length) {
    problems.push(`${label} has no screenshot or summary files.`);
    return problems;
  }
  problems.push(...artifactInputProblems(required));
  if (problems.length) return problems;
  if (!entries.length) {
    problems.push(`${label} does not embed evidenceArtifacts hashes for its screenshot/summary files.`);
    return problems;
  }
  const expected = new Set(required);
  const byFile = new Map(entries.map((entry) => [entry.file, entry]));
  for (const entry of entries) {
    if (!expected.has(entry.file)) problems.push(`${label} embeds unexpected evidence artifact: ${entry.file || '(missing file)'}.`);
  }
  for (const file of required) {
    const entry = byFile.get(file);
    const path = join(ROOT, file);
    if (!entry) {
      problems.push(`${label} is missing embedded hash for ${file}.`);
      continue;
    }
    if (!existsSync(path)) {
      problems.push(`${label} file is missing: ${file}.`);
      continue;
    }
    const st = statSync(path);
    if (!st.isFile()) {
      problems.push(`${label} path is not a file: ${file}.`);
      continue;
    }
    const actualHash = sha256File(path);
    if (entry.sha256 !== actualHash) problems.push(`${label} hash mismatch for ${file}.`);
    if (Number(entry.bytes || 0) !== st.size) problems.push(`${label} size mismatch for ${file}.`);
  }
  return problems;
}

function commandRecordGuideBrowser(args) {
  const verdict = String(args.verdict || '').toLowerCase();
  if (!['pass', 'fail', 'partial', 'blocked'].includes(verdict)) {
    console.error('record-guide-browser requires --verdict pass|fail|partial|blocked');
    process.exit(2);
  }
  if (verdict === 'pass' && (!args.screenshots || !args.notes || !args['summary-file'])) {
    console.error('record-guide-browser pass requires --screenshots, --summary-file, and --notes.');
    process.exit(2);
  }
  const hash = guideArtifactHash();
  const screenshots = args.screenshots ? csv(args.screenshots) : [];
  const summaryFile = args['summary-file'] || '';
  const evidenceFiles = [...screenshots, summaryFile].filter(Boolean);
  const artifactProblems = artifactInputProblems(evidenceFiles);
  if (artifactProblems.length) {
    console.error('record-guide-browser artifact evidence problems:');
    for (const problem of artifactProblems) console.error(`- ${problem}`);
    process.exit(2);
  }
  const missing = evidenceFiles.filter((file) => !existsSync(join(ROOT, normalizedProjectArtifact(file))));
  if (missing.length) {
    console.error('record-guide-browser evidence files are missing:');
    for (const file of missing) console.error(`- ${file}`);
    process.exit(2);
  }
  const evidenceArtifacts = artifactEvidenceForRefs(evidenceFiles);
  const title = `Guide browser ${verdict}`;
  const body = [
    `Verdict: ${verdict}`,
    `Reviewer: ${args.reviewer || args.verifier || 'unknown'}`,
    `Guide artifact hash: ${hash}`,
    '',
    summaryFile ? `Summary file: ${summaryFile}` : 'Summary file: n/a',
    '',
    screenshots.length ? ['Screenshots:', ...screenshots.map((file) => `- ${file}`)].join('\n') : 'Screenshots: n/a',
    '',
    evidenceArtifacts.length ? ['Evidence artifacts:', ...evidenceArtifacts.map((item) => `- ${item.file}: ${item.sha256} (${item.bytes} bytes)`)].join('\n') : 'Evidence artifacts: n/a',
    '',
    args.notes ? `Notes: ${args.notes}` : 'Notes: n/a',
  ].join('\n');
  const rec = writeRecord('guide-browser', title, body, {
    verdict,
    reviewer: args.reviewer || args.verifier || 'unknown',
    guideArtifactHash: hash,
    screenshots,
    summaryFile,
    evidenceArtifacts,
  });
  saveJson(GUIDE_BROWSER_STATE_FILE, {
    guideArtifactHash: hash,
    verdict,
    checkedAt: nowIso(),
    reviewer: args.reviewer || args.verifier || 'unknown',
    guideBrowserRecord: relative(ROOT, rec.path).replaceAll('\\', '/'),
    screenshots,
    summaryFile,
    evidenceArtifacts,
    notes: args.notes || '',
  });
  console.log(`Recorded guide browser ${verdict} for ${hash}`);
  console.log(relative(ROOT, rec.path));
}

function readGuideBrowserSummary(summaryFile) {
  if (!summaryFile) return { entries: [], problems: ['guide browser validation pass has no summary file.'] };
  const path = join(ROOT, summaryFile);
  if (!existsSync(path)) return { entries: [], problems: [`guide browser summary file is missing: ${summaryFile}`] };
  try {
    const parsed = JSON.parse(readFileSync(path, 'utf8'));
    const entries = Array.isArray(parsed) ? parsed : parsed.entries;
    if (!Array.isArray(entries)) return { entries: [], problems: [`guide browser summary is not an array or { entries }: ${summaryFile}`] };
    return { entries, problems: [] };
  } catch (error) {
    return { entries: [], problems: [`guide browser summary is invalid JSON: ${summaryFile} (${error.message})`] };
  }
}

function guideBrowserSummaryProblems(summaryFile) {
  const { entries, problems } = readGuideBrowserSummary(summaryFile);
  if (problems.length) return problems;
  const requiredNames = [
    'dashboard-artifact',
    'workflow-guide-artifact',
    'workflow-zoo-artifact-desktop',
    'workflow-zoo-artifact-mobile',
  ];
  const names = new Set(entries.map((entry) => entry.name));
  for (const name of requiredNames) {
    if (!names.has(name)) problems.push(`guide browser summary is missing required target: ${name}`);
  }
  for (const entry of entries) {
    if (!entry.name || !entry.target || !entry.viewport || !entry.title) problems.push(`guide browser summary entry is incomplete: ${entry.name || '(unnamed)'}`);
    if (!entry.meta || typeof entry.meta !== 'object') problems.push(`guide browser summary entry has no meta snapshot: ${entry.name || '(unnamed)'}`);
    if (!Array.isArray(entry.hrefs)) problems.push(`guide browser summary entry has no href snapshot: ${entry.name || '(unnamed)'}`);
    if (Number(entry.brokenImages || 0) !== 0) problems.push(`guide browser summary entry has broken images: ${entry.name}`);
  }
  const dashboard = entries.find((entry) => entry.name === 'dashboard-artifact');
  const guide = entries.find((entry) => entry.name === 'workflow-guide-artifact');
  const zoo = entries.filter((entry) => String(entry.name || '').startsWith('workflow-zoo-artifact-'));
  if (dashboard && dashboard.title !== GUIDE_TITLES.dashboard) problems.push(`dashboard artifact title mismatch: ${dashboard.title}`);
  if (guide && guide.title !== GUIDE_TITLES.public) problems.push(`public guide artifact title mismatch: ${guide.title}`);
  if (dashboard?.meta) {
    if (dashboard.meta[guideMetaName('sourceHash')] !== publicGuideSourceHash()) problems.push('dashboard artifact source hash mismatch.');
    if (!dashboard.meta[guideMetaName('contentHash')]) problems.push('dashboard artifact has no content hash meta.');
  }
  if (guide?.meta) {
    if (guide.meta[guideMetaName('sourceHash')] !== publicGuideSourceHash()) problems.push('public guide artifact source hash mismatch.');
    if (!guide.meta[guideMetaName('contentHash')]) problems.push('public guide artifact has no content hash meta.');
    if (!(guide.hrefs || []).some((href) => String(href).includes('zoo'))) problems.push('public guide artifact does not link to the visual Zoo/Gym guide.');
  }
  for (const entry of zoo) {
    if (entry.title !== ZOO_VISUAL_GUIDE_TITLE) problems.push(`Zoo/Gym artifact title mismatch for ${entry.name}: ${entry.title}`);
    if (Number(entry.imageCount || 0) < 1) problems.push(`Zoo/Gym artifact has no screenshots in DOM: ${entry.name}`);
    if (entry.meta && entry.meta[guideMetaName('sourceHash')] !== zooVisualSourceHash()) problems.push(`Zoo/Gym artifact source hash mismatch for ${entry.name}.`);
    if (entry.meta && !entry.meta[guideMetaName('contentHash')]) problems.push(`Zoo/Gym artifact has no content hash meta: ${entry.name}.`);
  }
  return problems;
}

function guideBrowserProblems() {
  const state = loadJson(GUIDE_BROWSER_STATE_FILE, {});
  const hash = guideArtifactHash();
  const record = recordFrontmatters('guide-browser')
    .filter((item) => item.guideArtifactHash === hash && item.verdict === 'pass')
    .sort((a, b) => String(b.created).localeCompare(String(a.created)))[0];
  const evidence = record ? {
    guideArtifactHash: record.guideArtifactHash,
    verdict: record.verdict,
    screenshots: record.screenshots || [],
    summaryFile: record.summaryFile || '',
    evidenceArtifacts: record.evidenceArtifacts || [],
    guideBrowserRecord: record.rel,
  } : {
    ...state,
    evidenceArtifacts: state.evidenceArtifacts || [],
  };
  const problems = [];
  if (evidence.guideArtifactHash !== hash || evidence.verdict !== 'pass') {
    problems.push(`guide browser validation is missing or stale for artifact hash ${hash}.`);
  }
  if (evidence.verdict === 'pass' && !(evidence.screenshots || []).length) {
    problems.push('guide browser validation pass has no screenshot evidence.');
  }
  if (evidence.verdict === 'pass') {
    problems.push(...artifactEvidenceProblems(evidence, 'guide browser evidence'));
    problems.push(...guideBrowserSummaryProblems(evidence.summaryFile));
  }
  if (evidence.verdict === 'pass') {
    problems.push(...evidenceRecordProblems('guide-browser', evidence.guideBrowserRecord, {
      guideArtifactHash: evidence.guideArtifactHash,
      verdict: 'pass',
    }, 'guide browser state'));
  }
  return problems;
}

async function captureBrowserTarget(page, outDirRel, target) {
  const { name, url, viewport, screenshot } = target;
  await page.setViewportSize(viewport);
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => [...document.images].forEach((img) => { img.loading = 'eager'; }));
  for (let pass = 0; pass < 3; pass++) {
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y <= height; y += 700) {
      await page.evaluate((scrollY) => window.scrollTo(0, scrollY), y);
      await page.waitForTimeout(60);
    }
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForFunction(() => [...document.images].every((img) => img.complete && img.naturalWidth > 0), null, { timeout: 30000 }).catch(() => null);
  await page.screenshot({
    path: join(ROOT, outDirRel, screenshot),
    type: 'jpeg',
    quality: 76,
    fullPage: false,
  });
  return page.evaluate((targetName) => ({
    name: targetName,
    target: location.href,
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
    },
    title: document.title,
    meta: Object.fromEntries([...document.querySelectorAll('meta[name]')].map((meta) => [meta.getAttribute('name'), meta.getAttribute('content') || ''])),
    hrefs: [...document.querySelectorAll('a[href]')].map((link) => link.getAttribute('href')).filter(Boolean).slice(0, 200),
    textSample: document.body.innerText.slice(0, 300),
    imageCount: document.images.length,
    brokenImages: [...document.images].filter((img) => !img.complete || img.naturalWidth === 0).length,
  }), name);
}

async function commandGuideBrowserFinalize(args = {}) {
  if (!args['allow-precloseout'] && substantiveFiles().length) {
    const preflightProblems = [];
    const branch = branchEvidenceInfo();
    if (releaseCloseoutMode(branch) === 'branch') {
      if (!commandBranchEvidenceCheck({ quiet: true })) preflightProblems.push('branch-scope patch, review, verification, or audit evidence is missing or stale');
    } else {
      if (!commandReviewCheck({ quiet: true })) preflightProblems.push('review evidence is missing or stale');
      if (!commandVerifyCheck({ quiet: true })) preflightProblems.push('verification evidence is missing or stale');
      if (!commandAuditCheck({ quiet: true })) preflightProblems.push('audit evidence is missing or stale');
    }
    if (preflightProblems.length) {
      console.error('guide-browser-finalize must run after review, verification, and audit evidence is current.');
      for (const problem of preflightProblems) console.error(`- ${problem}`);
      console.error('Use --allow-precloseout only for exploratory local screenshots; do not record final guide-browser pass before closeout evidence.');
      process.exit(2);
    }
  }
  commandZooVisualGuide({ quiet: true });
  commandDashboard({ quiet: true });
  commandPublicGuide({ quiet: true });

  const outDirRel = args['out-dir'] || profileProjectRel('guideBrowserFinalArtifacts');
  const outDir = join(ROOT, outDirRel);
  rmSync(outDir, { recursive: true, force: true });
  ensureDir(outDir);

  let chromium;
  try {
    ({ chromium } = await import('playwright'));
  } catch (error) {
    console.error(`guide-browser-finalize requires Playwright: ${error.message}`);
    process.exit(1);
  }

  const dashboardUrl = pathToFileURL(join(DASHBOARD_DIR, 'index.html')).href;
  const publicGuideUrl = pathToFileURL(join(DASHBOARD_DIR, 'public.html')).href;
  const zooUrl = pathToFileURL(join(ZOO_GUIDE_DIR, 'index.html')).href;
  const targets = [
    { name: 'dashboard-artifact', url: dashboardUrl, viewport: { width: 1360, height: 900 }, screenshot: 'dashboard-artifact.jpg' },
    { name: 'workflow-guide-artifact', url: publicGuideUrl, viewport: { width: 1360, height: 900 }, screenshot: 'workflow-guide-artifact.jpg' },
    { name: 'workflow-zoo-artifact-desktop', url: zooUrl, viewport: { width: 1360, height: 900 }, screenshot: 'workflow-zoo-artifact-desktop.jpg' },
    { name: 'workflow-zoo-artifact-mobile', url: zooUrl, viewport: { width: 390, height: 844 }, screenshot: 'workflow-zoo-artifact-mobile.jpg' },
  ];

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const entries = [];
  try {
    for (const target of targets) {
      entries.push(await captureBrowserTarget(page, outDirRel, target));
    }
  } finally {
    await browser.close();
  }

  const summaryFile = `${outDirRel}/summary.json`;
  writeFileSync(join(ROOT, summaryFile), `${JSON.stringify(entries, null, 2)}\n`);
  const summaryProblems = guideBrowserSummaryProblems(summaryFile);
  if (summaryProblems.length) {
    console.error('guide browser summary problems:');
    for (const problem of summaryProblems) console.error(`- ${problem}`);
    process.exit(1);
  }

  const screenshots = targets.map((target) => `${outDirRel}/${target.screenshot}`);
  commandRecordGuideBrowser({
    verdict: 'pass',
    reviewer: args.reviewer || leadWorkerId(),
    screenshots: screenshots.join(','),
    'summary-file': summaryFile,
    notes: args.notes || 'Final generated guide artifact browser validation. Deterministic proof is in summary.json; JPEG files are bounded viewport previews for human inspection, not pixel-diff baselines.',
  });
  if (!args.quiet) {
    console.log(`Guide browser evidence finalized: ${summaryFile}`);
  }
}

function commandGuideBrowserCheck({ quiet = false } = {}) {
  const problems = guideBrowserProblems();
  if (!quiet) {
    console.log(`guide browser problems: ${problems.length}`);
    for (const problem of problems) console.log(`- ${problem}`);
  }
  return problems.length === 0;
}

function graphHtml(title, nodes, edges = [], html = publicHtml) {
  const labels = new Set(nodes.map((node) => node.label));
  const missing = edges.filter(([a, b]) => !labels.has(a) || !labels.has(b));
  if (missing.length) {
    const detail = missing.map(([a, b]) => `${a} -> ${b}`).join(', ');
    throw new Error(`Graph ${title} references missing node labels: ${detail}`);
  }
  const edgeText = edges.length ? `<p class="meta">${edges.map(([a, b]) => `${html(a)} -> ${html(b)}`).join(' · ')}</p>` : '';
  return `
    <div class="graph">
      <h3>${html(title)}</h3>
      <div class="nodes">
        ${nodes.map((node) => `<div class="node" data-graph-node="${html(node.label)}"><strong>${html(node.label)}</strong><span>${html(node.detail || '')}</span></div>`).join('\n')}
      </div>
      ${edgeText}
    </div>
  `;
}

function guidePolicyGraph(key) {
  const graph = POLICY.guide?.viewGraphs?.[key] || {};
  if (!Array.isArray(graph.nodes) || !graph.nodes.length) {
    throw new Error(`Workflow guide policy viewGraphs.${key}.nodes must define the guide topology.`);
  }
  return {
    title: graph.title || key,
    nodes: graph.nodes,
    edges: Array.isArray(graph.edges) ? graph.edges : [],
  };
}

function sortRecordsNewest(records = []) {
  return [...records].sort((a, b) => String(b.created || '').localeCompare(String(a.created || '')));
}

function intakeModel() {
  const intents = sortRecordsNewest(recordFrontmatters(INTENT_RECORD_KIND));
  const workSlices = sortRecordsNewest(recordFrontmatters(WORK_SLICE_RECORD_KIND));
  const index = workSliceIndex(workSlices);
  const latestSlices = sortRecordsNewest([...index.latestByRoot.entries()].map(([rootId, record]) => ({
    ...record,
    rootId,
  })));
  const inboxStatuses = new Set(['captured', 'needs-clarification', 'accepted']);
  const activeStatuses = new Set(allowedPolicyValues('activeWorkSliceStatuses', ['ready', 'active', 'review']));
  const intentIdsWithSlices = new Set(workSlices.flatMap((slice) => csv(slice.intentIds || slice.intentId || slice.intents)));
  const evidence = Object.fromEntries(WORK_INTAKE_EVIDENCE_KINDS.map((kind) => [kind, recordFrontmatters(kind)]));
  return {
    intents,
    workSlices,
    latestSlices,
    intentById: new Map(intents.filter((record) => record.id).map((record) => [record.id, record])),
    inbox: intents.filter((record) => inboxStatuses.has(String(record.status || '').toLowerCase()) && !intentIdsWithSlices.has(record.id)),
    activeSlices: latestSlices.filter((record) => activeStatuses.has(String(record.status || '').toLowerCase())),
    evidence,
    index,
    warnings: intakeProblems(),
  };
}

function linkedEvidenceSummary(rootId, model, evidenceKinds = WORK_INTAKE_EVIDENCE_KINDS) {
  return evidenceKinds
    .map((kind) => {
      const count = recordsLinkedToWorkSlice(model.evidence[kind] || [], rootId, model.index).length;
      return `${kind}:${count}`;
    })
    .join(' · ');
}

function recordDisplayId(record) {
  return String(record?.id || record?.name || record?.rel || '').trim();
}

function recordSummary(record) {
  return record?.publicSummary || record?.summary || record?.title || recordDisplayId(record) || 'Untitled';
}

function recordKindLabel(kind) {
  return {
    patches: 'Patch',
    routing: 'Routing',
    reviews: 'Review',
    tests: 'Verify',
    audits: 'Audit',
    deployments: 'Deploy',
  }[kind] || kind;
}

function workIntakeEvidenceForSlice(rootId, model) {
  return Object.fromEntries(WORK_INTAKE_EVIDENCE_KINDS.map((kind) => [
    kind,
    recordsLinkedToWorkSlice(model.evidence[kind] || [], rootId, model.index),
  ]));
}

function workIntakeTraceRows(model, limit = Number(INTAKE_POLICY.guide?.maxTraceItems || 12), options = {}) {
  const evidenceKinds = Array.isArray(options.evidenceKinds) && options.evidenceKinds.length
    ? options.evidenceKinds.map(String).filter((kind) => WORK_INTAKE_EVIDENCE_KINDS.includes(kind))
    : WORK_INTAKE_EVIDENCE_KINDS;
  return model.latestSlices.slice(0, limit).map((slice) => {
    const rootId = slice.rootId || slice.id;
    const intentIds = intentIdsFromArgs(slice);
    const evidence = workIntakeEvidenceForSlice(rootId, model);
    return {
      slice,
      rootId,
      intents: intentIds.map((id) => model.intentById.get(id)).filter(Boolean),
      evidence: Object.fromEntries(evidenceKinds.map((kind) => [kind, evidence[kind] || []])),
    };
  });
}

function featureCatalogEntries(model) {
  const kinds = new Set(INTAKE_POLICY.guide?.featureCatalogIntentKinds || ['initial', 'idea', 'feature', 'bug', 'change-request']);
  const sliceByIntent = new Map();
  for (const slice of model.latestSlices) {
    for (const intentId of intentIdsFromArgs(slice)) {
      if (!sliceByIntent.has(intentId)) sliceByIntent.set(intentId, []);
      sliceByIntent.get(intentId).push(slice);
    }
  }
  return model.intents
    .filter((intent) => kinds.has(String(intent.kind || '').toLowerCase()))
    .map((intent) => ({
      intent,
      slices: sliceByIntent.get(recordDisplayId(intent)) || [],
    }))
    .filter((entry) => entry.slices.length || ['captured', 'needs-clarification', 'accepted'].includes(String(entry.intent.status || '').toLowerCase()))
    .sort((a, b) => String(b.intent.created || '').localeCompare(String(a.intent.created || '')));
}

function traceGraphForRows(rows, model, html = escapeHtml) {
  const nodes = [];
  const edges = [];
  const seen = new Set();
  const addNode = (label, detail) => {
    if (seen.has(label)) return label;
    seen.add(label);
    nodes.push({ label, detail });
    return label;
  };
  const maxEvidence = Number(INTAKE_POLICY.guide?.maxEvidenceItemsPerSlice || 4);
  for (const row of rows) {
    const sliceLabel = addNode(`Slice ${row.rootId}`, `${row.slice.status || 'unknown'} · ${recordSummary(row.slice)}`);
    for (const intent of row.intents.length ? row.intents : [{ id: 'unlinked-intent', summary: 'No source intent record linked' }]) {
      const intentLabel = addNode(`Intent ${recordDisplayId(intent)}`, `${intent.status || 'unknown'} · ${recordSummary(intent)}`);
      edges.push([intentLabel, sliceLabel]);
    }
    for (const [kind, records] of Object.entries(row.evidence)) {
      for (const record of records.slice(0, maxEvidence)) {
        const label = addNode(`${recordKindLabel(kind)} ${recordDisplayId(record)}`, recordSummary(record));
        edges.push([sliceLabel, label]);
      }
    }
  }
  return nodes.length ? graphHtml('Intent Trace Graph', nodes, edges, html) : graphHtml('Intent Trace Graph', [
    { label: 'No Work Slice Trace', detail: 'Create intent and work-slice records to populate this view' },
  ], [], html);
}

function workIntakeHtml(model, html = escapeHtml) {
  const maxInbox = Number(INTAKE_POLICY.guide?.maxInboxItems || 8);
  const maxActive = Number(INTAKE_POLICY.guide?.maxActiveSlices || 8);
  const maxTrace = Number(INTAKE_POLICY.guide?.maxTraceItems || 12);
  const maxCatalog = Number(INTAKE_POLICY.guide?.maxFeatureCatalogItems || 12);
  const maxEvidence = Number(INTAKE_POLICY.guide?.maxEvidenceItemsPerSlice || 4);
  const traceKinds = guideTraceEvidenceKinds();
  const selfReferentialKinds = selfReferentialEvidenceKinds();
  const hiddenTraceKinds = WORK_INTAKE_EVIDENCE_KINDS.filter((kind) => selfReferentialKinds.has(kind) && !traceKinds.includes(kind));
  const inbox = model.inbox.slice(0, maxInbox);
  const active = model.activeSlices.slice(0, maxActive);
  const trace = workIntakeTraceRows(model, maxTrace, { evidenceKinds: traceKinds });
  const catalog = featureCatalogEntries(model).slice(0, maxCatalog);
  const intentLine = (record) => `<li data-work-intake-intent="${html(recordDisplayId(record))}"><strong>${html(recordDisplayId(record))}</strong> <span class="meta">${html(record.status || 'unknown')} · ${html(record.kind || 'intent')}</span><br>${html(recordSummary(record))}</li>`;
  const sliceLine = (record, attr = 'data-work-intake-slice') => `<li ${attr}="${html(record.rootId || record.id || record.name)}"><strong>${html(record.rootId || record.id || record.name)}</strong> <span class="meta">${html(record.status || 'unknown')} · ${html(record.owner || 'unknown')}</span><br>${html(recordSummary(record))}<br><span class="meta">${html(linkedEvidenceSummary(record.rootId || record.id, model, traceKinds))}</span></li>`;
  const evidenceList = (kind, records) => records.length
    ? records.slice(0, maxEvidence).map((record) => `<span data-work-intake-evidence-kind="${html(kind)}" data-work-intake-evidence-id="${html(recordDisplayId(record))}">${html(recordKindLabel(kind))}: ${html(recordDisplayId(record))}</span>`).join('<br>')
    : `<span class="muted">No ${html(recordKindLabel(kind).toLowerCase())} evidence linked.</span>`;
  const traceLine = (row) => `<li data-work-intake-trace-row="${html(row.rootId)}">
    <strong>${html(row.rootId)}</strong> <span class="meta">${html(row.slice.status || 'unknown')} · ${html(row.slice.owner || 'unknown')}</span><br>
    ${html(recordSummary(row.slice))}
    <div class="trace-grid">
      <span><strong>Intents</strong><br>${row.intents.length ? row.intents.map((intent) => `<span data-work-intake-trace-intent="${html(recordDisplayId(intent))}">${html(recordDisplayId(intent))}: ${html(recordSummary(intent))}</span>`).join('<br>') : '<span class="muted">No source intent record linked.</span>'}</span>
      ${Object.entries(row.evidence).map(([kind, records]) => `<span><strong>${html(recordKindLabel(kind))}</strong><br>${evidenceList(kind, records)}</span>`).join('\n')}
    </div>
  </li>`;
  const catalogLine = (entry) => {
    const latest = entry.slices[0];
    const evidenceCount = entry.slices.reduce((sum, slice) => {
      const evidence = workIntakeEvidenceForSlice(slice.rootId || slice.id, model);
      return sum + traceKinds.reduce((inner, kind) => inner + (evidence[kind] || []).length, 0);
    }, 0);
    return `<li data-work-intake-feature="${html(recordDisplayId(entry.intent))}">
      <strong>${html(recordSummary(entry.intent))}</strong> <span class="meta">${html(entry.intent.status || 'unknown')} · ${html(entry.intent.kind || 'intent')}</span><br>
      <span class="meta">linked slices:${entry.slices.length} · latest:${html(latest?.status || 'none')} · trace evidence:${evidenceCount}</span>
    </li>`;
  };
  return `
    <section id="work-intake" class="panel">
      <h2>Work Intake</h2>
      <p class="meta">Local records are canonical. External trackers are optional references; gates use repo-local intent, work-slice, and evidence records.</p>
      ${hiddenTraceKinds.length ? `<p class="meta">Self-referential evidence kinds are omitted from this guide trace and remain validated by gates: ${hiddenTraceKinds.map((kind) => `<code>${html(kind)}</code>`).join(', ')}.</p>` : ''}
      <div class="grid">
        <div class="card"><span class="meta">Inbox</span><strong>${model.inbox.length}</strong></div>
        <div class="card"><span class="meta">Active Work Slices</span><strong>${model.activeSlices.length}</strong></div>
        <div class="card"><span class="meta">Feature Catalog</span><strong>${catalog.length}</strong></div>
        <div class="card"><span class="meta">Work Intake Warnings</span><strong>${model.warnings.length}</strong></div>
      </div>
      <h3>Work Intake Inbox</h3>
      ${inbox.length ? `<ul>${inbox.map(intentLine).join('\n')}</ul>` : '<p class="muted">No open user-intent records.</p>'}
      <h3>Active Work Slices</h3>
      ${active.length ? `<ul>${active.map((record) => sliceLine(record, 'data-work-intake-active-slice')).join('\n')}</ul>` : '<p class="muted">No active work slices.</p>'}
      ${traceGraphForRows(trace, model, html)}
      ${trace.length ? `<ul class="timeline">${trace.map(traceLine).join('\n')}</ul>` : '<p class="muted">No work-slice trace records yet.</p>'}
      <h3>Feature Catalog</h3>
      ${catalog.length ? `<ul>${catalog.map(catalogLine).join('\n')}</ul>` : '<p class="muted">No feature/intent catalog records yet.</p>'}
      <h3>Work Intake Warnings</h3>
      <div data-work-intake-warning-state="${model.warnings.length ? 'problems' : 'clean'}">
        ${model.warnings.length ? `<ul>${model.warnings.map((problem) => `<li>${html(problem)}</li>`).join('\n')}</ul>` : '<p class="muted">No deterministic intake problems reported.</p>'}
      </div>
    </section>
  `;
}

function commandDashboard(args = {}) {
  ensureDir(DASHBOARD_DIR);
  const recordKinds = GUIDE_RECORD_KINDS;
  const displayOnlyRecordKinds = new Set(POLICY.guide?.displayOnlyRecordKinds || []);
  const displayOnlyRecordNotice = String(POLICY.guide?.displayOnlyRecordNotice || '').trim();
  const rawRecords = Object.fromEntries(recordKinds.map((kind) => [kind, listRecords(kind)]));
  const records = displayRecords(rawRecords);
  const currentState = readText(profileProjectRel('currentState'));
  const knowledgeSections = dashboardKnowledgeSections();
  const risks = readText(profileProjectRel('risks'));
  const branch = gitText(['branch', '--show-current']) || '(detached HEAD)';
  const generated = nowIso();
  const sourceHash = publicGuideSourceHash();
  const recordFeedHash = guideRecordFeedHash();
  const tokenRootCss = productionGuideTokenCss();
  const intake = intakeModel();
  const registry = loadJson(resolveProjectPath(DESIGN_REGISTRY_PATH), {
    primitives: [],
    patterns: [],
  });
  const zooEntries = [...(registry.primitives || []), ...(registry.patterns || [])].map((entry) => ({
    name: entry.name,
    kind: entry.kind || (registry.primitives?.includes(entry) ? 'ui' : 'pattern'),
    path: entry.path,
    zooRoute: entry.zooRoute,
    purpose: entry.purpose,
  }));
  const zooLinked = zooEntries.filter((entry) => entry.zooRoute).length;
  const cards = [
    ['Decisions', records.decisions.length],
    ['Intents', records[INTENT_RECORD_KIND]?.length || 0],
    ['Work Slices', records[WORK_SLICE_RECORD_KIND]?.length || 0],
    ['Pattern Proposals', records['pattern-proposals'].length],
    ['Routing', records.routing.length],
    ['Patches', records.patches.length],
    ['Reviews', records.reviews.length],
    ['Tests', records.tests.length],
    ['Audits', records.audits.length],
    [displayOnlyRecordLabel('deployments', 'Deployments'), records.deployments.length],
    ['Zoo Pages', `${zooLinked}/${zooEntries.length}`],
  ];
  const recordHtml = recordKinds.map((kind) => `
    <section id="${kind}" class="panel">
      <h2>${kind[0].toUpperCase() + kind.slice(1)}</h2>
      ${records[kind].length ? records[kind].map((record) => `
        <article class="record">
          <div class="record-top">
            <strong>${escapeHtml(record.title)}</strong>
            <span>${escapeHtml(record.created || record.name)}</span>
          </div>
          ${record.verdict ? `<span class="pill">${escapeHtml(record.verdict)}</span>` : ''}
          <p class="path">${escapeHtml(record.rel)}</p>
          <pre>${escapeHtml(record.excerpt)}</pre>
        </article>
      `).join('\n') : '<p class="muted">No records yet.</p>'}
    </section>
  `).join('\n');

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  ${guideMetaTag('version', PUBLIC_GUIDE_VERSION)}
  ${guideMetaTag('sourceHash', sourceHash)}
  ${guideMetaTag('recordFeedHash', recordFeedHash)}
  ${guideMetaTag('contentHash', PUBLIC_GUIDE_CONTENT_HASH_PLACEHOLDER)}
  ${guideMetaTag('tokenSource', GUIDE_TOKEN_SOURCE_LABEL)}
  <title>${escapeHtml(GUIDE_TITLES.dashboard)}</title>
  <style>
    :root {
      color-scheme: light;
      ${tokenRootCss}
      --guide-bg: var(--color-bg-surface);
      --guide-panel: var(--color-bg-elevated);
      --guide-muted-surface: var(--color-bg-muted);
      --guide-text: var(--color-text);
      --guide-muted-text: var(--color-text-secondary);
      --guide-line: var(--color-border);
      --guide-brand: var(--color-primary);
      --guide-accent: var(--color-accent);
      --guide-risk: var(--color-danger);
    }
    * { box-sizing: border-box; }
    body { margin:0; font-family: Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif; background:var(--guide-bg); color:var(--guide-text); line-height:1.45; }
    header { padding:28px 32px 18px; background:var(--guide-panel); border-bottom:1px solid var(--guide-line); }
    h1 { margin:0 0 8px; font-size:28px; letter-spacing:0; }
    h2 { margin:0 0 14px; font-size:18px; letter-spacing:0; }
    h3 { margin:18px 0 8px; font-size:15px; letter-spacing:0; }
    p { margin:8px 0; }
    pre { white-space:pre-wrap; overflow:auto; background:var(--guide-muted-surface); border:1px solid var(--guide-line); padding:10px; border-radius:var(--radius-card); font-size:12px; }
    code { background:var(--guide-muted-surface); padding:1px 4px; border-radius:var(--radius-btn); }
    a { color:var(--guide-brand); text-decoration:none; }
    a:hover { text-decoration:underline; }
    .meta { color:var(--guide-muted-text); font-size:13px; }
    .layout { display:grid; grid-template-columns:260px 1fr; min-height:calc(100vh - 92px); }
    nav { position:sticky; top:0; height:100vh; padding:18px; border-right:1px solid var(--guide-line); background:var(--guide-muted-surface); overflow:auto; }
    nav a { display:flex; align-items:center; min-height:var(--hit-sm); padding:7px 9px; border-radius:var(--radius-btn); color:var(--guide-text); font-size:14px; }
    nav a:hover { background:var(--guide-panel); text-decoration:none; }
    main { padding:22px; max-width:1180px; }
    .grid { display:grid; grid-template-columns:repeat(auto-fit, minmax(150px, 1fr)); gap:12px; margin:16px 0 22px; }
    .card, .panel, .record { background:var(--guide-panel); border:1px solid var(--guide-line); border-radius:var(--radius-card); }
    .card { min-height:var(--hit-md); padding:14px; }
    .card strong { display:block; font-size:24px; }
    .panel { padding:18px; margin:0 0 18px; }
    .record { padding:12px; margin:10px 0; }
    .record-top { display:flex; justify-content:space-between; gap:12px; align-items:baseline; }
    .record-top span, .path, .muted { color:var(--guide-muted-text); font-size:12px; }
    .pill { display:inline-block; margin-top:8px; padding:2px 8px; border-radius:var(--radius-chip); background:var(--color-primary-light); color:var(--guide-brand); font-size:12px; }
    .trace-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:8px; margin-top:8px; padding:8px; border:1px solid var(--guide-line); border-radius:var(--radius-card); background:var(--guide-muted-surface); font-size:12px; }
    .warn { border-left:4px solid var(--guide-accent); }
    .risk { border-left:4px solid var(--guide-risk); }
    .zoo-grid { display:grid; grid-template-columns:repeat(auto-fit, minmax(260px, 1fr)); gap:10px; }
    @media (max-width: 820px) {
      .layout { grid-template-columns:1fr; }
      nav { position:static; height:auto; display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:6px; border-right:0; border-bottom:1px solid var(--guide-line); }
      nav a { min-height:var(--hit-sm); }
    }
  </style>
</head>
<body>
  <header>
    <h1>${escapeHtml(GUIDE_TITLES.dashboard)}</h1>
    <div class="meta">Generated ${escapeHtml(generated)} · branch ${escapeHtml(branch)}</div>
  </header>
  <div class="layout">
    <nav>
      <a href="#overview">Overview</a>
      <a href="#work-intake">Work Intake</a>
      <a href="#current">Current State</a>
      <a href="#zoo">Design Zoo/Gym</a>
      ${knowledgeSections.map((section) => `<a href="#${escapeHtml(section.id)}">${escapeHtml(section.title)}</a>`).join('\n')}
      <a href="#records">Records</a>
      <a href="#decisions">Decisions</a>
      <a href="#pattern-proposals">Pattern Proposals</a>
      <a href="#patches">Patches</a>
      <a href="#reviews">Reviews</a>
      <a href="#tests">Tests</a>
      <a href="#audits">Audits</a>
      <a href="#deployments">Deployments</a>
      <a href="#risks">Risks</a>
      <a href="#deployment">Deployment</a>
    </nav>
    <main>
      <section id="overview" class="panel">
        <h2>Overview</h2>
        <div class="grid">
          ${cards.map(([label, count]) => `<div class="card"><span class="meta">${label}</span><strong>${count}</strong></div>`).join('\n')}
        </div>
        ${displayOnlyRecordNotice ? `<p class="meta">${escapeHtml(displayOnlyRecordNotice)}</p>` : ''}
        <p class="meta">This is a generated snapshot for navigation. It intentionally does not embed live git status or mutable gate state. Run <code>npm run workflow:status</code> for the current worktree truth.</p>
      </section>
      ${workIntakeHtml(intake, escapeHtml)}
      <section id="current" class="panel">${markdownLite(currentState)}</section>
      <section id="zoo" class="panel">
        <h2>Design Zoo / Gym</h2>
        <p>The production component gym is the dev-only app route at <code>${escapeHtml(localDesignUrl())}</code>. It reads real source components through <code>${escapeHtml(DESIGN_ZOO_ROUTE_PATH)}</code>; this dashboard reads <code>${escapeHtml(DESIGN_REGISTRY_PATH)}</code> so coverage is visible here too.</p>
        <p><a href="${escapeHtml(localDesignUrl())}">Open local zoo index</a> after running <code>npm run dev:web</code> or <code>npm run dev:all</code>.</p>
        <p><a href="zoo/index.html">Open generated Visual Zoo/Gym Guide</a> for captured previews that can be deployed to <code>${escapeHtml(PUBLIC_ZOO_GUIDE_URL)}</code>.</p>
        <div class="record">
          <strong>Registry coverage</strong>
          <p class="path">${zooLinked} of ${zooEntries.length} registry entries declare a zoo route.</p>
        </div>
        <div class="zoo-grid">
          ${zooEntries.map((entry) => `
            <article class="record">
              <div class="record-top">
                <strong>${escapeHtml(entry.name)}</strong>
                <span>${escapeHtml(entry.kind)}</span>
              </div>
              <p class="path">${escapeHtml(entry.path || '')}</p>
              ${entry.zooRoute ? `<p><a href="${escapeHtml(localDesignUrl(entry.zooRoute))}">${escapeHtml(entry.zooRoute)}</a></p>` : '<p class="muted">No zoo route declared.</p>'}
              <p>${escapeHtml(entry.purpose || '')}</p>
            </article>
          `).join('\n')}
        </div>
      </section>
      ${knowledgeSections.map((section) => `<section id="${escapeHtml(section.id)}" class="panel">${markdownLite(readText(section.file))}</section>`).join('\n')}
      <section id="records" class="panel">
        <h2>Record Index</h2>
        <p class="muted">Records are markdown files under .codex/workflow/records. This dashboard is a generated browser view; the markdown remains the source of truth.</p>
      </section>
      ${recordHtml}
      <section id="risks" class="panel risk">${markdownLite(risks)}</section>
    </main>
  </div>
</body>
</html>`;
  const outPath = join(DASHBOARD_DIR, 'index.html');
  writeFileSync(outPath, injectGuideContentHash(html));
  if (!args.quiet) {
    console.log(`Dashboard generated: ${relative(ROOT, outPath).replaceAll('\\', '/')}`);
  }
}

function commandPublicGuide(args = {}) {
  ensureDir(DASHBOARD_DIR);
  const generated = nowIso();
  const branch = gitText(['branch', '--show-current']) || '(detached HEAD)';
  const displayOnlyRecordKinds = new Set(POLICY.guide?.displayOnlyRecordKinds || []);
  const displayOnlyRecordNotice = String(POLICY.guide?.displayOnlyRecordNotice || '').trim();
  const sourceHash = publicGuideSourceHash();
  const recordFeedHash = guideRecordFeedHash();
  const tokenRootCss = productionGuideTokenCss();
  const rawRecords = Object.fromEntries(GUIDE_RECORD_KINDS.map((kind) => [kind, listRecords(kind)]));
  const records = displayRecords(rawRecords);
  const intake = intakeModel();
  const allRecords = Object.entries(records)
    .flatMap(([kind, items]) => items.map((record) => ({ ...record, kind })))
    .sort((a, b) => String(b.created).localeCompare(String(a.created)));
  const publicTimelineExcludedKinds = new Set(POLICY.guide?.publicTimeline?.excludeKinds || []);
  const publicTimelineRecords = allRecords.filter((record) => !publicTimelineExcludedKinds.has(record.kind));
  const recordsByCategory = publicTimelineRecords.reduce((acc, record) => {
    const category = recordCategory(record.kind, record.title);
    acc[category] = acc[category] || [];
    acc[category].push(record);
    return acc;
  }, {});
  const risks = publicSafe(markdownSection(readText(profileProjectRel('risks')), 'Open'));
  const routingScenarios = loadJson(ROUTING_SCENARIOS_FILE, []);
  const registry = loadJson(resolveProjectPath(DESIGN_REGISTRY_PATH), { primitives: [], patterns: [] });
  const zooEntries = [...(registry.primitives || []), ...(registry.patterns || [])];
  const zooLinked = zooEntries.filter((entry) => entry.zooRoute).length;
  const themes = designThemeNames(registry);
  const agentFiles = listFilesUnder(profileProjectRel('agentsDir'), 1, 16);
  const skillFiles = listFilesUnder('.agents/skills', 2, 16).filter((file) => file.endsWith('SKILL.md'));
  const docs = guideDocumentFiles();
  const repositoryGraph = guidePolicyGraph('repository');
  const webAppGraph = guidePolicyGraph('webApp');
  const designSystemGraph = guidePolicyGraph('designSystem');
  const designFlowGraph = guidePolicyGraph('designFlow');
  const workflowGraph = guidePolicyGraph('workflow');
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  ${guideMetaTag('version', PUBLIC_GUIDE_VERSION)}
  ${guideMetaTag('sourceHash', sourceHash)}
  ${guideMetaTag('recordFeedHash', recordFeedHash)}
  ${guideMetaTag('contentHash', PUBLIC_GUIDE_CONTENT_HASH_PLACEHOLDER)}
  ${guideMetaTag('tokenSource', GUIDE_TOKEN_SOURCE_LABEL)}
  <title>${publicHtml(GUIDE_TITLES.public)}</title>
  <style>
    :root {
      color-scheme: light;
      ${tokenRootCss}
      --guide-bg: var(--color-bg-surface);
      --guide-panel: var(--color-bg-elevated);
      --guide-muted-surface: var(--color-bg-muted);
      --guide-text: var(--color-text);
      --guide-muted-text: var(--color-text-secondary);
      --guide-line: var(--color-border);
      --guide-brand: var(--color-primary);
      --guide-accent: var(--color-accent);
    }
    * { box-sizing:border-box; }
    body { margin:0; font-family:Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif; color:var(--guide-text); background:var(--guide-bg); line-height:1.5; }
    header { padding:34px 24px 20px; background:var(--guide-panel); border-bottom:1px solid var(--guide-line); }
    main { max-width:1040px; margin:0 auto; padding:24px; }
    h1 { margin:0 0 8px; font-size:30px; letter-spacing:0; }
    h2 { margin:0 0 12px; font-size:20px; letter-spacing:0; }
    section { background:var(--guide-panel); border:1px solid var(--guide-line); border-radius:var(--radius-card); padding:18px; margin:0 0 16px; }
    .grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(190px,1fr)); gap:12px; }
    .card { min-height:var(--hit-md); border:1px solid var(--guide-line); border-radius:var(--radius-card); padding:14px; background:var(--guide-muted-surface); }
    .timeline { max-height:520px; overflow:auto; border:1px solid var(--guide-line); border-radius:var(--radius-card); padding:8px 14px; background:var(--guide-muted-surface); }
    .timeline li { margin:8px 0; }
    .nodes { display:grid; grid-template-columns:repeat(auto-fit,minmax(170px,1fr)); gap:10px; margin:10px 0 12px; }
    .node { min-height:var(--hit-md); border:1px solid var(--guide-line); border-radius:var(--radius-card); padding:12px; background:var(--guide-muted-surface); }
    .node strong, .node span { display:block; }
    .node span { color:var(--guide-muted-text); font-size:12px; margin-top:4px; }
    .graph { margin:14px 0; }
    .trace-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:8px; margin-top:8px; padding:8px; border:1px solid var(--guide-line); border-radius:var(--radius-card); background:var(--guide-panel); font-size:12px; }
    .zoo-list { display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:8px; padding:0; list-style:none; }
    .zoo-list li { min-height:var(--hit-md); border:1px solid var(--guide-line); border-radius:var(--radius-card); padding:10px; background:var(--guide-muted-surface); }
    .meta { color:var(--guide-muted-text); font-size:13px; }
    code { background:var(--guide-muted-surface); border-radius:var(--radius-btn); padding:1px 4px; }
    ul { padding-left:20px; }
    a { color:var(--guide-brand); text-decoration:none; }
    a:hover { text-decoration:underline; }
    .warn { border-left:4px solid var(--guide-accent); }
  </style>
</head>
<body>
  <header>
    <h1>${publicHtml(GUIDE_TITLES.public)}</h1>
    <div class="meta">Generated snapshot ${publicHtml(generated)} · branch ${publicHtml(branch)} · run workflow gates for live state before deploy</div>
  </header>
  <main>
    <section>
      <h2>What This Is</h2>
      <p>This is the public-safe guide for the Nexus Codex workflow. The complete internal workflow system lives in the repository under <code>.codex/</code>, with the compact handover at <code>.codex/workflow/current-state.md</code>.</p>
      <p>The old Claude Code setup is archived in the repo and is no longer active.</p>
    </section>
    <section>
      <h2>Workflow Shape</h2>
      <div class="grid">
        <div class="card"><strong>Lead</strong><p>Plans, routes, integrates, records state, and owns final quality.</p></div>
        <div class="card"><strong>Spark Worker</strong><p>Only narrow, explicit, testable coding slices. Must escalate when scope or reasoning gets hard.</p></div>
        <div class="card"><strong>Strong Worker</strong><p>GPT-5.5 class coding for ambiguous debugging, architecture, cross-cutting changes, visual/design judgment, and Spark fallback.</p></div>
        <div class="card"><strong>Review/Audit</strong><p>Focused checks against project patterns, related updates, deprecated approaches, and deployment evidence.</p></div>
      </div>
    </section>
    <section>
      <h2>Workflow System Nodes</h2>
      ${graphHtml(workflowGraph.title, workflowGraph.nodes, workflowGraph.edges)}
      <div class="grid">
        <div class="card"><strong>${records.routing.length}</strong><p>routing records</p></div>
        <div class="card"><strong>${routingScenarios.length}</strong><p>routing scenarios</p></div>
        <div class="card"><strong>${agentFiles.length}</strong><p>agent configs</p></div>
        <div class="card"><strong>${skillFiles.length}</strong><p>repo skills</p></div>
      </div>
    </section>
    ${workIntakeHtml(intake, publicHtml)}
    <section>
      <h2>Project Structure</h2>
      ${graphHtml(repositoryGraph.title, repositoryGraph.nodes, repositoryGraph.edges)}
      ${graphHtml(webAppGraph.title, webAppGraph.nodes, webAppGraph.edges)}
    </section>
    <section>
      <h2>Design System / Zoo / Docs</h2>
      <p class="meta">Design Zoo/Gym source: <code>${publicHtml(DESIGN_ZOO_ROUTE_PATH)}</code>. Registry source: <code>${publicHtml(DESIGN_REGISTRY_PATH)}</code>.</p>
      ${graphHtml(designSystemGraph.title, designSystemGraph.nodes, designSystemGraph.edges)}
      ${graphHtml(designFlowGraph.title, designFlowGraph.nodes, designFlowGraph.edges)}
      <p>Design Zoo/Gym coverage: <strong>${zooLinked}/${zooEntries.length}</strong> registry entries declare a route.</p>
      <p><a href="zoo/">Open Visual Zoo/Gym Guide</a>. Production <code>${publicHtml(PRODUCTION_DESIGN_PATH)}</code> remains dev-only; the deployable visual surface is <code>${publicHtml(PUBLIC_ZOO_GUIDE_URL)}</code>.</p>
      <div class="grid">
        <div class="card"><strong>${registry.primitives?.length || 0}</strong><p>primitives</p></div>
        <div class="card"><strong>${registry.patterns?.length || 0}</strong><p>patterns</p></div>
        <div class="card"><strong>${themes.length}</strong><p>themes</p></div>
        <div class="card"><strong>${zooLinked}</strong><p>Zoo/Gym routes</p></div>
      </div>
      <ul class="zoo-list">
        ${zooEntries.map((entry) => `<li><strong>${publicHtml(entry.name || 'unnamed')}</strong><br><span class="meta">${publicHtml(entry.kind || 'entry')} · ${publicHtml(entry.zooRoute || 'no zoo route')}</span><br><code>${publicHtml(entry.path || '')}</code><p>${publicHtml(entry.purpose || '')}</p></li>`).join('\n')}
      </ul>
      <h3>Design And Workflow Documents</h3>
      <ul>
        ${docs.map((file) => `<li><code>${publicHtml(file)}</code></li>`).join('\n')}
      </ul>
    </section>
    <section>
      <h2>How Future Sessions Resume</h2>
      <ul>
        <li>Read ${guideResumeReadDocs().map((file) => `<code>${publicHtml(file)}</code>`).join(', ')}.</li>
        <li>Use the canonical ladder: ${canonicalLadderInline(POLICY, publicHtml)}.</li>
        <li>${publicHtml(guideResumePolicy().permissionAdvice || '')}</li>
        <li>Use detailed records under <code>.codex/workflow/records/</code> instead of loading chat transcripts.</li>
        <li>Use <code>.codex/knowledge/</code> for patterns, design-system rules, model routing, and deployment guidance.</li>
      </ul>
      <h3>Branch Closeout</h3>
      <p class="meta">Worktree records are interim evidence. Branches close with branch-scope records tied to the current branch hash.</p>
      <pre>${publicHtml(guideBranchCloseoutCommands().join('\n'))}</pre>
      <p class="meta">Add focused branch review kinds such as <code>workflow</code>, <code>design</code>, or <code>integrated</code> when the release gate asks for them.</p>
    </section>
    <section>
      <h2>Model Routing Examples</h2>
      <p class="meta">These scenarios are executable workflow checks, not passive documentation. Run <code>npm run workflow:model-routing-check</code>.</p>
      <ul class="zoo-list">
        ${routingScenarios.map((scenario) => `<li><strong>${publicHtml(scenario.id)}</strong><br><span class="meta">expected: ${publicHtml(scenario.expectedRoute)}</span><p>${publicHtml(scenario.summary || '')}</p></li>`).join('\n')}
      </ul>
    </section>
    <section>
      <h2>Current Counts</h2>
      ${displayOnlyRecordNotice ? `<p class="meta">${publicHtml(displayOnlyRecordNotice)}</p>` : ''}
      <div class="grid">
        ${GUIDE_RECORD_KINDS.map((kind) => {
          const items = records[kind] || [];
          const label = kind === 'audits' ? 'audits (first-class + legacy)' : kind;
          const displayLabel = displayOnlyRecordKinds.has(kind) ? `${label} (display-only)` : label;
          return `<div class="card"><strong>${items.length}</strong><p>${publicHtml(displayLabel)}</p></div>`;
        }).join('\n')}
      </div>
      <p class="meta">Guide-browser evidence is tracked separately by hash-bound records and omitted from this generated guide to avoid self-referential guide freshness loops.</p>
    </section>
    <section>
      <h2>Workflow Event Timeline</h2>
      <p class="meta">All indexed workflow records are listed here by title. The repo-local dashboard contains detailed excerpts and internal paths.</p>
      ${Object.entries(recordsByCategory).map(([category, items]) => `
        <h3>${publicHtml(category)}</h3>
        <ul class="timeline">
          ${items.map((record) => `<li><strong>${publicHtml(record.kind)}:</strong> ${publicHtml(record.title)} <span class="meta">${publicHtml(record.created || '')}</span></li>`).join('\n')}
        </ul>
      `).join('\n')}
    </section>
    <section class="warn">
      <h2>Open Follow-Ups</h2>
      ${markdownLite(risks || 'No open risks recorded.')}
    </section>
  </main>
</body>
</html>`;
  const outPath = args.out ? resolve(ROOT, String(args.out)) : join(DASHBOARD_DIR, 'public.html');
  ensureDir(dirname(outPath));
  writeFileSync(outPath, injectGuideContentHash(html));
  if (!args.quiet) {
    console.log(`Public guide generated: ${relative(ROOT, outPath).replaceAll('\\', '/')}`);
    console.log(`Deployment URL: ${PUBLIC_GUIDE_URL}`);
  }
}

function commandZooVisualGuide(args = {}) {
  ensureDir(ZOO_GUIDE_DIR);
  const generated = nowIso();
  const sourceHash = zooVisualSourceHash();
  const tokenRootCss = productionGuideTokenCss();
  const entries = zooVisualEntries();
  const manifestTargets = zooManifestTargets();
  const contexts = zooManifestContexts();
  const manifestByContextSlug = new Map(manifestTargets.map((target) => [`${target.contextId || 'legacy'}:${target.slug}`, target]));
  const manifest = loadJson(ZOO_GUIDE_MANIFEST, {});
  const capturedAt = manifest.capturedAt || 'not captured';
  const cardsForContext = (context) => entries.map((entry) => {
    const target = manifestByContextSlug.get(`${context.id || 'legacy'}:${entry.slug}`);
    const asset = target?.asset?.replace(/^\.codex\/dashboard\/zoo\//, '') || `assets/${entry.slug}.jpg`;
    const image = target
      ? `<img src="${publicHtml(asset)}" alt="${publicHtml(entry.title)} visual capture" loading="lazy" />`
      : '<div class="missing">Missing capture</div>';
    return `
      <article class="demo-card" data-slug="${escapeHtml(entry.slug)}" data-context="${escapeHtml(context.id || 'legacy')}">
        <a class="shot" href="${publicHtml(asset)}">${image}</a>
        <div class="demo-body">
          <div class="demo-top">
            <strong>${publicHtml(entry.title)}</strong>
            <span>${publicHtml(entry.kind)}</span>
          </div>
          <p>${publicHtml(entry.purpose || '')}</p>
          <dl>
            <dt>Context</dt><dd><code>${publicHtml(context.label || context.id || 'legacy')}</code></dd>
            <dt>Local route</dt><dd><code>${publicHtml(entry.route || '')}</code></dd>
            <dt>Source</dt><dd><code>${publicHtml(entry.path || '')}</code></dd>
          </dl>
        </div>
      </article>
    `;
  });
  const contextSections = contexts.map((context) => {
    const cards = cardsForContext(context);
    return `
    <section data-context="${escapeHtml(context.id || 'legacy')}">
      <h2>${publicHtml(context.label || context.id || 'Visual Context')}</h2>
      <div class="panel callout">
        <p>Mode <code>${publicHtml(context.mode || 'n/a')}</code> · theme <code>${publicHtml(context.theme || 'n/a')}</code> · viewport <code>${publicHtml(context.viewport?.width || 'n/a')}x${publicHtml(context.viewport?.height || 'n/a')}</code>.</p>
      </div>
      <h3>Token Foundations</h3>
      <div class="demo-grid">${cards.slice(0, 3).join('\n')}</div>
      <h3>Component Gallery</h3>
      <div class="demo-grid">${cards.slice(3).join('\n')}</div>
    </section>`;
  }).join('\n');
  const contextSummary = contexts.map((context) => `${context.label || context.id}: ${context.mode || 'n/a'} / ${context.theme || 'n/a'} / ${context.viewport?.width || 'n/a'}x${context.viewport?.height || 'n/a'}`).join(' · ');
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  ${guideMetaTag('version', ZOO_VISUAL_GUIDE_VERSION)}
  ${guideMetaTag('sourceHash', sourceHash)}
  ${guideMetaTag('contentHash', PUBLIC_GUIDE_CONTENT_HASH_PLACEHOLDER)}
  ${guideMetaTag('tokenSource', GUIDE_TOKEN_SOURCE_LABEL)}
  <title>${publicHtml(ZOO_VISUAL_GUIDE_TITLE)}</title>
  <style>
    :root {
      color-scheme: light;
      ${tokenRootCss}
      --guide-bg: var(--color-bg-surface);
      --guide-panel: var(--color-bg-elevated);
      --guide-muted-surface: var(--color-bg-muted);
      --guide-text: var(--color-text);
      --guide-muted-text: var(--color-text-secondary);
      --guide-line: var(--color-border);
      --guide-brand: var(--color-primary);
      --guide-accent: var(--color-accent);
    }
    * { box-sizing:border-box; }
    body { margin:0; font-family:Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif; color:var(--guide-text); background:var(--guide-bg); line-height:1.48; }
    header { padding:30px 24px 18px; background:var(--guide-panel); border-bottom:1px solid var(--guide-line); }
    main { max-width:1220px; margin:0 auto; padding:24px; }
    h1 { margin:0 0 8px; font-size:32px; letter-spacing:0; }
    h2 { margin:0 0 12px; font-size:20px; letter-spacing:0; }
    h3 { margin:16px 0 10px; font-size:16px; letter-spacing:0; }
    section { margin:0 0 22px; }
    a { color:var(--guide-brand); text-decoration:none; }
    a:hover { text-decoration:underline; }
    code { background:var(--guide-muted-surface); border-radius:var(--radius-btn); padding:1px 4px; }
    .meta { color:var(--guide-muted-text); font-size:13px; }
    .intro { display:grid; grid-template-columns:minmax(0, 1.5fr) minmax(240px, 0.7fr); gap:14px; align-items:stretch; }
    .panel, .stat, .demo-card { background:var(--guide-panel); border:1px solid var(--guide-line); border-radius:var(--radius-card); }
    .panel { padding:18px; }
    .stats { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; }
    .stat { padding:14px; min-height:var(--hit-md); background:var(--guide-muted-surface); }
    .stat strong { display:block; font-size:24px; }
    .demo-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(270px,1fr)); gap:14px; }
    .demo-card { overflow:hidden; }
    .shot { display:block; max-height:520px; min-height:180px; background:var(--guide-muted-surface); border-bottom:1px solid var(--guide-line); overflow:auto; }
    .shot img { width:100%; height:auto; object-fit:contain; object-position:top left; display:block; }
    .missing { min-height:100%; display:grid; place-items:center; color:var(--guide-muted-text); }
    .demo-body { padding:12px; }
    .demo-top { display:flex; align-items:baseline; justify-content:space-between; gap:8px; }
    .demo-top span { color:var(--guide-muted-text); font-size:12px; }
    .demo-body p { min-height:42px; margin:8px 0; color:var(--guide-muted-text); font-size:13px; }
    dl { display:grid; grid-template-columns:76px minmax(0,1fr); gap:4px 8px; margin:0; font-size:12px; }
    dt { color:var(--guide-muted-text); }
    dd { margin:0; min-width:0; overflow-wrap:anywhere; }
    .callout { border-left:4px solid var(--guide-accent); }
    @media (max-width: 760px) {
      .intro { grid-template-columns:1fr; }
      main { padding:16px; }
    }
  </style>
</head>
<body>
  <header>
    <h1>${publicHtml(ZOO_VISUAL_GUIDE_TITLE)}</h1>
    <div class="meta">${publicHtml(POLICY.design?.zooVisualSurfaceLabel || 'Visual Demo Surface')} · generated ${publicHtml(generated)} · captured ${publicHtml(capturedAt)}</div>
  </header>
  <main>
    <section class="intro">
      <div class="panel">
        <h2>Captured From Real /design Routes</h2>
        <p>This page is the deployable visual guide for the dev-only component gym. Screenshots are captured from real Nexus components rendered by <code>${publicHtml(DESIGN_ZOO_ROUTE_PATH)}</code>, and coverage is driven by <code>${publicHtml(DESIGN_REGISTRY_PATH)}</code>.</p>
        <p>Production <code>${publicHtml(PRODUCTION_DESIGN_PATH)}</code> is intentionally not mounted. Use this guide at <code>${publicHtml(PUBLIC_ZOO_GUIDE_URL)}</code> for deployed visual inspection, and run the local web dev server to open <code>${publicHtml(DESIGN_ROUTE)}</code> for live interaction.</p>
        <p><strong>Visual Contexts:</strong> ${publicHtml(contextSummary || 'not captured')}</p>
        <p><a href="../">Back to workflow guide</a></p>
      </div>
      <div class="stats">
        <div class="stat"><span class="meta">Visual captures</span><strong>${manifestTargets.length}</strong></div>
        <div class="stat"><span class="meta">Contexts</span><strong>${contexts.length}</strong></div>
        <div class="stat"><span class="meta">Foundations</span><strong>3</strong></div>
        <div class="stat"><span class="meta">Components</span><strong>${Math.max(entries.length - 3, 0)}</strong></div>
      </div>
    </section>
    <section>
      <h2>Theme Matrix</h2>
      <div class="panel callout">
        <p>The <code>themes</code> capture is the high-signal parity view: every cuisine theme renders real Button, Badge, Card, palette, radius, and typography tokens side by side.</p>
      </div>
    </section>
    ${contextSections}
  </main>
</body>
</html>`;
  const outPath = join(ZOO_GUIDE_DIR, 'index.html');
  writeFileSync(outPath, injectGuideContentHash(html));
  writeFileSync(ZOO_GUIDE_MANIFEST, `${JSON.stringify(publicZooManifest(manifest), null, 2)}\n`);
  if (!args.quiet) console.log(`Zoo visual guide generated: ${relative(ROOT, outPath).replaceAll('\\', '/')}`);
}

function commandZooVisualGuideCheck({ quiet = false } = {}) {
  const problems = zooVisualGuideProblems();
  if (!quiet) {
    console.log(`zoo visual guide problems: ${problems.length}`);
    for (const problem of problems) console.log(`- ${problem}`);
  }
  return problems.length === 0;
}

function inventoryPolicy() {
  return POLICY.files?.inventory || {};
}

function pathExtension(file) {
  const name = String(file || '').replaceAll('\\', '/').split('/').pop() || '';
  const index = name.lastIndexOf('.');
  return index > 0 ? name.slice(index).toLowerCase() : '';
}

function pathHasExtension(file, extensions = []) {
  const allowed = new Set((extensions || []).map((ext) => String(ext).toLowerCase()));
  return allowed.has(pathExtension(file));
}

function inventoryDurableFiles() {
  const inventory = inventoryPolicy();
  const runtimeDirs = inventory.runtimeDirectories || ['.codex/workflow/state/', '.codex/workflow/runtime/'];
  const runtimeAllow = new Set(inventory.runtimeTrackedAllowlist || ['.codex/workflow/state/.gitignore', '.codex/workflow/runtime/.gitignore']);
  return listAllFilesUnder(inventory.root || '.codex')
    .filter((file) => runtimeAllow.has(file) || !runtimeDirs.some((dir) => workflowPathMatchesPattern(file, dir)));
}

function inventoryProblems(options = {}) {
  const inventory = inventoryPolicy();
  const allowedRootFiles = inventory.allowedRootFiles || ['.codex/README.md', '.codex/config.toml', '.codex/hooks.json'];
  const allowedRootDirectories = inventory.allowedRootDirectories || [
    '.codex/agents/',
    '.codex/archive/',
    '.codex/dashboard/',
    '.codex/knowledge/',
    '.codex/scripts/',
    '.codex/workflow/',
  ];
  const runtimeDirs = inventory.runtimeDirectories || ['.codex/workflow/state/', '.codex/workflow/runtime/'];
  const runtimeAllow = new Set(inventory.runtimeTrackedAllowlist || ['.codex/workflow/state/.gitignore', '.codex/workflow/runtime/.gitignore']);
  const allowedArtifactDirectories = inventory.allowedArtifactDirectories || [
    '.codex/workflow/artifacts/screenshots/guide-browser-final/',
    '.codex/workflow/artifacts/screenshots/server-final/',
    '.codex/workflow/artifacts/screenshots/visual-zoo-guide/',
  ];
  const allowedArtifactExtensions = inventory.allowedArtifactExtensions || ['.jpg', '.jpeg', '.png', '.json'];
  const workflowRootFiles = inventory.workflowRootFiles || [
    '.codex/workflow/current-state.md',
    '.codex/workflow/dependency-audit-baseline.json',
    '.codex/workflow/profile.json',
  ];
  const workflowRootDirectories = inventory.workflowRootDirectories || [
    '.codex/workflow/artifacts/',
    '.codex/workflow/briefs/',
    '.codex/workflow/policy/',
    '.codex/workflow/records/',
    '.codex/workflow/research/',
    '.codex/workflow/runtime/',
    '.codex/workflow/scenarios/',
    '.codex/workflow/state/',
    '.codex/workflow/templates/',
  ];
  const scriptExtensions = inventory.scriptExtensions || ['.mjs'];
  const agentExtensions = inventory.agentExtensions || ['.toml'];
  const knowledgeExtensions = inventory.knowledgeExtensions || ['.md'];
  const templateExtensions = inventory.templateExtensions || ['.md'];
  const researchExtensions = inventory.researchExtensions || ['.md'];
  const briefExtensions = inventory.briefExtensions || ['.md'];
  const scenarioFiles = new Set(inventory.scenarioFiles || ['.codex/workflow/scenarios/model-routing.json']);
  const files = options.files || inventoryDurableFiles();
  const tracked = options.tracked || gitTrackedFiles('.codex');
  const checked = sortedStringSet([...files, ...tracked.filter((file) => file.startsWith('.codex/'))]);
  const required = requiredWorkflowFiles();
  const requiredSet = new Set(required);
  const problems = [];
  for (const file of checked) {
    const allowedRoot = allowedRootFiles.includes(file) || allowedRootDirectories.some((dir) => workflowPathMatchesPattern(file, dir));
    if (!allowedRoot) problems.push(`${file} is under .codex but outside the allowed workflow roots.`);
    const inRuntime = runtimeDirs.some((dir) => workflowPathMatchesPattern(file, dir));
    if (inRuntime && !runtimeAllow.has(file)) problems.push(`${file} is mutable runtime/state data and must not be durable workflow inventory.`);
    if (file.includes('/.claude/') && !file.startsWith('.codex/archive/')) problems.push(`${file} contains active Claude Code material outside the archive.`);
    if (file.endsWith('/CLAUDE.md') && !file.startsWith('.codex/archive/')) problems.push(`${file} is an active Claude instruction file; Codex guidance belongs in AGENTS.md/.codex.`);
    if (file.startsWith('.codex/scripts/')) {
      if (!pathHasExtension(file, scriptExtensions)) problems.push(`${file} is under .codex/scripts but does not use an approved workflow script extension.`);
      if (!requiredSet.has(file)) problems.push(`${file} is a workflow script but is missing from requiredWorkflowFiles.`);
    }
    if (file.startsWith('.codex/agents/')) {
      if (!pathHasExtension(file, agentExtensions)) problems.push(`${file} is under .codex/agents but does not use an approved agent config extension.`);
      if (!requiredSet.has(file)) problems.push(`${file} is a Codex agent config but is missing from requiredWorkflowFiles.`);
    }
    if (file.startsWith('.codex/knowledge/')) {
      if (!pathHasExtension(file, knowledgeExtensions)) problems.push(`${file} is under .codex/knowledge but does not use an approved knowledge extension.`);
      if (!requiredSet.has(file)) problems.push(`${file} is workflow knowledge but is missing from requiredWorkflowFiles.`);
    }
    if (file.startsWith('.codex/workflow/')) {
      const isWorkflowRootFile = !file.slice('.codex/workflow/'.length).includes('/');
      if (isWorkflowRootFile && !workflowRootFiles.includes(file)) problems.push(`${file} is an unmanaged .codex/workflow root file.`);
      if (!isWorkflowRootFile && !workflowRootDirectories.some((dir) => workflowPathMatchesPattern(file, dir))) {
        problems.push(`${file} is under .codex/workflow but outside approved workflow subdirectories.`);
      }
    }
    if (file.startsWith('.codex/workflow/artifacts/') && !allowedArtifactDirectories.some((dir) => workflowPathMatchesPattern(file, dir))) {
      problems.push(`${file} is an unmanaged workflow artifact; move it under a policy-approved evidence directory or remove it.`);
    }
    if (file.startsWith('.codex/workflow/artifacts/') && !pathHasExtension(file, allowedArtifactExtensions)) {
      problems.push(`${file} is a workflow artifact with an unapproved extension.`);
    }
    if (file.startsWith('.codex/workflow/policy/')) {
      const expected = new Set(['.codex/workflow/policy/manifest.json', ...LOADED_POLICY_NAMES.map((name) => `.codex/workflow/policy/${name}.json`)]);
      if (!expected.has(file)) problems.push(`${file} is an unregistered policy file; add it to .codex/workflow/policy/manifest.json or remove it.`);
    }
    if (file.startsWith('.codex/workflow/records/')) {
      const parts = file.split('/');
      const kind = parts[3];
      if (file !== '.codex/workflow/records/risks.md' && !RECORD_KINDS.includes(kind)) problems.push(`${file} is under an unknown record kind.`);
      if (file !== '.codex/workflow/records/risks.md' && !file.endsWith('.md') && !file.endsWith('/.gitkeep')) problems.push(`${file} is a record file but is not markdown.`);
    }
    if (file.startsWith('.codex/workflow/templates/')) {
      if (!pathHasExtension(file, templateExtensions)) problems.push(`${file} is under .codex/workflow/templates but does not use an approved template extension.`);
      if (!requiredSet.has(file)) problems.push(`${file} is a workflow template but is missing from requiredWorkflowFiles.`);
    }
    if (file.startsWith('.codex/workflow/research/') && !pathHasExtension(file, researchExtensions)) problems.push(`${file} is under .codex/workflow/research but does not use an approved research extension.`);
    if (file.startsWith('.codex/workflow/briefs/') && !pathHasExtension(file, briefExtensions)) problems.push(`${file} is under .codex/workflow/briefs but does not use an approved brief extension.`);
    if (file.startsWith('.codex/workflow/scenarios/') && !scenarioFiles.has(file)) problems.push(`${file} is an unregistered workflow scenario file.`);
    if (file === '.codex/dashboard/README.md' && !requiredSet.has(file)) problems.push(`${file} is durable folder guidance but is missing from requiredWorkflowFiles.`);
  }
  for (const file of tracked) {
    const inRuntime = runtimeDirs.some((dir) => workflowPathMatchesPattern(file, dir));
    if (inRuntime && !runtimeAllow.has(file)) problems.push(`${file} is tracked mutable runtime/state data.`);
  }
  const activeClaude = gitTrackedFiles().filter((file) => (file === 'CLAUDE.md' || file.startsWith('.claude/') || file.includes('/.claude/')) && !file.startsWith('.codex/archive/'));
  for (const file of activeClaude) problems.push(`${file} is active Claude Code material; archive it under .codex/archive/.`);
  return [...new Set(problems)].sort();
}

function commandInventoryCheck({ quiet = false } = {}) {
  const files = inventoryDurableFiles();
  const problems = inventoryProblems({ files });
  if (!quiet) {
    console.log(`codex inventory files: ${files.length}`);
    console.log(`codex inventory problems: ${problems.length}`);
    for (const problem of problems) console.log(`- ${problem}`);
  }
  return problems.length === 0;
}

function packageWorkflowScripts(packagePath = join(ROOT, 'package.json')) {
  return loadJson(packagePath, {}).scripts || {};
}

function packageScriptContractProblems(options = {}) {
  const scripts = options.scripts || packageWorkflowScripts(options.packagePath || join(ROOT, 'package.json'));
  const expected = options.expected || POLICY.gates?.packageScripts || {};
  const problems = [];
  if (!Object.keys(expected).length) {
    problems.push('.codex/workflow/policy/gates.json packageScripts must pin workflow script command bodies.');
    return problems;
  }
  for (const [name, command] of Object.entries(expected)) {
    if (scripts[name] !== command) problems.push(`package.json script ${name} must be exactly "${command}", got "${scripts[name] || '(missing)'}".`);
  }
  return problems;
}

function ciWorkflowContractProblems(options = {}) {
  const expected = options.expected || POLICY.gates?.ciWorkflowCommands || [];
  const problems = [];
  if (!Array.isArray(expected) || !expected.length) {
    problems.push('.codex/workflow/policy/gates.json ciWorkflowCommands must pin CI gate commands.');
    return problems;
  }
  const ciText = options.text ?? readText('.github/workflows/nexus-workflow-gates.yml');
  const runCommands = ciRunCommands(ciText);
  for (const command of expected) {
    if (!runCommands.includes(command)) problems.push(`CI workflow does not contain expected command: ${command}.`);
  }
  return problems;
}

function ciRunCommands(text = '') {
  return String(text).split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith('run:'))
    .map((line) => line.slice(4).trim())
    .map((value) => value.replace(/^['"]|['"]$/g, ''));
}

function inventoryPolicyContractProblems() {
  const inventory = POLICY.files?.inventory || {};
  const problems = [];
  const arrayFields = [
    'allowedRootFiles',
    'allowedRootDirectories',
    'runtimeDirectories',
    'runtimeTrackedAllowlist',
    'allowedArtifactDirectories',
    'allowedArtifactExtensions',
    'workflowRootFiles',
    'workflowRootDirectories',
    'scriptExtensions',
    'agentExtensions',
    'knowledgeExtensions',
    'templateExtensions',
    'researchExtensions',
    'briefExtensions',
    'scenarioFiles',
  ];
  if (inventory.root !== '.codex') problems.push('files policy inventory.root must be .codex.');
  for (const field of arrayFields) {
    if (!Array.isArray(inventory[field]) || !inventory[field].length) problems.push(`files policy inventory.${field} must be a non-empty array.`);
  }
  return problems;
}

function requiredWorkflowFileProblems(required = requiredWorkflowFiles()) {
  const problems = [];
  const seen = new Set();
  for (const file of required) {
    if (seen.has(file)) problems.push(`requiredWorkflowFiles contains duplicate path: ${file}.`);
    seen.add(file);
    if (!existsSync(join(ROOT, file))) problems.push(`required workflow file is missing: ${file}.`);
  }
  return problems;
}

function policyClassifierTestCases() {
  return POLICY.files?.classifierTestCases || [];
}

function policyClassifierProblems(cases = policyClassifierTestCases()) {
  if (!Array.isArray(cases) || !cases.length) return ['.codex/workflow/policy/files.json classifierTestCases must contain policy-owned classifier fixtures.'];
  const checks = {
    substantive: (file) => substantiveFiles([file]).includes(file),
    verification: (file) => verificationRelevantFiles([file]).includes(file),
    audit: (file) => auditRelevantFiles([file]).includes(file),
    guide: (file) => guideRelevantFiles([file]).includes(file),
    zooVisual: (file) => zooVisualRelevantFiles([file]).includes(file),
  };
  const problems = [];
  for (const testCase of cases) {
    for (const [name, fn] of Object.entries(checks)) {
      if (!Object.hasOwn(testCase, name)) continue;
      const actual = fn(testCase.file);
      if (actual !== testCase[name]) problems.push(`${name} classifier mismatch for ${testCase.file}: expected ${testCase[name]}, got ${actual}.`);
    }
  }
  return problems;
}

function profileContractProblems(profile = PROFILE) {
  const problems = [];
  if (profile.schema !== 'codex-workflow-profile/v1') problems.push('.codex/workflow/profile.json must use schema codex-workflow-profile/v1.');
  if (!profile.projectId || typeof profile.projectId !== 'string') problems.push('.codex/workflow/profile.json must define projectId.');
  if (!profile.displayName || typeof profile.displayName !== 'string') problems.push('.codex/workflow/profile.json must define displayName.');
  if (profile.codexRoot !== '.codex') problems.push('.codex/workflow/profile.json must set codexRoot to .codex.');
  const paths = profile.paths || {};
  const requiredPaths = [
    'dashboardDir',
    'zooGuideDir',
    'zooGuideManifest',
    'routingScenarios',
    'records',
    'state',
    'runtime',
    'currentState',
    'risks',
    'knowledgeDir',
    'agentsDir',
    'workflowWrapper',
    'hookDispatcher',
    'guideBrowserFinalArtifacts',
  ];
  for (const key of requiredPaths) {
    const value = paths[key];
    if (!value || typeof value !== 'string') {
      problems.push(`.codex/workflow/profile.json paths.${key} must be a string.`);
      continue;
    }
    const normalized = value.replaceAll('\\', '/');
    if (!normalized.startsWith('.codex/')) problems.push(`.codex/workflow/profile.json paths.${key} must stay under .codex/.`);
    if (normalized.includes('../') || normalized.includes('/..')) problems.push(`.codex/workflow/profile.json paths.${key} must not escape the project root.`);
  }
  for (const key of ['dashboardDir', 'zooGuideDir', 'records', 'state', 'runtime', 'knowledgeDir', 'agentsDir', 'guideBrowserFinalArtifacts']) {
    const value = paths[key];
    if (value && !existsSync(resolveProjectPath(value))) problems.push(`.codex/workflow/profile.json paths.${key} points to a missing directory: ${value}.`);
  }
  for (const key of ['zooGuideManifest', 'routingScenarios', 'currentState', 'risks', 'workflowWrapper', 'hookDispatcher']) {
    const value = paths[key];
    if (value && !existsSync(resolveProjectPath(value))) problems.push(`.codex/workflow/profile.json paths.${key} points to a missing file: ${value}.`);
  }
  for (const [key, value] of Object.entries(profile.env || {})) {
    if (!/^[A-Z][A-Z0-9_]*$/.test(String(value || ''))) problems.push(`.codex/workflow/profile.json env.${key} must be an uppercase environment variable name.`);
  }
  for (const key of ['webUrl', 'publicWorkflowUrl', 'zooCaptureTheme', 'zooCaptureMode']) {
    const value = profile.env?.[key];
    if (!value || typeof value !== 'string') problems.push(`.codex/workflow/profile.json env.${key} must be configured.`);
  }
  return problems;
}

function configAgentBlocks(configText = readText('.codex/config.toml')) {
  const agents = [];
  let current = null;
  for (const line of configText.split(/\r?\n/)) {
    const section = line.match(/^\s*\[([^\]]+)\]\s*$/);
    if (section) {
      current = null;
      const agent = section[1].match(/^agents\.([A-Za-z0-9_-]+)$/);
      if (agent) {
        current = { name: agent[1], configFile: '' };
        agents.push(current);
      }
      continue;
    }
    if (!current) continue;
    const configFile = line.match(/^\s*config_file\s*=\s*"([^"]+)"\s*$/);
    if (configFile) current.configFile = configFile[1];
  }
  return agents;
}

function configAgentProblems(configText = readText('.codex/config.toml'), required = requiredWorkflowFiles()) {
  const problems = [];
  const requiredSet = new Set(required);
  const requiredAgentConfigs = required.filter((file) => file.startsWith('.codex/agents/') && file.endsWith('.toml'));
  const declared = new Set();
  const agents = configAgentBlocks(configText);
  if (!agents.length) problems.push('.codex/config.toml has no [agents.<name>] config_file entries.');
  for (const agent of agents) {
    if (!agent.configFile) {
      problems.push(`.codex/config.toml agent ${agent.name} has no config_file.`);
      continue;
    }
    const normalized = agent.configFile.replaceAll('\\', '/');
    if (!normalized.startsWith('agents/')) problems.push(`.codex/config.toml agent ${agent.name} config_file must be relative to .codex/agents/.`);
    if (normalized.includes('../') || normalized.includes('/..')) problems.push(`.codex/config.toml agent ${agent.name} config_file must not escape .codex/.`);
    const full = `.codex/${normalized}`;
    declared.add(full);
    if (!existsSync(join(CODEX, normalized))) problems.push(`.codex/config.toml agent ${agent.name} points to missing ${full}.`);
    if (!requiredSet.has(full)) problems.push(`.codex/config.toml agent ${agent.name} points to ${full}, which is missing from requiredWorkflowFiles.`);
  }
  for (const file of requiredAgentConfigs) {
    if (!declared.has(file)) problems.push(`${file} is required but not referenced by .codex/config.toml agents.`);
  }
  return problems;
}

function policyProblems() {
  const problems = [];
  const manifestNames = Array.isArray(POLICY.manifest?.policyNames) && POLICY.manifest.policyNames.length
    ? POLICY.manifest.policyNames.map(String)
    : LOADED_POLICY_NAMES;
  const policyNames = new Set(LOADED_POLICY_NAMES);
  if (POLICY.manifest?.schema !== 'codex-workflow-policy-manifest/v1') problems.push('.codex/workflow/policy/manifest.json must use schema codex-workflow-policy-manifest/v1.');
  if (!sameStringSet(manifestNames, LOADED_POLICY_NAMES)) problems.push('.codex/workflow/policy/manifest.json policyNames must match the loaded workflow policy names.');
  for (const name of manifestNames) {
    const path = `.codex/workflow/policy/${name}.json`;
    if (!existsSync(join(ROOT, path))) problems.push(`missing manifest policy file: ${path}.`);
    if (!POLICY[name]?.schema) problems.push(`policy ${name} has no schema field.`);
  }
  for (const kind of RECORD_KINDS) {
    if (!POLICY.records?.schemaByKind?.[kind]) problems.push(`records policy schemaByKind.${kind} is missing.`);
    if (!POLICY.records?.prefixByKind?.[kind]) problems.push(`records policy prefixByKind.${kind} is missing.`);
  }
  for (const file of listAllFilesUnder('.codex/workflow/policy')) {
    const name = file.match(/\.codex\/workflow\/policy\/(.+)\.json$/)?.[1];
    if (name === 'manifest') continue;
    if (!name || !policyNames.has(name)) problems.push(`${file} is not loaded by .codex/workflow/policy/manifest.json.`);
  }
  problems.push(...requiredWorkflowFileProblems());
  problems.push(...policyClassifierProblems());
  problems.push(...profileContractProblems());
  problems.push(...inventoryPolicyContractProblems());
  problems.push(...packageScriptContractProblems());
  problems.push(...ciWorkflowContractProblems());
  const scripts = packageWorkflowScripts();
  for (const script of [...canonicalLadder(), 'workflow:policy-check', 'workflow:inventory-check', 'workflow:trace-check', 'workflow:work-intake-check']) {
    if (!scripts[script]) problems.push(`package.json is missing ${script}.`);
  }
  const ladderMentionFiles = POLICY.guide?.ladderMentionFiles || [];
  if (!Array.isArray(ladderMentionFiles) || !ladderMentionFiles.length) {
    problems.push('.codex/workflow/policy/guide.json ladderMentionFiles must be a non-empty array.');
  }
  for (const doc of ladderMentionFiles) {
    const text = readText(doc);
    for (const script of canonicalLadder()) {
      if (!text.includes(script)) problems.push(`${doc} does not mention canonical ladder item ${script}.`);
    }
  }
  const inputs = publicGuideInputFiles();
  for (const file of requiredGuideSourceFiles()) {
    if (!inputs.includes(file)) problems.push(`${file} is not part of public guide source hash inputs.`);
  }
  if (!requiredGuideSourceFiles().length) problems.push('.codex/workflow/policy/guide.json must define requiredSourceFiles.');
  for (const key of ['version', 'sourceHash', 'recordFeedHash', 'contentHash', 'tokenSource']) {
    if (!POLICY.guide?.metaNames?.[key]) problems.push(`.codex/workflow/policy/guide.json metaNames.${key} is required.`);
  }
  for (const key of ['dashboard', 'public']) {
    if (!POLICY.guide?.titles?.[key]) problems.push(`.codex/workflow/policy/guide.json titles.${key} is required.`);
  }
  for (const key of ['repository', 'webApp', 'designSystem', 'designFlow', 'workflow']) {
    if (!Array.isArray(POLICY.guide?.viewGraphs?.[key]?.nodes) || !POLICY.guide.viewGraphs[key].nodes.length) {
      problems.push(`.codex/workflow/policy/guide.json viewGraphs.${key}.nodes is required.`);
    }
  }
  if (!guideDocumentFiles().length) problems.push('.codex/workflow/policy/guide.json documentFiles/documentDirectories did not resolve any project documents.');
  const dashboardSections = dashboardKnowledgeSections();
  if (!dashboardSections.length) problems.push('.codex/workflow/policy/guide.json dashboardKnowledgeSections must resolve at least one section.');
  for (const section of dashboardSections) {
    if (!existsSync(join(ROOT, section.file))) problems.push(`dashboard knowledge section ${section.id} points to missing ${section.file}.`);
  }
  if (!guideResumeReadDocs().length) problems.push('.codex/workflow/policy/guide.json resume.readDocs must be a non-empty array.');
  if (!guideResumePolicy().permissionAdvice) problems.push('.codex/workflow/policy/guide.json resume.permissionAdvice must be configured.');
  if (!guideBranchCloseoutCommands().length) problems.push('.codex/workflow/policy/guide.json resume.branchCloseoutCommands must be a non-empty array.');
  if (!guideSessionStartReadDocs().length) problems.push('.codex/workflow/policy/guide.json sessionStart.readDocs must be a non-empty array.');
  if (!guideSessionStartPolicy().statusCommand) problems.push('.codex/workflow/policy/guide.json sessionStart.statusCommand must be configured.');
  if (!POLICY.deployment?.publicAppUrl) problems.push('.codex/workflow/policy/deployment.json must define publicAppUrl.');
  if (!POLICY.deployment?.apiHealthUrl) problems.push('.codex/workflow/policy/deployment.json must define apiHealthUrl.');
  if (!POLICY.deployment?.publicAssetPrefix) problems.push('.codex/workflow/policy/deployment.json must define publicAssetPrefix.');
  if (!POLICY.deployment?.publicGuideUrl) problems.push('.codex/workflow/policy/deployment.json must define publicGuideUrl.');
  if (!POLICY.deployment?.visualZooGuideUrl) problems.push('.codex/workflow/policy/deployment.json must define visualZooGuideUrl.');
  if (!POLICY.design?.localWebUrl) problems.push('.codex/workflow/policy/design.json must define localWebUrl for generated local Zoo links.');
  if (!POLICY.design?.designRoute) problems.push('.codex/workflow/policy/design.json must define designRoute for generated local Zoo links.');
  if (!POLICY.design?.productionDesignPath) problems.push('.codex/workflow/policy/design.json must define productionDesignPath for generated deployed-Zoo guidance.');
  if (!POLICY.design?.zooVisualManifestSchema) problems.push('.codex/workflow/policy/design.json zooVisualManifestSchema is required.');
  if (!POLICY.design?.zooVisualSurfaceLabel) problems.push('.codex/workflow/policy/design.json zooVisualSurfaceLabel is required.');
  if (!Number.isFinite(Number(POLICY.design?.zooVisualMinImages)) || Number(POLICY.design?.zooVisualMinImages) <= 0) problems.push('.codex/workflow/policy/design.json zooVisualMinImages must be a positive number.');
  if (!POLICY.design?.zooVisualCapture?.defaultTheme) problems.push('.codex/workflow/policy/design.json zooVisualCapture.defaultTheme is required.');
  if (!POLICY.design?.zooVisualCapture?.waitForText) problems.push('.codex/workflow/policy/design.json zooVisualCapture.waitForText is required.');
  if (!Array.isArray(POLICY.design?.zooVisualCapture?.contexts) || !POLICY.design.zooVisualCapture.contexts.length) problems.push('.codex/workflow/policy/design.json zooVisualCapture.contexts must be a non-empty array.');
  const allowedGuideUrls = new Set([PUBLIC_GUIDE_URL, PUBLIC_ZOO_GUIDE_URL]);
  for (const doc of ['WORKFLOW.md', '.codex/README.md', '.codex/knowledge/deployment.md']) {
    const text = readText(doc);
    const urls = [...text.matchAll(/https:\/\/[^\s`)]+\/[^\s`)]*workflow\/(?:zoo\/)?/g)].map((match) => match[0]);
    for (const url of urls) {
      if (!allowedGuideUrls.has(url)) problems.push(`${doc} contains workflow guide URL ${url}, which does not match deployment policy.`);
    }
  }
  if (!sameStringSet(canonicalLadder(), POLICY.gates?.canonicalLadder || [])) problems.push('canonical ladder must come from .codex/workflow/policy/gates.json.');
  for (const key of ['validRoutes', 'strongSignals', 'sparkPositiveSignals']) {
    if (!Array.isArray(POLICY.routing?.[key]) || !POLICY.routing[key].length) problems.push(`.codex/workflow/policy/routing.json ${key} must be a non-empty array.`);
  }
  if (!Array.isArray(POLICY.routing?.leadAliases) || !POLICY.routing.leadAliases.length) problems.push('.codex/workflow/policy/routing.json leadAliases must be a non-empty array.');
  if (!POLICY.routing?.routeAliases || typeof POLICY.routing.routeAliases !== 'object') problems.push('.codex/workflow/policy/routing.json routeAliases must map compatibility route names to canonical routes.');
  if (!POLICY.routing?.defaultWorkers || typeof POLICY.routing.defaultWorkers !== 'object') problems.push('.codex/workflow/policy/routing.json defaultWorkers must map route names to worker ids.');
  for (const route of POLICY.routing?.validRoutes || []) {
    if (!POLICY.routing?.defaultWorkers?.[route]) problems.push(`.codex/workflow/policy/routing.json defaultWorkers.${route} is required.`);
  }
  if (!Array.isArray(INTAKE_POLICY.sourceTypes) || !INTAKE_POLICY.sourceTypes.length) problems.push('.codex/workflow/policy/intake.json sourceTypes must be a non-empty array.');
  if (!Array.isArray(INTAKE_POLICY.evidenceKinds) || !INTAKE_POLICY.evidenceKinds.length) problems.push('.codex/workflow/policy/intake.json evidenceKinds must be a non-empty array.');
  const unknownTraceEvidenceKinds = (INTAKE_POLICY.guide?.traceEvidenceKinds || []).filter((kind) => !WORK_INTAKE_EVIDENCE_KINDS.includes(String(kind)));
  for (const kind of unknownTraceEvidenceKinds) problems.push(`.codex/workflow/policy/intake.json guide.traceEvidenceKinds contains unknown evidence kind ${kind}.`);
  if (!Array.isArray(INTAKE_POLICY.guide?.selfReferentialEvidenceKinds) || !INTAKE_POLICY.guide.selfReferentialEvidenceKinds.length) {
    problems.push('.codex/workflow/policy/intake.json guide.selfReferentialEvidenceKinds must be a non-empty array.');
  }
  const selfReferentialKinds = [...selfReferentialEvidenceKinds()];
  for (const kind of (INTAKE_POLICY.guide?.selfReferentialEvidenceKinds || [])) {
    if (!WORK_INTAKE_EVIDENCE_KINDS.includes(String(kind))) problems.push(`.codex/workflow/policy/intake.json guide.selfReferentialEvidenceKinds contains unknown evidence kind ${kind}.`);
  }
  const traceKinds = new Set((INTAKE_POLICY.guide?.traceEvidenceKinds || []).map(String));
  for (const kind of selfReferentialKinds) {
    if (traceKinds.has(kind)) {
      problems.push(`.codex/workflow/policy/intake.json guide.traceEvidenceKinds must not include self-referential evidence kind ${kind}.`);
    }
  }
  const excludedFeedKinds = (POLICY.guide?.recordFeedExcludeKinds || []).filter((kind) => WORK_INTAKE_EVIDENCE_KINDS.includes(String(kind)));
  for (const kind of excludedFeedKinds) {
    if (!selfReferentialKinds.includes(String(kind))) {
      problems.push(`.codex/workflow/policy/guide.json excludes ${kind} from the guide record feed, so intake policy must list it under guide.selfReferentialEvidenceKinds.`);
    }
  }
  if (!Array.isArray(POLICY.guide?.displayOnlyRecordKinds)) problems.push('.codex/workflow/policy/guide.json displayOnlyRecordKinds must be an array.');
  for (const kind of POLICY.guide?.displayOnlyRecordKinds || []) {
    if (!GUIDE_RECORD_KINDS.includes(String(kind))) problems.push(`.codex/workflow/policy/guide.json displayOnlyRecordKinds contains unknown guide record kind ${kind}.`);
  }
  if ((POLICY.guide?.displayOnlyRecordKinds || []).length && !POLICY.guide?.displayOnlyRecordNotice) {
    problems.push('.codex/workflow/policy/guide.json displayOnlyRecordNotice is required when displayOnlyRecordKinds is non-empty.');
  }
  const evidencePolicy = POLICY.gates?.evidence || {};
  const commandClasses = evidencePolicy.commandClasses || {};
  if (!Object.keys(commandClasses).length) problems.push('.codex/workflow/policy/gates.json evidence.commandClasses must define command classes.');
  for (const [className, commandClass] of Object.entries(commandClasses)) {
    if (!Array.isArray(commandClass.npmScripts) || !commandClass.npmScripts.length) {
      problems.push(`.codex/workflow/policy/gates.json evidence.commandClasses.${className} must use exact npmScripts instead of substring command matching.`);
    }
  }
  for (const key of ['verificationRules', 'auditRules']) {
    if (!Array.isArray(evidencePolicy[key]) || !evidencePolicy[key].length) {
      problems.push(`.codex/workflow/policy/gates.json evidence.${key} must be a non-empty array.`);
      continue;
    }
    for (const rule of evidencePolicy[key]) {
      if (!rule.name) problems.push(`.codex/workflow/policy/gates.json evidence.${key} has a rule without name.`);
      if (!Array.isArray(rule.classes) || !rule.classes.length) problems.push(`.codex/workflow/policy/gates.json evidence.${key}.${rule.name || '(unnamed)'} has no classes.`);
      for (const className of rule.classes || []) {
        if (!commandClasses[className]) problems.push(`.codex/workflow/policy/gates.json evidence.${key}.${rule.name || '(unnamed)'} references unknown command class ${className}.`);
      }
    }
  }
  const verificationRulesByName = new Map((evidencePolicy.verificationRules || []).map((rule) => [String(rule.name || ''), rule]));
  const auditRulesByName = new Map((evidencePolicy.auditRules || []).map((rule) => [String(rule.name || ''), rule]));
  for (const ruleName of evidencePolicy.auditMirrorsVerificationRules || []) {
    const verificationRule = verificationRulesByName.get(String(ruleName));
    const auditRule = auditRulesByName.get(String(ruleName));
    if (!verificationRule) {
      problems.push(`.codex/workflow/policy/gates.json evidence.auditMirrorsVerificationRules references missing verification rule ${ruleName}.`);
      continue;
    }
    if (!auditRule) {
      problems.push(`.codex/workflow/policy/gates.json evidence.auditRules must include ${ruleName} because auditMirrorsVerificationRules requires it.`);
      continue;
    }
    for (const className of verificationRule.classes || []) {
      if (!(auditRule.classes || []).includes(className)) {
        problems.push(`.codex/workflow/policy/gates.json evidence.auditRules.${ruleName} must include verification class ${className}.`);
      }
    }
  }
  for (const className of POLICY.deployment?.requiredCommandClasses || []) {
    if (!commandClasses[className]) problems.push(`.codex/workflow/policy/deployment.json requiredCommandClasses references unknown command class ${className}.`);
  }
  if (!Array.isArray(POLICY.deployment?.allowedTargetPrefixes) || !POLICY.deployment.allowedTargetPrefixes.length) {
    problems.push('.codex/workflow/policy/deployment.json allowedTargetPrefixes must be a non-empty array.');
  }
  if (!Array.isArray(POLICY.deployment?.publicGuideRequiredStrings) || !POLICY.deployment.publicGuideRequiredStrings.length) {
    problems.push('.codex/workflow/policy/deployment.json publicGuideRequiredStrings must be a non-empty array.');
  }
  if (!Array.isArray(POLICY.deployment?.visualZooGuideRequiredStrings) || !POLICY.deployment.visualZooGuideRequiredStrings.length) {
    problems.push('.codex/workflow/policy/deployment.json visualZooGuideRequiredStrings must be a non-empty array.');
  }
  return [...new Set(problems)].sort();
}

function commandPolicyCheck({ quiet = false } = {}) {
  const problems = policyProblems();
  if (!quiet) {
    console.log(`workflow policy problems: ${problems.length}`);
    for (const problem of problems) console.log(`- ${problem}`);
  }
  return problems.length === 0;
}

function commandTraceProblems(options = {}) {
  const file = options.file || COMMAND_RUNS_FILE;
  const strict = Boolean(options.strict);
  const problems = [];
  if (!existsSync(file)) return problems;
  const lines = readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean);
  const latest = new Map();
  for (let index = 0; index < lines.length; index++) {
    let run;
    try {
      run = JSON.parse(lines[index]);
    } catch (error) {
      problems.push(`command telemetry line ${index + 1} is not valid JSON: ${error.message}.`);
      continue;
    }
    latest.set(run.id || `line-${index + 1}`, run);
    for (const field of ['id', 'command', 'cwd', 'startedAt', 'endedAt', 'durationMs', 'timeoutMs', 'warnMs', 'exitCode', 'timedOut', 'warned']) {
      if (!Object.hasOwn(run, field)) problems.push(`command telemetry ${run.id || `line ${index + 1}`} is missing ${field}.`);
    }
    if (!Array.isArray(run.command) || !run.command.length) problems.push(`command telemetry ${run.id || `line ${index + 1}`} has no command array.`);
    if (!Number.isFinite(Number(run.durationMs)) || Number(run.durationMs) < 0) problems.push(`command telemetry ${run.id || `line ${index + 1}`} has invalid durationMs.`);
    if (!Number.isFinite(Number(run.timeoutMs)) || Number(run.timeoutMs) <= 0) problems.push(`command telemetry ${run.id || `line ${index + 1}`} has invalid timeoutMs.`);
    if (Boolean(run.timedOut) && Number(run.exitCode) !== 124) problems.push(`command telemetry ${run.id || `line ${index + 1}`} timed out but exitCode is not 124.`);
    if (Number(run.warnMs) > 0 && Boolean(run.warned) !== (Number(run.durationMs) > Number(run.warnMs))) problems.push(`command telemetry ${run.id || `line ${index + 1}`} warned flag does not match durationMs/warnMs.`);
  }
  if (strict) {
    for (const run of latest.values()) {
      if (Number(run.exitCode ?? 1) !== 0 || Boolean(run.timedOut)) problems.push(`latest command telemetry ${run.id || '(missing id)'} did not pass.`);
      if (Boolean(run.warned)) problems.push(`latest command telemetry ${run.id || '(missing id)'} exceeded its warn threshold.`);
    }
  }
  return problems;
}

function commandTraceAttentionRuns(runs = readCommandRuns(), limit = 5) {
  return [...runs]
    .filter((run) => run.warned || run.timedOut)
    .sort((a, b) => String(b.endedAt || b.startedAt || '').localeCompare(String(a.endedAt || a.startedAt || '')))
    .slice(0, limit);
}

function commandTraceAttentionLines(runs = readCommandRuns(), limit = 5) {
  return commandTraceAttentionRuns(runs, limit).map((run) => {
    const command = (Array.isArray(run.command) ? run.command : []).join(' ');
    return `${run.id || '(missing id)'}: timedOut=${Boolean(run.timedOut)}, warned=${Boolean(run.warned)}, durationMs=${Number(run.durationMs || 0)}, command=${command}`;
  });
}

function commandTraceCheck(args = {}) {
  const problems = commandTraceProblems({ strict: Boolean(args.strict) });
  const runs = readCommandRuns();
  const warned = runs.filter((run) => run.warned).length;
  const timedOut = runs.filter((run) => run.timedOut).length;
  const attention = commandTraceAttentionLines(runs, 5);
  if (!args.quiet) {
    console.log(`command trace runs: ${runs.length}`);
    console.log(`command trace warned: ${warned}`);
    console.log(`command trace timed out: ${timedOut}`);
    if (attention.length) {
      console.log('command trace recent attention:');
      for (const line of attention) console.log(`- ${line}`);
    }
    console.log(`command trace problems: ${problems.length}`);
    for (const problem of problems) console.log(`- ${problem}`);
  }
  return problems.length === 0;
}

function hookConfigProblems(configText = readText('.codex/config.toml')) {
  const problems = [];
  const config = configText;
  const hooks = loadJson(join(CODEX, 'hooks.json'), {});
  const hookPolicy = POLICY.hooks || {};
  const expectedConfig = hookPolicy.config || {};
  if (expectedConfig.sandbox_mode && tomlValueInSection(config, '', 'sandbox_mode') !== `"${expectedConfig.sandbox_mode}"`) problems.push(`.codex/config.toml should set sandbox_mode = "${expectedConfig.sandbox_mode}" for the project Custom profile.`);
  if (expectedConfig.approval_policy && tomlValueInSection(config, '', 'approval_policy') !== `"${expectedConfig.approval_policy}"`) problems.push(`.codex/config.toml should set approval_policy = "${expectedConfig.approval_policy}" so Custom(config.toml) does not prompt for shell approvals.`);
  for (const [deprecated, replacement] of Object.entries(expectedConfig.deprecatedFeatures || {})) {
    if (tomlHasKeyInSection(config, 'features', deprecated)) problems.push(`.codex/config.toml uses deprecated features.${deprecated}; use features.${replacement} instead.`);
  }
  for (const [feature, expected] of Object.entries(expectedConfig.features || {})) {
    if (expected && tomlBooleanInSection(config, 'features', feature) !== true) problems.push(`.codex/config.toml should enable features.${feature} = true.`);
  }
  problems.push(...configAgentProblems(config));
  const hookMap = hooks.hooks || {};
  const expectedHooks = hookPolicy.hooks || {};
  for (const event of Object.keys(expectedHooks)) {
    const expected = expectedHooks[event] || {};
    if (!Array.isArray(hookMap[event]) || hookMap[event].length === 0) problems.push(`.codex/hooks.json is missing ${event} hook entries.`);
    for (const entry of hookMap[event] || []) {
      if (Object.hasOwn(expected, 'matcher') && entry.matcher !== expected.matcher) {
        problems.push(`${event} matcher must be exactly "${expected.matcher}".`);
      }
      if (event === 'Stop' && Object.hasOwn(entry, 'matcher')) problems.push('Stop hook should not define a matcher.');
    }
    const eventHooks = (hookMap[event] || []).flatMap((entry) => entry.hooks || []);
    if (eventHooks.length !== 1) problems.push(`${event} should have exactly one thin command hook.`);
    for (const hook of eventHooks) {
      if (hook.type !== 'command') problems.push(`${event} hook must be type=command.`);
      if (hook.command !== expected.command) problems.push(`${event} hook command must be exactly "${expected.command}".`);
      if (String(hook.command || '').includes('-e') || /[;&|]/.test(String(hook.command || ''))) problems.push(`${event} hook command contains inline shell logic; use run-hook.mjs only.`);
      if (Number(hook.timeout || 0) > Number(expected.timeoutMaxSeconds || 30)) problems.push(`${event} hook timeout should stay at or below ${expected.timeoutMaxSeconds || 30} seconds.`);
    }
  }
  return problems;
}

function commandHookConfigCheck({ quiet = false } = {}) {
  const problems = hookConfigProblems();
  if (!quiet) {
    console.log(`hook config problems: ${problems.length}`);
    for (const problem of problems) console.log(`- ${problem}`);
  }
  return problems.length === 0;
}

function hookRuntimeDiagnostics(runtime, { maxAgeDays = 14, runtimePolicy = POLICY.hooks?.runtime || {} } = {}) {
  const problems = [];
  const warnings = [];
  if (!runtime.lastSeenAt) {
    problems.push('no hook runtime heartbeat recorded in this checkout; use trusted Custom (config.toml) for project hooks, and rely on explicit workflow gates when hooks are not loaded.');
    return { problems, warnings, recentEvents: new Set() };
  }
  const ageMs = Date.now() - Date.parse(runtime.lastSeenAt);
  if (!Number.isFinite(ageMs)) problems.push(`hook runtime heartbeat timestamp is invalid: ${runtime.lastSeenAt}.`);
  else if (ageMs > 1000 * 60 * 60 * 24 * maxAgeDays) problems.push(`hook runtime heartbeat is older than ${maxAgeDays} days: ${runtime.lastSeenAt}.`);
  const requiredEvents = Array.isArray(runtimePolicy.requiredEvents) ? runtimePolicy.requiredEvents : [];
  const diagnosticEvents = Array.isArray(runtimePolicy.diagnosticEvents) ? runtimePolicy.diagnosticEvents : ['session-start'];
  const recentEvents = new Set((runtime.events || [])
    .filter((event) => {
      const eventAgeMs = Date.now() - Date.parse(event.at || '');
      return Number.isFinite(eventAgeMs) && eventAgeMs <= 1000 * 60 * 60 * 24 * maxAgeDays;
    })
    .map((event) => event.event));
  for (const event of requiredEvents) {
    if (!recentEvents.has(event)) problems.push(`hook runtime heartbeat is partial; no recent ${event} event was recorded in this checkout.`);
  }
  for (const event of diagnosticEvents) {
    if (!recentEvents.has(event)) warnings.push(`hook runtime heartbeat is partial; no recent ${event} event was recorded in this checkout.`);
  }
  return { problems, warnings, recentEvents };
}

function hookRuntimeHealth({ maxAgeDays = 14 } = {}) {
  const runtime = loadJson(join(RUNTIME_DIR, 'hooks-state.json'), {});
  return { runtime, ...hookRuntimeDiagnostics(runtime, { maxAgeDays }) };
}

function hookRuntimeProblems({ maxAgeDays = 14 } = {}) {
  return hookRuntimeHealth({ maxAgeDays }).problems;
}

function hookRuntimeStatusLabel(health) {
  if (health.problems.length) return 'not seen';
  if (health.warnings.length) return 'seen (partial startup reminder)';
  return 'seen';
}

function commandHookRuntimeCheck({ quiet = false } = {}) {
  const health = hookRuntimeHealth();
  if (!quiet) {
    console.log(`hook runtime problems: ${health.problems.length}`);
    console.log(`hook runtime warnings: ${health.warnings.length}`);
    if (health.runtime.lastSeenAt) console.log(`last hook heartbeat: ${health.runtime.lastSeenAt} (${health.runtime.lastEvent || 'unknown'})`);
    for (const problem of health.problems) console.log(`- ${problem}`);
    for (const warning of health.warnings) console.log(`- warning: ${warning}`);
  }
  return health.problems.length === 0;
}

function commandDependencyAuditCheck({ quiet = false } = {}) {
  const auditArgs = [join(CODEX, 'scripts', 'audit-deps.mjs')];
  if (quiet) auditArgs.push('--quiet');
  const result = spawnSync(process.execPath, auditArgs, {
    cwd: ROOT,
    encoding: 'utf8',
    shell: false,
    timeout: 120000,
    maxBuffer: 10 * 1024 * 1024,
  });
  if (!quiet && result.stdout) process.stdout.write(result.stdout);
  if (!quiet && result.stderr) process.stderr.write(result.stderr);
  return result.status === 0;
}

function commandProductionZooBundleCheck({ quiet = false } = {}) {
  const result = spawnSync(process.execPath, [join(CODEX, 'scripts', 'check-production-zoo-bundle.mjs')], {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: 60000,
    maxBuffer: 10 * 1024 * 1024,
  });
  if (!quiet && result.stdout) process.stdout.write(result.stdout);
  if (!quiet && result.stderr) process.stderr.write(result.stderr);
  return result.status === 0;
}

function executableFor(command) {
  if (platform() !== 'win32') return command;
  if (/[\\/]/.test(command) || /\.[a-z0-9]+$/i.test(command)) return command;
  if (command === 'npm' || command === 'npx') return `${command}.cmd`;
  return command;
}

function textTail(value, max = 4000) {
  const text = String(value || '');
  return text.length > max ? text.slice(text.length - max) : text;
}

function runTimedCommand(commandArgs, options = {}) {
  const startedAt = nowIso();
  const startedMs = Date.now();
  const cwd = options.cwd ? resolve(ROOT, String(options.cwd)) : ROOT;
  const timeoutMs = Number(options.timeoutMs || 120000);
  const warnMs = Number(options.warnMs || Math.max(Math.floor(timeoutMs * 0.8), 1));
  const id = options.id || `command-${startedAt.replace(/[-:]/g, '').replace(/\..+/, 'Z')}`;
  const command = commandArgs[0];
  const args = commandArgs.slice(1);
  const executable = executableFor(command);
  const result = spawnSync(executable, args, {
    cwd,
    encoding: 'utf8',
    timeout: timeoutMs,
    maxBuffer: 10 * 1024 * 1024,
    shell: platform() === 'win32' && /\.(cmd|bat)$/i.test(executable),
  });
  const endedAt = nowIso();
  const durationMs = Date.now() - startedMs;
  const timedOut = Boolean(result.error && result.error.code === 'ETIMEDOUT');
  const exitCode = timedOut ? 124 : (result.status ?? 1);
  const record = {
    id,
    command: commandArgs,
    cwd: relative(ROOT, cwd).replaceAll('\\', '/') || '.',
    startedAt,
    endedAt,
    durationMs,
    timeoutMs,
    warnMs,
    exitCode,
    signal: result.signal || '',
    timedOut,
    warned: durationMs > warnMs,
    stdoutTail: textTail(result.stdout),
    stderrTail: textTail(result.stderr || result.error?.message || ''),
  };
  const telemetryFile = options.telemetryFile || COMMAND_RUNS_FILE;
  if (options.telemetry !== false) {
    ensureDir(dirname(telemetryFile));
    appendFileSync(telemetryFile, `${JSON.stringify(record)}\n`);
  }
  if (options.echo !== false) {
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
    const status = timedOut ? 'timed out' : `exit ${exitCode}`;
    const message = `workflow command ${id}: ${status} after ${durationMs}ms`;
    if (timedOut || durationMs > warnMs || exitCode !== 0) console.error(message);
    else console.log(message);
  }
  return { result, record, exitCode };
}

function readCommandRuns(file = COMMAND_RUNS_FILE) {
  if (!existsSync(file)) return [];
  const runs = [];
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean)) {
    try {
      runs.push(JSON.parse(line));
    } catch {
      // Ignore malformed local telemetry lines; records that depend on them will fail evidence lookup.
    }
  }
  return runs;
}

function commandRunSummary(run) {
  return {
    id: run.id || '',
    command: Array.isArray(run.command) ? run.command.map((part) => publicSafe(part)) : [],
    cwd: publicSafe(run.cwd || '.'),
    startedAt: run.startedAt || '',
    endedAt: run.endedAt || '',
    durationMs: Number(run.durationMs || 0),
    timeoutMs: Number(run.timeoutMs || 0),
    exitCode: Number(run.exitCode ?? 1),
    timedOut: Boolean(run.timedOut),
    warned: Boolean(run.warned),
  };
}

function commandEvidenceForIds(commandIds, options = {}) {
  const ids = csv(commandIds).length ? csv(commandIds) : (Array.isArray(commandIds) ? commandIds : []);
  const runs = readCommandRuns(options.telemetryFile || COMMAND_RUNS_FILE);
  const latestById = new Map();
  for (const run of runs) {
    if (run.id) latestById.set(run.id, run);
  }
  const problems = [];
  const evidence = [];
  for (const id of ids) {
    const run = latestById.get(id);
    if (!run) {
      problems.push(`command run id ${id} was not found in runtime telemetry; run it through npm run workflow:run before recording a pass.`);
      continue;
    }
    const summary = commandRunSummary(run);
    evidence.push(summary);
    if (options.requirePass !== false && (summary.exitCode !== 0 || summary.timedOut)) {
      problems.push(`command run id ${id} did not pass: exitCode=${summary.exitCode}, timedOut=${summary.timedOut}.`);
    }
  }
  return { evidence, problems };
}

function commandEvidenceLines(commandEvidence) {
  if (!commandEvidence.length) return [];
  return [
    'Command evidence:',
    ...commandEvidence.map((run) => `- ${run.id}: exit ${run.exitCode}, timedOut=${run.timedOut}, durationMs=${run.durationMs}, command=${(run.command || []).join(' ')}`),
  ];
}

function commandEvidenceText(run) {
  return (Array.isArray(run.command) ? run.command : []).join(' ').toLowerCase();
}

function commandExecutableName(command = []) {
  const first = String((Array.isArray(command) ? command[0] : '') || '').replaceAll('\\', '/').split('/').pop().toLowerCase();
  return first.replace(/\.(cmd|exe|ps1)$/i, '');
}

function npmScriptName(command = []) {
  const parts = (Array.isArray(command) ? command : []).map(String);
  const exe = commandExecutableName(parts);
  if (exe !== 'npm') return '';
  const verb = parts[1] || '';
  if (verb === 'run' || verb === 'run-script') return parts[2] || '';
  if (['test', 'start', 'restart', 'stop'].includes(verb)) return verb;
  return '';
}

function commandClassMatches(run, policy = {}) {
  const id = String(run.id || '').toLowerCase();
  const commandText = commandEvidenceText(run);
  const script = npmScriptName(run.command || []);
  const npmScripts = csv(policy.npmScripts || policy.npmScript || []);
  const idIncludes = csv(policy.idIncludes || policy.idIncludesAny || []);
  const commandIncludes = csv(policy.commandIncludes || policy.commandIncludesAny || []);
  const allCommandIncludes = csv(policy.commandIncludesAll || []);
  const scriptOk = !npmScripts.length || npmScripts.includes(script);
  const idOk = !idIncludes.length || idIncludes.some((item) => id.includes(String(item).toLowerCase()));
  const commandOk = !commandIncludes.length || commandIncludes.some((item) => commandText.includes(String(item).toLowerCase()));
  const allOk = allCommandIncludes.every((item) => commandText.includes(String(item).toLowerCase()));
  return scriptOk && idOk && commandOk && allOk;
}

function commandEvidenceClasses(commandEvidence = []) {
  const classes = new Set();
  const policies = POLICY.gates?.evidence?.commandClasses || {};
  for (const run of commandEvidence || []) {
    for (const [name, policy] of Object.entries(policies)) {
      if (commandClassMatches(run, policy)) classes.add(name);
    }
  }
  return classes;
}

function requiredEvidenceClassesForFiles(files = [], evidenceKind = 'verification') {
  const rulesKey = evidenceKind === 'audit' ? 'auditRules' : 'verificationRules';
  const rules = POLICY.gates?.evidence?.[rulesKey] || [];
  const required = new Set();
  for (const rule of rules) {
    if (!files.some((file) => pathMatchesPolicy(file.replaceAll('\\', '/'), rule))) continue;
    for (const item of rule.classes || []) required.add(String(item));
  }
  return [...required].sort();
}

function evidenceRelevanceProblems(record, label = 'execution evidence', evidenceKind = 'verification') {
  const problems = [];
  const files = csv(record.files);
  const required = evidenceKind === 'deployment'
    ? (POLICY.deployment?.requiredCommandClasses || []).map(String)
    : requiredEvidenceClassesForFiles(files, evidenceKind);
  if (!required.length) return problems;
  const classes = commandEvidenceClasses(record.commandEvidence || []);
  for (const requiredClass of required) {
    if (!classes.has(requiredClass)) {
      problems.push(`${label} is missing required ${evidenceKind} command class ${requiredClass}.`);
    }
  }
  return problems;
}

function remoteArtifactBindingProblems(record, label = 'artifact evidence') {
  const artifacts = csv(record.artifacts || record.evidence).filter(isRemoteArtifact);
  if (!artifacts.length) return [];
  return artifacts
    .filter((artifact) => !(record.commandEvidence || []).some((run) => commandValidatesRemoteArtifact(run, artifact)))
    .map((artifact) => `${label} remote artifact ${artifact} is not referenced by embedded command evidence.`);
}

function commandValidatesRemoteArtifact(run, artifact) {
  const value = String(artifact || '').toLowerCase();
  if (!commandEvidenceText(run).includes(value)) return false;
  const command = Array.isArray(run.command) ? run.command : [];
  const exe = commandExecutableName(command);
  if (['curl', 'wget'].includes(exe)) return true;
  const script = npmScriptName(command);
  if (script === 'workflow:public-guide-deployed-check' && value.startsWith(PUBLIC_GUIDE_URL.toLowerCase())) return true;
  if (exe === 'node' && command.some((part) => String(part).includes('check-public-guide-images.mjs'))) return true;
  return false;
}

function evidenceReferenceProblems(record, label = 'execution evidence', options = {}) {
  const commandIds = csv(record.commandIds);
  const artifacts = csv(record.artifacts || record.evidence);
  const problems = [];
  if (!commandIds.length && !artifacts.length) {
    problems.push(`${label} has no command ids or durable artifacts.`);
    return problems;
  }
  if (commandIds.length) {
    const commandEvidence = Array.isArray(record.commandEvidence) ? record.commandEvidence : [];
    if (!commandEvidence.length) problems.push(`${label} references command ids but does not embed commandEvidence.`);
    const byId = new Map(commandEvidence.map((item) => [item.id, item]));
    const extra = commandEvidence.filter((item) => !commandIds.includes(item.id)).map((item) => item.id).filter(Boolean);
    if (extra.length) problems.push(`${label} embeds commandEvidence not listed in commandIds: ${extra.join(', ')}.`);
    for (const id of commandIds) {
      const item = byId.get(id);
      if (!item) {
        problems.push(`${label} is missing embedded commandEvidence for ${id}.`);
        continue;
      }
      if (Number(item.exitCode ?? 1) !== 0 || Boolean(item.timedOut)) {
        problems.push(`${label} command ${id} did not pass: exitCode=${Number(item.exitCode ?? 1)}, timedOut=${Boolean(item.timedOut)}.`);
      }
    }
  }
  problems.push(...artifactReferenceProblemsForRecord(record, label));
  problems.push(...remoteArtifactBindingProblems(record, label));
  if (options.evidenceKind) problems.push(...evidenceRelevanceProblems(record, label, options.evidenceKind));
  return problems;
}

function parseRunCommandArgs(rawArgs = []) {
  const out = { id: '', timeoutMs: 120000, warnMs: 0, cwd: '', commandArgs: [] };
  for (let i = 0; i < rawArgs.length; i++) {
    const arg = rawArgs[i];
    if (arg === '--') {
      out.commandArgs = rawArgs.slice(i + 1);
      break;
    }
    if (arg === '--id') out.id = rawArgs[++i] || '';
    else if (arg === '--timeout-ms') out.timeoutMs = Number(rawArgs[++i] || 0);
    else if (arg === '--warn-ms') out.warnMs = Number(rawArgs[++i] || 0);
    else if (arg === '--cwd') out.cwd = rawArgs[++i] || '';
    else out.commandArgs.push(arg);
  }
  return out;
}

function commandRunCommand(rawArgs = [], options = {}) {
  const args = parseRunCommandArgs(rawArgs);
  if (!args.commandArgs.length) {
    if (options.error !== false) console.error('run-command requires a command after --, for example: node .codex/scripts/nexus-workflow.mjs run-command --id status -- npm run workflow:status');
    return 2;
  }
  const telemetryFile = options.telemetryFile || COMMAND_RUNS_FILE;
  if (args.id && readCommandRuns(telemetryFile).some((run) => run.id === args.id)) {
    if (options.error !== false) console.error(`command run id already exists in telemetry: ${args.id}`);
    return 2;
  }
  return runTimedCommand(args.commandArgs, {
    id: args.id,
    timeoutMs: args.timeoutMs || 120000,
    warnMs: args.warnMs || undefined,
    cwd: args.cwd || ROOT,
    telemetryFile,
    echo: options.echo,
  }).exitCode;
}

function cachedGatePass(state, hash, files) {
  return files.length === 0 || (state.worktreeHash === hash && state.verdict === 'pass');
}

function cachedRoutingOk(routingState, hash) {
  if (!routingState.routingId) return true;
  if (['completed', 'closed', 'escalated'].includes(String(routingState.status || '').toLowerCase())) return true;
  return routingState.worktreeHash === hash;
}

function printProblemDetails(label, problems = []) {
  if (!problems.length) return false;
  console.log('');
  console.log(`${label} details:`);
  for (const problem of problems) console.log(`- ${problem}`);
  return true;
}

function printHealthDetails() {
  let printed = false;
  printed = printProblemDetails('handover', handoverProblems()) || printed;
  printed = printProblemDetails('records', recordIntegrityProblems()) || printed;
  printed = printProblemDetails('routing', routingScopeProblems()) || printed;
  if (!commandGuideCheck({ quiet: true })) {
    const problems = [];
    const expectedHash = publicGuideSourceHash();
    for (const [label, file] of [['public guide', 'public.html'], ['dashboard', 'index.html']]) {
      const path = join(DASHBOARD_DIR, file);
      if (!existsSync(path)) problems.push(`${label} artifact is missing.`);
      else if (htmlMetaContent(readFileSync(path, 'utf8'), guideMetaName('sourceHash')) !== expectedHash) problems.push(`${label} source hash is stale; regenerate with npm run workflow:dashboard and npm run workflow:public-guide.`);
    }
    printed = printProblemDetails('guide', problems.length ? problems : ['run npm run workflow:guide-check for details']) || printed;
  }
  printed = printProblemDetails('guide browser', guideBrowserProblems()) || printed;
  printed = printProblemDetails('zoo registry', zooRegistryProblems()) || printed;
  printed = printProblemDetails('zoo visual guide', zooVisualGuideProblems()) || printed;
  printed = printProblemDetails('codex inventory', inventoryProblems()) || printed;
  printed = printProblemDetails('workflow policy', policyProblems()) || printed;
  printed = printProblemDetails('command trace', commandTraceProblems()) || printed;
  const traceAttention = commandTraceAttentionLines(readCommandRuns(), 5);
  if (traceAttention.length) {
    console.log('');
    console.log('command trace attention:');
    for (const line of traceAttention) console.log(`- ${line}`);
    printed = true;
  }
  printed = printProblemDetails('hook config', hookConfigProblems()) || printed;
  printed = printProblemDetails('work intake', intakeProblems()) || printed;
  printed = printProblemDetails('branch evidence', branchEvidenceProblems()) || printed;
  if (!commandDependencyAuditCheck({ quiet: true })) printed = printProblemDetails('dependency audit', ['run npm run audit:deps for the npm advisory/baseline breakdown']) || printed;
  if (!commandProductionZooBundleCheck({ quiet: true })) printed = printProblemDetails('production zoo bundle', ['run npm run workflow:prod-zoo-bundle-check for bundle evidence details']) || printed;
  if (!printed) console.log('\nhealth details: no deterministic problems reported');
}

function commandStatus({ health = false } = {}) {
  const branch = gitText(['branch', '--show-current']) || '(detached HEAD)';
  const status = gitText(['status', '--short', '--branch']);
  const files = changedFiles();
  const substantive = substantiveFiles(files);
  const state = loadJson(STATE_FILE, {});
  const verifyState = loadJson(VERIFY_STATE_FILE, {});
  const auditState = loadJson(AUDIT_STATE_FILE, {});
  const patchState = loadJson(PATCH_STATE_FILE, {});
  const routingState = loadJson(ROUTING_STATE_FILE, {});
  const handoverOk = commandHandoverCheck({ quiet: true });
  const recordsOk = health ? commandRecordsCheck({ quiet: true }) : null;
  const guideOk = health ? commandGuideCheck({ quiet: true }) : null;
  const guideBrowserOk = health ? commandGuideBrowserCheck({ quiet: true }) : null;
  const zooVisualOk = health ? commandZooVisualGuideCheck({ quiet: true }) : null;
  const inventoryOk = health ? commandInventoryCheck({ quiet: true }) : null;
  const policyOk = health ? commandPolicyCheck({ quiet: true }) : null;
  const traceOk = health ? commandTraceCheck({ quiet: true }) : null;
  const hookConfigOk = health ? commandHookConfigCheck({ quiet: true }) : null;
  const hookRuntimeHealthValue = hookRuntimeHealth();
  const hookRuntimeOk = hookRuntimeHealthValue.problems.length === 0;
  const intakeOk = health ? commandWorkIntakeCheck({ quiet: true }) : null;
  const depAuditOk = health ? commandDependencyAuditCheck({ quiet: true }) : null;
  const prodZooOk = health ? commandProductionZooBundleCheck({ quiet: true }) : null;
  const branchEvidenceOk = health ? commandBranchEvidenceCheck({ quiet: true }) : null;
  const traceRuns = health ? readCommandRuns() : [];
  const traceWarned = traceRuns.filter((run) => run.warned).length;
  const traceTimedOut = traceRuns.filter((run) => run.timedOut).length;
  const currentHash = worktreeHash();
  const routingOk = health ? commandRoutingCheck({ quiet: true }) : cachedRoutingOk(routingState, currentHash);
  const reviewed = health ? commandReviewCheck({ quiet: true }) : cachedGatePass(state, currentHash, substantive);
  const verified = health ? commandVerifyCheck({ quiet: true }) : cachedGatePass(verifyState, currentHash, substantive);
  const audited = health ? commandAuditCheck({ quiet: true }) : cachedGatePass(auditState, currentHash, substantive);
  saveJson(join(RUNTIME_DIR, 'session-state.json'), {
    lastStatusAt: nowIso(),
    health,
    worktreeHash: currentHash,
    branch,
  });
  console.log(`${PROFILE.displayName || 'Codex'} workflow ${health ? 'health' : 'status'}`);
  console.log(`root: ${ROOT}`);
  console.log(`branch: ${branch}`);
  console.log(`changed files: ${files.length}`);
  console.log(`substantive files: ${substantive.length}`);
  console.log(`worktree hash: ${currentHash}`);
  console.log(`reviewed: ${reviewed ? 'yes' : 'no'}`);
  console.log(`verified: ${verified ? 'yes' : 'no'}`);
  console.log(`audited: ${audited ? 'yes' : 'no'}`);
  console.log(`handover: ${handoverOk ? 'ok' : 'needs attention'}`);
  console.log(health ? `records: ${recordsOk ? 'ok' : 'needs attention'}` : 'records: deferred (run npm run workflow:health)');
  console.log(`routing: ${routingOk ? 'ok' : 'needs attention'}`);
  if (health) {
    console.log(`guide: ${guideOk ? 'ok' : 'needs attention'}`);
    console.log(`guide browser: ${guideBrowserOk ? 'ok' : 'needs attention'}`);
    console.log(`zoo visual guide: ${zooVisualOk ? 'ok' : 'needs attention'}`);
    console.log(`codex inventory: ${inventoryOk ? 'ok' : 'needs attention'}`);
    console.log(`workflow policy: ${policyOk ? 'ok' : 'needs attention'}`);
    const traceCounts = traceWarned || traceTimedOut ? ` (warned ${traceWarned}, timed out ${traceTimedOut})` : '';
    console.log(`command trace: ${traceOk ? 'ok' : 'needs attention'}${traceCounts}`);
    console.log(`hook config: ${hookConfigOk ? 'ok' : 'needs attention'}`);
    console.log(`work intake: ${intakeOk ? 'ok' : 'needs attention'}`);
  }
  console.log(`hook runtime: ${hookRuntimeStatusLabel(hookRuntimeHealthValue)}`);
  if (health) {
    console.log(`branch evidence: ${branchEvidenceOk ? 'ok' : 'needs attention'}`);
    console.log(`dependency audit: ${depAuditOk ? 'ok' : 'needs attention'}`);
    console.log(`production zoo bundle: ${prodZooOk ? 'ok' : 'needs attention'}`);
  } else {
    console.log('heavy gates: run npm run workflow:health or npm run workflow:release-gate');
  }
  if (state.reviewedAt) console.log(`last review: ${state.reviewedAt} by ${state.reviewer || 'unknown'} (${state.verdict || 'unknown'})`);
  if (verifyState.verifiedAt) console.log(`last verification: ${verifyState.verifiedAt} by ${verifyState.verifier || 'unknown'} (${verifyState.verdict || 'unknown'})`);
  if (auditState.auditedAt) console.log(`last audit: ${auditState.auditedAt} by ${auditState.auditor || 'unknown'} (${auditState.verdict || 'unknown'})`);
  if (routingState.recordedAt) console.log(`last routing: ${routingState.recordedAt} via ${routingState.route || 'unknown'} (${routingState.routingId || 'unknown'}, ${routingState.status || 'unknown'})`);
  if (routingState.closedAt) console.log(`last routing closed: ${routingState.closedAt}`);
  if (patchState.lastChangedAt) console.log(`last patch trigger: ${patchState.lastChangedAt} (${patchState.reason || patchState.source || 'unknown'})`);
  if (status) {
    console.log('');
    console.log(status);
  }
}

function commandHealth() {
  commandStatus({ health: true });
  printHealthDetails();
}

function argFlag(value) {
  if (value === true) return true;
  return /^(1|true|yes|y)$/i.test(String(value || ''));
}

function commandRecordIntent(args) {
  const summary = args.summary || args.intent || '';
  if (!summary) {
    console.error('record-intent requires --summary with a compact user-intent slice.');
    process.exit(2);
  }
  const kind = String(args.kind || 'idea').toLowerCase();
  const status = String(args.status || 'captured').toLowerCase();
  const allowedKinds = allowedPolicyValues('intentKinds', ['initial', 'idea', 'feature', 'bug', 'clarification', 'constraint', 'change-request', 'maintenance', 'research']);
  const allowedStatuses = allowedPolicyValues('intentStatuses', ['captured', 'needs-clarification', 'accepted', 'converted', 'deferred', 'rejected', 'superseded']);
  if (!allowedKinds.includes(kind)) {
    console.error(`record-intent requires --kind ${allowedKinds.join('|')}`);
    process.exit(2);
  }
  if (!allowedStatuses.includes(status)) {
    console.error(`record-intent requires --status ${allowedStatuses.join('|')}`);
    process.exit(2);
  }
  const parentIntentIds = argCsv(args, ['parents', 'parent-intents', 'parent-intent-ids']);
  const supersedesIntentIds = argCsv(args, ['supersedes', 'supersedes-intents', 'supersedes-intent-ids']);
  const externalRefs = argCsv(args, ['external-refs', 'external']);
  const tags = argCsv(args, ['tags']);
  rejectIntakeWriteProblems(intakeIntentWriteProblems({
    parentIntentIds,
    supersedesIntentIds,
    externalRefs,
  }), 'record-intent');
  const publicSummary = args['public-summary'] || args.publicSummary || summary;
  const body = [
    `Kind: ${kind}`,
    `Status: ${status}`,
    `Source: ${args.source || 'user'}`,
    args['source-ref'] ? `Source ref: ${args['source-ref']}` : '',
    parentIntentIds.length ? `Parent intents: ${parentIntentIds.join(', ')}` : '',
    supersedesIntentIds.length ? `Supersedes intents: ${supersedesIntentIds.join(', ')}` : '',
    externalRefs.length ? `External refs: ${externalRefs.join(', ')}` : '',
    tags.length ? `Tags: ${tags.join(', ')}` : '',
    '',
    `Summary: ${summary}`,
    '',
    args.normalized ? `Normalized intent: ${args.normalized}` : 'Normalized intent: n/a',
    '',
    args.constraints ? `Constraints: ${args.constraints}` : 'Constraints: n/a',
    '',
    args.acceptance ? `Acceptance signals: ${args.acceptance}` : 'Acceptance signals: n/a',
    '',
    args.notes ? `Notes: ${args.notes}` : 'Notes: n/a',
  ].filter((line) => line !== '').join('\n');
  const rec = writeRecord(INTENT_RECORD_KIND, `Intent ${kind} ${summary}`, body, {
    kind,
    status,
    source: args.source || 'user',
    sourceRef: args['source-ref'] || '',
    summary,
    publicSummary,
    confidence: args.confidence || '',
    parentIntentIds,
    supersedesIntentIds,
    externalRefs,
    tags,
  });
  console.log(`Recorded intent ${rec.id}`);
  console.log(relative(ROOT, rec.path));
}

function commandRecordWorkSlice(args) {
  const summary = args.summary || args.slice || '';
  if (!summary) {
    console.error('record-work-slice requires --summary with the lead-interpreted work slice.');
    process.exit(2);
  }
  const status = String(args.status || 'active').toLowerCase();
  const allowedStatuses = allowedPolicyValues('workSliceStatuses', ['proposed', 'ready', 'active', 'blocked', 'review', 'verified', 'done', 'deferred', 'superseded']);
  if (!allowedStatuses.includes(status)) {
    console.error(`record-work-slice requires --status ${allowedStatuses.join('|')}`);
    process.exit(2);
  }
  const intentIds = intentIdsFromArgs(args);
  const sourceType = String(args['source-type'] || args.sourceType || 'user-intent').toLowerCase();
  const allowedSourceTypes = allowedPolicyValues('sourceTypes', ['user-intent', 'internal-maintenance', 'workflow-maintenance']);
  if (!allowedSourceTypes.includes(sourceType)) {
    console.error(`record-work-slice requires --source-type ${allowedSourceTypes.join('|')}`);
    process.exit(2);
  }
  const sourceTypesWithoutIntent = new Set(allowedPolicyValues('sourceTypesWithoutIntent', ['internal-maintenance', 'workflow-maintenance']));
  if (!intentIds.length && !sourceTypesWithoutIntent.has(sourceType)) {
    console.error(`record-work-slice requires --intent/--intent-ids unless --source-type is one of ${[...sourceTypesWithoutIntent].join('|')}`);
    process.exit(2);
  }
  const needsAcceptance = !['proposed', 'blocked', 'deferred', 'superseded'].includes(status);
  const acceptance = args.acceptance || '';
  if (needsAcceptance && !acceptance) {
    console.error('record-work-slice requires --acceptance unless status is proposed, blocked, deferred, or superseded.');
    process.exit(2);
  }
  const files = args.files ? csv(args.files) : [];
  const externalRefs = argCsv(args, ['external-refs', 'external']);
  const tags = argCsv(args, ['tags']);
  const updatesWorkSliceId = args.updates || args['updates-work-slice'] || '';
  const supersedesWorkSliceIds = argCsv(args, ['supersedes', 'supersedes-work-slices']);
  const blockedByWorkSliceIds = argCsv(args, ['blocked-by', 'blocked-by-work-slices']);
  rejectIntakeWriteProblems(intakeWorkSliceWriteProblems({
    intentIds,
    updatesWorkSliceId,
    supersedesWorkSliceIds,
    blockedByWorkSliceIds,
    externalRefs,
  }), 'record-work-slice');
  const publicSummary = args['public-summary'] || args.publicSummary || summary;
  const deploymentRequired = argFlag(args['deployment-required'] || args.deploymentRequired);
  const body = [
    `Status: ${status}`,
    `Source type: ${sourceType}`,
    `Owner: ${args.owner || leadWorkerId()}`,
    intentIds.length ? `Intent IDs: ${intentIds.join(', ')}` : 'Intent IDs: n/a',
    updatesWorkSliceId ? `Updates work slice: ${updatesWorkSliceId}` : '',
    supersedesWorkSliceIds.length ? `Supersedes work slices: ${supersedesWorkSliceIds.join(', ')}` : '',
    blockedByWorkSliceIds.length ? `Blocked by work slices: ${blockedByWorkSliceIds.join(', ')}` : '',
    externalRefs.length ? `External refs: ${externalRefs.join(', ')}` : '',
    tags.length ? `Tags: ${tags.join(', ')}` : '',
    '',
    `Lead understanding: ${summary}`,
    '',
    acceptance ? `Acceptance criteria: ${acceptance}` : 'Acceptance criteria: n/a',
    '',
    args['non-goals'] || args.nonGoals ? `Non-goals: ${args['non-goals'] || args.nonGoals}` : 'Non-goals: n/a',
    '',
    args.verification ? `Verification plan: ${args.verification}` : 'Verification plan: n/a',
    '',
    files.length ? ['Files / scope hints:', ...files.map((file) => `- ${file}`)].join('\n') : 'Files / scope hints: n/a',
    '',
    args.notes ? `Notes: ${args.notes}` : 'Notes: n/a',
  ].filter((line) => line !== '').join('\n');
  const rec = writeRecord(WORK_SLICE_RECORD_KIND, `Work slice ${status} ${summary}`, body, {
    status,
    sourceType,
    owner: args.owner || leadWorkerId(),
    intentIds,
    summary,
    publicSummary,
    area: args.area || '',
    priority: args.priority || '',
    acceptance,
    verification: args.verification || '',
    files,
    externalRefs,
    tags,
    updatesWorkSliceId,
    supersedesWorkSliceIds,
    blockedByWorkSliceIds,
    deploymentRequired,
    openedAt: args['opened-at'] || nowIso(),
  });
  console.log(`Recorded work slice ${rec.id}`);
  console.log(relative(ROOT, rec.path));
}

function commandCloseWorkSlice(args) {
  const sliceId = args.slice || args['work-slice'] || args['work-slice-id'] || '';
  if (!sliceId) {
    console.error('close-work-slice requires --slice <WORK-SLICE-id>.');
    process.exit(2);
  }
  const prior = recordFrontmatter(WORK_SLICE_RECORD_KIND, sliceId);
  if (!prior?.id) {
    console.error(`close-work-slice could not find work slice ${sliceId}.`);
    process.exit(2);
  }
  const status = String(args.status || 'done').toLowerCase();
  const closedStatuses = allowedPolicyValues('closedWorkSliceStatuses', ['verified', 'done', 'deferred', 'superseded']);
  if (!closedStatuses.includes(status)) {
    console.error(`close-work-slice requires --status ${closedStatuses.join('|')}.`);
    process.exit(2);
  }
  const next = {
    ...args,
    status,
    summary: args.summary || prior.summary || prior.publicSummary || `Close ${sliceId}`,
    intent: args.intent || csv(prior.intentIds || prior.intents).join(','),
    'source-type': args['source-type'] || prior.sourceType || 'user-intent',
    owner: args.owner || prior.owner || leadWorkerId(),
    acceptance: args.acceptance || prior.acceptance || args.notes || 'Closed by workflow evidence.',
    verification: args.verification || prior.verification || '',
    files: args.files || csv(prior.files).join(','),
    tags: args.tags || csv(prior.tags).join(','),
    'deployment-required': args['deployment-required'] ?? prior.deploymentRequired,
    updates: sliceId,
  };
  commandRecordWorkSlice(next);
}

function commandRecordPatch(args, hookPayload = null) {
  const hash = worktreeHash();
  const branch = branchEvidenceInfo();
  const scope = args.scope || 'worktree';
  if (scope === 'branch' && args.files) {
    console.error('record-patch branch scope derives files from the branch diff; omit --files so evidence cannot narrow away changed files.');
    process.exit(2);
  }
  const files = scope === 'branch' ? branch.files : (args.files ? csv(args.files) : substantiveFiles());
  const title = args.summary || hookPayload?.tool_name || 'Patch';
  const routingState = loadJson(ROUTING_STATE_FILE, {});
  const activeRouting = activeRoutingForPatch(files, routingState);
  const routingId = args.routing || args['routing-id'] || activeRouting?.routingId || (routingState.worktreeHash === hash ? routingState.routingId : '') || '';
  const agent = args.worker || args.agent || activeRouting?.worker || leadWorkerId();
  const explicitWorkSliceIds = workSliceIdsFromArgs(args);
  const workSliceIds = explicitWorkSliceIds.length ? explicitWorkSliceIds : csv(activeRouting?.workSliceIds);
  const body = [
    `Summary: ${title}`,
    `Scope: ${scope}`,
    `Agent: ${agent}`,
    `Routing: ${routingId || 'n/a'}`,
    `Work slices: ${workSliceIds.join(', ') || 'n/a'}`,
    scope === 'branch' && branch.hash ? `Branch evidence hash: ${branch.hash}` : '',
    '',
    `Files:`,
    ...files.map((f) => `- ${f}`),
    '',
    `Worktree hash after patch: ${hash}`,
  ].join('\n');
  const rec = writeRecord('patches', title, body, {
    scope,
    files,
    agent,
    worktreeHash: hash,
    routingId,
    workSliceIds,
    routingRequired: !isLeadWorker(agent),
    ...branchScopedFrontmatter(scope, branch),
  });
  invalidateGates(files, `patch ${rec.id}`, agent, {
    patchId: rec.id,
    patchRecord: relative(ROOT, rec.path).replaceAll('\\', '/'),
    routingId,
    worker: agent,
  });
  console.log(`Recorded patch ${rec.id}`);
  console.log(relative(ROOT, rec.path));
}

function commandRecordReview(args) {
  const verdict = String(args.verdict || '').toLowerCase();
  if (!['pass', 'fail', 'needs-work'].includes(verdict)) {
    console.error('record-review requires --verdict pass|fail|needs-work');
    process.exit(2);
  }
  const hash = worktreeHash();
  const scope = args.scope || 'worktree';
  const branch = branchEvidenceInfo();
  if (!args.kind) {
    console.error('record-review requires explicit --kind general|pattern|design|workflow|integrated');
    process.exit(2);
  }
  const kind = String(args.kind).toLowerCase();
  if (!['general', 'pattern', 'design', 'workflow', 'integrated'].includes(kind)) {
    console.error('record-review requires --kind general|pattern|design|workflow|integrated');
    process.exit(2);
  }
  const patchState = loadJson(PATCH_STATE_FILE, {});
  if (scope === 'branch' && args.files) {
    console.error('record-review branch scope derives files from the branch diff; omit --files so evidence cannot narrow away changed files.');
    process.exit(2);
  }
  const files = scope === 'branch' ? branch.files : (args.files ? csv(args.files) : substantiveFiles());
  const patchId = args.patch || args['patch-id'] || (patchState.worktreeHash === hash ? patchState.patchId : null);
  const workSliceIds = inferredWorkSliceIds(args, { scope, hash, branch, patchId });
  if (substantiveFiles().length && !patchId) {
    console.error('record-review requires a patch record for substantive changes. Run record-patch first or pass --patch <PATCH-id>.');
    process.exit(2);
  }
  const title = `Review ${kind} ${verdict} ${scope}`;
  const body = [
    `Scope: ${scope}`,
    `Kind: ${kind}`,
    `Verdict: ${verdict}`,
    `Reviewer: ${args.reviewer || 'unknown'}`,
    `Patch: ${patchId || 'n/a'}`,
    `Work slices: ${workSliceIds.join(', ') || 'n/a'}`,
    `Worktree hash: ${hash}`,
    scope === 'branch' && branch.hash ? `Branch evidence hash: ${branch.hash}` : '',
    '',
    files.length ? ['Reviewed files:', ...files.map((f) => `- ${f}`)].join('\n') : 'Reviewed files: n/a',
    '',
    args.notes ? `Notes: ${args.notes}` : 'Notes: n/a',
  ].join('\n');
  const rec = writeRecord('reviews', title, body, {
    scope,
    verdict,
    reviewer: args.reviewer || 'unknown',
    worktreeHash: hash,
    kind,
    patchId: patchId || '',
    workSliceIds,
    files,
    ...branchScopedFrontmatter(scope, branch),
  });
  const reviewKinds = verdict === 'pass'
    ? reviewKindsFromRecords(hash)
    : loadJson(STATE_FILE, {}).reviewKinds || {};
  saveJson(STATE_FILE, {
    worktreeHash: hash,
    verdict,
    reviewer: args.reviewer || 'unknown',
    reviewedAt: nowIso(),
    reviewRecord: relative(ROOT, rec.path).replaceAll('\\', '/'),
    notes: args.notes || '',
    kind,
    patchId: patchId || '',
    reviewKinds,
  });
  console.log(`Recorded review ${rec.id}`);
  console.log(relative(ROOT, rec.path));
}

function commandReviewCheck({ quiet = false } = {}) {
  const files = substantiveFiles();
  const hash = worktreeHash();
  const state = loadJson(STATE_FILE, {});
  const requiredKinds = requiredReviewKinds(files);
  const missingKinds = requiredKinds.filter((kind) => !stateHasReviewKind(state, kind, hash));
  const patchCovered = hasPatchCoverage(hash);
  const routingOk = commandRoutingCheck({ quiet: true });
  const ok = files.length === 0 || (patchCovered && routingOk && missingKinds.length === 0);
  if (!quiet) {
    console.log(`substantive files: ${files.length}`);
    console.log(`worktree hash: ${hash}`);
    console.log(`reviewed: ${ok ? 'yes' : 'no'}`);
    if (files.length) console.log(`required review kinds: ${requiredKinds.join(', ') || 'none'}`);
    if (!ok) {
      if (!patchCovered) console.log('patch record required for current worktree hash');
      if (!routingOk) commandRoutingCheck();
      for (const kind of missingKinds) console.log(`missing ${kind} review for current worktree hash`);
      console.log('review required before commit');
      for (const file of files) console.log(`- ${file}`);
    }
  }
  return ok;
}

function commandRecordVerification(args) {
  const verdict = String(args.verdict || '').toLowerCase();
  if (!['pass', 'fail', 'partial', 'blocked'].includes(verdict)) {
    console.error('record-verify requires --verdict pass|fail|partial|blocked');
    process.exit(2);
  }
  const hash = worktreeHash();
  const scope = args.scope || 'worktree';
  const branch = branchEvidenceInfo();
  if (scope === 'branch' && args.files) {
    console.error('record-verify branch scope derives files from the branch diff; omit --files so evidence cannot narrow away changed files.');
    process.exit(2);
  }
  const files = scope === 'branch' ? branch.files : (args.files ? csv(args.files) : verificationRelevantFiles());
  const commandIds = csv(args.commands || args['command-ids']);
  const artifacts = csv(args.artifacts || args.evidence || args['summary-files']);
  const workSliceIds = inferredWorkSliceIds(args, { scope, hash, branch });
  if (verdict === 'pass' && !commandIds.length && !artifacts.length) {
    console.error('record-verify pass requires --commands/--command-ids or --artifacts/--evidence so execution evidence is reference-based.');
    process.exit(2);
  }
  const artifactProblems = artifactInputProblems(artifacts, { commandIds });
  if (artifactProblems.length) {
    console.error('record-verify artifact evidence problems:');
    for (const problem of artifactProblems) console.error(`- ${problem}`);
    process.exit(2);
  }
  const artifactEvidence = artifactEvidenceForRefs(artifacts);
  const commandEvidence = commandEvidenceForIds(commandIds, { requirePass: verdict === 'pass' });
  if (commandEvidence.problems.length) {
    console.error('record-verify command evidence problems:');
    for (const problem of commandEvidence.problems) console.error(`- ${problem}`);
    process.exit(2);
  }
  const remoteProblems = remoteArtifactBindingProblems({ artifacts, commandEvidence: commandEvidence.evidence }, 'record-verify evidence');
  if (remoteProblems.length) {
    console.error('record-verify remote artifact evidence problems:');
    for (const problem of remoteProblems) console.error(`- ${problem}`);
    process.exit(2);
  }
  const relevanceProblems = evidenceRelevanceProblems({
    files,
    commandIds,
    commandEvidence: commandEvidence.evidence,
    artifacts,
    artifactEvidence,
  }, 'record-verify evidence', 'verification');
  if (verdict === 'pass' && relevanceProblems.length) {
    console.error('record-verify evidence relevance problems:');
    for (const problem of relevanceProblems) console.error(`- ${problem}`);
    process.exit(2);
  }
  const title = `Verification ${verdict} ${scope}`;
  const body = [
    `Scope: ${scope}`,
    `Verdict: ${verdict}`,
    `Verifier: ${args.verifier || 'unknown'}`,
    `Worktree hash: ${hash}`,
    scope === 'branch' && branch.hash ? `Branch evidence hash: ${branch.hash}` : '',
    workSliceIds.length ? `Work slices: ${workSliceIds.join(', ')}` : '',
    commandIds.length ? `Command run ids: ${commandIds.join(', ')}` : '',
    artifacts.length ? `Artifacts: ${artifacts.join(', ')}` : '',
    files.length ? `Files: ${files.join(', ')}` : '',
    ...commandEvidenceLines(commandEvidence.evidence),
    '',
    args.notes ? `Notes: ${args.notes}` : 'Notes: n/a',
  ].join('\n');
  const rec = writeRecord('tests', title, body, {
    scope,
    verdict,
    verifier: args.verifier || 'unknown',
    worktreeHash: hash,
    files,
    workSliceIds,
    commandIds,
    commandEvidence: commandEvidence.evidence,
    artifacts,
    artifactEvidence,
    ...branchScopedFrontmatter(scope, branch),
  });
  saveJson(VERIFY_STATE_FILE, {
    worktreeHash: hash,
    verdict,
    verifier: args.verifier || 'unknown',
    verifiedAt: nowIso(),
    verifyRecord: relative(ROOT, rec.path).replaceAll('\\', '/'),
    commandIds,
    commandEvidence: commandEvidence.evidence,
    files,
    artifacts,
    artifactEvidence,
    notes: args.notes || '',
  });
  console.log(`Recorded verification ${rec.id}`);
  console.log(relative(ROOT, rec.path));
}

function commandRecordTest(args) {
  console.error('record-test is retired. Use record-verify with --verdict and command/artifact evidence so the gate can validate proof.');
  process.exit(2);
}

function commandRecordDeployment(args) {
  const verdict = String(args.verdict || '').toLowerCase();
  if (!['pass', 'fail', 'partial', 'blocked'].includes(verdict)) {
    console.error('record-deployment requires --verdict pass|fail|partial|blocked');
    process.exit(2);
  }
  const branch = branchEvidenceInfo();
  const target = args.target || args.environment || '';
  const commandIds = csv(args.commands || args['command-ids']);
  const checks = csv(args.checks);
  const artifacts = csv(args.artifacts || args.evidence || args['summary-files']);
  const workSliceIds = inferredWorkSliceIds(args, { scope: 'branch', branch });
  if (!args.summary || !target || !args.notes) {
    console.error('record-deployment requires --summary, --target, and --notes.');
    process.exit(2);
  }
  const targetProblems = [
    ...deploymentTargetProblems(target, 'record-deployment target'),
  ];
  if (targetProblems.length) {
    console.error('record-deployment target problems:');
    for (const problem of targetProblems) console.error(`- ${problem}`);
    process.exit(2);
  }
  if (verdict === 'pass' && !commandIds.length && !artifacts.length) {
    console.error('record-deployment pass requires --commands/--command-ids or durable --artifacts/--evidence. --checks are descriptive and not proof by themselves.');
    process.exit(2);
  }
  const artifactProblems = artifactInputProblems(artifacts, { commandIds });
  if (artifactProblems.length) {
    console.error('record-deployment artifact evidence problems:');
    for (const problem of artifactProblems) console.error(`- ${problem}`);
    process.exit(2);
  }
  const artifactEvidence = artifactEvidenceForRefs(artifacts);
  const commandEvidence = commandEvidenceForIds(commandIds, { requirePass: verdict === 'pass' });
  if (commandEvidence.problems.length) {
    console.error('record-deployment command evidence problems:');
    for (const problem of commandEvidence.problems) console.error(`- ${problem}`);
    process.exit(2);
  }
  const remoteProblems = remoteArtifactBindingProblems({ artifacts, commandEvidence: commandEvidence.evidence }, 'record-deployment evidence');
  if (remoteProblems.length) {
    console.error('record-deployment remote artifact evidence problems:');
    for (const problem of remoteProblems) console.error(`- ${problem}`);
    process.exit(2);
  }
  const relevanceProblems = evidenceRelevanceProblems({
    target,
    commandIds,
    commandEvidence: commandEvidence.evidence,
    artifacts,
    artifactEvidence,
  }, 'record-deployment evidence', 'deployment');
  if (verdict === 'pass' && relevanceProblems.length) {
    console.error('record-deployment evidence relevance problems:');
    for (const problem of relevanceProblems) console.error(`- ${problem}`);
    process.exit(2);
  }
  const body = [
    `Target: ${target}`,
    `Verdict: ${verdict}`,
    `Operator: ${args.operator || args.deployer || 'unknown'}`,
    branch.hash ? `Branch evidence hash: ${branch.hash}` : '',
    workSliceIds.length ? `Work slices: ${workSliceIds.join(', ')}` : '',
    commandIds.length ? `Command run ids: ${commandIds.join(', ')}` : '',
    checks.length ? `Checks: ${checks.join(', ')}` : '',
    artifacts.length ? `Artifacts: ${artifacts.join(', ')}` : '',
    `Guide artifact hash: ${guideArtifactHash()}`,
    ...commandEvidenceLines(commandEvidence.evidence),
    '',
    `Notes: ${args.notes}`,
  ].filter(Boolean).join('\n');
  const rec = writeRecord('deployments', args.summary, body, {
    target,
    verdict,
    operator: args.operator || args.deployer || 'unknown',
    workSliceIds,
    commandIds,
    commandEvidence: commandEvidence.evidence,
    checks,
    artifacts,
    artifactEvidence,
    guideArtifactHash: guideArtifactHash(),
    guideArtifacts: deploymentGuideArtifactMeta(),
    ...branchEvidenceFrontmatter(branch),
  });
  console.log(`Recorded deployment ${rec.id}`);
  console.log(relative(ROOT, rec.path));
}

function commandRecordAudit(args) {
  const verdict = String(args.verdict || '').toLowerCase();
  if (!['pass', 'fail', 'partial', 'blocked'].includes(verdict)) {
    console.error('record-audit requires --verdict pass|fail|partial|blocked');
    process.exit(2);
  }
  const hash = worktreeHash();
  const scope = args.scope || 'worktree';
  const branch = branchEvidenceInfo();
  if (scope === 'branch' && args.files) {
    console.error('record-audit branch scope derives files from the branch diff; omit --files so evidence cannot narrow away changed files.');
    process.exit(2);
  }
  const files = scope === 'branch' ? branch.files : (args.files ? csv(args.files) : auditRelevantFiles());
  const commandIds = csv(args.commands || args['command-ids']);
  const artifacts = csv(args.artifacts || args.evidence || args['summary-files']);
  const workSliceIds = inferredWorkSliceIds(args, { scope, hash, branch });
  if (verdict === 'pass' && !commandIds.length && !artifacts.length) {
    console.error('record-audit pass requires --commands/--command-ids or --artifacts/--evidence so audit evidence is reference-based.');
    process.exit(2);
  }
  const artifactProblems = artifactInputProblems(artifacts, { commandIds });
  if (artifactProblems.length) {
    console.error('record-audit artifact evidence problems:');
    for (const problem of artifactProblems) console.error(`- ${problem}`);
    process.exit(2);
  }
  const artifactEvidence = artifactEvidenceForRefs(artifacts);
  const commandEvidence = commandEvidenceForIds(commandIds, { requirePass: verdict === 'pass' });
  if (commandEvidence.problems.length) {
    console.error('record-audit command evidence problems:');
    for (const problem of commandEvidence.problems) console.error(`- ${problem}`);
    process.exit(2);
  }
  const remoteProblems = remoteArtifactBindingProblems({ artifacts, commandEvidence: commandEvidence.evidence }, 'record-audit evidence');
  if (remoteProblems.length) {
    console.error('record-audit remote artifact evidence problems:');
    for (const problem of remoteProblems) console.error(`- ${problem}`);
    process.exit(2);
  }
  const relevanceProblems = evidenceRelevanceProblems({
    files,
    commandIds,
    commandEvidence: commandEvidence.evidence,
    artifacts,
    artifactEvidence,
  }, 'record-audit evidence', 'audit');
  if (verdict === 'pass' && relevanceProblems.length) {
    console.error('record-audit evidence relevance problems:');
    for (const problem of relevanceProblems) console.error(`- ${problem}`);
    process.exit(2);
  }
  const title = `Audit ${verdict} ${scope}`;
  const body = [
    `Scope: ${scope}`,
    `Verdict: ${verdict}`,
    `Auditor: ${args.auditor || 'unknown'}`,
    `Worktree hash: ${hash}`,
    scope === 'branch' && branch.hash ? `Branch evidence hash: ${branch.hash}` : '',
    workSliceIds.length ? `Work slices: ${workSliceIds.join(', ')}` : '',
    commandIds.length ? `Command run ids: ${commandIds.join(', ')}` : '',
    artifacts.length ? `Artifacts: ${artifacts.join(', ')}` : '',
    files.length ? `Files: ${files.join(', ')}` : '',
    ...commandEvidenceLines(commandEvidence.evidence),
    '',
    args.notes ? `Notes: ${args.notes}` : 'Notes: n/a',
  ].join('\n');
  const rec = writeRecord('audits', title, body, {
    scope,
    verdict,
    auditor: args.auditor || 'unknown',
    worktreeHash: hash,
    files,
    workSliceIds,
    commandIds,
    commandEvidence: commandEvidence.evidence,
    artifacts,
    artifactEvidence,
    ...branchScopedFrontmatter(scope, branch),
  });
  saveJson(AUDIT_STATE_FILE, {
    worktreeHash: hash,
    verdict,
    auditor: args.auditor || 'unknown',
    auditedAt: nowIso(),
    auditRecord: relative(ROOT, rec.path).replaceAll('\\', '/'),
    commandIds,
    commandEvidence: commandEvidence.evidence,
    files,
    artifacts,
    artifactEvidence,
    notes: args.notes || '',
  });
  console.log(`Recorded audit ${rec.id}`);
  console.log(relative(ROOT, rec.path));
}

function commandRecordPattern(args) {
  const status = String(args.status || 'proposed').toLowerCase();
  if (!['proposed', 'accepted', 'rejected', 'superseded'].includes(status)) {
    console.error('record-pattern requires --status proposed|accepted|rejected|superseded');
    process.exit(2);
  }
  if (status !== 'proposed' && (!args.reviewer || !args.decision)) {
    console.error('accepted/rejected/superseded pattern records require --reviewer and --decision.');
    process.exit(2);
  }
  if (!args.summary || !args.evidence) {
    console.error('record-pattern requires --summary and --evidence so durable guidance is evidence-based.');
    process.exit(2);
  }
  const files = args.files ? csv(args.files) : [];
  const title = `Pattern ${status} ${args.summary}`;
  const body = [
    `Status: ${status}`,
    `Reporter: ${args.reporter || 'codex'}`,
    status !== 'proposed' ? `Reviewer: ${args.reviewer}` : '',
    status !== 'proposed' ? `Decision: ${args.decision}` : '',
    '',
    `Summary: ${args.summary}`,
    '',
    `Evidence: ${args.evidence}`,
    '',
    args.guidance ? `Proposed guidance: ${args.guidance}` : 'Proposed guidance: n/a',
    '',
    files.length ? ['Files:', ...files.map((f) => `- ${f}`)].join('\n') : 'Files: n/a',
    '',
    args.notes ? `Notes: ${args.notes}` : 'Notes: n/a',
    '',
    status === 'accepted'
      ? 'Promotion rule: edit .codex/knowledge/patterns.md or another knowledge file, cite this proposal record, then run focused review.'
      : 'Promotion rule: keep this as evidence until review accepts it for durable guidance.',
  ].join('\n');
  const rec = writeRecord('pattern-proposals', title, body, {
    status,
    reporter: args.reporter || 'codex',
    reviewer: args.reviewer || '',
    evidence: args.evidence,
    files,
  });
  console.log(`Recorded pattern proposal ${rec.id}`);
  console.log(relative(ROOT, rec.path));
}

function commandRecordRouting(args) {
  const route = canonicalRouteName(args.route || '');
  const validRoutes = validRouteNames();
  if (!validRoutes.includes(route)) {
    console.error(`record-routing requires --route ${validRoutes.join('|')}`);
    process.exit(2);
  }
  const files = routeFilesFromArgs(args);
  let fallbackTarget = args.fallback || args['fallback-target'] || '';
  const fallbackTrigger = args['fallback-trigger'] || args.trigger || '';
  const fromRoutingId = args['from-routing'] || args.fromRouting || args['from-routing-id'] || '';
  const verification = args.verification || args.tests || '';
  const worker = args.worker || args.agent || defaultWorkerForRoute(route);
  const hash = worktreeHash();
  const workSliceIds = inferredWorkSliceIds(args, { hash });
  if (!args.summary || !worker || !verification) {
    console.error('record-routing requires --summary, --worker, and --verification.');
    process.exit(2);
  }
  if (route !== 'lead' && canonicalWorker(worker) === route) {
    console.error('record-routing for delegated/review routes requires an actual worker id, not the abstract route label.');
    process.exit(2);
  }
  const previousRouting = loadJson(ROUTING_STATE_FILE, {});
  const previousSparkActive = String(previousRouting.route || '').includes('spark')
    && !['closed', 'completed'].includes(String(previousRouting.status || '').toLowerCase());
  const strongTakeover = route === 'strong' && (fromRoutingId || previousSparkActive);
  if (strongTakeover && !fallbackTarget) fallbackTarget = worker;
  if ((route.includes('spark') || route.includes('escalate')) && (!fallbackTarget || !fallbackTrigger)) {
    console.error('Spark/escalation routing requires --fallback-target and --fallback-trigger.');
    process.exit(2);
  }
  if (strongTakeover && !fallbackTrigger) {
    console.error('Strong takeover after Spark routing requires --fallback-trigger and --from-routing so escalation is durable.');
    process.exit(2);
  }
  if (route === 'spark' && !files.length) {
    console.error('Spark routing requires --files or --write-scope.');
    process.exit(2);
  }
  const rejectedRoutes = csv(args.rejected || args['rejected-routes']);
  const deadline = args.deadline || args.timebox || '';
  const body = [
    `Summary: ${args.summary}`,
    `Route: ${route}`,
    `Worker: ${worker}`,
    `Rejected routes: ${rejectedRoutes.join(', ') || 'n/a'}`,
    `Write scope: ${files.join(', ') || 'n/a'}`,
    `Work slices: ${workSliceIds.join(', ') || 'n/a'}`,
    `Verification: ${verification}`,
    `Fallback trigger: ${fallbackTrigger || 'n/a'}`,
    `Fallback target: ${fallbackTarget || 'n/a'}`,
    `From routing: ${fromRoutingId || (previousSparkActive ? previousRouting.routingId : '') || 'n/a'}`,
    `Deadline: ${deadline || 'n/a'}`,
    `Worktree hash at routing: ${hash}`,
    '',
    args.notes ? `Notes: ${args.notes}` : 'Notes: n/a',
  ].join('\n');
  const rec = writeRecord('routing', args.summary, body, {
    route,
    worker,
    rejectedRoutes,
    files,
    workSliceIds,
    verification,
    fallbackTrigger,
    fallbackTarget,
    fromRoutingId: fromRoutingId || (previousSparkActive ? previousRouting.routingId : ''),
    deadline,
    worktreeHash: hash,
  });
  const routingId = rec.id;
  saveJson(ROUTING_STATE_FILE, {
    routingId,
    route,
    worker,
    rejectedRoutes,
    files,
    writeScope: files,
    workSliceIds,
    verification,
    fallbackTrigger,
    fallbackTarget,
    fromRoutingId: fromRoutingId || (previousSparkActive ? previousRouting.routingId : ''),
    deadline,
    status: route.startsWith('escalate') ? 'escalated' : 'active',
    worktreeHash: hash,
    recordedAt: nowIso(),
    record: relative(ROOT, rec.path).replaceAll('\\', '/'),
  });
  console.log(`Recorded routing ${routingId}`);
  console.log(relative(ROOT, rec.path));
}

function commandCompleteRouting(args) {
  const routingState = loadJson(ROUTING_STATE_FILE, {});
  const routingId = args.routing || args['routing-id'] || routingState.routingId || '';
  if (!routingId) {
    console.error('complete-routing requires --routing <ROUTING-id> or an active routing state.');
    process.exit(2);
  }
  const routingRecord = recordFrontmatter('routing', routingId);
  if (!routingRecord) {
    console.error(`complete-routing could not find routing record: ${routingId}`);
    process.exit(2);
  }
  const hash = worktreeHash();
  const title = `Routing complete ${routingId}`;
  const body = [
    `Completed routing: ${routingId}`,
    `Worker: ${routingRecord.worker || routingState.worker || 'unknown'}`,
    `Route: ${routingRecord.route || routingState.route || 'unknown'}`,
    `Work slices: ${csv(routingRecord.workSliceIds || routingState.workSliceIds).join(', ') || 'n/a'}`,
    `Worktree hash at completion: ${hash}`,
    '',
    args.notes ? `Notes: ${args.notes}` : 'Notes: n/a',
  ].join('\n');
  const rec = writeRecord('routing', title, body, {
    status: 'completed',
    completedRoutingId: routingId,
    route: routingRecord.route || routingState.route || '',
    worker: routingRecord.worker || routingState.worker || '',
    files: routingRecord.files || routingState.files || [],
    workSliceIds: csv(routingRecord.workSliceIds || routingState.workSliceIds),
    worktreeHash: hash,
  });
  saveJson(ROUTING_STATE_FILE, {
    ...routingState,
    routingId,
    status: 'closed',
    closedAt: nowIso(),
    closeRecord: relative(ROOT, rec.path).replaceAll('\\', '/'),
  });
  console.log(`Completed routing ${routingId}`);
  console.log(relative(ROOT, rec.path));
}

function commandVerifyCheck({ quiet = false } = {}) {
  const files = verificationRelevantFiles();
  const hash = worktreeHash();
  const state = loadJson(VERIFY_STATE_FILE, {});
  const evidenceOk = evidenceRecordProblems('tests', state.verifyRecord, {
    worktreeHash: hash,
    verdict: 'pass',
  }, 'verification state').length === 0;
  const stateEvidenceReferenced = evidenceReferenceProblems(state, 'verification state', { evidenceKind: 'verification' }).length === 0;
  const ok = files.length === 0
    || (state.worktreeHash === hash && state.verdict === 'pass' && evidenceOk && stateEvidenceReferenced)
    || recordHasVerificationPass(hash);
  if (!quiet) {
    console.log(`verification-relevant files: ${files.length}`);
    console.log(`worktree hash: ${hash}`);
    console.log(`verified: ${ok ? 'yes' : 'no'}`);
    if (!ok) {
      console.log('verification required before final handover/release gate');
      for (const file of files) console.log(`- ${file}`);
    }
  }
  return ok;
}

function commandAuditCheck({ quiet = false } = {}) {
  const files = auditRelevantFiles();
  const hash = worktreeHash();
  const state = loadJson(AUDIT_STATE_FILE, {});
  const evidenceOk = evidenceRecordProblems('audits', state.auditRecord, {
    worktreeHash: hash,
    verdict: 'pass',
  }, 'audit state').length === 0;
  const stateEvidenceReferenced = evidenceReferenceProblems(state, 'audit state', { evidenceKind: 'audit' }).length === 0;
  const ok = files.length === 0
    || (state.worktreeHash === hash && state.verdict === 'pass' && evidenceOk && stateEvidenceReferenced)
    || recordHasAuditPass(hash);
  if (!quiet) {
    console.log(`audit-relevant files: ${files.length}`);
    console.log(`worktree hash: ${hash}`);
    console.log(`audited: ${ok ? 'yes' : 'no'}`);
    if (!ok) {
      console.log('audit required for large/cross-cutting workflow or product changes before final handover');
      for (const file of files) console.log(`- ${file}`);
    }
  }
  return ok;
}

function artifactMetaForGuideFile(name) {
  const path = join(DASHBOARD_DIR, name);
  if (!existsSync(path)) return { file: name, missing: true };
  const html = name.endsWith('.html') ? readFileSync(path, 'utf8') : '';
  return {
    file: name,
    sha256: sha256File(path),
    bytes: statSync(path).size,
    version: html ? htmlMetaContent(html, guideMetaName('version')) : '',
    sourceHash: html ? htmlMetaContent(html, guideMetaName('sourceHash')) : '',
    recordFeedHash: html ? htmlMetaContent(html, guideMetaName('recordFeedHash')) : '',
    contentHash: html ? htmlMetaContent(html, guideMetaName('contentHash')) : '',
  };
}

function deploymentGuideArtifactMeta() {
  return {
    publicGuideUrl: PUBLIC_GUIDE_URL,
    visualZooGuideUrl: PUBLIC_ZOO_GUIDE_URL,
    artifactHash: guideArtifactHash(),
    files: [
      artifactMetaForGuideFile('public.html'),
      artifactMetaForGuideFile('zoo/index.html'),
      artifactMetaForGuideFile('zoo/manifest.json'),
    ],
  };
}

function guideDeploymentProblems(record) {
  if (!POLICY.deployment?.guideArtifactProofRequired) return [];
  const problems = [];
  const expectedHash = guideArtifactHash();
  if (record.guideArtifactHash !== expectedHash) {
    problems.push(`deployment record ${record.id || record.name} guideArtifactHash=${record.guideArtifactHash || '(missing)'}; expected current guide artifact hash ${expectedHash}.`);
  }
  const guideArtifacts = record.guideArtifacts || {};
  if (guideArtifacts.artifactHash && guideArtifacts.artifactHash !== expectedHash) {
    problems.push(`deployment record ${record.id || record.name} guideArtifacts.artifactHash=${guideArtifacts.artifactHash}; expected ${expectedHash}.`);
  }
  if (!Array.isArray(guideArtifacts.files) || guideArtifacts.files.length < 3) {
    problems.push(`deployment record ${record.id || record.name} does not embed deployed guide artifact file metadata.`);
    return problems;
  }
  const expectedByFile = new Map(deploymentGuideArtifactMeta().files.map((item) => [item.file, item]));
  const actualByFile = new Map(guideArtifacts.files.map((item) => [item.file, item]));
  for (const [file, expected] of expectedByFile) {
    const actual = actualByFile.get(file);
    if (!actual) {
      problems.push(`deployment record ${record.id || record.name} guideArtifacts.files is missing ${file}.`);
      continue;
    }
    for (const key of ['sha256', 'bytes', 'version', 'sourceHash', 'recordFeedHash', 'contentHash']) {
      if ((expected[key] || '') !== (actual[key] || '')) {
        problems.push(`deployment record ${record.id || record.name} guideArtifacts ${file}.${key}=${actual[key] || '(missing)'}; expected ${expected[key] || '(empty)'}.`);
      }
    }
  }
  return problems;
}

function deploymentTargetProblems(target, label = 'deployment target') {
  const allowed = POLICY.deployment?.allowedTargetPrefixes || [];
  if (!allowed.length) return [];
  const value = String(target || '');
  if (allowed.some((prefix) => value.startsWith(String(prefix)))) return [];
  return [`${label} ${value || '(missing)'} is outside allowed deployment target prefixes: ${allowed.join(', ')}.`];
}

function deploymentGuideTargetProblems(target, label = 'deployment target') {
  return [];
}

function deploymentProblems() {
  const branch = branchEvidenceInfo();
  const problems = [];
  if (!branch.hash) {
    problems.push('deployment check could not compute branch evidence hash.');
    return problems;
  }
  const deployments = recordFrontmatters('deployments')
    .filter((record) => record.branchHash === branch.hash && record.verdict === 'pass')
    .sort((a, b) => String(b.created).localeCompare(String(a.created)));
  const deployment = deployments[0];
  if (!deployment) {
    problems.push(`no passing deployment record tied to branchHash ${branch.hash}.`);
    return problems;
  }
  if (!deployment.target) problems.push(`deployment record ${deployment.id || deployment.name} has no target.`);
  problems.push(...deploymentTargetProblems(deployment.target, `deployment record ${deployment.id || deployment.name} target`));
  problems.push(...evidenceReferenceProblems(deployment, `deployment record ${deployment.id || deployment.name}`, { evidenceKind: 'deployment' }));
  problems.push(...guideDeploymentProblems(deployment));
  return problems;
}

function commandDeploymentCheck({ quiet = false } = {}) {
  const problems = deploymentProblems();
  if (!quiet) {
    console.log(`deployment problems: ${problems.length}`);
    for (const problem of problems) console.log(`- ${problem}`);
  }
  return problems.length === 0;
}

function branchRecordMatches(record, branch, extra = {}) {
  if (!branch.hash || record.branchHash !== branch.hash) return false;
  for (const [key, expected] of Object.entries(extra)) {
    if (expected === undefined || expected === null) continue;
    if (String(record[key] ?? '') !== String(expected)) return false;
  }
  return true;
}

function branchRecordFiles(record) {
  const files = csv(record.files);
  return files.length ? files : csv(record.branchFiles);
}

function branchRecordFileProblems(record, branch, label) {
  if (String(record.scope || '') !== 'branch') return [`${label} must have scope=branch.`];
  const files = branchRecordFiles(record);
  if (!sameStringSet(files, branch.files)) {
    return [`${label} files do not match current branch diff. Record files=${JSON.stringify(sortedStringSet(files))}; branch files=${JSON.stringify(sortedStringSet(branch.files))}.`];
  }
  return [];
}

function branchEvidenceProblemsForState(branch, recordsByKind) {
  const problems = [];
  if (!branch.base) return [`branch evidence check could not find a base ref. Set ${BRANCH_BASE_ENV} or fetch origin/main.`];
  if (!branch.mergeBase) return [`branch evidence check could not compute merge-base for ${branch.base}.`];
  if (!branch.files.length) return problems;

  const patches = recordsByKind.patches || [];
  const branchPatches = patches.filter((record) => branchRecordMatches(record, branch));
  if (!branchPatches.some((record) => String(record.scope || '') === 'branch')) {
    problems.push(`branch ${branch.hash} has substantive diff but no branch-scope PATCH record tied to branchHash ${branch.hash}.`);
  }
  for (const record of branchPatches.filter((record) => String(record.scope || '') === 'branch')) {
    problems.push(...branchRecordFileProblems(record, branch, `branch patch ${record.id || record.name || '(unknown)'}`));
  }

  const reviews = recordsByKind.reviews || [];
  for (const kind of requiredBranchReviewKinds(branch.files)) {
    const ok = reviews.some((record) => branchRecordMatches(record, branch, { verdict: 'pass', kind })
      && branchRecordFileProblems(record, branch, `branch ${kind} review ${record.id || record.name || '(unknown)'}`).length === 0);
    if (!ok) problems.push(`branch ${branch.hash} is missing a passing ${kind} review record tied to this branch diff.`);
  }
  const delegatedBranchPatches = branchIntroducedRecords(patches).flatMap((record) => splitWorkerNames(record.agent || record.worker)
    .map(canonicalWorker)
    .filter((worker) => worker && worker !== 'lead' && !LEGACY_SCHEMA_RECORDS.has(record.rel || ''))
    .map((worker) => ({ record, worker })));
  const hasDelegatedBranchPatch = delegatedBranchPatches.length > 0;
  const routings = recordsByKind.routing || [];
  for (const { record, worker } of delegatedBranchPatches) {
    const routingId = record.routingId || '';
    if (!routingId) {
      problems.push(`branch patch ${record.id || record.name || '(unknown)'} by ${worker} is missing routingId.`);
      continue;
    }
    const routing = routings.find((candidate) => candidate.id === routingId);
    if (!routing) {
      problems.push(`branch patch ${record.id || record.name || '(unknown)'} by ${worker} references missing routing record ${routingId}.`);
      continue;
    }
    if (!routingCloseoutRecord(routings, routingId)) {
      problems.push(`branch patch ${record.id || record.name || '(unknown)'} by ${worker} references routing ${routingId}, but no completed routing closeout record exists.`);
    }
    if (String(routing.route || '').toLowerCase() === 'lead') {
      problems.push(`branch patch ${record.id || record.name || '(unknown)'} by ${worker} cannot be covered by lead-only routing ${routingId}.`);
    }
    if (!routingMatchesWorker(routing, worker)) {
      problems.push(`routing ${routingId} does not cover branch patch worker ${worker}.`);
    }
    if (routing.created && record.created && routing.created > record.created) {
      problems.push(`routing ${routingId} was recorded after branch patch ${record.id || record.name || '(unknown)'}.`);
    }
    const route = String(routing.route || '').toLowerCase();
    const allowed = routing.files || routing.writeScope || [];
    if (route.includes('spark') && !allowed.length) {
      problems.push(`Spark routing ${routingId} has no branch-verifiable write scope.`);
      continue;
    }
    if (allowed.length && Array.isArray(record.files)) {
      const outside = record.files.filter((file) => !allowed.some((pattern) => fileMatchesPattern(file, pattern)));
      problems.push(...outside.map((file) => `branch patch ${record.id || record.name || '(unknown)'} changed outside routing ${routingId} scope: ${file}`));
    }
  }
  if (hasDelegatedBranchPatch) {
    const ok = reviews.some((record) => branchRecordMatches(record, branch, { verdict: 'pass', kind: 'integrated' }));
    if (!ok) problems.push(`branch ${branch.hash} includes delegated patch evidence but has no passing integrated review record tied to this branch diff.`);
  }

  const tests = recordsByKind.tests || [];
  if (verificationRelevantFiles(branch.files).length && !tests.some((record) => branchRecordMatches(record, branch, { verdict: 'pass' })
    && branchRecordFileProblems(record, branch, `branch verification record ${record.id || record.name || '(unknown)'}`).length === 0
    && !evidenceReferenceProblems({ ...record, files: branch.files }, `verification record ${record.id || record.name}`, { evidenceKind: 'verification' }).length)) {
    problems.push(`branch ${branch.hash} changes verification-relevant files but has no passing verification record tied to this branch diff.`);
  }

  const audits = recordsByKind.audits || [];
  if (auditRelevantFiles(branch.files).length && !audits.some((record) => branchRecordMatches(record, branch, { verdict: 'pass' })
    && branchRecordFileProblems(record, branch, `branch audit record ${record.id || record.name || '(unknown)'}`).length === 0
    && !evidenceReferenceProblems({ ...record, files: branch.files }, `audit record ${record.id || record.name}`, { evidenceKind: 'audit' }).length)) {
    problems.push(`branch ${branch.hash} changes audit-relevant files but has no passing audit record tied to this branch diff.`);
  }

  return problems;
}

function branchEvidenceProblems() {
  const branch = branchEvidenceInfo();
  const recordsByKind = Object.fromEntries(['patches', 'routing', 'reviews', 'tests', 'audits'].map((kind) => [kind, branchRecordFrontmatters(kind, branch)]));
  return branchEvidenceProblemsForState(branch, recordsByKind);
}

function releaseCloseoutMode(branch = branchEvidenceInfo()) {
  return (branch.files || []).length ? 'branch' : 'worktree';
}

function commandBranchEvidenceCheck({ quiet = false } = {}) {
  const branch = branchEvidenceInfo();
  const problems = branchEvidenceProblems();
  if (!quiet) {
    console.log(`branch evidence base: ${branch.base || '(none)'}`);
    console.log(`branch evidence hash: ${branch.hash || '(none)'}`);
    console.log(`branch substantive files: ${branch.files.length}`);
    console.log(`branch evidence problems: ${problems.length}`);
    for (const problem of problems) console.log(`- ${problem}`);
  }
  return problems.length === 0;
}

function commandZooCheck({ quiet = false } = {}) {
  const problems = zooRegistryProblems();
  if (!quiet) {
    console.log(`zoo registry problems: ${problems.length}`);
    for (const problem of problems) console.log(`- ${problem}`);
  }
  return problems.length === 0;
}

function commandGuideCheck({ quiet = false } = {}) {
  const problems = [];
  const expectedHash = publicGuideSourceHash();
  const expectedRecordFeedHash = guideRecordFeedHash();
  const intake = intakeModel();
  const publicPath = join(DASHBOARD_DIR, 'public.html');
  const dashboardPath = join(DASHBOARD_DIR, 'index.html');
  if (!existsSync(publicPath)) {
    problems.push('.codex/dashboard/public.html is missing; run npm run workflow:public-guide.');
  } else {
    const html = readFileSync(publicPath, 'utf8');
    if (!html.includes(`name="${guideMetaName('version')}" content="${PUBLIC_GUIDE_VERSION}"`)) problems.push('public guide version is stale; regenerate public.html.');
    if (htmlMetaContent(html, guideMetaName('sourceHash')) !== expectedHash) problems.push('public guide source hash is stale; regenerate public.html.');
    if (htmlMetaContent(html, guideMetaName('recordFeedHash')) !== expectedRecordFeedHash) problems.push('public guide record feed hash is stale; regenerate public.html.');
    if (!guideContentHashOk(html)) problems.push('public guide content hash is stale or was edited outside the generator; regenerate public.html.');
    if (htmlMetaContent(html, guideMetaName('tokenSource')) !== GUIDE_TOKEN_SOURCE_LABEL) problems.push('public guide does not declare production token source.');
      problems.push(...guideViewContractProblems(html, 'public guide', { intakeModel: intake }));
    for (const forbidden of publicGuideForbiddenStrings()) {
      if (forbidden && html.includes(forbidden)) problems.push(`public guide contains unsanitized private string: ${forbidden}`);
    }
  }
  if (!existsSync(dashboardPath)) {
    problems.push('.codex/dashboard/index.html is missing; run npm run workflow:dashboard.');
  } else {
    const html = readFileSync(dashboardPath, 'utf8');
    if (!html.includes(`name="${guideMetaName('version')}" content="${PUBLIC_GUIDE_VERSION}"`)) problems.push('dashboard guide version is stale; regenerate index.html.');
    if (htmlMetaContent(html, guideMetaName('sourceHash')) !== expectedHash) problems.push('dashboard source hash is stale; regenerate index.html.');
    if (htmlMetaContent(html, guideMetaName('recordFeedHash')) !== expectedRecordFeedHash) problems.push('dashboard record feed hash is stale; regenerate index.html.');
    if (!guideContentHashOk(html)) problems.push('dashboard content hash is stale or was edited outside the generator; regenerate index.html.');
    if (htmlMetaContent(html, guideMetaName('tokenSource')) !== GUIDE_TOKEN_SOURCE_LABEL) problems.push('dashboard does not declare production token source.');
      problems.push(...workIntakeGuideContractProblems(html, 'dashboard', intake));
    }
  if (!quiet) {
    console.log(`guide problems: ${problems.length}`);
    for (const problem of problems) console.log(`- ${problem}`);
  }
  return problems.length === 0;
}

function markdownSection(text, heading) {
  const pattern = new RegExp(`^##\\s+${heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'im');
  const match = pattern.exec(text);
  if (!match) return '';
  const rest = text.slice(match.index + match[0].length);
  const next = rest.search(/^##\s+/m);
  return next >= 0 ? rest.slice(0, next) : rest;
}

function handoverProblems(text = undefined) {
  const usingDefaultText = text === undefined || text === null;
  if (usingDefaultText) text = readText('.codex/workflow/current-state.md');
  const problems = [];
  if (/Latest gate records for current worktree hash/i.test(text)) {
    problems.push('current-state.md labels fixed record links as latest/current-hash data; use stable wording and let the dashboard/status command show live state.');
  }
  if (/Final workflow-record commit pulled on server:\s*`?[0-9a-f]{7,40}`?/i.test(text)) {
    problems.push('current-state.md records a final workflow-record commit hash that can stale itself when the handover fix is committed; refer to branch HEAD instead.');
  }
  if (/final workflow[-\s]record commit/i.test(text) || /final handover commit/i.test(text)) {
    problems.push('current-state.md uses final-commit wording that can become stale when records or handover fixes are committed.');
  }
  const staleFinalizationPhrases = [
    /Regenerate `?\.codex\/dashboard\/index\.html`? after this state update/i,
    /Commit and push the deployment evidence update/i,
    /Pull the deployment-evidence commit on the server/i,
    /Record this deployment evidence under `?\.codex\/workflow\/records\/deployments\/`?/i,
    /commit\/push\/pull this handover update/i,
    /commit, push,? and pull this handover update/i,
    /finalize this handover commit/i,
  ];
  if (staleFinalizationPhrases.some((pattern) => pattern.test(text))) {
    problems.push('current-state.md still lists finalization bookkeeping tasks that should be finished before handover or moved to risks.');
  }
  if (usingDefaultText) {
    try {
      const stateMtime = statSync(join(CODEX, 'workflow', 'current-state.md')).mtimeMs;
      const patchState = loadJson(PATCH_STATE_FILE, {});
      const changedAt = patchState.lastChangedAt ? Date.parse(patchState.lastChangedAt) : 0;
      const handoverWasPartOfPatch = (patchState.files || []).some((file) => file.replaceAll('\\', '/') === '.codex/workflow/current-state.md');
      if (changedAt && !handoverWasPartOfPatch && stateMtime + 1000 < changedAt) {
        problems.push('current-state.md is older than the latest patch-state change; update the compact handover after substantive work.');
      }
    } catch {
      // Missing current-state is handled by validate required-file checks.
    }
  }
  return problems;
}

function commandHandoverCheck(args = {}) {
  const quiet = Boolean(args.quiet);
  const targetText = args.file ? readFileSync(resolve(ROOT, String(args.file)), 'utf8') : undefined;
  const problems = handoverProblems(targetText);
  if (!quiet) {
    console.log(`handover problems: ${problems.length}`);
    for (const problem of problems) console.log(`- ${problem}`);
  }
  return problems.length === 0;
}

function routingDecision(scenario) {
  if (scenario.integratedReview) return 'integrated-review';
  if (scenario.reviewOnly || scenario.designReview || scenario.patternReview) return 'review';
  if (scenario.researchOnly) return 'research';
  if (scenario.leadOnly) return 'lead';
  if (scenario.sparkStarted && (
    scenario.testsFailed ||
    scenario.scopeCreep ||
    scenario.weakOutput ||
    scenario.stalled ||
    scenario.timeboxExceeded ||
    scenario.needsArchitecture ||
    scenario.needsVisualJudgment ||
    scenario.missingVerification ||
    scenario.outOfScopeDiscovery
  )) return 'escalate';
  const strongSignals = requiredPolicyNestedArray('routing', 'strongSignals').map(String);
  if (strongSignals.some((key) => scenario[key])) return 'strong';
  const sparkSignals = requiredPolicyNestedArray('routing', 'sparkPositiveSignals').map(String);
  if (sparkSignals.every((key) => scenario[key])) return 'spark';
  return 'strong';
}

function modelRoutingScenarioResult(scenario) {
  const schemaProblems = [];
  if (!scenario.id) schemaProblems.push('missing id');
  if (!scenario.summary) schemaProblems.push('missing summary');
  if (!scenario.expectedRoute) schemaProblems.push('missing expectedRoute');
  if ((scenario.expectedRoute || '').startsWith('escalate') && !scenario.expectedFallbackTarget) schemaProblems.push('escalation scenario missing expectedFallbackTarget');
  const actual = canonicalRouteName(routingDecision(scenario));
  const expected = canonicalRouteName(scenario.expectedRoute);
  const defaultFallbackTarget = escalationWorkerId();
  const fallbackOk = !String(expected || '').startsWith('escalate') || scenario.expectedFallbackTarget === (scenario.fallbackTarget || defaultFallbackTarget);
  if (!fallbackOk) schemaProblems.push(`expectedFallbackTarget ${scenario.expectedFallbackTarget} does not match fallbackTarget ${scenario.fallbackTarget || defaultFallbackTarget}`);
  return {
    actual,
    expected,
    schemaProblems,
    ok: schemaProblems.length === 0 && actual === expected,
  };
}

function commandModelRoutingCheck(args = {}) {
  const scenarios = loadJson(ROUTING_SCENARIOS_FILE, []);
  let failures = 0;
  for (const scenario of scenarios) {
    const result = modelRoutingScenarioResult(scenario);
    if (!args.quiet) console.log(`${result.ok ? 'PASS' : 'FAIL'} ${scenario.id}: expected ${result.expected}, got ${result.actual}${result.schemaProblems.length ? ` (${result.schemaProblems.join('; ')})` : ''}`);
    if (!result.ok) failures++;
  }
  if (!args.quiet) console.log(`model routing scenarios: ${scenarios.length}, failures: ${failures}`);
  return failures === 0;
}

function workflowSelfTestChecks() {
  const checks = [];
  const add = (name, ok) => checks.push({ name, ok: Boolean(ok) });
  const workflowEvidence = (idPrefix, { audit = false } = {}) => {
    const scripts = [
      'workflow:policy-check',
      'workflow:self-test',
      audit ? 'workflow:trace-check' : '',
      'workflow:guide-check',
      'workflow:guide-browser-check',
      'workflow:zoo-visual-guide-check',
    ].filter(Boolean);
    return {
      commandIds: scripts.map((script) => `${idPrefix}-${slug(script)}`),
      commandEvidence: scripts.map((script) => ({
        id: `${idPrefix}-${slug(script)}`,
        command: ['npm', 'run', script],
        exitCode: 0,
        timedOut: false,
      })),
    };
  };
  const branchFixtureFiles = ['.codex/scripts/nexus-workflow.mjs'];
  const branchRecord = (extra = {}) => ({
    branchHash: 'branch-hash',
    scope: 'branch',
    files: branchFixtureFiles,
    branchFiles: branchFixtureFiles,
    ...extra,
  });
  const withProjectTempArtifact = (content, fn) => {
    const dir = mkdtempSync(join(ROOT, '.codex', 'workflow', 'artifacts', 'screenshots', 'guide-browser-final', 'artifact-proof-'));
    const path = join(dir, 'artifact.json');
    const rel = relative(ROOT, path).replaceAll('\\', '/');
    try {
      writeFileSync(path, content);
      return fn({ path, rel });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  };
  const fixtureHandoverCheck = (name, text, expectedOk) => {
    const dir = mkdtempSync(join(tmpdir(), 'nexus-workflow-self-test-'));
    ensureDir(dir);
    const path = join(dir, `${slug(name)}.md`);
    writeFileSync(path, text);
    const script = process.argv[1] ? resolve(process.argv[1]) : join(CODEX, 'scripts', 'nexus-workflow.mjs');
    const result = spawnSync(process.execPath, [script, 'handover-check', '--file', path], {
      cwd: ROOT,
      encoding: 'utf8',
    });
    rmSync(path, { force: true });
    try {
      if (!readdirSync(dir).length) rmSync(dir, { recursive: true, force: true });
    } catch {
      // Best-effort cleanup for read-only self-test fixtures.
    }
    return expectedOk ? result.status === 0 : result.status !== 0;
  };
  add('handover rejects stale next-work commit task', handoverProblems('## Next Required Work\n\n- Commit and push the deployment evidence update.\n').length > 0);
  add('handover rejects exact final workflow commit hash', handoverProblems('## Server\n\n- Final workflow-record commit pulled on server: `abc1234`\n').length > 0);
  add('handover rejects final workflow record wording without hyphen', handoverProblems('## Server\n\n- Final workflow record commit: `abc1234`\n').length > 0);
  add('handover rejects final handover commit wording', handoverProblems('## Server\n\n- Final handover commit: `abc1234`\n').length > 0);
  add('handover rejects commit/push/pull handover next work', handoverProblems('## Next Required Work\n\n- commit/push/pull this handover update.\n').length > 0);
  add('handover rejects commit/push/pull handover outside next work', handoverProblems('## Deployment\n\n- commit/push/pull this handover update.\n\n## Next Required Work\n\nNo mandatory migration step remains.\n').length > 0);
  add('handover accepts stable branch-head wording', handoverProblems('## Next Required Work\n\nNo mandatory migration step remains.\n\n## Server\n\nPost-deployment workflow-record commits were pulled on the server after runtime validation. Check branch HEAD for the exact latest commit.\n').length === 0);
  add('handover CLI fixture rejects stale finalization', fixtureHandoverCheck('bad-handover', '## Deployment\n\n- Final handover commit: `abc1234`\n', false));
  add('handover CLI fixture accepts stable current state', fixtureHandoverCheck('good-handover', '## Next Required Work\n\nNo mandatory migration step remains.\n\n## Server\n\nCheck branch HEAD for the exact latest commit.\n', true));
  add('record-test command stays retired', (() => {
    const script = process.argv[1] ? resolve(process.argv[1]) : join(CODEX, 'scripts', 'nexus-workflow.mjs');
    const result = spawnSync(process.execPath, [script, 'record-test', '--summary', 'self-test retired command'], {
      cwd: ROOT,
      encoding: 'utf8',
    });
    return result.status === 2 && String(result.stderr || result.stdout || '').includes('record-test is retired');
  })());
  add('workflow command help is non-mutating before command execution', hasTopLevelHelp(['--help']) && helpTextForCommand('record-patch').includes('record-patch --summary'));
  add('workflow command help ignores child command args after separator', !hasTopLevelHelp(['--id', 'fixture', '--', 'node', '--help']));
  add('record schemas are policy-driven for every record kind', RECORD_KINDS.every((kind) => recordSchema(kind) === POLICY.records?.schemaByKind?.[kind]));
  add('record prefixes are policy-driven for every record kind', RECORD_KINDS.every((kind) => recordPrefix(kind) === POLICY.records?.prefixByKind?.[kind]));
  add('work intake records are protected evidence', EVIDENCE_RECORD_KINDS.includes(INTENT_RECORD_KIND) && EVIDENCE_RECORD_KINDS.includes(WORK_SLICE_RECORD_KIND));
  add('work intake records are visible in generated guide records', GUIDE_RECORD_KINDS.includes(INTENT_RECORD_KIND) && GUIDE_RECORD_KINDS.includes(WORK_SLICE_RECORD_KIND));
  add('pattern proposals are protected evidence', EVIDENCE_RECORD_KINDS.includes('pattern-proposals'));
  add('guide browser validation is protected evidence', EVIDENCE_RECORD_KINDS.includes('guide-browser'));
  add('state cache evidence rejects missing durable record', evidenceRecordProblems('reviews', 'REVIEW-DOES-NOT-EXIST', { verdict: 'pass' }, 'fixture review state').length > 0);
  add('generated guide artifacts are non-substantive but trigger guide gates', substantiveFiles(['.codex/dashboard/public.html', '.codex/dashboard/index.html']).length === 0
    && guideRelevantFiles(['.codex/dashboard/public.html', '.codex/dashboard/index.html']).length === 2);
  add('visual zoo guide artifacts are non-substantive but trigger visual gates', substantiveFiles(['.codex/dashboard/zoo/index.html', '.codex/dashboard/zoo/assets/button.jpg']).length === 0
    && zooVisualRelevantFiles(['.codex/dashboard/zoo/index.html', '.codex/dashboard/zoo/assets/button.jpg']).length === 2);
  add('guide source hash is content based', /^[a-f0-9]{24}$/.test(publicGuideSourceHash()));
  add('required guide source hash inputs come from policy', requiredGuideSourceFiles().length > 0 && requiredGuideSourceFiles().every((file) => publicGuideInputFiles().includes(file)));
  add('verification knowledge is required workflow manifest', requiredWorkflowFiles().includes('.codex/knowledge/verification.md'));
  add('policy manifest is required workflow manifest', requiredWorkflowFiles().includes('.codex/workflow/policy/manifest.json'));
  add('work intake policy is required workflow manifest', requiredWorkflowFiles().includes('.codex/workflow/policy/intake.json'));
  add('work intake templates are required workflow manifest', requiredWorkflowFiles().includes('.codex/workflow/templates/intent.md') && requiredWorkflowFiles().includes('.codex/workflow/templates/work-slice.md'));
  add('workflow profile is required workflow manifest', requiredWorkflowFiles().includes('.codex/workflow/profile.json'));
  add('workflow engine is required workflow manifest', requiredWorkflowFiles().includes('.codex/scripts/workflow-engine.mjs'));
  add('workflow kernel is required workflow manifest', requiredWorkflowFiles().includes('.codex/scripts/nexus-workflow.mjs'));
  add('workflow bootstrap template is required workflow manifest', requiredWorkflowFiles().includes('.codex/workflow/templates/project-bootstrap.md'));
  add('guide policy declares every required public-guide source input', requiredGuideSourceFiles().every((file) => POLICY.guide?.sourceFiles?.includes(file) || publicGuideInputFiles().includes(file)));
  add('workflow policy files are substantive changes', substantiveFiles(['.codex/workflow/policy/files.json']).length === 1);
  add('review kind policy classifies workflow policy changes', requiredReviewKinds(['.codex/workflow/policy/files.json']).includes('workflow'));
  add('review kind policy classifies design source changes', requiredReviewKinds([designTokenSourceFile()]).includes('design'));
  add('review kind policy classifies design policy changes', requiredReviewKinds(['.codex/workflow/policy/design.json']).includes('design'));
  add('review kind policy classifies pattern-sensitive changes', requiredReviewKinds(['.codex/knowledge/patterns.md']).includes('pattern'));
  add('review kind policy classifies workflow policy contract changes as pattern-sensitive', [
    '.codex/workflow/policy/manifest.json',
    '.codex/workflow/policy/guide.json',
    '.codex/workflow/policy/records.json',
  ].every((file) => requiredReviewKinds([file]).includes('pattern')));
  add('branch review policy classifies pattern-sensitive changes', requiredBranchReviewKinds(['packages/api/src/modules/orders/service.ts']).includes('pattern'));
  add('branch review policy classifies api route boundary changes', requiredBranchReviewKinds(['packages/api/src/routes/tenant-settings/service.ts']).includes('pattern'));
  add('branch review policy classifies shared contract changes', requiredBranchReviewKinds(['packages/shared/src/constants.ts']).includes('pattern'));
  add('audit classifier includes api route boundary changes', auditRelevantFiles(['packages/api/src/routes/tenant-settings/service.ts']).length === 1);
  add('audit classifier includes shared contract changes', auditRelevantFiles(['packages/shared/src/constants.ts']).length === 1);
  add('verification classifier includes shared contract changes', verificationRelevantFiles(['packages/shared/src/constants.ts']).length === 1);
  add('audit evidence mirrors project build and design verification classes', policyProblems().every((problem) => !problem.includes('auditMirrorsVerificationRules'))
    && ['unit-tests', 'build'].every((className) => requiredEvidenceClassesForFiles(['packages/shared/src/constants.ts'], 'audit').includes(className))
    && ['design-lint', 'theme-settings-preview-check'].every((className) => requiredEvidenceClassesForFiles(['packages/web/src/platform/theme/tokens.css'], 'audit').includes(className)));
  add('visual zoo capture asserts themed parity showcases', Array.isArray(POLICY.design?.zooVisualCapture?.interactiveShowcases?.['themed-empty-state']?.expectedTexts)
    && Array.isArray(POLICY.design?.zooVisualCapture?.interactiveShowcases?.['themed-toast']?.expectedTexts));
  add('workflow research reports participate in public guide source hash', publicGuideInputFiles().some((file) => file.startsWith('.codex/workflow/research/') && file.endsWith('.md')));
  add('workflow policy check passes current policy pack', policyProblems().length === 0);
  add('workflow policy pins package script command bodies', packageScriptContractProblems().length === 0);
  add('workflow policy rejects package script bypasses', (() => {
    const scripts = { ...packageWorkflowScripts(), 'workflow:release-gate': 'node .codex/scripts/nexus-workflow.mjs validate' };
    return packageScriptContractProblems({ scripts }).some((problem) => problem.includes('workflow:release-gate'));
  })());
  add('workflow policy pins CI workflow commands', ciWorkflowContractProblems().length === 0);
  add('workflow policy rejects CI command bypasses', ciWorkflowContractProblems({
    text: readText('.github/workflows/nexus-workflow-gates.yml').replace('npm run workflow:release-gate', 'npm run workflow:status'),
  }).some((problem) => problem.includes('ci-release-gate')));
  add('workflow policy ignores commented CI command decoys', ciWorkflowContractProblems({
    text: `name: fake\njobs:\n  x:\n    steps:\n      - run: echo bypass\n      # run: ${POLICY.gates.ciWorkflowCommands[0]}\n`,
    expected: [POLICY.gates.ciWorkflowCommands[0]],
  }).some((problem) => problem.includes(POLICY.gates.ciWorkflowCommands[0])));
  add('codex inventory check passes current workflow tree', inventoryProblems().length === 0);
  add('codex inventory rejects stray legacy script extensions', inventoryProblems({ files: ['.codex/scripts/old-hook.sh'], tracked: [] }).some((problem) => problem.includes('old-hook.sh')));
  add('codex inventory rejects unmanaged workflow root files', inventoryProblems({ files: ['.codex/workflow/legacy-profile.json'], tracked: [] }).some((problem) => problem.includes('legacy-profile.json')));
  add('workflow trace check passes current telemetry shape', commandTraceProblems().length === 0);
  add('workflow profile contract passes current profile', profileContractProblems().length === 0);
  add('workflow profile contract rejects empty profile', profileContractProblems({}).length > 0);
  add('canonical ladder comes from gates policy', sameStringSet(canonicalLadder(POLICY), POLICY.gates?.canonicalLadder || []));
  add('canonical ladder package scripts exist', canonicalLadder().every((script) => Object.hasOwn(packageWorkflowScripts(), script)));
  add('public guide uses deployment policy visual zoo URL', PUBLIC_ZOO_GUIDE_URL === POLICY.deployment?.visualZooGuideUrl);
  add('deployment records do not self-stale public guide source hash', !publicGuideInputFiles().some((file) => file.startsWith('.codex/workflow/records/deployments/')));
  add('deployment records remain displayable guide records', GUIDE_RECORD_KINDS.includes('deployments'));
  add('self-referential guide evidence exclusions are policy-owned', selfReferentialEvidenceKinds().has('deployments') && !guideTraceEvidenceKinds().includes('deployments'));
  add('display-only guide record kinds have a public notice', (POLICY.guide?.displayOnlyRecordKinds || []).includes('deployments') && Boolean(POLICY.guide?.displayOnlyRecordNotice));
  add('deployment guide artifact metadata rejects per-file drift', (() => {
    const meta = deploymentGuideArtifactMeta();
    const altered = {
      ...meta,
      files: meta.files.map((file, index) => index === 0 ? { ...file, sha256: 'bad-hash' } : file),
    };
    return guideDeploymentProblems({ id: 'DEPLOYMENT-fixture', guideArtifactHash: guideArtifactHash(), guideArtifacts: altered })
      .some((problem) => problem.includes('public.html.sha256'));
  })());
  add('deployment target policy rejects unrelated hosts', deploymentTargetProblems('https://example.invalid/nexus/', 'fixture target').some((problem) => problem.includes('outside allowed')));
  add('work intake rejects invalid intent status', intakeProblemsForState({
    intents: [{ id: 'INTENT-test', kind: 'feature', status: 'mystery', summary: 'bad' }],
  }).some((problem) => problem.includes('unsupported intent status')));
  add('work intake rejects work slice without source intent', intakeProblemsForState({
    workSlices: [{ id: 'WORK-SLICE-test', status: 'active', summary: 'orphan', acceptance: 'done', sourceType: 'user-intent' }],
  }).some((problem) => problem.includes('must link to at least one intentId')));
  add('work intake accepts maintenance source without user intent', intakeProblemsForState({
    workSlices: [{ id: 'WORK-SLICE-maint', status: 'active', summary: 'maintenance', acceptance: 'done', sourceType: 'workflow-maintenance', created: nowIso() }],
  }).length === 0);
  add('work intake rejects unsupported source type', intakeProblemsForState({
    workSlices: [{ id: 'WORK-SLICE-bad-source', status: 'active', summary: 'bad source', acceptance: 'done', sourceType: 'unknown-source', created: nowIso() }],
  }).some((problem) => problem.includes('unsupported sourceType')));
  add('work intake rejects patch without work slice for current substantive hash', intakeProblemsForState({
    patches: [{ id: 'PATCH-test', worktreeHash: 'hash', files: ['packages/web/src/components/ui/Button.tsx'] }],
  }, { currentHash: 'hash' }).some((problem) => problem.includes('has no workSliceIds')));
  add('work intake accepts linked patch for current substantive hash', intakeProblemsForState({
    intents: [{ id: 'INTENT-ok', kind: 'feature', status: 'accepted', summary: 'ok' }],
    workSlices: [{ id: 'WORK-SLICE-ok', status: 'active', intentIds: ['INTENT-ok'], summary: 'slice', acceptance: 'done', created: nowIso() }],
    patches: [{ id: 'PATCH-ok', worktreeHash: 'hash', files: ['packages/web/src/components/ui/Button.tsx'], workSliceIds: ['WORK-SLICE-ok'] }],
  }, { currentHash: 'hash' }).length === 0);
  add('work intake rejects current verification evidence without work slice', intakeProblemsForState({
    tests: [{ id: 'TEST-unlinked', verdict: 'pass', worktreeHash: 'hash' }],
  }, { currentHash: 'hash' }).some((problem) => problem.includes('tests record TEST-unlinked') && problem.includes('no workSliceIds')));
  add('work intake rejects current audit evidence without work slice', intakeProblemsForState({
    audits: [{ id: 'AUDIT-unlinked', verdict: 'pass', worktreeHash: 'hash' }],
  }, { currentHash: 'hash' }).some((problem) => problem.includes('audits record AUDIT-unlinked') && problem.includes('no workSliceIds')));
  add('work intake rejects branch deployment evidence without work slice', intakeProblemsForState({
    deployments: [{ id: 'DEPLOY-unlinked', verdict: 'pass', branchHash: 'branch-hash' }],
  }, { branch: { hash: 'branch-hash', files: ['packages/web/src/App.tsx'] } }).some((problem) => problem.includes('deployments record DEPLOY-unlinked') && problem.includes('no workSliceIds')));
  add('work intake rejects done slice without evidence', intakeProblemsForState({
    intents: [{ id: 'INTENT-done', kind: 'feature', status: 'accepted', summary: 'done' }],
    workSlices: [{ id: 'WORK-SLICE-done', status: 'done', intentIds: ['INTENT-done'], summary: 'done slice', acceptance: 'done', files: ['packages/web/src/components/ui/Button.tsx'], created: nowIso() }],
  }).filter((problem) => problem.includes('WORK-SLICE-done')).length >= 3);
  add('work intake derives verification relevance from linked patch files', intakeProblemsForState({
    intents: [{ id: 'INTENT-derived', kind: 'feature', status: 'accepted', summary: 'derived' }],
    workSlices: [{ id: 'WORK-SLICE-derived', status: 'done', intentIds: ['INTENT-derived'], summary: 'derived slice', acceptance: 'done', files: [], created: nowIso() }],
    patches: [{ id: 'PATCH-derived', files: ['packages/web/src/components/ui/Button.tsx'], workSliceIds: ['WORK-SLICE-derived'] }],
    reviews: [{ id: 'REVIEW-derived', verdict: 'pass', workSliceIds: ['WORK-SLICE-derived'] }],
    audits: [{ id: 'AUDIT-derived', verdict: 'pass', workSliceIds: ['WORK-SLICE-derived'] }],
  }).some((problem) => problem.includes('WORK-SLICE-derived changes verification-relevant files')));
  add('work intake accepts done slice with linked evidence', intakeProblemsForState({
    intents: [{ id: 'INTENT-done-ok', kind: 'feature', status: 'accepted', summary: 'done ok' }],
    workSlices: [{ id: 'WORK-SLICE-done-ok', status: 'done', intentIds: ['INTENT-done-ok'], summary: 'done slice', acceptance: 'done', files: ['packages/web/src/components/ui/Button.tsx'], created: nowIso() }],
    patches: [{ id: 'PATCH-done-ok', files: ['packages/web/src/components/ui/Button.tsx'], workSliceIds: ['WORK-SLICE-done-ok'] }],
    reviews: [{ id: 'REVIEW-done-ok', verdict: 'pass', workSliceIds: ['WORK-SLICE-done-ok'] }],
    tests: [{ id: 'TEST-done-ok', verdict: 'pass', workSliceIds: ['WORK-SLICE-done-ok'] }],
    audits: [{ id: 'AUDIT-done-ok', verdict: 'pass', workSliceIds: ['WORK-SLICE-done-ok'] }],
  }).length === 0);
  add('work intake rejects branch release with active linked slice', intakeProblemsForState({
    intents: [{ id: 'INTENT-branch', kind: 'feature', status: 'accepted', summary: 'branch' }],
    workSlices: [{ id: 'WORK-SLICE-branch', status: 'active', intentIds: ['INTENT-branch'], summary: 'branch slice', acceptance: 'done', created: nowIso() }],
    patches: [{ id: 'PATCH-branch', branchHash: 'branch-hash', files: ['packages/web/src/App.tsx'], workSliceIds: ['WORK-SLICE-branch'] }],
  }, { branch: { hash: 'branch-hash', files: ['packages/web/src/App.tsx'] } }).some((problem) => problem.includes('is not closed')));
  add('work intake accepts branch release with closed linked slice and proof', intakeProblemsForState({
    intents: [{ id: 'INTENT-branch-ok', kind: 'feature', status: 'accepted', summary: 'branch ok' }],
    workSlices: [{ id: 'WORK-SLICE-branch-ok', status: 'done', intentIds: ['INTENT-branch-ok'], summary: 'branch slice', acceptance: 'done', created: nowIso() }],
    patches: [{ id: 'PATCH-branch-ok', branchHash: 'branch-hash', files: ['packages/web/src/App.tsx'], workSliceIds: ['WORK-SLICE-branch-ok'] }],
    reviews: [{ id: 'REVIEW-branch-ok', verdict: 'pass', branchHash: 'branch-hash', workSliceIds: ['WORK-SLICE-branch-ok'] }],
    tests: [{ id: 'TEST-branch-ok', verdict: 'pass', branchHash: 'branch-hash', workSliceIds: ['WORK-SLICE-branch-ok'] }],
    audits: [{ id: 'AUDIT-branch-ok', verdict: 'pass', branchHash: 'branch-hash', workSliceIds: ['WORK-SLICE-branch-ok'] }],
  }, { branch: { hash: 'branch-hash', files: ['packages/web/src/App.tsx'] } }).length === 0);
  add('work intake rejects stale active slices', intakeProblemsForState({
    intents: [{ id: 'INTENT-stale', kind: 'feature', status: 'accepted', summary: 'stale' }],
    workSlices: [{ id: 'WORK-SLICE-stale', status: 'active', intentIds: ['INTENT-stale'], summary: 'stale slice', acceptance: 'done', created: '2020-01-01T00:00:00.000Z' }],
  }, { now: Date.parse('2020-02-01T00:00:00.000Z') }).some((problem) => problem.includes('31 days')));
  add('work intake rejects stale blocked slices', intakeProblemsForState({
    intents: [{ id: 'INTENT-stale-blocked', kind: 'feature', status: 'accepted', summary: 'stale blocked' }],
    workSlices: [{ id: 'WORK-SLICE-stale-blocked', status: 'blocked', intentIds: ['INTENT-stale-blocked'], summary: 'stale blocked slice', created: '2020-01-01T00:00:00.000Z' }],
  }, { now: Date.parse('2020-02-01T00:00:00.000Z') }).some((problem) => problem.includes('31 days')));
  add('work intake rejects invalid external refs', intakeProblemsForState({
    intents: [{ id: 'INTENT-ext', kind: 'feature', status: 'accepted', summary: 'external', externalRefs: ['slack:123'] }],
  }).some((problem) => problem.includes('allowed prefix')));
  add('work intake write preflight rejects missing parent intents', intakeIntentWriteProblems({
    parentIntentIds: ['INTENT-missing'],
  }, { intentIds: ['INTENT-existing'] }).some((problem) => problem.includes('INTENT-missing')));
  add('work intake write preflight rejects missing source intents', intakeWorkSliceWriteProblems({
    intentIds: ['INTENT-missing'],
  }, { intentIds: ['INTENT-existing'], workSliceIds: ['WORK-SLICE-existing'] }).some((problem) => problem.includes('INTENT-missing')));
  add('work intake write preflight rejects missing related work slices', intakeWorkSliceWriteProblems({
    intentIds: ['INTENT-existing'],
    updatesWorkSliceId: 'WORK-SLICE-missing',
    supersedesWorkSliceIds: ['WORK-SLICE-old-missing'],
    blockedByWorkSliceIds: ['WORK-SLICE-blocker-missing'],
  }, { intentIds: ['INTENT-existing'], workSliceIds: ['WORK-SLICE-existing'] }).length === 3);
  add('work intake write preflight rejects invalid external refs', intakeWorkSliceWriteProblems({
    intentIds: ['INTENT-existing'],
    externalRefs: ['slack:123'],
  }, { intentIds: ['INTENT-existing'], workSliceIds: [] }).some((problem) => problem.includes('allowed prefix')));
  add('work intake guide renders linked trace and feature catalog semantics', (() => {
    const intents = [{ id: 'INTENT-guide', kind: 'feature', status: 'accepted', summary: 'Guide feature' }];
    const workSlices = [{ id: 'WORK-SLICE-guide', rootId: 'WORK-SLICE-guide', status: 'done', intentIds: ['INTENT-guide'], summary: 'Guide slice', acceptance: 'done', owner: 'codex-lead', created: nowIso() }];
    const index = workSliceIndex(workSlices);
    const model = {
      intents,
      workSlices,
      latestSlices: workSlices,
      intentById: new Map(intents.map((record) => [record.id, record])),
      inbox: intents,
      activeSlices: [],
      index,
      warnings: [],
      evidence: {
        patches: [{ id: 'PATCH-guide', workSliceIds: ['WORK-SLICE-guide'], summary: 'patch' }],
        routing: [],
        reviews: [{ id: 'REVIEW-guide', workSliceIds: ['WORK-SLICE-guide'], verdict: 'pass', summary: 'review' }],
        tests: [{ id: 'TEST-guide', workSliceIds: ['WORK-SLICE-guide'], verdict: 'pass', summary: 'verify' }],
        audits: [],
        deployments: [],
      },
    };
    const html = workIntakeHtml(model, escapeHtml);
    return html.includes('data-work-intake-trace-row="WORK-SLICE-guide"')
      && html.includes('data-work-intake-trace-intent="INTENT-guide"')
      && html.includes('data-work-intake-evidence-id="PATCH-guide"')
      && html.includes('data-work-intake-feature="INTENT-guide"')
      && workIntakeGuideContractProblems(html, 'fixture', model).length === 0;
  })());
  add('work intake guide trace omits self-referential deployment proof', (() => {
    const intents = [{ id: 'INTENT-deploy-guide', kind: 'feature', status: 'accepted', summary: 'Deploy guide' }];
    const workSlices = [{ id: 'WORK-SLICE-deploy-guide', rootId: 'WORK-SLICE-deploy-guide', status: 'done', intentIds: ['INTENT-deploy-guide'], summary: 'Deploy slice', acceptance: 'done', owner: 'codex-lead', created: nowIso() }];
    const model = {
      intents,
      workSlices,
      latestSlices: workSlices,
      intentById: new Map(intents.map((record) => [record.id, record])),
      inbox: [],
      activeSlices: [],
      index: workSliceIndex(workSlices),
      warnings: [],
      evidence: Object.fromEntries(WORK_INTAKE_EVIDENCE_KINDS.map((kind) => [kind, []])),
    };
    model.evidence.deployments = [{ id: 'DEPLOYMENT-guide-self', workSliceIds: ['WORK-SLICE-deploy-guide'], verdict: 'pass', summary: 'deployment' }];
    const html = workIntakeHtml(model, escapeHtml);
    return !guideTraceEvidenceKinds().includes('deployments')
      && !html.includes('data-work-intake-evidence-id="DEPLOYMENT-guide-self"')
      && html.includes('Self-referential evidence kinds are omitted')
      && html.includes('trace evidence:0')
      && workIntakeGuideContractProblems(html, 'fixture', model).length === 0;
  })());
  add('work intake guide fallback omits self-referential proof when trace list is empty', (() => {
    const original = INTAKE_POLICY.guide.traceEvidenceKinds;
    try {
      INTAKE_POLICY.guide.traceEvidenceKinds = [];
      return !guideTraceEvidenceKinds().includes('deployments');
    } finally {
      INTAKE_POLICY.guide.traceEvidenceKinds = original;
    }
  })());
  add('guide check survives self-referential deployment record after guide generation', (() => {
    if (!commandGuideCheck({ quiet: true })) return false;
    const currentModel = intakeModel();
    const rootId = currentModel.latestSlices[0]?.rootId || currentModel.latestSlices[0]?.id;
    if (!rootId) return false;
    const id = `DEPLOYMENT-SELF-TEST-${process.pid}`;
    const path = join(RECORDS, 'deployments', `${id}.md`);
    const text = [
      '---',
      'schema: "nexus-deployment/v1"',
      `id: "${id}"`,
      `created: "${nowIso()}"`,
      `target: "${PUBLIC_GUIDE_URL}"`,
      'verdict: "pass"',
      'operator: "self-test"',
      `workSliceIds: ["${rootId}"]`,
      '---',
      '',
      '# Self-test deployment record',
      '',
      'Temporary fixture proving guide checks do not require the current deployment record inside the guide trace.',
      '',
    ].join('\n');
    try {
      writeFileSync(path, text, { flag: 'wx' });
      return commandGuideCheck({ quiet: true });
    } finally {
      rmSync(path, { force: true });
    }
  })());
  add('work intake guide contract rejects label-only trace surface', (() => {
    const intents = [{ id: 'INTENT-label', kind: 'feature', status: 'accepted', summary: 'Label only' }];
    const workSlices = [{ id: 'WORK-SLICE-label', rootId: 'WORK-SLICE-label', status: 'active', intentIds: ['INTENT-label'], summary: 'Label slice', acceptance: 'done', owner: 'codex-lead', created: nowIso() }];
    const model = {
      intents,
      workSlices,
      latestSlices: workSlices,
      intentById: new Map(intents.map((record) => [record.id, record])),
      inbox: intents,
      activeSlices: workSlices,
      index: workSliceIndex(workSlices),
      warnings: [],
      evidence: { patches: [], routing: [], reviews: [], tests: [], audits: [], deployments: [] },
    };
    return workIntakeGuideContractProblems('Work Intake Work Intake Inbox Active Work Slices Intent Trace Graph Feature Catalog Work Intake Warnings', 'fixture', model).length > 0;
  })());
  add('cheap status gates use cached state instead of full evidence scan', cachedGatePass({ worktreeHash: 'h', verdict: 'pass' }, 'h', ['x'])
    && !cachedGatePass({ worktreeHash: 'old', verdict: 'pass' }, 'h', ['x'])
    && cachedRoutingOk({ routingId: 'ROUTING-test', status: 'completed', worktreeHash: 'old' }, 'h')
    && !cachedRoutingOk({ routingId: 'ROUTING-test', status: 'active', worktreeHash: 'old' }, 'h'));
  add('visual zoo source hash is content based', /^[a-f0-9]{24}$/.test(zooVisualSourceHash()));
  add('design guide paths are policy-owned, not script literals', (() => {
    const scriptText = readFileSync(resolve(process.argv[1] || join(CODEX, 'scripts', 'nexus-workflow.mjs')), 'utf8');
    const registryLiteral = ['packages/web/src/components', 'registry.json'].join('/');
    const themeDirLiteral = ['packages/web/src/platform/theme', 'themes'].join('/');
    return !scriptText.includes(`"${registryLiteral}"`)
      && !scriptText.includes(`'${registryLiteral}'`)
      && !scriptText.includes(`"${themeDirLiteral}"`)
      && !scriptText.includes(`'${themeDirLiteral}'`)
      && DESIGN_REGISTRY_PATH === POLICY.design.registryPath
      && DESIGN_ZOO_ROUTE_PATH === POLICY.design.zooRoutePath
      && DESIGN_THEME_DIRECTORY_PATH === POLICY.design.themeDirectoryPath;
  })());
  add('design theme names follow injected policy directories', sameStringSet(
    designThemeNames({}, {
      themeDirectoryPath: 'custom/theme-source',
    }, (path) => (path === 'custom/theme-source' ? ['policy-theme-b', 'policy-theme-a'] : ['wrong-theme'])),
    ['policy-theme-a', 'policy-theme-b'],
  ));
  add('live design zoo validator consumes policy-owned route and showcase details', (() => {
    const validatorText = readText('.codex/scripts/validate-design-zoo.mjs');
    return validatorText.includes("requiredPolicyString(WORKFLOW, 'design', 'designRoute')")
      && validatorText.includes("requiredPolicyString(WORKFLOW, 'design', 'zooVisualCapture.defaultTheme')")
      && validatorText.includes('CAPTURE_POLICY.interactiveShowcases')
      && !validatorText.includes("selectOption('sichuan')")
      && !validatorText.includes('/design/toast')
      && !validatorText.includes("name: '+ Warning'")
      && !validatorText.includes('Ingredient threshold reached.');
  })());
  add('visual zoo public manifest strips local capture URLs and paths', (() => {
    const manifest = publicZooManifest({
      baseUrl: 'http://127.0.0.1:5173',
      contexts: [],
      targets: [{
        slug: 'button',
        sourceUrl: 'http://127.0.0.1:5173/design/button',
        asset: '.codex/dashboard/zoo/assets/desktop-light/button.jpg',
        sha256: 'abc',
      }],
    });
    const text = JSON.stringify(manifest);
    return !text.includes('127.0.0.1')
      && !text.includes('sourceUrl')
      && !text.includes('.codex/dashboard')
      && manifest.targets[0].asset === 'assets/desktop-light/button.jpg'
      && zooAssetProjectPath(manifest.targets[0]) === '.codex/dashboard/zoo/assets/desktop-light/button.jpg';
  })());
  add('hook config pins no-prompt custom permission mode', hookConfigProblems().filter((problem) => problem.includes('approval_policy') || problem.includes('sandbox_mode')).length === 0);
  add('hook config uses current hooks feature key', hookConfigProblems().filter((problem) => problem.includes('features.hooks')).length === 0);
  add('hook config rejects deprecated codex_hooks feature key', hookConfigProblems('sandbox_mode = "danger-full-access"\napproval_policy = "never"\n[features]\ncodex_hooks = true\nmulti_agent = true\n').some((problem) => problem.includes('features.codex_hooks')));
  add('hook config rejects deprecated windows sandbox feature key', hookConfigProblems('sandbox_mode = "danger-full-access"\napproval_policy = "never"\n[features]\nhooks = true\nenable_experimental_windows_sandbox = true\nmulti_agent = true\n').some((problem) => problem.includes('features.enable_experimental_windows_sandbox')));
  add('hook config keeps hooks as workflow-kernel triggers', hookConfigProblems().filter((problem) => problem.includes('nexus-workflow.mjs')).length === 0);
  add('hook config validates agent config wiring', configAgentProblems().length === 0);
  add('hook config rejects missing agent config files', configAgentProblems(readText('.codex/config.toml').replace('config_file = "agents/nexus-researcher.toml"', 'config_file = "agents/missing.toml"')).some((problem) => problem.includes('missing.toml')));
  add('hook config rejects inline command logic', (() => {
    const original = readText('.codex/hooks.json');
    return original.includes('run-hook.mjs') && !original.includes('node -e');
  })());
  add('hook runtime accepts tool heartbeat without startup event', (() => {
    const at = nowIso();
    const health = hookRuntimeDiagnostics({ lastSeenAt: at, events: [{ at, event: 'post-tool-use' }], lastEvent: 'post-tool-use' }, {
      runtimePolicy: { requiredEvents: [], diagnosticEvents: ['session-start'] },
    });
    return health.problems.length === 0 && health.warnings.length === 1 && hookRuntimeStatusLabel(health) === 'seen (partial startup reminder)';
  })());
  add('hook runtime still rejects missing heartbeat', hookRuntimeDiagnostics({}, {
    runtimePolicy: { requiredEvents: [], diagnosticEvents: ['session-start'] },
  }).problems.length > 0);
  add('hook runtime policy can require specific lifecycle events', (() => {
    const at = nowIso();
    return hookRuntimeDiagnostics({ lastSeenAt: at, events: [{ at, event: 'post-tool-use' }] }, {
      runtimePolicy: { requiredEvents: ['session-start'], diagnosticEvents: [] },
    }).problems.some((problem) => problem.includes('session-start'));
  })());
  add('hook patch parser extracts apply_patch header paths', sameStringSet(parsePatchFilesFromPayload({
    tool_input: '*** Begin Patch\n*** Update File: packages/web/src/App.tsx\n@@\n+ok\n*** End Patch\n',
  }), ['packages/web/src/App.tsx']));
  add('hook patch parser extracts escaped apply_patch header paths', sameStringSet(parsePatchFilesFromPayload({
    tool_input: { patch: '*** Begin Patch\n*** Update File: packages/web/src/App.tsx\n@@\n+ok\n*** End Patch\n' },
  }), ['packages/web/src/App.tsx']));
  add('hook patch parser rejects patch hunks masquerading as file_path values', parsePatchFilesFromPayload({
    tool_input: { file_path: 'packages/web/src/App.tsx\\n@@\\n+not-a-path\\n*** End Patch\\n' },
  }).length === 0);
  add('hook patch parser accepts clean file_path values', sameStringSet(parsePatchFilesFromPayload({
    tool_input: { file_path: 'packages/web/src/App.tsx' },
  }), ['packages/web/src/App.tsx']));
  add('dependency audit baseline is explicit and expiring', (() => {
    const baseline = loadJson(join(CODEX, 'workflow', 'dependency-audit-baseline.json'), {});
    return Boolean(baseline.expiresAt)
      && Array.isArray(baseline.allowed)
      && baseline.allowed.length > 0
      && baseline.allowed.every((entry) => entry.name && entry.reason && entry.followUp && entry.expiresAt && Array.isArray(entry.nodes) && Array.isArray(entry.via) && Array.isArray(entry.effects) && Array.isArray(entry.advisorySources));
  })());
  add('dependency audit baseline changes require workflow bookkeeping', substantiveFiles(['.codex/workflow/dependency-audit-baseline.json']).includes('.codex/workflow/dependency-audit-baseline.json'));
  add('dependency audit baseline changes require verification', verificationRelevantFiles(['.codex/workflow/dependency-audit-baseline.json']).includes('.codex/workflow/dependency-audit-baseline.json'));
  add('dependency audit baseline changes require audit', auditRelevantFiles(['.codex/workflow/dependency-audit-baseline.json']).includes('.codex/workflow/dependency-audit-baseline.json'));
  add('dependency audit baseline rejects mismatched chain', (() => {
    const allowance = loadJson(join(CODEX, 'workflow', 'dependency-audit-baseline.json'), {}).allowed?.find((entry) => entry.name === 'esbuild');
    return Boolean(allowance)
      && !sameStringSet(['node_modules/unrelated/esbuild'], allowance.nodes)
      && !sameStringSet(['unrelated'], allowance.effects)
      && sameStringSet(['esbuild'], allowance.via)
      && sameStringSet([1102341], allowance.advisorySources || []);
  })());
  add('legacy patch schema is limited to explicit historical records', LEGACY_SCHEMA_RECORDS.has('.codex/workflow/records/patches/PATCH-20260508T170713Z-design-system-toast-semantic-parity.md') && !LEGACY_SCHEMA_RECORDS.has('.codex/workflow/records/patches/PATCH-NEW-BAD-SCHEMA.md'));
  add('append-only history catches same-branch record rewrite', evidenceRecordHistoryProblemsFromLog([
    'commit a',
    'A\t.codex/workflow/records/reviews/REVIEW-1.md',
    'commit b',
    'M\t.codex/workflow/records/reviews/REVIEW-1.md',
  ].join('\n'), 'fixture-base').length === 1);
  add('append-only history allows newly added evidence records', evidenceRecordHistoryProblemsFromLog([
    'commit a',
    'A\t.codex/workflow/records/reviews/REVIEW-1.md',
    'commit b',
    'A\t.codex/workflow/records/tests/TEST-1.md',
  ].join('\n'), 'fixture-base').length === 0);
  add('record integrity allows staged new evidence records', evidenceStatusProblem({ status: 'A ', file: '.codex/workflow/records/tests/TEST-NEW.md' }, false) === '');
  add('record integrity rejects staged then modified new evidence records', evidenceStatusProblem({ status: 'AM', file: '.codex/workflow/records/tests/TEST-NEW.md' }, false).includes('unstaged worktree changes'));
  add('record integrity rejects untracked evidence records', untrackedEvidenceRecordProblem({ status: '??', file: '.codex/workflow/records/tests/TEST-UNTRACKED.md' }).includes('not commit-bound'));
  add('record integrity expands collapsed untracked evidence directories', mergeGitStatusWithUntrackedEntries(
    [{ status: '??', file: '.codex/workflow/records/tests/' }],
    [{ status: '??', file: '.codex/workflow/records/tests/TEST-UNTRACKED.md' }],
  ).some((entry) => entry.file.endsWith('TEST-UNTRACKED.md') && untrackedEvidenceRecordProblem(entry).includes('not commit-bound')));
  add('record integrity rejects modified committed evidence records', evidenceStatusProblem({ status: ' M', file: '.codex/workflow/records/tests/TEST-OLD.md' }, true).includes('Existing evidence record changed'));
  add('record integrity rejects staged-deleted new evidence records', evidenceStatusProblem({ status: 'AD', file: '.codex/workflow/records/tests/TEST-NEW.md' }, false).includes('unstaged worktree changes'));
  add('worktree hash is content based independent of staging state', worktreeHashFromContent(['a'], [['a', 'hash']]) === worktreeHashFromContent(['a'], [['a', 'hash']]));
  add('worktree hash changes when file content changes', worktreeHashFromContent(['a'], [['a', 'hash']]) !== worktreeHashFromContent(['a'], [['a', 'other']]));
  add('file evidence hash canonicalizes text line endings', createHash('sha256').update(canonicalTextForHash('a\r\nb\r\n')).digest('hex') === createHash('sha256').update(canonicalTextForHash('a\nb\n')).digest('hex'));
  add('guide source hash canonicalizes line endings', createHash('sha256').update(canonicalTextForHash('a\r\nb\r\n')).digest('hex') === createHash('sha256').update(canonicalTextForHash('a\nb\n')).digest('hex'));
  add('worktree-scope records do not receive branch frontmatter', Object.keys(branchScopedFrontmatter('worktree', { hash: 'branch-hash', base: 'base', mergeBase: 'merge', files: ['a'] })).length === 0);
  add('branch-scope records receive branch frontmatter', branchScopedFrontmatter('branch', { hash: 'branch-hash', base: 'base', mergeBase: 'merge', files: ['a'] }).branchHash === 'branch-hash');
  add('guide source hash excludes record feed and mutable state cache', (() => {
    const inputs = publicGuideInputFiles();
    return !inputs.some((file) => file.startsWith('.codex/workflow/state/'))
      && !inputs.some((file) => file.startsWith('.codex/workflow/runtime/'))
      && !inputs.some((file) => file.startsWith('.codex/workflow/records/'))
      && !inputs.includes(profileProjectRel('currentState'));
  })());
  add('guide record feed hash includes handover and records', guideRecordFeedFiles().includes(profileProjectRel('currentState'))
    && guideRecordFeedFiles().some((file) => file.startsWith('.codex/workflow/records/patches/')));
  add('guide shell fingerprint ignores record feed content', (() => {
    const a = `${guideMetaTag('version', 'v')}${guideMetaTag('sourceHash', 'shell')}${guideMetaTag('tokenSource', 'tokens')}<section>record A</section>`;
    const b = `${guideMetaTag('version', 'v')}${guideMetaTag('sourceHash', 'shell')}${guideMetaTag('tokenSource', 'tokens')}<section>record B</section>`;
    return JSON.stringify(guideShellFingerprint('public.html', a)) === JSON.stringify(guideShellFingerprint('public.html', b));
  })());
  add('guide project topology graph comes from policy', guidePolicyGraph('repository').nodes[0]?.label === POLICY.guide?.viewGraphs?.repository?.nodes?.[0]?.label);
  add('branch evidence check requires durable records for branch diff', (() => {
    const branch = { base: 'base', mergeBase: 'merge-base', hash: 'branch-hash', files: ['.codex/scripts/nexus-workflow.mjs'] };
    return branchEvidenceProblemsForState(branch, {
      patches: [],
      reviews: [],
      tests: [],
      audits: [],
    }).length >= 4;
  })());
  add('branch evidence check accepts matching patch review verify audit records', (() => {
    const branch = { base: 'base', mergeBase: 'merge-base', hash: 'branch-hash', files: ['.codex/scripts/nexus-workflow.mjs'] };
    return branchEvidenceProblemsForState(branch, {
      patches: [branchRecord({ agent: 'codex-lead' })],
      reviews: [
        branchRecord({ verdict: 'pass', kind: 'general' }),
        branchRecord({ verdict: 'pass', kind: 'workflow' }),
      ],
      tests: [branchRecord({ verdict: 'pass', ...workflowEvidence('test-command') })],
      audits: [branchRecord({ verdict: 'pass', ...workflowEvidence('audit-command', { audit: true }) })],
    }).length === 0;
  })());
  add('branch evidence checks verification relevance against actual branch files', (() => {
    const branch = { base: 'base', mergeBase: 'merge-base', hash: 'branch-hash', files: ['.codex/scripts/nexus-workflow.mjs'] };
    const problems = branchEvidenceProblemsForState(branch, {
      patches: [branchRecord({ agent: 'codex-lead' })],
      reviews: [
        branchRecord({ verdict: 'pass', kind: 'general' }),
        branchRecord({ verdict: 'pass', kind: 'workflow' }),
      ],
      tests: [{
        branchHash: 'branch-hash',
        scope: 'branch',
        verdict: 'pass',
        files: ['packages/web/src/App.tsx'],
        commandIds: ['unit-only'],
        commandEvidence: [{ id: 'unit-only', command: ['npm', 'test'], exitCode: 0, timedOut: false }],
      }],
      audits: [branchRecord({ verdict: 'pass', ...workflowEvidence('audit-command', { audit: true }) })],
    });
    return problems.some((problem) => problem.includes('no passing verification record'));
  })());
  add('release closeout uses branch evidence when branch has diff', releaseCloseoutMode({ files: ['.codex/scripts/nexus-workflow.mjs'] }) === 'branch');
  add('release closeout uses worktree checks when branch has no diff', releaseCloseoutMode({ files: [] }) === 'worktree');
  add('branch evidence check rejects non-branch patch records as branch coverage', (() => {
    const branch = { base: 'base', mergeBase: 'merge-base', hash: 'branch-hash', files: ['.codex/scripts/nexus-workflow.mjs'] };
    return branchEvidenceProblemsForState(branch, {
      patches: [{ branchHash: 'branch-hash', scope: 'worktree', agent: 'nexus_spark_worker' }],
      reviews: [
        branchRecord({ verdict: 'pass', kind: 'general' }),
        branchRecord({ verdict: 'pass', kind: 'workflow' }),
        branchRecord({ verdict: 'pass', kind: 'integrated' }),
      ],
      tests: [branchRecord({ verdict: 'pass', ...workflowEvidence('test-command') })],
      audits: [branchRecord({ verdict: 'pass', ...workflowEvidence('audit-command', { audit: true }) })],
    }).some((problem) => problem.includes('branch-scope PATCH'));
  })());
  add('branch evidence check requires integrated review for delegated patch evidence', (() => {
    const branch = { base: 'base', mergeBase: 'merge-base', hash: 'branch-hash', files: ['.codex/scripts/nexus-workflow.mjs'] };
    return branchEvidenceProblemsForState(branch, {
      patches: [
        branchRecord({ agent: 'codex-lead' }),
        { branchHash: 'branch-hash', scope: 'worktree', agent: 'nexus_spark_worker', routingId: 'ROUTING-test', files: ['.codex/workflow/templates/routing.md'] },
      ],
      routing: [{ id: 'ROUTING-test', route: 'spark', worker: 'nexus_spark_worker', files: ['.codex/workflow/templates/routing.md'] }],
      reviews: [
        branchRecord({ verdict: 'pass', kind: 'general' }),
        branchRecord({ verdict: 'pass', kind: 'workflow' }),
      ],
      tests: [branchRecord({ verdict: 'pass', ...workflowEvidence('test-command') })],
      audits: [branchRecord({ verdict: 'pass', ...workflowEvidence('audit-command', { audit: true }) })],
    }).some((problem) => problem.includes('integrated review'));
  })());
  add('branch evidence check requires routing record for delegated patch evidence', (() => {
    const branch = { base: 'base', mergeBase: 'merge-base', hash: 'branch-hash', files: ['.codex/scripts/nexus-workflow.mjs'] };
    return branchEvidenceProblemsForState(branch, {
      patches: [
        branchRecord({ agent: 'codex-lead' }),
        { branchHash: 'branch-hash', scope: 'worktree', agent: 'nexus_spark_worker', files: ['.codex/workflow/templates/routing.md'] },
      ],
      routing: [],
      reviews: [
        branchRecord({ verdict: 'pass', kind: 'general' }),
        branchRecord({ verdict: 'pass', kind: 'workflow' }),
        branchRecord({ verdict: 'pass', kind: 'integrated' }),
      ],
      tests: [branchRecord({ verdict: 'pass', ...workflowEvidence('test-command') })],
      audits: [branchRecord({ verdict: 'pass', ...workflowEvidence('audit-command', { audit: true }) })],
    }).some((problem) => problem.includes('missing routingId'));
  })());
  add('branch evidence check requires routing closeout for delegated patch evidence', (() => {
    const branch = { base: 'base', mergeBase: 'merge-base', hash: 'branch-hash', files: ['.codex/scripts/nexus-workflow.mjs'] };
    return branchEvidenceProblemsForState(branch, {
      patches: [
        branchRecord({ agent: 'codex-lead' }),
        { branchHash: 'branch-hash', scope: 'worktree', agent: 'nexus_spark_worker', routingId: 'ROUTING-test', files: ['.codex/workflow/templates/routing.md'] },
      ],
      routing: [{ id: 'ROUTING-test', route: 'spark', worker: 'nexus_spark_worker', files: ['.codex/workflow/templates/routing.md'] }],
      reviews: [
        branchRecord({ verdict: 'pass', kind: 'general' }),
        branchRecord({ verdict: 'pass', kind: 'workflow' }),
        branchRecord({ verdict: 'pass', kind: 'integrated' }),
      ],
      tests: [branchRecord({ verdict: 'pass', ...workflowEvidence('test-command') })],
      audits: [branchRecord({ verdict: 'pass', ...workflowEvidence('audit-command', { audit: true }) })],
    }).some((problem) => problem.includes('no completed routing closeout'));
  })());
  add('branch evidence check accepts delegated patch with routing and integrated review', (() => {
    const branch = { base: 'base', mergeBase: 'merge-base', hash: 'branch-hash', files: ['.codex/scripts/nexus-workflow.mjs'] };
    return branchEvidenceProblemsForState(branch, {
      patches: [
        branchRecord({ agent: 'codex-lead' }),
        { branchHash: 'branch-hash', scope: 'worktree', agent: 'nexus_spark_worker', routingId: 'ROUTING-test', files: ['.codex/workflow/templates/routing.md'] },
      ],
      routing: [
        { id: 'ROUTING-test', route: 'spark', worker: 'nexus_spark_worker', files: ['.codex/workflow/templates/routing.md'] },
        { id: 'ROUTING-closeout', completedRoutingId: 'ROUTING-test', status: 'completed', route: 'spark', worker: 'nexus_spark_worker' },
      ],
      reviews: [
        branchRecord({ verdict: 'pass', kind: 'general' }),
        branchRecord({ verdict: 'pass', kind: 'workflow' }),
        branchRecord({ verdict: 'pass', kind: 'integrated' }),
      ],
      tests: [branchRecord({ verdict: 'pass', ...workflowEvidence('test-command') })],
      audits: [branchRecord({ verdict: 'pass', ...workflowEvidence('audit-command', { audit: true }) })],
    }).length === 0;
  })());
  add('branch evidence check still requires integrated review for stale-hash delegated branch records', (() => {
    const branch = { base: 'base', mergeBase: 'merge-base', hash: 'branch-hash', files: ['.codex/scripts/nexus-workflow.mjs'] };
    return branchEvidenceProblemsForState(branch, {
      patches: [
        branchRecord({ agent: 'codex-lead', branchIntroduced: true }),
        { branchHash: 'old-hash', scope: 'worktree', agent: 'nexus_spark_worker', routingId: 'ROUTING-test', files: ['.codex/workflow/templates/routing.md'], branchIntroduced: true },
      ],
      routing: [{ id: 'ROUTING-test', route: 'spark', worker: 'nexus_spark_worker', files: ['.codex/workflow/templates/routing.md'], branchIntroduced: true }],
      reviews: [
        branchRecord({ verdict: 'pass', kind: 'general' }),
        branchRecord({ verdict: 'pass', kind: 'workflow' }),
      ],
      tests: [branchRecord({ verdict: 'pass', ...workflowEvidence('test-command') })],
      audits: [branchRecord({ verdict: 'pass', ...workflowEvidence('audit-command', { audit: true }) })],
    }).some((problem) => problem.includes('integrated review'));
  })());
  add('branch evidence check ignores historical delegated records that were not introduced on this branch', (() => {
    const branch = { base: 'base', mergeBase: 'merge-base', hash: 'branch-hash', files: ['.codex/scripts/nexus-workflow.mjs'] };
    return branchEvidenceProblemsForState(branch, {
      patches: [
        branchRecord({ agent: 'codex-lead', branchIntroduced: true }),
        { branchHash: 'old-hash', scope: 'worktree', agent: 'nexus_spark_worker', files: ['.codex/workflow/templates/routing.md'], branchIntroduced: false },
      ],
      routing: [],
      reviews: [
        branchRecord({ verdict: 'pass', kind: 'general' }),
        branchRecord({ verdict: 'pass', kind: 'workflow' }),
      ],
      tests: [branchRecord({ verdict: 'pass', ...workflowEvidence('test-command') })],
      audits: [branchRecord({ verdict: 'pass', ...workflowEvidence('audit-command', { audit: true }) })],
    }).length === 0;
  })());
  add('branch evidence check exempts legacy-schema delegated patches from new routing requirement', (() => {
    const branch = { base: 'base', mergeBase: 'merge-base', hash: 'branch-hash', files: ['.codex/scripts/nexus-workflow.mjs'] };
    return branchEvidenceProblemsForState(branch, {
      patches: [
        branchRecord({ agent: 'codex-lead', branchIntroduced: true }),
        { rel: '.codex/workflow/records/patches/PATCH-20260508T170713Z-design-system-toast-semantic-parity.md', branchHash: 'old-hash', scope: 'worktree', agent: 'codex-lead+spark-worker', branchIntroduced: true },
      ],
      routing: [],
      reviews: [
        branchRecord({ verdict: 'pass', kind: 'general' }),
        branchRecord({ verdict: 'pass', kind: 'workflow' }),
      ],
      tests: [branchRecord({ verdict: 'pass', ...workflowEvidence('test-command') })],
      audits: [branchRecord({ verdict: 'pass', ...workflowEvidence('audit-command', { audit: true }) })],
    }).length === 0;
  })());
  add('guide content hash validates generated html', (() => {
    const html = injectGuideContentHash(`${guideMetaTag('contentHash', PUBLIC_GUIDE_CONTENT_HASH_PLACEHOLDER)}\n<section>ok</section>`);
    return guideContentHashOk(html) && !guideContentHashOk(html.replace('ok', 'edited'));
  })());
  add('generated guide normalizer strips trailing whitespace', !normalizeGeneratedHtml('a  \n  \n').match(/[ \t]+$/m));
  add('guide view contract rejects heading-only public guide', guideViewContractProblems('Workflow System Nodes Project Structure Design System / Zoo / Docs Model Routing Examples Workflow Event Timeline', 'fixture').length > 0);
  add('guide view contract accepts required graph, docs, zoo, routing, and timeline views', guideViewContractProblems([
    ...(POLICY.guide?.viewContract?.requiredStrings || []),
    ...(POLICY.guide?.viewContract?.timelineCategoryHeadings || []).map((heading) => `<h3>${escapeHtml(heading)}</h3>`),
  ].join('\n'), 'fixture').length === 0);
  add('guide browser state rejects stale artifact hash', (() => {
    const state = { guideArtifactHash: 'stale', verdict: 'pass', screenshots: ['a.png'] };
    const hash = guideArtifactHash();
    return state.guideArtifactHash !== hash;
  })());
  add('guide browser summary accepts required deterministic targets', (() => {
    const dir = mkdtempSync(join(tmpdir(), 'nexus-guide-summary-'));
    const summaryPath = join(dir, 'summary.json');
    const rel = relative(ROOT, summaryPath).replaceAll('\\', '/');
    const guideMeta = {
      [guideMetaName('sourceHash')]: publicGuideSourceHash(),
      [guideMetaName('contentHash')]: 'fixture-content-hash',
    };
    const zooMeta = {
      [guideMetaName('sourceHash')]: zooVisualSourceHash(),
      [guideMetaName('contentHash')]: 'fixture-content-hash',
    };
    writeFileSync(summaryPath, JSON.stringify([
      { name: 'dashboard-artifact', target: 'file:///dashboard', viewport: { width: 1, height: 1 }, title: GUIDE_TITLES.dashboard, meta: guideMeta, hrefs: [], imageCount: 0, brokenImages: 0 },
      { name: 'workflow-guide-artifact', target: 'file:///public', viewport: { width: 1, height: 1 }, title: GUIDE_TITLES.public, meta: guideMeta, hrefs: ['zoo/index.html'], imageCount: 0, brokenImages: 0 },
      { name: 'workflow-zoo-artifact-desktop', target: 'file:///zoo', viewport: { width: 1, height: 1 }, title: ZOO_VISUAL_GUIDE_TITLE, meta: zooMeta, hrefs: [], imageCount: 1, brokenImages: 0 },
      { name: 'workflow-zoo-artifact-mobile', target: 'file:///zoo', viewport: { width: 1, height: 1 }, title: ZOO_VISUAL_GUIDE_TITLE, meta: zooMeta, hrefs: [], imageCount: 1, brokenImages: 0 },
    ]));
    const ok = guideBrowserSummaryProblems(rel).length === 0;
    rmSync(dir, { recursive: true, force: true });
    return ok;
  })());
  add('guide browser summary rejects missing dashboard coverage', (() => {
    const dir = mkdtempSync(join(tmpdir(), 'nexus-guide-summary-'));
    const summaryPath = join(dir, 'summary.json');
    const rel = relative(ROOT, summaryPath).replaceAll('\\', '/');
    writeFileSync(summaryPath, JSON.stringify([
      { name: 'workflow-guide-artifact', target: 'file:///public', viewport: { width: 1, height: 1 }, title: GUIDE_TITLES.public, imageCount: 0, brokenImages: 0 },
    ]));
    const ok = guideBrowserSummaryProblems(rel).some((problem) => problem.includes('dashboard-artifact'));
    rmSync(dir, { recursive: true, force: true });
    return ok;
  })());
  add('guide browser check rejects missing screenshot files', (() => {
    const current = guideArtifactHash();
    const missingState = {
      guideArtifactHash: current,
      verdict: 'pass',
      screenshots: ['.codex/workflow/artifacts/screenshots/missing.png'],
    };
    const missing = (missingState.screenshots || []).filter((file) => !existsSync(join(ROOT, file)));
    return missing.length > 0;
  })());
  add('guide browser artifact evidence accepts matching hashes', (() => {
    return withProjectTempArtifact('{"ok":true}\n', ({ rel }) => {
      const evidence = { screenshots: [rel], summaryFile: rel, evidenceArtifacts: artifactEvidenceForRefs([rel]) };
      return artifactEvidenceProblems(evidence, 'fixture guide evidence').length === 0;
    });
  })());
  add('guide browser artifact evidence rejects mutated files', (() => {
    return withProjectTempArtifact('{"ok":true}\n', ({ path, rel }) => {
      const evidence = { screenshots: [rel], summaryFile: rel, evidenceArtifacts: artifactEvidenceForRefs([rel]) };
      writeFileSync(path, '{"ok":false}\n');
      return artifactEvidenceProblems(evidence, 'fixture guide evidence').some((problem) => problem.includes('hash mismatch') || problem.includes('size mismatch'));
    });
  })());
  add('guide browser artifact evidence rejects path-only pass records', (() => {
    return withProjectTempArtifact('{"ok":true}\n', ({ rel }) => (
      artifactEvidenceProblems({ screenshots: [rel], summaryFile: rel }, 'fixture guide evidence').some((problem) => problem.includes('does not embed evidenceArtifacts'))
    ));
  })());
  add('visual zoo guide check rejects missing fixture slug', (() => {
    const currentEntries = zooVisualEntries();
    return currentEntries.some((entry) => entry.slug === 'themes') && zooVisualGuideProblems().some((problem) => problem.includes('visual Zoo/Gym') || problem.includes('zoo/index.html'));
  })() || existsSync(join(ZOO_GUIDE_DIR, 'index.html')));
  add('routing check rejects missing worktree hash', routingScopeProblemsForState({
    routingId: 'routing-test',
    route: 'lead',
    status: 'active',
  }, ['.codex/scripts/nexus-workflow.mjs'], {}).length > 0);
  add('routing check rejects stale worktree hash', routingScopeProblemsForState({
    routingId: 'routing-test',
    route: 'lead',
    status: 'active',
    worktreeHash: 'stale',
    currentHash: 'current',
  }, ['.codex/scripts/nexus-workflow.mjs'], {}).length > 0);
  add('routing check accepts clean worktree with stale routing state', routingScopeProblemsForState({
    routingId: 'routing-test',
    route: 'lead',
    status: 'active',
    worktreeHash: 'stale',
    currentHash: 'current',
  }, [], {}).length === 0);
  add('routing check allows stale delegated route after current lead patch coverage', routingScopeProblemsForState({
    routingId: 'routing-test',
    route: 'spark',
    worker: 'nexus_spark_worker',
    files: ['packages/web/src/components/ui/Toast.tsx'],
    status: 'active',
    worktreeHash: 'old-worker-hash',
    currentHash: 'current',
  }, ['.codex/scripts/nexus-workflow.mjs'], {
    worktreeHash: 'current',
    workers: ['codex-lead'],
    patchId: 'patch-current',
  }).length === 0);
  add('routing check accepts hash-bound non-Spark route', routingScopeProblemsForState({
    routingId: 'routing-test',
    route: 'lead',
    status: 'active',
    worktreeHash: 'current',
    currentHash: 'current',
  }, ['.codex/scripts/nexus-workflow.mjs'], {}).length === 0);
  add('routing check requires preflight for delegated worker patches', routingScopeProblemsForState({}, ['packages/web/src/components/ui/Toast.tsx'], {
    worktreeHash: worktreeHash(),
    workers: ['nexus_spark_worker'],
  }).length > 0);
  add('routing check does not require preflight for lead-only patches', routingScopeProblemsForState({}, ['.codex/scripts/nexus-workflow.mjs'], {
    worktreeHash: worktreeHash(),
    workers: ['codex-lead'],
  }).length === 0);
  add('active routing supplies patch worker attribution', (() => {
    const routing = activeRoutingForPatch(['packages/web/src/components/ui/Toast.tsx'], {
      routingId: 'ROUTING-fixture',
      status: 'active',
      worker: 'nexus_spark_worker',
      files: ['packages/web/src/components/ui/Toast.tsx'],
      workSliceIds: ['WORK-SLICE-fixture'],
    });
    return routing?.worker === 'nexus_spark_worker' && csv(routing.workSliceIds)[0] === 'WORK-SLICE-fixture';
  })());
  add('active routing does not attribute out-of-scope patch', !activeRoutingForPatch([DESIGN_REGISTRY_PATH], {
    routingId: 'ROUTING-fixture',
    status: 'active',
    worker: 'nexus_spark_worker',
    files: ['packages/web/src/components/ui/Toast.tsx'],
  }));
  add('routing check rejects retroactive delegated routing', routingScopeProblemsForState({
    routingId: 'routing-test',
    route: 'spark',
    worker: 'nexus_spark_worker',
    status: 'active',
    worktreeHash: 'base',
    currentHash: 'current',
    recordedAt: '2026-05-09T00:10:00.000Z',
  }, ['packages/web/src/components/ui/Toast.tsx'], {
    worktreeHash: 'current',
    routingId: 'routing-test',
    workers: ['nexus_spark_worker'],
    lastChangedAt: '2026-05-09T00:09:00.000Z',
    patchId: 'patch-test',
  }).some((problem) => problem.includes('after delegated patch')));
  add('routing check accepts delegated preflight linked to patch', routingScopeProblemsForState({
    routingId: 'routing-test',
    route: 'spark',
    worker: 'nexus_spark_worker',
    files: ['packages/web/src/components/ui/Toast.tsx'],
    status: 'closed',
    closeRecord: 'ROUTING-closeout',
    worktreeHash: 'base',
    currentHash: 'current',
    recordedAt: '2026-05-09T00:09:00.000Z',
  }, ['packages/web/src/components/ui/Toast.tsx'], {
    worktreeHash: 'current',
    routingId: 'routing-test',
    workers: ['nexus_spark_worker'],
    lastChangedAt: '2026-05-09T00:10:00.000Z',
    patchId: 'patch-test',
  }).length === 0);
  add('routing check scopes linked delegated patch files instead of unrelated dirty files', routingScopeProblemsForState({
    routingId: 'routing-test',
    route: 'spark',
    worker: 'nexus_spark_worker',
    files: ['packages/web/src/components/ui/Toast.tsx'],
    status: 'closed',
    closeRecord: 'ROUTING-closeout',
    worktreeHash: 'base',
    currentHash: 'current',
    recordedAt: '2026-05-09T00:09:00.000Z',
  }, ['packages/web/src/components/ui/Toast.tsx', '.codex/scripts/nexus-workflow.mjs'], {
    worktreeHash: 'current',
    routingId: 'routing-test',
    workers: ['nexus_spark_worker'],
    files: ['packages/web/src/components/ui/Toast.tsx'],
    lastChangedAt: '2026-05-09T00:10:00.000Z',
    patchId: 'patch-test',
  }).length === 0);
  add('routing check rejects delegated patch covered by lead route', routingScopeProblemsForState({
    routingId: 'routing-test',
    route: 'lead',
    worker: 'codex-lead',
    status: 'active',
    worktreeHash: 'base',
    currentHash: 'current',
    recordedAt: '2026-05-09T00:09:00.000Z',
  }, ['packages/web/src/components/ui/Toast.tsx'], {
    worktreeHash: 'current',
    routingId: 'routing-test',
    workers: ['nexus_spark_worker'],
    lastChangedAt: '2026-05-09T00:10:00.000Z',
    patchId: 'patch-test',
  }).some((problem) => problem.includes('lead-only')));
  add('integrated review does not trigger for lead aliases only', !requiresIntegratedReview({
    worktreeHash: worktreeHash(),
    workers: ['codex', 'codex-lead'],
  }));
  add('integrated review triggers for lead plus delegated worker', requiresIntegratedReview({
    worktreeHash: worktreeHash(),
    workers: ['codex-lead', 'nexus_spark_worker'],
  }));
  add('explicit patch records reset stale worker attribution', nextPatchWorkers(['nexus_spark_worker'], {
    explicitPatchRecord: true,
    previousWasReviewed: false,
    previousHash: 'hash',
    currentHash: 'hash',
  }).length === 0);
  add('review kind check rejects workflow-only pass as general pass', !stateHasReviewKind({
    worktreeHash: 'hash',
    verdict: 'pass',
    kind: 'workflow',
  }, 'general', 'hash'));
  add('review kind check accepts explicit general pass', stateHasReviewKind({
    worktreeHash: 'hash',
    verdict: 'pass',
    kind: 'general',
  }, 'general', 'hash', { checkEvidence: false }));
  add('verification pass records require referenced evidence', !recordHasVerificationPass('missing-hash'));
  add('evidence references reject missing commandEvidence', evidenceReferenceProblems({ commandIds: ['missing-summary'] }, 'fixture evidence').some((problem) => problem.includes('does not embed commandEvidence')));
  add('evidence references reject failed commandEvidence', evidenceReferenceProblems({
    commandIds: ['failed-command'],
    commandEvidence: [{ id: 'failed-command', exitCode: 1, timedOut: false }],
  }, 'fixture evidence').some((problem) => problem.includes('did not pass')));
  add('evidence references accept passed commandEvidence', evidenceReferenceProblems({
    commandIds: ['passed-command'],
    commandEvidence: [{ id: 'passed-command', exitCode: 0, timedOut: false }],
  }, 'fixture evidence').length === 0);
  add('evidence relevance rejects unrelated verification commands', evidenceRelevanceProblems({
    files: ['.codex/scripts/nexus-workflow.mjs'],
    commandEvidence: [{ id: 'unrelated', command: ['npm', 'run', 'workflow:status'], exitCode: 0, timedOut: false }],
  }, 'fixture verification', 'verification').some((problem) => problem.includes('workflow-policy')));
  add('evidence relevance rejects command id spoofing', !commandEvidenceClasses([
    { id: 'workflow:self-test', command: ['node', '-e', 'process.exit(0)'], exitCode: 0, timedOut: false },
  ]).has('workflow-self-test'));
  add('evidence relevance rejects inert echo command text', !commandEvidenceClasses([
    { id: 'echo-self-test', command: ['echo', 'workflow:self-test'], exitCode: 0, timedOut: false },
  ]).has('workflow-self-test'));
  add('evidence relevance accepts policy-owned verification command classes', evidenceRelevanceProblems({
    files: ['.codex/scripts/nexus-workflow.mjs'],
    commandEvidence: [
      { id: 'policy', command: ['npm', 'run', 'workflow:policy-check'], exitCode: 0, timedOut: false },
      { id: 'self-test', command: ['npm', 'run', 'workflow:self-test'], exitCode: 0, timedOut: false },
      { id: 'guide', command: ['npm', 'run', 'workflow:guide-check'], exitCode: 0, timedOut: false },
      { id: 'guide-browser', command: ['npm', 'run', 'workflow:guide-browser-check'], exitCode: 0, timedOut: false },
      { id: 'zoo', command: ['npm', 'run', 'workflow:zoo-visual-guide-check'], exitCode: 0, timedOut: false },
    ],
  }, 'fixture verification', 'verification').length === 0);
  add('deployment evidence requires app and guide deployment command classes', (() => {
    const problems = evidenceRelevanceProblems({
      commandEvidence: [{ id: 'status', command: ['npm', 'run', 'workflow:status'], exitCode: 0, timedOut: false }],
    }, 'fixture deployment', 'deployment');
    return problems.some((problem) => problem.includes('production-app-check'))
      && problems.some((problem) => problem.includes('public-guide-deployed-check'));
  })());
  add('deployment evidence rejects app-only deployment proof', evidenceRelevanceProblems({
    commandEvidence: [{ id: 'app', command: ['npm', 'run', 'workflow:production-app-check'], exitCode: 0, timedOut: false }],
  }, 'fixture deployment', 'deployment').some((problem) => problem.includes('public-guide-deployed-check')));
  add('deployment evidence rejects guide-only deployment proof', evidenceRelevanceProblems({
    commandEvidence: [{ id: 'deployed', command: ['npm', 'run', 'workflow:public-guide-deployed-check'], exitCode: 0, timedOut: false }],
  }, 'fixture deployment', 'deployment').some((problem) => problem.includes('production-app-check')));
  add('deployment evidence accepts app and guide deployment command classes', evidenceRelevanceProblems({
    commandEvidence: [
      { id: 'app', command: ['npm', 'run', 'workflow:production-app-check'], exitCode: 0, timedOut: false },
      { id: 'deployed', command: ['npm', 'run', 'workflow:public-guide-deployed-check'], exitCode: 0, timedOut: false },
    ],
  }, 'fixture deployment', 'deployment').length === 0);
  add('deployment target policy allows app root and guide URL', deploymentTargetProblems(POLICY.deployment.publicAppUrl, 'fixture target').length === 0
    && deploymentTargetProblems(PUBLIC_GUIDE_URL, 'fixture target').length === 0);
  add('deployment target policy rejects unrelated hosts', deploymentTargetProblems('https://example.invalid/nexus/', 'fixture target').some((problem) => problem.includes('outside allowed')));
  add('remote artifacts must be referenced by command evidence', remoteArtifactBindingProblems({
    artifacts: ['https://example.invalid/proof.json'],
    commandEvidence: [{ id: 'ok', command: ['npm', 'run', 'workflow:status'], exitCode: 0, timedOut: false }],
  }, 'fixture evidence').some((problem) => problem.includes('not referenced')));
  add('remote artifacts reject url in command id only', remoteArtifactBindingProblems({
    artifacts: ['https://example.invalid/proof.json'],
    commandEvidence: [{ id: 'https://example.invalid/proof.json', command: ['npm', 'run', 'workflow:status'], exitCode: 0, timedOut: false }],
  }, 'fixture evidence').some((problem) => problem.includes('not referenced')));
  add('remote artifacts reject inert echo url', remoteArtifactBindingProblems({
    artifacts: ['https://example.invalid/proof.json'],
    commandEvidence: [{ id: 'echo-url', command: ['echo', 'https://example.invalid/proof.json'], exitCode: 0, timedOut: false }],
  }, 'fixture evidence').some((problem) => problem.includes('not referenced')));
  add('remote artifacts accept matching command evidence', remoteArtifactBindingProblems({
    artifacts: ['https://example.invalid/proof.json'],
    commandEvidence: [{ id: 'ok', command: ['curl', 'https://example.invalid/proof.json'], exitCode: 0, timedOut: false }],
  }, 'fixture evidence').length === 0);
  add('evidence references reject mutable runtime artifacts', evidenceReferenceProblems({
    artifacts: ['.codex/workflow/runtime/fake-artifact.txt'],
  }, 'fixture evidence').some((problem) => problem.includes('mutable runtime/state')));
  add('guide browser artifact inputs reject mutable runtime paths', artifactInputProblems(['.codex/workflow/runtime/fake-guide-summary.json']).some((problem) => problem.includes('mutable runtime/state')));
  add('artifact inputs reject parent traversal paths', artifactInputProblems(['../package.json']).some((problem) => problem.includes('project-relative')));
  add('artifact inputs reject absolute paths', artifactInputProblems([join(ROOT, 'package.json')]).some((problem) => problem.includes('project-relative')));
  add('artifact inputs reject nul bytes', artifactInputProblems(['package.json\0bad']).some((problem) => problem.includes('project-relative')));
  add('evidence references reject mutable state artifacts', evidenceReferenceProblems({
    artifacts: ['.codex/workflow/state/review-state.json'],
  }, 'fixture evidence').some((problem) => problem.includes('mutable runtime/state')));
  add('record path resolver rejects wrong record kind path', recordPathFor('reviews', '.codex/workflow/records/tests/TEST-fixture.md') === '');
  add('evidence references reject local artifacts without embedded hashes', (() => {
    return withProjectTempArtifact('{"ok":true}\n', ({ rel }) => (
      evidenceReferenceProblems({ artifacts: [rel] }, 'fixture evidence').some((problem) => problem.includes('artifactEvidence hashes'))
    ));
  })());
  add('evidence references accept local artifacts with embedded hashes', (() => {
    return withProjectTempArtifact('{"ok":true}\n', ({ rel }) => (
      evidenceReferenceProblems({ artifacts: [rel], artifactEvidence: artifactEvidenceForRefs([rel]) }, 'fixture evidence').length === 0
    ));
  })());
  add('evidence references reject checks-only proof', evidenceReferenceProblems({ checks: ['manual-ok'] }, 'fixture evidence').some((problem) => problem.includes('no command ids or durable artifacts')));
  add('self-test temp fixtures stay out of repo workflow tree', !existsSync(join(ROOT, '.codex-self-test-tmp')));
  add('guide token subset avoids display tracking tokens', !productionGuideTokenCss().match(/tracking|-0\.01em/));
  add('guide token subset includes hit targets', ['--hit-sm', '--hit-md', '--hit-lg'].every((token) => productionGuideTokenCss().includes(`${token}:`)));
  add('guide stale hash would be rejected', htmlMetaContent(guideMetaTag('sourceHash', 'stale'), guideMetaName('sourceHash')) !== publicGuideSourceHash());
  add('graph renderer rejects missing edge nodes', (() => {
    try {
      graphHtml('bad', [{ label: 'A', detail: '' }], [['A', 'B']]);
      return false;
    } catch {
      return true;
    }
  })());
  add('workflow engine globstar matches nested paths', workflowPathMatchesPattern('.codex/archive/claude-code-2026-05-09/.claude/settings.json', '.codex/archive/**'));
  add('workflow engine excludes take precedence over includes', !pathMatchesPolicy('.codex/workflow/runtime/hooks-state.json', {
    include: ['.codex/'],
    exclude: ['.codex/workflow/runtime/'],
  }));
  add('workflow engine normalizes Windows path separators', workflowPathMatchesPattern('.codex\\workflow\\policy\\files.json', '.codex/workflow/policy/*.json'));
  add('workflow engine finds custom workflow root', (() => {
    const dir = mkdtempSync(join(tmpdir(), 'nexus-engine-root-'));
    const sub = join(dir, 'a', 'b');
    ensureDir(join(dir, '_codex', 'workflow'));
    ensureDir(sub);
    writeFileSync(join(dir, '_codex', 'workflow', 'profile.json'), '{}\n');
    const found = findWorkflowRoot(sub, { codexDir: '_codex' }) === dir;
    rmSync(dir, { recursive: true, force: true });
    return found;
  })());
  add('workflow engine ignores nested codex cache without profile when parent has profile', (() => {
    const dir = mkdtempSync(join(tmpdir(), 'nexus-engine-root-'));
    const sub = join(dir, 'packages', 'web');
    ensureDir(join(dir, '.codex', 'workflow'));
    ensureDir(join(sub, '.codex', 'workflow', 'runtime'));
    writeFileSync(join(dir, '.codex', 'workflow', 'profile.json'), '{}\n');
    const found = findWorkflowRoot(sub) === dir;
    rmSync(dir, { recursive: true, force: true });
    return found;
  })());
  add('workflow engine loads selected policy names', (() => {
    const dir = mkdtempSync(join(tmpdir(), 'nexus-engine-load-'));
    ensureDir(join(dir, '.codex', 'workflow', 'policy'));
    writeFileSync(join(dir, '.codex', 'workflow', 'profile.json'), '{"project":"fixture"}\n');
    writeFileSync(join(dir, '.codex', 'workflow', 'policy', 'gates.json'), '{"canonicalLadder":["workflow:status"]}\n');
    const loaded = loadCodexWorkflow(dir, { policyNames: ['gates'] });
    rmSync(dir, { recursive: true, force: true });
    return loaded.profile.project === 'fixture' && loaded.policy.gates.canonicalLadder[0] === 'workflow:status' && !loaded.policy.files;
  })());
  add('workflow engine loads policy names from manifest', (() => {
    const dir = mkdtempSync(join(tmpdir(), 'nexus-engine-manifest-'));
    ensureDir(join(dir, '.codex', 'workflow', 'policy'));
    writeFileSync(join(dir, '.codex', 'workflow', 'profile.json'), '{"project":"fixture"}\n');
    writeFileSync(join(dir, '.codex', 'workflow', 'policy', 'manifest.json'), '{"schema":"codex-workflow-policy-manifest/v1","policyNames":["gates"]}\n');
    writeFileSync(join(dir, '.codex', 'workflow', 'policy', 'gates.json'), '{"schema":"fixture-gates","canonicalLadder":["workflow:status"]}\n');
    const loaded = loadCodexWorkflow(dir);
    rmSync(dir, { recursive: true, force: true });
    return loaded.policy.manifest.schema === 'codex-workflow-policy-manifest/v1'
      && loaded.policyNames.length === 1
      && loaded.policy.gates.canonicalLadder[0] === 'workflow:status'
      && !loaded.policy.files;
  })());
  add('workflow engine rejects missing policy manifest by default', (() => {
    const dir = mkdtempSync(join(tmpdir(), 'nexus-engine-missing-manifest-'));
    ensureDir(join(dir, '.codex', 'workflow', 'policy'));
    writeFileSync(join(dir, '.codex', 'workflow', 'profile.json'), '{"project":"fixture"}\n');
    let threw = false;
    try {
      loadCodexWorkflow(dir);
    } catch (error) {
      threw = String(error.message || '').includes('manifest.json');
    }
    rmSync(dir, { recursive: true, force: true });
    return threw;
  })());
  add('workflow engine rejects missing manifest policy files by default', (() => {
    const dir = mkdtempSync(join(tmpdir(), 'nexus-engine-missing-policy-'));
    ensureDir(join(dir, '.codex', 'workflow', 'policy'));
    writeFileSync(join(dir, '.codex', 'workflow', 'profile.json'), '{"project":"fixture"}\n');
    writeFileSync(join(dir, '.codex', 'workflow', 'policy', 'manifest.json'), '{"schema":"codex-workflow-policy-manifest/v1","policyNames":["missing"]}\n');
    let threw = false;
    try {
      loadCodexWorkflow(dir);
    } catch (error) {
      threw = String(error.message || '').includes('missing.json');
    }
    rmSync(dir, { recursive: true, force: true });
    return threw;
  })());
  add('workflow engine rejects malformed json', (() => {
    const dir = mkdtempSync(join(tmpdir(), 'nexus-engine-json-'));
    const path = join(dir, 'bad.json');
    writeFileSync(path, '{bad json');
    let threw = false;
    try {
      readJsonFile(path, {});
    } catch {
      threw = true;
    }
    rmSync(dir, { recursive: true, force: true });
    return threw;
  })());
  add('workflow engine reads top-level toml values by section', tomlValueInSection('sandbox_mode = "danger-full-access"\n[features]\nhooks = true\n', '', 'sandbox_mode') === '"danger-full-access"');
  add('workflow engine reads feature booleans by section', tomlBooleanInSection('[features]\nhooks = true\n[other]\nhooks = false\n', 'features', 'hooks') === true);
  add('workflow engine toml key lookup is section scoped', !tomlHasKeyInSection('[other]\ncodex_hooks = true\n', 'features', 'codex_hooks'));
  add('workflow wrapper resolves repository root from workspace subdirectory', (() => {
    const script = process.argv[1] ? resolve(process.argv[1]) : join(CODEX, 'scripts', 'nexus-workflow.mjs');
    const cwd = join(ROOT, 'packages', 'web');
    if (!existsSync(cwd)) return false;
    const result = spawnSync(process.execPath, [script, 'status'], {
      cwd,
      encoding: 'utf8',
      timeout: 30000,
      maxBuffer: 1024 * 1024,
    });
    return result.status === 0 && result.stdout.includes(`root: ${ROOT}`);
  })());
  const denied = [
    'git commit -m test',
    'git.exe commit -m test',
    '"git" commit -m test',
    '& "git" commit -m test',
    'git -C C:/tmp commit -m test',
    'git --git-dir=C:/x --work-tree=C:/y commit -m test',
    'cmd /c "git commit -m test"',
  ];
  const allowed = [
    'echo git commit -m test',
    'Write-Host git commit -m test',
    'git status commit',
  ];
  for (const command of denied) add(`hook detects ${command}`, commandInvokesGitCommit(command));
  for (const command of allowed) add(`hook allows ${command}`, !commandInvokesGitCommit(command));
  add('public sanitizer redacts private strings', (() => {
    const sanitized = publicSafe(`${ROOT} /root/monoWeb/nexus /root/monoWeb/deploy-backups/nexus/x.diff root@134.199.148.87 ~/.ssh/DIOkii token=abc`);
    return !publicGuideForbiddenStrings().some((forbidden) => forbidden && sanitized.includes(forbidden))
      && !sanitized.includes('token=abc');
  })());
  add('timed command telemetry records successful command duration', (() => {
    const dir = mkdtempSync(join(tmpdir(), 'nexus-command-run-'));
    const telemetryFile = join(dir, 'runs.jsonl');
    const run = runTimedCommand([process.execPath, '-e', 'console.log("ok")'], {
      id: 'self-test-success',
      timeoutMs: 5000,
      warnMs: 4000,
      telemetryFile,
      echo: false,
    });
    const records = readFileSync(telemetryFile, 'utf8').trim().split(/\r?\n/).map((line) => JSON.parse(line));
    rmSync(dir, { recursive: true, force: true });
    return run.exitCode === 0 && records[0]?.id === 'self-test-success' && Number.isFinite(records[0]?.durationMs);
  })());
  add('timed command telemetry records timeout', (() => {
    const dir = mkdtempSync(join(tmpdir(), 'nexus-command-run-'));
    const telemetryFile = join(dir, 'runs.jsonl');
    const run = runTimedCommand([process.execPath, '-e', 'setTimeout(() => {}, 2000)'], {
      id: 'self-test-timeout',
      timeoutMs: 100,
      warnMs: 50,
      telemetryFile,
      echo: false,
    });
    const records = readFileSync(telemetryFile, 'utf8').trim().split(/\r?\n/).map((line) => JSON.parse(line));
    rmSync(dir, { recursive: true, force: true });
    return run.exitCode === 124 && records[0]?.timedOut === true;
  })());
  add('timed command telemetry records warn threshold without failing', (() => {
    const dir = mkdtempSync(join(tmpdir(), 'nexus-command-run-'));
    const telemetryFile = join(dir, 'runs.jsonl');
    const run = runTimedCommand([process.execPath, '-e', 'setTimeout(() => console.log("slow-ok"), 120)'], {
      id: 'self-test-warn',
      timeoutMs: 2000,
      warnMs: 1,
      telemetryFile,
      echo: false,
    });
    const records = readFileSync(telemetryFile, 'utf8').trim().split(/\r?\n/).map((line) => JSON.parse(line));
    const traceOk = commandTraceProblems({ file: telemetryFile }).length === 0;
    rmSync(dir, { recursive: true, force: true });
    return run.exitCode === 0 && records[0]?.warned === true && traceOk;
  })());
  add('command trace strict mode reports warned or timed-out runs', (() => {
    const dir = mkdtempSync(join(tmpdir(), 'nexus-command-run-'));
    const telemetryFile = join(dir, 'runs.jsonl');
    writeFileSync(telemetryFile, '{"id":"slow","command":["node"],"cwd":".","startedAt":"a","endedAt":"b","durationMs":20,"timeoutMs":100,"warnMs":10,"exitCode":0,"timedOut":false,"warned":true}\n');
    const hasProblem = commandTraceProblems({ file: telemetryFile, strict: true }).some((problem) => problem.includes('exceeded its warn threshold'));
    const attention = commandTraceAttentionLines(readCommandRuns(telemetryFile), 1).some((line) => line.includes('slow') && line.includes('warned=true'));
    rmSync(dir, { recursive: true, force: true });
    return hasProblem && attention;
  })());
  add('workflow run command rejects duplicate command ids', (() => {
    const dir = mkdtempSync(join(tmpdir(), 'nexus-command-run-'));
    const telemetryFile = join(dir, 'runs.jsonl');
    const first = commandRunCommand(['--id', 'dupe-id', '--', process.execPath, '-e', 'process.exit(0)'], { telemetryFile, echo: false, error: false });
    const second = commandRunCommand(['--id', 'dupe-id', '--', process.execPath, '-e', 'process.exit(0)'], { telemetryFile, echo: false, error: false });
    rmSync(dir, { recursive: true, force: true });
    return first === 0 && second === 2;
  })());
  add('command evidence lookup rejects failed runtime ids', (() => {
    const dir = mkdtempSync(join(tmpdir(), 'nexus-command-run-'));
    const telemetryFile = join(dir, 'runs.jsonl');
    runTimedCommand([process.execPath, '-e', 'process.exit(7)'], {
      id: 'self-test-failed',
      timeoutMs: 2000,
      warnMs: 1000,
      telemetryFile,
      echo: false,
    });
    const result = commandEvidenceForIds(['self-test-failed'], { telemetryFile });
    rmSync(dir, { recursive: true, force: true });
    return result.problems.some((problem) => problem.includes('did not pass'));
  })());
  add('command trace check reports malformed telemetry lines', (() => {
    const dir = mkdtempSync(join(tmpdir(), 'nexus-command-run-'));
    const telemetryFile = join(dir, 'runs.jsonl');
    writeFileSync(telemetryFile, '{"id":"ok","command":["node"],"cwd":".","startedAt":"a","endedAt":"b","durationMs":1,"timeoutMs":10,"warnMs":5,"exitCode":0,"timedOut":false,"warned":false}\nnot-json\n');
    const hasProblem = commandTraceProblems({ file: telemetryFile }).some((problem) => problem.includes('not valid JSON'));
    const evidenceStillWorks = commandEvidenceForIds(['ok'], { telemetryFile }).problems.length === 0;
    rmSync(dir, { recursive: true, force: true });
    return hasProblem && evidenceStillWorks;
  })());
  add('routing check catches Spark out-of-scope file', routingScopeProblemsForState({
    routingId: 'routing-test',
    route: 'spark',
    files: ['packages/web/src/components/ui/Toast.tsx'],
    status: 'active',
    worktreeHash: 'current',
    currentHash: 'current',
  }, [DESIGN_REGISTRY_PATH], {}).length > 0);
  add('routing check accepts Spark in-scope file', routingScopeProblemsForState({
    routingId: 'routing-test',
    route: 'spark',
    files: ['packages/web/src/components/ui/Toast.tsx'],
    status: 'active',
    worktreeHash: 'current',
    currentHash: 'current',
  }, ['packages/web/src/components/ui/Toast.tsx'], {}).length === 0);
  add('routing check catches non-lead scoped worker out-of-scope file', routingScopeProblemsForState({
    routingId: 'routing-test',
    route: 'strong',
    worker: 'nexus_strong_worker',
    files: ['packages/web/src/components/ui/Toast.tsx'],
    status: 'active',
    worktreeHash: 'current',
    currentHash: 'current',
  }, [DESIGN_REGISTRY_PATH], {}).some((problem) => problem.includes('strong-routed work changed outside')));
  add('model routing catches fallback target mismatch', !modelRoutingScenarioResult({
    id: 'bad-fallback',
    summary: 'Spark failed but scenario says the wrong fallback owner.',
    sparkStarted: true,
    testsFailed: true,
    fallbackTarget: 'lead',
    expectedFallbackTarget: 'nexus_strong_worker',
    expectedRoute: 'escalate',
  }).ok);
  add('model routing scenarios pass', commandModelRoutingCheck({ quiet: true }));
  return checks;
}

function commandSelfTest(args = {}) {
  const checks = workflowSelfTestChecks();
  const failures = checks.filter((check) => !check.ok);
  if (!args.quiet) {
    for (const check of checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.name}`);
    console.log(`workflow self-test: ${checks.length} checks, ${failures.length} failures`);
  }
  if (failures.length) process.exit(1);
  return true;
}

function requiredWorkflowFiles() {
  return POLICY.files?.requiredWorkflowFiles || [];
}

function commandValidate(args) {
  const required = requiredWorkflowFiles();
  const missing = required.filter((p) => !existsSync(join(ROOT, p)));
  if (missing.length) {
    console.error('Missing workflow files:');
    for (const p of missing) console.error(`- ${p}`);
    process.exit(1);
  }
  if (args['commit-gate']) {
    const reviewOk = commandReviewCheck({ quiet: true });
    const recordsOk = commandRecordsCheck({ quiet: true });
    if (!reviewOk || !recordsOk) {
      if (!recordsOk) {
        console.error('Commit gate failed: committed evidence records were modified. Create correction records instead of editing existing evidence.');
        for (const problem of recordIntegrityProblems()) console.error(`- ${problem}`);
      }
      if (!reviewOk) {
        console.error('Commit gate failed: current substantive changes do not have a passing review record.');
        console.error('Run nexus-review, then record it with:');
        console.error('node .codex/scripts/nexus-workflow.mjs record-review --scope worktree --kind <kind> --verdict pass --reviewer <name> --notes "<summary>"');
      }
      process.exit(1);
    }
  }
  if (args['release-gate'] || args['deployed-gate'] || args.full) {
    const branch = branchEvidenceInfo();
    const closeoutMode = releaseCloseoutMode(branch);
    const branchHasDiff = closeoutMode === 'branch';
    const releaseFiles = branch.allFiles?.length ? branch.allFiles : changedFiles();
    const needsGuide = guideRelevantFiles(releaseFiles).length > 0;
    const needsZooVisual = zooVisualRelevantFiles(releaseFiles).length > 0;
    const branchEvidenceOk = commandBranchEvidenceCheck({ quiet: true });
    const reviewOk = branchHasDiff ? branchEvidenceOk : commandReviewCheck({ quiet: true });
    const verifyOk = branchHasDiff ? branchEvidenceOk : commandVerifyCheck({ quiet: true });
    const auditOk = branchHasDiff ? branchEvidenceOk : commandAuditCheck({ quiet: true });
    const handoverOk = commandHandoverCheck({ quiet: true });
    const recordsOk = commandRecordsCheck({ quiet: true });
    const routingOk = commandRoutingCheck({ quiet: true });
    const guideOk = !needsGuide || commandGuideCheck({ quiet: true });
    const guideBrowserOk = !needsGuide || commandGuideBrowserCheck({ quiet: true });
    const zooOk = commandZooCheck({ quiet: true });
    const zooVisualOk = !needsZooVisual || commandZooVisualGuideCheck({ quiet: true });
    const inventoryOk = commandInventoryCheck({ quiet: true });
    const policyOk = commandPolicyCheck({ quiet: true });
    const traceOk = commandTraceCheck({ quiet: true });
    const hookConfigOk = commandHookConfigCheck({ quiet: true });
    const intakeOk = commandWorkIntakeCheck({ quiet: true });
    const depAuditOk = commandDependencyAuditCheck({ quiet: true });
    const prodZooOk = commandProductionZooBundleCheck({ quiet: true });
    const selfTestFailures = workflowSelfTestChecks().filter((check) => !check.ok);
    const deploymentOk = !args['deployed-gate'] || commandDeploymentCheck({ quiet: true });
    if (!reviewOk || !verifyOk || !auditOk || !handoverOk || !recordsOk || !routingOk || !guideOk || !guideBrowserOk || !zooOk || !zooVisualOk || !inventoryOk || !policyOk || !traceOk || !hookConfigOk || !intakeOk || !branchEvidenceOk || !depAuditOk || !prodZooOk || !deploymentOk || selfTestFailures.length) {
      if (!reviewOk) console.error('Release gate failed: missing passing review record.');
      if (!verifyOk) console.error('Release gate failed: missing passing verification record.');
      if (!auditOk) console.error('Release gate failed: missing passing audit record.');
      if (!recordsOk) {
        console.error('Release gate failed: evidence record integrity problem.');
        for (const problem of recordIntegrityProblems()) console.error(`- ${problem}`);
      }
      if (!routingOk) {
        console.error('Release gate failed: routing scope problem.');
        for (const problem of routingScopeProblems()) console.error(`- ${problem}`);
      }
      if (!guideOk) console.error('Release gate failed: public guide is stale or unsafe. Run npm run workflow:public-guide.');
      if (!guideBrowserOk) {
        console.error('Release gate failed: guide browser validation is missing or stale.');
        for (const problem of guideBrowserProblems()) console.error(`- ${problem}`);
      }
      if (!zooOk) {
        console.error('Release gate failed: Design Zoo/Gym registry inconsistency.');
        for (const problem of zooRegistryProblems()) console.error(`- ${problem}`);
      }
      if (!zooVisualOk) {
        console.error('Release gate failed: Visual Zoo/Gym guide is missing or stale. Run npm run workflow:capture-zoo-visuals and npm run workflow:zoo-visual-guide.');
        for (const problem of zooVisualGuideProblems()) console.error(`- ${problem}`);
      }
      if (!inventoryOk) {
        console.error('Release gate failed: .codex workflow inventory has unmanaged or misplaced files.');
        for (const problem of inventoryProblems()) console.error(`- ${problem}`);
      }
      if (!policyOk) {
        console.error('Release gate failed: workflow policy pack is incomplete or not executable truth.');
        for (const problem of policyProblems()) console.error(`- ${problem}`);
      }
      if (!traceOk) {
        console.error('Release gate failed: workflow command trace telemetry is malformed.');
        for (const problem of commandTraceProblems()) console.error(`- ${problem}`);
      }
      if (!hookConfigOk) {
        console.error('Release gate failed: hook/config enforcement is not pinned.');
        for (const problem of hookConfigProblems()) console.error(`- ${problem}`);
      }
      if (!intakeOk) {
        console.error('Release gate failed: Work Intake traceability is incomplete.');
        for (const problem of intakeProblems()) console.error(`- ${problem}`);
      }
      if (!branchEvidenceOk) {
        console.error('Release gate failed: branch diff evidence is missing or stale.');
        for (const problem of branchEvidenceProblems()) console.error(`- ${problem}`);
      }
      if (!depAuditOk) console.error('Release gate failed: dependency audit baseline check failed. Run npm run audit:deps.');
      if (!prodZooOk) console.error('Release gate failed: production build ships or lacks evidence for the dev-only Zoo bundle. Run npm run build and npm run workflow:prod-zoo-bundle-check.');
      if (!deploymentOk) {
        console.error('Deployment gate failed: missing passing deployment evidence for the current branch.');
        for (const problem of deploymentProblems()) console.error(`- ${problem}`);
      }
      if (!handoverOk) {
        console.error('Release gate failed: current-state handover has stale/finalization wording.');
        for (const problem of handoverProblems()) console.error(`- ${problem}`);
      }
      if (selfTestFailures.length) {
        console.error('Release gate failed: workflow self-test failures.');
        for (const check of selfTestFailures) console.error(`- ${check.name}`);
      }
      process.exit(1);
    }
  }
  if (args.full) {
    const lint = spawnSync(process.execPath, [join(CODEX, 'scripts', 'check-design-tokens.mjs'), '--quiet'], {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: 'inherit',
    });
    if (lint.status !== 0) process.exit(lint.status || 1);
  }
  console.log('workflow validation: ok');
}

function normalizeHookPathCandidate(value) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) return '';
  if (text.length > 300) return '';
  if (/[\n\r\0]/.test(text) || /\\[nr]/.test(text)) return '';
  if (text.includes('@@') || text.includes('*** Begin Patch') || text.includes('*** End Patch')) return '';
  return text;
}

function collectHookPathFields(value, out = []) {
  if (!value || typeof value !== 'object') return out;
  if (Array.isArray(value)) {
    for (const item of value) collectHookPathFields(item, out);
    return out;
  }
  for (const [key, fieldValue] of Object.entries(value)) {
    const normalizedKey = key.toLowerCase().replace(/[-_]/g, '');
    if (['file', 'filepath', 'filename', 'path'].includes(normalizedKey)) {
      const candidate = normalizeHookPathCandidate(fieldValue);
      if (candidate) out.push(candidate);
    } else if (fieldValue && typeof fieldValue === 'object') {
      collectHookPathFields(fieldValue, out);
    }
  }
  return out;
}

function collectHookPatchTexts(value, out = []) {
  if (!value || typeof value !== 'object') return out;
  if (Array.isArray(value)) {
    for (const item of value) collectHookPatchTexts(item, out);
    return out;
  }
  for (const [key, fieldValue] of Object.entries(value)) {
    const normalizedKey = key.toLowerCase().replace(/[-_]/g, '');
    if (['patch', 'patchtext'].includes(normalizedKey) && typeof fieldValue === 'string') {
      out.push(fieldValue);
    } else if (fieldValue && typeof fieldValue === 'object') {
      collectHookPatchTexts(fieldValue, out);
    }
  }
  return out;
}

function parsePatchFilesFromPayload(payload) {
  const input = payload?.tool_input;
  const texts = typeof input === 'string' ? [input] : collectHookPatchTexts(input);
  if (typeof input === 'string' && input.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(input);
      texts.push(...collectHookPatchTexts(parsed));
    } catch {
      // Hook payloads are not guaranteed to be JSON.
    }
  }
  const files = [];
  const headerPattern = /^\*\*\* (?:Add|Update|Delete) File:\s*([^\n\r]+)$/gm;
  for (const text of texts) {
    let match;
    while ((match = headerPattern.exec(text)) !== null) {
      const candidate = normalizeHookPathCandidate(match[1]);
      if (candidate) files.push(candidate);
    }
  }
  files.push(...collectHookPathFields(input));
  return [...new Set(files)];
}

function recordHookHeartbeat(event, payload = {}, extra = {}) {
  ensureDir(RUNTIME_DIR);
  const state = loadJson(join(RUNTIME_DIR, 'hooks-state.json'), { events: [] });
  const at = nowIso();
  state.lastSeenAt = at;
  state.lastEvent = event;
  state.events = [
    {
      at,
      event,
      tool: payload?.tool_name || null,
      files: extra.files || [],
    },
    ...(state.events || []).slice(0, 24),
  ];
  saveJson(join(RUNTIME_DIR, 'hooks-state.json'), state);
}

function hookSessionStart(payload = {}) {
  recordHookHeartbeat('session-start', payload);
  const startPolicy = guideSessionStartPolicy();
  const readDocs = guideSessionStartReadDocs();
  const statusCommand = startPolicy.statusCommand || `${WORKFLOW_WRAPPER.replaceAll('\\', '/')} status`;
  const status = gitText(['status', '--short', '--branch']).split(/\r?\n/).slice(0, 20).join('\n');
  const additionalContext = [
    `${PROFILE.displayName || 'Codex'} workflow is active. Before substantive work read ${readDocs.join(', ')}.`,
    `Run: ${statusCommand}`,
    status ? `Git status:\n${status}` : '',
  ].filter(Boolean).join('\n\n');
  console.log(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'SessionStart',
      additionalContext,
    },
  }));
}

function shellTokens(command) {
  const tokens = [];
  let current = '';
  let quote = null;
  for (let i = 0; i < command.length; i++) {
    const ch = command[i];
    const next = command[i + 1];
    if (quote) {
      if (ch === quote) quote = null;
      else current += ch;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }
    if (/\s/.test(ch)) {
      if (current) {
        tokens.push(current);
        current = '';
      }
      continue;
    }
    if (ch === '&' && next === '&') {
      if (current) tokens.push(current);
      tokens.push('&&');
      current = '';
      i++;
      continue;
    }
    if (ch === '|' && next === '|') {
      if (current) tokens.push(current);
      tokens.push('||');
      current = '';
      i++;
      continue;
    }
    if (ch === ';' || ch === '|') {
      if (current) tokens.push(current);
      tokens.push(ch);
      current = '';
      continue;
    }
    current += ch;
  }
  if (current) tokens.push(current);
  return tokens;
}

function splitShellSegments(tokens) {
  const segments = [];
  let segment = [];
  for (const token of tokens) {
    if (token === ';' || token === '&&' || token === '||' || token === '|') {
      if (segment.length) segments.push(segment);
      segment = [];
      continue;
    }
    segment.push(token);
  }
  if (segment.length) segments.push(segment);
  return segments;
}

function commandBasename(token) {
  return token.replace(/^&\s*/, '').split(/[\\/]/).pop().toLowerCase();
}

function isGitExecutable(token) {
  const base = commandBasename(token);
  return base === 'git' || base === 'git.exe';
}

function gitSubcommand(tokens) {
  const valueFlags = new Set(['-C', '-c', '--git-dir', '--work-tree', '--namespace', '--config-env', '--exec-path']);
  for (let i = 1; i < tokens.length; i++) {
    const token = tokens[i];
    if (!token) continue;
    if (token.startsWith('--') && token.includes('=')) continue;
    if (valueFlags.has(token)) {
      i++;
      continue;
    }
    if (token.startsWith('-')) continue;
    return token.toLowerCase();
  }
  return '';
}

function segmentInvokesGitCommit(segment) {
  const tokens = [...segment];
  while (tokens[0] === '&') tokens.shift();
  if (!tokens.length) return false;
  const first = commandBasename(tokens[0]);
  if ((first === 'cmd' || first === 'cmd.exe') && tokens.some((token) => token.toLowerCase() === '/c')) {
    const idx = tokens.findIndex((token) => token.toLowerCase() === '/c');
    return commandInvokesGitCommit(tokens.slice(idx + 1).join(' '));
  }
  if ((first === 'powershell' || first === 'powershell.exe' || first === 'pwsh' || first === 'pwsh.exe')) {
    const idx = tokens.findIndex((token) => /^-(command|c)$/i.test(token));
    if (idx >= 0) return commandInvokesGitCommit(tokens.slice(idx + 1).join(' '));
  }
  return isGitExecutable(tokens[0]) && gitSubcommand(tokens) === 'commit';
}

function commandInvokesGitCommit(command) {
  return splitShellSegments(shellTokens(String(command || ''))).some(segmentInvokesGitCommit);
}

function hookPreToolUse(payload) {
  recordHookHeartbeat('pre-tool-use', payload);
  const command = payload?.tool_input?.command || payload?.tool_input?.cmd || '';
  if (!commandInvokesGitCommit(command)) return;
  const ok = commandReviewCheck({ quiet: true });
  if (!ok) {
    console.log(JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: 'Nexus workflow: substantive changes need a passing focused review record before git commit.',
      },
    }));
  }
}

function hookPostToolUse(payload) {
  const files = parsePatchFilesFromPayload(payload);
  recordHookHeartbeat('post-tool-use', payload, { files });
  if (!files.length) return;
  const substantive = substantiveFiles(files);
  if (!substantive.length) return;
  const title = `Hook ${payload?.tool_name || payload?.hook_event_name || 'tool'} changed substantive files`;
  invalidateGates(substantive, title, 'codex-hook', {});
}

function hookStop() {
  recordHookHeartbeat('stop');
  const recordsOk = commandRecordsCheck({ quiet: true });
  if (!recordsOk) {
    console.log(JSON.stringify({
      continue: true,
      systemMessage: 'Nexus workflow: committed evidence records were edited. Create correction records instead of changing historical evidence.',
    }));
    return;
  }
  const handoverOk = commandHandoverCheck({ quiet: true });
  if (!handoverOk) {
    console.log(JSON.stringify({
      continue: true,
      systemMessage: `Nexus workflow: current-state handover has stale/finalization wording. Run npm run workflow:handover-check before final handover.`,
    }));
    return;
  }
  const files = substantiveFiles();
  if (!files.length) {
    console.log(JSON.stringify({ continue: true }));
    return;
  }
  const ok = commandReviewCheck({ quiet: true });
  if (!ok) {
    console.log(JSON.stringify({
      continue: true,
      systemMessage: 'Nexus workflow: substantive changes are present without a passing review record. Run nexus-review before commit or handover.',
    }));
    return;
  }
  const verifyOk = commandVerifyCheck({ quiet: true });
  const auditOk = commandAuditCheck({ quiet: true });
  if (!verifyOk || !auditOk) {
    const missing = [];
    if (!verifyOk) missing.push('verification');
    if (!auditOk) missing.push('audit');
    console.log(JSON.stringify({
      continue: true,
      systemMessage: `Nexus workflow: substantive changes have review but still need ${missing.join(' and ')} evidence before final handover/release.`,
    }));
    return;
  }
  console.log(JSON.stringify({ continue: true }));
}

function commandRecordGeneric(kind, args) {
  const title = args.summary || `${kind.slice(0, -1)} record`;
  const body = args.notes || 'No details provided.';
  const rec = writeRecord(kind, title, body, { author: args.author || 'codex' });
  console.log(`Recorded ${kind.slice(0, -1)} ${rec.id}`);
  console.log(relative(ROOT, rec.path));
}

const argv = process.argv.slice(2);
const command = argv[0] || 'status';
const args = parseArgs(argv.slice(1));
const helpTarget = command === 'help' ? (args._[0] || '') : command;

if (command === '--help' || command === '-h' || command === 'help' || hasTopLevelHelp(argv.slice(1))) {
  console.log(helpTextForCommand(helpTarget));
  process.exit(0);
}

ensureDir(RECORDS);
ensureDir(STATE_DIR);

if (command === 'status') commandStatus();
else if (command === 'health') commandHealth();
else if (command === 'dashboard') commandDashboard(args);
else if (command === 'public-guide') commandPublicGuide(args);
else if (command === 'zoo-visual-guide') commandZooVisualGuide(args);
else if (command === 'record-intent') commandRecordIntent(args);
else if (command === 'record-work-slice' || command === 'record-slice') commandRecordWorkSlice(args);
else if (command === 'close-work-slice' || command === 'close-slice') commandCloseWorkSlice(args);
else if (command === 'record-patch') commandRecordPatch(args);
else if (command === 'record-review') commandRecordReview(args);
else if (command === 'record-verify') commandRecordVerification(args);
else if (command === 'record-audit') commandRecordAudit(args);
else if (command === 'record-guide-browser') commandRecordGuideBrowser(args);
else if (command === 'guide-browser-finalize') await commandGuideBrowserFinalize(args);
else if (command === 'record-test') commandRecordTest(args);
else if (command === 'record-deployment') commandRecordDeployment(args);
else if (command === 'record-decision') commandRecordGeneric('decisions', args);
else if (command === 'record-routing') commandRecordRouting(args);
else if (command === 'complete-routing') commandCompleteRouting(args);
else if (command === 'record-pattern') commandRecordPattern(args);
else if (command === 'review-check') {
  const ok = commandReviewCheck();
  process.exit(ok ? 0 : 1);
} else if (command === 'validate') commandValidate(args);
else if (command === 'verify-check') {
  const ok = commandVerifyCheck();
  process.exit(ok ? 0 : 1);
} else if (command === 'audit-check') {
  const ok = commandAuditCheck();
  process.exit(ok ? 0 : 1);
} else if (command === 'handover-check') {
  const ok = commandHandoverCheck(args);
  process.exit(ok ? 0 : 1);
} else if (command === 'model-routing-check') {
  const ok = commandModelRoutingCheck(args);
  process.exit(ok ? 0 : 1);
} else if (command === 'routing-check') {
  const ok = commandRoutingCheck(args);
  process.exit(ok ? 0 : 1);
} else if (command === 'work-intake-check' || command === 'intake-check') {
  const ok = commandWorkIntakeCheck(args);
  process.exit(ok ? 0 : 1);
} else if (command === 'records-check') {
  const ok = commandRecordsCheck(args);
  process.exit(ok ? 0 : 1);
} else if (command === 'guide-check') {
  const ok = commandGuideCheck(args);
  process.exit(ok ? 0 : 1);
} else if (command === 'guide-browser-check') {
  const ok = commandGuideBrowserCheck(args);
  process.exit(ok ? 0 : 1);
} else if (command === 'zoo-check') {
  const ok = commandZooCheck(args);
  process.exit(ok ? 0 : 1);
} else if (command === 'zoo-visual-guide-check') {
  const ok = commandZooVisualGuideCheck(args);
  process.exit(ok ? 0 : 1);
} else if (command === 'inventory-check') {
  const ok = commandInventoryCheck(args);
  process.exit(ok ? 0 : 1);
} else if (command === 'policy-check') {
  const ok = commandPolicyCheck(args);
  process.exit(ok ? 0 : 1);
} else if (command === 'trace-check') {
  const ok = commandTraceCheck(args);
  process.exit(ok ? 0 : 1);
} else if (command === 'hook-config-check') {
  const ok = commandHookConfigCheck(args);
  process.exit(ok ? 0 : 1);
} else if (command === 'hook-runtime-check') {
  const ok = commandHookRuntimeCheck(args);
  process.exit(ok ? 0 : 1);
} else if (command === 'branch-evidence-check') {
  const ok = commandBranchEvidenceCheck(args);
  process.exit(ok ? 0 : 1);
} else if (command === 'dependency-audit-check') {
  const ok = commandDependencyAuditCheck(args);
  process.exit(ok ? 0 : 1);
} else if (command === 'prod-zoo-bundle-check') {
  const ok = commandProductionZooBundleCheck(args);
  process.exit(ok ? 0 : 1);
} else if (command === 'deployment-check') {
  const ok = commandDeploymentCheck(args);
  process.exit(ok ? 0 : 1);
} else if (command === 'run-command' || command === 'run') {
  process.exit(commandRunCommand(argv.slice(1)));
} else if (command === 'self-test') commandSelfTest();
else if (command === 'hook') {
  const event = argv[1];
  const stdin = readStdin();
  const payload = stdin ? loadJsonFromString(stdin, {}) : {};
  if (event === 'session-start') hookSessionStart(payload);
  else if (event === 'pre-tool-use') hookPreToolUse(payload);
  else if (event === 'post-tool-use') hookPostToolUse(payload);
  else if (event === 'stop') hookStop(payload);
} else {
  console.error(`Unknown command: ${command}`);
  process.exit(2);
}

function loadJsonFromString(text, fallback) {
  try {
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}
