#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { appendFileSync, existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve, relative } from 'node:path';
import { platform, tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const START = process.cwd();
const ROOT = findRoot(START);
const CODEX = join(ROOT, '.codex');
const RECORDS = join(CODEX, 'workflow', 'records');
const STATE_DIR = join(CODEX, 'workflow', 'state');
const RUNTIME_DIR = join(CODEX, 'workflow', 'runtime');
const STATE_FILE = join(STATE_DIR, 'review-state.json');
const VERIFY_STATE_FILE = join(STATE_DIR, 'verify-state.json');
const AUDIT_STATE_FILE = join(STATE_DIR, 'audit-state.json');
const PATCH_STATE_FILE = join(STATE_DIR, 'patch-state.json');
const GUIDE_BROWSER_STATE_FILE = join(STATE_DIR, 'guide-browser-state.json');
const DASHBOARD_DIR = join(CODEX, 'dashboard');
const ZOO_GUIDE_DIR = join(DASHBOARD_DIR, 'zoo');
const ZOO_GUIDE_MANIFEST = join(ZOO_GUIDE_DIR, 'manifest.json');
const ROUTING_SCENARIOS_FILE = join(CODEX, 'workflow', 'scenarios', 'model-routing.json');
const ROUTING_STATE_FILE = join(STATE_DIR, 'routing-state.json');
const COMMAND_RUNS_FILE = join(RUNTIME_DIR, 'command-runs.jsonl');
const PUBLIC_GUIDE_URL = 'https://cv.rehou.games/nexus/workflow/';
const PUBLIC_GUIDE_VERSION = 'nexus-public-workflow-guide/v2';
const ZOO_VISUAL_GUIDE_VERSION = 'nexus-design-zoo-visual-guide/v1';
const PUBLIC_GUIDE_CONTENT_HASH_PLACEHOLDER = '__NEXUS_GUIDE_CONTENT_HASH__';
const RECORD_KINDS = ['decisions', 'pattern-proposals', 'routing', 'patches', 'reviews', 'tests', 'audits', 'guide-browser', 'deployments'];
const EVIDENCE_RECORD_KINDS = ['pattern-proposals', 'routing', 'patches', 'reviews', 'tests', 'audits', 'guide-browser', 'deployments'];
const GUIDE_RECORD_KINDS = RECORD_KINDS.filter((kind) => kind !== 'guide-browser');
const SCHEMA_BY_KIND = {
  decisions: 'nexus-decision/v1',
  deployments: 'nexus-deployment/v1',
  'guide-browser': 'nexus-guide-browser/v1',
  patches: 'nexus-patch/v1',
  'pattern-proposals': 'nexus-pattern-proposal/v1',
  routing: 'nexus-routing/v1',
  reviews: 'nexus-review/v1',
  tests: 'nexus-test/v1',
  audits: 'nexus-audit/v1',
};
const LEGACY_SCHEMA_BY_KIND = {
  patches: ['nexus-patche/v1'],
};
const LEGACY_SCHEMA_RECORDS = new Set([
  '.codex/workflow/records/patches/PATCH-20260508T170713Z-design-system-toast-semantic-parity.md',
  '.codex/workflow/records/patches/PATCH-20260508T174121Z-codex-native-workflow-migration-claude-workflow-.md',
  '.codex/workflow/records/patches/PATCH-20260508T174348Z-refresh-compact-workflow-state-and-dashboard-aft.md',
  '.codex/workflow/records/patches/PATCH-20260508T175045Z-record-deployment-evidence-and-update-workflow-h.md',
  '.codex/workflow/records/patches/PATCH-20260509T013840Z-correct-final-handover-state-after-server-pull.md',
  '.codex/workflow/records/patches/PATCH-20260509T014004Z-make-final-server-head-handover-wording-stable.md',
  '.codex/workflow/records/patches/PATCH-20260509T020234Z-harden-handover-workflow-model-routing-hooks-gui.md',
  '.codex/workflow/records/patches/PATCH-20260509T020903Z-record-public-guide-deployment-evidence.md',
]);

function findRoot(start) {
  let dir = resolve(start);
  while (dir !== dirname(dir)) {
    if (existsSync(join(dir, '.codex')) || existsSync(join(dir, 'package.json'))) return dir;
    dir = dirname(dir);
  }
  return resolve(start);
}

function ensureDir(path) {
  mkdirSync(path, { recursive: true });
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

function sortedStringSet(values = []) {
  return [...new Set((values || []).map(String))].sort();
}

function sameStringSet(actual = [], expected = []) {
  return JSON.stringify(sortedStringSet(actual)) === JSON.stringify(sortedStringSet(expected));
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
    if (RECORD_KINDS.some((kind) => f.startsWith(`.codex/workflow/records/${kind}/`)) && f !== '.codex/workflow/records/risks.md') return false;
    if (f.startsWith('.codex/archive/')) return false;
    return (
      f.startsWith('packages/') ||
      f.startsWith('scripts/') ||
      f === 'package.json' ||
      f === 'package-lock.json' ||
      f === 'tsconfig.json' ||
      f === 'AGENTS.md' ||
      f === 'WORKFLOW.md' ||
      f === '.codex/README.md' ||
      f === '.codex/config.toml' ||
      f.startsWith('.github/workflows/') ||
      f.startsWith('.agents/skills/') ||
      f.startsWith('.codex/agents/') ||
      f.startsWith('.codex/hooks') ||
      f.startsWith('.codex/scripts/') ||
      f.startsWith('.codex/knowledge/') ||
      f.startsWith('.codex/workflow/current-state.md') ||
      f === '.codex/workflow/state/.gitignore' ||
      f === '.codex/workflow/runtime/.gitignore' ||
      f === '.codex/workflow/dependency-audit-baseline.json' ||
      f.startsWith('.codex/workflow/scenarios/') ||
      f.startsWith('.codex/workflow/templates/') ||
      f.startsWith('.codex/workflow/research/')
    );
  });
}

function verificationRelevantFiles(files = changedFiles()) {
  return substantiveFiles(files).filter((file) => {
    const f = file.replaceAll('\\', '/');
    return (
      f.startsWith('packages/web/src/') ||
      f.startsWith('packages/api/src/') ||
      f.startsWith('packages/web/tests/') ||
      f.startsWith('packages/api/src/modules/') ||
      f.startsWith('design/reference/') ||
      f.startsWith('.agents/skills/') ||
      f.startsWith('.codex/agents/') ||
      f.startsWith('.codex/hooks') ||
      f.startsWith('.codex/scripts/') ||
      f.startsWith('.codex/knowledge/') ||
      f.startsWith('.codex/workflow/current-state.md') ||
      f === '.codex/workflow/dependency-audit-baseline.json' ||
      f.startsWith('.codex/workflow/scenarios/') ||
      f.startsWith('.codex/workflow/templates/') ||
      f.startsWith('.codex/workflow/research/') ||
      f === 'AGENTS.md' ||
      f === 'WORKFLOW.md' ||
      f === '.codex/README.md' ||
      f === '.codex/config.toml' ||
      f.startsWith('.github/workflows/') ||
      f === 'package.json' ||
      f === 'package-lock.json'
    );
  });
}

function auditRelevantFiles(files = changedFiles()) {
  return substantiveFiles(files).filter((file) => {
    const f = file.replaceAll('\\', '/');
    return (
      f.startsWith('packages/api/src/modules/') ||
      f.startsWith('packages/web/src/apps/') ||
      f.startsWith('packages/web/src/components/') ||
      f.startsWith('packages/web/src/platform/') ||
      f.startsWith('packages/web/src/routes/') ||
      f.startsWith('.codex/') ||
      f.startsWith('.agents/') ||
      f.startsWith('.github/workflows/') ||
      f.startsWith('scripts/') ||
      f === 'AGENTS.md' ||
      f === 'WORKFLOW.md' ||
      f === 'package.json' ||
      f === 'package-lock.json'
    );
  });
}

function guideRelevantFiles(files = changedFiles()) {
  return files.filter((file) => {
    const f = file.replaceAll('\\', '/');
    if (f.startsWith('.codex/workflow/state/') || f.startsWith('.codex/workflow/runtime/')) return false;
    if (f.startsWith('.codex/workflow/records/guide-browser/')) return false;
    return (
      f === 'AGENTS.md' ||
      f === 'WORKFLOW.md' ||
      f === 'package.json' ||
      f.startsWith('.agents/skills/') ||
      f.startsWith('.codex/dashboard/') ||
      f.startsWith('.codex/') ||
      f.startsWith('.github/workflows/')
    );
  });
}

function zooVisualRelevantFiles(files = changedFiles()) {
  return files.filter((file) => {
    const f = file.replaceAll('\\', '/');
    if (f.startsWith('.codex/workflow/state/') || f.startsWith('.codex/workflow/runtime/')) return false;
    return (
      f.startsWith('packages/web/src/components/') ||
      f.startsWith('packages/web/src/platform/theme/') ||
      f.startsWith('packages/web/src/routes/__design/') ||
      f === 'packages/web/src/routeTree.tsx' ||
      f === 'packages/web/src/components/registry.json' ||
      f.startsWith('design/') ||
      f === '.codex/knowledge/design-system.md' ||
      f.startsWith('.codex/dashboard/zoo/') ||
      f === '.codex/scripts/capture-design-zoo-visuals.mjs' ||
      f === '.codex/scripts/validate-design-zoo.mjs' ||
      f === '.codex/scripts/check-production-zoo-bundle.mjs'
    );
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
      return [file, createHash('sha256').update(readFileSync(path)).digest('hex')];
    } catch {
      return [file, 'missing'];
    }
  });
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
  const prefixes = {
    decisions: 'DECISION',
    deployments: 'DEPLOYMENT',
    patches: 'PATCH',
    'pattern-proposals': 'PATTERN-PROPOSAL',
    routing: 'ROUTING',
    reviews: 'REVIEW',
    tests: 'TEST',
    audits: 'AUDIT',
    'guide-browser': 'GUIDE-BROWSER',
  };
  return prefixes[kind] || kind.replace(/s$/, '').toUpperCase();
}

function recordSchema(kind) {
  return SCHEMA_BY_KIND[kind] || `nexus-${kind.replace(/s$/, '')}/v1`;
}

