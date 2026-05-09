#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve, relative } from 'node:path';
import { chromium } from 'playwright';

const START = process.cwd();
const ROOT = findRoot(START);
const OUT_DIR = join(ROOT, '.codex', 'dashboard', 'zoo');
const ASSET_DIR = join(OUT_DIR, 'assets');
const MANIFEST = join(OUT_DIR, 'manifest.json');

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

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith('--')) continue;
    const key = arg.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) out[key] = true;
    else {
      out[key] = next;
      i++;
    }
  }
  return out;
}

function loadRegistry() {
  return JSON.parse(readFileSync(join(ROOT, 'packages', 'web', 'src', 'components', 'registry.json'), 'utf8'));
}

function slugFromRoute(route) {
  return String(route || '').replace(/^\/design\/?/, '') || 'index';
}

function captureTargets() {
  const registry = loadRegistry();
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
  const entries = [...(registry.primitives || []), ...(registry.patterns || [])].map((entry) => ({
    slug: slugFromRoute(entry.zooRoute),
    title: entry.name,
    kind: entry.kind || 'component',
    route: entry.zooRoute,
    path: entry.path,
    purpose: entry.purpose,
  }));
  const seen = new Set();
  return [...foundations, ...entries].filter((entry) => {
    if (!entry.slug || seen.has(entry.slug)) return false;
    seen.add(entry.slug);
    return true;
  });
}

function contextId(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'context';
}

function captureContexts(args) {
  const theme = String(args.theme || process.env.NEXUS_ZOO_CAPTURE_THEME || 'sichuan');
  if (args.single) {
    const mode = String(args.mode || process.env.NEXUS_ZOO_CAPTURE_MODE || 'light');
    const viewport = {
      width: Number(args.width || 1360),
      height: Number(args.height || 860),
    };
    return [{
      id: contextId(`${viewport.width}x${viewport.height}-${mode}-${theme}`),
      label: `${viewport.width}x${viewport.height} ${mode} ${theme}`,
      mode,
      theme,
      viewport,
    }];
  }
  return [
    {
      id: contextId(`desktop-light-${theme}`),
      label: `Desktop light ${theme}`,
      mode: 'light',
      theme,
      viewport: { width: Number(args.width || 1360), height: Number(args.height || 860) },
    },
    {
      id: contextId(`mobile-dark-${theme}`),
      label: `Mobile dark ${theme}`,
      mode: 'dark',
      theme,
      viewport: { width: Number(args.mobileWidth || 390), height: Number(args.mobileHeight || 844) },
    },
  ];
}

async function setChromeState(page, { mode, theme }) {
  const select = page.locator('select').first();
  if (theme && (await select.count())) {
    await select.selectOption(theme);
  } else if (theme) {
    throw new Error(`Zoo theme selector is missing; cannot capture requested theme ${theme}.`);
  }
  const isDark = async () => page.evaluate(() => document.documentElement.classList.contains('dark'));
  if (mode === 'dark') {
    if (!(await isDark())) {
      const button = page.getByRole('button', { name: /switch to dark mode/i });
      if (await button.count()) await button.click();
      else throw new Error('Zoo dark-mode toggle is missing; cannot capture requested dark mode.');
    }
  } else {
    if (await isDark()) {
      const button = page.getByRole('button', { name: /switch to light mode/i });
      if (await button.count()) await button.click();
      else throw new Error('Zoo light-mode toggle is missing; cannot capture requested light mode.');
    }
  }
  return verifyChromeState(page, { mode, theme });
}

async function verifyChromeState(page, { mode, theme }) {
  const actual = await page.evaluate(() => {
    const root = document.documentElement;
    const scope = document.querySelector('[data-themed-scope="design-zoo"]');
    const select = document.querySelector('select');
    return {
      htmlDark: root.classList.contains('dark'),
      bodyTheme: document.body.dataset.theme || '',
      scopeTheme: scope?.getAttribute('data-theme') || '',
      selectValue: select?.value || '',
    };
  });
  const problems = [];
  if (mode === 'dark' && !actual.htmlDark) problems.push('html.dark is not set');
  if (mode === 'light' && actual.htmlDark) problems.push('html.dark is still set');
  if (theme && actual.selectValue !== theme) problems.push(`selector value is ${actual.selectValue || '(empty)'}`);
  if (theme && actual.scopeTheme !== theme) problems.push(`design-zoo scope data-theme is ${actual.scopeTheme || '(empty)'}`);
  if (theme && actual.bodyTheme !== theme) problems.push(`body data-theme is ${actual.bodyTheme || '(empty)'}`);
  if (problems.length) {
    throw new Error(`Zoo chrome state did not match requested ${mode}/${theme}: ${problems.join('; ')}`);
  }
  return actual;
}

async function exerciseShowcase(page, slug) {
  if (slug === 'toast') {
    const button = page.getByRole('button', { name: '+ Warning' });
    if (await button.count()) await button.click();
  }
  if (slug === 'dialog') {
    const button = page.getByRole('button', { name: 'Open dialog' });
    if (await button.count()) await button.click();
  }
  if (slug === 'tour-overlay') {
    const button = page.getByRole('button', { name: 'Start tour' });
    if (await button.count()) await button.click();
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const baseUrl = String(args.url || process.env.NEXUS_WEB_URL || 'http://localhost:5173').replace(/\/$/, '');
  const contexts = captureContexts(args);

  ensureDir(ASSET_DIR);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: contexts[0].viewport });
  const targets = captureTargets();
  const captured = [];

  try {
    for (const context of contexts) {
      await page.setViewportSize(context.viewport);
      const contextDir = join(ASSET_DIR, context.id);
      ensureDir(contextDir);
      for (const target of targets) {
        const url = `${baseUrl}${target.route || `/design/${target.slug}`}`;
        await page.goto(url, { waitUntil: 'networkidle', timeout: 20000 });
        await page.getByText('Zoo', { exact: false }).first().waitFor({ state: 'visible', timeout: 10000 });
        const verifiedChromeState = await setChromeState(page, context);
        await exerciseShowcase(page, target.slug);
        await page.waitForTimeout(350);

        const file = join(contextDir, `${target.slug}.jpg`);
        await page.screenshot({ path: file, type: 'jpeg', quality: 82, fullPage: true });
        const hash = createHash('sha256').update(readFileSync(file)).digest('hex');
        captured.push({
          ...target,
          contextId: context.id,
          contextLabel: context.label,
          mode: context.mode,
          theme: context.theme,
          verifiedMode: verifiedChromeState.htmlDark ? 'dark' : 'light',
          verifiedTheme: verifiedChromeState.scopeTheme,
          verifiedChromeState,
          viewport: context.viewport,
          fullPage: true,
          sourceUrl: url,
          asset: relative(ROOT, file).replaceAll('\\', '/'),
          sha256: hash,
        });
        console.log(`captured ${context.id}/${target.slug} -> ${relative(ROOT, file).replaceAll('\\', '/')}`);
      }
    }
  } finally {
    await browser.close();
  }

  writeFileSync(MANIFEST, `${JSON.stringify({
    schema: 'nexus-design-zoo-visual-manifest/v1',
    capturedAt: new Date().toISOString(),
    baseUrl,
    contexts,
    targets: captured,
  }, null, 2)}\n`);
  console.log(`manifest: ${relative(ROOT, MANIFEST).replaceAll('\\', '/')}`);
}

main().catch((error) => {
  console.error('Design Zoo visual capture failed.');
  console.error('Start the web dev server first with: npm run dev:web');
  console.error(error);
  process.exit(1);
});
