/* global React */
const { useState, useMemo } = React;

const Icon = ({ name, size = 20, color, style }) => (
  <img src={`../../assets/icons/${name}.svg`}
    style={{ width: size, height: size, flexShrink: 0,
      filter: color === 'inverse' ? 'brightness(0) invert(1)' : undefined,
      opacity: color === 'tertiary' ? 0.5 : color === 'secondary' ? 0.7 : 1,
      ...style }} />
);

// —— Data ——————————————————————————————————————————————————
const MENU = [
  { id: 'starters', name: 'Starters', items: [
    { id: 's1', name: 'Scallion Pancake', desc: 'Flaky, hand-folded, served with ginger-soy dip.', price: 5.50, tags: ['vegetarian','popular'] },
    { id: 's2', name: 'Cucumber Salad', desc: 'Smashed Persian cucumbers, garlic, chili oil, black vinegar.', price: 6.00, tags: ['vegan','spicy'] },
    { id: 's3', name: 'Xiao Long Bao (6)', desc: 'Soup dumplings. Pork & ginger broth filling.', price: 11.00, tags: ['popular'] },
  ]},
  { id: 'noodles', name: 'Noodles & Rice', items: [
    { id: 'n1', name: 'Dan Dan Noodles', desc: 'Hand-pulled noodles, sesame paste, chili crisp, pickled mustard greens.', price: 14.00, tags: ['spicy','popular'], featured: true },
    { id: 'n2', name: 'Beef Chow Fun', desc: 'Wide rice noodles wok-fired with scallions and flank steak.', price: 16.00 },
    { id: 'n3', name: 'Yangzhou Fried Rice', desc: 'Egg, shrimp, char siu, peas.', price: 13.00, featured: true },
  ]},
  { id: 'mains', name: 'Mains', items: [
    { id: 'm1', name: 'Mapo Tofu', desc: 'Silken tofu, fermented bean paste, Sichuan peppercorn, ground pork.', price: 12.50, tags: ['spicy'], featured: true },
    { id: 'm2', name: 'Kung Pao Chicken', desc: 'Diced chicken thigh, peanuts, dried chilies, Shaoxing wine.', price: 15.00, tags: ['spicy'] },
    { id: 'm3', name: 'Twice-Cooked Pork', desc: 'Pork belly braised, then wok-fried with leeks and fermented bean paste.', price: 17.00 },
  ]},
  { id: 'dessert', name: 'Dessert', items: [
    { id: 'd1', name: 'Mango Pudding', desc: 'Alphonso mango, coconut cream.', price: 6.50, tags: ['vegetarian'] },
    { id: 'd2', name: 'Sesame Mochi (3)', desc: 'Glutinous rice, black sesame, honeyed peanuts.', price: 7.00, tags: ['vegetarian'] },
  ]},
];

const TAG_COLORS = {
  vegetarian: { bg: 'var(--color-success-light)', fg: 'var(--color-success)' },
  vegan:      { bg: 'var(--color-success-light)', fg: 'var(--color-success)' },
  spicy:      { bg: 'var(--color-warning-light)', fg: 'var(--color-warning)' },
  popular:    { bg: 'var(--color-warning-light)', fg: 'var(--color-warning)' },
};

