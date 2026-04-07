# Design System Rules

## CSS Custom Property Tokens

All visual values (colors, spacing, typography, shadows, radii) come from CSS custom
properties defined in the theme layer. NEVER hardcode color values.

### Color Tokens

```css
/* Defined in packages/web/src/platform/theme/tokens.css */
:root {
  --color-bg:             #ffffff;
  --color-bg-surface:     #f9fafb;
  --color-bg-muted:       #f3f4f6;
  --color-text:           #111827;
  --color-text-secondary: #6b7280;
  --color-text-tertiary:  #9ca3af;
  --color-border:         #e5e7eb;
  --color-border-strong:  #d1d5db;
  --color-primary:        #2563eb;
  --color-primary-hover:  #1d4ed8;
  --color-danger:         #dc2626;
  --color-success:        #16a34a;
  --color-warning:        #d97706;
  --color-brand:          #2563eb;  /* overridden per tenant */
}

.dark {
  --color-bg:             #0f172a;
  --color-bg-surface:     #1e293b;
  /* ... dark mode overrides */
}
```

### Using Tokens in Tailwind v4

Tailwind v4 reads CSS custom properties via `@theme`. Reference tokens:

```tsx
// CORRECT — uses design tokens via Tailwind theme mapping
<div className="bg-bg-surface text-text border-border">

// FORBIDDEN — hardcoded Tailwind color classes
<div className="bg-gray-50 text-gray-900 border-gray-200">

// FORBIDDEN — inline styles for colors
<div style={{ backgroundColor: '#f9fafb' }}>
```

### Spacing Scale

Use Tailwind's default spacing scale (4px base):

```tsx
// CORRECT
<div className="p-4 gap-3 mb-6">

// FORBIDDEN — arbitrary pixel values for standard spacing
<div className="p-[13px] gap-[7px]">
```

## Component Hierarchy

### Primitives (components/ui/)

Stateless, token-based, no domain logic.

| Component | Purpose | Key props |
|-----------|---------|-----------|
| Button | Actions | variant (primary, secondary, destructive, ghost), size, loading |
| Badge | Status labels | variant (default, success, warning, error, info) |
| Card | Content containers | CardHeader, CardContent, CardFooter composition |
| Dialog | Modal dialogs | open, onClose, title, footer |
| Input | Text inputs | label, error, helperText |
| Toggle | Boolean switches | checked, onChange, label |
| Select | Dropdowns | options, value, onChange |

Import via barrel: `import { Button, Card, Badge } from '@web/components/ui'`

### Patterns (components/patterns/)

Mid-level compositions with reusable logic:

| Pattern | Purpose |
|---------|---------|
| DataTable | Sortable, filterable tables |
| FormField | Label + input + error |
| StatusBadge | Domain-aware status display |
| EmptyState | No-data placeholder |
| ConfirmButton | Two-click destructive action (3s auto-reset) |

### Rules

1. Check shared components before creating new ones
2. Never inline a toggle, dialog, or confirm pattern — use the shared component
3. Destructive actions MUST use ConfirmButton
4. All inputs MUST use the Input component
5. Dark mode MUST work — every component uses token-based colors
6. No `!important` — fix upstream if override needed

## Z-Index Budget

```
z-10  — sticky headers, floating labels
z-20  — dropdowns, tooltips
z-30  — floating widgets, popovers
z-40  — navigation, sidebars
z-50  — modals, dialogs
z-[100] — toasts, notifications
```
