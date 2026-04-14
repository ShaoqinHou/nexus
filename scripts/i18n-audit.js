#!/usr/bin/env node
/**
 * i18n-audit.js — static scanner for hardcoded English user-visible strings.
 *
 * Catches common i18n regressions in packages/web/src/**\/*.tsx that should be
 * wrapped in t('...') from @web/lib/i18n.
 *
 * Usage:
 *   node scripts/i18n-audit.js                 # plain output (file:line:col — kind — snippet)
 *   node scripts/i18n-audit.js --fix-report    # grouped by file
 *   node scripts/i18n-audit.js --help          # this message
 *
 * Exit code 0 if no violations, 1 if violations found.
 *
 * No external deps — uses fs/path + regex only.
 */

const fs = require('fs');
const path = require('path');

// ----- CLI -----
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  process.stdout.write(
    [
      'i18n-audit.js — scan packages/web/src for hardcoded English strings',
      '',
      'Usage:',
      '  node scripts/i18n-audit.js                 plain output',
      '  node scripts/i18n-audit.js --fix-report    grouped by file',
      '  node scripts/i18n-audit.js --help          show this',
      '',
      'Exit codes: 0 = clean, 1 = violations found.',
      '',
    ].join('\n'),
  );
  process.exit(0);
}
const fixReport = args.includes('--fix-report');

const ROOT = path.resolve(__dirname, '..');
const SRC_DIR = path.join(ROOT, 'packages', 'web', 'src');

// ----- Skip rules -----
const SKIP_DIR_SEGMENTS = new Set(['__tests__', 'node_modules', 'locales']);
const SKIP_FILE_SUFFIXES = ['.test.tsx', '.spec.tsx', '.test.ts', '.spec.ts'];

// Known-safe attribute values that look English but are format hints / examples.
const SAFE_ATTR_VALUES = new Set([
  '0.00',
  '5.00',
  '10.00',
  'email@example.com',
  'password123',
  'my-restaurant',
  '#2563eb',
  'https://...',
  'https://example.com',
]);

// Words/phrases that are not English UI text (jargon, identifiers, abbreviations).
const SAFE_TEXT_VALUES = new Set([
  'YYYY-MM-DD',
  'HH:MM',
  'NZ',
  'NZD',
  'USD',
  'EUR',
  'GBP',
  'AM',
  'PM',
  'OK',
  'ID',
  'URL',
  'API',
  'JSON',
  'CSV',
  'PDF',
  'QR',
  'HTML',
  'CSS',
]);

// ----- File walking -----
function walk(dir, files = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return files;
  }
  for (const entry of entries) {
    if (SKIP_DIR_SEGMENTS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, files);
    } else if (entry.isFile() && entry.name.endsWith('.tsx')) {
      if (SKIP_FILE_SUFFIXES.some((s) => entry.name.endsWith(s))) continue;
      files.push(full);
    }
  }
  return files;
}

// ----- Helpers -----
function relPath(absPath) {
  return path.relative(ROOT, absPath).split(path.sep).join('/');
}

