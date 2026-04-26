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

---

## Design Reference Bundle (read-only spec)

The Claude Design handoff bundle lives in `design/reference/v1/` at the repo root. It is
the **source-of-truth spec** for what Nexus should look and read like — NOT a runtime
library. It is authored as a self-contained reference; production code never imports from
it.

- Never edit files under `design/reference/v<N>/` — that version is frozen. When a new
  export arrives, save as `design/reference/v<N+1>/` alongside.
- Before any substantive visual change, read `design/reference/v1/nexus-design-system/README.md`
  and `DESIGN-SYSTEM.md` — the invariants listed there are non-negotiable.
- When an updated export arrives: commit it as a new version folder, run
  `git diff design/reference/v<N> design/reference/v<N+1>` to understand what shifted,
  then PORT the relevant changes into `packages/web/src/` as a separate commit with
  `Design-Bump: v<N>→v<N+1>` trailer. Never bypass the port step.

## Component Registry (agent-readable index)

`packages/web/src/components/registry.json` is the machine-readable index of every
primitive and pattern. Agents (and humans) grep this first before inventing new
components. Format:

```json
{
  "primitives": [
    {
      "name": "Button",
      "path": "packages/web/src/components/ui/Button.tsx",
      "kind": "ui",
      "purpose": "Primary action control. Variants: primary, secondary, destructive, ghost.",
      "propsShape": { "variant": "string", "size": "sm|md|lg", "loading": "boolean" },
      "tokensUsed": ["--color-primary", "--color-primary-hover", "--hit-sm", "--hit-md", "--hit-lg"],
      "dependencies": ["lucide-react"],
      "zooRoute": "/design/button"
    }
  ],
  "patterns": [...]
}
```

Every new file in `components/ui/*.tsx` or `components/patterns/*.tsx` MUST add an entry
here in the same commit.

## Zoo (living component catalog)

`packages/web/src/routes/__design/<name>.tsx` renders each primitive/pattern in isolation
with its variants visible, plus dark-mode and theme toggles. Zoo routes are **dev-only**:

- Mounted behind an `import.meta.env.DEV` guard; code-split so they never land in the
  production bundle.
- `import` the real component — NEVER inline-redefine. A zoo page is a reflection of
  source, not a copy.
- Pair every new primitive/pattern with its zoo page in the same commit.
- A zoo page should show: the component itself, every variant/size, dark/light, the real
  token references (so "does this work under our cascade" is tested authentically).

## Theme System (data-theme attribute)

10 canonical theme IDs from Claude Design: `classic`, `trattoria`, `izakaya`, `bubble-tea`,
`counter`, `taqueria`, `curry-house`, `sichuan`, `cantonese`, `wok`. Apply via
`data-theme="<id>"` on a wrapper element — cascade re-resolves, no JS re-render.

- Theme files live in `packages/web/src/platform/theme/themes/*.css` and redefine tokens
  inside a `[data-theme="<id>"]` block.
- **Semantic tokens (`--color-success`, `--color-danger`, `--color-warning`,
  `--color-info`) are NEVER re-themed.** Success is always green; danger is always red.
- `--color-brand` and `--color-brand-hover` are overridable per-tenant at runtime via
  inline style on the customer shell wrapper — this is how a single Sichuan restaurant
  can pick a slightly different red from the theme default.
- **Both customer AND merchant chrome re-skin by theme.** Each is wrapped in a `<ThemeProvider initialThemeId={tenantTheme} scope="…">` — `customer` for `CustomerShell`, `merchant` for `routeTree.MerchantThemeShell`. The merchant `Settings` page (`/t/<slug>/ordering/settings`) is the single source of truth: editing the cuisine theme live-previews on the merchant console itself, since the staff member is looking at the same theme cascade their customers will see. The pre-tenant outer `ThemeProvider` in `main.tsx` stays neutral (no `data-theme` on `<html>`) so login + tenant picker render in classic. The merchant's chrome layout follows the bundle's `Shell.jsx` spec and uses the same design-system primitives as the customer.

## Iconography

### Utility / UI icons — Lucide only

- `lucide-react` is the sole icon library in `apps/`/`components/`. No `react-icons`,
  `heroicons`, `phosphor-react`. Stroke-based outlines, no filled variants.
- Sizes: `h-5 w-5` nav, `h-4 w-4` button-inline, `h-6 w-6` dialog close, `h-8 w-8`
  EmptyState circles.
- Icons inherit `color` from text — never hardcode `fill` on a Lucide element.
- `shrink-0` on every icon so labels truncate around them.

### Dietary / allergen / spice / promo — custom sprite

`packages/web/src/assets/dietary-icons.svg` is the SVG symbol sprite. Access via a
`<DietaryIcon name="vegetarian">` primitive (wraps `<use href="/dietary-icons.svg#vegetarian">`).
Sanctioned names: `vegetarian`, `vegan`, `gluten-free`, `halal`, `kosher`, `nut-free`,
`dairy-free`, `shellfish`, `spice-1`, `spice-2`, `spice-3`, `promo`.

### FORBIDDEN

- Emoji anywhere in UI chrome.
- Unicode glyphs as icons (`→`, `★`, `●` etc.).
- Custom one-off SVGs for what Lucide already covers.
- Text-only dietary markers. Every dietary tag renders its icon.
- The single unicode exception is ` · ` (U+00B7 middle dot) as the separator on the
  customer hero status line.

## Hit Target Tokens

Three sizes, token-backed:

- `--hit-sm` = 44px — minimum secondary actions (WCAG 2.1 AA floor).
- `--hit-md` = 48px — primary actions, customer quantity steppers.
- `--hit-lg` = 52px — main CTAs.

Every `<Button>` size prop maps to these. Clickable icons use `min-h-[var(--hit-sm)]
min-w-[var(--hit-sm)]`. Hardcoded `h-[44px]`, `min-h-[48px]` Tailwind arbitrary values are
legacy — new code uses the token via `h-[var(--hit-md)]` or the semantic size prop.

## Enforcement

- `.claude/hooks/check-edited-file.sh` — PostToolUse detection (runs on every Edit/Write).
- `eslint-plugin-design-tokens` (added Phase 2) — `color-no-hex` in `apps/` + `components/`.
- `import/no-restricted-paths` — app/module/UI boundary enforcement.
- Commit-review loop — Reviewer cites `standards.md` IDs, Fixer addresses BLOCK findings.
- Zoo visual check — every PR builds the `/design/*` routes; a broken zoo page means a
  broken component under our own cascade.
