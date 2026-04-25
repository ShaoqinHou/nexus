# Nexus Design System

Canonical brand, token, type, component, and theme library for **Nexus** — a multi-tenant mini-app platform (WeChat-style). The first module is restaurant ordering. Every visual decision here must flex across tenants — one `--color-brand` override cascades through the whole customer-facing surface without breaking anything.

This project is a **standalone design reference**. It does not import from or build against any production codebase. It is the source of truth for what Nexus should *look* and *read* like.

---

## Repo map

```
.
├── DESIGN-SYSTEM.md                 ← you are here (one-time handoff doc; delete after consuming)
├── colors_and_type.css              Base tokens (colors, type, radii, shadows) + semantic-type classes
├── themes.css                       Imports the 10 theme files; include AFTER colors_and_type.css
├── tweaks-panel.jsx                 In-design tweaks UI (environment-specific)
│
├── themes/
│   ├── THEME-GUIDE.md               Which theme for which cuisine — READ BEFORE PICKING ONE
│   ├── classic.css trattoria.css izakaya.css bubble-tea.css counter.css
│   ├── taqueria.css curry-house.css sichuan.css cantonese.css wok.css
│   ├── Theme Comparison.html        All 10 themes side-by-side
│   ├── Vendor Theme Studio.html     Live theme + brand + logo swap; Parts tab shows every component reskinned
│   ├── themed-menu.jsx              Customer menu, theme-aware
│   ├── themed-orders.jsx            Merchant orders board, theme-aware
│   └── themed-components.jsx        OrderTracker, Receipt, PromoCard, EmptyState, Toast, CheckoutSummary
│
├── fonts/                           Self-hosted Inter + JetBrains Mono variable woff2
├── assets/
│   ├── nexus-logo.svg               Horizontal wordmark (mark + "Nexus" in Inter Bold). currentColor.
│   ├── nexus-mark.svg               Square mark only. currentColor.
│   ├── dietary-icons.svg            Custom symbol sprite: dietary / allergen / spice / promo
│   └── icons/                       Lucide SVGs mirrored as static files for offline use
│
├── preview/                         Design System tab cards (one per token cluster — type, color, spacing, component, brand)
│
├── ui_kits/
│   ├── shared/nexus.css             Primitive classes (.nx-btn, .nx-card, .nx-badge, .nx-input, .nx-label)
│   ├── merchant/                    Merchant console kit (Shell.jsx, Components.jsx, index.html)
│   ├── customer/                    Customer ordering kit (Components.jsx, index.html)
│   └── all_screens/                 Every screen in one file for side-by-side review (Screens.jsx + design-canvas)
│
└── .claude/rules/
    ├── architecture.md              How the project surfaces map conceptually
    ├── design-system.md             Visual hard rules
    └── content.md                   Voice, tone, copy conventions, placeholder data
```

---

## Working in this project

### Before any visual change

1. **Read this file fully** — the VISUAL, CONTENT, and ICONOGRAPHY sections below are the spec.
2. **Read `.claude/rules/design-system.md`** and **`.claude/rules/content.md`**.
3. **Reuse before inventing.** Check `ui_kits/all_screens/Screens.jsx` first — it already has the correct token usage wired up and is the fastest fork target. Then `ui_kits/merchant/Components.jsx` and `ui_kits/customer/Components.jsx`. `preview/` shows tokens in isolation.
4. **Pick a theme.** If the design is for a specific restaurant type, read `themes/THEME-GUIDE.md` first and apply via `data-theme="<id>"` on a wrapper element.

### Prototyping a new screen

1. Start from the closest UI-kit screen (`ui_kits/merchant/index.html` or `ui_kits/customer/index.html`) and fork it.
2. Import components from the matching `Components.jsx` via `window.*Parts`.
3. Link `colors_and_type.css`, then `themes.css` (if themed), then `ui_kits/shared/nexus.css`.
4. Use `.nx-btn` / `.nx-card` / `.nx-badge` / `.nx-input` / `.nx-label` for primitives. If a new primitive is needed, add it to `shared/nexus.css` using tokens only.
5. Test light AND dark by toggling `.dark` on `<html>`. Tokens swap automatically — this is verification, not design work.

### Prototyping variations

1. Wrap each variation in a `<DCArtboard>` inside a `<DesignCanvas>` (copy the pattern from `ui_kits/all_screens/index.html`).
2. Side-by-side in one file, not N separate HTMLs.
3. Vary one axis at a time — layout, density, color treatment — not all at once.

