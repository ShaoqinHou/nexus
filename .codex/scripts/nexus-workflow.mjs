#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve, relative } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

const START = process.cwd();
const ROOT = findRoot(START);
const CODEX = join(ROOT, '.codex');
const RECORDS = join(CODEX, 'workflow', 'records');
const STATE_FILE = join(RECORDS, 'review-state.json');
const VERIFY_STATE_FILE = join(RECORDS, 'verify-state.json');
const AUDIT_STATE_FILE = join(RECORDS, 'audit-state.json');
const PATCH_STATE_FILE = join(RECORDS, 'patch-state.json');
const GUIDE_BROWSER_STATE_FILE = join(RECORDS, 'guide-browser-state.json');
const DASHBOARD_DIR = join(CODEX, 'dashboard');
const RUNTIME_DIR = join(CODEX, 'workflow', 'runtime');
const ROUTING_SCENARIOS_FILE = join(CODEX, 'workflow', 'scenarios', 'model-routing.json');
const ROUTING_STATE_FILE = join(RECORDS, 'routing-state.json');
const PUBLIC_GUIDE_URL = 'https://cv.rehou.games/nexus/workflow/';
const PUBLIC_GUIDE_VERSION = 'nexus-public-workflow-guide/v2';
const PUBLIC_GUIDE_CONTENT_HASH_PLACEHOLDER = '__NEXUS_GUIDE_CONTENT_HASH__';
const RECORD_KINDS = ['decisions', 'pattern-proposals', 'routing', 'patches', 'reviews', 'tests', 'audits', 'deployments'];
const EVIDENCE_RECORD_KINDS = ['pattern-proposals', 'routing', 'patches', 'reviews', 'tests', 'audits', 'deployments'];
const SCHEMA_BY_KIND = {
  decisions: 'nexus-decision/v1',
  deployments: 'nexus-deployment/v1',
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
    if (f.startsWith('.codex/workflow/records/') && f !== '.codex/workflow/records/risks.md') return false;
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
      f.startsWith('.agents/skills/') ||
      f.startsWith('.codex/agents/') ||
      f.startsWith('.codex/hooks') ||
      f.startsWith('.codex/scripts/') ||
      f.startsWith('.codex/knowledge/') ||
      f.startsWith('.codex/workflow/current-state.md') ||
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
      f.startsWith('.codex/workflow/scenarios/') ||
      f.startsWith('.codex/workflow/templates/') ||
      f.startsWith('.codex/workflow/research/') ||
      f === 'AGENTS.md' ||
      f === 'WORKFLOW.md' ||
      f === '.codex/README.md' ||
      f === '.codex/config.toml' ||
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
      f.startsWith('.agents/')
    );
  });
}