function writeRecord(kind, title, body, frontmatter = {}) {
  const dir = join(RECORDS, kind);
  ensureDir(dir);
  const id = `${recordPrefix(kind)}-${nowIso().replace(/[-:]/g, '').replace(/\..+/, 'Z')}-${slug(title)}`;
  const path = join(dir, `${id}.md`);
  const fm = {
    schema: recordSchema(kind),
    id,
    created: nowIso(),
    ...frontmatter,
  };
  const text = `---\n${Object.entries(fm).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join('\n')}\n---\n\n# ${title}\n\n${body.trim()}\n`;
  writeFileSync(path, text);
  return { id, path };
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
  if (value.includes('/')) return join(ROOT, value);
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
  const dir = `.codex/workflow/records/${kind}`;
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

function publicSafe(value) {
  return String(value || '')
    .replaceAll(ROOT.replaceAll('\\', '/'), 'local worktree')
    .replaceAll(ROOT, 'local worktree')
    .replace(/C:\\Users\\[^\\\s]+\\\.codex\\worktrees\\\d+\\nexus/gi, 'local worktree')
    .replace(/\/root\/monoWeb\/nexus/g, 'server repo')
    .replace(/\/root\/monoWeb\/deploy-backups\/[^\s)]+/g, 'server backup path')
    .replace(/~\/\.ssh\/[^\s)`]+/g, 'configured SSH key')
    .replace(/\b[A-Za-z0-9._-]+@(?:\d{1,3}\.){3}\d{1,3}\b/g, 'configured SSH endpoint')
    .replace(/\broot@/g, 'ssh-user@')
    .replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, 'production server')
    .replace(/(token|secret|password|api[_-]?key)=([^&\s]+)/gi, '$1=redacted');
}

function publicHtml(value) {
  return escapeHtml(publicSafe(value));
}

function recordCategory(kind, title = '') {
  const text = `${kind} ${title}`.toLowerCase();
  if (kind === 'deployments' || text.includes('server') || text.includes('deploy')) return 'Deployment';
  if (kind === 'tests' || kind === 'reviews' || kind === 'guide-browser' || text.includes('audit') || text.includes('verify')) return 'Validation';
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

function gitStatusMap(pathspec = []) {
  return new Map(gitStatusEntries(pathspec).map((entry) => [entry.file, entry.status]));
}

function gitRefExists(ref) {
  return git(['rev-parse', '--verify', '--quiet', ref]).status === 0;
}

function gitPathExistsAtHead(file) {
  if (!gitRefExists('HEAD')) return false;
  return git(['cat-file', '-e', `HEAD:${file}`]).status === 0;
}

function recordHistoryBase() {
  const configured = process.env.NEXUS_RECORD_BASE;
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
  const paths = EVIDENCE_RECORD_KINDS.map((kind) => `.codex/workflow/records/${kind}`);
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
  const configured = process.env.NEXUS_BRANCH_BASE || process.env.NEXUS_RECORD_BASE;
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
    base,
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
    const referenceProblems = evidenceReferenceProblems(verifyState, 'verification state');
    if ((recordProblems.length || referenceProblems.length) && !recordHasVerificationPass(verifyState.worktreeHash)) {
      problems.push(...recordProblems, ...referenceProblems);
    }
  }
  if (auditState.verdict === 'pass') {
    const recordProblems = evidenceRecordProblems('audits', auditState.auditRecord, {
      worktreeHash: auditState.worktreeHash,
      verdict: auditState.verdict,
    }, 'audit state');
    const referenceProblems = evidenceReferenceProblems(auditState, 'audit state');
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
  const isNewStagedRecord = !trackedAtHead && status[0] === 'A' && status[1] !== 'D';
  if (isNewStagedRecord) return '';
  return `Existing evidence record changed or was removed: ${entry.status.trim() || entry.status} ${entry.file}. Create a correction record instead of editing committed evidence.`;
}

function recordIntegrityProblems() {
  const paths = EVIDENCE_RECORD_KINDS.map((kind) => `.codex/workflow/records/${kind}`);
  const entries = gitStatusEntries(paths);
  const statusByFile = gitStatusMap(RECORD_KINDS.map((kind) => `.codex/workflow/records/${kind}`));
  const problems = [];
  for (const entry of entries) {
    const problem = evidenceStatusProblem(entry, gitPathExistsAtHead(entry.file));
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

function routeFilesFromArgs(args) {
  return csv(args.files || args.scope || args['write-scope']);
}

function fileMatchesPattern(file, pattern) {
  const f = file.replaceAll('\\', '/');
  const p = String(pattern || '').replaceAll('\\', '/');
  if (!p) return false;
  if (p.endsWith('/')) return f.startsWith(p);
  if (!p.includes('*')) return f === p || f.startsWith(`${p}/`);
  const escaped = p.replace(/[.+^${}()|[\]\\]/g, '\\$&').replaceAll('**', '.*').replaceAll('*', '[^/]*');
  return new RegExp(`^${escaped}$`).test(f);
}

function routingScopeProblems(files = substantiveFiles()) {
  const routingState = loadJson(ROUTING_STATE_FILE, {});
  const patchState = loadJson(PATCH_STATE_FILE, {});
  return routingScopeProblemsForState(routingState, files, patchState);
}

function isLeadWorker(worker) {
  const value = String(worker || '').trim().toLowerCase();
  return !value || ['codex', 'codex-lead', 'lead', 'workflow', 'codex-hook'].includes(value);
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
  if (files.length) kinds.add('general');
  const designRelevant = files.some((file) => {
    const f = file.replaceAll('\\', '/');
    return f.startsWith('packages/web/src/components/')
      || f.startsWith('packages/web/src/platform/theme/')
      || f.startsWith('packages/web/src/routes/__design/')
      || f === 'packages/web/src/routeTree.tsx'
      || f === 'packages/web/src/components/registry.json'
      || f.startsWith('design/')
      || f.startsWith('.codex/dashboard/')
      || f === '.codex/knowledge/design-system.md'
      || f === '.codex/scripts/capture-design-zoo-visuals.mjs'
      || f === '.codex/scripts/validate-design-zoo.mjs'
      || f === '.codex/scripts/check-production-zoo-bundle.mjs';
  });
  if (designRelevant) kinds.add('design');
  const workflowRelevant = files.some((file) => {
    const f = file.replaceAll('\\', '/');
    return f === 'AGENTS.md'
      || f === 'WORKFLOW.md'
      || f === 'package.json'
      || f === 'package-lock.json'
      || f.startsWith('scripts/')
      || f.startsWith('.github/workflows/')
      || f.startsWith('.codex/')
      || f.startsWith('.agents/skills/');
  });
  if (workflowRelevant) kinds.add('workflow');
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
    && !evidenceReferenceProblems(record, `verification record ${record.id || record.name}`).length);
}

function recordHasAuditPass(hash) {
  return recordFrontmatters('audits').some((record) => record.worktreeHash === hash
    && record.verdict === 'pass'
    && !evidenceReferenceProblems(record, `audit record ${record.id || record.name}`).length);
}

function zooRegistryProblems() {
  const registry = loadJson(join(ROOT, 'packages', 'web', 'src', 'components', 'registry.json'), { primitives: [], patterns: [] });
  const entries = [...(registry.primitives || []), ...(registry.patterns || [])];
  const zooText = readText('packages/web/src/routes/__design/Zoo.tsx');
  const problems = [];
  for (const entry of entries) {
    if (!entry.path || !existsSync(join(ROOT, entry.path))) problems.push(`Registry entry ${entry.name || '(unnamed)'} points to missing file ${entry.path || '(missing path)'}.`);
    if (!entry.zooRoute) {
      problems.push(`Registry entry ${entry.name || '(unnamed)'} is missing zooRoute.`);
      continue;
    }
    const slugName = entry.zooRoute.replace(/^\/design\//, '');
    const escapedSlug = slugName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const slugPattern = /^[A-Za-z_$][\w$]*$/.test(slugName)
      ? new RegExp(`(?:['"]${escapedSlug}['"]|\\b${escapedSlug})\\s*:`)
      : new RegExp(`['"]${escapedSlug}['"]\\s*:`);
    if (!slugPattern.test(zooText)) problems.push(`Registry entry ${entry.name || slugName} declares ${entry.zooRoute} but Zoo.tsx has no showcase mapping.`);
  }
  return problems;
}

function slugFromZooRoute(route) {
  return String(route || '').replace(/^\/design\/?/, '') || 'index';
}

function zooVisualEntries() {
  const registry = loadJson(join(ROOT, 'packages', 'web', 'src', 'components', 'registry.json'), { primitives: [], patterns: [], tokens: {} });
  const foundations = [
    {
      slug: 'index',
      title: 'Zoo Index',
      kind: 'foundation',
      route: '/design',
      path: 'packages/web/src/routes/__design/Zoo.tsx',
      purpose: 'Entry page for the live component catalog.',
    },
    {
      slug: 'tokens',
      title: 'Token Foundations',
      kind: 'foundation',
      route: '/design/tokens',
      path: 'packages/web/src/platform/theme/tokens.css',
      purpose: 'Production token swatches for colors, radii, shadows, and hit targets.',
    },
    {
      slug: 'themes',
      title: 'Theme Matrix',
      kind: 'foundation',
      route: '/design/themes',
      path: 'packages/web/src/platform/theme/themes.css',
      purpose: 'All cuisine themes rendered side by side from real components.',
    },
  ];
  const components = [...(registry.primitives || []), ...(registry.patterns || [])].map((entry) => ({
    slug: slugFromZooRoute(entry.zooRoute),
    title: entry.name || slugFromZooRoute(entry.zooRoute),
    kind: entry.kind || 'component',
    route: entry.zooRoute || `/design/${slugFromZooRoute(entry.zooRoute)}`,
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
  return uniqueExisting([
    '.codex/scripts/nexus-workflow.mjs',
    '.codex/scripts/capture-design-zoo-visuals.mjs',
    '.codex/knowledge/design-system.md',
    'packages/web/src/components/registry.json',
    ...registrySourceFiles,
    ...listFilesUnder('packages/web/src/components', 8, 300),
    'packages/web/src/routes/__design/Zoo.tsx',
    'packages/web/src/platform/theme/tokens.css',
    'packages/web/src/platform/theme/themes.css',
    ...listFilesUnder('packages/web/src/platform/theme/themes', 2, 64),
  ]);
}

function zooVisualSourceHash() {
  const files = zooVisualInputFiles().map((file) => ({
    file,
    hash: createHash('sha256').update(canonicalTextForHash(readFileSync(join(ROOT, file), 'utf8'))).digest('hex'),
  }));
  const manifest = existsSync(ZOO_GUIDE_MANIFEST)
    ? createHash('sha256').update(canonicalTextForHash(readFileSync(ZOO_GUIDE_MANIFEST, 'utf8'))).digest('hex')
    : 'missing';
  const payload = JSON.stringify({
    version: ZOO_VISUAL_GUIDE_VERSION,
    files,
    manifest,
  });
  return createHash('sha256').update(payload).digest('hex').slice(0, 24);
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
  if (!existsSync(ZOO_GUIDE_MANIFEST)) problems.push('.codex/dashboard/zoo/manifest.json is missing; run npm run workflow:capture-zoo-visuals.');
  if (!existsSync(htmlPath)) problems.push('.codex/dashboard/zoo/index.html is missing; run npm run workflow:zoo-visual-guide.');
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
      const asset = target.asset || `.codex/dashboard/zoo/assets/${context.id}/${entry.slug}.jpg`;
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
    if (!html.includes(`name="nexus-guide-version" content="${ZOO_VISUAL_GUIDE_VERSION}"`)) problems.push('visual Zoo/Gym guide version is stale; regenerate zoo/index.html.');
    if (htmlMetaContent(html, 'nexus-guide-source-hash') !== zooVisualSourceHash()) problems.push('visual Zoo/Gym guide source hash is stale; regenerate zoo/index.html.');
    if (!guideContentHashOk(html)) problems.push('visual Zoo/Gym guide content hash is stale or was edited outside the generator; regenerate zoo/index.html.');
    for (const required of [
      'Nexus Design Zoo / Gym',
      'Visual Demo Surface',
      'Captured From Real /design Routes',
      'Visual Contexts',
      'Token Foundations',
      'Theme Matrix',
      'Component Gallery',
      'packages/web/src/routes/__design/Zoo.tsx',
      'packages/web/src/components/registry.json',
    ]) {
      if (!html.includes(required)) problems.push(`visual Zoo/Gym guide is missing required content: ${required}`);
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

function publicGuideInputFiles() {
  const files = new Set([
    'AGENTS.md',
    'WORKFLOW.md',
    'package.json',
    '.codex/README.md',
    '.codex/config.toml',
    '.codex/workflow/dependency-audit-baseline.json',
    '.codex/scripts/audit-deps.mjs',
    '.codex/scripts/check-production-zoo-bundle.mjs',
    '.codex/scripts/nexus-workflow.mjs',
    '.codex/scripts/capture-design-zoo-visuals.mjs',
    '.codex/knowledge/design-system.md',
    '.codex/knowledge/deployment.md',
    '.codex/knowledge/hooks.md',
    '.codex/knowledge/model-routing.md',
    '.codex/knowledge/patterns.md',
    '.codex/workflow/current-state.md',
    '.codex/workflow/records/risks.md',
    'packages/web/src/components/registry.json',
    'packages/web/src/routes/__design/Zoo.tsx',
  ]);
  for (const dir of [
    '.agents/skills',
    '.codex/agents',
    '.codex/workflow/records',
    '.codex/workflow/scenarios',
    '.codex/workflow/templates',
    '.github/workflows',
    'packages/web/src/platform/theme',
    'packages/web/src/routes',
  ]) {
    for (const file of listFilesUnder(dir, 8, 600)) files.add(file);
  }
  for (const file of [...files]) {
    if (file.startsWith('.codex/workflow/records/guide-browser/')) files.delete(file);
    if (file.startsWith('.codex/workflow/state/')) files.delete(file);
    if (file.startsWith('.codex/workflow/runtime/')) files.delete(file);
  }
  return [...files]
    .filter((file) => existsSync(join(ROOT, file)) && statSync(join(ROOT, file)).isFile())
    .sort();
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

function cssDeclarationValue(block, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = block.match(new RegExp(`${escaped}\\s*:\\s*([^;]+);`));
  return match?.[1]?.trim() || '';
}

function productionGuideTokenCss() {
  const text = readText('packages/web/src/platform/theme/tokens.css');
  const block = text.match(/:root\s*{([\s\S]*?)\n}/)?.[1] || '';
  const required = [
    '--color-bg-surface',
    '--color-bg-muted',
    '--color-bg-elevated',
    '--color-bg-strong',
    '--color-text',
    '--color-text-secondary',
    '--color-text-inverse',
    '--color-border',
    '--color-primary',
    '--color-primary-light',
    '--color-danger',
    '--color-accent',
    '--radius-md',
    '--radius-lg',
    '--radius-full',
    '--radius-card',
    '--radius-btn',
    '--radius-chip',
    '--hit-sm',
    '--hit-md',
    '--hit-lg',
  ];
  return required.map((name) => {
    const value = cssDeclarationValue(block, name);
    if (!value) throw new Error(`Missing production token ${name} in packages/web/src/platform/theme/tokens.css`);
    return `${name}: ${value};`;
  }).join('\n      ');
}

function htmlMetaContent(html, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return (html.match(new RegExp(`<meta\\s+name=["']${escaped}["']\\s+content=["']([^"']+)["']\\s*\\/?>`, 'i'))?.[1] || '').trim();
}

function guideContentHash(html) {
  const canonical = String(html).replace(/(<meta\s+name=["']nexus-guide-content-hash["']\s+content=["'])[^"']*(["']\s*\/?>)/i, '$1$2');
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
  const recorded = htmlMetaContent(html, 'nexus-guide-content-hash');
  return Boolean(recorded) && recorded === guideContentHash(html);
}

function guideViewContractProblems(html, label = 'guide') {
  const requiredStrings = [
    'Workflow System Nodes',
    'Codex Workflow Nodes',
    '.codex/workflow/records',
    'Project Structure',
    'Repository Nodes',
    'Web App Nodes',
    'Design System / Zoo / Docs',
    'Design-System Nodes',
    'Design-System Flow',
    'Design Zoo/Gym coverage',
    'Visual Zoo/Gym Guide',
    'Design And Workflow Documents',
    'packages/web/src/components/registry.json',
    'packages/web/src/routes/__design/Zoo.tsx',
    'How Future Sessions Resume',
    'Model Routing Examples',
    'spark-narrow-toast-warning',
    'strong-theme-cascade-body-portal',
    'escalate-spark-timebox-stalled',
    'Workflow Event Timeline',
  ];
  const problems = [];
  for (const required of requiredStrings) {
    if (!html.includes(required)) problems.push(`${label} is missing guide view contract item: ${required}`);
  }
  const recordCategoryCount = (html.match(/<h3>(Workflow|Validation|Knowledge|Agent Routing|Deployment)<\/h3>/g) || []).length;
  if (recordCategoryCount < 3) problems.push(`${label} event timeline is missing multiple workflow record categories.`);
  return problems;
}

function guideArtifactHash() {
  const payload = {};
  for (const name of ['index.html', 'public.html', 'zoo/index.html', 'zoo/manifest.json']) {
    const path = join(DASHBOARD_DIR, name);
    payload[name] = existsSync(path) ? createHash('sha256').update(readFileSync(path)).digest('hex') : 'missing';
  }
  for (const target of zooManifestTargets()) {
    const asset = target.asset || `.codex/dashboard/zoo/assets/${target.slug}.jpg`;
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

function artifactEvidenceProblems(evidence, label = 'artifact evidence') {
  const required = [...(Array.isArray(evidence?.screenshots) ? evidence.screenshots : []), evidence?.summaryFile]
    .filter(Boolean);
  const entries = Array.isArray(evidence?.evidenceArtifacts) ? evidence.evidenceArtifacts : [];
  const problems = [];
  if (!required.length) {
    problems.push(`${label} has no screenshot or summary files.`);
    return problems;
  }
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
  const missing = screenshots.filter((file) => !existsSync(join(ROOT, file)));
  if (summaryFile && !existsSync(join(ROOT, summaryFile))) missing.push(summaryFile);
  if (missing.length) {
    console.error('record-guide-browser evidence files are missing:');
    for (const file of missing) console.error(`- ${file}`);
    process.exit(2);
  }
  const evidenceArtifacts = artifactEvidenceForFiles([...screenshots, summaryFile].filter(Boolean));
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
    if (Number(entry.brokenImages || 0) !== 0) problems.push(`guide browser summary entry has broken images: ${entry.name}`);
  }
  const dashboard = entries.find((entry) => entry.name === 'dashboard-artifact');
  const guide = entries.find((entry) => entry.name === 'workflow-guide-artifact');
  const zoo = entries.filter((entry) => String(entry.name || '').startsWith('workflow-zoo-artifact-'));
  if (dashboard && dashboard.title !== 'Nexus Workflow Dashboard') problems.push(`dashboard artifact title mismatch: ${dashboard.title}`);
  if (guide && guide.title !== 'Nexus Workflow Guide') problems.push(`public guide artifact title mismatch: ${guide.title}`);
  for (const entry of zoo) {
    if (entry.title !== 'Nexus Design Zoo / Gym') problems.push(`Zoo/Gym artifact title mismatch for ${entry.name}: ${entry.title}`);
    if (Number(entry.imageCount || 0) < 1) problems.push(`Zoo/Gym artifact has no screenshots in DOM: ${entry.name}`);
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
    textSample: document.body.innerText.slice(0, 300),
    imageCount: document.images.length,
    brokenImages: [...document.images].filter((img) => !img.complete || img.naturalWidth === 0).length,
  }), name);
}

async function commandGuideBrowserFinalize(args = {}) {
  commandZooVisualGuide({ quiet: true });
  commandDashboard({ quiet: true });
  commandPublicGuide({ quiet: true });

  const outDirRel = args['out-dir'] || '.codex/workflow/artifacts/screenshots/guide-browser-final';
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
    reviewer: args.reviewer || 'codex-lead',
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

function graphHtml(title, nodes, edges = []) {
  const labels = new Set(nodes.map((node) => node.label));
  const missing = edges.filter(([a, b]) => !labels.has(a) || !labels.has(b));
  if (missing.length) {
    const detail = missing.map(([a, b]) => `${a} -> ${b}`).join(', ');
    throw new Error(`Graph ${title} references missing node labels: ${detail}`);
  }
  const edgeText = edges.length ? `<p class="meta">${edges.map(([a, b]) => `${publicHtml(a)} -> ${publicHtml(b)}`).join(' · ')}</p>` : '';
  return `
    <div class="graph">
      <h3>${publicHtml(title)}</h3>
      <div class="nodes">
        ${nodes.map((node) => `<div class="node"><strong>${publicHtml(node.label)}</strong><span>${publicHtml(node.detail || '')}</span></div>`).join('\n')}
      </div>
      ${edgeText}
    </div>
  `;
}

function commandDashboard(args = {}) {
  ensureDir(DASHBOARD_DIR);
  const recordKinds = GUIDE_RECORD_KINDS;
  const rawRecords = Object.fromEntries(recordKinds.map((kind) => [kind, listRecords(kind)]));
  const records = displayRecords(rawRecords);
  const currentState = readText('.codex/workflow/current-state.md');
  const patterns = readText('.codex/knowledge/patterns.md');
  const design = readText('.codex/knowledge/design-system.md');
  const deployment = readText('.codex/knowledge/deployment.md');
  const risks = readText('.codex/workflow/records/risks.md');
  const branch = gitText(['branch', '--show-current']) || '(detached HEAD)';
  const generated = nowIso();
  const sourceHash = publicGuideSourceHash();
  const tokenRootCss = productionGuideTokenCss();
  const registry = loadJson(join(ROOT, 'packages', 'web', 'src', 'components', 'registry.json'), {
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
    ['Pattern Proposals', records['pattern-proposals'].length],
    ['Routing', records.routing.length],
    ['Patches', records.patches.length],
    ['Reviews', records.reviews.length],
    ['Tests', records.tests.length],
    ['Audits', records.audits.length],
    ['Deployments', records.deployments.length],
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
  <meta name="nexus-guide-version" content="${PUBLIC_GUIDE_VERSION}" />
  <meta name="nexus-guide-source-hash" content="${sourceHash}" />
  <meta name="nexus-guide-content-hash" content="${PUBLIC_GUIDE_CONTENT_HASH_PLACEHOLDER}" />
  <meta name="nexus-token-source" content="packages/web/src/platform/theme/tokens.css" />
  <title>Nexus Workflow Dashboard</title>
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
    <h1>Nexus Workflow Dashboard</h1>
    <div class="meta">Generated ${escapeHtml(generated)} · branch ${escapeHtml(branch)}</div>
  </header>
  <div class="layout">
    <nav>
      <a href="#overview">Overview</a>
      <a href="#current">Current State</a>
      <a href="#zoo">Design Zoo/Gym</a>
      <a href="#patterns">Patterns</a>
      <a href="#design">Design System</a>
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
        <p class="meta">This is a generated snapshot for navigation. It intentionally does not embed live git status or mutable gate state. Run <code>npm run workflow:status</code> for the current worktree truth.</p>
      </section>
      <section id="current" class="panel">${markdownLite(currentState)}</section>
      <section id="zoo" class="panel">
        <h2>Design Zoo / Gym</h2>
        <p>The production component gym is the dev-only app route at <code>http://localhost:5173/design</code>. It reads real source components through <code>packages/web/src/routes/__design/Zoo.tsx</code>; this dashboard reads <code>packages/web/src/components/registry.json</code> so coverage is visible here too.</p>
        <p><a href="http://localhost:5173/design">Open local zoo index</a> after running <code>npm run dev:web</code> or <code>npm run dev:all</code>.</p>
        <p><a href="zoo/index.html">Open generated Visual Zoo/Gym Guide</a> for captured previews that can be deployed to <code>${escapeHtml(PUBLIC_GUIDE_URL)}zoo/</code>.</p>
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
              ${entry.zooRoute ? `<p><a href="http://localhost:5173${escapeHtml(entry.zooRoute)}">${escapeHtml(entry.zooRoute)}</a></p>` : '<p class="muted">No zoo route declared.</p>'}
              <p>${escapeHtml(entry.purpose || '')}</p>
            </article>
          `).join('\n')}
        </div>
      </section>
      <section id="patterns" class="panel">${markdownLite(patterns)}</section>
      <section id="design" class="panel">${markdownLite(design)}</section>
      <section id="records" class="panel">
        <h2>Record Index</h2>
        <p class="muted">Records are markdown files under .codex/workflow/records. This dashboard is a generated browser view; the markdown remains the source of truth.</p>
      </section>
      ${recordHtml}
      <section id="risks" class="panel risk">${markdownLite(risks)}</section>
      <section id="deployment" class="panel">${markdownLite(deployment)}</section>
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
  const sourceHash = publicGuideSourceHash();
  const tokenRootCss = productionGuideTokenCss();
  const rawRecords = Object.fromEntries(GUIDE_RECORD_KINDS.map((kind) => [kind, listRecords(kind)]));
  const records = displayRecords(rawRecords);
  const allRecords = Object.entries(records)
    .flatMap(([kind, items]) => items.map((record) => ({ ...record, kind })))
    .sort((a, b) => String(b.created).localeCompare(String(a.created)));
  const recordsByCategory = allRecords.reduce((acc, record) => {
    const category = recordCategory(record.kind, record.title);
    acc[category] = acc[category] || [];
    acc[category].push(record);
    return acc;
  }, {});
  const risks = publicSafe(markdownSection(readText('.codex/workflow/records/risks.md'), 'Open'));
  const routingScenarios = loadJson(ROUTING_SCENARIOS_FILE, []);
  const registry = loadJson(join(ROOT, 'packages', 'web', 'src', 'components', 'registry.json'), { primitives: [], patterns: [] });
  const zooEntries = [...(registry.primitives || []), ...(registry.patterns || [])];
  const zooLinked = zooEntries.filter((entry) => entry.zooRoute).length;
  const themes = registry.tokens?.themes || childDirs('packages/web/src/platform/theme/themes');
  const routeFiles = listFilesUnder('packages/web/src/routes', 3, 32);
  const agentFiles = listFilesUnder('.codex/agents', 1, 16);
  const skillFiles = listFilesUnder('.agents/skills', 2, 16).filter((file) => file.endsWith('SKILL.md'));
  const docs = uniqueExisting([
    'design/reference/v1/nexus-design-system/README.md',
    'design/reference/v1/nexus-design-system/project/DESIGN-SYSTEM.md',
    'design/reference/v1/nexus-design-system/project/themes/THEME-GUIDE.md',
    'design/reference/v1/nexus-design-system/project/ui_kits/customer/README.md',
    'design/reference/v1/nexus-design-system/project/ui_kits/merchant/README.md',
    '.codex/knowledge/design-system.md',
    '.codex/knowledge/patterns.md',
    '.codex/knowledge/model-routing.md',
    '.codex/knowledge/hooks.md',
    '.codex/knowledge/verification.md',
    '.codex/knowledge/deployment.md',
  ]);
  const projectNodes = [
    { label: 'packages/api', detail: `${countFilesUnder('packages/api/src')} source files` },
    { label: 'packages/api/src/modules', detail: childDirs('packages/api/src/modules').join(', ') },
    { label: 'packages/web', detail: `${countFilesUnder('packages/web/src')} source files` },
    { label: 'packages/web/src/routes', detail: `${routeFiles.length} indexed route files` },
    { label: 'packages/web/src/locales', detail: `${countFilesUnder('packages/web/src/locales', 2)} locale files` },
    { label: 'packages/shared', detail: `${countFilesUnder('packages/shared/src')} source files` },
    { label: '.codex workflow', detail: `${countFilesUnder('.codex/workflow')} workflow files` },
    { label: '.codex/workflow/records', detail: `${allRecords.length} indexed records` },
  ];
  const webNodes = [
    { label: 'packages/web/src/routes', detail: `${routeFiles.length} indexed route files` },
    { label: 'apps/ordering', detail: childDirs('packages/web/src/apps/ordering').join(', ') },
    { label: 'platform', detail: childDirs('packages/web/src/platform').join(', ') },
    { label: 'platform/theme', detail: `${themes.length} production themes` },
    { label: 'platform/registry.ts', detail: 'app registry and module composition' },
    { label: 'components/ui', detail: `${countFilesUnder('packages/web/src/components/ui', 1)} files` },
    { label: 'components/patterns', detail: `${countFilesUnder('packages/web/src/components/patterns', 2)} files` },
    { label: 'components/registry.json', detail: `${zooEntries.length} UI entries` },
    { label: 'routes/__design', detail: `${countFilesUnder('packages/web/src/routes/__design', 1)} files` },
  ];
  const designNodes = [
    { label: 'design/reference/v1', detail: `${countFilesUnder('design/reference/v1', 4)} files` },
    { label: 'theme tokens', detail: 'packages/web/src/platform/theme' },
    { label: 'ThemeProvider', detail: 'body data-theme mirroring and cascade' },
    { label: 'themed patterns', detail: 'packages/web/src/components/patterns/themed' },
    { label: 'registry', detail: 'component metadata and Zoo routes' },
    { label: 'Design Zoo/Gym', detail: `${zooLinked}/${zooEntries.length} registry routes` },
  ];
  const workflowNodes = [
    { label: 'AGENTS.md', detail: 'Codex project instructions' },
    { label: '.codex/README.md', detail: 'workflow root navigation' },
    { label: '.codex/knowledge', detail: 'patterns, design, routing, hooks, deployment' },
    { label: '.codex/agents', detail: `${agentFiles.length} agent config files` },
    { label: '.agents/skills', detail: `${skillFiles.length} repo skills` },
    { label: 'nexus-workflow.mjs', detail: 'deterministic gates and records' },
    { label: '.codex/workflow/records', detail: `${allRecords.length} indexed records` },
  ];
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="nexus-guide-version" content="${PUBLIC_GUIDE_VERSION}" />
  <meta name="nexus-guide-source-hash" content="${sourceHash}" />
  <meta name="nexus-guide-content-hash" content="${PUBLIC_GUIDE_CONTENT_HASH_PLACEHOLDER}" />
  <meta name="nexus-token-source" content="packages/web/src/platform/theme/tokens.css" />
  <title>Nexus Workflow Guide</title>
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
    <h1>Nexus Workflow Guide</h1>
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
      ${graphHtml('Codex Workflow Nodes', workflowNodes, [['AGENTS.md', '.codex/README.md'], ['.codex/knowledge', '.codex/agents'], ['nexus-workflow.mjs', '.codex/workflow/records']])}
      <div class="grid">
        <div class="card"><strong>${records.routing.length}</strong><p>routing records</p></div>
        <div class="card"><strong>${routingScenarios.length}</strong><p>routing scenarios</p></div>
        <div class="card"><strong>${agentFiles.length}</strong><p>agent configs</p></div>
        <div class="card"><strong>${skillFiles.length}</strong><p>repo skills</p></div>
      </div>
    </section>
    <section>
      <h2>Project Structure</h2>
      ${graphHtml('Repository Nodes', projectNodes, [['packages/api', 'packages/shared'], ['packages/web', 'packages/shared'], ['.codex workflow', '.codex/workflow/records']])}
      ${graphHtml('Web App Nodes', webNodes, [['packages/web/src/routes', 'apps/ordering'], ['apps/ordering', 'platform'], ['components/ui', 'components/patterns']])}
    </section>
    <section>
      <h2>Design System / Zoo / Docs</h2>
      <p class="meta">Design Zoo/Gym source: <code>packages/web/src/routes/__design/Zoo.tsx</code>. Registry source: <code>packages/web/src/components/registry.json</code>.</p>
      ${graphHtml('Design-System Nodes', designNodes, [['design/reference/v1', 'theme tokens'], ['theme tokens', 'themed patterns'], ['registry', 'Design Zoo/Gym']])}
      ${graphHtml('Design-System Flow', [
        { label: 'Reference bundle', detail: 'frozen v1 design source' },
        { label: 'Production tokens/themes', detail: 'CSS custom properties and data-theme' },
        { label: 'ThemeProvider', detail: 'runtime theme and body mirroring' },
        { label: 'Component registry', detail: 'metadata, paths, Zoo routes' },
        { label: 'Design Zoo/Gym', detail: 'interactive coverage route' },
        { label: 'validate-design-zoo', detail: 'browser validation script' },
        { label: 'Visual Zoo/Gym Guide', detail: 'deployed screenshot gallery' },
      ], [['Reference bundle', 'Production tokens/themes'], ['Production tokens/themes', 'ThemeProvider'], ['ThemeProvider', 'Component registry'], ['Component registry', 'Design Zoo/Gym'], ['Design Zoo/Gym', 'validate-design-zoo'], ['Design Zoo/Gym', 'Visual Zoo/Gym Guide']])}
      <p>Design Zoo/Gym coverage: <strong>${zooLinked}/${zooEntries.length}</strong> registry entries declare a route.</p>
      <p><a href="zoo/">Open Visual Zoo/Gym Guide</a>. Production <code>/nexus/design</code> remains dev-only; the deployable visual surface is <code>/nexus/workflow/zoo/</code>.</p>
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
        <li>Read <code>WORKFLOW.md</code>, <code>AGENTS.md</code>, then <code>.codex/workflow/current-state.md</code>.</li>
        <li>Use the canonical ladder: <code>npm run workflow:status</code>, <code>npm run workflow:health</code> when diagnosis is needed, <code>npm run workflow:release-gate</code> before local handover, and <code>npm run workflow:deployed-gate</code> after server validation.</li>
        <li>Use detailed records under <code>.codex/workflow/records/</code> instead of loading chat transcripts.</li>
        <li>Use <code>.codex/knowledge/</code> for patterns, design-system rules, model routing, and deployment guidance.</li>
      </ul>
      <h3>Branch Closeout</h3>
      <p class="meta">Worktree records are interim evidence. Branches close with branch-scope records tied to the current branch hash.</p>
      <pre>node .codex/scripts/nexus-workflow.mjs record-patch --scope branch --summary "&lt;branch summary&gt;" --worker codex-lead
node .codex/scripts/nexus-workflow.mjs record-review --scope branch --kind general --verdict pass --reviewer &lt;name&gt; --notes "&lt;summary&gt;"
node .codex/scripts/nexus-workflow.mjs record-verify --scope branch --verdict pass --verifier &lt;name&gt; --commands "&lt;timed-command-ids&gt;" --notes "&lt;commands/results&gt;"
node .codex/scripts/nexus-workflow.mjs record-audit --scope branch --verdict pass --auditor &lt;name&gt; --commands "&lt;timed-command-ids&gt;" --notes "&lt;summary&gt;"</pre>
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
      <div class="grid">
        ${GUIDE_RECORD_KINDS.map((kind) => {
          const items = records[kind] || [];
          const label = kind === 'audits' ? 'audits (first-class + legacy)' : kind;
          return `<div class="card"><strong>${items.length}</strong><p>${publicHtml(label)}</p></div>`;
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
  <meta name="nexus-guide-version" content="${ZOO_VISUAL_GUIDE_VERSION}" />
  <meta name="nexus-guide-source-hash" content="${sourceHash}" />
  <meta name="nexus-guide-content-hash" content="${PUBLIC_GUIDE_CONTENT_HASH_PLACEHOLDER}" />
  <meta name="nexus-token-source" content="packages/web/src/platform/theme/tokens.css" />
  <title>Nexus Design Zoo / Gym</title>
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
    <h1>Nexus Design Zoo / Gym</h1>
    <div class="meta">Visual Demo Surface · generated ${publicHtml(generated)} · captured ${publicHtml(capturedAt)}</div>
  </header>
  <main>
    <section class="intro">
      <div class="panel">
        <h2>Captured From Real /design Routes</h2>
        <p>This page is the deployable visual guide for the dev-only component gym. Screenshots are captured from real Nexus components rendered by <code>packages/web/src/routes/__design/Zoo.tsx</code>, and coverage is driven by <code>packages/web/src/components/registry.json</code>.</p>
        <p>Production <code>/nexus/design</code> is intentionally not mounted. Use this guide at <code>/nexus/workflow/zoo/</code> for deployed visual inspection, and use local <code>http://localhost:5173/design</code> for live interaction.</p>
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

function hookConfigProblems() {
  const problems = [];
  const config = readText('.codex/config.toml');
  const hooks = loadJson(join(CODEX, 'hooks.json'), {});
  if (!/^\s*sandbox_mode\s*=\s*"danger-full-access"\s*$/m.test(config)) problems.push('.codex/config.toml should set sandbox_mode = "danger-full-access" for the project Custom profile.');
  if (!/^\s*approval_policy\s*=\s*"never"\s*$/m.test(config)) problems.push('.codex/config.toml should set approval_policy = "never" so Custom(config.toml) does not prompt for shell approvals.');
  if (!/^\s*codex_hooks\s*=\s*true\s*$/m.test(config)) problems.push('.codex/config.toml should enable features.codex_hooks = true.');
  if (!/^\s*multi_agent\s*=\s*true\s*$/m.test(config)) problems.push('.codex/config.toml should enable features.multi_agent = true.');
  const hookMap = hooks.hooks || {};
  const expectedCommands = {
    SessionStart: 'node .codex/scripts/run-hook.mjs session-start',
    PreToolUse: 'node .codex/scripts/run-hook.mjs pre-tool-use',
    PostToolUse: 'node .codex/scripts/run-hook.mjs post-tool-use',
    Stop: 'node .codex/scripts/run-hook.mjs stop',
  };
  const expectedMatchers = {
    SessionStart: 'startup|resume',
    PreToolUse: 'Bash',
    PostToolUse: 'Bash|apply_patch|Edit|Write',
  };
  for (const event of Object.keys(expectedCommands)) {
    if (!Array.isArray(hookMap[event]) || hookMap[event].length === 0) problems.push(`.codex/hooks.json is missing ${event} hook entries.`);
    for (const entry of hookMap[event] || []) {
      if (Object.hasOwn(expectedMatchers, event) && entry.matcher !== expectedMatchers[event]) {
        problems.push(`${event} matcher must be exactly "${expectedMatchers[event]}".`);
      }
      if (event === 'Stop' && Object.hasOwn(entry, 'matcher')) problems.push('Stop hook should not define a matcher.');
    }
    const eventHooks = (hookMap[event] || []).flatMap((entry) => entry.hooks || []);
    if (eventHooks.length !== 1) problems.push(`${event} should have exactly one thin command hook.`);
    for (const hook of eventHooks) {
      if (hook.type !== 'command') problems.push(`${event} hook must be type=command.`);
      if (hook.command !== expectedCommands[event]) problems.push(`${event} hook command must be exactly "${expectedCommands[event]}".`);
      if (String(hook.command || '').includes('-e') || /[;&|]/.test(String(hook.command || ''))) problems.push(`${event} hook command contains inline shell logic; use run-hook.mjs only.`);
      if (Number(hook.timeout || 0) > 30) problems.push(`${event} hook timeout should stay at or below 30 seconds.`);
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

function hookRuntimeProblems({ maxAgeDays = 14 } = {}) {
  const runtime = loadJson(join(RUNTIME_DIR, 'hooks-state.json'), {});
  const problems = [];
  if (!runtime.lastSeenAt) {
    problems.push('no hook runtime heartbeat recorded in this checkout; hooks may not be loaded, so rely on explicit workflow gates.');
    return problems;
  }
  const ageMs = Date.now() - Date.parse(runtime.lastSeenAt);
  if (!Number.isFinite(ageMs)) problems.push(`hook runtime heartbeat timestamp is invalid: ${runtime.lastSeenAt}.`);
  else if (ageMs > 1000 * 60 * 60 * 24 * maxAgeDays) problems.push(`hook runtime heartbeat is older than ${maxAgeDays} days: ${runtime.lastSeenAt}.`);
  return problems;
}

function commandHookRuntimeCheck({ quiet = false } = {}) {
  const problems = hookRuntimeProblems();
  const runtime = loadJson(join(RUNTIME_DIR, 'hooks-state.json'), {});
  if (!quiet) {
    console.log(`hook runtime problems: ${problems.length}`);
    if (runtime.lastSeenAt) console.log(`last hook heartbeat: ${runtime.lastSeenAt} (${runtime.lastEvent || 'unknown'})`);
    for (const problem of problems) console.log(`- ${problem}`);
  }
  return problems.length === 0;
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
    command: Array.isArray(run.command) ? run.command : [],
    cwd: run.cwd || '.',
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

function evidenceReferenceProblems(record, label = 'execution evidence') {
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
  for (const artifact of artifacts) {
    if (/^https?:\/\//i.test(artifact)) continue;
    if (!existsSync(join(ROOT, artifact))) problems.push(`${label} artifact/check reference is missing: ${artifact}.`);
  }
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

function commandRunCommand(rawArgs = []) {
  const args = parseRunCommandArgs(rawArgs);
  if (!args.commandArgs.length) {
    console.error('run-command requires a command after --, for example: node .codex/scripts/nexus-workflow.mjs run-command --id status -- npm run workflow:status');
    return 2;
  }
  return runTimedCommand(args.commandArgs, {
    id: args.id,
    timeoutMs: args.timeoutMs || 120000,
    warnMs: args.warnMs || undefined,
    cwd: args.cwd || ROOT,
  }).exitCode;
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
  const recordsOk = commandRecordsCheck({ quiet: true });
  const routingOk = commandRoutingCheck({ quiet: true });
  const guideOk = health ? commandGuideCheck({ quiet: true }) : null;
  const guideBrowserOk = health ? commandGuideBrowserCheck({ quiet: true }) : null;
  const zooVisualOk = health ? commandZooVisualGuideCheck({ quiet: true }) : null;
  const hookConfigOk = health ? commandHookConfigCheck({ quiet: true }) : null;
  const hookRuntimeOk = commandHookRuntimeCheck({ quiet: true });
  const depAuditOk = health ? commandDependencyAuditCheck({ quiet: true }) : null;
  const prodZooOk = health ? commandProductionZooBundleCheck({ quiet: true }) : null;
  const branchEvidenceOk = health ? commandBranchEvidenceCheck({ quiet: true }) : null;
  const currentHash = worktreeHash();
  const reviewed = commandReviewCheck({ quiet: true });
  const verified = commandVerifyCheck({ quiet: true });
  const audited = commandAuditCheck({ quiet: true });
  saveJson(join(RUNTIME_DIR, 'session-state.json'), {
    lastStatusAt: nowIso(),
    health,
    worktreeHash: currentHash,
    branch,
  });
  console.log(`Nexus Codex workflow ${health ? 'health' : 'status'}`);
  console.log(`root: ${ROOT}`);
  console.log(`branch: ${branch}`);
  console.log(`changed files: ${files.length}`);
  console.log(`substantive files: ${substantive.length}`);
  console.log(`worktree hash: ${currentHash}`);
  console.log(`reviewed: ${reviewed ? 'yes' : 'no'}`);
  console.log(`verified: ${verified ? 'yes' : 'no'}`);
  console.log(`audited: ${audited ? 'yes' : 'no'}`);
  console.log(`handover: ${handoverOk ? 'ok' : 'needs attention'}`);
  console.log(`records: ${recordsOk ? 'ok' : 'needs attention'}`);
  console.log(`routing: ${routingOk ? 'ok' : 'needs attention'}`);
  if (health) {
    console.log(`guide: ${guideOk ? 'ok' : 'needs attention'}`);
    console.log(`guide browser: ${guideBrowserOk ? 'ok' : 'needs attention'}`);
    console.log(`zoo visual guide: ${zooVisualOk ? 'ok' : 'needs attention'}`);
    console.log(`hook config: ${hookConfigOk ? 'ok' : 'needs attention'}`);
  }
  console.log(`hook runtime: ${hookRuntimeOk ? 'seen' : 'not seen'}`);
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
}

function commandRecordPatch(args, hookPayload = null) {
  const hash = worktreeHash();
  const branch = branchEvidenceInfo();
  const scope = args.scope || 'worktree';
  const files = args.files ? csv(args.files) : (scope === 'branch' ? branch.files : substantiveFiles());
  const title = args.summary || hookPayload?.tool_name || 'Patch';
  const routingState = loadJson(ROUTING_STATE_FILE, {});
  const routingId = args.routing || args['routing-id'] || (routingState.worktreeHash === hash ? routingState.routingId : '') || '';
  const agent = args.worker || args.agent || 'codex-lead';
  const body = [
    `Summary: ${title}`,
    `Scope: ${scope}`,
    `Agent: ${agent}`,
    `Routing: ${routingId || 'n/a'}`,
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
  const files = args.files ? csv(args.files) : (scope === 'branch' ? branch.files : substantiveFiles());
  const patchId = args.patch || args['patch-id'] || (patchState.worktreeHash === hash ? patchState.patchId : null);
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
  const files = args.files ? csv(args.files) : (scope === 'branch' ? branch.files : []);
  const commandIds = csv(args.commands || args['command-ids']);
  const artifacts = csv(args.artifacts || args.evidence || args['summary-files']);
  if (verdict === 'pass' && !commandIds.length && !artifacts.length) {
    console.error('record-verify pass requires --commands/--command-ids or --artifacts/--evidence so execution evidence is reference-based.');
    process.exit(2);
  }
  const commandEvidence = commandEvidenceForIds(commandIds, { requirePass: verdict === 'pass' });
  if (commandEvidence.problems.length) {
    console.error('record-verify command evidence problems:');
    for (const problem of commandEvidence.problems) console.error(`- ${problem}`);
    process.exit(2);
  }
  const title = `Verification ${verdict} ${scope}`;
  const body = [
    `Scope: ${scope}`,
    `Verdict: ${verdict}`,
    `Verifier: ${args.verifier || 'unknown'}`,
    `Worktree hash: ${hash}`,
    scope === 'branch' && branch.hash ? `Branch evidence hash: ${branch.hash}` : '',
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
    commandIds,
    commandEvidence: commandEvidence.evidence,
    artifacts,
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
    artifacts,
    notes: args.notes || '',
  });
  console.log(`Recorded verification ${rec.id}`);
  console.log(relative(ROOT, rec.path));
}

function commandRecordTest(args) {
  if (!args.summary || !args.notes) {
    console.error('record-test requires --summary and --notes.');
    process.exit(2);
  }
  return commandRecordGeneric('tests', args);
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
  if (!args.summary || !target || !args.notes) {
    console.error('record-deployment requires --summary, --target, and --notes.');
    process.exit(2);
  }
  if (verdict === 'pass' && !commandIds.length && !artifacts.length) {
    console.error('record-deployment pass requires --commands/--command-ids or durable --artifacts/--evidence. --checks are descriptive and not proof by themselves.');
    process.exit(2);
  }
  const commandEvidence = commandEvidenceForIds(commandIds, { requirePass: verdict === 'pass' });
  if (commandEvidence.problems.length) {
    console.error('record-deployment command evidence problems:');
    for (const problem of commandEvidence.problems) console.error(`- ${problem}`);
    process.exit(2);
  }
  const body = [
    `Target: ${target}`,
    `Verdict: ${verdict}`,
    `Operator: ${args.operator || args.deployer || 'unknown'}`,
    branch.hash ? `Branch evidence hash: ${branch.hash}` : '',
    commandIds.length ? `Command run ids: ${commandIds.join(', ')}` : '',
    checks.length ? `Checks: ${checks.join(', ')}` : '',
    artifacts.length ? `Artifacts: ${artifacts.join(', ')}` : '',
    ...commandEvidenceLines(commandEvidence.evidence),
    '',
    `Notes: ${args.notes}`,
  ].filter(Boolean).join('\n');
  const rec = writeRecord('deployments', args.summary, body, {
    target,
    verdict,
    operator: args.operator || args.deployer || 'unknown',
    commandIds,
    commandEvidence: commandEvidence.evidence,
    checks,
    artifacts,
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
  const files = args.files ? csv(args.files) : (scope === 'branch' ? branch.files : []);
  const commandIds = csv(args.commands || args['command-ids']);
  const artifacts = csv(args.artifacts || args.evidence || args['summary-files']);
  if (verdict === 'pass' && !commandIds.length && !artifacts.length) {
    console.error('record-audit pass requires --commands/--command-ids or --artifacts/--evidence so audit evidence is reference-based.');
    process.exit(2);
  }
  const commandEvidence = commandEvidenceForIds(commandIds, { requirePass: verdict === 'pass' });
  if (commandEvidence.problems.length) {
    console.error('record-audit command evidence problems:');
    for (const problem of commandEvidence.problems) console.error(`- ${problem}`);
    process.exit(2);
  }
  const title = `Audit ${verdict} ${scope}`;
  const body = [
    `Scope: ${scope}`,
    `Verdict: ${verdict}`,
    `Auditor: ${args.auditor || 'unknown'}`,
    `Worktree hash: ${hash}`,
    scope === 'branch' && branch.hash ? `Branch evidence hash: ${branch.hash}` : '',
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
    commandIds,
    commandEvidence: commandEvidence.evidence,
    artifacts,
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
    artifacts,
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
  const route = String(args.route || '').toLowerCase();
  const validRoutes = ['lead', 'spark', 'strong', 'research', 'review', 'integrated-review', 'escalate', 'escalate-to-strong'];
  if (!validRoutes.includes(route)) {
    console.error(`record-routing requires --route ${validRoutes.join('|')}`);
    process.exit(2);
  }
  const files = routeFilesFromArgs(args);
  const fallbackTarget = args.fallback || args['fallback-target'] || '';
  const fallbackTrigger = args['fallback-trigger'] || args.trigger || '';
  const verification = args.verification || args.tests || '';
  const worker = args.worker || args.agent || route;
  const hash = worktreeHash();
  if (!args.summary || !worker || !verification) {
    console.error('record-routing requires --summary, --worker, and --verification.');
    process.exit(2);
  }
  if ((route.includes('spark') || route.includes('escalate')) && (!fallbackTarget || !fallbackTrigger)) {
    console.error('Spark/escalation routing requires --fallback-target and --fallback-trigger.');
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
    `Verification: ${verification}`,
    `Fallback trigger: ${fallbackTrigger || 'n/a'}`,
    `Fallback target: ${fallbackTarget || 'n/a'}`,
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
    verification,
    fallbackTrigger,
    fallbackTarget,
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
    verification,
    fallbackTrigger,
    fallbackTarget,
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
  const stateEvidenceReferenced = evidenceReferenceProblems(state, 'verification state').length === 0;
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
  const stateEvidenceReferenced = evidenceReferenceProblems(state, 'audit state').length === 0;
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
  problems.push(...evidenceReferenceProblems(deployment, `deployment record ${deployment.id || deployment.name}`));
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

function branchEvidenceProblemsForState(branch, recordsByKind) {
  const problems = [];
  if (!branch.base) return ['branch evidence check could not find a base ref. Set NEXUS_BRANCH_BASE or fetch origin/main.'];
  if (!branch.mergeBase) return [`branch evidence check could not compute merge-base for ${branch.base}.`];
  if (!branch.files.length) return problems;

  const patches = recordsByKind.patches || [];
  const branchPatches = patches.filter((record) => branchRecordMatches(record, branch));
  if (!branchPatches.some((record) => String(record.scope || '') === 'branch')) {
    problems.push(`branch ${branch.hash} has substantive diff but no branch-scope PATCH record tied to branchHash ${branch.hash}.`);
  }

  const reviews = recordsByKind.reviews || [];
  for (const kind of requiredBranchReviewKinds(branch.files)) {
    const ok = reviews.some((record) => branchRecordMatches(record, branch, { verdict: 'pass', kind }));
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
  if (verificationRelevantFiles(branch.files).length && !tests.some((record) => branchRecordMatches(record, branch, { verdict: 'pass' }) && !evidenceReferenceProblems(record, `verification record ${record.id || record.name}`).length)) {
    problems.push(`branch ${branch.hash} changes verification-relevant files but has no passing verification record tied to this branch diff.`);
  }

  const audits = recordsByKind.audits || [];
  if (auditRelevantFiles(branch.files).length && !audits.some((record) => branchRecordMatches(record, branch, { verdict: 'pass' }) && !evidenceReferenceProblems(record, `audit record ${record.id || record.name}`).length)) {
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
  const publicPath = join(DASHBOARD_DIR, 'public.html');
  const dashboardPath = join(DASHBOARD_DIR, 'index.html');
  if (!existsSync(publicPath)) {
    problems.push('.codex/dashboard/public.html is missing; run npm run workflow:public-guide.');
  } else {
    const html = readFileSync(publicPath, 'utf8');
    if (!html.includes(`name="nexus-guide-version" content="${PUBLIC_GUIDE_VERSION}"`)) problems.push('public guide version is stale; regenerate public.html.');
    if (htmlMetaContent(html, 'nexus-guide-source-hash') !== expectedHash) problems.push('public guide source hash is stale; regenerate public.html.');
    if (!guideContentHashOk(html)) problems.push('public guide content hash is stale or was edited outside the generator; regenerate public.html.');
    if (htmlMetaContent(html, 'nexus-token-source') !== 'packages/web/src/platform/theme/tokens.css') problems.push('public guide does not declare production token source.');
    problems.push(...guideViewContractProblems(html, 'public guide'));
    for (const forbidden of [ROOT, ROOT.replaceAll('\\', '/'), '/root/monoWeb/nexus', '/root/monoWeb/deploy-backups', '~/.ssh/', 'DIOkii', 'root@', '134.199.148.87']) {
      if (forbidden && html.includes(forbidden)) problems.push(`public guide contains unsanitized private string: ${forbidden}`);
    }
  }
  if (!existsSync(dashboardPath)) {
    problems.push('.codex/dashboard/index.html is missing; run npm run workflow:dashboard.');
  } else {
    const html = readFileSync(dashboardPath, 'utf8');
    if (!html.includes(`name="nexus-guide-version" content="${PUBLIC_GUIDE_VERSION}"`)) problems.push('dashboard guide version is stale; regenerate index.html.');
    if (htmlMetaContent(html, 'nexus-guide-source-hash') !== expectedHash) problems.push('dashboard source hash is stale; regenerate index.html.');
    if (!guideContentHashOk(html)) problems.push('dashboard content hash is stale or was edited outside the generator; regenerate index.html.');
    if (htmlMetaContent(html, 'nexus-token-source') !== 'packages/web/src/platform/theme/tokens.css') problems.push('dashboard does not declare production token source.');
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
  const strongSignals = [
    'ambiguous',
    'crossCutting',
    'architecture',
    'designJudgment',
    'visualValidation',
    'deployment',
    'themeCascade',
    'tenantIsolation',
    'routingBasepath',
    'schemaMigration',
    'missingTests',
    'unknownPattern',
  ];
  if (strongSignals.some((key) => scenario[key])) return 'strong';
  if (scenario.narrow && scenario.explicitBehavior && scenario.clearTests && scenario.narrowWriteScope) return 'spark';
  return 'strong';
}

function modelRoutingScenarioResult(scenario) {
  const schemaProblems = [];
  if (!scenario.id) schemaProblems.push('missing id');
  if (!scenario.summary) schemaProblems.push('missing summary');
  if (!scenario.expectedRoute) schemaProblems.push('missing expectedRoute');
  if ((scenario.expectedRoute || '').startsWith('escalate') && !scenario.expectedFallbackTarget) schemaProblems.push('escalation scenario missing expectedFallbackTarget');
  const actual = routingDecision(scenario);
  const expected = scenario.expectedRoute;
  const fallbackOk = !String(expected || '').startsWith('escalate') || scenario.expectedFallbackTarget === (scenario.fallbackTarget || 'nexus_strong_worker');
  if (!fallbackOk) schemaProblems.push(`expectedFallbackTarget ${scenario.expectedFallbackTarget} does not match fallbackTarget ${scenario.fallbackTarget || 'nexus_strong_worker'}`);
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
  const passEvidence = (id) => [{ id, exitCode: 0, timedOut: false }];
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
  add('record schema maps patches correctly', recordSchema('patches') === 'nexus-patch/v1');
  add('record schema maps routing correctly', recordSchema('routing') === 'nexus-routing/v1');
  add('record schema maps audits correctly', recordSchema('audits') === 'nexus-audit/v1');
  add('record schema maps guide browser correctly', recordSchema('guide-browser') === 'nexus-guide-browser/v1');
  add('pattern proposals are protected evidence', EVIDENCE_RECORD_KINDS.includes('pattern-proposals'));
  add('guide browser validation is protected evidence', EVIDENCE_RECORD_KINDS.includes('guide-browser'));
  add('state cache evidence rejects missing durable record', evidenceRecordProblems('reviews', 'REVIEW-DOES-NOT-EXIST', { verdict: 'pass' }, 'fixture review state').length > 0);
  add('generated guide artifacts are non-substantive but trigger guide gates', substantiveFiles(['.codex/dashboard/public.html', '.codex/dashboard/index.html']).length === 0
    && guideRelevantFiles(['.codex/dashboard/public.html', '.codex/dashboard/index.html']).length === 2);
  add('visual zoo guide artifacts are non-substantive but trigger visual gates', substantiveFiles(['.codex/dashboard/zoo/index.html', '.codex/dashboard/zoo/assets/button.jpg']).length === 0
    && zooVisualRelevantFiles(['.codex/dashboard/zoo/index.html', '.codex/dashboard/zoo/assets/button.jpg']).length === 2);
  add('guide source hash is content based', /^[a-f0-9]{24}$/.test(publicGuideSourceHash()));
  add('visual zoo source hash is content based', /^[a-f0-9]{24}$/.test(zooVisualSourceHash()));
  add('hook config pins no-prompt custom permission mode', hookConfigProblems().filter((problem) => problem.includes('approval_policy') || problem.includes('sandbox_mode')).length === 0);
  add('hook config keeps hooks as workflow-kernel triggers', hookConfigProblems().filter((problem) => problem.includes('nexus-workflow.mjs')).length === 0);
  add('hook config rejects inline command logic', (() => {
    const original = readText('.codex/hooks.json');
    return original.includes('run-hook.mjs') && !original.includes('node -e');
  })());
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
  add('record integrity allows staged then modified new evidence records', evidenceStatusProblem({ status: 'AM', file: '.codex/workflow/records/tests/TEST-NEW.md' }, false) === '');
  add('record integrity rejects modified committed evidence records', evidenceStatusProblem({ status: ' M', file: '.codex/workflow/records/tests/TEST-OLD.md' }, true).includes('Existing evidence record changed'));
  add('record integrity rejects staged-deleted new evidence records', evidenceStatusProblem({ status: 'AD', file: '.codex/workflow/records/tests/TEST-NEW.md' }, false).includes('Existing evidence record changed'));
  add('worktree hash is content based independent of staging state', worktreeHashFromContent(['a'], [['a', 'hash']]) === worktreeHashFromContent(['a'], [['a', 'hash']]));
  add('worktree hash changes when file content changes', worktreeHashFromContent(['a'], [['a', 'hash']]) !== worktreeHashFromContent(['a'], [['a', 'other']]));
  add('guide source hash canonicalizes line endings', createHash('sha256').update(canonicalTextForHash('a\r\nb\r\n')).digest('hex') === createHash('sha256').update(canonicalTextForHash('a\nb\n')).digest('hex'));
  add('worktree-scope records do not receive branch frontmatter', Object.keys(branchScopedFrontmatter('worktree', { hash: 'branch-hash', base: 'base', mergeBase: 'merge', files: ['a'] })).length === 0);
  add('branch-scope records receive branch frontmatter', branchScopedFrontmatter('branch', { hash: 'branch-hash', base: 'base', mergeBase: 'merge', files: ['a'] }).branchHash === 'branch-hash');
  add('guide source hash includes records but not mutable state cache', (() => {
    const inputs = publicGuideInputFiles();
    return !inputs.some((file) => file.startsWith('.codex/workflow/state/'))
      && !inputs.some((file) => file.startsWith('.codex/workflow/runtime/'))
      && inputs.some((file) => file.startsWith('.codex/workflow/records/patches/'));
  })());
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
      patches: [{ branchHash: 'branch-hash', scope: 'branch', agent: 'codex-lead' }],
      reviews: [
        { branchHash: 'branch-hash', verdict: 'pass', kind: 'general' },
        { branchHash: 'branch-hash', verdict: 'pass', kind: 'workflow' },
      ],
      tests: [{ branchHash: 'branch-hash', verdict: 'pass', commandIds: ['test-command'], commandEvidence: passEvidence('test-command') }],
      audits: [{ branchHash: 'branch-hash', verdict: 'pass', commandIds: ['audit-command'], commandEvidence: passEvidence('audit-command') }],
    }).length === 0;
  })());
  add('release closeout uses branch evidence when branch has diff', releaseCloseoutMode({ files: ['.codex/scripts/nexus-workflow.mjs'] }) === 'branch');
  add('release closeout uses worktree checks when branch has no diff', releaseCloseoutMode({ files: [] }) === 'worktree');
  add('branch evidence check rejects non-branch patch records as branch coverage', (() => {
    const branch = { base: 'base', mergeBase: 'merge-base', hash: 'branch-hash', files: ['.codex/scripts/nexus-workflow.mjs'] };
    return branchEvidenceProblemsForState(branch, {
      patches: [{ branchHash: 'branch-hash', scope: 'worktree', agent: 'nexus_spark_worker' }],
      reviews: [
        { branchHash: 'branch-hash', verdict: 'pass', kind: 'general' },
        { branchHash: 'branch-hash', verdict: 'pass', kind: 'workflow' },
        { branchHash: 'branch-hash', verdict: 'pass', kind: 'integrated' },
      ],
      tests: [{ branchHash: 'branch-hash', verdict: 'pass', commandIds: ['test-command'], commandEvidence: passEvidence('test-command') }],
      audits: [{ branchHash: 'branch-hash', verdict: 'pass', commandIds: ['audit-command'], commandEvidence: passEvidence('audit-command') }],
    }).some((problem) => problem.includes('branch-scope PATCH'));
  })());
  add('branch evidence check requires integrated review for delegated patch evidence', (() => {
    const branch = { base: 'base', mergeBase: 'merge-base', hash: 'branch-hash', files: ['.codex/scripts/nexus-workflow.mjs'] };
    return branchEvidenceProblemsForState(branch, {
      patches: [
        { branchHash: 'branch-hash', scope: 'branch', agent: 'codex-lead' },
        { branchHash: 'branch-hash', scope: 'worktree', agent: 'nexus_spark_worker', routingId: 'ROUTING-test', files: ['.codex/workflow/templates/routing.md'] },
      ],
      routing: [{ id: 'ROUTING-test', route: 'spark', worker: 'nexus_spark_worker', files: ['.codex/workflow/templates/routing.md'] }],
      reviews: [
        { branchHash: 'branch-hash', verdict: 'pass', kind: 'general' },
        { branchHash: 'branch-hash', verdict: 'pass', kind: 'workflow' },
      ],
      tests: [{ branchHash: 'branch-hash', verdict: 'pass', commandIds: ['test-command'], commandEvidence: passEvidence('test-command') }],
      audits: [{ branchHash: 'branch-hash', verdict: 'pass', commandIds: ['audit-command'], commandEvidence: passEvidence('audit-command') }],
    }).some((problem) => problem.includes('integrated review'));
  })());
  add('branch evidence check requires routing record for delegated patch evidence', (() => {
    const branch = { base: 'base', mergeBase: 'merge-base', hash: 'branch-hash', files: ['.codex/scripts/nexus-workflow.mjs'] };
    return branchEvidenceProblemsForState(branch, {
      patches: [
        { branchHash: 'branch-hash', scope: 'branch', agent: 'codex-lead' },
        { branchHash: 'branch-hash', scope: 'worktree', agent: 'nexus_spark_worker', files: ['.codex/workflow/templates/routing.md'] },
      ],
      routing: [],
      reviews: [
        { branchHash: 'branch-hash', verdict: 'pass', kind: 'general' },
        { branchHash: 'branch-hash', verdict: 'pass', kind: 'workflow' },
        { branchHash: 'branch-hash', verdict: 'pass', kind: 'integrated' },
      ],
      tests: [{ branchHash: 'branch-hash', verdict: 'pass', commandIds: ['test-command'], commandEvidence: passEvidence('test-command') }],
      audits: [{ branchHash: 'branch-hash', verdict: 'pass', commandIds: ['audit-command'], commandEvidence: passEvidence('audit-command') }],
    }).some((problem) => problem.includes('missing routingId'));
  })());
  add('branch evidence check requires routing closeout for delegated patch evidence', (() => {
    const branch = { base: 'base', mergeBase: 'merge-base', hash: 'branch-hash', files: ['.codex/scripts/nexus-workflow.mjs'] };
    return branchEvidenceProblemsForState(branch, {
      patches: [
        { branchHash: 'branch-hash', scope: 'branch', agent: 'codex-lead' },
        { branchHash: 'branch-hash', scope: 'worktree', agent: 'nexus_spark_worker', routingId: 'ROUTING-test', files: ['.codex/workflow/templates/routing.md'] },
      ],
      routing: [{ id: 'ROUTING-test', route: 'spark', worker: 'nexus_spark_worker', files: ['.codex/workflow/templates/routing.md'] }],
      reviews: [
        { branchHash: 'branch-hash', verdict: 'pass', kind: 'general' },
        { branchHash: 'branch-hash', verdict: 'pass', kind: 'workflow' },
        { branchHash: 'branch-hash', verdict: 'pass', kind: 'integrated' },
      ],
      tests: [{ branchHash: 'branch-hash', verdict: 'pass', commandIds: ['test-command'], commandEvidence: passEvidence('test-command') }],
      audits: [{ branchHash: 'branch-hash', verdict: 'pass', commandIds: ['audit-command'], commandEvidence: passEvidence('audit-command') }],
    }).some((problem) => problem.includes('no completed routing closeout'));
  })());
  add('branch evidence check accepts delegated patch with routing and integrated review', (() => {
    const branch = { base: 'base', mergeBase: 'merge-base', hash: 'branch-hash', files: ['.codex/scripts/nexus-workflow.mjs'] };
    return branchEvidenceProblemsForState(branch, {
      patches: [
        { branchHash: 'branch-hash', scope: 'branch', agent: 'codex-lead' },
        { branchHash: 'branch-hash', scope: 'worktree', agent: 'nexus_spark_worker', routingId: 'ROUTING-test', files: ['.codex/workflow/templates/routing.md'] },
      ],
      routing: [
        { id: 'ROUTING-test', route: 'spark', worker: 'nexus_spark_worker', files: ['.codex/workflow/templates/routing.md'] },
        { id: 'ROUTING-closeout', completedRoutingId: 'ROUTING-test', status: 'completed', route: 'spark', worker: 'nexus_spark_worker' },
      ],
      reviews: [
        { branchHash: 'branch-hash', verdict: 'pass', kind: 'general' },
        { branchHash: 'branch-hash', verdict: 'pass', kind: 'workflow' },
        { branchHash: 'branch-hash', verdict: 'pass', kind: 'integrated' },
      ],
      tests: [{ branchHash: 'branch-hash', verdict: 'pass', commandIds: ['test-command'], commandEvidence: passEvidence('test-command') }],
      audits: [{ branchHash: 'branch-hash', verdict: 'pass', commandIds: ['audit-command'], commandEvidence: passEvidence('audit-command') }],
    }).length === 0;
  })());
  add('branch evidence check still requires integrated review for stale-hash delegated branch records', (() => {
    const branch = { base: 'base', mergeBase: 'merge-base', hash: 'branch-hash', files: ['.codex/scripts/nexus-workflow.mjs'] };
    return branchEvidenceProblemsForState(branch, {
      patches: [
        { branchHash: 'branch-hash', scope: 'branch', agent: 'codex-lead', branchIntroduced: true },
        { branchHash: 'old-hash', scope: 'worktree', agent: 'nexus_spark_worker', routingId: 'ROUTING-test', files: ['.codex/workflow/templates/routing.md'], branchIntroduced: true },
      ],
      routing: [{ id: 'ROUTING-test', route: 'spark', worker: 'nexus_spark_worker', files: ['.codex/workflow/templates/routing.md'], branchIntroduced: true }],
      reviews: [
        { branchHash: 'branch-hash', verdict: 'pass', kind: 'general' },
        { branchHash: 'branch-hash', verdict: 'pass', kind: 'workflow' },
      ],
      tests: [{ branchHash: 'branch-hash', verdict: 'pass', commandIds: ['test-command'], commandEvidence: passEvidence('test-command') }],
      audits: [{ branchHash: 'branch-hash', verdict: 'pass', commandIds: ['audit-command'], commandEvidence: passEvidence('audit-command') }],
    }).some((problem) => problem.includes('integrated review'));
  })());
  add('branch evidence check ignores historical delegated records that were not introduced on this branch', (() => {
    const branch = { base: 'base', mergeBase: 'merge-base', hash: 'branch-hash', files: ['.codex/scripts/nexus-workflow.mjs'] };
    return branchEvidenceProblemsForState(branch, {
      patches: [
        { branchHash: 'branch-hash', scope: 'branch', agent: 'codex-lead', branchIntroduced: true },
        { branchHash: 'old-hash', scope: 'worktree', agent: 'nexus_spark_worker', files: ['.codex/workflow/templates/routing.md'], branchIntroduced: false },
      ],
      routing: [],
      reviews: [
        { branchHash: 'branch-hash', verdict: 'pass', kind: 'general' },
        { branchHash: 'branch-hash', verdict: 'pass', kind: 'workflow' },
      ],
      tests: [{ branchHash: 'branch-hash', verdict: 'pass', commandIds: ['test-command'], commandEvidence: passEvidence('test-command') }],
      audits: [{ branchHash: 'branch-hash', verdict: 'pass', commandIds: ['audit-command'], commandEvidence: passEvidence('audit-command') }],
    }).length === 0;
  })());
  add('branch evidence check exempts legacy-schema delegated patches from new routing requirement', (() => {
    const branch = { base: 'base', mergeBase: 'merge-base', hash: 'branch-hash', files: ['.codex/scripts/nexus-workflow.mjs'] };
    return branchEvidenceProblemsForState(branch, {
      patches: [
        { branchHash: 'branch-hash', scope: 'branch', agent: 'codex-lead', branchIntroduced: true },
        { rel: '.codex/workflow/records/patches/PATCH-20260508T170713Z-design-system-toast-semantic-parity.md', branchHash: 'old-hash', scope: 'worktree', agent: 'codex-lead+spark-worker', branchIntroduced: true },
      ],
      routing: [],
      reviews: [
        { branchHash: 'branch-hash', verdict: 'pass', kind: 'general' },
        { branchHash: 'branch-hash', verdict: 'pass', kind: 'workflow' },
      ],
      tests: [{ branchHash: 'branch-hash', verdict: 'pass', commandIds: ['test-command'], commandEvidence: passEvidence('test-command') }],
      audits: [{ branchHash: 'branch-hash', verdict: 'pass', commandIds: ['audit-command'], commandEvidence: passEvidence('audit-command') }],
    }).length === 0;
  })());
  add('guide content hash validates generated html', (() => {
    const html = injectGuideContentHash(`<meta name="nexus-guide-content-hash" content="${PUBLIC_GUIDE_CONTENT_HASH_PLACEHOLDER}" />\n<section>ok</section>`);
    return guideContentHashOk(html) && !guideContentHashOk(html.replace('ok', 'edited'));
  })());
  add('generated guide normalizer strips trailing whitespace', !normalizeGeneratedHtml('a  \n  \n').match(/[ \t]+$/m));
  add('guide view contract rejects heading-only public guide', guideViewContractProblems('Workflow System Nodes Project Structure Design System / Zoo / Docs Model Routing Examples Workflow Event Timeline', 'fixture').length > 0);
  add('guide view contract accepts required graph, docs, zoo, routing, and timeline views', guideViewContractProblems([
    'Workflow System Nodes',
    'Codex Workflow Nodes',
    '.codex/workflow/records',
    'Project Structure',
    'Repository Nodes',
    'Web App Nodes',
    'Design System / Zoo / Docs',
    'Design-System Nodes',
    'Design-System Flow',
    'Design Zoo/Gym coverage',
    'Visual Zoo/Gym Guide',
    'Design And Workflow Documents',
    'packages/web/src/components/registry.json',
    'packages/web/src/routes/__design/Zoo.tsx',
    'How Future Sessions Resume',
    'Model Routing Examples',
    'spark-narrow-toast-warning',
    'strong-theme-cascade-body-portal',
    'escalate-spark-timebox-stalled',
    'Workflow Event Timeline',
    '<h3>Workflow</h3><h3>Agent Routing</h3><h3>Validation</h3>',
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
    writeFileSync(summaryPath, JSON.stringify([
      { name: 'dashboard-artifact', target: 'file:///dashboard', viewport: { width: 1, height: 1 }, title: 'Nexus Workflow Dashboard', imageCount: 0, brokenImages: 0 },
      { name: 'workflow-guide-artifact', target: 'file:///public', viewport: { width: 1, height: 1 }, title: 'Nexus Workflow Guide', imageCount: 0, brokenImages: 0 },
      { name: 'workflow-zoo-artifact-desktop', target: 'file:///zoo', viewport: { width: 1, height: 1 }, title: 'Nexus Design Zoo / Gym', imageCount: 1, brokenImages: 0 },
      { name: 'workflow-zoo-artifact-mobile', target: 'file:///zoo', viewport: { width: 1, height: 1 }, title: 'Nexus Design Zoo / Gym', imageCount: 1, brokenImages: 0 },
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
      { name: 'workflow-guide-artifact', target: 'file:///public', viewport: { width: 1, height: 1 }, title: 'Nexus Workflow Guide', imageCount: 0, brokenImages: 0 },
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
    const dir = mkdtempSync(join(tmpdir(), 'nexus-guide-artifact-'));
    const path = join(dir, 'artifact.json');
    const rel = relative(ROOT, path).replaceAll('\\', '/');
    writeFileSync(path, '{"ok":true}\n');
    const evidence = { screenshots: [rel], summaryFile: rel, evidenceArtifacts: artifactEvidenceForFiles([rel]) };
    const ok = artifactEvidenceProblems(evidence, 'fixture guide evidence').length === 0;
    rmSync(dir, { recursive: true, force: true });
    return ok;
  })());
  add('guide browser artifact evidence rejects mutated files', (() => {
    const dir = mkdtempSync(join(tmpdir(), 'nexus-guide-artifact-'));
    const path = join(dir, 'artifact.json');
    const rel = relative(ROOT, path).replaceAll('\\', '/');
    writeFileSync(path, '{"ok":true}\n');
    const evidence = { screenshots: [rel], summaryFile: rel, evidenceArtifacts: artifactEvidenceForFiles([rel]) };
    writeFileSync(path, '{"ok":false}\n');
    const ok = artifactEvidenceProblems(evidence, 'fixture guide evidence').some((problem) => problem.includes('hash mismatch') || problem.includes('size mismatch'));
    rmSync(dir, { recursive: true, force: true });
    return ok;
  })());
  add('guide browser artifact evidence rejects path-only pass records', artifactEvidenceProblems({
    screenshots: ['.codex/workflow/artifacts/screenshots/missing.png'],
    summaryFile: '.codex/workflow/artifacts/screenshots/missing.json',
  }, 'fixture guide evidence').some((problem) => problem.includes('does not embed evidenceArtifacts')));
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
  add('evidence references reject checks-only proof', evidenceReferenceProblems({ checks: ['manual-ok'] }, 'fixture evidence').some((problem) => problem.includes('no command ids or durable artifacts')));
  add('self-test temp fixtures stay out of repo workflow tree', !existsSync(join(ROOT, '.codex-self-test-tmp')));
  add('guide token subset avoids display tracking tokens', !productionGuideTokenCss().match(/tracking|-0\.01em/));
  add('guide token subset includes hit targets', ['--hit-sm', '--hit-md', '--hit-lg'].every((token) => productionGuideTokenCss().includes(`${token}:`)));
  add('guide stale hash would be rejected', htmlMetaContent('<meta name="nexus-guide-source-hash" content="stale" />', 'nexus-guide-source-hash') !== publicGuideSourceHash());
  add('graph renderer rejects missing edge nodes', (() => {
    try {
      graphHtml('bad', [{ label: 'A', detail: '' }], [['A', 'B']]);
      return false;
    } catch {
      return true;
    }
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
  add('public sanitizer redacts private strings', !publicSafe(`${ROOT} /root/monoWeb/nexus /root/monoWeb/deploy-backups/nexus/x.diff root@134.199.148.87 ~/.ssh/DIOkii token=abc`).match(/C:\\Users|\/root\/monoWeb\/nexus|\/root\/monoWeb\/deploy-backups|root@|134\.199\.148\.87|~\/\.ssh\/DIOkii|DIOkii|token=abc/));
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
  add('routing check catches Spark out-of-scope file', routingScopeProblemsForState({
    routingId: 'routing-test',
    route: 'spark',
    files: ['packages/web/src/components/ui/Toast.tsx'],
    status: 'active',
    worktreeHash: 'current',
    currentHash: 'current',
  }, ['packages/web/src/components/registry.json'], {}).length > 0);
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
  }, ['packages/web/src/components/registry.json'], {}).some((problem) => problem.includes('strong-routed work changed outside')));
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

function commandValidate(args) {
  const required = [
    'AGENTS.md',
    'WORKFLOW.md',
    '.codex/README.md',
    '.codex/config.toml',
    '.codex/hooks.json',
    '.codex/workflow/current-state.md',
    '.codex/workflow/state/.gitignore',
    '.codex/workflow/runtime/.gitignore',
    '.codex/workflow/dependency-audit-baseline.json',
    '.codex/scripts/audit-deps.mjs',
    '.codex/scripts/check-production-zoo-bundle.mjs',
    '.codex/scripts/run-hook.mjs',
    '.codex/scripts/capture-design-zoo-visuals.mjs',
    '.codex/knowledge/patterns.md',
    '.codex/knowledge/design-system.md',
    '.codex/knowledge/model-routing.md',
    '.codex/knowledge/hooks.md',
    '.codex/knowledge/deployment.md',
    '.codex/workflow/scenarios/model-routing.json',
    '.codex/workflow/templates/README.md',
    '.codex/workflow/templates/audit.md',
    '.codex/workflow/templates/current-state.md',
    '.codex/workflow/templates/deployment.md',
    '.codex/workflow/templates/guide-browser.md',
    '.codex/workflow/templates/patch.md',
    '.codex/workflow/templates/pattern-proposal.md',
    '.codex/workflow/templates/review.md',
    '.codex/workflow/templates/routing.md',
    '.codex/workflow/templates/test.md',
    '.codex/agents/nexus-auditor.toml',
    '.codex/agents/nexus-design-reviewer.toml',
    '.codex/agents/nexus-pattern-reviewer.toml',
    '.codex/agents/nexus-researcher.toml',
    '.codex/agents/nexus-spark-worker.toml',
    '.codex/agents/nexus-strong-worker.toml',
    '.codex/agents/nexus-verifier.toml',
    '.agents/skills/nexus-workflow/SKILL.md',
    '.agents/skills/nexus-review/SKILL.md',
    '.agents/skills/nexus-verify/SKILL.md',
    '.agents/skills/nexus-audit/SKILL.md',
  ];
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
    const hookConfigOk = commandHookConfigCheck({ quiet: true });
    const depAuditOk = commandDependencyAuditCheck({ quiet: true });
    const prodZooOk = commandProductionZooBundleCheck({ quiet: true });
    const selfTestFailures = workflowSelfTestChecks().filter((check) => !check.ok);
    const deploymentOk = !args['deployed-gate'] || commandDeploymentCheck({ quiet: true });
    if (!reviewOk || !verifyOk || !auditOk || !handoverOk || !recordsOk || !routingOk || !guideOk || !guideBrowserOk || !zooOk || !zooVisualOk || !hookConfigOk || !branchEvidenceOk || !depAuditOk || !prodZooOk || !deploymentOk || selfTestFailures.length) {
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
      if (!hookConfigOk) {
        console.error('Release gate failed: hook/config enforcement is not pinned.');
        for (const problem of hookConfigProblems()) console.error(`- ${problem}`);
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

function parsePatchFilesFromPayload(payload) {
  const input = payload?.tool_input;
  const text = typeof input === 'string' ? input : JSON.stringify(input || {});
  const files = [];
  const patterns = [
    /\*\*\* (?:Add|Update|Delete) File:\s*([^\n\r]+)/g,
    /"file_path"\s*:\s*"([^"]+)"/g,
  ];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) files.push(match[1].trim());
  }
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
  const statePath = relative(ROOT, join(CODEX, 'workflow', 'current-state.md')).replaceAll('\\', '/');
  const status = gitText(['status', '--short', '--branch']).split(/\r?\n/).slice(0, 20).join('\n');
  const additionalContext = [
    `Nexus Codex workflow is active. Before substantive work read .codex/README.md, ${statePath}, and the closest relevant .codex/knowledge file.`,
    `Run: node .codex/scripts/nexus-workflow.mjs status`,
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

ensureDir(RECORDS);
ensureDir(STATE_DIR);

if (command === 'status') commandStatus();
else if (command === 'health') commandHealth();
else if (command === 'dashboard') commandDashboard(args);
else if (command === 'public-guide') commandPublicGuide(args);
else if (command === 'zoo-visual-guide') commandZooVisualGuide(args);
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
