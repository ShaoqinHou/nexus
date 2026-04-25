/* eslint-disable @typescript-eslint/no-unused-vars */
// The "Zoo" — Nexus component catalog for humans AND AI agents.
// Dev-only. Mount via routeTree when import.meta.env.DEV. Each showcase
// renders the real component (imported from @web/components), never a
// copy — changing the primitive updates its showcase on save (S-ZOO-PAGE).
//
// Layout: left sidebar lists registry entries, right pane shows the
// selected showcase. Chrome exposes the dark toggle + cuisine-theme
// selector so every component can be spot-checked under all 10 themes
// and both modes without leaving the page.
//
// Adding a primitive/pattern:
//   1. Add the component under components/ui/ or components/patterns/
//   2. Add its entry to components/registry.json
//   3. Add a case in the `showcases` map below
//   4. The Zoo picks it up on next dev reload

import { useState, type ReactNode } from 'react';
import { useParams, useNavigate, Link } from '@tanstack/react-router';
import { Moon, Sun } from 'lucide-react';

import {
  THEME_IDS,
  useTheme,
  type ThemeId,
} from '@web/platform/theme/ThemeProvider';
import {
  Button,
  Badge,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
  Dialog,
  Input,
  Toggle,
  Select,
  DietaryIcon,
  type DietaryIconName,
} from '@web/components/ui';
import {
  ConfirmButton,
  EmptyState,
  FormField,
  StatusBadge,
} from '@web/components/patterns';
import { Smile, Mail, AlertCircle, ShoppingBag } from 'lucide-react';

import registry from '@web/components/registry.json';

// ============================================================
// SHOWCASES — one per primitive + pattern + tokens + themes
// ============================================================

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-8">
      <h3 className="nx-h3 mb-3 text-text-secondary">{title}</h3>
      <div className="rounded-lg border border-border bg-bg-elevated p-6">
        {children}
      </div>
    </section>
  );
}

function ButtonShowcase() {
  const [loading, setLoading] = useState(false);
  return (
    <>
      <Section title="Variants">
        <div className="flex flex-wrap gap-3">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="ghost">Ghost</Button>
        </div>
      </Section>
      <Section title="Sizes (--hit-sm/md/lg tokens)">
        <div className="flex flex-wrap items-end gap-3">
          <Button size="sm">Small — 44px</Button>
          <Button size="md">Medium — 48px</Button>
          <Button size="lg">Large — 52px</Button>
        </div>
      </Section>
      <Section title="Loading / disabled">
        <div className="flex flex-wrap gap-3">
          <Button loading={loading} onClick={() => { setLoading(true); setTimeout(() => setLoading(false), 1500); }}>
            Click to load
          </Button>
          <Button disabled>Disabled</Button>
          <Button variant="destructive" loading>Saving…</Button>
        </div>
      </Section>
    </>
  );
}

function BadgeShowcase() {
  return (
    <Section title="Variants">
      <div className="flex flex-wrap gap-3">
        <Badge variant="default">default</Badge>
        <Badge variant="success">success</Badge>
        <Badge variant="warning">warning</Badge>
        <Badge variant="error">error</Badge>
        <Badge variant="info">info</Badge>
      </div>
    </Section>
  );
}

function CardShowcase() {
  return (
    <Section title="Composition">
      <Card>
        <CardHeader>
          <CardTitle>Card title</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="nx-body text-text-secondary">
            Card body content. Uses --color-bg-elevated + hairline --color-border + --shadow-sm.
            Works across light/dark and every theme.
          </p>
        </CardContent>
        <CardFooter>
          <Button variant="ghost">Cancel</Button>
          <Button>Confirm</Button>
        </CardFooter>
      </Card>
    </Section>
  );
}

function DialogShowcase() {
  const [open, setOpen] = useState(false);
  return (
    <Section title="Modal dialog">
      <Button onClick={() => setOpen(true)}>Open dialog</Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Confirm action"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => setOpen(false)}>Confirm</Button>
          </>
        }
      >
        <p className="nx-body text-text-secondary">
          This is a modal dialog. Overlay is z-40, dialog z-50 per the z-index budget.
        </p>
      </Dialog>
    </Section>
  );
}

function InputShowcase() {
  return (
    <>
      <Section title="States">
        <div className="space-y-4 max-w-md">
          <Input label="Empty" placeholder="Type here…" />
          <Input label="Filled" defaultValue="Alice Smith" />
          <Input label="With helper" helperText="Lowercase letters, numbers, and hyphens only" placeholder="demo-tenant" />
          <Input label="Error" error="Invalid email address" defaultValue="not-an-email" />
          <Input label="Disabled" disabled defaultValue="can't touch this" />
        </div>
      </Section>
    </>
  );
}

