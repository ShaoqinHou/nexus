#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve, relative } from 'node:path';
import { spawnSync } from 'node:child_process';

const START = process.cwd();
const ROOT = findRoot(START);
const CODEX = join(ROOT, '.codex');
const RECORDS = join(CODEX, 'workflow', 'records');
const STATE_FILE = join(RECORDS, 'review-state.json');
const VERIFY_STATE_FILE = join(RECORDS, 'verify-state.json');
const AUDIT_STATE_FILE = join(RECORDS, 'audit-state.json');
const PATCH_STATE_FILE = join(RECORDS, 'patch-state.json');
const DASHBOARD_DIR = join(CODEX, 'dashboard');

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
    if (f.startsWith('.codex/workflow/records/')) return false;
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
    reviews: 'REVIEW',
    tests: 'TEST',
  };
  return prefixes[kind] || kind.replace(/s$/, '').toUpperCase();
}

function writeRecord(kind, title, body, frontmatter = {}) {
  const dir = join(RECORDS, kind);
  ensureDir(dir);
  const id = `${recordPrefix(kind)}-${nowIso().replace(/[-:]/g, '').replace(/\..+/, 'Z')}-${slug(title)}`;
  const path = join(dir, `${id}.md`);
  const fm = {
    schema: `nexus-${kind.slice(0, -1)}/v1`,
    id,
    created: nowIso(),
    ...frontmatter,
  };
  const text = `---\n${Object.entries(fm).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join('\n')}\n---\n\n# ${title}\n\n${body.trim()}\n`;
  writeFileSync(path, text);
  return { id, path };
}

