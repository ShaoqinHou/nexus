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
  ImageUpload,
  ToastContainer,
  type ToastData,
  TourOverlay,
  LanguagePicker,
  DietaryIcon,
  type DietaryIconName,
} from '@web/components/ui';
import {
  ConfirmButton,
  EmptyState,
  FormField,
  StatusBadge,
  DataTable,
  PullToRefreshIndicator,
  AddToCartToast,
} from '@web/components/patterns';
import {
  OrderTracker,
  Receipt,
  PromoCard,
  CheckoutSummary,
} from '@web/components/patterns/themed';
import { ErrorBoundary } from '@web/components/patterns/ErrorBoundary';
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
        <DietaryIcon name={n} size="lg" accessibleLabel={n} />
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
          <div className="flex flex-col items-center gap-1"><DietaryIcon name="vegan" size="sm" accessibleLabel="vegan" /><span className="nx-meta">sm / h-4</span></div>
          <div className="flex flex-col items-center gap-1"><DietaryIcon name="vegan" size="md" accessibleLabel="vegan" /><span className="nx-meta">md / h-5</span></div>
          <div className="flex flex-col items-center gap-1"><DietaryIcon name="vegan" size="lg" accessibleLabel="vegan" /><span className="nx-meta">lg / h-6</span></div>
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

function OrderTrackerShowcase() {
  const { themeId } = useTheme();
  return (
    <>
      <Section title="Dine-in (preparing)">
        <OrderTracker theme={themeId} type="dine-in" status="preparing" orderNumber={1042} eta="8 min" />
      </Section>
      <Section title="Delivery (on the way)">
        <OrderTracker theme={themeId} type="delivery" status="on-way" orderNumber={1043} eta="18 min" />
      </Section>
    </>
  );
}

function ReceiptShowcase() {
  const { themeId } = useTheme();
  return (
    <Section title="Receipt block (customer confirmation screen)">
      <Receipt
        theme={themeId}
        restaurantName="Demo Restaurant"
        orderNumber={1042}
        tableLabel="4"
        placedAt={new Date().toISOString()}
        items={[
          { name: 'Mapo Tofu', quantity: 2, unitPrice: 14.5 },
          { name: 'Steamed Rice', quantity: 2, unitPrice: 3.0 },
          { name: 'Mango Pudding', quantity: 1, unitPrice: 6.5 },
        ]}
        taxRate={0.0875}
        tipRate={0.18}
      />
    </Section>
  );
}

function PromoCardShowcase() {
  const { themeId } = useTheme();
  return (
    <Section title="Promo banner">
      <PromoCard
        theme={themeId}
        title="Happy Hour"
        discount="25% OFF"
        description="Weekdays 3–6pm · all appetisers"
        code="HAPPY25"
      />
    </Section>
  );
}

