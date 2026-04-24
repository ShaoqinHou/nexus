#!/usr/bin/env node
// Design-token linter for nexus.
// Node-native — no ESLint, no Stylelint, no extra deps.
// Runs via `npm run lint:design` (wired in package.json).
//
// Enforces S-NO-HARDCODE-COLORS + S-LUCIDE-ONLY + S-HIT-TARGET-TOKEN drift
// without paying the ~200MB eslint-plugin-design-tokens install tax.
//
// Exit code:
//   0 = no violations
//   1 = violations found (also printed to stderr)
//
// CLI flags:
//   --scope=<path>   restrict scan to a subtree (default: packages/web/src)
//   --format=json    emit JSON instead of pretty text
//   --quiet          suppress per-violation output (summary only)
//   --help           usage

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(import.meta.url), '..', '..', '..');

const args = new Map(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.includes('=') ? a.split('=') : [a, 'true'];
    return [k.replace(/^--/, ''), v];
  })
);

if (args.has('help')) {
  process.stdout.write(
    'Usage: node .claude/scripts/check-design-tokens.js [--scope=path] [--format=json] [--quiet]\n'
  );
  process.exit(0);
}

const SCOPE = args.get('scope') || 'packages/web/src';
const FORMAT = args.get('format') || 'text';
const QUIET = args.has('quiet');

// Paths that are NEVER flagged — token definitions, SVG assets, test files,
// generated code, vendor code, and the read-only design reference bundle.
const EXCLUDE_SUBSTRINGS = [
  `packages${sep}web${sep}src${sep}platform${sep}theme${sep}`,
  `${sep}__tests__${sep}`,
  `${sep}__mocks__${sep}`,
  `node_modules${sep}`,
  `${sep}dist${sep}`,
  `${sep}.vite${sep}`,
  `design${sep}reference${sep}`,
  `${sep}locales${sep}`,
];

// Only inspect files with these extensions.
const EXTENSIONS = new Set(['.tsx', '.ts', '.css', '.scss', '.sass', '.html']);

// --- Detection rules ---------------------------------------------------
// Each rule returns an array of { line, col, match, standard, message }.