function invalidateGates(files, reason, source = 'workflow') {
  const currentHash = worktreeHash();
  const patchState = loadJson(PATCH_STATE_FILE, { events: [] });
  patchState.worktreeHash = currentHash;
  patchState.lastChangedAt = nowIso();
  patchState.reason = reason;
  patchState.source = source;
  patchState.files = files;
  patchState.events = [
    {
      at: patchState.lastChangedAt,
      source,
      reason,
      files,
      worktreeHash: currentHash,
    },
    ...(patchState.events || []).slice(0, 24),
  ];
  saveJson(PATCH_STATE_FILE, patchState);

  const reviewState = loadJson(STATE_FILE, {});
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

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
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

function commandDashboard(args = {}) {
  ensureDir(DASHBOARD_DIR);
  const recordKinds = ['decisions', 'pattern-proposals', 'patches', 'reviews', 'tests', 'deployments'];
  const records = Object.fromEntries(recordKinds.map((kind) => [kind, listRecords(kind)]));
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
    ['Patches', records.patches.length],
    ['Reviews', records.reviews.length],
    ['Tests', records.tests.length],
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
  <title>Nexus Workflow Dashboard</title>
  <style>
    :root { color-scheme: light; --bg:#f6f7f9; --panel:#fff; --text:#17202a; --muted:#627084; --line:#dde3ea; --brand:#185b57; --accent:#b7772d; --risk:#b42318; }
    * { box-sizing: border-box; }
    body { margin:0; font-family: Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif; background:var(--bg); color:var(--text); line-height:1.45; }
    header { padding:28px 32px 18px; background:var(--panel); border-bottom:1px solid var(--line); }
    h1 { margin:0 0 8px; font-size:28px; letter-spacing:0; }
    h2 { margin:0 0 14px; font-size:18px; letter-spacing:0; }
    h3 { margin:18px 0 8px; font-size:15px; letter-spacing:0; }
    p { margin:8px 0; }
    pre { white-space:pre-wrap; overflow:auto; background:#f2f5f7; border:1px solid var(--line); padding:10px; border-radius:6px; font-size:12px; }
    code { background:#eef3f5; padding:1px 4px; border-radius:4px; }
    a { color:var(--brand); text-decoration:none; }
    a:hover { text-decoration:underline; }
    .meta { color:var(--muted); font-size:13px; }
    .layout { display:grid; grid-template-columns:260px 1fr; min-height:calc(100vh - 92px); }
    nav { position:sticky; top:0; height:100vh; padding:18px; border-right:1px solid var(--line); background:#eef2f4; overflow:auto; }
    nav a { display:block; padding:7px 9px; border-radius:6px; color:var(--text); font-size:14px; }
    nav a:hover { background:#fff; text-decoration:none; }
    main { padding:22px; max-width:1180px; }
    .grid { display:grid; grid-template-columns:repeat(auto-fit, minmax(150px, 1fr)); gap:12px; margin:16px 0 22px; }
    .card, .panel, .record { background:var(--panel); border:1px solid var(--line); border-radius:8px; }
    .card { padding:14px; }
    .card strong { display:block; font-size:24px; }
    .panel { padding:18px; margin:0 0 18px; }
    .record { padding:12px; margin:10px 0; }
    .record-top { display:flex; justify-content:space-between; gap:12px; align-items:baseline; }
    .record-top span, .path, .muted { color:var(--muted); font-size:12px; }
    .pill { display:inline-block; margin-top:8px; padding:2px 8px; border-radius:999px; background:#e9f2ef; color:var(--brand); font-size:12px; }
    .warn { border-left:4px solid var(--accent); }
    .risk { border-left:4px solid var(--risk); }
    .zoo-grid { display:grid; grid-template-columns:repeat(auto-fit, minmax(260px, 1fr)); gap:10px; }
    @media (max-width: 820px) { .layout { grid-template-columns:1fr; } nav { position:static; height:auto; border-right:0; border-bottom:1px solid var(--line); } }
  </style>
</head>
<body>
  <header>
    <h1>Nexus Workflow Dashboard</h1>
    <div class="meta">Generated ${escapeHtml(generated)} · branch ${escapeHtml(branch)} · worktree ${escapeHtml(hash)}</div>
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
  writeFileSync(outPath, html);
  if (!args.quiet) {
    console.log(`Dashboard generated: ${relative(ROOT, outPath).replaceAll('\\', '/')}`);
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
  const currentHash = worktreeHash();
  const reviewed = state.worktreeHash === currentHash && state.verdict === 'pass';
  const verified = verifyState.worktreeHash === currentHash && verifyState.verdict === 'pass';
  const audited = auditState.worktreeHash === currentHash && auditState.verdict === 'pass';
  console.log(`Nexus Codex workflow status`);
  console.log(`root: ${ROOT}`);
  console.log(`branch: ${branch}`);
  console.log(`changed files: ${files.length}`);
  console.log(`substantive files: ${substantive.length}`);
  console.log(`worktree hash: ${currentHash}`);
  console.log(`reviewed: ${reviewed ? 'yes' : 'no'}`);
  console.log(`verified: ${verified ? 'yes' : 'no'}`);
  console.log(`audited: ${audited ? 'yes' : 'no'}`);
  if (state.reviewedAt) console.log(`last review: ${state.reviewedAt} by ${state.reviewer || 'unknown'} (${state.verdict || 'unknown'})`);
  if (verifyState.verifiedAt) console.log(`last verification: ${verifyState.verifiedAt} by ${verifyState.verifier || 'unknown'} (${verifyState.verdict || 'unknown'})`);
  if (auditState.auditedAt) console.log(`last audit: ${auditState.auditedAt} by ${auditState.auditor || 'unknown'} (${auditState.verdict || 'unknown'})`);
  if (patchState.lastChangedAt) console.log(`last patch trigger: ${patchState.lastChangedAt} (${patchState.reason || patchState.source || 'unknown'})`);
  if (status) {
    console.log('');
    console.log(status);
  }
}

function commandRecordPatch(args, hookPayload = null) {
  const files = args.files ? String(args.files).split(',').map((f) => f.trim()).filter(Boolean) : changedFiles();
  const title = args.summary || hookPayload?.tool_name || 'Patch';
  const body = [
    `Summary: ${title}`,
    '',
    `Files:`,
    ...files.map((f) => `- ${f}`),
    '',
    `Worktree hash after patch: ${worktreeHash()}`,
  ].join('\n');
  const rec = writeRecord('patches', title, body, {
    files,
    agent: args.agent || 'codex',
    worktreeHash: worktreeHash(),
  });
  invalidateGates(files, `patch ${rec.id}`, args.agent || 'codex');
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
  const title = `Review ${verdict} ${args.scope || 'worktree'}`;
  const body = [
    `Scope: ${args.scope || 'worktree'}`,
    `Verdict: ${verdict}`,
    `Reviewer: ${args.reviewer || 'unknown'}`,
    `Worktree hash: ${hash}`,
    '',
    args.notes ? `Notes: ${args.notes}` : 'Notes: n/a',
  ].join('\n');
  const rec = writeRecord('reviews', title, body, {
    scope: args.scope || 'worktree',
    verdict,
    reviewer: args.reviewer || 'unknown',
    worktreeHash: hash,
  });
  saveJson(STATE_FILE, {
    worktreeHash: hash,
    verdict,
    reviewer: args.reviewer || 'unknown',
    reviewedAt: nowIso(),
    reviewRecord: relative(ROOT, rec.path).replaceAll('\\', '/'),
    notes: args.notes || '',
  });
  console.log(`Recorded review ${rec.id}`);
  console.log(relative(ROOT, rec.path));
}

function commandReviewCheck({ quiet = false } = {}) {
  const files = substantiveFiles();
  const hash = worktreeHash();
  const state = loadJson(STATE_FILE, {});
  const ok = files.length === 0 || (state.worktreeHash === hash && state.verdict === 'pass');
  if (!quiet) {
    console.log(`substantive files: ${files.length}`);
    console.log(`worktree hash: ${hash}`);
    console.log(`reviewed: ${ok ? 'yes' : 'no'}`);
    if (!ok) {
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
  const rec = writeRecord('reviews', title, body, {
    scope: args.scope || 'worktree',
    verdict,
    auditor: args.auditor || 'unknown',
    worktreeHash: hash,
    kind: 'audit',
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
  if (!args.summary || !args.evidence) {
    console.error('record-pattern requires --summary and --evidence so durable guidance is evidence-based.');
    process.exit(2);
  }
  const files = args.files ? String(args.files).split(',').map((f) => f.trim()).filter(Boolean) : [];
  const title = `Pattern ${status} ${args.summary}`;
  const body = [
    `Status: ${status}`,
    `Reporter: ${args.reporter || 'codex'}`,
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
    evidence: args.evidence,
    files,
  });
  console.log(`Recorded pattern proposal ${rec.id}`);
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

function commandValidate(args) {
  const required = [
    'AGENTS.md',
    '.codex/README.md',
    '.codex/workflow/current-state.md',
    '.codex/knowledge/patterns.md',
    '.codex/knowledge/design-system.md',
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
    const ok = commandReviewCheck({ quiet: true });
    if (!ok) {
      console.error('Commit gate failed: current substantive changes do not have a passing review record.');
      console.error('Run nexus-review, then record it with:');
      console.error('node .codex/scripts/nexus-workflow.mjs record-review --scope worktree --verdict pass --reviewer <name> --notes "<summary>"');
      process.exit(1);
    }
  }
  if (args['release-gate'] || args.full) {
    const reviewOk = commandReviewCheck({ quiet: true });
    const verifyOk = commandVerifyCheck({ quiet: true });
    const auditOk = commandAuditCheck({ quiet: true });
    if (!reviewOk || !verifyOk || !auditOk) {
      if (!reviewOk) console.error('Release gate failed: missing passing review record.');
      if (!verifyOk) console.error('Release gate failed: missing passing verification record.');
      if (!auditOk) console.error('Release gate failed: missing passing audit record.');
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

function hookSessionStart() {
  const statePath = relative(ROOT, join(CODEX, 'workflow', 'current-state.md')).replaceAll('\\', '/');
  const status = gitText(['status', '--short', '--branch']).split(/\r?\n/).slice(0, 20).join('\n');
  const additionalContext = [
    `Nexus Codex workflow is active. Read ${statePath} before substantive work.`,
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
  if (!files.length) return;
  const substantive = substantiveFiles(files);
  if (!substantive.length) return;
  const title = `Hook ${payload?.tool_name || payload?.hook_event_name || 'tool'} changed substantive files`;
  invalidateGates(substantive, title, 'codex-hook');
}

function hookStop() {
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
else if (command === 'record-patch') commandRecordPatch(args);
else if (command === 'record-review') commandRecordReview(args);
else if (command === 'record-verify') commandRecordVerification(args);
else if (command === 'record-audit') commandRecordAudit(args);
else if (command === 'record-test') commandRecordGeneric('tests', args);
else if (command === 'record-deployment') commandRecordGeneric('deployments', args);
else if (command === 'record-decision') commandRecordGeneric('decisions', args);
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
}
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