// —— Components ————————————————————————————————————————————
function TableChip({ n = 5 }) {
  return <span style={{ padding: '4px 10px', borderRadius: 9999, background: 'var(--color-bg-muted)',
    fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)' }}>Table {n}</span>;
}

function Tag({ name }) {
  const c = TAG_COLORS[name] || { bg: 'var(--color-bg-muted)', fg: 'var(--color-text-secondary)' };
  return <span style={{ display: 'inline-flex', alignItems: 'center', borderRadius: 9999,
    padding: '2px 8px', fontSize: 11, fontWeight: 500, background: c.bg, color: c.fg, textTransform: 'capitalize' }}>{name}</span>;
}

function MenuItemCard({ item, qty, onAdd, onDec }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-lg)', background: 'var(--color-bg-elevated)', overflow: 'hidden' }}>
      <div style={{ width: '100%', height: 144, background: 'var(--color-bg-muted)',
        display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="utensils-crossed" size={28} color="tertiary" />
      </div>
      <div style={{ padding: 12, flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'start' }}>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>{item.name}</h3>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-primary)', whiteSpace: 'nowrap', fontFamily: 'var(--font-mono)' }}>${item.price.toFixed(2)}</span>
        </div>
        <p style={{ margin: 0, fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.4,
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{item.desc}</p>
        {item.tags && <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 2 }}>{item.tags.map(t => <Tag key={t} name={t} />)}</div>}
      </div>
      <div style={{ padding: 12, paddingTop: 0, display: 'flex', justifyContent: 'flex-end' }}>
        {qty === 0 ? (
          <button onClick={() => onAdd(item)} aria-label={`Add ${item.name}`}
            style={{ height: 48, width: 48, borderRadius: 9999, border: 'none',
              background: 'var(--color-primary)', color: 'white', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 400 }}>
            <Icon name="plus" size={20} color="inverse" />
          </button>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={() => onDec(item)} style={{ height: 40, width: 40, borderRadius: 9999,
              border: '1px solid var(--color-border)', background: 'var(--color-bg)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="minus" size={16} color="secondary" />
            </button>
            <span style={{ fontSize: 14, fontWeight: 600, minWidth: 20, textAlign: 'center', fontFamily: 'var(--font-mono)' }}>{qty}</span>
            <button onClick={() => onAdd(item)} style={{ height: 40, width: 40, borderRadius: 9999,
              border: 'none', background: 'var(--color-primary)', color: 'white', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="plus" size={16} color="inverse" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function CategoryRail({ active, onSelect }) {
  return (
    <nav style={{ width: 208, flexShrink: 0, background: 'var(--color-bg)', borderRight: '1px solid var(--color-border)',
      padding: '16px 12px', position: 'sticky', top: 0, height: '100vh', overflowY: 'auto' }}>
      <div style={{ marginBottom: 12 }}><TableChip /></div>
      <div style={{ position: 'relative', marginBottom: 16 }}>
        <Icon name="search" size={14} color="tertiary" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
        <input placeholder="Search menu..." style={{ width: '100%', height: 48, padding: '0 12px 0 34px',
          borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'var(--color-bg)',
          color: 'var(--color-text)', fontSize: 14, outline: 'none', fontFamily: 'inherit' }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {MENU.map(cat => (
          <button key={cat.id} onClick={() => onSelect(cat.id)}
            style={{ textAlign: 'left', padding: '10px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
              fontSize: 14, fontWeight: 600, fontFamily: 'inherit', transition: 'background .15s, color .15s',
              background: active === cat.id ? 'var(--color-primary)' : 'transparent',
              color: active === cat.id ? 'var(--color-text-inverse)' : 'var(--color-text-secondary)' }}>
            {cat.name}
          </button>
        ))}
      </div>
    </nav>
  );
}

function FeaturedStrip({ onAdd }) {
  const featured = MENU.flatMap(c => c.items).filter(i => i.featured);
  return (
    <div style={{ padding: '16px 16px 4px' }}>
      <h2 style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 700, color: 'var(--color-text)' }}>Popular</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {featured.map(i => (
          <button key={i.id} onClick={() => onAdd(i)}
            style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)',
              borderRadius: 12, overflow: 'hidden', cursor: 'pointer', padding: 0, textAlign: 'left' }}>
            <div style={{ width: '100%', height: 80, background: 'var(--color-bg-muted)',
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="utensils-crossed" size={20} color="tertiary" />
            </div>
            <div style={{ padding: 8 }}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{i.name}</p>
              <p style={{ margin: '2px 0 0', fontSize: 12, fontWeight: 600, color: 'var(--color-primary)', fontFamily: 'var(--font-mono)' }}>${i.price.toFixed(2)}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function CartSidebar({ cart, onInc, onDec, onClear, onPlace }) {
  const entries = Object.entries(cart).filter(([,q]) => q > 0);
  const items = entries.map(([id, qty]) => {
    const item = MENU.flatMap(c => c.items).find(i => i.id === id);
    return { ...item, qty };
  });
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);
  const tax = subtotal * 0.0875;
  const total = subtotal + tax;

  return (
    <aside style={{ width: 340, flexShrink: 0, borderLeft: '1px solid var(--color-border)',
      background: 'var(--color-bg)', display: 'flex', flexDirection: 'column', height: '100vh', position: 'sticky', top: 0 }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon name="shopping-bag" size={18} color="secondary" />
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--color-text)' }}>Your Order</h2>
          {items.length > 0 && <span className="nx-badge nx-badge--info">{items.reduce((s,i)=>s+i.qty,0)}</span>}
        </div>
        {items.length > 0 && (
          <button onClick={onClear} style={{ background: 'none', border: 'none', color: 'var(--color-text-tertiary)',
            cursor: 'pointer', padding: 6, display: 'flex', alignItems: 'center' }}><Icon name="trash-2" size={16} color="secondary" /></button>
        )}
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 20px' }}>
        {items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--color-text-tertiary)' }}>
            <div style={{ background: 'var(--color-bg-muted)', borderRadius: 9999, padding: 16, display: 'inline-flex', marginBottom: 12 }}>
              <Icon name="shopping-bag" size={24} color="tertiary" />
            </div>
            <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 600, color: 'var(--color-text)' }}>Cart is empty</p>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--color-text-secondary)' }}>Add items from the menu to get started.</p>
          </div>
        ) : items.map(i => (
          <div key={i.id} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--color-border)' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--color-text)' }}>{i.name}</p>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}>${i.price.toFixed(2)} each</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                <button onClick={() => onDec(i)} style={{ height: 28, width: 28, borderRadius: 9999, border: '1px solid var(--color-border)',
                  background: 'var(--color-bg)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="minus" size={12} color="secondary" />
                </button>
                <span style={{ fontSize: 12, fontWeight: 600, minWidth: 16, textAlign: 'center', fontFamily: 'var(--font-mono)' }}>{i.qty}</span>
                <button onClick={() => onInc(i)} style={{ height: 28, width: 28, borderRadius: 9999, border: 'none',
                  background: 'var(--color-primary)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="plus" size={12} color="inverse" />
                </button>
              </div>
            </div>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text)', whiteSpace: 'nowrap', fontFamily: 'var(--font-mono)' }}>${(i.price * i.qty).toFixed(2)}</span>
          </div>
        ))}
      </div>
      {items.length > 0 && (
        <div style={{ padding: 20, borderTop: '1px solid var(--color-border)', background: 'var(--color-bg-surface)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 4 }}>
            <span>Subtotal</span><span style={{ fontFamily: 'var(--font-mono)' }}>${subtotal.toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 8 }}>
            <span>Tax (8.75%)</span><span style={{ fontFamily: 'var(--font-mono)' }}>${tax.toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 700, color: 'var(--color-text)', marginBottom: 12 }}>
            <span>Total</span><span style={{ fontFamily: 'var(--font-mono)' }}>${total.toFixed(2)}</span>
          </div>
          <button onClick={onPlace} className="nx-btn nx-btn--primary nx-btn--lg" style={{ width: '100%' }}>Place Order</button>
        </div>
      )}
    </aside>
  );
}

function FloatingActions() {
  return (
    <div style={{ position: 'absolute', bottom: 24, left: 232, display: 'flex', flexDirection: 'column', gap: 8, zIndex: 10 }}>
      <button style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 16px', height: 52, borderRadius: 9999,
        border: 'none', background: 'var(--color-success)', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer',
        boxShadow: 'var(--shadow-lg)', fontFamily: 'inherit' }}>
        <Icon name="receipt" size={18} color="inverse" />Request Bill
      </button>
      <button style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 16px', height: 52, borderRadius: 9999,
        border: 'none', background: 'var(--color-warning)', color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer',
        boxShadow: 'var(--shadow-lg)', fontFamily: 'inherit' }}>
        <Icon name="bell-ring" size={18} color="inverse" />Call Waiter
      </button>
    </div>
  );
}

window.CustomerParts = { MENU, CategoryRail, FeaturedStrip, MenuItemCard, CartSidebar, FloatingActions, TableChip, Icon, Tag };