### Slides / marketing

Same token system applies. Inter for UI, JetBrains Mono for numbers. Respect the 44px minimum hit target even on non-interactive surfaces (it sets the visual rhythm).

### Clarifying questions for vague asks

- Which audience: merchant (staff) or customer (diner)?
- Which theme / cuisine?
- Light, dark, or both?
- New screen or variation of an existing one?
- Is there a tenant `--color-brand` override? (Default is Nexus blue `#2563eb`.)
- Mobile (customer), desktop (merchant), or both?

---

## Products represented

Nexus is one SPA with two distinct product surfaces driven by the same token system:

| Surface | Audience | Shell | Persona |
| --- | --- | --- | --- |
| **Merchant console** | Restaurant staff (owner/manager/staff) | `PlatformShell` — collapsible left sidebar, grouped nav, theme toggle | Desk-bound, multi-restaurant, dense data |
| **Customer ordering** | Diners at a table | `CustomerShell` — hero header with restaurant cover + logo + open/closed dot, per-tenant brand color | Phone-first, one-handed, zero-login |

Merchant lives at `/t/:tenantSlug/ordering/*`. Customer lives at `/order/:tenantSlug?table=N`.

---

## CONTENT FUNDAMENTALS

Nexus writes like clean B2B SaaS — short, direct, neutral. Never cute. Always action-first.

### Voice & tone

- **Second person** when talking TO the user (`You have access to 3 restaurants`). Never "we".
- **Imperative** for buttons: `Sign In`, `Create Restaurant`, `Add to existing order`, `Back to Order`.
- **Sentence case throughout** for UI copy. Title Case only for proper nouns and top-level page names (`Choose Restaurant`, `No Table Selected`). Button labels are Title Case (`Sign In`, `Add to Cart`).
- **Status words are lowercase** in enums (`pending`, `preparing`, `ready`, `confirmed`, `cancelled`); StatusBadge capitalizes for display.
- **No exclamation points** in chrome. Toasts are the one exception (`Promo code applied!`, `Order placed successfully!`).
- **No emoji anywhere.**
- **No unicode decoration** — no arrows (→), no bullets (•), no middle dots (·), except as a separator between two short status fragments (`Open · Closes at 22:00`).

### Length & structure

- Microcopy is terse — 3–6 words for subtitles.
- **Empty states:** icon → bold title → one sentence of context → one button.
- **Errors are factual, never apologetic:** `No restaurants found for this account`, `Invalid promo code`, `Failed to place order. Please try again.`

### Examples

| Copy | Context |
| --- | --- |
| `Choose Restaurant` | Tenant picker H1 |
| `You have access to 3 restaurants` | Tenant picker subtitle |
| `Table 5 has an active order` | Customer join-order heading |
| `Order #AB3F2C is currently preparing. Would you like to add to it or start fresh?` | Join-order body |
| `Last orders have been taken for today. Kitchen closed for new orders at 21:45.` | Cutoff banner |
| `Please scan the QR code at your table to start ordering.` | No-table-selected helper |
| `Lowercase letters, numbers, and hyphens only` | Input helper (tenant ID) |

Copy is internationalized via a `useT()` hook — every user-facing string is a single clean phrase, no concatenation.

---

## VISUAL FOUNDATIONS

Nexus looks like a modern utility-first dashboard: flat surfaces, hairline borders, small radii, restrained color. Deliberately boring in a good way — the design system's job is to let per-tenant brand color shine.

### Color

- **Neutrals dominate.** Pages are white on faintly off-white surface. Cards are pure white with 1px `#e5e7eb` border. Dark mode uses a pure cool slate family (`#0f172a` → `#1e293b` → `#334155`) with zero blue tint.
- **One accent at a time.** Primary blue (`#2563eb`) carries all affirmative action. Danger red, success green, warning amber are ONLY used for their semantic role.
- **Semantic pair pattern.** Every semantic ships solid + `-light` (`--color-success` + `--color-success-light`). Badges/toasts use `-light` bg + solid fg; buttons invert.
- **Per-tenant brand override.** `--color-brand` and `--color-brand-hover` are runtime-overridable. Customer hero uses brand color directly as banner when no cover image is set.
- **No gradients in chrome.** Only exception: `bg-gradient-to-t from-black/60 via-black/20 to-transparent` overlay on customer cover image for text readability.

### Type