const RULES = [
  {
    id: 'hex-literal',
    standard: 'S-NO-HARDCODE-COLORS',
    message: 'Raw hex color — use var(--color-*) or token-mapped Tailwind class.',
    // match 3/4/6/8-digit hex not preceded/followed by word chars (e.g. inside a className)
    // skip anchors (#id refs) by excluding common benign contexts via allow-list below.
    regex: /(?<![\w/])#([0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})(?![\w])/g,
    appliesTo: (rel) => /\.(tsx|ts|css|scss|sass)$/.test(rel),
    // Ignore lines that look like HTML anchors, fragment refs, or the middle-dot separator
    ignoreLineRegex: /href=["']#|xlink:href|url\(#|<use href=/,
  },
  {
    id: 'rgba-literal',
    standard: 'S-NO-HARDCODE-COLORS',
    message: 'Raw rgb()/rgba() — use var(--color-*) or a semantic token.',
    // Catches both comma-separated (rgb(255, 0, 0)) and CSS Level 4
    // space-separated (rgb(255 0 0), rgba(255 0 0 / 50%)) syntaxes.
    regex: /\brgba?\(\s*\d{1,3}\s*(?:,|\s+\d)/g,
    appliesTo: (rel) => /\.(tsx|ts|css|scss|sass)$/.test(rel),
  },
  {
    id: 'tailwind-color-scale',
    standard: 'S-SEMANTIC-TOKENS',
    message: 'Tailwind color scale (bg-gray-500, text-red-600, etc.) — use semantic token (bg-bg-surface, text-danger).',
    regex: /\b(bg|text|border|ring|divide|outline|fill|stroke|from|to|via|placeholder|caret|accent|shadow)-(gray|slate|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(50|100|200|300|400|500|600|700|800|900|950)\b/g,
    appliesTo: (rel) => /\.(tsx|ts)$/.test(rel),
  },
  {
    id: 'hit-target-hardcoded',
    standard: 'S-HIT-TARGET-TOKEN',
    message: 'Hardcoded hit-target pixel — use h-[var(--hit-sm/md/lg)] or <Button size="..." />.',
    // Canonical hit targets are 44/48/52 (--hit-sm/md/lg). We scan the full
    // 44-59px range to catch near-miss hardcodes ("50px looks right") that
    // should collapse to the nearest token.
    regex: /\b(min-h|h|min-w|w)-\[(4[4-9]|5[0-9])px\]/g,
    appliesTo: (rel) => /\.(tsx|ts)$/.test(rel),
  },
  {
    id: 'non-lucide-icon-import',
    standard: 'S-LUCIDE-ONLY',
    message: 'Only lucide-react is permitted for UI icons.',
    regex: /from\s+['"](react-icons\/[^'"]+|@heroicons\/react[^'"]*|heroicons[^'"]*|phosphor-react|phosphor-icons|@phosphor-icons\/react[^'"]*|@iconify\/react[^'"]*|@radix-ui\/react-icons[^'"]*|@tabler\/icons[^'"]*)['"]/g,
    appliesTo: (rel) => /\.(tsx|ts)$/.test(rel),
  },
];

// --- File walker -------------------------------------------------------

function walk(dir, acc = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return acc;
  }
  for (const entry of entries) {
    const full = join(dir, entry);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) {
      walk(full, acc);
    } else {
      const rel = relative(ROOT, full);
      if (EXCLUDE_SUBSTRINGS.some((s) => rel.includes(s))) continue;
      const ext = '.' + entry.split('.').pop();
      if (!EXTENSIONS.has(ext)) continue;
      acc.push(full);
    }
  }
  return acc;
}

// --- Scan --------------------------------------------------------------

const startDir = join(ROOT, SCOPE);
const files = walk(startDir);
const violations = [];

for (const file of files) {
  const rel = relative(ROOT, file).split(sep).join('/');
  let content;
  try {
    content = readFileSync(file, 'utf8');
  } catch {
    continue;
  }
  const lines = content.split(/\r?\n/);

  for (const rule of RULES) {
    if (!rule.appliesTo(rel)) continue;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (rule.ignoreLineRegex && rule.ignoreLineRegex.test(line)) continue;
      // review-override escape hatch: one-line override
      if (/\/\/\s*lint-override/.test(line)) continue;
      rule.regex.lastIndex = 0;
      let m;
      while ((m = rule.regex.exec(line)) !== null) {
        violations.push({
          file: rel,
          line: i + 1,
          col: m.index + 1,
          match: m[0],
          ruleId: rule.id,
          standard: rule.standard,
          message: rule.message,
        });
      }
    }
  }
}

// --- Report ------------------------------------------------------------

if (FORMAT === 'json') {
  process.stdout.write(JSON.stringify({ violations, count: violations.length }, null, 2) + '\n');
} else {
  if (!QUIET) {
    for (const v of violations) {
      process.stderr.write(
        `${v.file}:${v.line}:${v.col}  [${v.ruleId}/${v.standard}]  ${v.match}\n    -> ${v.message}\n`
      );
    }
  }
  const byRule = violations.reduce((acc, v) => {
    acc[v.ruleId] = (acc[v.ruleId] || 0) + 1;
    return acc;
  }, {});
  const parts = Object.entries(byRule).map(([k, n]) => `${k}=${n}`).join(', ');
  if (violations.length === 0) {
    process.stdout.write(`design-tokens: OK  (${files.length} files scanned)\n`);
  } else {
    process.stderr.write(
      `\ndesign-tokens: ${violations.length} violation${violations.length === 1 ? '' : 's'} across ${files.length} files  (${parts})\n`
    );
  }
}

process.exit(violations.length === 0 ? 0 : 1);
