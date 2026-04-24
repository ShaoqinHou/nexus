/* global React */
const { useState } = React;

const Icon = ({ name, size = 20, color }) => (
  <img src={`../../assets/icons/${name}.svg`}
    style={{ width: size, height: size, flexShrink: 0, filter: color === 'primary' ? 'invert(29%) sepia(93%) saturate(3074%) hue-rotate(217deg) brightness(93%) contrast(89%)' : undefined, opacity: color === 'secondary' ? 0.7 : 1 }} />
);

const NAV_GROUPS = [
  { label: 'Operations', items: [
    { label: 'Orders', icon: 'layout-dashboard', key: 'orders' },
    { label: 'Kitchen', icon: 'chef-hat', key: 'kitchen' },
  ]},
  { label: 'Menu', items: [
    { label: 'Menu', icon: 'book-open', key: 'menu' },
    { label: 'Combos', icon: 'package', key: 'combos' },
    { label: 'Modifiers', icon: 'settings-2', key: 'modifiers' },
  ]},
  { label: 'Marketing', items: [
    { label: 'Promotions', icon: 'tag', key: 'promotions' },
    { label: 'QR Codes', icon: 'qr-code', key: 'qr' },
  ]},
  { label: 'Management', items: [
    { label: 'Analytics', icon: 'bar-chart-3', key: 'analytics' },
    { label: 'Staff', icon: 'users', key: 'staff' },
    { label: 'Settings', icon: 'settings-2', key: 'settings' },
  ]},
];

function Sidebar({ active, onNavigate, collapsed, onToggleCollapse, tenantName = 'Demo Restaurant' }) {
  return (
    <aside style={{
      width: collapsed ? 64 : 256, flexShrink: 0, background: 'var(--color-bg-elevated)',
      borderRight: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', transition: 'width .2s'
    }}>
      <div style={{ height: 64, padding: '0 16px', borderBottom: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {!collapsed && <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--color-text)' }}>{tenantName}</span>}
        <button onClick={onToggleCollapse} className="nx-btn nx-btn--ghost" style={{ minHeight: 44, minWidth: 44, padding: 0 }}>
          <Icon name="chevron-left" size={18} color="secondary" style={{ transform: collapsed ? 'rotate(180deg)' : 'none' }} />
        </button>
      </div>
      <nav style={{ flex: 1, overflowY: 'auto', padding: '16px 8px' }}>
        <NavItem icon="layout-dashboard" label="Dashboard" active={active === 'dashboard'} collapsed={collapsed} onClick={() => onNavigate('dashboard')} />
        {NAV_GROUPS.map(group => (
          <div key={group.label} style={{ marginBottom: 12 }}>
            {!collapsed && <p className="nx-eyebrow" style={{ padding: '8px 12px 4px' }}>{group.label}</p>}
            {group.items.map(item => (
              <NavItem key={item.key} icon={item.icon} label={item.label} active={active === item.key} collapsed={collapsed} onClick={() => onNavigate(item.key)} />
            ))}
          </div>
        ))}
      </nav>
      {!collapsed && (
        <div style={{ borderTop: '1px solid var(--color-border)', padding: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--color-text)' }}>Sarah Kim</div>
          <div style={{ fontSize: 12, color: 'var(--color-text-tertiary)' }}>sarah@demo-restaurant.com</div>
        </div>
      )}
    </aside>
  );
}

function NavItem({ icon, label, active, collapsed, onClick }) {
  const [hover, setHover] = useState(false);
  const bg = active ? 'var(--color-primary-light)' : (hover ? 'var(--color-bg-muted)' : 'transparent');
  const color = active ? 'var(--color-primary)' : (hover ? 'var(--color-text)' : 'var(--color-text-secondary)');
  return (
    <button onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', minHeight: 44, width: '100%',
        borderRadius: 6, border: 'none', background: bg, color, fontSize: 14, fontWeight: 500, cursor: 'pointer', marginBottom: 2,
        fontFamily: 'inherit', transition: 'background .15s, color .15s' }}>
      <Icon name={icon} size={18} color={active ? 'primary' : 'secondary'} />
      {!collapsed && <span>{label}</span>}
    </button>
  );
}

function TopBar({ title, onToggleTheme, theme }) {
  return (
    <header style={{ height: 64, padding: '0 24px', borderBottom: '1px solid var(--color-border)', background: 'var(--color-bg-elevated)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: 'var(--color-text)' }}>{title}</h2>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button className="nx-btn nx-btn--ghost" style={{ minWidth: 44, padding: 0 }}><Icon name="help-circle" size={18} color="secondary" /></button>
        <button className="nx-btn nx-btn--ghost" style={{ minWidth: 44, padding: 0 }} onClick={onToggleTheme}><Icon name={theme === 'dark' ? 'sun' : 'moon'} size={18} color="secondary" /></button>
        <button className="nx-btn nx-btn--ghost nx-btn--sm"><Icon name="log-out" size={16} color="secondary" /><span>Logout</span></button>
      </div>
    </header>
  );
}

window.MerchantShell = { Sidebar, TopBar, NavItem, Icon };
