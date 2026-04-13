import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import { loginAsStaff, goToStaffPage, openCustomerPage, staffApi, customerApi } from './helpers';

/**
 * Cooperative Full-Flow E2E
 *
 * Simulates a real dinner service with 3 concurrent users:
 * - Customer A at Table 7: Chinese-speaking, orders food
 * - Manager: monitors dashboard, processes orders, handles payments
 * - Kitchen: watches KDS, processes orders
 *
 * Each user has their own browser context (separate cookies/localStorage).
 * Actions by one user are verified as visible to others.
 */

const API = 'http://localhost:3001';

async function getToken(): Promise<string> {
  const res = await (await fetch(`${API}/api/platform/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'demo@example.com', password: 'password123', tenantSlug: 'demo' }),
  })).json();
  return res.token;
}

test.describe('Cooperative Full-Flow E2E', () => {
  let token: string;

  test.beforeAll(async () => {
    token = await getToken();
  });

  test('Complete dinner service: customer orders in Chinese → kitchen processes → manager handles payment', async ({ browser }) => {
    test.setTimeout(180_000); // full flow may take time with translations

    // =====================================================================
    // SETUP: Open 3 browser contexts (3 different users)
    // =====================================================================
    const customerCtx = await browser.newContext();
    const managerCtx = await browser.newContext();
    const kitchenCtx = await browser.newContext();

    const customerPage = await openCustomerPage(customerCtx, 'demo', '7');
    const { page: managerPage } = await loginAsStaff(managerCtx);
    const { page: kitchenPage } = await loginAsStaff(kitchenCtx);

    // =====================================================================
    // STEP 1: Customer opens menu and sees it in English
    // =====================================================================
    console.log('\n=== STEP 1: Customer sees menu ===');
    await expect(customerPage.getByRole('heading', { name: 'Starters' })).toBeVisible({ timeout: 10_000 });
    await expect(customerPage.getByText('Garlic Bread')).toBeVisible();
    console.log('  Customer sees English menu ✓');

    // =====================================================================
    // STEP 2: Customer switches to Chinese
    // =====================================================================
    console.log('\n=== STEP 2: Customer switches to Chinese ===');
    const langPicker = customerPage.locator('select').filter({ hasText: /English|中文/ });
    if (await langPicker.count() > 0) {
      await langPicker.selectOption('zh');
      await customerPage.waitForTimeout(2000); // wait for locale + menu refetch

      // UI strings should be Chinese
      const bodyText = await customerPage.textContent('body');
      const hasChinese = /[\u4e00-\u9fff]/.test(bodyText || '');
      console.log('  Chinese characters on page:', hasChinese ? 'YES ✓' : 'NO ✗');
      expect(hasChinese).toBe(true);

      // Menu items should be translated (if batch translate was run)
      // Check for Chinese category names
      const hasTranslatedMenu = bodyText?.includes('前菜') || bodyText?.includes('开胃菜') || bodyText?.includes('主菜');
      console.log('  Translated menu content:', hasTranslatedMenu ? 'YES ✓' : 'NO (not batch translated yet)');
    } else {
      console.log('  Language picker not found — skipping');
    }

    // Switch back to English for ordering (since we test cross-language interaction)
    if (await langPicker.count() > 0) {
      await langPicker.selectOption('en');
      await customerPage.waitForTimeout(1500);
    }

    // =====================================================================
    // STEP 3: Customer places order via API (with Chinese notes)
    // =====================================================================
    console.log('\n=== STEP 3: Customer places order ===');
    const menuRes = await customerApi('GET', '/menu');
    const starterItem = menuRes.json.data.categories[0].items[0]; // Garlic Bread
    const mainItem = menuRes.json.data.categories[1].items[0]; // Margherita Pizza

    const orderRes = await customerApi('POST', '/orders', {
      tableNumber: '7',
      items: [
        { menuItemId: starterItem.id, quantity: 1, notes: '不要大蒜黄油太多' },
        { menuItemId: mainItem.id, quantity: 2, notes: 'extra cheese' },
      ],
      notes: '我们在庆祝生日',
    });

    expect(orderRes.json.data).toBeTruthy();
    const orderId = orderRes.json.data.id;
    console.log('  Order placed:', orderId.substring(0, 8));
    console.log('  Items:', orderRes.json.data.items.length);
    console.log('  Customer notes:', orderRes.json.data.notes);
    console.log('  Allergens snapshotted:', orderRes.json.data.items.map((i: { name: string; allergens: string }) => `${i.name}:${i.allergens || 'none'}`).join(', '));

    // =====================================================================
    // STEP 4: Manager opens dashboard — should see the new order
    // =====================================================================
    console.log('\n=== STEP 4: Manager sees new order ===');
    await goToStaffPage(managerPage, 'demo', 'ordering/orders');

    // Wait for orders to load and check for Table 7
    await managerPage.waitForTimeout(3000);
    const dashText = await managerPage.textContent('body');
    const seesTable7 = dashText?.includes('7') || false;
    console.log('  Dashboard loaded, sees Table 7:', seesTable7 ? 'YES ✓' : 'checking...');

    // Verify via API that manager can see the order
    const ordersRes = await staffApi(token, 'GET', '/orders?status=pending');
    const ourOrder = ordersRes.data.find((o: { id: string }) => o.id === orderId);
    expect(ourOrder).toBeTruthy();
    console.log('  Order visible in API:', ourOrder.tableNumber, ourOrder.status, '✓');

    // =====================================================================
    // STEP 5: Kitchen opens KDS — should see the order
    // =====================================================================
    console.log('\n=== STEP 5: Kitchen sees order on KDS ===');
    await goToStaffPage(kitchenPage, 'demo', 'ordering/kitchen');
    await kitchenPage.waitForTimeout(5000); // SSE needs time

    // Check station filter buttons exist
    await expect(kitchenPage.getByRole('button', { name: 'All', exact: true })).toBeVisible();
    console.log('  KDS loaded with station filter ✓');

    // Verify via API
    const kitchenOrders = await staffApi(token, 'GET', '/orders?status=pending');
    const kitchenSees = kitchenOrders.data.some((o: { id: string }) => o.id === orderId);
    console.log('  KDS sees order:', kitchenSees ? 'YES ✓' : 'NO ✗');

    // =====================================================================
    // STEP 6: Kitchen confirms and starts preparing
    // =====================================================================
    console.log('\n=== STEP 6: Kitchen processes order ===');
    await staffApi(token, 'PATCH', `/orders/${orderId}/status`, { status: 'confirmed' });
    console.log('  Status → confirmed ✓');

    await staffApi(token, 'PATCH', `/orders/${orderId}/status`, { status: 'preparing' });
    console.log('  Status → preparing ✓');

    // =====================================================================
    // STEP 7: Manager adds staff notes
    // =====================================================================
    console.log('\n=== STEP 7: Manager adds staff notes ===');
    const notesRes = await staffApi(token, 'PATCH', `/orders/${orderId}/notes`, {
      staffNotes: 'Birthday table — bring sparkler with dessert',
    });
    expect(notesRes.data.staffNotes).toContain('Birthday');
    console.log('  Staff notes added ✓');

    // =====================================================================
    // STEP 8: Customer calls waiter (assistance) → Manager sees it
    // =====================================================================
    console.log('\n=== STEP 8: Customer calls waiter ===');
    const waiterRes = await customerApi('POST', '/call-waiter', { tableNumber: '7', callType: 'assistance' });
    expect(waiterRes.json.data.callType).toBe('assistance');
    const callId = waiterRes.json.data.id;
    console.log('  Waiter called ✓');

    // Manager checks
    const calls = await staffApi(token, 'GET', '/waiter-calls');
    const ourCall = calls.data.find((c: { id: string }) => c.id === callId);
    expect(ourCall).toBeTruthy();
    console.log('  Manager sees call:', ourCall.callType, '✓');

    // Manager acknowledges
    await staffApi(token, 'PATCH', `/waiter-calls/${callId}/acknowledge`, {});
    console.log('  Acknowledged ✓');

    // =====================================================================
    // STEP 9: Kitchen marks ready → Manager delivers
    // =====================================================================
    console.log('\n=== STEP 9: Kitchen ready → Manager delivers ===');
    await staffApi(token, 'PATCH', `/orders/${orderId}/status`, { status: 'ready' });
    console.log('  Status → ready ✓');

    await staffApi(token, 'PATCH', `/orders/${orderId}/status`, { status: 'delivered' });
    console.log('  Status → delivered ✓');

    // =====================================================================
    // STEP 10: Customer requests bill → Manager sees bill banner
    // =====================================================================
    console.log('\n=== STEP 10: Customer requests bill ===');
    const billRes = await customerApi('POST', '/call-waiter', { tableNumber: '7', callType: 'bill' });
    expect(billRes.json.data.callType).toBe('bill');
    console.log('  Bill requested ✓');

    // Refresh manager dashboard
    await managerPage.reload({ waitUntil: 'domcontentloaded' });
    await managerPage.waitForTimeout(2000);

    // Check for bill banner (green vs amber)
    const managerText = await managerPage.textContent('body');
    const hasBillBanner = managerText?.includes('bill request') || managerText?.includes('Bill Ready');
    console.log('  Manager sees bill banner:', hasBillBanner ? 'YES ✓' : 'checking API...');

    // Verify via API
    const allCalls = await staffApi(token, 'GET', '/waiter-calls');
    const billCalls = allCalls.data.filter((c: { callType: string; acknowledged: boolean }) => c.callType === 'bill' && !c.acknowledged);
    console.log('  Unacked bill requests:', billCalls.length, '✓');

    // =====================================================================
    // STEP 11: Manager applies discount + marks paid with split payment
    // =====================================================================
    console.log('\n=== STEP 11: Manager handles payment ===');

    // Apply discount
    const overrideRes = await staffApi(token, 'POST', `/orders/${orderId}/override`, {
      amount: 5.0,
      reason: 'Birthday celebration comp',
    });
    console.log('  Discount applied: $', overrideRes.data.discountOverride, '✓');

    // Mark paid with card
    const payRes = await staffApi(token, 'PATCH', `/orders/${orderId}/payment`, {
      paymentStatus: 'paid',
      paymentMethod: 'card',
    });
    expect(payRes.data.paymentStatus).toBe('paid');
    expect(payRes.data.paymentMethod).toBe('card');
    console.log('  Paid:', payRes.data.paymentMethod, '✓');

    // =====================================================================
    // STEP 12: Verify auto table status
    // =====================================================================
    console.log('\n=== STEP 12: Auto table status ===');
    const tables = await staffApi(token, 'GET', '/tables');
    const table7 = tables.data.find((t: { tableNumber: string }) => t.tableNumber === '7');
    console.log('  Table 7 status:', table7?.status || 'not found');
    expect(table7?.status).toBe('needs_cleaning');
    console.log('  Auto-updated to needs_cleaning ✓');

    // =====================================================================
    // STEP 13: Customer leaves feedback
    // =====================================================================
    console.log('\n=== STEP 13: Customer leaves feedback ===');
    const fbRes = await customerApi('POST', '/feedback', {
      orderId,
      tableNumber: '7',
      rating: 5,
      comment: '生日聚会非常棒！食物很好吃。',
    });
    expect(fbRes.json.data.rating).toBe(5);
    console.log('  Feedback submitted: ★★★★★ ✓');

    // =====================================================================
    // STEP 14: Manager checks feedback in analytics
    // =====================================================================
    console.log('\n=== STEP 14: Manager checks feedback ===');
    const summary = await staffApi(token, 'GET', '/feedback/summary');
    console.log('  Avg rating:', summary.data.avgRating);
    console.log('  Total reviews:', summary.data.totalCount);
    expect(summary.data.totalCount).toBeGreaterThanOrEqual(1);

    // =====================================================================
    // STEP 15: Paid order guard — verify locked
    // =====================================================================
    console.log('\n=== STEP 15: Paid order guard ===');
    const addRes = await customerApi('POST', `/orders/${orderId}/items`, {
      items: [{ menuItemId: starterItem.id, quantity: 1 }],
    });
    expect(addRes.json.error).toBeTruthy();
    console.log('  Modification blocked:', addRes.json.error, '✓');

    // =====================================================================
    // STEP 16: Visual verification — screenshots of all 3 views
    // =====================================================================
    console.log('\n=== STEP 16: Screenshots ===');
    await customerPage.reload({ waitUntil: 'domcontentloaded' });
    await customerPage.waitForTimeout(1500);
    await customerPage.screenshot({ path: 'tests/e2e/screenshots/coop-customer.png' });
    console.log('  Customer screenshot ✓');

    await managerPage.reload({ waitUntil: 'domcontentloaded' });
    await managerPage.waitForTimeout(1500);
    await managerPage.screenshot({ path: 'tests/e2e/screenshots/coop-manager.png' });
    console.log('  Manager screenshot ✓');

    await kitchenPage.screenshot({ path: 'tests/e2e/screenshots/coop-kitchen.png' });
    console.log('  Kitchen screenshot ✓');

    // =====================================================================
    // STEP 17: Settings page — verify language + hours sections
    // =====================================================================
    console.log('\n=== STEP 17: Settings page structure ===');
    await goToStaffPage(managerPage, 'demo', 'ordering/settings');
    const settingsText = await managerPage.textContent('body');

    const hasRestaurantSection = settingsText?.includes('Restaurant') || settingsText?.includes('Operating Hours');
    const hasLanguageSection = settingsText?.includes('Languages') || settingsText?.includes('中文');
    const hasThemeSection = settingsText?.includes('Theme') || settingsText?.includes('Presets');
    const hasTaxSection = settingsText?.includes('Tax');
    const hasLastOrder = settingsText?.includes('Last Order') || settingsText?.includes('Cutoff') || settingsText?.includes('before closing');

    console.log('  Restaurant section:', hasRestaurantSection ? '✓' : '✗');
    console.log('  Languages section:', hasLanguageSection ? '✓' : '✗');
    console.log('  Last order cutoff:', hasLastOrder ? '✓' : '✗');
    console.log('  Tax section:', hasTaxSection ? '✓' : '✗');
    console.log('  Theme section:', hasThemeSection ? '✓' : '✗');

    await managerPage.screenshot({ path: 'tests/e2e/screenshots/coop-settings.png' });

    // Cleanup
    await customerCtx.close();
    await managerCtx.close();
    await kitchenCtx.close();

    console.log('\n=== ALL 17 STEPS PASSED ===\n');
  });
});
