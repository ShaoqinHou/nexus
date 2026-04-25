/* global React */
// Shared themed customer menu screen — used in comparison canvas + simulator.
// Renders a single restaurant menu using whatever theme tokens are active.

const { useState } = React;

// ---------- Inline icon helper ----------
const DI = ({ name, size = 18, color = 'currentColor' }) => (
  <svg width={size} height={size} style={{ color }} aria-hidden="true">
    <use href={`../assets/dietary-icons.svg#di-${name}`} />
  </svg>
);

// ---------- Demo data ----------
const SAMPLE_MENU = {
  classic: {
    name: 'Marlowe Diner', tagline: 'American comfort, since 1962',
    sections: [
      { id: 's1', name: 'Plates', items: [
        { id: 'i1', name: 'Buttermilk Fried Chicken', desc: 'House pickles, hot honey, brioche', price: '18.50', tags: ['popular'], img: '🍗' },
        { id: 'i2', name: 'Marlowe Burger', desc: 'Aged cheddar, caramelized onion, secret sauce', price: '17.00', tags: ['popular'], img: '🍔' },
        { id: 'i3', name: 'Garden Bowl', desc: 'Roasted squash, farro, tahini, pomegranate', price: '15.00', tags: ['vegetarian','vegan'], img: '🥗' },
      ]},
    ],
  },
  trattoria: {
    name: 'Da Lucia', tagline: 'Cucina romana · since 1978',
    sections: [
      { id: 's1', name: 'Primi', items: [
        { id: 'i1', name: 'Cacio e Pepe', desc: 'Tonnarelli, pecorino romano, black pepper', price: '19.00', tags: ['vegetarian','chefs-pick'], img: '🍝' },
        { id: 'i2', name: 'Bucatini all\'Amatriciana', desc: 'Guanciale, San Marzano, pecorino', price: '21.00', tags: ['popular'], img: '🍝' },
        { id: 'i3', name: 'Carciofi alla Giudia', desc: 'Twice-fried Roman artichokes, lemon', price: '14.00', tags: ['vegetarian','seasonal'], img: '🌿' },
      ]},
    ],
  },
  izakaya: {
    name: 'Tori-Bar Hachi', tagline: '炭火焼鳥 · charcoal-grilled skewers',
    sections: [
      { id: 's1', name: 'Skewers', items: [
        { id: 'i1', name: 'Negima', desc: 'Chicken thigh, scallion, tare', price: '4.50', tags: ['popular'], img: '🍢' },
        { id: 'i2', name: 'Tsukune', desc: 'Chicken meatball, egg yolk, tare', price: '5.50', tags: ['chefs-pick'], img: '🍢' },
        { id: 'i3', name: 'Mapo Tofu', desc: 'Sichuan peppercorn, fermented bean', price: '14.00', tags: ['spice-2','vegetarian'], img: '🌶️' },
      ]},
    ],
  },
  'bubble-tea': {
    name: 'Mochi & Milk', tagline: 'Boba · soft serve · taro everything',
    sections: [
      { id: 's1', name: 'Signature Drinks', items: [
        { id: 'i1', name: 'Taro Cloud Latte', desc: 'Stone-ground taro, oat milk, brown sugar pearls', price: '6.80', tags: ['popular','cold'], img: '🧋' },
        { id: 'i2', name: 'Matcha Strawberry', desc: 'Ceremonial matcha, fresh strawberry purée', price: '7.20', tags: ['new','seasonal','cold'], img: '🍵' },
        { id: 'i3', name: 'Black Sugar Mochi', desc: 'Hokkaido milk, chewy mochi, kuromitsu', price: '6.50', tags: ['chefs-pick'], img: '🍡' },
      ]},
    ],
  },
  sichuan: {
    name: '川味老灶 · Old Stove', tagline: '正宗川菜 · authentic Sichuan',
    sections: [
      { id: 's1', name: '招牌菜 · Signatures', items: [
        { id: 'i1', name: '麻婆豆腐 · Mapo Tofu', desc: 'Silken tofu, fermented bean, peppercorn', price: '16.80', tags: ['popular','spice-3','vegetarian'], img: '🌶️' },
        { id: 'i2', name: '夫妻肺片 · Sliced Beef in Chili', desc: 'Beef shank & tripe, chili oil, peanuts', price: '18.80', tags: ['chefs-pick','spice-3','contains-nuts'], img: '🥩' },
        { id: 'i3', name: '回锅肉 · Twice-Cooked Pork', desc: 'Pork belly, leek, broad bean paste', price: '19.80', tags: ['popular','spice-2','contains-pork'], img: '🥓' },
      ]},
    ],
  },
  counter: {
    name: 'COUNTER NO. 7', tagline: 'Sandwiches / coffee / no nonsense',
    sections: [
      { id: 's1', name: 'Today', items: [
        { id: 'i1', name: 'Hot Italian', desc: 'Mortadella, salami, provolone, giardiniera', price: '14.00', tags: ['popular','contains-pork'], img: '🥪' },
        { id: 'i2', name: 'Egg & Cheese', desc: 'Soft scramble, american, salt-cured tomato', price: '9.00', tags: ['vegetarian','contains-egg','contains-dairy'], img: '🍳' },
        { id: 'i3', name: 'Cold Brew', desc: 'House blend, 18hr steep, served black', price: '5.00', tags: ['cold','popular'], img: '☕' },
      ]},
    ],
  },
};