- **Inter** for UI, **JetBrains Mono** for code-adjacent (IDs, tenant slugs).
- Scale: `2xl/bold` (24px, display) → `lg/bold` (18px) → `lg/semibold` (CardTitle) → `sm/medium` (labels) → `sm` (body) → `xs` (meta) → `10px uppercase tracked` (nav eyebrows).
- `tracking-wider` is used **only** on nav group eyebrows.
- Truncation is common and explicit (`truncate` everywhere for tenant names, emails, item labels).

### Spacing & density

- 4px base grid (Tailwind defaults). Observed cadence: `gap-2`/`gap-3` tight inline, `gap-6`/`gap-8` card separation.
- Form rhythm: `space-y-4` between fields; `gap-1.5` between label and input.
- Card interior: `px-4 sm:px-6 py-4` — tightens on mobile.
- **Hit targets enforced at component level.** Button sizes map to min-heights 44/48/52px for sm/md/lg. Every clickable icon uses `min-h-[44px] min-w-[44px]`. Non-negotiable.

### Backgrounds & imagery

- No full-bleed marketing illustrations. Customer screens use a real uploaded cover photo when available, otherwise a flat brand-color banner.
- No hand-drawn illustrations, no patterns, no textures. The only textures are the `shimmer` keyframe (loading skeletons) and the cover-image gradient overlay.
- No blurred glass. Scoped exception: the floating table-number badge on the customer hero uses `bg-bg/90 backdrop-blur-sm` over a photo.

### Borders, corners, shadows

- **Radii:** 4 / 6 / 8 / 12 / full. Buttons + inputs `rounded-md` (6px). Cards + dialogs `rounded-lg` (8px). Badges `rounded-full`.
- **Borders are hairlines.** 1px `#e5e7eb` (light) or `#334155` (dark). `--color-border-strong` is reserved for the Toggle track off-state.
- **Shadow scale has three steps.** `shadow-sm` for cards + toggle thumb, `shadow-md` for dialogs + toasts, `shadow-lg` reserved. Short and soft.
- No inner shadows, no neumorphism.

### Motion

- **Duration:** 200ms canonical (toggle, sidebar collapse). 300ms ease-out for toast slide-in.
- **Easing:** default Tailwind ease, or explicit `ease-out` on toasts. No custom cubic-beziers.
- **Press feedback:** `active:scale-[0.97]` on main buttons, `active:scale-[0.95]` on icon buttons, `active:scale-[0.98]` on large tappable rows. This is a defining tactile signature.
- No bounces, no spring easing, no stagger. Motion is purely functional.
- **Named keyframes (2):** `shimmer` (2s infinite linear) for skeletons, `slide-up-fade` (2s ease-out) for the AddToCartToast pill.

### Focus

Every interactive gets `focus-visible:ring-2 ring-offset-2 ring-primary` (errors swap to `ring-danger`), paired with `focus-visible:outline-none`. Never visible outlines.

### Cards

One recipe only: `rounded-lg border border-border bg-bg-elevated shadow-sm`. Header/content/footer separated by `border-b border-border`. **No colored left-border cards. No gradient cards. No glass cards.**

---

## ICONOGRAPHY

### Utility / UI icons — Lucide only

- **Stroke-based outlines only.** No filled variants.
- **Default size: `h-5 w-5` (20px)** for nav, top-bar, dialog headers. `h-4 w-4` for button icons and inline meta. `h-6 w-6` for dialog close buttons and hero empty-state callouts. `h-8 w-8` for EmptyState circles.
- Icons inherit text color — no hardcoded fill. They appear in `text-text`, `text-text-secondary`, `text-text-tertiary`, `text-primary`, `text-danger`, `text-warning`, or `text-success`.
- Icon + label spacing: `gap-2` (8px) inside buttons, `gap-3` (12px) in nav items, `gap-1.5` (6px) in inline meta.
- All icons use `shrink-0` so labels truncate around them.
- Canonical Lucide roster is mirrored in `assets/icons/` for offline use.

### Dietary / allergen / spice / promo — `assets/dietary-icons.svg`

A custom symbol sprite with Nexus-specific marks (vegetarian, vegan, gluten-free, halal, kosher, nut-free, dairy-free, shellfish, spice levels, promo badges). Reference via `<svg><use href="assets/dietary-icons.svg#<name>" /></svg>`. Never reach for emoji or unicode for these.

### Forbidden

- Emoji anywhere in UI.
- Unicode glyphs as icons.
- Custom one-off SVGs for what Lucide already covers.
- Decorative bullets/separators — the middle dot (` · `) separator on the customer hero open-status line is the only allowed instance.

