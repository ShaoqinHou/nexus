/* global React */
const { useState } = React;

const icon = (name, size = 20, color) => (
  <img src={`../../assets/icons/${name}.svg`}
    style={{ width: size, height: size, flexShrink: 0,
      filter: color === 'inverse' ? 'brightness(0) invert(1)' :
              color === 'primary' ? 'invert(29%) sepia(93%) saturate(3074%) hue-rotate(217deg) brightness(93%) contrast(89%)' : undefined,
      opacity: color === 'tertiary' ? 0.45 : color === 'secondary' ? 0.7 : 1 }} />
);

// ===== LOGIN ==============================================================
function LoginScreen() {
  return (
    <div style={{ display: 'flex', height: '100%', background: 'var(--color-bg-surface)', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 400, padding: 32, background: 'var(--color-bg-elevated)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-md)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
          <div style={{ background: 'var(--color-primary-light)', padding: 12, borderRadius: 12, display: 'inline-flex' }}>
            {icon('building-2', 28, 'primary')}
          </div>
        </div>
        <h1 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 700, textAlign: 'center', color: 'var(--color-text)' }}>Sign in to Nexus</h1>
        <p style={{ margin: '0 0 24px', fontSize: 14, textAlign: 'center', color: 'var(--color-text-secondary)' }}>Staff access to your restaurant</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label className="nx-label">Email</label>
            <input className="nx-input" placeholder="sarah@demo-restaurant.com" type="email" />
          </div>
          <div>
            <label className="nx-label">Password</label>
            <input className="nx-input" placeholder="••••••••" type="password" />
          </div>
          <button className="nx-btn nx-btn--primary nx-btn--lg" style={{ width: '100%', marginTop: 4 }}>Sign In</button>
          <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--color-text-secondary)' }}>
            <a href="#" style={{ color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 500 }}>Forgot password?</a>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== TENANT PICKER ======================================================
function TenantPicker() {
  const tenants = [
    { name: 'Demo Restaurant', slug: 'demo', role: 'Owner', tables: 12 },
    { name: 'The Noodle Spot', slug: 'noodle-spot', role: 'Manager', tables: 8 },
    { name: 'Canal St. Dumplings', slug: 'canal-dumplings', role: 'Staff', tables: 6 },
  ];
  return (
    <div style={{ display: 'flex', height: '100%', background: 'var(--color-bg-surface)', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: 520 }}>
        <h1 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 700, color: 'var(--color-text)' }}>Choose Restaurant</h1>
        <p style={{ margin: '0 0 24px', fontSize: 14, color: 'var(--color-text-secondary)' }}>You have access to {tenants.length} restaurants</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {tenants.map(t => (
            <button key={t.slug} className="nx-card" style={{ textAlign: 'left', cursor: 'pointer', background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', padding: 16, display: 'flex', alignItems: 'center', gap: 14, fontFamily: 'inherit' }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--color-primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {icon('building-2', 22, 'primary')}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--color-text)' }}>{t.name}</div>
                <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}>{t.slug} · {t.role} · {t.tables} tables</div>
              </div>
              {icon('chevron-right', 18, 'tertiary')}
            </button>
          ))}
          <button className="nx-btn nx-btn--ghost" style={{ marginTop: 8, justifyContent: 'center', border: '1px dashed var(--color-border)' }}>
            {icon('plus', 16, 'secondary')}<span>Create Restaurant</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ===== MENU MANAGEMENT (merchant) =========================================
