#!/usr/bin/env node
import { chromium } from 'playwright';

const baseUrl = (process.env.NEXUS_WEB_URL || 'http://127.0.0.1:5173').replace(/\/$/, '');

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

    const result = {
      baseUrl,
      toastUrl: page.url(),
      activeCount: await page.getByText(/Active toasts:/).textContent(),
      htmlDark: await page.locator('html.dark').count(),
      selectedTheme: await page.locator('select').inputValue(),
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
