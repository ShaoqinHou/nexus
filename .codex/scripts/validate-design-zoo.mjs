#!/usr/bin/env node
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
const WEB_URL_ENV = requiredProfileString(WORKFLOW, 'env.webUrl');
const baseUrl = (process.env[WEB_URL_ENV] || requiredPolicyString(WORKFLOW, 'design', 'localWebUrl')).replace(/\/$/, '');
const DESIGN_ROUTE_VALUE = requiredPolicyString(WORKFLOW, 'design', 'designRoute');
const DESIGN_ROUTE = DESIGN_ROUTE_VALUE.startsWith('/')
  ? DESIGN_ROUTE_VALUE
  : `/${DESIGN_ROUTE_VALUE.replace(/^\/+/, '')}`;
const CAPTURE_POLICY = requiredPolicyObject(WORKFLOW, 'design', 'zooVisualCapture');
const DEFAULT_THEME = requiredPolicyString(WORKFLOW, 'design', 'zooVisualCapture.defaultTheme');
const SHOWCASES = CAPTURE_POLICY.interactiveShowcases || {};

function required(value, label) {
  if (!value || typeof value !== 'string') throw new Error(`Design Zoo validation policy is missing ${label}.`);
  return value;
}

function showcase(slug) {
  const config = SHOWCASES[slug] || {};
  return {
    slug,
    route: `${required(DESIGN_ROUTE, 'designRoute')}/${slug}`,
    buttonName: required(config.buttonName, `interactiveShowcases.${slug}.buttonName`),
    expectedText: required(config.expectedText, `interactiveShowcases.${slug}.expectedText`),
    portalSelector: config.expectedPortalSelector || (config.expectedRole ? `[role="${config.expectedRole}"]` : ''),
  };
}

function pageUrl(route) {
  return `${baseUrl}${route}`;
}

function parseRgb(value) {
  const match = String(value || '').match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (!match) return null;
  return match.slice(1, 4).map(Number);
}