function ToggleShowcase() {
  const [a, setA] = useState(false);
  const [b, setB] = useState(true);
  return (
    <Section title="Boolean switch">
      <div className="space-y-3 max-w-md">
        <Toggle checked={a} onChange={setA} label="Off (state example)" />
        <Toggle checked={b} onChange={setB} label="On (state example)" />
        <Toggle checked={false} onChange={() => {}} label="Disabled" disabled />
      </div>
    </Section>
  );
}

function SelectShowcase() {
  const [value, setValue] = useState('mains');
  return (
    <Section title="Dropdown">
      <div className="max-w-md">
        <Select
          value={value}
          onChange={setValue}
          options={[
            { value: 'starters', label: 'Starters' },
            { value: 'mains', label: 'Mains' },
            { value: 'desserts', label: 'Desserts' },
            { value: 'drinks', label: 'Drinks' },
          ]}
        />
        <p className="nx-meta mt-2">Selected: {value}</p>
      </div>
    </Section>
  );
}

function DietaryIconShowcase() {
  const diets: DietaryIconName[] = ['vegan', 'vegetarian', 'pescatarian', 'halal', 'kosher'];
  const free: DietaryIconName[] = ['gluten-free', 'dairy-free', 'nut-free', 'soy-free', 'egg-free', 'shellfish-free', 'msg-free'];
  const contains: DietaryIconName[] = ['contains-nuts', 'contains-dairy', 'contains-shellfish', 'contains-egg', 'contains-soy', 'contains-sesame', 'contains-pork', 'contains-alcohol'];
  const spice: DietaryIconName[] = ['spice-1', 'spice-2', 'spice-3'];
  const promo: DietaryIconName[] = ['popular', 'new', 'seasonal', 'chefs-pick', 'house-special', 'hot', 'cold'];

  const row = (names: DietaryIconName[]) =>
    names.map((n) => (
      <div key={n} className="flex flex-col items-center gap-1 min-w-[84px]">
        <DietaryIcon name={n} size="lg" />
        <span className="nx-meta">{n}</span>
      </div>
    ));

  return (
    <>
      <Section title="Diets">
        <div className="flex flex-wrap gap-4">{row(diets)}</div>
      </Section>
      <Section title="Allergen-free">
        <div className="flex flex-wrap gap-4">{row(free)}</div>
      </Section>
      <Section title="Contains-allergen">
        <div className="flex flex-wrap gap-4 text-warning">{row(contains)}</div>
      </Section>
      <Section title="Spice levels">
        <div className="flex flex-wrap gap-4 text-danger">{row(spice)}</div>
      </Section>
      <Section title="Promo / meta">
        <div className="flex flex-wrap gap-4">{row(promo)}</div>
      </Section>
      <Section title="Sizes">
        <div className="flex items-end gap-6">
          <div className="flex flex-col items-center gap-1"><DietaryIcon name="vegan" size="sm" /><span className="nx-meta">sm / h-4</span></div>
          <div className="flex flex-col items-center gap-1"><DietaryIcon name="vegan" size="md" /><span className="nx-meta">md / h-5</span></div>
          <div className="flex flex-col items-center gap-1"><DietaryIcon name="vegan" size="lg" /><span className="nx-meta">lg / h-6</span></div>
        </div>
      </Section>
    </>
  );
}

function EmptyStateShowcase() {
  return (
    <Section title="No-data placeholder">
      <EmptyState
        icon={ShoppingBag}
        title="No orders yet"
        description="Orders will appear here when customers place them."
        action={{ label: 'Open kitchen display', onClick: () => alert('navigate…') }}
      />
    </Section>
  );
}

function FormFieldShowcase() {
  return (
    <Section title="Label + input + error wrapper">
      <div className="space-y-4 max-w-md">
        <FormField label="Email">
          <Input placeholder="you@example.com" />
        </FormField>
        <FormField label="Tenant slug" error="Must be unique">
          <Input defaultValue="demo" />
        </FormField>
      </div>
    </Section>
  );
}

function StatusBadgeShowcase() {
  const statuses = ['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'];
  return (
    <Section title="Order-status mapping">
      <div className="flex flex-wrap gap-2">
        {statuses.map((s) => (
          <StatusBadge key={s} status={s} />
        ))}
      </div>
    </Section>
  );
}

function ConfirmButtonShowcase() {
  return (
    <Section title="Two-click destructive action (3s auto-reset)">
      <ConfirmButton
        variant="destructive"
        confirmText="Really delete?"
        onConfirm={() => alert('Deleted!')}
      >
        Delete item
      </ConfirmButton>
    </Section>
  );
}