### Logos

- `nexus-mark.svg` — square app-icon style, used in the login-page tile.
- `nexus-logo.svg` — horizontal wordmark.

Both monochrome, recolor via `currentColor`.

---

## THEMES

Nexus ships **10 fully-integrated themes** — not color swaps, but complete identities (surface, type pairing, density, shape, shadow). Apply via `data-theme="<id>"` on a wrapper.

**Global / Western:**
- `classic` — modern American / chains / brand-neutral default
- `trattoria` — Italian / Mediterranean / wine bar (cream + terracotta + serif)
- `izakaya` — Japanese / Korean / ramen (dark-first, ink + amber)
- `bubble-tea` — boba / dessert / cafe (soft pastels, rounded everything; also covers milk-tea chains)
- `counter` — coffee / sandwich / fast-casual (B&W + electric red, no radii)
- `taqueria` — Mexican / Tex-Mex / street food (clay + lime + marigold)
- `curry-house` — Indian / South Asian (saffron + turmeric + teal)

**Chinese cuisine (3 themes for major market coverage):**
- `sichuan` — 川菜 / hot pot / Hunan / mala (cinnabar + gold)
- `cantonese` — 粤菜 / dim sum / 烧腊 / HK cafe / tea house (deep jade + gold)
- `wok` — Chinese-American fast-casual / Panda-style / mall food court (lucky red + gold)

Beyond the base kit, `themes/themed-components.jsx` ships **OrderTracker**, **Receipt**, **PromoCard**, **EmptyState**, **Toast**, **CheckoutSummary** — all theme-aware. Preview every component reskinned in `themes/Vendor Theme Studio.html` → Parts tab.

**Always read `themes/THEME-GUIDE.md` first** when picking a theme for a specific restaurant.

---

## Non-negotiables

- Tokens only — no hardcoded colors, radii, or shadows in production UI. Exceptions live in dev-tool chrome (e.g. `design-canvas.jsx`) and SVG-internal fills; nowhere else.
- Lucide for utility/UI icons; `assets/dietary-icons.svg` for dietary/allergen/spice/promo. No emoji, no unicode glyphs as icons.
- Dark mode must work — toggle `.dark` on `<html>` and everything re-themes via tokens.
- `--color-brand` and `--color-brand-hover` are overridable per tenant and propagate to customer-facing chrome.
- 44px minimum hit targets everywhere.
- One accent at a time. Semantic colors only for their semantic role.

---

## What each part of this project contains

A tour of the folders and files, so you know what this system ships and where each piece lives.

### Root token files

- **`colors_and_type.css`** — base tokens. Defines `:root` and `.dark` custom properties for every color, radius, shadow, spacing, and font-size in the system. Also declares `@font-face` for Inter and JetBrains Mono (pointing at `fonts/`) and ships a set of semantic-type utility classes (`.text-display`, `.text-body`, etc.) that other files reference. Theme-agnostic scaffolding that every theme shares.

- **`themes.css`** — aggregator. `@import`s all 10 theme files from `themes/`. Load after `colors_and_type.css`.

- **`tweaks-panel.jsx`** — in-design Tweaks UI for toggling tokens live. Environment-specific — a previewing aid, not part of the shipped design system.

### `themes/`

Ten fully-integrated theme identities. Each is a single CSS file that redefines tokens inside a `[data-theme="<id>"]` block. Switching themes is a one-attribute change on a wrapper element.

- **`THEME-GUIDE.md`** — which theme is appropriate for which cuisine/restaurant type. The authoritative matching guide.
- **`classic.css`, `trattoria.css`, `izakaya.css`, `bubble-tea.css`, `counter.css`, `taqueria.css`, `curry-house.css`, `sichuan.css`, `cantonese.css`, `wok.css`** — the ten themes.
- **`themed-components.jsx`** — domain-specific, theme-aware React components: `OrderTracker`, `Receipt`, `PromoCard`, themed `EmptyState`, themed `Toast`, `CheckoutSummary`. These compose above primitives and render differently per theme because their internals reference tokens.
- **`themed-menu.jsx`, `themed-orders.jsx`** — reference screens (customer menu, merchant orders board) wired up to demonstrate themed components in context.
- **`Theme Comparison.html`** — all 10 themes side-by-side on a single page.
- **`Vendor Theme Studio.html`** — live theme + brand-color + logo swap demo. Parts tab shows every themed component reskinned across all 10 themes.
- **`design-canvas.jsx`** — local copy of the canvas component used by the theme studio.

