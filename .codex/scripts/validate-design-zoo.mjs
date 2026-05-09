#!/usr/bin/env node
import { chromium } from 'playwright';

const baseUrl = (process.env.NEXUS_WEB_URL || 'http://localhost:5173').replace(/\/$/, '');

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

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    await page.goto(`${baseUrl}/design`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.getByText('Nexus Design System').waitFor({ state: 'visible', timeout: 5000 });
    await page.getByRole('link', { name: 'Toast', exact: true }).waitFor({ state: 'visible', timeout: 5000 });

    await page.goto(`${baseUrl}/design/toast`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.getByText('Stock is low on Sichuan peppercorns.').waitFor({ state: 'visible', timeout: 5000 });
    await page.getByText('Kitchen display connected.').waitFor({ state: 'visible', timeout: 5000 });
    await page.getByRole('button', { name: '+ Warning' }).click();
    await page.getByText('Ingredient threshold reached.').waitFor({ state: 'visible', timeout: 5000 });
    await page.getByRole('button', { name: 'Switch to dark mode' }).click();
    await page.locator('select').selectOption('sichuan');
    await page.getByText('Ingredient threshold reached.').waitFor({ state: 'visible', timeout: 5000 });

    const bodyTheme = await page.evaluate(() => document.body.dataset.theme || '');
    const zooThemeScopeCount = await page.locator('[data-themed-scope="design-zoo"][data-theme="sichuan"]').count();
    if (bodyTheme !== 'sichuan') throw new Error(`Expected body[data-theme="sichuan"] for portal inheritance, got ${bodyTheme || '(missing)'}.`);
    if (!zooThemeScopeCount) throw new Error('Expected the Zoo showcase wrapper to carry data-theme="sichuan".');
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

    const result = {
      baseUrl,
      toastUrl: page.url(),
      activeCount: await page.getByText(/Active toasts:/).textContent(),
      htmlDark: await page.locator('html.dark').count(),
      selectedTheme: await page.locator('select').inputValue(),
      bodyTheme,
      zooThemeScopeCount,
      mainHeadingContrast: Number(mainHeadingContrast.toFixed(2)),
      warningVisible: await page.getByText('Ingredient threshold reached.').isVisible(),
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
