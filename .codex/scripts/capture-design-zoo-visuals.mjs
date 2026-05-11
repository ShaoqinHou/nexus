#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { chromium } from 'playwright';
import {
  findWorkflowRoot,
  loadCodexWorkflow,
  requiredPolicyObject,
  requiredPolicyString,
  requiredProfileString,
} from './workflow-engine.mjs';

const ROOT = findWorkflowRoot(process.cwd());
const WORKFLOW = loadCodexWorkflow(ROOT);
const DESIGN_POLICY = WORKFLOW.policy.design || {};
const WEB_URL_ENV = requiredProfileString(WORKFLOW, 'env.webUrl');
const ZOO_CAPTURE_THEME_ENV = requiredProfileString(WORKFLOW, 'env.zooCaptureTheme');
const ZOO_CAPTURE_MODE_ENV = requiredProfileString(WORKFLOW, 'env.zooCaptureMode');
const OUT_DIR = join(ROOT, requiredProfileString(WORKFLOW, 'paths.zooGuideDir'));
const ASSET_DIR = join(OUT_DIR, 'assets');
const TEMP_DIR = join(ROOT, requiredProfileString(WORKFLOW, 'paths.runtime'), 'zoo-capture-tmp');
const MANIFEST = join(ROOT, requiredProfileString(WORKFLOW, 'paths.zooGuideManifest'));
const DESIGN_ROUTE_VALUE = requiredPolicyString(WORKFLOW, 'design', 'designRoute');
const DESIGN_ROUTE = DESIGN_ROUTE_VALUE.startsWith('/') ? DESIGN_ROUTE_VALUE : `/${DESIGN_ROUTE_VALUE.replace(/^\/+/, '')}`;
const VISUAL_MANIFEST_SCHEMA = requiredPolicyString(WORKFLOW, 'design', 'zooVisualManifestSchema');
const CAPTURE_POLICY = requiredPolicyObject(WORKFLOW, 'design', 'zooVisualCapture');
const REGISTRY_PATH = requiredPolicyString(WORKFLOW, 'design', 'registryPath');

function ensureDir(path) {
  mkdirSync(path, { recursive: true });
}