function CheckoutSummaryShowcase() {
  const { themeId } = useTheme();
  return (
    <Section title="Cart summary with place-order CTA">
      <CheckoutSummary
        theme={themeId}
        items={[
          { name: 'Mapo Tofu', quantity: 2, unitPrice: 14.5 },
          { name: 'Steamed Rice', quantity: 2, unitPrice: 3.0 },
          { name: 'Mango Pudding', quantity: 1, unitPrice: 6.5 },
        ]}
        deliveryFee={0}
        taxRate={0.0875}
        onPlaceOrder={() => alert('Order placed (showcase)')}
      />
    </Section>
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

function ImageUploadShowcase() {
  const [value, setValue] = useState<string | null>(
    'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=400&fit=crop',
  );
  return (
    <>
      <Section title="With preview (hover to see Replace / Remove)">
        <div className="max-w-xs">
          <ImageUpload
            value={value}
            onChange={setValue}
            tenantSlug="demo"
            label="Dish photo"
            aspectRatio="1:1"
          />
        </div>
      </Section>
      <Section title="Empty / upload state">
        <div className="max-w-xs">
          <ImageUpload
            value={null}
            onChange={() => {}}
            tenantSlug="demo"
            label="Menu item image"
            aspectRatio="16:9"
          />
        </div>
        <p className="nx-meta mt-3 text-text-tertiary">
          Note: actual file upload requires a live API at /t/demo/upload.
          Drag-drop and URL fallback are fully interactive.
        </p>
      </Section>
    </>
  );
}

function ToastShowcase() {
  const [toasts, setToasts] = useState<ToastData[]>([
    { id: '1', type: 'success', message: 'Order confirmed — table 7 is ready.' },
    { id: '2', type: 'error',   message: 'Failed to save menu item. Try again.' },
    { id: '3', type: 'info',    message: 'Kitchen display connected.' },
  ]);

  const dismiss = (id: string) =>
    setToasts((prev) => prev.filter((t) => t.id !== id));

  const addToast = (type: ToastData['type']) => {
    const id = String(Date.now());
    const messages: Record<ToastData['type'], string> = {
      success: 'Item saved successfully.',
      error:   'Something went wrong.',
      info:    'New order received.',
    };
    setToasts((prev) => [...prev, { id, type, message: messages[type] }]);
  };

  return (
    <>
      <Section title="Live demo — add / dismiss toasts">
        <div className="flex flex-wrap gap-2 mb-4">
          <Button size="sm" variant="secondary" onClick={() => addToast('success')}>
            + Success
          </Button>
          <Button size="sm" variant="secondary" onClick={() => addToast('error')}>
            + Error
          </Button>
          <Button size="sm" variant="secondary" onClick={() => addToast('info')}>
            + Info
          </Button>
        </div>
        <p className="nx-meta text-text-tertiary">
          ToastContainer renders fixed at bottom-right (z-100). Active toasts: {toasts.length}
        </p>
      </Section>
      {/* Render the real ToastContainer — it's fixed so it won't affect layout */}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </>
  );
}

function TourOverlayShowcase() {
  const steps: Array<{
    title: string;
    description: string;
    placement: 'center' | 'bottom' | 'top' | 'left' | 'right';
  }> = [
    {
      title: 'Welcome to Nexus',
      description: 'This tour shows how TourOverlay renders each step. Step 1 uses center placement — no spotlight target.',
      placement: 'center',
    },
    {
      title: 'Browse the menu',
      description: 'Step 2 is also centered for this demo. In a real tour, you would pass a DOMRect from a ref to highlight an element.',
      placement: 'center',
    },
    {
      title: 'You are all set!',
      description: 'The tour is complete. Press Got it to finish.',
      placement: 'center',
    },
  ];

  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep((s) => s + 1);
    } else {
      setActive(false);
      setStep(0);
    }
  };

  return (
    <Section title="3-step center tour (no DOM target needed)">
      <Button onClick={() => { setStep(0); setActive(true); }}>
        Start tour
      </Button>
      <p className="nx-meta mt-3 text-text-tertiary">
        TourOverlay uses createPortal — it renders over the whole page.
        Pass a real DOMRect from a ref to enable the spotlight cutout.
      </p>
      {active && (
        <TourOverlay
          targetRect={null}
          title={steps[step].title}
          description={steps[step].description}
          step={step}
          total={steps.length}
          placement={steps[step].placement}
          onNext={handleNext}
          onSkip={() => { setActive(false); setStep(0); }}
          stepType="info"
        />
      )}
    </Section>
  );
}

function LanguagePickerShowcase() {
  return (
    <>
      <Section title="All locales (en / zh / ja / ko / fr)">
        <LanguagePicker />
        <p className="nx-meta mt-3 text-text-tertiary">
          Selection persists via LocaleProvider at app root — switching here
          changes the active locale across the entire dev session.
        </p>
      </Section>
      <Section title="Filtered to 3 locales">
        <LanguagePicker availableLocales={['en', 'zh', 'ja']} />
      </Section>
    </>
  );
}

function DataTableShowcase() {
  type Row = { id: string; name: string; status: string; price: string };

  const rows: Row[] = [
    { id: '1', name: 'Margherita Pizza',  status: 'active',   price: '$14.00' },
    { id: '2', name: 'Tonkotsu Ramen',    status: 'active',   price: '$16.50' },
    { id: '3', name: 'Tiramisu',          status: 'inactive', price: '$8.00'  },
    { id: '4', name: 'Caesar Salad',      status: 'active',   price: '$12.00' },
    { id: '5', name: 'Lemonade',          status: 'active',   price: '$4.50'  },
  ];

  const columns = [
    { key: 'name',   header: 'Item name' },
    { key: 'status', header: 'Status',
      render: (row: Row) => (
        <span className={row.status === 'active' ? 'text-success' : 'text-text-tertiary'}>
          {row.status}
        </span>
      ),
    },
    { key: 'price', header: 'Price' },
  ];

  return (
    <>
      <Section title="5 rows, 3 columns, row click handler">
        <DataTable<Row>
          columns={columns}
          data={rows}
          onRowClick={(row) => alert(`Clicked: ${row.name}`)}
        />
      </Section>
      <Section title="Empty state">
        <DataTable<Row>
          columns={columns}
          data={[]}
          emptyMessage="No menu items found."
        />
      </Section>
    </>
  );
}