### `fonts/`

Self-hosted variable woff2s for Inter and JetBrains Mono. `@font-face` declarations that reference them live in `colors_and_type.css`.

### `assets/`

- **`nexus-logo.svg`** — horizontal wordmark (mark + "Nexus" set in Inter Bold). Monochrome, recolored via `currentColor`.
- **`nexus-mark.svg`** — square mark only, used for app-icon style tiles. Monochrome, `currentColor`.
- **`dietary-icons.svg`** — custom SVG symbol sprite covering every Nexus-specific marker: dietary (vegetarian, vegan, gluten-free, halal, kosher, nut-free, dairy-free, shellfish), spice levels, promo badges. Referenced via `<use href="assets/dietary-icons.svg#<name>" />`. The only sanctioned way to render these markers — emoji and unicode glyphs are banned.
- **`icons/`** — Lucide stroke icons mirrored as static SVGs for offline use. The canonical utility-icon roster.

### `preview/`

Design System tab cards — one per token cluster (type, color, spacing, component, brand). Used by the asset-review pane to display tokens in isolation. Review artifacts.

### `ui_kits/`

Reference screens showing how tokens and components compose into real product surfaces.

- **`shared/nexus.css`** — primitive CSS classes (`.nx-btn`, `.nx-card`, `.nx-badge`, `.nx-input`, `.nx-label`). A visual spec of how primitives should look when built with tokens — these classes exist so the HTML reference screens can render faithfully without a build step.
- **`merchant/`** — merchant console kit. `Shell.jsx` (PlatformShell: sidebar + topbar), `Components.jsx` (screens), `index.html` (entry).
- **`customer/`** — customer ordering kit. `Components.jsx`, `index.html`.
- **`all_screens/`** — every screen from both kits laid out on a single design-canvas page for side-by-side review. The fastest fork target when prototyping.

### `.claude/rules/`

- **`architecture.md`** — how the project's surfaces map conceptually to the product.
- **`design-system.md`** — visual hard rules (the non-negotiables).
- **`content.md`** — voice, tone, copy conventions, placeholder data.

---

## Design principles

These are the beliefs that shape every decision in this project.

1. **One token system, many skins.** Nexus is multi-tenant. Every pixel of visual identity — color, radius, shadow, spacing, type — must flow from CSS custom properties so a restaurant can rebrand by overriding a handful of variables, not by forking components. A component that hardcodes `#2563eb` or `bg-blue-600` is a bug, no matter how good it looks.

2. **Neutrals dominate, one accent at a time.** The page is mostly white/slate. The tenant's brand color is the ONLY interactive accent. Semantic colors (success/warning/danger/info) appear only when communicating that specific state. Never combine brand blue + a secondary purple + a teal; that's decoration, not information.

3. **Dark mode is not a feature, it's a test.** If a screen doesn't work in dark mode by toggling `.dark` on `<html>`, the screen is wrong — it means someone hardcoded a color instead of referencing a token. Dark mode is how we verify the token discipline is holding.

4. **Touch-first ergonomics.** 44×44px minimum on every interactive target, 48×48px on customer-facing quantity steppers. Non-negotiable. The customer surface runs on phones held one-handed while eating.

5. **Deliberately boring chrome.** Flat surfaces, hairline borders, small radii, short soft shadows, zero gradients except the cover-image overlay. The chrome's job is to disappear so the tenant's food photography and brand color can do the work.

6. **Functional motion only.** 200ms transitions, `active:scale-[0.97]` press feedback, a single shimmer keyframe for skeletons. No bounces, no springs, no stagger. Motion confirms a tap happened; it doesn't entertain.

7. **Lucide for UI, custom sprite for dietary.** Lucide stroke icons for every utility/navigation role. The `assets/dietary-icons.svg` sprite for dietary/allergen/spice/promo. Emoji and unicode glyphs are banned from UI — they render differently per OS and break internationalization.

8. **Copy is terse and neutral B2B.** Sentence case, imperative buttons, no exclamation points in chrome, no emoji in text, no marketing adjectives. Errors are factual, not apologetic.

---

## Glossary

The word "token" is overloaded in design systems. Here's exactly what we mean by each term:

- **Token** — in this project, always means a **CSS custom property** (a.k.a. CSS variable), defined in `colors_and_type.css` under `:root` (or `.dark`, or a `[data-theme="..."]` selector). Example: `--color-primary: #2563eb`. Tokens are the ONLY place raw values live. Everything else references them via `var(--color-primary)`.

