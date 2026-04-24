# Nexus Theme Guide

The Nexus design system ships **10 fully-integrated themes**. Each theme is more than a color palette — it's a complete visual identity covering surface, type pairing, density, shape language, shadows, and component behavior.

This guide explains **which theme to recommend for which kind of restaurant**.

---

## How themes work

A theme is applied by setting `data-theme="<id>"` on a wrapper element. All tokens cascade from there.

```html
<link rel="stylesheet" href="colors_and_type.css" />
<link rel="stylesheet" href="themes.css" />

<div data-theme="sichuan">
  <!-- everything inside uses Sichuan tokens -->
</div>
```

**Per-tenant overrides** (logo, brand color, accent) are applied as inline style overrides on a wrapper inside `[data-theme]`:

```html
<div data-theme="sichuan" style="--color-brand: #b8262b; --color-accent: #c89a3c;">
  <!-- tenant brand applied on top of base theme -->
</div>
```

This is the core contract: **base theme = visual chassis · tenant overrides = identity.**

---

## The 10 themes

### Global / Western

#### 1 · Classic
**Vibe:** Clean, neutral, professional
**Best for:** Modern American chains, casual dining, brand-neutral. Default when in doubt.
**Brand default:** `#2563eb` · **Type:** Inter

#### 2 · Trattoria
**Vibe:** Warm, hand-crafted, generous
**Best for:** Italian, Mediterranean, pizza, wine bar, farm-to-table bistro.
**Brand default:** `#c0532a` terracotta · **Type:** Fraunces + Inter

#### 3 · Izakaya
**Vibe:** Dark, intimate, refined. Dark-first.
**Best for:** Japanese izakaya, ramen, sushi, yakitori, Korean BBQ, late-night.
**Brand default:** `#e89d3a` amber · **Type:** JetBrains Mono + Inter

#### 4 · Bubble Tea
**Vibe:** Playful, soft, sweet. Maximally round.
**Best for:** Boba / bubble tea, dessert cafe, ice cream, Asian dessert chains, kids menus, brunch.
**Brand default:** `#b87fc2` taro · **Type:** Fraunces + Inter

#### 5 · Counter
**Vibe:** High-contrast, dense, editorial. No radii anywhere.
**Best for:** Third-wave coffee, ramen counter, sandwich, fast-casual, bagel/deli, kebab, urban street food.
**Brand default:** `#ff2d20` electric red · **Type:** JetBrains Mono + Inter

#### 9 · Taqueria
**Vibe:** Warm, vibrant, street-food energy.
**Best for:** Mexican taquerias, burrito shops, street-food trucks, Tex-Mex, Baja-style seafood, Latin American fusion.
**Brand default:** `#d94f2a` guajillo clay · **Type:** Fraunces + Inter

#### 10 · Curry House
**Vibe:** Spiced, jewel-toned, aromatic.
**Best for:** Indian, Pakistani, Sri Lankan, Nepalese, South Asian, curry house, tandoor kitchen, biryani, chaat.
**Brand default:** `#d97a1a` saffron · **Type:** Fraunces + Inter

### Chinese cuisine (4 themes covering major market share)

#### 6 · Sichuan (川菜)
**Vibe:** Bold, hot, dramatic.
**Best for:** Sichuan / Hunan / spicy regional, hot pot (火锅), Chinese BBQ (烧烤), mala-forward restaurants.
**Brand default:** `#b8262b` cinnabar · **Type:** Noto Serif SC + Inter/Noto Sans SC

#### 7 · Cantonese (粤菜)
**Vibe:** Tea-house refined, heritage, considered.
**Best for:** Cantonese, dim sum (点心), roast meats (烧腊), Hong Kong cafes (茶餐厅), seafood houses, traditional Chinese fine dining.
**Brand default:** `#1f6b4a` deep jade · **Type:** Noto Serif SC + Inter/Noto Sans SC

#### 8 · Wok (Chinese-American)
**Vibe:** Bold, fast, franchise-ready.
**Best for:** Chinese-American fast-casual (Panda Express / P.F. Chang's style), mall food court chains, American Chinese takeout, wok-and-noodle counters.
**Brand default:** `#d62828` lucky red · **Type:** Fraunces + Inter

### Quick decision tree (Chinese)

| Cuisine · Concept | Theme |
|---|---|
| Hot pot, Sichuan, Hunan, mala | **Sichuan** |
| Dim sum, Cantonese, 烧腊, HK cafe, seafood, tea house | **Cantonese** |
| American Chinese, mall food court, fast-casual wok | **Wok** |
| Boba, milk tea, dessert cafe | **Bubble Tea** |
| Chinese BBQ counter, Taiwanese street food | **Counter** |
| Northern/Dongbei dumpling counter | **Counter** or **Wok** |

---

## Picking a theme — quick decision tree

| Restaurant type | Recommended theme |
|---|---|
| Modern American, chains, brand-neutral | **Classic** |
| Italian, Mediterranean, wine bar, bistro | **Trattoria** |
| Japanese, Korean, ramen, sushi, yakitori | **Izakaya** |
| Bubble tea, dessert, ice cream, brunch cafe | **Bubble Tea** |
| Sichuan / Hunan / hot pot | **Sichuan** |
| Cantonese / dim sum / 烧腊 / HK cafe | **Cantonese** |
| Chinese-American fast-casual, mall food court | **Wok** |
| Coffee, sandwich shop, fast-casual, deli, kebab | **Counter** |
| Mexican, Tex-Mex, street food trucks | **Taqueria** |
| Indian, South Asian, curry house, tandoor | **Curry House** |
| Vietnamese, Thai, Southeast Asian | **Izakaya** (dark) or **Trattoria** (light) |

---

## What customizes per-tenant

Vendors can override these without changing the theme:
- **Logo** (uploaded image, fallback to first letter on brand color)
- **Brand color** (drives `--color-brand`, `--color-primary`, primary buttons, focus rings)
- **Accent color** (drives `--color-accent`, secondary highlights, promo chips)
- **Restaurant name** (shown in chrome, receipts, footers)

Everything else — type pairing, density, shape language, shadows — stays as the theme defined it. This is intentional. The theme guarantees coherence; tenants get identity without the ability to break the design.

---

## What stays consistent across all themes

- **Lucide icons** for utility/UI (settings, close, chevrons, etc.)
- **Custom dietary/allergen/spice icons** (`assets/dietary-icons.svg`) — same icon family, recolored by token
- **Hit-target sizing** (44/48/52px) — accessibility floor
- **`active:scale-[0.97]`** tap feedback
- **Token contract** — same variable names, same semantic meaning
- **Dark mode** — every theme has a `.dark` override

---

## Files

- `themes.css` — aggregator, imports all 6
- `themes/classic.css`
- `themes/trattoria.css`
- `themes/izakaya.css`
- `themes/bubble-tea.css`
- `themes/sichuan.css`
- `themes/counter.css`
- `themes/Theme Comparison.html` — all 6 side-by-side
- `themes/Vendor Theme Studio.html` — live theme + brand + logo swap (the tenant onboarding flow)
- `assets/dietary-icons.svg` — custom dietary/allergen/spice icon family