function looksLikeIdentifierOrTechnical(text) {
  const trimmed = text.trim();
  if (!trimmed) return true;
  if (trimmed.length < 3) return true;
  if (SAFE_TEXT_VALUES.has(trimmed)) return true;
  // Pure numbers / numeric format hints
  if (/^[\d.,:%$\-+\s/]+$/.test(trimmed)) return true;
  // URL / path
  if (/[\\/]/.test(trimmed) || /:\/\//.test(trimmed)) return true;
  // Hex color
  if (/^#[0-9a-fA-F]+$/.test(trimmed)) return true;
  // CamelCase / SCREAMING_SNAKE / kebab-case identifier (no spaces, no punctuation typical of prose)
  if (!/\s/.test(trimmed) && !/[.?!,:'"-]/.test(trimmed)) {
    // Single token with mixed case but no space — treat as identifier.
    if (/^[A-Z][a-z]+[A-Z]/.test(trimmed)) return true; // CamelCase
    if (/^[A-Z_]+$/.test(trimmed)) return true; // ALL_CAPS / SCREAMING
    if (/-/.test(trimmed)) return true; // kebab
  }
  // Email-like
  if (/@/.test(trimmed) && /\./.test(trimmed)) return true;
  // Must contain at least one English letter and a vowel-ish pattern
  if (!/[A-Za-z]/.test(trimmed)) return true;
  return false;
}

function isSafeAttrValue(value) {
  const trimmed = value.trim();
  if (!trimmed) return true;
  if (SAFE_ATTR_VALUES.has(trimmed)) return true;
  // Numeric format hints
  if (/^[\d.,$+\-\s%]+$/.test(trimmed)) return true;
  // Starts with digit or dot — likely numeric placeholder
  if (/^[\d.]/.test(trimmed)) return true;
  // URL / path
  if (/https?:/.test(trimmed) || trimmed.includes('://')) return true;
  // Hex color
  if (/^#[0-9a-fA-F]{3,8}$/.test(trimmed)) return true;
  // Email example
  if (/^[A-Za-z0-9._-]+@/.test(trimmed)) return true;
  // Slug example (contains hyphen, no spaces, all lowercase)
  if (/^[a-z][a-z0-9-]*$/.test(trimmed) && trimmed.includes('-')) return true;
  // Single short token (< 3 chars)
  if (trimmed.length < 3) return true;
  // Doesn't contain at least one English letter
  if (!/[A-Za-z]/.test(trimmed)) return true;
  // Has uppercase start AND english-text pattern? — let it through (likely real text)
  return false;
}

// Pre-context guard: was the JSX text already wrapped in {t(...)}?
function isPrecededByTCall(line, matchIndexInLine) {
  // Look at last ~40 chars before matchIndex for `{t(` or `{tFunction(`
  const window = line.slice(Math.max(0, matchIndexInLine - 40), matchIndexInLine);
  return /\{\s*t\s*\(\s*$/.test(window) || /\{\s*t\(/.test(window);
}

// ----- Scanners -----
function scanFile(absPath) {
  const violations = [];
  const text = fs.readFileSync(absPath, 'utf8');
  const lines = text.split(/\r?\n/);
  const rel = relPath(absPath);

  // Track block comments crudely so we don't flag strings inside /* ... */.
  let inBlockComment = false;

  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1;
    const rawLine = lines[i];

    // Strip block comments spanning the line.
    let line = rawLine;
    if (inBlockComment) {
      const end = line.indexOf('*/');
      if (end === -1) continue;
      line = line.slice(end + 2);
      inBlockComment = false;
    }
    while (line.includes('/*')) {
      const start = line.indexOf('/*');
      const end = line.indexOf('*/', start + 2);
      if (end === -1) {
        line = line.slice(0, start);
        inBlockComment = true;
        break;
      }
      line = line.slice(0, start) + line.slice(end + 2);
    }
    // Strip line comments (but be careful of `//` inside strings/URLs — best effort)
    const lineCommentIdx = line.indexOf('//');
    if (lineCommentIdx !== -1) {
      // Heuristic: only strip if not preceded by `:` (URL) and not inside a string.
      const before = line.slice(0, lineCommentIdx);
      const dq = (before.match(/"/g) || []).length;
      const sq = (before.match(/'/g) || []).length;
      const bt = (before.match(/`/g) || []).length;
      if (dq % 2 === 0 && sq % 2 === 0 && bt % 2 === 0 && !/[:]$/.test(before.trimEnd())) {
        line = before;
      }
    }

    // 1) JSX text children: > Text <
    //    Match `>` then text (no `<`, no `{` at start) then `<`.
    const jsxRegex = />\s*([A-Z][A-Za-z0-9 ,.'?!:&\-]{2,}?)\s*</g;
    let m;
    while ((m = jsxRegex.exec(line)) !== null) {
      const captured = m[1];
      const matchStart = m.index;
      // Skip if the leading `>` is actually part of `=>` (arrow function / type).
      if (matchStart > 0 && line[matchStart - 1] === '=') continue;
      // Skip if the segment looks like part of a tag (e.g., `</Foo>` or `<Foo>`).
      // The capturing group lives between two tag boundaries; the char right after `>`
      // shouldn't be `=` and the captured text shouldn't contain `=` or `/`.
      if (captured.includes('=') || captured.includes('/')) continue;
      if (looksLikeIdentifierOrTechnical(captured)) continue;
      if (isPrecededByTCall(line, matchStart)) continue;
      // Heuristic: if the text doesn't contain a space AND isn't followed by lowercase letters,
      // it's likely a component name reference, e.g., `<Foo>Bar</Foo>` where Bar = "Settings"
      // can still be UI text. So we do flag single-word capitalized text like "Settings".
      // But require length >= 3.
      if (captured.trim().length < 3) continue;
      // Skip if line looks like an import or type declaration.
      if (/^\s*(import|export|type|interface)\b/.test(rawLine)) continue;
      // Skip TS generics like `Promise<void>` or `Array<Foo>` — these look like
      // `>X<` but the `<` is opening a generic, not closing a tag. Heuristic: if
      // the next char after the match's `<` is uppercase letter, it's likely a type.
      const closingLtIdx = matchStart + m[0].length - 1;
      const nextChar = line[closingLtIdx + 1];
      if (nextChar && /[A-Z]/.test(nextChar)) continue;
      // Skip if the line contains an arrow function or type annotation context
      // and no obvious JSX tag opener earlier on the line.
      if (/=>/.test(line.slice(0, matchStart)) && !/<[a-z]/.test(line.slice(0, matchStart))) {
        // arrow-fn type signature on same line
        continue;
      }

      const col = matchStart + m[0].indexOf(captured) + 1;
      violations.push({
        file: rel,
        line: lineNum,
        col,
        kind: 'jsx-text',
        snippet: `"${captured.trim()}"`,
      });
    }

    // 2) Attribute strings: aria-label="..." | placeholder="..." | title="..." | description="..." | alt="..."
    const attrRegex = /\b(aria-label|placeholder|title|description|alt)\s*=\s*"([^"]*)"/g;
    while ((m = attrRegex.exec(line)) !== null) {
      const attr = m[1];
      const value = m[2];
      if (!value) continue;
      if (isSafeAttrValue(value)) continue;
      // Must start with uppercase letter and contain an alpha char to be likely English UI.
      if (!/^[A-Z]/.test(value.trim())) continue;
      if (!/[a-zA-Z]/.test(value)) continue;
      // Skip if value is a single short token without any spaces and < 4 chars.
      if (!value.includes(' ') && value.length < 4) continue;

      const col = m.index + 1;
      violations.push({
        file: rel,
        line: lineNum,
        col,
        kind: 'attribute',
        snippet: `${attr}="${value}"`,
      });
    }

    // 3) Toast calls: toast('success', 'message') — variants of toast(...)
    //    Allow whitespace/newline tolerance only on a single line (best effort).
    const toastRegex = /\btoast\s*\(\s*['"](?:success|error|info|warning)['"]\s*,\s*['"]([^'"]+)['"]/g;
    while ((m = toastRegex.exec(line)) !== null) {
      const msg = m[1];
      if (!msg || !/[A-Za-z]/.test(msg)) continue;
      // Allow if message is a t() call — but the regex captures only string literals, so
      // any captured value here is hardcoded by definition.
      // Skip very short tokens.
      if (msg.trim().length < 2) continue;
      const col = m.index + 1;
      violations.push({
        file: rel,
        line: lineNum,
        col,
        kind: 'toast',
        snippet: `toast(..., "${msg}")`,
      });
    }

    // 4) setError('...') / throw new Error('...') with English message.
    const setErrorRegex = /\bsetError\s*\(\s*['"]([A-Z][^'"]*)['"]/g;
    while ((m = setErrorRegex.exec(line)) !== null) {
      const msg = m[1];
      if (!msg || !/[A-Za-z]/.test(msg)) continue;
      if (msg.trim().length < 3) continue;
      const col = m.index + 1;
      violations.push({
        file: rel,
        line: lineNum,
        col,
        kind: 'set-error',
        snippet: `setError("${msg}")`,
      });
    }
    const throwErrRegex = /\bthrow\s+new\s+Error\s*\(\s*['"]([A-Z][^'"]*)['"]/g;
    while ((m = throwErrRegex.exec(line)) !== null) {
      const msg = m[1];
      if (!msg || !/[A-Za-z]/.test(msg)) continue;
      if (msg.trim().length < 3) continue;
      const col = m.index + 1;
      violations.push({
        file: rel,
        line: lineNum,
        col,
        kind: 'throw-error',
        snippet: `throw new Error("${msg}")`,
      });
    }
  }

  return violations;
}

// ----- Run -----
function main() {
  if (!fs.existsSync(SRC_DIR)) {
    process.stderr.write(`i18n-audit: source dir not found: ${SRC_DIR}\n`);
    process.exit(2);
  }
  const files = walk(SRC_DIR);
  const allViolations = [];
  for (const f of files) {
    const v = scanFile(f);
    if (v.length) allViolations.push(...v);
  }

  if (fixReport) {
    // Group by file
    const byFile = new Map();
    for (const v of allViolations) {
      if (!byFile.has(v.file)) byFile.set(v.file, []);
      byFile.get(v.file).push(v);
    }
    const sorted = [...byFile.entries()].sort((a, b) => b[1].length - a[1].length);
    for (const [file, vs] of sorted) {
      process.stdout.write(`\n${file} (${vs.length})\n`);
      for (const v of vs) {
        process.stdout.write(`  L${v.line}:${v.col}  ${v.kind.padEnd(12)}  ${v.snippet}\n`);
      }
    }
    process.stdout.write(`\n--- ${allViolations.length} violations across ${byFile.size} files ---\n`);
  } else {
    for (const v of allViolations) {
      process.stdout.write(`${v.file}:${v.line}:${v.col} — ${v.kind} — ${v.snippet}\n`);
    }
  }

  process.exit(allViolations.length > 0 ? 1 : 0);
}

main();
