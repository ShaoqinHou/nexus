import { type BrowserContext, type Page } from '@playwright/test';

const API = 'http://localhost:3001';

/** Login as staff and return { token, page } with auth set up */
export async function loginAsStaff(context: BrowserContext, tenantSlug = 'demo'): Promise<{ token: string; page: Page }> {
  const res = await (await fetch(`${API}/api/platform/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'demo@example.com', password: 'password123', tenantSlug }),
  })).json();

  const token = res.token as string;
  const user = res.user;

  const tenantsRes = await (await fetch(`${API}/api/platform/auth/my-tenants`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'demo@example.com', password: 'password123' }),
  })).json();

  const page = await context.newPage();
  await page.goto('http://localhost:5173/login');
  await page.evaluate(({ token, user, tenants }) => {
    localStorage.setItem('nexus_token', token);
    localStorage.setItem('nexus_user', JSON.stringify(user));
    localStorage.setItem('nexus_tenants', JSON.stringify(tenants));
  }, { token, user, tenants: tenantsRes.data });

  return { token, page };
}

/** Navigate staff page — uses domcontentloaded (not networkidle which hangs on SSE) */
export async function goToStaffPage(page: Page, tenantSlug: string, path: string) {
  await page.goto(`http://localhost:5173/t/${tenantSlug}/${path}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
}

/** Open customer page (anonymous, no login) */
export async function openCustomerPage(context: BrowserContext, tenantSlug: string, table: string): Promise<Page> {
  const page = await context.newPage();
  await page.goto(`http://localhost:5173/order/${tenantSlug}?table=${table}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  return page;
}

/** API helper: make authenticated staff API call */
export async function staffApi(token: string, method: string, path: string, body?: unknown) {
  const res = await fetch(`${API}/api/t/demo/ordering${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

/** API helper: make customer API call */
export async function customerApi(method: string, path: string, body?: unknown, cookies?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (cookies) headers['Cookie'] = cookies;
  const res = await fetch(`${API}/api/order/demo/ordering${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  return { json: await res.json(), cookies: res.headers.get('set-cookie') };
}
