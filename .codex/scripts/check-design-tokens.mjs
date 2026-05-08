#!/usr/bin/env node
// Design-token linter for nexus.
// Codex-native location. Historical source: .codex/archive/claude-code-2026-05-09/.claude/scripts/check-design-tokens.mjs.
//
// Exit code:
//   0 = no violations
//   1 = violations found
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
    'Usage: node .codex/scripts/check-design-tokens.mjs [--scope=path] [--format=json] [--quiet]\n'
  );
  process.exit(0);
}

const SCOPE = args.get('scope') || 'packages/web/src';
const FORMAT = args.get('format') || 'text';
const QUIET = args.has('quiet');

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

const EXTENSIONS = new Set(['.tsx', '.ts', '.css', '.scss', '.sass', '.html']);

const RULES = [
  {
    id: 'hex-literal',
    standard: 'S-NO-HARDCODE-COLORS',
    message: 'Raw hex color - use var(--color-*) or token-mapped Tailwind class.',
    regex: /(?<![\w/])#([0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})(?![\w])/g,
    appliesTo: (rel) => /\.(tsx|ts|css|scss|sass)$/.test(rel),
    ignoreLineRegex: /href=["']#|xlink:href|url\(#|<use href=/,
  },
  {
    id: 'rgba-literal',
    standard: 'S-NO-HARDCODE-COLORS',
    message: 'Raw rgb()/rgba() - use var(--color-*) or a semantic token.',
    regex: /\brgba?\(\s*\d{1,3}\s*(?:,|\s+\d)/g,
    appliesTo: (rel) => /\.(tsx|ts|css|scss|sass)$/.test(rel),
  },
  {
    id: 'tailwind-color-scale',
    standard: 'S-SEMANTIC-TOKENS',
    message: 'Tailwind color scale - use semantic tokens.',
    regex: /\b(bg|text|border|ring|divide|outline|fill|stroke|from|to|via|placeholder|caret|accent|shadow)-(gray|slate|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(50|100|200|300|400|500|600|700|800|900|950)\b/g,
    appliesTo: (rel) => /\.(tsx|ts)$/.test(rel),
  },
  {
    id: 'hit-target-hardcoded',
    standard: 'S-HIT-TARGET-TOKEN',
    message: 'Hardcoded hit-target pixel - use h-[var(--hit-sm/md/lg)] or <Button size="..." />.',
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
      if (/(\/\/|\/\*)\s*lint-override/.test(line)) continue;
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

if (FORMAT === 'json') {
  process.stdout.write(`${JSON.stringify({ violations, count: violations.length }, null, 2)}\n`);
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