function TokensShowcase() {
  const swatches: Array<[string, string]> = [
    ['--color-bg', 'Page'],
    ['--color-bg-surface', 'Surface'],
    ['--color-bg-muted', 'Muted'],
    ['--color-bg-elevated', 'Elevated'],
    ['--color-primary', 'Primary'],
    ['--color-brand', 'Brand'],
    ['--color-success', 'Success'],
    ['--color-warning', 'Warning'],
    ['--color-danger', 'Danger'],
    ['--color-info', 'Info'],
  ];
  return (
    <>
      <Section title="Color tokens">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {swatches.map(([token, label]) => (
            <div key={token} className="rounded-md border border-border overflow-hidden">
              <div className="h-14" style={{ background: `var(${token})` }} />
              <div className="p-2">
                <div className="nx-label">{label}</div>
                <div className="nx-meta">{token}</div>
              </div>
            </div>
          ))}
        </div>
      </Section>
      <Section title="Radii">
        <div className="flex flex-wrap gap-3">
          {['sm', 'md', 'lg', 'xl', 'full'].map((r) => (
            <div key={r} className="flex flex-col items-center gap-1">
              <div className="h-14 w-14 bg-primary" style={{ borderRadius: `var(--radius-${r})` }} />
              <span className="nx-meta">--radius-{r}</span>
            </div>
          ))}
        </div>
      </Section>
      <Section title="Shadows">
        <div className="flex flex-wrap gap-6">
          {['sm', 'md', 'lg'].map((s) => (
            <div key={s} className="flex flex-col items-center gap-2">
              <div className="h-16 w-24 rounded-md bg-bg-elevated" style={{ boxShadow: `var(--shadow-${s})` }} />
              <span className="nx-meta">--shadow-{s}</span>
            </div>
          ))}
        </div>
      </Section>
      <Section title="Hit targets">
        <div className="flex flex-wrap items-end gap-3">
          {[['sm', 44], ['md', 48], ['lg', 52]].map(([n, px]) => (
            <div key={n as string} className="flex flex-col items-center gap-1">
              <button
                className="bg-primary text-text-inverse rounded-md px-4 min-w-[88px]"
                style={{ minHeight: `var(--hit-${n as string})` }}
                type="button"
              >
                --hit-{n as string}
              </button>
              <span className="nx-meta">{px}px</span>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}

function ThemesShowcase() {
  return (
    <>
      <Section title="All 10 themes (live)">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {THEME_IDS.map((id) => (
            <div
              key={id}
              data-theme={id}
              className="rounded-lg border border-border bg-bg-elevated p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="nx-label">{id}</span>
                <Badge variant="default">theme</Badge>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm">Primary</Button>
                <Button size="sm" variant="secondary">Secondary</Button>
                <Badge variant="success">OK</Badge>
                <Badge variant="error">ERR</Badge>
              </div>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}

// ============================================================
// REGISTRY LOOKUP — slug → showcase
// ============================================================

const showcases: Record<string, { title: string; render: () => ReactNode }> = {
  button:            { title: 'Button',             render: ButtonShowcase },
  badge:             { title: 'Badge',              render: BadgeShowcase },
  card:              { title: 'Card',               render: CardShowcase },
  dialog:            { title: 'Dialog',             render: DialogShowcase },
  input:             { title: 'Input',              render: InputShowcase },
  toggle:            { title: 'Toggle',             render: ToggleShowcase },
  select:            { title: 'Select',             render: SelectShowcase },
  'dietary-icon':    { title: 'DietaryIcon',        render: DietaryIconShowcase },
  'empty-state':     { title: 'EmptyState',         render: EmptyStateShowcase },
  'form-field':      { title: 'FormField',          render: FormFieldShowcase },
  'status-badge':    { title: 'StatusBadge',        render: StatusBadgeShowcase },
  'confirm-button':  { title: 'ConfirmButton',      render: ConfirmButtonShowcase },
  tokens:            { title: 'Tokens',             render: TokensShowcase },
  themes:            { title: 'Themes',             render: ThemesShowcase },
};

// ============================================================
// CHROME
// ============================================================

function ZooLayout({ slug }: { slug?: string }) {
  const navigate = useNavigate();
  const { theme, toggleTheme, themeId, setThemeId } = useTheme();

  const activeSlug = slug && showcases[slug] ? slug : null;
  const active = activeSlug ? showcases[activeSlug] : null;

  const primitives = (registry as any).primitives as Array<{
    name: string;
    zooRoute: string;
  }>;
  const patterns = (registry as any).patterns as Array<{
    name: string;
    zooRoute: string;
  }>;

  const slugFromRoute = (route: string) => route.replace(/^\/design\//, '');

  return (
    <div className="min-h-screen flex bg-bg">
      {/* Sidebar */}
      <aside className="w-64 shrink-0 border-r border-border bg-bg-surface p-4 overflow-y-auto">
        <h1 className="nx-h2 mb-4">
          Zoo <span className="nx-meta">(component catalog)</span>
        </h1>

        <nav className="space-y-6 nx-body">
          <div>
            <h3 className="nx-eyebrow mb-2">Foundations</h3>
            <ul className="space-y-1">
              {['tokens', 'themes'].map((s) => (
                <li key={s}>
                  <Link
                    to={`/design/${s}` as any}
                    className={`block px-2 py-1 rounded-sm hover:bg-bg-muted ${activeSlug === s ? 'bg-bg-muted text-primary font-medium' : ''}`}
                  >
                    {showcases[s]?.title ?? s}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="nx-eyebrow mb-2">Primitives ({primitives.length})</h3>
            <ul className="space-y-1">
              {primitives.map((p) => {
                const s = slugFromRoute(p.zooRoute);
                const has = !!showcases[s];
                return (
                  <li key={p.name}>
                    <Link
                      to={`/design/${s}` as any}
                      className={`block px-2 py-1 rounded-sm hover:bg-bg-muted ${activeSlug === s ? 'bg-bg-muted text-primary font-medium' : has ? '' : 'text-text-tertiary'}`}
                    >
                      {p.name}
                      {!has && <span className="nx-meta ml-1">(todo)</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>

          <div>
            <h3 className="nx-eyebrow mb-2">Patterns ({patterns.length})</h3>
            <ul className="space-y-1">
              {patterns.map((p) => {
                const s = slugFromRoute(p.zooRoute);
                const has = !!showcases[s];
                return (
                  <li key={p.name}>
                    <Link
                      to={`/design/${s}` as any}
                      className={`block px-2 py-1 rounded-sm hover:bg-bg-muted ${activeSlug === s ? 'bg-bg-muted text-primary font-medium' : has ? '' : 'text-text-tertiary'}`}
                    >
                      {p.name}
                      {!has && <span className="nx-meta ml-1">(todo)</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </nav>
      </aside>

      {/* Main pane */}
      <main className="flex-1 overflow-y-auto">
        {/* Chrome toolbar */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-bg-surface px-6 py-3">
          <div className="nx-label">
            {active ? active.title : 'Select a component'}
          </div>
          <div className="flex items-center gap-3">
            <label className="nx-meta">
              Theme:{' '}
              <select
                value={themeId}
                onChange={(e) => setThemeId(e.target.value as ThemeId)}
                className="ml-1 rounded-sm border border-border bg-bg-elevated px-2 py-1 nx-body"
              >
                {THEME_IDS.map((id) => (
                  <option key={id} value={id}>{id}</option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={toggleTheme}
              className="flex items-center gap-1 rounded-md px-2 py-1 hover:bg-bg-muted"
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              <span className="nx-meta">{theme}</span>
            </button>
          </div>
        </div>

        <div className="p-6 max-w-5xl">
          {active ? (
            <>
              <h2 className="nx-h1 mb-6">{active.title}</h2>
              {active.render()}
            </>
          ) : (
            <ZooIndex />
          )}
        </div>
      </main>
    </div>
  );
}

function ZooIndex() {
  return (
    <>
      <h2 className="nx-h1 mb-3">Nexus Design System</h2>
      <p className="nx-body text-text-secondary mb-6 max-w-2xl">
        Live catalog of every primitive and pattern under{' '}
        <code className="nx-code">@web/components</code>. Pick a component on the
        left to see its variants and spot-check it against any of the 10 cuisine
        themes in both light and dark mode.
      </p>
      <p className="nx-body text-text-secondary max-w-2xl">
        The zoo is a <em>reflection</em> of source, not a duplicate — each
        showcase imports the real component. Change a primitive in{' '}
        <code className="nx-code">components/ui/</code> and its showcase updates
        on save. Referenced by <code className="nx-code">
          .claude/workflow/design/standards.md § S-ZOO-PAGE
        </code>.
      </p>
    </>
  );
}

// ============================================================
// ROUTE ENTRY POINTS
// ============================================================

/** Used by `/design/` — no slug, shows the index splash. */
export function DesignZooIndexPage() {
  return <ZooLayout />;
}

/** Used by `/design/$slug` — picks a showcase by slug. */
export function DesignZooSlugPage() {
  const { slug } = useParams({ strict: false }) as { slug?: string };
  return <ZooLayout slug={slug} />;
}