function isRetriableFsError(error) {
  return ['EBUSY', 'EPERM', 'EACCES', 'UNKNOWN'].includes(error?.code);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function writeFileWithRetry(file, buffer) {
  let lastError;
  for (let attempt = 0; attempt < 6; attempt++) {
    const safeName = relative(ROOT, file).replace(/[^a-zA-Z0-9._-]+/g, '-');
    const tmp = join(TEMP_DIR, `${safeName}.${process.pid}.${attempt}.tmp`);
    try {
      ensureDir(TEMP_DIR);
      writeFileSync(tmp, buffer);
      rmSync(file, { force: true });
      renameSync(tmp, file);
      return;
    } catch (error) {
      lastError = error;
      try {
        rmSync(tmp, { force: true });
      } catch {
        // Best effort cleanup only.
      }
      if (!isRetriableFsError(error) || attempt === 5) break;
      await sleep(100 * (attempt + 1));
    }
  }
  throw lastError;
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
  return JSON.parse(readFileSync(join(ROOT, REGISTRY_PATH), 'utf8'));
}

function slugFromRoute(route) {
  const value = String(route || '');
  if (value === DESIGN_ROUTE || value === `${DESIGN_ROUTE}/`) return 'index';
  if (value.startsWith(`${DESIGN_ROUTE}/`)) return value.slice(DESIGN_ROUTE.length + 1) || 'index';
  return value.replace(/^\/+/, '') || 'index';
}

function captureTargets() {
  const registry = loadRegistry();
  const foundations = Array.isArray(CAPTURE_POLICY.foundations) ? CAPTURE_POLICY.foundations : [];
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

function applyTemplate(value, theme) {
  return String(value || '').replaceAll('{theme}', theme);
}

function contextId(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'context';
}

function captureContexts(args) {
  const theme = String(args.theme || process.env[ZOO_CAPTURE_THEME_ENV] || requiredPolicyString(WORKFLOW, 'design', 'zooVisualCapture.defaultTheme'));
  const configured = Array.isArray(CAPTURE_POLICY.contexts) && CAPTURE_POLICY.contexts.length
    ? CAPTURE_POLICY.contexts
    : (() => { throw new Error('Design workflow policy zooVisualCapture.contexts must be a non-empty array.'); })();
  if (args.single) {
    const source = configured[0] || {};
    const mode = String(args.mode || process.env[ZOO_CAPTURE_MODE_ENV] || applyTemplate(source.mode, theme));
    const viewport = {
      width: Number(args.width || source.viewport?.width),
      height: Number(args.height || source.viewport?.height),
    };
    if (!mode || !viewport.width || !viewport.height) {
      throw new Error('Single Zoo capture requires policy context mode and viewport defaults, or explicit --mode/--width/--height.');
    }
    return [{
      id: contextId(`${viewport.width}x${viewport.height}-${mode}-${theme}`),
      label: `${viewport.width}x${viewport.height} ${mode} ${theme}`,
      mode,
      theme,
      viewport,
    }];
  }
  return configured.map((context, index) => ({
    id: contextId(applyTemplate(context.id, theme)),
    label: applyTemplate(context.label, theme),
    mode: applyTemplate(context.mode, theme),
    theme: applyTemplate(context.theme, theme),
    viewport: {
      width: Number((index === 0 ? args.width : args.mobileWidth) || context.viewport?.width),
      height: Number((index === 0 ? args.height : args.mobileHeight) || context.viewport?.height),
    },
  })).map((context) => {
    if (!context.mode || !context.theme || !context.viewport.width || !context.viewport.height) {
      throw new Error(`Zoo capture context ${context.id} is missing mode, theme, or viewport policy.`);
    }
    return context;
  });
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
  const config = CAPTURE_POLICY.interactiveShowcases?.[slug];
  if (!config) return;
  if (config?.buttonName) {
    const button = page.getByRole('button', { name: config.buttonName });
    if (!(await button.count())) throw new Error(`Configured interactive showcase ${slug} is missing button "${config.buttonName}".`);
    await button.click();
  }
  if (config.expectedRole) {
    const locator = config.expectedName
      ? page.getByRole(config.expectedRole, { name: new RegExp(config.expectedName, 'i') })
      : page.getByRole(config.expectedRole);
    await locator.first().waitFor({ state: 'visible', timeout: 5000 });
  }
  const expectedTexts = [
    ...(Array.isArray(config.expectedTexts) ? config.expectedTexts : []),
    ...(config.expectedText ? [config.expectedText] : []),
  ];
  for (const text of expectedTexts) {
    await page.getByText(text, { exact: false }).first().waitFor({ state: 'visible', timeout: 5000 });
  }
  if (config.expectedPortalSelector) {
    await page.locator(config.expectedPortalSelector).first().waitFor({ state: 'visible', timeout: 5000 });
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const baseUrl = String(args.url || process.env[WEB_URL_ENV] || requiredPolicyString(WORKFLOW, 'design', 'localWebUrl')).replace(/\/$/, '');
  const contexts = captureContexts(args);

  ensureDir(ASSET_DIR);
  ensureDir(TEMP_DIR);

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
        const route = target.route || `${DESIGN_ROUTE}/${target.slug}`;
        const url = `${baseUrl}${route}`;
        await page.goto(url, { waitUntil: 'networkidle', timeout: 20000 });
        await page.getByText(requiredPolicyString(WORKFLOW, 'design', 'zooVisualCapture.waitForText'), { exact: false }).first().waitFor({ state: 'visible', timeout: 10000 });
        const verifiedChromeState = await setChromeState(page, context);
        await exerciseShowcase(page, target.slug);
        await page.waitForTimeout(350);

        const file = join(contextDir, `${target.slug}.jpg`);
        const screenshot = await page.screenshot({ type: 'jpeg', quality: 82, fullPage: true });
        await writeFileWithRetry(file, screenshot);
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
    schema: VISUAL_MANIFEST_SCHEMA,
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