function worktreeHash() {
  const files = substantiveFiles();
  const unstagedDiff = files.length ? gitText(['diff', '--', ...files]) : '';
  const stagedDiff = files.length ? gitText(['diff', '--cached', '--', ...files]) : '';
  const untracked = files.length
    ? gitText(['ls-files', '--others', '--exclude-standard', '--', ...files]).split(/\r?\n/).filter(Boolean)
    : [];
  const untrackedContent = untracked.map((file) => {
    const path = join(ROOT, file);
    try {
      const st = statSync(path);
      if (!st.isFile()) return [file, 'not-file'];
      return [file, createHash('sha256').update(readFileSync(path)).digest('hex')];
    } catch {
      return [file, 'missing'];
    }
  });
  const payload = JSON.stringify({ files, stagedDiff, unstagedDiff, untrackedContent });
  return createHash('sha256').update(payload).digest('hex').slice(0, 16);
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

function invalidateGates(files, reason, source = 'workflow', metadata = {}) {
  const currentHash = worktreeHash();
  const patchState = loadJson(PATCH_STATE_FILE, { events: [] });
  const reviewState = loadJson(STATE_FILE, {});
  const previousHash = patchState.worktreeHash;
  const previousWasReviewed = previousHash && reviewState.worktreeHash === previousHash && reviewState.verdict === 'pass';
  const workers = previousWasReviewed ? [] : [...(patchState.workers || [])];
  const worker = metadata.worker || metadata.agent || (source !== 'codex-hook' ? source : '');
  if (worker && !workers.includes(worker)) workers.push(worker);
  patchState.worktreeHash = currentHash;
  patchState.lastChangedAt = nowIso();
  patchState.reason = reason;
  patchState.source = source;
  patchState.files = files;
  patchState.patchId = metadata.patchId || (previousHash === currentHash ? patchState.patchId : null) || null;
  patchState.routingId = metadata.routingId || (previousHash === currentHash ? patchState.routingId : null) || null;
  patchState.workers = workers;
  patchState.events = [
    {
      at: patchState.lastChangedAt,
      source,
      reason,
      files,
      worktreeHash: currentHash,
      patchId: metadata.patchId || null,
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
  if (kind === 'tests' || kind === 'reviews' || text.includes('audit') || text.includes('verify')) return 'Validation';
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

function recordIntegrityProblems() {
  const paths = EVIDENCE_RECORD_KINDS.map((kind) => `.codex/workflow/records/${kind}`);
  const entries = gitStatusEntries(paths);
  const statusByFile = gitStatusMap(RECORD_KINDS.map((kind) => `.codex/workflow/records/${kind}`));
  const problems = [];
  for (const entry of entries) {
    if (!entry.file.endsWith('.md') || entry.file.endsWith('/.gitkeep')) continue;
    if (entry.status === '??') continue;
    problems.push(`Existing evidence record changed or was removed: ${entry.status.trim() || entry.status} ${entry.file}. Create a correction record instead of editing committed evidence.`);
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
      const legacyAllowed = (LEGACY_SCHEMA_BY_KIND[kind] || []).includes(schema) && status !== '??';
      if (!legacyAllowed) problems.push(`Record ${rel} has schema ${schema || '(missing)'}; expected ${expected}.`);
    }
  }
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
  if (patchState.worktreeHash !== currentHash) return [];
  const eventWorkers = (patchState.events || [])
    .filter((event) => event.worktreeHash === currentHash)
    .flatMap((event) => splitWorkerNames(event.worker || event.source));
  const workers = [
    ...(patchState.workers || []),
    patchState.source,
    patchState.agent,
    ...eventWorkers,
  ];
  return [...new Set(workers.map(canonicalWorker).filter(Boolean))];
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

function routingScopeProblemsForState(routingState = {}, files = substantiveFiles(), patchState = loadJson(PATCH_STATE_FILE, {})) {
  const currentHash = routingState.currentHash || worktreeHash();
  const delegatedWorkers = delegatedWorkersForHash(patchState, currentHash);
  const problems = [];
  if (!files.length) return problems;
  if (delegatedWorkers.length && (!routingState.route || routingState.status === 'closed')) {
    problems.push(`Delegated worker(s) ${delegatedWorkers.join(', ')} changed the current worktree without an active routing preflight. Record routing before review/commit.`);
  }
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
    problems.push(`Routing ${routingState.routingId || '(unrecorded)'} was recorded for worktree ${routingState.worktreeHash}, current worktree is ${currentHash}. Record a fresh routing decision.`);
    return problems;
  }
  if (!routingState.worktreeHash && !patchLinkedToRouting) {
    problems.push(`Routing ${routingState.routingId || '(unrecorded)'} has no worktree hash. Record a fresh routing decision.`);
    return problems;
  }
  const route = String(routingState.route);
  if (!route.includes('spark')) return problems;
  const allowed = routingState.files || routingState.writeScope || [];
  if (!allowed.length) {
    problems.push(`Spark routing ${routingState.routingId || '(unrecorded)'} has no allowed write scope.`);
    return problems;
  }
  const outside = files.filter((file) => !allowed.some((pattern) => fileMatchesPattern(file, pattern)));
  problems.push(...outside.map((file) => `Spark-routed work changed outside its recorded scope: ${file}`));
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

function requiredReviewKinds(files = substantiveFiles()) {
  const kinds = new Set();
  if (files.length) kinds.add('general');
  const designRelevant = files.some((file) => {
    const f = file.replaceAll('\\', '/');
    return f.startsWith('packages/web/src/components/')
      || f.startsWith('packages/web/src/platform/theme/')
      || f.startsWith('packages/web/src/routes/__design/')
      || f.startsWith('design/')
      || f.startsWith('.codex/dashboard/');
  });
  if (designRelevant) kinds.add('design');
  const workflowRelevant = files.some((file) => {
    const f = file.replaceAll('\\', '/');
    return f === 'AGENTS.md'
      || f === 'WORKFLOW.md'
      || f.startsWith('.codex/')
      || f.startsWith('.agents/skills/');
  });
  if (workflowRelevant) kinds.add('workflow');
  const patchState = loadJson(PATCH_STATE_FILE, {});
  if (requiresIntegratedReview(patchState)) kinds.add('integrated');
  return [...kinds];
}

function hasPatchCoverage(hash = worktreeHash()) {
  const files = substantiveFiles();
  if (!files.length) return true;
  const patchState = loadJson(PATCH_STATE_FILE, {});
  return patchState.worktreeHash === hash && Boolean(patchState.patchId);
}

function stateHasReviewKind(state, kind, hash) {
  if (state.reviewKinds?.[kind]?.worktreeHash === hash && state.reviewKinds?.[kind]?.verdict === 'pass') return true;
  if (state.worktreeHash === hash && state.verdict === 'pass' && (state.kind || 'general') === kind) return true;
  return false;
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
    '.codex/scripts/nexus-workflow.mjs',
    '.codex/workflow/records/review-state.json',
    '.codex/workflow/records/verify-state.json',
    '.codex/workflow/records/audit-state.json',
    '.codex/workflow/records/guide-browser-state.json',
    '.codex/knowledge/design-system.md',
    '.codex/knowledge/deployment.md',
    '.codex/knowledge/hooks.md',
    '.codex/knowledge/model-routing.md',
    '.codex/knowledge/patterns.md',
    '.codex/workflow/current-state.md',
    '.codex/workflow/records/patch-state.json',
    '.codex/workflow/records/routing-state.json',
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
    'packages/web/src/platform/theme',
    'packages/web/src/routes',
  ]) {
    for (const file of listFilesUnder(dir, 8, 600)) files.add(file);
  }
  files.delete('.codex/workflow/records/guide-browser-state.json');
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
  for (const name of ['index.html', 'public.html']) {
    const path = join(DASHBOARD_DIR, name);
    payload[name] = existsSync(path) ? createHash('sha256').update(readFileSync(path)).digest('hex') : 'missing';
  }
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex').slice(0, 24);
}

function commandRecordGuideBrowser(args) {
  const verdict = String(args.verdict || '').toLowerCase();
  if (!['pass', 'fail', 'partial', 'blocked'].includes(verdict)) {
    console.error('record-guide-browser requires --verdict pass|fail|partial|blocked');
    process.exit(2);
  }
  if (verdict === 'pass' && (!args.screenshots || !args.notes)) {
    console.error('record-guide-browser pass requires --screenshots and --notes.');
    process.exit(2);
  }
  const hash = guideArtifactHash();
  const screenshots = args.screenshots ? csv(args.screenshots) : [];
  const missing = screenshots.filter((file) => !existsSync(join(ROOT, file)));
  if (missing.length) {
    console.error('record-guide-browser screenshots are missing:');
    for (const file of missing) console.error(`- ${file}`);
    process.exit(2);
  }
  saveJson(GUIDE_BROWSER_STATE_FILE, {
    guideArtifactHash: hash,
    verdict,
    checkedAt: nowIso(),
    reviewer: args.reviewer || args.verifier || 'unknown',
    screenshots,
    notes: args.notes || '',
  });
  console.log(`Recorded guide browser ${verdict} for ${hash}`);
}

function guideBrowserProblems() {
  const state = loadJson(GUIDE_BROWSER_STATE_FILE, {});
  const hash = guideArtifactHash();
  const problems = [];
  if (state.guideArtifactHash !== hash || state.verdict !== 'pass') {
    problems.push(`guide browser validation is missing or stale for artifact hash ${hash}.`);
  }
  if (state.verdict === 'pass' && !(state.screenshots || []).length) {
    problems.push('guide browser validation pass has no screenshot evidence.');
  }
  for (const file of state.screenshots || []) {
    if (!existsSync(join(ROOT, file))) problems.push(`guide browser screenshot is missing: ${file}`);
  }
  return problems;
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
  const recordKinds = RECORD_KINDS;
  const rawRecords = Object.fromEntries(recordKinds.map((kind) => [kind, listRecords(kind)]));
  const records = displayRecords(rawRecords);
  const currentState = readText('.codex/workflow/current-state.md');
  const patterns = readText('.codex/knowledge/patterns.md');
  const design = readText('.codex/knowledge/design-system.md');
  const deployment = readText('.codex/knowledge/deployment.md');
  const risks = readText('.codex/workflow/records/risks.md');
  const status = gitText(['status', '--short', '--branch']);
  const branch = gitText(['branch', '--show-current']) || '(detached HEAD)';
  const hash = worktreeHash();
  const reviewState = loadJson(STATE_FILE, {});
  const verifyState = loadJson(VERIFY_STATE_FILE, {});
  const auditState = loadJson(AUDIT_STATE_FILE, {});
  const patchState = loadJson(PATCH_STATE_FILE, {});
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
        <div class="grid">
          <div class="card"><span class="meta">Review Gate</span><strong>${reviewState.worktreeHash === hash && reviewState.verdict === 'pass' ? 'pass' : 'needed'}</strong></div>
          <div class="card"><span class="meta">Verify Gate</span><strong>${verifyState.worktreeHash === hash && verifyState.verdict === 'pass' ? 'pass' : 'needed'}</strong></div>
          <div class="card"><span class="meta">Audit Gate</span><strong>${auditState.worktreeHash === hash && auditState.verdict === 'pass' ? 'pass' : 'needed'}</strong></div>
        </div>
        ${patchState.lastChangedAt ? `<p class="meta">Last patch trigger: ${escapeHtml(patchState.lastChangedAt)} · ${escapeHtml(patchState.reason || patchState.source || '')}</p>` : ''}
        <pre>${escapeHtml(status || 'clean')}</pre>
      </section>
      <section id="current" class="panel">${markdownLite(currentState)}</section>
      <section id="zoo" class="panel">
        <h2>Design Zoo / Gym</h2>
        <p>The production component gym is the dev-only app route at <code>http://localhost:5173/design</code>. It reads real source components through <code>packages/web/src/routes/__design/Zoo.tsx</code>; this dashboard reads <code>packages/web/src/components/registry.json</code> so coverage is visible here too.</p>
        <p><a href="http://localhost:5173/design">Open local zoo index</a> after running <code>npm run dev:web</code> or <code>npm run dev:all</code>.</p>
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
  const rawRecords = Object.fromEntries(RECORD_KINDS.map((kind) => [kind, listRecords(kind)]));
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
    <div class="meta">Generated ${publicHtml(generated)} · branch ${publicHtml(branch)} · deploy this file from the current branch HEAD</div>
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
      ], [['Reference bundle', 'Production tokens/themes'], ['Production tokens/themes', 'ThemeProvider'], ['ThemeProvider', 'Component registry'], ['Component registry', 'Design Zoo/Gym'], ['Design Zoo/Gym', 'validate-design-zoo']])}
      <p>Design Zoo/Gym coverage: <strong>${zooLinked}/${zooEntries.length}</strong> registry entries declare a route.</p>
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
        <li>Run <code>npm run workflow:status</code> and <code>npm run workflow:release-gate</code>.</li>
        <li>Use detailed records under <code>.codex/workflow/records/</code> instead of loading chat transcripts.</li>
        <li>Use <code>.codex/knowledge/</code> for patterns, design-system rules, model routing, and deployment guidance.</li>
      </ul>
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
        ${Object.entries(records).map(([kind, items]) => {
          const label = kind === 'audits' ? 'audits (first-class + legacy)' : kind;
          return `<div class="card"><strong>${items.length}</strong><p>${publicHtml(label)}</p></div>`;
        }).join('\n')}
      </div>
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

