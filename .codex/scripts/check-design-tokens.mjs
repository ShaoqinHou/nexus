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
    id: 'primary-inverse-pair',
    standard: 'S-THEME-CONTRAST',
    message: 'bg-primary must pair with text-primary-text, not text-text-inverse.',
    regex: /\bbg-primary\b(?=[^"'`]*\btext-text-inverse\b)|\btext-text-inverse\b(?=[^"'`]*\bbg-primary\b)/g,
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
    id: 'hit-target-too-small',
    standard: 'S-HIT-TARGET-TOKEN',
    message: 'Interactive min-height below 44px - use min-h-[var(--hit-sm)] or a semantic control component.',
    regex: /\bmin-h-\[(?:[1-3]?\d|4[0-3])px\]/g,
    appliesTo: (rel) => /\.(tsx|ts)$/.test(rel),
    ignoreLineRegex: /chart|label|text-\[10px\]|preserveAspectRatio/,
  },
  {
    id: 'shape-token-hardcoded',
    standard: 'S-SHAPE-TOKEN',
    message: 'Core UI shape uses raw Tailwind radius - use rounded-[var(--radius-card/btn/chip)] or an approved circle/pill.',
    regex: /\brounded(?:-(?:none|sm|md|lg|xl|2xl|3xl))?\b/g,
    appliesTo: (rel) => /^packages\/web\/src\/components\/(ui|patterns)\//.test(rel) && /\.(tsx|ts)$/.test(rel),
    ignoreLineRegex: /^\s*\/\/|rounded-full|rounded-\[var\(--radius-[^)]+\)\]|Hardcoded `rounded/,
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

function stripCssComments(text) {
  return String(text).replace(/\/\*[\s\S]*?\*\//g, '');
}

function hexToRgb(hex) {
  const value = String(hex).trim().replace(/^#/, '');
  if (!/^[0-9a-fA-F]{6}$/.test(value)) return null;
  return [
    parseInt(value.slice(0, 2), 16),
    parseInt(value.slice(2, 4), 16),
    parseInt(value.slice(4, 6), 16),
  ];
}

function relativeLuminance(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  const [r, g, b] = rgb.map((channel) => {
    const s = channel / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(foreground, background) {
  const fg = relativeLuminance(foreground);
  const bg = relativeLuminance(background);
  if (fg === null || bg === null) return null;
  return (Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05);
}

function declarationLine(content, token) {
  const index = content.indexOf(token);
  if (index < 0) return 1;
  return content.slice(0, index).split(/\r?\n/).length;
}

function parseThemeVars(content, themeId) {
  const blocks = {
    base: { vars: {}, lines: {} },
    dark: { vars: {}, lines: {} },
  };
  const blockRegex = /([^{}]+)\{([^{}]*)\}/g;
  let blockMatch;
  while ((blockMatch = blockRegex.exec(content)) !== null) {
    const selector = blockMatch[1];
    if (!selector.includes(`[data-theme="${themeId}"]`)) continue;
    const target = selector.includes('.dark') ? blocks.dark : blocks.base;
    const block = stripCssComments(blockMatch[2]);
    const declarationRegex = /(--[a-z0-9-]+)\s*:\s*([^;]+);/gi;
    let declarationMatch;
    while ((declarationMatch = declarationRegex.exec(block)) !== null) {
      const token = declarationMatch[1];
      target.vars[token] = declarationMatch[2].trim();
      target.lines[token] = content.slice(0, blockMatch.index).split(/\r?\n/).length
        + block.slice(0, declarationMatch.index).split(/\r?\n/).length - 1;
    }
  }
  return blocks;
}

function resolveToken(value, vars, seen = new Set()) {
  const trimmed = String(value || '').trim();
  const varMatch = trimmed.match(/^var\((--[a-z0-9-]+)\)$/i);
  if (!varMatch) return trimmed;
  const token = varMatch[1];
  if (seen.has(token)) return '';
  seen.add(token);
  return resolveToken(vars[token], vars, seen);
}

function scopeCoversThemeDir() {
  const normalized = SCOPE.split(/[\\/]+/).join('/').replace(/\/$/, '');
  return normalized === 'packages/web/src'
    || normalized === 'packages/web/src/platform'
    || normalized === 'packages/web/src/platform/theme'
    || normalized === 'packages/web/src/platform/theme/themes';
}

function checkThemeContrast() {
  if (!scopeCoversThemeDir()) return;
  const tokenPath = join(ROOT, 'packages', 'web', 'src', 'platform', 'theme', 'tokens.css');
  let rootDefaults = { vars: {}, lines: {}, rel: 'packages/web/src/platform/theme/tokens.css', content: '' };
  try {
    const content = readFileSync(tokenPath, 'utf8');
    rootDefaults = {
      ...parseRootVars(content),
      rel: relative(ROOT, tokenPath).split(sep).join('/'),
      content,
    };
  } catch {
    violations.push({
      file: 'packages/web/src/platform/theme/tokens.css',
      line: 1,
      col: 1,
      match: 'tokens.css',
      ruleId: 'theme-primary-contrast',
      standard: 'S-THEME-CONTRAST',
      message: 'Theme contrast lint could not read root token defaults.',
    });
  }
  const pairs = [
    { fill: '--color-primary', text: '--color-primary-text', fallbackText: '--color-text-inverse', label: 'primary' },
  ];
  checkPrimaryContrastPairs({
    rel: rootDefaults.rel,
    content: rootDefaults.content,
    modes: [{ name: 'root', vars: rootDefaults.vars, lines: rootDefaults.lines }],
    pairs,
  });
  const themeDir = join(ROOT, 'packages', 'web', 'src', 'platform', 'theme', 'themes');
  let entries;
  try {
    entries = readdirSync(themeDir).filter((entry) => entry.endsWith('.css'));
  } catch {
    return;
  }
  for (const entry of entries) {
    const file = join(themeDir, entry);
    const themeId = entry.replace(/\.css$/, '');
    let content;
    try {
      content = readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    const parsed = parseThemeVars(content, themeId);
    const modes = [
      { name: 'light', vars: { ...rootDefaults.vars, ...parsed.base.vars }, lines: parsed.base.lines },
      {
        name: 'dark',
        vars: { ...rootDefaults.vars, ...parsed.base.vars, ...parsed.dark.vars },
        lines: { ...parsed.base.lines, ...parsed.dark.lines },
      },
    ];
    const rel = relative(ROOT, file).split(sep).join('/');
    checkPrimaryContrastPairs({ rel, content, modes, pairs, themeId });
  }
}

function checkPrimaryContrastPairs({ rel, content, modes, pairs, themeId = 'default' }) {
  for (const mode of modes) {
    if (!Object.keys(mode.vars).length) continue;
    for (const pair of pairs) {
      const fill = resolveToken(mode.vars[pair.fill], mode.vars);
      const text = resolveToken(mode.vars[pair.text] || mode.vars[pair.fallbackText], mode.vars);
      const ratio = contrastRatio(text, fill);
      if (ratio === null) {
        violations.push({
          file: rel,
          line: mode.lines[pair.text] || mode.lines[pair.fill] || declarationLine(content, pair.fill),
          col: 1,
          match: `${themeId}/${mode.name} ${pair.label}: ${text || '(missing)'} on ${fill || '(missing)'}`,
          ruleId: 'theme-primary-contrast',
          standard: 'S-THEME-CONTRAST',
          message: 'Theme primary fill/text tokens must resolve to six-digit hex colors for deterministic contrast proof.',
        });
        continue;
      }
      if (ratio < 4.5) {
        violations.push({
          file: rel,
          line: mode.lines[pair.text] || mode.lines[pair.fill] || declarationLine(content, pair.text),
          col: 1,
          match: `${themeId}/${mode.name} ${pair.label}: ${text} on ${fill} (${ratio.toFixed(2)}:1)`,
          ruleId: 'theme-primary-contrast',
          standard: 'S-THEME-CONTRAST',
          message: 'Theme primary fill must meet 4.5:1 contrast with --color-primary-text.',
        });
      }
    }
  }
}

function parseRootVars(content) {
  const blockMatch = String(content).match(/:root\s*{([\s\S]*?)\n}/);
  const vars = {};
  const lines = {};
  if (!blockMatch) return { vars, lines };
  const block = stripCssComments(blockMatch[1]);
  const startLine = content.slice(0, blockMatch.index).split(/\r?\n/).length;
  const declarationRegex = /(--[a-z0-9-]+)\s*:\s*([^;]+);/gi;
  let declarationMatch;
  while ((declarationMatch = declarationRegex.exec(block)) !== null) {
    const token = declarationMatch[1];
    vars[token] = declarationMatch[2].trim();
    lines[token] = startLine + block.slice(0, declarationMatch.index).split(/\r?\n/).length - 1;
  }
  return { vars, lines };
}

function checkPrimaryInverseSourcePairs(rel, content) {
  const regex = /\bbg-primary\b[^>]{0,180}>\s*<[^>]{0,180}\btext-text-inverse\b/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const snippet = match[0];
    if (/lint-override/.test(snippet)) continue;
    violations.push({
      file: rel,
      line: content.slice(0, match.index).split(/\r?\n/).length,
      col: 1,
      match: snippet.replace(/\s+/g, ' ').slice(0, 120),
      ruleId: 'primary-inverse-pair',
      standard: 'S-THEME-CONTRAST',
      message: 'bg-primary must pair with text-primary-text, not text-text-inverse.',
    });
  }
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

  if (/\.(tsx|ts)$/.test(rel)) {
    checkPrimaryInverseSourcePairs(rel, content);
  }
}

checkThemeContrast();

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
