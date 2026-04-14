#!/usr/bin/env node
/**
 * i18n-audit.js — static scanner for hardcoded English user-visible strings.
 *
 * Catches common i18n regressions that should be wrapped in t('...') from
 * @web/lib/i18n (or translated at render time for constants).
 *
 * Scans:
 *   - packages/web/src/**\/*.tsx      JSX render-site violations (jsx-text, attrs,
 *                                     toast, setError, throw-error)
 *   - packages/web/src/**\/*.ts       Data/constant-module violations
 *                                     (data-object-property, data-string-array,
 *                                     throw-error-ts, toast, set-error)
 *   - packages/shared/src/**\/*.ts    Shared constant labels/descriptions
 *
 * Usage:
 *   node scripts/i18n-audit.js                 plain output (file:line:col — kind — snippet)
 *   node scripts/i18n-audit.js --fix-report    grouped by file
 *   node scripts/i18n-audit.js --help          this message
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
      'i18n-audit.js — scan for hardcoded English strings',
      '',
      'Usage:',
      '  node scripts/i18n-audit.js                 plain output',
      '  node scripts/i18n-audit.js --fix-report    grouped by file',
      '  node scripts/i18n-audit.js --help          show this',
      '',
      'Scans: packages/web/src (.ts + .tsx), packages/shared/src (.ts).',
      'Exit codes: 0 = clean, 1 = violations found.',
      '',
    ].join('\n'),
  );
  process.exit(0);
}
const fixReport = args.includes('--fix-report');

const ROOT = path.resolve(__dirname, '..');
const SCAN_TARGETS = [
  { dir: path.join(ROOT, 'packages', 'web', 'src'), exts: ['.tsx', '.ts'] },
  { dir: path.join(ROOT, 'packages', 'shared', 'src'), exts: ['.ts'] },
];

// ----- Skip rules -----
const SKIP_DIR_SEGMENTS = new Set(['__tests__', 'node_modules', 'locales']);
const SKIP_FILE_SUFFIXES = ['.test.tsx', '.spec.tsx', '.test.ts', '.spec.ts', '.d.ts'];

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

// Internal/dev error messages we allow in throw new Error('...') — not user-visible.
const SAFE_THROW_MESSAGES = new Set([
  'Unreachable',
  'unreachable',
  'Not implemented',
  'not implemented',
  'TODO',
]);

// Property names whose values we expect to be user-visible (for data-object-property).
const UI_PROPERTY_NAMES = new Set([
  'name',
  'label',
  'title',
  'description',
  'message',
  'helpText',
  'hint',
  'placeholder',
  'subtitle',
  'heading',
  'tooltip',
  'error',
  'prompt',
  'caption',
  'summary',
]);

// ----- File walking -----
function walk(dir, exts, files = []) {
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
      walk(full, exts, files);
    } else if (entry.isFile()) {
      const name = entry.name;
      if (SKIP_FILE_SUFFIXES.some((s) => name.endsWith(s))) continue;
      if (!exts.some((e) => name.endsWith(e))) continue;
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

// ----- Heuristics for data module strings -----

// Returns true if a string value looks like real English UI text (multi-word,
// starts uppercase, has spaces, or has multiple capital-letter words).
function looksLikeEnglishUIText(value) {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (trimmed.length < 3) return false;
  if (SAFE_TEXT_VALUES.has(trimmed)) return false;
  // Skip obviously non-prose values
  if (/^[\d.,:%$\-+\s/]+$/.test(trimmed)) return false;
  if (/[\\/]/.test(trimmed)) return false;
  if (/:\/\//.test(trimmed)) return false;
  if (/^#[0-9a-fA-F]+$/.test(trimmed)) return false;
  if (/@/.test(trimmed) && /\./.test(trimmed)) return false;
  // CSS / format tokens
  if (/^[a-z0-9.]+(rem|px|em|%|pt|vh|vw)$/.test(trimmed)) return false;
  // Kebab-case or snake_case identifiers (enum-like)
  if (/^[a-z][a-z0-9_-]*$/.test(trimmed)) return false;
  // SCREAMING_SNAKE
  if (/^[A-Z][A-Z0-9_]+$/.test(trimmed)) return false;
  // Must contain at least one letter
  if (!/[A-Za-z]/.test(trimmed)) return false;
  // Must start with uppercase for "UI text" (component-display-style).
  if (!/^[A-Z]/.test(trimmed)) return false;
  // Require either a space OR multi-word CamelCase with >= 2 capital letters.
  const hasSpace = /\s/.test(trimmed);
  const capCount = (trimmed.match(/[A-Z]/g) || []).length;
  if (!hasSpace && capCount < 2) return false;
  return true;
}

// ----- Scanners -----
function scanFile(absPath) {
  const violations = [];
  const text = fs.readFileSync(absPath, 'utf8');
  const lines = text.split(/\r?\n/);
  const rel = relPath(absPath);
  const isTsx = absPath.endsWith('.tsx');

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

    if (isTsx) {
      // -------- JSX-only detectors (unchanged) --------

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
    }

    // -------- Detectors that run on BOTH .ts and .tsx --------

    // 3) Toast calls: toast('success', 'message') — variants of toast(...)
    {
      const toastRegex = /\btoast\s*\(\s*['"](?:success|error|info|warning)['"]\s*,\s*['"]([^'"]+)['"]/g;
      let m;
      while ((m = toastRegex.exec(line)) !== null) {
        const msg = m[1];
        if (!msg || !/[A-Za-z]/.test(msg)) continue;
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
    }

    // 4) setError('...') with English message.
    {
      const setErrorRegex = /\bsetError\s*\(\s*['"]([A-Z][^'"]*)['"]/g;
      let m;
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
    }

    // 5) throw new Error('...') — kind differs by file type.
    {
      const throwErrRegex = /\bthrow\s+new\s+Error\s*\(\s*['"]([A-Z][^'"]*)['"]/g;
      let m;
      while ((m = throwErrRegex.exec(line)) !== null) {
        const msg = m[1];
        if (!msg || !/[A-Za-z]/.test(msg)) continue;
        if (msg.trim().length < 3) continue;
        if (SAFE_THROW_MESSAGES.has(msg.trim())) continue;
        // Only flag messages that look like user-facing prose:
        // start with capital AND contain a space.
        if (!msg.includes(' ')) continue;
        const col = m.index + 1;
        violations.push({
          file: rel,
          line: lineNum,
          col,
          kind: isTsx ? 'throw-error' : 'throw-error-ts',
          snippet: `throw new Error("${msg}")`,
        });
      }
    }

    // -------- .ts-only data-module detectors --------
    if (!isTsx) {
      // 6) data-object-property — object-literal property with UI-prop name
      //    mapped to an English string literal.
      //    Matches: `name: 'Foo Bar'`, `description: "Warm and traditional"`.
      //    Also catches properties inside object-literal initializers.
      const propRegex = /\b(name|label|title|description|message|helpText|hint|placeholder|subtitle|heading|tooltip|error|prompt|caption|summary)\s*:\s*(['"])([^'"\n]+)\2/g;
      let m;
      while ((m = propRegex.exec(line)) !== null) {
        const propName = m[1];
        const value = m[3];
        if (!UI_PROPERTY_NAMES.has(propName)) continue;
        if (!looksLikeEnglishUIText(value)) continue;
        // Skip likely type annotations `name: string` (wouldn't match since no quotes)
        // Skip `error: 'ENUM_CODE'` — looksLikeEnglishUIText filters these.
        // Skip lines that are clearly type/interface declarations.
        if (/^\s*(export\s+)?(interface|type)\b/.test(rawLine)) continue;
        // Skip if preceded by `:` suggesting TS type position — crude: if there's
        // a `:` after the property name before the string, we captured an object prop.
        // If line has `?:` (optional type), it's a type decl — skip.
        if (/\?\s*:/.test(rawLine.slice(0, m.index + propName.length + 2))) continue;

        const col = m.index + 1;
        violations.push({
          file: rel,
          line: lineNum,
          col,
          kind: 'data-object-property',
          snippet: `${propName}: "${value}"`,
        });
      }

      // 7) data-string-array — arrays of English multi-word strings on a single line.
      //    Matches lines like: `['Vegetarian Plate', 'Gluten Free', 'Dairy Free']`.
      //    Heuristic: at least 2 items, all items English UI text.
      //    Anchored by `[` ... `]` on the same line.
      const arrayRegex = /\[\s*((?:['"][^'"\n]+['"]\s*,\s*){1,}['"][^'"\n]+['"])\s*\]/g;
      while ((m = arrayRegex.exec(line)) !== null) {
        const body = m[1];
        // Extract string literals
        const itemRegex = /['"]([^'"]+)['"]/g;
        const items = [];
        let im;
        while ((im = itemRegex.exec(body)) !== null) {
          items.push(im[1]);
        }
        if (items.length < 2) continue;
        // Only flag if ALL items look like English UI text (multi-word or spaced).
        const allEnglish = items.every((it) => {
          const t = it.trim();
          // Require a space — single-word items (even PascalCase) are likely enums.
          if (!/\s/.test(t)) return false;
          return looksLikeEnglishUIText(t);
        });
        if (!allEnglish) continue;
        // Skip type/interface/import lines
        if (/^\s*(import|export\s+(type|interface))\b/.test(rawLine)) continue;
        const col = m.index + 1;
        violations.push({
          file: rel,
          line: lineNum,
          col,
          kind: 'data-string-array',
          snippet: `[${items.map((s) => `"${s}"`).join(', ')}]`,
        });
      }
    }
  }

  return violations;
}

// ----- Run -----
function main() {
  const allFiles = [];
  for (const target of SCAN_TARGETS) {
    if (!fs.existsSync(target.dir)) continue;
    walk(target.dir, target.exts, allFiles);
  }
  if (allFiles.length === 0) {
    process.stderr.write('i18n-audit: no source files found\n');
    process.exit(2);
  }
  const allViolations = [];
  for (const f of allFiles) {
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
        process.stdout.write(`  L${v.line}:${v.col}  ${v.kind.padEnd(22)}  ${v.snippet}\n`);
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
