import { PAYMENT_STATUS_LABELS } from '@nexus/shared';
import { formatPrice } from '@web/lib/format';
import type { Order, SnapshotModifier } from '../types';

// ---------------------------------------------------------------------------
// Receipt HTML generator (used by printReceipt — opens in new window)
// ---------------------------------------------------------------------------

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('en-NZ', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function parseModifiers(json: string | null): string[] {
  if (!json) return [];
  try {
    const raw = JSON.parse(json) as unknown;
    if (Array.isArray(raw)) {
      return (raw as SnapshotModifier[]).map((m) => m.name);
    }
    if (raw && typeof raw === 'object' && 'itemModifiers' in raw) {
      const obj = raw as { itemModifiers: SnapshotModifier[] };
      return obj.itemModifiers.map((m) => m.name);
    }
  } catch {
    // ignore
  }
  return [];
}

function toHtml(order: Order, tenantName: string): string {
  const activeItems = order.items.filter(
    (item) => (item.status ?? 'active') !== 'cancelled',
  );

  const subtotal = activeItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  const discount = order.discountAmount ?? 0;
  const total = order.total;
  // GST 15% inclusive: tax = total * 3/23
  const tax = Math.round((total * 3 / 23) * 100) / 100;

  const shortId = order.id.slice(-6).toUpperCase();
  const paymentLabel = PAYMENT_STATUS_LABELS[order.paymentStatus ?? 'unpaid'];

  let itemsHtml = '';
  for (const item of activeItems) {
    const lineTotal = formatPrice(item.price * item.quantity);
    itemsHtml += `<tr><td>${item.quantity}x ${escapeHtml(item.name)}</td><td class="right">${lineTotal}</td></tr>\n`;

    const mods = parseModifiers(item.modifiersJson);
    if (mods.length > 0) {
      itemsHtml += `<tr><td class="mods" colspan="2">   (${escapeHtml(mods.join(', '))})</td></tr>\n`;
    }
    if (item.notes) {
      itemsHtml += `<tr><td class="mods" colspan="2">   Note: ${escapeHtml(item.notes)}</td></tr>\n`;
    }
  }

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Receipt #${shortId}</title>
<style>
  @page { margin: 0; size: 80mm auto; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Courier New', Courier, monospace;
    font-size: 12px;
    line-height: 1.4;
    width: 80mm;
    padding: 8px;
    color: #000;
    background: #fff;
  }
  .center { text-align: center; }
  .right { text-align: right; }
  .bold { font-weight: bold; }
  .divider { border-top: 1px dashed #000; margin: 6px 0; }
  .divider-thick { border-top: 2px solid #000; margin: 6px 0; }
  table { width: 100%; border-collapse: collapse; }
  td { vertical-align: top; padding: 1px 0; }
  .mods { font-size: 10px; color: #555; padding-left: 16px; }
  .header { font-size: 14px; font-weight: bold; }
  .footer { font-size: 10px; color: #555; margin-top: 8px; }
  @media print {
    body { width: 100%; }
  }
</style>
</head>
<body>
  <div class="divider-thick"></div>
  <p class="center header">${escapeHtml(tenantName)}</p>
  <div class="divider-thick"></div>

  <table>
    <tr>
      <td>Table: ${escapeHtml(order.tableNumber)}</td>
      <td class="right">Order #${shortId}</td>
    </tr>
    <tr>
      <td colspan="2">${formatDateTime(order.createdAt)}</td>
    </tr>
  </table>

  <div class="divider"></div>

  <table>
    ${itemsHtml}
  </table>

  <div class="divider"></div>

  <table>
    <tr>
      <td>Subtotal:</td>
      <td class="right">${formatPrice(subtotal)}</td>
    </tr>
    ${discount > 0 ? `<tr><td>Discount:</td><td class="right">-${formatPrice(discount)}</td></tr>` : ''}
    <tr>
      <td>GST (15%):</td>
      <td class="right">${formatPrice(tax)}</td>
    </tr>
    <tr class="bold">
      <td>Total:</td>
      <td class="right">${formatPrice(total)}</td>
    </tr>
  </table>

  <div class="divider"></div>

  <p>Status: ${paymentLabel}</p>

  ${order.notes ? `<p>Note: ${escapeHtml(order.notes)}</p>` : ''}

  <div class="divider-thick"></div>
  <p class="center footer">Thank you for dining with us!</p>
  <div class="divider-thick"></div>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * OrderReceipt is a namespace with a static `toHtml()` method
 * that generates a print-friendly receipt HTML string.
 *
 * Usage:
 *   const html = OrderReceipt.toHtml(order, tenantName);
 *   window.open('...').document.write(html);
 */
export const OrderReceipt = { toHtml };