// ---------- Tag presentation ----------
const TAG_DEFS = {
  vegan:        { label: 'Vegan',        icon: 'vegan',        kind: 'good' },
  vegetarian:   { label: 'Vegetarian',   icon: 'vegetarian',   kind: 'good' },
  popular:      { label: 'Popular',      icon: 'popular',      kind: 'highlight' },
  new:          { label: 'New',          icon: 'new',          kind: 'highlight' },
  seasonal:     { label: 'Seasonal',     icon: 'seasonal',     kind: 'highlight' },
  'chefs-pick': { label: "Chef's Pick",  icon: 'chefs-pick',   kind: 'highlight' },
  'spice-1':    { label: 'Mild',         icon: 'spice-1',      kind: 'spice' },
  'spice-2':    { label: 'Medium',       icon: 'spice-2',      kind: 'spice' },
  'spice-3':    { label: 'Hot',          icon: 'spice-3',      kind: 'spice' },
  cold:         { label: 'Iced',         icon: 'cold',         kind: 'temp' },
  hot:          { label: 'Hot',          icon: 'hot',          kind: 'temp' },
  'contains-nuts':      { label: 'Nuts',      icon: 'contains-nuts',      kind: 'warn' },
  'contains-dairy':     { label: 'Dairy',     icon: 'contains-dairy',     kind: 'warn' },
  'contains-shellfish': { label: 'Shellfish', icon: 'contains-shellfish', kind: 'warn' },
  'contains-egg':       { label: 'Egg',       icon: 'contains-egg',       kind: 'warn' },
  'contains-pork':      { label: 'Pork',      icon: 'contains-pork',      kind: 'warn' },
};

const Tag = ({ id }) => {
  const def = TAG_DEFS[id]; if (!def) return null;
  const styles = {
    good: { bg: 'var(--color-success-light)', fg: 'var(--color-success)' },
    highlight: { bg: 'var(--color-brand-light)', fg: 'var(--color-brand)' },
    spice: { bg: 'var(--color-danger-light)', fg: 'var(--color-danger)' },
    temp: { bg: 'var(--color-info-light)', fg: 'var(--color-info)' },
    warn: { bg: 'var(--color-bg-muted)', fg: 'var(--color-text-secondary)' },
  }[def.kind];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 8px 3px 6px',
      borderRadius: 'var(--radius-chip)',
      background: styles.bg, color: styles.fg,
      fontSize: 11, fontWeight: 600, lineHeight: 1.2,
      whiteSpace: 'nowrap',
    }}>
      <DI name={def.icon} size={13} /> {def.label}
    </span>
  );
};

