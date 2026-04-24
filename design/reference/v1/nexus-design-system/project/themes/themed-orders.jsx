/* global React */
// Themed merchant orders board — used in onboarding simulator preview pane.
const { useState } = React;

const ORDERS = [
  { id: '#1042', table: 'Table 4', items: 3, total: '52.40', status: 'preparing', time: '8 min', special: 'No cilantro' },
  { id: '#1041', table: 'Pickup',  items: 2, total: '24.80', status: 'ready',     time: '2 min', special: null },
  { id: '#1040', table: 'Table 7', items: 5, total: '88.50', status: 'preparing', time: '14 min', special: 'Allergic: shellfish' },
  { id: '#1039', table: 'Delivery',items: 1, total: '12.00', status: 'new',       time: 'just now', special: null },
];

const STATUS_STYLE = {
  new:       { label: 'New',       bg: 'var(--color-info-light)',    fg: 'var(--color-info)' },
  preparing: { label: 'Preparing', bg: 'var(--color-warning-light)', fg: 'var(--color-warning)' },
  ready:     { label: 'Ready',     bg: 'var(--color-success-light)', fg: 'var(--color-success)' },
};

window.ThemedOrdersBoard = function ThemedOrdersBoard({ theme, restaurantName, logo }) {
  return (
    <div data-theme={theme} style={{
      width: '100%', height: '100%',
      background: 'var(--color-bg)', color: 'var(--color-text)',
      fontFamily: 'var(--font-sans)', display: 'flex', flexDirection: 'column',
    }}>
      {/* Top bar */}
      <div style={{
        height: 56, padding: '0 20px',
        borderBottom: '1px solid var(--color-border)',
        background: 'var(--color-bg-elevated)',
        display: 'flex', alignItems: 'center', gap: 14,
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: 'var(--radius-md)',
          background: 'var(--color-primary)', color: 'var(--color-text-inverse)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16,
          overflow: 'hidden',
        }}>
          {logo ? <img src={logo} alt="" style={{width: '100%', height: '100%', objectFit: 'cover'}} />
                : restaurantName.charAt(0)}
        </div>
        <div style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 'var(--font-display-weight, 700)',
          letterSpacing: 'var(--font-display-tracking, -0.01em)',
          fontSize: 15,
        }}>{restaurantName}</div>
        <div style={{
          marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center',
          fontSize: 12, color: 'var(--color-text-secondary)',
        }}>
          <div style={{width: 8, height: 8, borderRadius: 99, background: 'var(--color-success)'}}></div>
          Open · Live orders
        </div>
      </div>

      {/* Tab bar */}
      <div style={{
        padding: '0 20px',
        borderBottom: '1px solid var(--color-border)',
        background: 'var(--color-bg-surface)',
        display: 'flex', gap: 0,
      }}>
        {['All', 'New', 'Preparing', 'Ready'].map((t, i) => (
          <div key={t} style={{
            padding: '12px 16px', fontSize: 13, fontWeight: 600,
            color: i === 0 ? 'var(--color-text)' : 'var(--color-text-secondary)',
            borderBottom: i === 0 ? '2px solid var(--color-primary)' : '2px solid transparent',
            cursor: 'pointer',
          }}>{t}</div>
        ))}
      </div>

      {/* Order columns */}
      <div style={{ flex: 1, overflow: 'hidden', padding: 16, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {['new', 'preparing', 'ready'].map(col => (
          <div key={col} style={{
            background: 'var(--color-bg-surface)',
            borderRadius: 'var(--radius-card)',
            border: '1px solid var(--color-border)',
            padding: 12, display: 'flex', flexDirection: 'column', gap: 10,
            overflow: 'hidden',
          }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
              letterSpacing: '0.08em', color: 'var(--color-text-secondary)',
            }}>
              <span>{STATUS_STYLE[col].label}</span>
              <span style={{
                background: STATUS_STYLE[col].bg, color: STATUS_STYLE[col].fg,
                padding: '2px 7px', borderRadius: 'var(--radius-chip)', fontSize: 10,
              }}>{ORDERS.filter(o => o.status === col).length}</span>
            </div>
            {ORDERS.filter(o => o.status === col).map(o => (
              <div key={o.id} style={{
                background: 'var(--color-bg-elevated)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-card)',
                padding: 12, boxShadow: 'var(--shadow-sm)',
              }}>
                <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 4}}>
                  <span style={{fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: 13}}>{o.id}</span>
                  <span style={{fontSize: 11, color: 'var(--color-text-tertiary)'}}>{o.time}</span>
                </div>
                <div style={{fontSize: 13, fontWeight: 500, marginBottom: 6}}>{o.table}</div>
                <div style={{display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--color-text-secondary)'}}>
                  <span>{o.items} items</span>
                  <span style={{fontFamily: 'var(--font-mono)', color: 'var(--color-text)', fontWeight: 600}}>${o.total}</span>
                </div>
                {o.special && (
                  <div style={{
                    marginTop: 8, padding: '6px 8px',
                    background: 'var(--color-danger-light)', color: 'var(--color-danger)',
                    borderRadius: 'var(--radius-sm)', fontSize: 11, fontWeight: 500,
                  }}>⚠ {o.special}</div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};