function commandStatus() {
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
  const guideOk = commandGuideCheck({ quiet: true });
  const guideBrowserOk = commandGuideBrowserCheck({ quiet: true });
  const currentHash = worktreeHash();
  const reviewed = commandReviewCheck({ quiet: true });
  const verified = commandVerifyCheck({ quiet: true });
  const audited = commandAuditCheck({ quiet: true });
  console.log(`Nexus Codex workflow status`);
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
  console.log(`guide: ${guideOk ? 'ok' : 'needs attention'}`);
  console.log(`guide browser: ${guideBrowserOk ? 'ok' : 'needs attention'}`);
  if (state.reviewedAt) console.log(`last review: ${state.reviewedAt} by ${state.reviewer || 'unknown'} (${state.verdict || 'unknown'})`);
  if (verifyState.verifiedAt) console.log(`last verification: ${verifyState.verifiedAt} by ${verifyState.verifier || 'unknown'} (${verifyState.verdict || 'unknown'})`);
  if (auditState.auditedAt) console.log(`last audit: ${auditState.auditedAt} by ${auditState.auditor || 'unknown'} (${auditState.verdict || 'unknown'})`);
  if (routingState.recordedAt) console.log(`last routing: ${routingState.recordedAt} via ${routingState.route || 'unknown'} (${routingState.routingId || 'unknown'})`);
  if (patchState.lastChangedAt) console.log(`last patch trigger: ${patchState.lastChangedAt} (${patchState.reason || patchState.source || 'unknown'})`);
  if (status) {
    console.log('');
    console.log(status);
  }
}