- **Base token** — a token that holds a raw value in `colors_and_type.css`. E.g. `--color-bg-elevated`, `--color-border`. These are theme-agnostic scaffolding — every theme shares them.

- **Theme token** — a token redefined inside a `[data-theme="..."]` block in `themes/*.css` to skin a tenant. E.g. `sichuan.css` overrides `--color-primary` to cinnabar red. When `data-theme` changes on a wrapper, the cascade re-resolves and every `var(--color-primary)` in that subtree updates live. No JS, no re-render.

- **Brand token** — a special pair (`--color-brand`, `--color-brand-hover`) reserved for per-tenant runtime override. A restaurant sets these via inline style on their wrapper; the theme shouldn't set them. This is how a single Sichuan restaurant can pick a slightly different red from the theme default without editing the theme file.

- **Semantic token** — a token tied to a meaning, not a role. `--color-success` / `--color-warning` / `--color-danger` / `--color-info`. Each ships with a `-light` counterpart for badge/toast backgrounds. These are stable across all tenants and themes — success is always green, danger is always red. Do not re-theme semantic colors.

- **Primitive** — a CSS class in `ui_kits/shared/nexus.css` (`.nx-btn`, `.nx-card`, `.nx-badge`, `.nx-input`, `.nx-label`). Token-only — they never hardcode values. They encode the visual recipe for basic UI elements; a consuming app may realize the same recipe as React components, Vue components, or anything else.

- **Themed component** — a domain-specific React component in `themes/themed-components.jsx` (OrderTracker, Receipt, PromoCard, themed EmptyState, themed Toast, CheckoutSummary). These sit above primitives — they compose primitives and happen to look different per theme because their internals reference tokens.

- **Shell** — the outer layout frame. `PlatformShell` (merchant: sidebar + topbar) and `CustomerShell` (customer: hero header + content).

- **Surface** — the background hierarchy on a screen. From deepest to shallowest: `--color-bg` (page) → `--color-bg-surface` (muted wash) → `--color-bg-elevated` (cards, dialogs) → `--color-bg-strong` (hover on elevated). Components choose their surface role explicitly; they don't pick colors.

- **Hit target** — the minimum tappable area for an interactive element. 44×44px everywhere, 48×48px for customer quantity steppers. Not the visible size — the tappable size. An icon can be 20px visually but must sit inside a 44px container.

- **Tenant** — a single restaurant. One Nexus install hosts many tenants; each has its own `--color-brand` override, logo, and optional `data-theme`. Customer-facing URLs are scoped `/order/:tenantSlug`.

---

## Relationship to a production consumer

This project is the **design source of truth**. It is authored as a self-contained reference and is intended to be consumed by a production app that ships the real product.

### Preferred shape (a non-binding preference, not a requirement)

Our preference is that this system be consumed as a **standalone design package** — tokens, themes, fonts, SVG assets, and themed components imported by the production app rather than copy-pasted into it. The reasoning:

- Design evolution stays in one place. Updates here flow downstream on a version bump, instead of drifting across forks.
- Production stays free to own its component framework, build tooling, and layout. It just consumes the visual inputs.
- The boundary matches the team boundary: this project is design, the production repo is behavior.

That is a preference, not a spec. A consumer adopting this system should research the approaches common in their stack (workspace packages, npm publishing, git submodule, copy-with-sync, build-time inlining, CSS layer imports, etc.), weigh the tradeoffs against their existing conventions, and pick what fits. As long as the invariants in the next section hold, how the bytes get from here to there is an implementation choice.

### What "done" looks like for any consumer

However this system gets consumed downstream, these invariants define whether the result is faithful:

- Every color, radius, shadow, and font-size in shipped UI resolves through a token — no raw hex codes, no Tailwind color utilities (`bg-blue-600`, `text-slate-900`) outside token-definition files.
- Toggling `.dark` on `<html>` re-themes every surface.
- Setting `data-theme="<id>"` on a wrapper re-skins every customer-facing surface within it; the merchant console stays neutral.
- Setting `--color-brand` inline on a wrapper propagates to customer hero, primary buttons, active-nav, and every other brand-accented element within it, live.
- Every interactive element has a 44×44px minimum hit target (48×48px on customer quantity steppers).
- Utility/UI iconography uses Lucide stroke icons. Dietary/allergen/spice/promo markers use `assets/dietary-icons.svg`. No emoji, no unicode glyphs as icons.
