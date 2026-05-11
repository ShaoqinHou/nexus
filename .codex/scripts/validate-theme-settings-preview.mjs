#!/usr/bin/env node
import { chromium } from 'playwright';
import {
  findWorkflowRoot,
  loadCodexWorkflow,
  requiredPolicyString,
  requiredProfileString,
} from './workflow-engine.mjs';

const ROOT = findWorkflowRoot(process.cwd());
const WORKFLOW = loadCodexWorkflow(ROOT);
const WEB_URL_ENV = requiredProfileString(WORKFLOW, 'env.webUrl');
const baseUrl = (process.env[WEB_URL_ENV] || requiredPolicyString(WORKFLOW, 'design', 'localWebUrl')).replace(/\/$/, '');
const TENANT_SLUG = 'demo';
const SETTINGS_PATH = `/t/${TENANT_SLUG}/ordering/settings`;
const ACCENT_OVERRIDE = '#d7a629';

function jsonResponse(body) {
  return {
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(body),
  };
}

async function setColorInput(page, label, value) {
  await page.getByLabel(label).evaluate((input, nextValue) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    if (!setter) throw new Error('HTMLInputElement value setter is unavailable.');
    setter.call(input, nextValue);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
}

async function readThemeState(page) {
  return page.locator('[data-themed-scope="merchant"]').first().evaluate((scope) => ({
    scopeTheme: scope.dataset.theme || '',
    scopeBrand: scope.style.getPropertyValue('--color-brand'),
    scopeAccent: scope.style.getPropertyValue('--color-accent'),
    bodyTheme: document.body.dataset.theme || '',
    bodyBrand: document.body.style.getPropertyValue('--color-brand'),
    bodyAccent: document.body.style.getPropertyValue('--color-accent'),
  }));
}

async function waitForThemeState(page, expected, label) {
  await page.waitForFunction(
    ({ expected: target }) => {
      const scope = document.querySelector('[data-themed-scope="merchant"]');
      if (!scope) return false;
      const state = {
        scopeTheme: scope.dataset.theme || '',
        scopeBrand: scope.style.getPropertyValue('--color-brand'),
        scopeAccent: scope.style.getPropertyValue('--color-accent'),
        bodyTheme: document.body.dataset.theme || '',
        bodyBrand: document.body.style.getPropertyValue('--color-brand'),
        bodyAccent: document.body.style.getPropertyValue('--color-accent'),
      };
      return Object.entries(target).every(([key, value]) => state[key] === value);
    },
    { expected },
    { timeout: 5000 },
  ).catch(async (error) => {
    const actual = await readThemeState(page).catch(() => ({}));
    throw new Error(`${label} theme state mismatch. Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}. ${error.message}`);
  });
}

async function main() {
  let currentSettings = {
    brandColor: '#2563eb',
    accentColor: '',
    theme: 'classic',
    logoUrl: '',
    coverImageUrl: '',
    primaryLocale: 'en',
    supportedLocales: ['en'],
  };
  let savedPayload = null;

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  try {
    await page.addInitScript(() => {
      localStorage.setItem('nexus_token', 'theme-preview-check-token');
      localStorage.setItem('nexus_user', JSON.stringify({
        id: 'staff-1',
        email: 'staff@example.test',
        name: 'Preview Staff',
        role: 'owner',
        tenantId: 'tenant-1',
        tenantSlug: 'demo',
      }));
      localStorage.setItem('nexus_tenants', JSON.stringify([
        { id: 'tenant-1', name: 'Demo', slug: 'demo', role: 'owner' },
      ]));
    });

    await page.route('**/api/**', async (route) => {
      await route.fulfill(jsonResponse({ data: [] }));
    });
    await page.route(`**/api/platform/tenants/${TENANT_SLUG}`, async (route) => {
      await route.fulfill(jsonResponse({
        id: 'tenant-1',
        name: 'Demo',
        slug: TENANT_SLUG,
        settings: currentSettings,
      }));
    });
    await page.route(`**/api/t/${TENANT_SLUG}/settings`, async (route) => {
      if (route.request().method() === 'PUT') {
        savedPayload = JSON.parse(route.request().postData() || '{}');
        currentSettings = { ...currentSettings, ...savedPayload };
        await route.fulfill(jsonResponse({ data: currentSettings }));
        return;
      }
      await route.fulfill(jsonResponse({ data: currentSettings }));
    });

    await page.goto(`${baseUrl}${SETTINGS_PATH}`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.getByText('Branding').waitFor({ state: 'visible', timeout: 5000 });
    await waitForThemeState(page, {
      scopeTheme: 'classic',
      scopeBrand: '#2563eb',
      scopeAccent: '',
      bodyTheme: 'classic',
      bodyBrand: '#2563eb',
      bodyAccent: '',
    }, 'initial');

    await page.getByRole('button', { name: /Sichuan/ }).click();
    await setColorInput(page, 'Brand Color', '#b8262b');
    await setColorInput(page, 'Accent Color', ACCENT_OVERRIDE);
    await waitForThemeState(page, {
      scopeTheme: 'sichuan',
      scopeBrand: '#b8262b',
      scopeAccent: ACCENT_OVERRIDE,
      bodyTheme: 'sichuan',
      bodyBrand: '#b8262b',
      bodyAccent: ACCENT_OVERRIDE,
    }, 'live-preview');

    await page.getByRole('button', { name: /Reset/ }).click();
    await waitForThemeState(page, {
      scopeTheme: 'classic',
      scopeBrand: '#2563eb',
      scopeAccent: '',
      bodyTheme: 'classic',
      bodyBrand: '#2563eb',
      bodyAccent: '',
    }, 'reset');

    await page.getByRole('button', { name: /Sichuan/ }).click();
    await setColorInput(page, 'Brand Color', '#b8262b');
    await setColorInput(page, 'Accent Color', ACCENT_OVERRIDE);
    const saveResponse = page.waitForResponse((response) => (
      response.url().includes(`/api/t/${TENANT_SLUG}/settings`) &&
      response.request().method() === 'PUT' &&
      response.ok()
    ), { timeout: 5000 });
    await page.getByRole('button', { name: /Save Changes/ }).click();
    await saveResponse;
    if (!savedPayload || savedPayload.theme !== 'sichuan' || savedPayload.brandColor !== '#b8262b' || savedPayload.accentColor !== ACCENT_OVERRIDE) {
      throw new Error(`Save payload did not include committed preview values: ${JSON.stringify(savedPayload)}`);
    }

    await page.reload({ waitUntil: 'networkidle', timeout: 15000 });
    await page.getByText('Branding').waitFor({ state: 'visible', timeout: 5000 });
    await waitForThemeState(page, {
      scopeTheme: 'sichuan',
      scopeBrand: '#b8262b',
      scopeAccent: ACCENT_OVERRIDE,
      bodyTheme: 'sichuan',
      bodyBrand: '#b8262b',
      bodyAccent: ACCENT_OVERRIDE,
    }, 'saved-reload');

    console.log(JSON.stringify({
      baseUrl,
      path: SETTINGS_PATH,
      verified: [
        'initial tenant theme and brand',
        'live cuisine/brand/accent preview',
        'reset restores saved tenant theme',
        'save payload persists theme, brand, and accent',
        'reload restores saved tenant theme and body portal variables',
      ],
      savedPayload,
      finalState: await readThemeState(page),
    }, null, 2));
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error('Theme settings preview validation failed.');
  console.error(`Expected a running web dev server at ${baseUrl}.`);
  console.error(error);
  process.exit(1);
});
