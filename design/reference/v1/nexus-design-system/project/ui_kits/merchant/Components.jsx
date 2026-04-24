/* global React */
const { useState } = React;
const { Icon } = window.MerchantShell;

function StatusBadge({ status }) {
  const map = {
    pending: 'nx-badge--warning', preparing: 'nx-badge--warning',
    ready: 'nx-badge--success', confirmed: 'nx-badge--success',
    cancelled: 'nx-badge--error', new: 'nx-badge--info',
  };
  const cls = map[status] || 'nx-badge--default';
  return <span className={`nx-badge ${cls}`}>{status.charAt(0).toUpperCase() + status.slice(1)}</span>;
}

function OrderCard({ order, onAdvance }) {
  return (
    <div className="nx-card" style={{ marginBottom: 12 }}>
      <div className="nx-card__header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h3 className="nx-card__title" style={{ fontSize: 16 }}>#{order.id}</h3>
          <span style={{ fontSize: 12, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}>Table {order.table}</span>
        </div>
        <StatusBadge status={order.status} />
      </div>
      <div className="nx-card__content">
        {order.items.map((it, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '4px 0', color: 'var(--color-text)' }}>
            <span><span style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}>{it.qty}×</span>&nbsp; {it.name}</span>
            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-secondary)' }}>${it.price.toFixed(2)}</span>
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--color-border)', fontSize: 13, fontWeight: 600 }}>
          <span>Total</span>
          <span style={{ fontFamily: 'var(--font-mono)' }}>${order.total.toFixed(2)}</span>
        </div>
      </div>
      <div className="nx-card__footer" style={{ justifyContent: 'space-between' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--color-text-tertiary)' }}>
          <Icon name="clock" size={12} color="secondary" /> {order.minutesAgo}m ago
        </span>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className="nx-btn nx-btn--ghost nx-btn--sm">View</button>
          <button className="nx-btn nx-btn--primary nx-btn--sm" onClick={() => onAdvance(order.id)}>{order.nextLabel}</button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, delta, deltaType }) {
  const deltaColor = deltaType === 'up' ? 'var(--color-success)' : deltaType === 'down' ? 'var(--color-danger)' : 'var(--color-text-tertiary)';
  return (
    <div className="nx-card">
      <div className="nx-card__content">
        <p className="nx-eyebrow" style={{ marginBottom: 6 }}>{label}</p>
        <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--color-text)', letterSpacing: '-0.01em' }}>{value}</div>
        {delta && <div style={{ fontSize: 12, color: deltaColor, marginTop: 4, fontWeight: 500 }}>{delta}</div>}
      </div>
    </div>
  );
}

function EmptyState({ icon, title, description, actionLabel }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '48px 16px' }}>
      <div style={{ background: 'var(--color-bg-muted)', borderRadius: 9999, padding: 16, marginBottom: 16 }}>
        <Icon name={icon} size={32} color="secondary" />
      </div>
      <h3 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 600, color: 'var(--color-text)' }}>{title}</h3>
      <p style={{ margin: '0 0 24px', fontSize: 14, color: 'var(--color-text-secondary)', maxWidth: 320 }}>{description}</p>
      {actionLabel && <button className="nx-btn nx-btn--primary nx-btn--md">{actionLabel}</button>}
    </div>
  );
}

window.MerchantParts = { StatusBadge, OrderCard, StatCard, EmptyState };