function relativeLuminance([r, g, b]) {
  const channel = (value) => {
    const srgb = value / 255;
    return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrastRatio(foreground, background) {
  const fg = parseRgb(foreground);
  const bg = parseRgb(background);
  if (!fg || !bg) return 0;
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

async function themedPortalState(page, selector) {
  await page.locator(selector).first().waitFor({ state: 'visible', timeout: 5000 });
  return page.locator(selector).first().evaluate((element) => {
    const styles = getComputedStyle(element);
    const bodyStyles = getComputedStyle(document.body);
    const fg = styles.color || bodyStyles.color;
    const bg = styles.backgroundColor === 'rgba(0, 0, 0, 0)' ? bodyStyles.backgroundColor : styles.backgroundColor;
    return {
      visible: Boolean(element.offsetParent || element.getClientRects().length),
      color: fg,
      background: bg,
      htmlDark: document.documentElement.classList.contains('dark'),
      bodyTheme: document.body.dataset.theme || '',
    };
  }).then((state) => ({
    ...state,
    contrast: Number(contrastRatio(state.color, state.background).toFixed(2)),
  }));
}

async function ensureDarkTheme(page) {
  const theme = required(DEFAULT_THEME, 'zooVisualCapture.defaultTheme');
  await page.locator('select').selectOption(theme);
  const dark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
  if (!dark) await page.getByRole('button', { name: /switch to dark mode/i }).click();
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    const toast = showcase('toast');
    const dialog = showcase('dialog');
    const tour = showcase('tour-overlay');
    const defaultTheme = required(DEFAULT_THEME, 'zooVisualCapture.defaultTheme');

    await page.goto(pageUrl(DESIGN_ROUTE), { waitUntil: 'networkidle', timeout: 15000 });
    await page.getByText(required(CAPTURE_POLICY.waitForText, 'zooVisualCapture.waitForText')).first().waitFor({ state: 'visible', timeout: 5000 });
    await page.locator(`a[href="${toast.route}"]`).waitFor({ state: 'visible', timeout: 5000 });

    await page.goto(pageUrl(toast.route), { waitUntil: 'networkidle', timeout: 15000 });
    await page.getByRole('button', { name: toast.buttonName }).click();
    await page.getByText(toast.expectedText).waitFor({ state: 'visible', timeout: 5000 });
    await page.locator(required(toast.portalSelector, 'interactiveShowcases.toast.expectedPortalSelector')).filter({ hasText: toast.expectedText }).waitFor({ state: 'visible', timeout: 5000 });
    await page.getByRole('button', { name: /dark mode/i }).click();
    await page.locator('select').selectOption(defaultTheme);
    await page.getByText(toast.expectedText).waitFor({ state: 'visible', timeout: 5000 });

    const bodyTheme = await page.evaluate(() => document.body.dataset.theme || '');
    const zooThemeScopeCount = await page.locator(`[data-themed-scope="design-zoo"][data-theme="${defaultTheme}"]`).count();
    if (bodyTheme !== defaultTheme) throw new Error(`Expected body[data-theme="${defaultTheme}"] for portal inheritance, got ${bodyTheme || '(missing)'}.`);
    if (!zooThemeScopeCount) throw new Error(`Expected the Zoo showcase wrapper to carry data-theme="${defaultTheme}".`);
    const chromeContrast = await page.locator('main h2').first().evaluate((element) => {
      const styles = getComputedStyle(element);
      const parent = element.closest('[data-themed-scope="design-zoo"]') || document.body;
      return {
        color: styles.color,
        background: getComputedStyle(parent).backgroundColor,
      };
    });
    const mainHeadingContrast = contrastRatio(chromeContrast.color, chromeContrast.background);
    if (mainHeadingContrast < 4.5) {
      throw new Error(`Expected readable dark Zoo chrome contrast >= 4.5, got ${mainHeadingContrast.toFixed(2)} for ${chromeContrast.color} on ${chromeContrast.background}.`);
    }
    const toastResult = {
      toastUrl: page.url(),
      activeCount: await page.getByText(/Active toasts:/).textContent(),
      htmlDark: await page.locator('html.dark').count(),
      selectedTheme: await page.locator('select').inputValue(),
      bodyTheme,
      zooThemeScopeCount,
      mainHeadingContrast: Number(mainHeadingContrast.toFixed(2)),
      warningVisible: await page.getByText(toast.expectedText).isVisible(),
    };

    await page.goto(pageUrl(dialog.route), { waitUntil: 'networkidle', timeout: 15000 });
    await ensureDarkTheme(page);
    await page.getByRole('button', { name: dialog.buttonName }).click();
    await page.getByText(dialog.expectedText).waitFor({ state: 'visible', timeout: 5000 });
    const dialogState = await themedPortalState(page, required(dialog.portalSelector, 'interactiveShowcases.dialog.expectedRole or expectedPortalSelector'));
    if (!dialogState.visible || dialogState.bodyTheme !== defaultTheme || !dialogState.htmlDark || dialogState.contrast < 4.5) {
      throw new Error(`Dialog portal did not inherit dark ${defaultTheme} theme: ${JSON.stringify(dialogState)}`);
    }

    await page.goto(pageUrl(tour.route), { waitUntil: 'networkidle', timeout: 15000 });
    await ensureDarkTheme(page);
    await page.getByRole('button', { name: tour.buttonName }).click();
    await page.getByText(tour.expectedText).waitFor({ state: 'visible', timeout: 5000 });
    const tourState = await themedPortalState(page, required(tour.portalSelector, 'interactiveShowcases.tour-overlay.expectedPortalSelector'));
    if (!tourState.visible || tourState.bodyTheme !== defaultTheme || !tourState.htmlDark || tourState.contrast < 4.5) {
      throw new Error(`TourOverlay portal did not inherit dark ${defaultTheme} theme: ${JSON.stringify(tourState)}`);
    }

    const result = {
      baseUrl,
      ...toastResult,
      dialogPortalContrast: dialogState.contrast,
      tourPortalContrast: tourState.contrast,
    };
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error('Design zoo validation failed.');
  console.error(`Expected a running web dev server at ${baseUrl}.`);
  console.error(error);
  process.exit(1);
});