function commandRecordPatch(args, hookPayload = null) {
  const files = args.files ? csv(args.files) : substantiveFiles();
  const title = args.summary || hookPayload?.tool_name || 'Patch';
  const hash = worktreeHash();
  const routingState = loadJson(ROUTING_STATE_FILE, {});
  const routingId = args.routing || args['routing-id'] || (routingState.worktreeHash === hash ? routingState.routingId : '') || '';
  const agent = args.worker || args.agent || 'codex-lead';
  const body = [
    `Summary: ${title}`,
    `Agent: ${agent}`,
    `Routing: ${routingId || 'n/a'}`,
    '',
    `Files:`,
    ...files.map((f) => `- ${f}`),
    '',
    `Worktree hash after patch: ${hash}`,
  ].join('\n');
  const rec = writeRecord('patches', title, body, {
    files,
    agent,
    worktreeHash: hash,
    routingId,
  });
  invalidateGates(files, `patch ${rec.id}`, agent, {
    patchId: rec.id,
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
  const files = args.files ? csv(args.files) : substantiveFiles();
  const patchId = args.patch || args['patch-id'] || (patchState.worktreeHash === hash ? patchState.patchId : null);
  if (substantiveFiles().length && !patchId) {
    console.error('record-review requires a patch record for substantive changes. Run record-patch first or pass --patch <PATCH-id>.');
    process.exit(2);
  }
  const title = `Review ${kind} ${verdict} ${args.scope || 'worktree'}`;
  const body = [
    `Scope: ${args.scope || 'worktree'}`,
    `Kind: ${kind}`,
    `Verdict: ${verdict}`,
    `Reviewer: ${args.reviewer || 'unknown'}`,
    `Patch: ${patchId || 'n/a'}`,
    `Worktree hash: ${hash}`,
    '',
    files.length ? ['Reviewed files:', ...files.map((f) => `- ${f}`)].join('\n') : 'Reviewed files: n/a',
    '',
    args.notes ? `Notes: ${args.notes}` : 'Notes: n/a',
  ].join('\n');
  const rec = writeRecord('reviews', title, body, {
    scope: args.scope || 'worktree',
    verdict,
    reviewer: args.reviewer || 'unknown',
    worktreeHash: hash,
    kind,
    patchId: patchId || '',
    files,
  });
  const existing = loadJson(STATE_FILE, {});
  const reviewKinds = {
    ...(existing.reviewKinds || {}),
    [kind]: {
      worktreeHash: hash,
      verdict,
      reviewer: args.reviewer || 'unknown',
      reviewedAt: nowIso(),
      reviewRecord: relative(ROOT, rec.path).replaceAll('\\', '/'),
      patchId: patchId || '',
    },
  };
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
  const title = `Verification ${verdict} ${args.scope || 'worktree'}`;
  const body = [
    `Scope: ${args.scope || 'worktree'}`,
    `Verdict: ${verdict}`,
    `Verifier: ${args.verifier || 'unknown'}`,
    `Worktree hash: ${hash}`,
    '',
    args.notes ? `Notes: ${args.notes}` : 'Notes: n/a',
  ].join('\n');
  const rec = writeRecord('tests', title, body, {
    scope: args.scope || 'worktree',
    verdict,
    verifier: args.verifier || 'unknown',
    worktreeHash: hash,
  });
  saveJson(VERIFY_STATE_FILE, {
    worktreeHash: hash,
    verdict,
    verifier: args.verifier || 'unknown',
    verifiedAt: nowIso(),
    verifyRecord: relative(ROOT, rec.path).replaceAll('\\', '/'),
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
  if (!args.summary || !args.notes) {
    console.error('record-deployment requires --summary and --notes.');
    process.exit(2);
  }
  return commandRecordGeneric('deployments', args);
}

function commandRecordAudit(args) {
  const verdict = String(args.verdict || '').toLowerCase();
  if (!['pass', 'fail', 'partial', 'blocked'].includes(verdict)) {
    console.error('record-audit requires --verdict pass|fail|partial|blocked');
    process.exit(2);
  }
  const hash = worktreeHash();
  const title = `Audit ${verdict} ${args.scope || 'worktree'}`;
  const body = [
    `Scope: ${args.scope || 'worktree'}`,
    `Verdict: ${verdict}`,
    `Auditor: ${args.auditor || 'unknown'}`,
    `Worktree hash: ${hash}`,
    '',
    args.notes ? `Notes: ${args.notes}` : 'Notes: n/a',
  ].join('\n');
  const rec = writeRecord('audits', title, body, {
    scope: args.scope || 'worktree',
    verdict,
    auditor: args.auditor || 'unknown',
    worktreeHash: hash,
  });
  saveJson(AUDIT_STATE_FILE, {
    worktreeHash: hash,
    verdict,
    auditor: args.auditor || 'unknown',
    auditedAt: nowIso(),
    auditRecord: relative(ROOT, rec.path).replaceAll('\\', '/'),
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

function commandVerifyCheck({ quiet = false } = {}) {
  const files = verificationRelevantFiles();
  const hash = worktreeHash();
  const state = loadJson(VERIFY_STATE_FILE, {});
  const ok = files.length === 0 || (state.worktreeHash === hash && state.verdict === 'pass');
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
  const ok = files.length === 0 || (state.worktreeHash === hash && state.verdict === 'pass');
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
  add('pattern proposals are protected evidence', EVIDENCE_RECORD_KINDS.includes('pattern-proposals'));
  add('generated guide artifacts use dedicated guide gate', substantiveFiles(['.codex/dashboard/public.html', '.codex/dashboard/index.html']).length === 0);
  add('guide source hash is content based', /^[a-f0-9]{24}$/.test(publicGuideSourceHash()));
  add('guide source hash canonicalizes line endings', createHash('sha256').update(canonicalTextForHash('a\r\nb\r\n')).digest('hex') === createHash('sha256').update(canonicalTextForHash('a\nb\n')).digest('hex'));
  add('guide source hash includes records and gate states', (() => {
    const inputs = publicGuideInputFiles();
    return inputs.includes('.codex/workflow/records/review-state.json')
      && inputs.includes('.codex/workflow/records/verify-state.json')
      && inputs.includes('.codex/workflow/records/audit-state.json')
      && inputs.some((file) => file.startsWith('.codex/workflow/records/patches/'));
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
  add('routing check rejects missing worktree hash', routingScopeProblemsForState({
    routingId: 'ROUTING-test',
    route: 'lead',
    status: 'active',
  }, ['.codex/scripts/nexus-workflow.mjs'], {}).length > 0);
  add('routing check rejects stale worktree hash', routingScopeProblemsForState({
    routingId: 'ROUTING-test',
    route: 'lead',
    status: 'active',
    worktreeHash: 'stale',
    currentHash: 'current',
  }, ['.codex/scripts/nexus-workflow.mjs'], {}).length > 0);
  add('routing check accepts clean worktree with stale routing state', routingScopeProblemsForState({
    routingId: 'ROUTING-test',
    route: 'lead',
    status: 'active',
    worktreeHash: 'stale',
    currentHash: 'current',
  }, [], {}).length === 0);
  add('routing check accepts hash-bound non-Spark route', routingScopeProblemsForState({
    routingId: 'ROUTING-test',
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
    routingId: 'ROUTING-test',
    route: 'spark',
    worker: 'nexus_spark_worker',
    status: 'active',
    worktreeHash: 'base',
    currentHash: 'current',
    recordedAt: '2026-05-09T00:10:00.000Z',
  }, ['packages/web/src/components/ui/Toast.tsx'], {
    worktreeHash: 'current',
    routingId: 'ROUTING-test',
    workers: ['nexus_spark_worker'],
    lastChangedAt: '2026-05-09T00:09:00.000Z',
    patchId: 'PATCH-test',
  }).some((problem) => problem.includes('after delegated patch')));
  add('routing check accepts delegated preflight linked to patch', routingScopeProblemsForState({
    routingId: 'ROUTING-test',
    route: 'spark',
    worker: 'nexus_spark_worker',
    files: ['packages/web/src/components/ui/Toast.tsx'],
    status: 'active',
    worktreeHash: 'base',
    currentHash: 'current',
    recordedAt: '2026-05-09T00:09:00.000Z',
  }, ['packages/web/src/components/ui/Toast.tsx'], {
    worktreeHash: 'current',
    routingId: 'ROUTING-test',
    workers: ['nexus_spark_worker'],
    lastChangedAt: '2026-05-09T00:10:00.000Z',
    patchId: 'PATCH-test',
  }).length === 0);
  add('routing check rejects delegated patch covered by lead route', routingScopeProblemsForState({
    routingId: 'ROUTING-test',
    route: 'lead',
    worker: 'codex-lead',
    status: 'active',
    worktreeHash: 'base',
    currentHash: 'current',
    recordedAt: '2026-05-09T00:09:00.000Z',
  }, ['packages/web/src/components/ui/Toast.tsx'], {
    worktreeHash: 'current',
    routingId: 'ROUTING-test',
    workers: ['nexus_spark_worker'],
    lastChangedAt: '2026-05-09T00:10:00.000Z',
    patchId: 'PATCH-test',
  }).some((problem) => problem.includes('lead-only')));
  add('integrated review does not trigger for lead aliases only', !requiresIntegratedReview({
    worktreeHash: worktreeHash(),
    workers: ['codex', 'codex-lead'],
  }));
  add('integrated review triggers for lead plus delegated worker', requiresIntegratedReview({
    worktreeHash: worktreeHash(),
    workers: ['codex-lead', 'nexus_spark_worker'],
  }));
  add('review kind check rejects workflow-only pass as general pass', !stateHasReviewKind({
    worktreeHash: 'hash',
    verdict: 'pass',
    kind: 'workflow',
  }, 'general', 'hash'));
  add('review kind check accepts explicit general pass', stateHasReviewKind({
    worktreeHash: 'hash',
    verdict: 'pass',
    kind: 'general',
  }, 'general', 'hash'));
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
  add('routing check catches Spark out-of-scope file', routingScopeProblemsForState({
    routingId: 'ROUTING-test',
    route: 'spark',
    files: ['packages/web/src/components/ui/Toast.tsx'],
    status: 'active',
    worktreeHash: 'current',
    currentHash: 'current',
  }, ['packages/web/src/components/registry.json'], {}).length > 0);
  add('routing check accepts Spark in-scope file', routingScopeProblemsForState({
    routingId: 'ROUTING-test',
    route: 'spark',
    files: ['packages/web/src/components/ui/Toast.tsx'],
    status: 'active',
    worktreeHash: 'current',
    currentHash: 'current',
  }, ['packages/web/src/components/ui/Toast.tsx'], {}).length === 0);
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
  if (args['release-gate'] || args.full) {
    const reviewOk = commandReviewCheck({ quiet: true });
    const verifyOk = commandVerifyCheck({ quiet: true });
    const auditOk = commandAuditCheck({ quiet: true });
    const handoverOk = commandHandoverCheck({ quiet: true });
    const recordsOk = commandRecordsCheck({ quiet: true });
    const routingOk = commandRoutingCheck({ quiet: true });
    const guideOk = commandGuideCheck({ quiet: true });
    const guideBrowserOk = commandGuideBrowserCheck({ quiet: true });
    const zooOk = commandZooCheck({ quiet: true });
    const selfTestFailures = workflowSelfTestChecks().filter((check) => !check.ok);
    if (!reviewOk || !verifyOk || !auditOk || !handoverOk || !recordsOk || !routingOk || !guideOk || !guideBrowserOk || !zooOk || selfTestFailures.length) {
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
  invalidateGates(substantive, title, 'codex-hook');
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

if (command === 'status') commandStatus();
else if (command === 'dashboard') commandDashboard(args);
else if (command === 'public-guide') commandPublicGuide(args);
else if (command === 'record-patch') commandRecordPatch(args);
else if (command === 'record-review') commandRecordReview(args);
else if (command === 'record-verify') commandRecordVerification(args);
else if (command === 'record-audit') commandRecordAudit(args);
else if (command === 'record-guide-browser') commandRecordGuideBrowser(args);
else if (command === 'record-test') commandRecordTest(args);
else if (command === 'record-deployment') commandRecordDeployment(args);
else if (command === 'record-decision') commandRecordGeneric('decisions', args);
else if (command === 'record-routing') commandRecordRouting(args);
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