function MenuManagement() {
  const categories = [
    { id: 'c1', name: 'Starters', count: 8, active: true },
    { id: 'c2', name: 'Noodles & Rice', count: 12, active: true },
    { id: 'c3', name: 'Mains', count: 15, active: true },
    { id: 'c4', name: 'Dessert', count: 4, active: true },
    { id: 'c5', name: 'Drinks', count: 9, active: false },
  ];
  const items = [
    { name: 'Dan Dan Noodles', price: 14.00, category: 'Noodles & Rice', tags: ['spicy','popular'], available: true },
    { name: 'Mapo Tofu', price: 12.50, category: 'Mains', tags: ['spicy'], available: true },
    { name: 'Xiao Long Bao (6)', price: 11.00, category: 'Starters', tags: ['popular'], available: true },
    { name: 'Cucumber Salad', price: 6.00, category: 'Starters', tags: ['vegan','spicy'], available: true },
    { name: 'Beef Chow Fun', price: 16.00, category: 'Noodles & Rice', tags: [], available: false },
    { name: 'Kung Pao Chicken', price: 15.00, category: 'Mains', tags: ['spicy'], available: true },
  ];
  return (
    <div style={{ padding: 24, background: 'var(--color-bg)', height: '100%', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: 'var(--color-text)' }}>Menu</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="nx-btn nx-btn--ghost nx-btn--md">{icon('download', 14, 'secondary')}Export</button>
          <button className="nx-btn nx-btn--primary nx-btn--md">{icon('plus', 14, 'inverse')}Add item</button>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 20 }}>
        <div className="nx-card">
          <div className="nx-card__header"><h3 className="nx-card__title">Categories</h3></div>
          <div style={{ padding: '4px 8px 12px' }}>
            {categories.map(c => (
              <button key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', padding: '8px 12px', borderRadius: 6, border: 'none', background: c.id === 'c2' ? 'var(--color-primary-light)' : 'transparent', color: c.id === 'c2' ? 'var(--color-primary)' : 'var(--color-text)', cursor: 'pointer', fontSize: 14, fontWeight: 500, fontFamily: 'inherit', marginBottom: 2 }}>
                <span>{c.name}</span>
                <span style={{ fontSize: 11, color: c.active ? 'inherit' : 'var(--color-text-tertiary)', fontFamily: 'var(--font-mono)', opacity: .7 }}>{c.count}</span>
              </button>
            ))}
            <button className="nx-btn nx-btn--ghost nx-btn--sm" style={{ width: '100%', marginTop: 8, justifyContent: 'center' }}>{icon('plus', 12, 'secondary')}New category</button>
          </div>
        </div>
        <div className="nx-card">
          <div className="nx-card__header" style={{ gap: 12 }}>
            <h3 className="nx-card__title">Items in Noodles & Rice</h3>
            <div style={{ flex: 1, position: 'relative' }}>
              {icon('search', 14, 'tertiary')}
              <input placeholder="Search items..." className="nx-input" style={{ paddingLeft: 32 }} />
            </div>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: 'var(--color-bg-surface)', textAlign: 'left' }}>
                <th style={{ padding: '10px 16px', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--color-text-tertiary)', fontWeight: 600 }}>Name</th>
                <th style={{ padding: '10px 16px', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--color-text-tertiary)', fontWeight: 600 }}>Category</th>
                <th style={{ padding: '10px 16px', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--color-text-tertiary)', fontWeight: 600, textAlign: 'right' }}>Price</th>
                <th style={{ padding: '10px 16px', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--color-text-tertiary)', fontWeight: 600 }}>Status</th>
                <th style={{ padding: '10px 16px', width: 60 }}></th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, i) => (
                <tr key={i} style={{ borderTop: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontWeight: 500, color: 'var(--color-text)' }}>{it.name}</div>
                    <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                      {it.tags.map(t => <span key={t} style={{ fontSize: 10, padding: '1px 6px', borderRadius: 9999, background: t === 'spicy' || t === 'popular' ? 'var(--color-warning-light)' : 'var(--color-success-light)', color: t === 'spicy' || t === 'popular' ? 'var(--color-warning)' : 'var(--color-success)', fontWeight: 500 }}>{t}</span>)}
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--color-text-secondary)' }}>{it.category}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: 'var(--color-text)' }}>${it.price.toFixed(2)}</td>
                  <td style={{ padding: '12px 16px' }}>{it.available
                    ? <span className="nx-badge nx-badge--success">Available</span>
                    : <span className="nx-badge nx-badge--default">Hidden</span>}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <button style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer' }}>{icon('more-vertical', 16, 'secondary')}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ===== PROMOTIONS =========================================================
function Promotions() {
  const promos = [
    { code: 'WELCOME10', type: '10% off', desc: 'For new customers, first order', redemptions: 142, status: 'active' },
    { code: 'LUNCH15', type: '$15 off $50', desc: 'Weekdays 11am–2pm', redemptions: 38, status: 'active' },
    { code: 'SUMMER2025', type: '20% off', desc: 'Ran Jun 1 – Sep 1, 2025', redemptions: 418, status: 'expired' },
  ];
  return (
    <div style={{ padding: 24, background: 'var(--color-bg)', height: '100%', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Promotions</h1>
        <button className="nx-btn nx-btn--primary nx-btn--md">{icon('plus', 14, 'inverse')}Create promotion</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        {[['Active promos', '2', 'trending-up'], ['Total redemptions', '598', 'gift'], ['Avg discount', '12.4%', 'percent']].map(([l, v, i]) => (
          <div key={l} className="nx-card">
            <div className="nx-card__content" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 8, background: 'var(--color-primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon(i, 18, 'primary')}</div>
              <div>
                <p className="nx-eyebrow" style={{ margin: 0 }}>{l}</p>
                <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-text)', fontFamily: 'var(--font-mono)' }}>{v}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="nx-card">
        <div className="nx-card__header"><h3 className="nx-card__title">All promotions</h3></div>
        <div style={{ padding: '0 4px 8px' }}>
          {promos.map(p => (
            <div key={p.code} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 16px', borderTop: '1px solid var(--color-border)' }}>
              <div style={{ padding: '8px 12px', borderRadius: 8, background: 'var(--color-bg-surface)', border: '1px dashed var(--color-border)', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 13, color: 'var(--color-text)' }}>{p.code}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{p.type}</div>
                <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{p.desc}</div>
              </div>
              <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}>{p.redemptions} redeemed</div>
              <span className={`nx-badge ${p.status === 'active' ? 'nx-badge--success' : 'nx-badge--default'}`}>{p.status}</span>
              <button style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer' }}>{icon('more-vertical', 16, 'secondary')}</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ===== QR CODES ===========================================================
function QRCodes() {
  const tables = Array.from({length: 12}, (_,i) => ({ n: i+1, scans: Math.floor(Math.random()*200)+20 }));
  return (
    <div style={{ padding: 24, background: 'var(--color-bg)', height: '100%', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>QR Codes</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--color-text-secondary)' }}>Print these and place them on tables. Customers scan to order.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="nx-btn nx-btn--ghost nx-btn--md">{icon('download', 14, 'secondary')}Download all</button>
          <button className="nx-btn nx-btn--primary nx-btn--md">{icon('plus', 14, 'inverse')}Add table</button>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        {tables.map(t => (
          <div key={t.n} className="nx-card">
            <div className="nx-card__content" style={{ textAlign: 'center' }}>
              <div style={{ width: 128, height: 128, margin: '0 auto 10px', background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 10 }}>
                <svg viewBox="0 0 21 21" width="100%" height="100%" shapeRendering="crispEdges" xmlns="http://www.w3.org/2000/svg">
                  {/* procedurally random pattern for demo */}
                  {Array.from({length: 21*21}).map((_, i) => {
                    const x = i % 21, y = Math.floor(i / 21);
                    const onFinder = (x < 7 && y < 7) || (x > 13 && y < 7) || (x < 7 && y > 13);
                    const isFinder = onFinder && ((x === 0 || x === 6 || x === 14 || x === 20 || y === 0 || y === 6 || y === 14 || y === 20) || (x >= 2 && x <= 4 && y >= 2 && y <= 4) || (x >= 16 && x <= 18 && y >= 2 && y <= 4) || (x >= 2 && x <= 4 && y >= 16 && y <= 18));
                    const fill = isFinder || ((x * 13 + y * 31 + t.n * 7) % 7 < 3);
                    return fill ? <rect key={i} x={x} y={y} width="1" height="1" fill="#111" /> : null;
                  })}
                </svg>
              </div>
              <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-text)' }}>Table {t.n}</div>
              <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>{t.scans} scans · 7d</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ===== STAFF ==============================================================
function Staff() {
  const members = [
    { name: 'Sarah Kim', email: 'sarah@demo-restaurant.com', role: 'Owner', color: 'var(--color-primary)', last: 'Active now' },
    { name: 'David Chen', email: 'david@demo-restaurant.com', role: 'Manager', color: 'var(--color-success)', last: '2 hours ago' },
    { name: 'Maya Patel', email: 'maya@demo-restaurant.com', role: 'Staff', color: 'var(--color-warning)', last: 'Yesterday' },
    { name: 'Tom Rodriguez', email: 'tom@demo-restaurant.com', role: 'Staff', color: 'var(--color-danger)', last: '3 days ago' },
  ];
  return (
    <div style={{ padding: 24, background: 'var(--color-bg)', height: '100%', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Staff</h1>
        <button className="nx-btn nx-btn--primary nx-btn--md">{icon('user-plus', 14, 'inverse')}Invite staff</button>
      </div>
      <div className="nx-card">
        <div className="nx-card__header"><h3 className="nx-card__title">4 members</h3></div>
        <div>
          {members.map(m => (
            <div key={m.email} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderTop: '1px solid var(--color-border)' }}>
              <div style={{ width: 40, height: 40, borderRadius: 9999, background: m.color, color: 'var(--color-text-inverse)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700 }}>
                {m.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>{m.name}</div>
                <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{m.email}</div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>Last active {m.last}</div>
              <span className={`nx-badge ${m.role === 'Owner' ? 'nx-badge--info' : 'nx-badge--default'}`}>{m.role}</span>
              <button style={{ background: 'none', border: 'none', padding: 4, cursor: 'pointer' }}>{icon('more-vertical', 16, 'secondary')}</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ===== SETTINGS ===========================================================
function Settings() {
  return (
    <div style={{ padding: 24, background: 'var(--color-bg)', height: '100%', overflowY: 'auto' }}>
      <h1 style={{ margin: '0 0 20px', fontSize: 24, fontWeight: 700 }}>Settings</h1>
      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 20 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {['General','Appearance','Operating Hours','Payments & Tax','Localization','Notifications','Integrations'].map((s, i) => (
            <button key={s} style={{ textAlign: 'left', padding: '10px 12px', borderRadius: 6, border: 'none', background: i === 1 ? 'var(--color-primary-light)' : 'transparent', color: i === 1 ? 'var(--color-primary)' : 'var(--color-text-secondary)', fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>{s}</button>
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="nx-card">
            <div className="nx-card__header"><h3 className="nx-card__title">Brand color</h3></div>
            <div className="nx-card__content">
              <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--color-text-secondary)' }}>The primary color used in your customer ordering screen. Overrides the default Nexus blue.</p>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {['#2563eb','#16a34a','#dc2626','#d97706','#7c3aed','#db2777','#0891b2','#111827'].map((c, i) => (
                  <button key={c} style={{ width: 40, height: 40, borderRadius: 9999, background: c, border: i === 0 ? '3px solid var(--color-text)' : '1px solid var(--color-border)', cursor: 'pointer', padding: 0, position: 'relative' }}>
                    {i === 0 && <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon('check', 18, 'inverse')}</span>}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="nx-card">
            <div className="nx-card__header"><h3 className="nx-card__title">Cover image</h3></div>
            <div className="nx-card__content">
              <div style={{ height: 140, borderRadius: 8, border: '2px dashed var(--color-border)', background: 'var(--color-bg-surface)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-tertiary)', gap: 8 }}>
                {icon('image', 28, 'tertiary')}
                <div style={{ fontSize: 13 }}>Drop an image or <span style={{ color: 'var(--color-primary)', fontWeight: 500, cursor: 'pointer' }}>browse</span></div>
                <div style={{ fontSize: 11 }}>Recommended 1920×1080, max 2MB</div>
              </div>
            </div>
          </div>
          <div className="nx-card">
            <div className="nx-card__header"><h3 className="nx-card__title">Theme mode</h3></div>
            <div className="nx-card__content" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[['Follow system', 'Match customer device', true], ['Light always', 'Keep light mode regardless', false], ['Dark always', 'Keep dark mode regardless', false]].map(([l, d, on]) => (
                <label key={l} style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                  <div style={{ width: 18, height: 18, borderRadius: 9999, border: `2px solid ${on ? 'var(--color-primary)' : 'var(--color-border-strong)'}`, background: on ? 'var(--color-primary)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {on && <div style={{ width: 6, height: 6, borderRadius: 9999, background: 'var(--color-text-inverse)' }} />}
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{l}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{d}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== ORDER CONFIRMATION (customer) ======================================
function OrderConfirmation() {
  return (
    <div style={{ height: '100%', background: 'var(--color-bg-surface)', overflowY: 'auto' }}>
      <div style={{ maxWidth: 560, margin: '0 auto', padding: 24 }}>
        <div style={{ textAlign: 'center', padding: '32px 16px' }}>
          <div style={{ width: 72, height: 72, borderRadius: 9999, background: 'var(--color-success-light)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
            {icon('check-circle', 36, 'primary')}
          </div>
          <h1 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 700 }}>Order placed!</h1>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--color-text-secondary)' }}>Your order is being prepared. Estimated time: <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>~15 min</span></p>
        </div>
        <div className="nx-card" style={{ marginBottom: 12 }}>
          <div className="nx-card__header">
            <div>
              <p className="nx-eyebrow" style={{ margin: 0 }}>Order</p>
              <h3 className="nx-card__title" style={{ fontFamily: 'var(--font-mono)' }}>#AB3F2C</h3>
            </div>
            <span className="nx-badge nx-badge--warning">Preparing</span>
          </div>
          <div className="nx-card__content">
            {[['Dan Dan Noodles', 2, 14.00], ['Mapo Tofu', 1, 12.50], ['Cucumber Salad', 2, 6.00]].map(([n, q, p]) => (
              <div key={n} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: 14, borderBottom: '1px solid var(--color-border)' }}>
                <span><span style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}>{q}×</span>&nbsp; {n}</span>
                <span style={{ fontFamily: 'var(--font-mono)' }}>${(q * p).toFixed(2)}</span>
              </div>
            ))}
            {[['Subtotal', 52.50], ['Tax (8.75%)', 4.59]].map(([l, v]) => (
              <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13, color: 'var(--color-text-secondary)' }}>
                <span>{l}</span><span style={{ fontFamily: 'var(--font-mono)' }}>${v.toFixed(2)}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0 0', marginTop: 6, borderTop: '1px solid var(--color-border)', fontSize: 16, fontWeight: 700 }}>
              <span>Total</span><span style={{ fontFamily: 'var(--font-mono)' }}>$57.09</span>
            </div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <button className="nx-btn nx-btn--ghost nx-btn--lg">{icon('plus', 16, 'secondary')}Add items</button>
          <button className="nx-btn nx-btn--primary nx-btn--lg">{icon('refresh-cw', 16, 'inverse')}Track order</button>
        </div>
        <button className="nx-btn nx-btn--ghost nx-btn--md" style={{ width: '100%', marginTop: 8, color: 'var(--color-text-secondary)' }}>Back to menu</button>
      </div>
    </div>
  );
}

window.AllScreens = { LoginScreen, TenantPicker, MenuManagement, Promotions, QRCodes, Staff, Settings, OrderConfirmation };
