/* global React */
// Extended themed components. All use theme tokens.
// Exposed on window for use in studio, comparison, and kits.

const DI_C = ({ name, size = 16 }) => (
  <svg width={size} height={size} aria-hidden="true"><use href={`../assets/dietary-icons.svg#di-${name}`} /></svg>
);

// ------------------ ORDER STATUS TRACKER ------------------
// Timeline: Received → Preparing → Ready → On the way → Delivered
window.OrderTracker = function OrderTracker({ theme, status = 'preparing', type = 'dine-in' }) {
  const steps = type === 'delivery'
    ? [{ id: 'received', label: 'Received' }, { id: 'preparing', label: 'Preparing' }, { id: 'on-way', label: 'On the way' }, { id: 'delivered', label: 'Delivered' }]
    : [{ id: 'received', label: 'Received' }, { id: 'preparing', label: 'Preparing' }, { id: 'ready', label: 'Ready' }, { id: 'served', label: 'Served' }];
  const idx = steps.findIndex(s => s.id === status);
  return (
    <div data-theme={theme} style={{ padding: 20, background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-card)', fontFamily: 'var(--font-sans)' }}>
      <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-tertiary)', marginBottom: 6 }}>Order #1042</div>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 'var(--font-display-weight)', fontSize: 22, color: 'var(--color-text)', marginBottom: 20 }}>
        {steps[idx]?.label} — {type === 'delivery' ? 'ETA 18 min' : 'Est. 8 min'}
      </div>
      <div style={{ display: 'flex', gap: 0, position: 'relative' }}>
        {steps.map((s, i) => {
          const done = i <= idx, active = i === idx;
          return (
            <div key={s.id} style={{ flex: 1, textAlign: 'center', position: 'relative' }}>
              {i < steps.length - 1 && (
                <div style={{ position: 'absolute', top: 13, left: '50%', right: '-50%', height: 2, background: i < idx ? 'var(--color-primary)' : 'var(--color-border)', zIndex: 0 }} />
              )}
              <div style={{
                width: 28, height: 28, borderRadius: 'var(--radius-full)',
                background: done ? 'var(--color-primary)' : 'var(--color-bg-muted)',
                border: active ? '3px solid var(--color-primary-light)' : 'none',
                color: 'var(--color-text-inverse)', margin: '0 auto', position: 'relative', zIndex: 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700,
                boxShadow: active ? '0 0 0 6px var(--color-primary-light)' : 'none', transition: 'all 200ms',
              }}>{done ? '✓' : i + 1}</div>
              <div style={{ fontSize: 11, marginTop: 8, color: done ? 'var(--color-text)' : 'var(--color-text-tertiary)', fontWeight: active ? 600 : 500 }}>{s.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ------------------ RECEIPT ------------------
window.Receipt = function Receipt({ theme, restaurantName = 'Restaurant', items = null }) {
  const its = items || [
    { n: 'Mapo Tofu', q: 1, p: 16.80 }, { n: 'Twice-Cooked Pork', q: 1, p: 19.80 },
    { n: 'Steamed Rice', q: 2, p: 3.00 }, { n: 'Jasmine Tea', q: 1, p: 4.50 },
  ];
  const sub = its.reduce((s, i) => s + i.q * i.p, 0);
  const tax = sub * 0.0875, tip = sub * 0.18, tot = sub + tax + tip;
  return (
    <div data-theme={theme} style={{
      background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-card)', padding: 24, fontFamily: 'var(--font-mono)', fontSize: 13,
      color: 'var(--color-text)', minWidth: 280, maxWidth: 340,
    }}>
      <div style={{ textAlign: 'center', borderBottom: '1px dashed var(--color-border-strong)', paddingBottom: 14, marginBottom: 14 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 'var(--font-display-weight)', fontSize: 18, letterSpacing: 'var(--font-display-tracking)' }}>{restaurantName}</div>
        <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)', marginTop: 4 }}>ORDER #1042 · TABLE 4</div>
        <div style={{ fontSize: 10, color: 'var(--color-text-tertiary)' }}>Apr 24, 2026 · 7:42 PM</div>
      </div>
      {its.map((i, k) => (
        <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <div><span style={{ color: 'var(--color-text-tertiary)', marginRight: 8 }}>{i.q}×</span>{i.n}</div>
          <div>${(i.q * i.p).toFixed(2)}</div>
        </div>
      ))}
      <div style={{ borderTop: '1px dashed var(--color-border-strong)', margin: '14px 0 10px' }} />
      {[['Subtotal', sub], ['Tax', tax], ['Tip (18%)', tip]].map(([l, v]) => (
        <div key={l} style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-text-secondary)', marginBottom: 4 }}>
          <div>{l}</div><div>${v.toFixed(2)}</div>
        </div>
      ))}
      <div style={{ borderTop: '2px solid var(--color-text)', paddingTop: 10, marginTop: 10, display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 15 }}>
        <div>TOTAL</div><div>${tot.toFixed(2)}</div>
      </div>
      <div style={{ textAlign: 'center', marginTop: 18, paddingTop: 14, borderTop: '1px dashed var(--color-border-strong)', fontSize: 10, color: 'var(--color-text-tertiary)', letterSpacing: '0.1em' }}>
        THANK YOU · SEE YOU SOON
      </div>
    </div>
  );
};

// ------------------ PROMO CARD ------------------
window.PromoCard = function PromoCard({ theme, title = 'Happy Hour', discount = '25% OFF', desc = 'Weekdays 3–6pm · all appetizers', code = 'HAPPY25' }) {
  return (
    <div data-theme={theme} style={{
      background: 'var(--color-primary)', color: 'var(--color-text-inverse)',
      borderRadius: 'var(--radius-card)', padding: 24, position: 'relative', overflow: 'hidden',
      fontFamily: 'var(--font-sans)', minWidth: 280,
    }}>
      <div style={{ position: 'absolute', top: -20, right: -20, width: 120, height: 120, background: 'var(--color-accent)', opacity: 0.25, borderRadius: 'var(--radius-full)' }} />
      <div style={{ position: 'relative' }}>
        <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.8, marginBottom: 8 }}>{title}</div>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 'var(--font-display-weight)', fontSize: 36, letterSpacing: 'var(--font-display-tracking)', marginBottom: 6, lineHeight: 1 }}>{discount}</div>
        <div style={{ fontSize: 13, opacity: 0.9, marginBottom: 14 }}>{desc}</div>
        <div style={{ display: 'inline-block', background: 'var(--color-text-inverse)', color: 'var(--color-primary)', padding: '6px 12px', borderRadius: 'var(--radius-chip)', fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, letterSpacing: '0.08em' }}>
          Code {code}
        </div>
      </div>
    </div>
  );
};