function BombComponent({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('Demo error — component intentionally threw.');
  }
  return (
    <p className="nx-body text-text-secondary">
      Component is healthy. Click the button above to trigger a render error.
    </p>
  );
}

function ErrorBoundaryShowcase() {
  const [key, setKey] = useState(0);
  const [shouldThrow, setShouldThrow] = useState(false);

  const crash = () => { setShouldThrow(true); };
  const reset = () => { setShouldThrow(false); setKey((k) => k + 1); };

  return (
    <Section title="Click to crash, click again to reset">
      <div className="flex gap-3 mb-4">
        <Button variant="destructive" size="sm" onClick={crash} disabled={shouldThrow}>
          Crash component
        </Button>
        <Button variant="secondary" size="sm" onClick={reset}>
          Reset boundary
        </Button>
      </div>
      <ErrorBoundary key={key}>
        <BombComponent shouldThrow={shouldThrow} />
      </ErrorBoundary>
    </Section>
  );
}

function PullToRefreshShowcase() {
  const THRESHOLD = 60;
  const distances = [0, 30, 60, 90];

  return (
    <>
      {distances.map((d) => (
        <Section key={d} title={`pullDistance=${d}${d >= THRESHOLD ? ' (threshold met)' : ''}`}>
          <div className="relative h-16 overflow-hidden rounded-lg border border-border bg-bg-muted">
            <PullToRefreshIndicator
              pullDistance={d}
              threshold={THRESHOLD}
              isRefreshing={false}
            />
          </div>
        </Section>
      ))}
      <Section title="isRefreshing=true">
        <div className="relative h-16 overflow-hidden rounded-lg border border-border bg-bg-muted">
          <PullToRefreshIndicator
            pullDistance={THRESHOLD}
            threshold={THRESHOLD}
            isRefreshing
          />
        </div>
      </Section>
    </>
  );
}

function AddToCartToastShowcase() {
  const [show, setShow] = useState(true);

  return (
    <>
      <Section title="Visible toast pill (portal — renders over page)">
        <div className="flex gap-3">
          <Button size="sm" onClick={() => setShow(true)}>
            Show toast
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setShow(false)}>
            Hide toast
          </Button>
        </div>
        <p className="nx-meta mt-3 text-text-tertiary">
          AddToCartToast uses createPortal and renders at bottom-center
          (fixed position). The pill appears above the page content.
        </p>
        <AddToCartToast
          show={show}
          itemName="Margherita Pizza"
          quantity={2}
          onComplete={() => setShow(false)}
        />
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
  'confirm-button':  { title: 'ConfirmButton',         render: ConfirmButtonShowcase },
  'image-upload':    { title: 'ImageUpload',           render: ImageUploadShowcase },
  'toast':           { title: 'Toast (ToastContainer)', render: ToastShowcase },
  'tour-overlay':    { title: 'TourOverlay',           render: TourOverlayShowcase },
  'language-picker': { title: 'LanguagePicker',        render: LanguagePickerShowcase },
  'data-table':      { title: 'DataTable',             render: DataTableShowcase },
  'error-boundary':  { title: 'ErrorBoundary',         render: ErrorBoundaryShowcase },
  'pull-to-refresh': { title: 'PullToRefreshIndicator', render: PullToRefreshShowcase },
  'add-to-cart-toast': { title: 'AddToCartToast',      render: AddToCartToastShowcase },
  'order-tracker':   { title: 'OrderTracker (themed)', render: OrderTrackerShowcase },
  receipt:           { title: 'Receipt (themed)',      render: ReceiptShowcase },
  'promo-card':      { title: 'PromoCard (themed)',    render: PromoCardShowcase },
  'checkout-summary':{ title: 'CheckoutSummary (themed)', render: CheckoutSummaryShowcase },
  tokens:            { title: 'Tokens',                render: TokensShowcase },
  themes:            { title: 'Themes',                render: ThemesShowcase },
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