// ---------- Themed menu screen ----------
window.ThemedMenu = function ThemedMenu({ theme, density = 'normal' }) {
  const data = SAMPLE_MENU[theme] || SAMPLE_MENU.classic;
  const compact = density === 'compact';

  return (
    <div data-theme={theme} style={{
      width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
      background: 'var(--color-bg)', color: 'var(--color-text)',
      fontFamily: 'var(--font-sans)',
    }}>
      {/* Header / hero */}
      <div style={{
        padding: compact ? '20px 20px 14px' : '32px 28px 22px',
        background: 'var(--color-bg-surface)',
        borderBottom: '1px solid var(--color-border)',
      }}>
        <div style={{
          fontFamily: 'var(--font-display, var(--font-sans))',
          fontWeight: 'var(--font-display-weight, 700)',
          letterSpacing: 'var(--font-display-tracking, -0.01em)',
          fontSize: compact ? 26 : 32,
          color: 'var(--color-text)', lineHeight: 1.1, marginBottom: 4,
        }}>
          {data.name}
        </div>
        <div style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
          {data.tagline}
        </div>
      </div>

      {/* Menu sections */}
      <div style={{ flex: 1, padding: compact ? '16px 20px' : '24px 28px', overflow: 'hidden' }}>
        {data.sections.map(sec => (
          <div key={sec.id} style={{ marginBottom: 20 }}>
            <div style={{
              fontFamily: 'var(--font-display, var(--font-sans))',
              fontSize: 14, fontWeight: 600,
              textTransform: 'uppercase', letterSpacing: '0.08em',
              color: 'var(--color-text-secondary)',
              marginBottom: 12,
              paddingBottom: 8,
              borderBottom: '1px solid var(--color-border)',
            }}>{sec.name}</div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--density-row-gap, 12px)' }}>
              {sec.items.map(item => (
                <div key={item.id} style={{
                  display: 'flex', gap: 14,
                  padding: 'var(--density-card-padding, 14px)',
                  background: 'var(--color-bg-elevated)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-card)',
                  boxShadow: 'var(--shadow-sm)',
                }}>
                  <div style={{
                    width: 56, height: 56, flexShrink: 0,
                    background: 'var(--color-bg-muted)',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 28,
                  }}>{item.img}</div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                      gap: 12, marginBottom: 4,
                    }}>
                      <div style={{
                        fontFamily: 'var(--font-display, var(--font-sans))',
                        fontWeight: 600, fontSize: 15, color: 'var(--color-text)',
                        letterSpacing: 'var(--font-display-tracking, -0.005em)',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>{item.name}</div>
                      <div style={{
                        fontFamily: 'var(--font-mono)', fontSize: 14,
                        fontWeight: 600, color: 'var(--color-text)',
                        whiteSpace: 'nowrap',
                      }}>${item.price}</div>
                    </div>
                    <div style={{
                      fontSize: 12.5, color: 'var(--color-text-secondary)',
                      lineHeight: 1.4, marginBottom: 8,
                    }}>{item.desc}</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {item.tags.map(t => <Tag key={t} id={t} />)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Sticky CTA */}
      <div style={{
        padding: '14px 20px',
        borderTop: '1px solid var(--color-border)',
        background: 'var(--color-bg-elevated)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>3 items</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 600 }}>$50.30</div>
        </div>
        <button style={{
          height: 48, padding: '0 22px',
          background: 'var(--color-primary)', color: 'var(--color-text-inverse)',
          border: 'none', borderRadius: 'var(--radius-btn)',
          fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: 14,
          cursor: 'pointer',
        }}>View Cart</button>
      </div>
    </div>
  );
};