// ------------------ EMPTY STATE ------------------
window.EmptyState = function EmptyState({ theme, icon = '🍽', title = 'Your cart is empty', desc = 'Browse the menu and add items to get started.', cta = 'Browse menu' }) {
  return (
    <div data-theme={theme} style={{
      padding: 40, textAlign: 'center', background: 'var(--color-bg-surface)',
      borderRadius: 'var(--radius-card)', border: '1px dashed var(--color-border-strong)',
      fontFamily: 'var(--font-sans)', color: 'var(--color-text)',
    }}>
      <div style={{ fontSize: 48, marginBottom: 12 }}>{icon}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 'var(--font-display-weight)', fontSize: 20, marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 20, maxWidth: 280, margin: '0 auto 20px' }}>{desc}</div>
      <button style={{ height: 44, padding: '0 22px', background: 'var(--color-primary)', color: 'var(--color-text-inverse)', border: 'none', borderRadius: 'var(--radius-btn)', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>{cta}</button>
    </div>
  );
};

// ------------------ TOAST ------------------
window.Toast = function Toast({ theme, kind = 'success', title = 'Order placed', desc = "We'll send a confirmation shortly." }) {
  const colors = {
    success: { bg: 'var(--color-success-light)', fg: 'var(--color-success)', icon: '✓' },
    warning: { bg: 'var(--color-warning-light)', fg: 'var(--color-warning)', icon: '⚠' },
    danger:  { bg: 'var(--color-danger-light)',  fg: 'var(--color-danger)',  icon: '!' },
    info:    { bg: 'var(--color-info-light)',    fg: 'var(--color-info)',    icon: 'i' },
  }[kind];
  return (
    <div data-theme={theme} style={{
      background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)',
      borderLeft: `4px solid ${colors.fg}`,
      borderRadius: 'var(--radius-card)', padding: 14, display: 'flex', gap: 12,
      boxShadow: 'var(--shadow-md)', fontFamily: 'var(--font-sans)', minWidth: 320,
    }}>
      <div style={{ width: 32, height: 32, borderRadius: 'var(--radius-full)', background: colors.bg, color: colors.fg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0 }}>{colors.icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>{title}</div>
        <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2 }}>{desc}</div>
      </div>
    </div>
  );
};

// ------------------ CHECKOUT ROW ------------------
window.CheckoutSummary = function CheckoutSummary({ theme }) {
  const items = [
    { n: 'Mapo Tofu', q: 1, p: 16.80 }, { n: 'Twice-Cooked Pork', q: 1, p: 19.80 }, { n: 'Steamed Rice ×2', q: 2, p: 3.00 },
  ];
  const sub = items.reduce((s, i) => s + i.q * i.p, 0), deliv = 3.99, tot = sub + deliv + sub * 0.0875;
  return (
    <div data-theme={theme} style={{
      background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-card)', padding: 20, fontFamily: 'var(--font-sans)',
      color: 'var(--color-text)', minWidth: 300,
    }}>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 'var(--font-display-weight)', fontSize: 17, marginBottom: 14 }}>Order summary</div>
      {items.map((i, k) => (
        <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8 }}>
          <div style={{ color: 'var(--color-text-secondary)' }}>{i.q}× {i.n}</div>
          <div style={{ fontFamily: 'var(--font-mono)' }}>${(i.q * i.p).toFixed(2)}</div>
        </div>
      ))}
      <div style={{ height: 1, background: 'var(--color-border)', margin: '14px 0' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 4 }}>
        <div>Subtotal</div><div style={{ fontFamily: 'var(--font-mono)' }}>${sub.toFixed(2)}</div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 4 }}>
        <div>Delivery</div><div style={{ fontFamily: 'var(--font-mono)' }}>${deliv.toFixed(2)}</div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 14 }}>
        <div>Tax</div><div style={{ fontFamily: 'var(--font-mono)' }}>${(sub * 0.0875).toFixed(2)}</div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 700, marginBottom: 18 }}>
        <div>Total</div><div style={{ fontFamily: 'var(--font-mono)' }}>${tot.toFixed(2)}</div>
      </div>
      <button style={{ width: '100%', height: 52, background: 'var(--color-primary)', color: 'var(--color-text-inverse)', border: 'none', borderRadius: 'var(--radius-btn)', fontWeight: 600, fontSize: 15, cursor: 'pointer' }}>
        Place order · ${tot.toFixed(2)}
      </button>
    </div>
  );
};
