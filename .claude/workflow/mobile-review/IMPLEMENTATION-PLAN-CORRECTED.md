# Mobile UI Fixes — Implementation Plan (Revised for Design System Compliance)

**Date**: 2026-04-11  
**Status**: Ready for execution  
**Compliance**: Follows Nexus design system rules (no hardcoded values, one source of truth)

---

## Design System Compliance Rules

### ✅ DO:
- Use **Tailwind classes** for spacing: `p-4`, `gap-3`, `px-4 py-2`
- Use **design token classes** from `tokens.css`: `bg-primary`, `text-text`, `border-border`
- Use **CSS custom properties** when needed: `var(--color-primary)`, `var(--radius-md)`
- Follow existing component patterns from `@web/components/ui/`
- Import via barrel: `import { Button } from '@web/components/ui'`

### ❌ DON'T:
- Hardcode pixel values in CSS: `height: 48px`, `padding: 12px 16px`
- Hardcode colors: `background: #FCD34D`, `color: white`
- Hardcode spacing: `gap: 8px`
- Create custom styles when existing patterns work
- Violate import boundary rules

---

## Phase 1: Critical Fixes (Week 1)

### Sprint 1.1: Orders Dashboard Action Buttons

**File**: `packages/web/src/apps/ordering/merchant/orders-dashboard.tsx`  
**Issue**: Status buttons too small (28-32px)  
**Fix using Tailwind spacing**:

```typescript
// ❌ WRONG (hardcoded values):
const buttonStyles = "min-height: 48px; padding: 12px 16px;";

// ✅ CORRECT (Tailwind spacing):
<div className="flex gap-2">
  <button className="px-4 py-3 min-h-[48px] flex items-center justify-center">
    Pending
  </button>
  <button className="px-4 py-3 min-h-[48px] flex items-center justify-center">
    Confirmed
  </button>
</div>

// For spacing between buttons, use gap classes:
<div className="flex flex-wrap gap-2">
  {/* buttons */}
</div>
```

**Touch target sizing**:
- Use `min-h-[48px]` (Tailwind arbitrary value for 48px minimum)
- Use `px-4 py-3` (16px horizontal, 12px vertical padding)
- Use `gap-2` (8px spacing between buttons)

---

### Sprint 1.2: Kitchen Display Color Coding

**File**: `packages/web/src/apps/ordering/merchant/kitchen-display.tsx`  
**Issue**: No visual status differentiation  
**Fix using design tokens**:

```typescript
// ❌ WRONG (hardcoded colors):
const statusColors = {
  new: 'bg-yellow-100 text-yellow-800',
  cooking: 'bg-orange-100 text-orange-800',
};

// ✅ CORRECT (use semantic tokens from tokens.css):
const statusConfig = {
  new: 'bg-warning-light text-warning',
  cooking: 'bg-info-light text-info',
  ready: 'bg-success-light text-success',
  delivered: 'bg-primary-light text-primary',
};

// Apply to order cards:
<div className={cn("p-4 rounded-lg border", statusConfig[order.status])}>
  <h3>Table {order.tableNumber}</h3>
  <p>{elapsedTime(order.createdAt)}</p>
</div>
```

**Color tokens available** (from `tokens.css`):
- `--color-warning` / `--color-warning-light` (orange/yellow)
- `--color-info` / `--color-info-light` (blue)
- `--color-success` / `--color-success-light` (green)
- `--color-danger` / `--color-danger-light` (red)
- `--color-primary` / `--color-primary-light` (brand blue)

---

### Sprint 1.4: Input Field Heights

**File**: `packages/web/src/components/ui/Input.tsx`  
**Issue**: Inputs below 48px minimum  
**Fix using Tailwind**:

```typescript
// ❌ WRONG:
<input className="h-12 px-4" />  // h-12 is 48px, but let's be explicit

// ✅ CORRECT:
<input 
  className="min-h-[48px] px-4 py-3 text-base" 
  // min-h-[48px] = 48px minimum
  // px-4 = 16px horizontal padding
  // py-3 = 12px vertical padding (24px total)
  // text-base = 16px font (prevents iOS zoom)
/>
```

**Spacing between form fields**:
```typescript
<div className="space-y-4">  {/* 16px vertical spacing */}
  <Input label="Name" />
  <Input label="Email" />
  <Input label="Phone" />
</div>
```

---

### Sprint 1.6: Cart Button to Thumb Zone (FAB)

**File**: `packages/web/src/apps/ordering/customer/components/CartButton.tsx`  
**Fix using Tailwind and design tokens**:

```typescript
// ❌ WRONG:
const fabStyles = "width: 56px; height: 56px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);";

// ✅ CORRECT:
<button className="fixed bottom-4 right-4 w-14 h-14 rounded-full bg-brand text-text-inverse shadow-lg flex items-center justify-center">
  <ShoppingCart className="w-6 h-6" />
  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-danger text-text-inverse text-xs flex items-center justify-center">
    {itemCount}
  </span>
</button>

// Tailwind breakdown:
// w-14 h-14 = 56×56px
// rounded-full = circular FAB
// bg-brand = uses design token (overridable per tenant)
// text-text-inverse = white text on brand color
// shadow-lg = uses shadow token from tokens.css
// w-5 h-5 = 20×20px badge
// bg-danger = uses danger token (red)
```

---

### Sprint 1.8: Bottom Sheet Height

**File**: `packages/web/src/components/patterns/BottomSheet.tsx`  
**Fix using Tailwind**:

```typescript
// ❌ WRONG:
const sheetHeight = "height: 70vh;";

//✅ CORRECT:
<div className="fixed bottom-0 left-0 right-0 h-[70vh] rounded-t-2xl shadow-lg">
  {/* Drag handle */}
  <div className="w-8 h-1 bg-border rounded-full mx-auto mt-2" />
  
  {/* Content */}
  <div className="p-4 overflow-y-auto max-h-[calc(70vh-60px)]">
    {children}
  </div>
</div>

// Tailwind breakdown:
// h-[70vh] = 70% viewport height
// rounded-t-2xl = uses --radius-xl token
// shadow-lg = uses shadow token
// w-8 h-1 = drag handle size
// bg-border = uses border token
// max-h-[calc(70vh-60px)] = account for drag handle
```

---

### Sprint 1.9: Quantity Adjusters

**File**: `packages/web/src/components/patterns/QuantityAdjuster.tsx`  
**Fix using Tailwind**:

```typescript
// ❌ WRONG:
<button className="width: 48px; height: 48px; border: 1px solid #e5e7eb;">

// ✅ CORRECT:
<button className="w-12 h-12 flex items-center justify-center border border-border rounded-lg hover:bg-bg-muted active:scale-95 transition-transform">
  <Minus className="w-5 h-5" />
</button>
<span className="w-12 text-center font-medium">{quantity}</span>
<button className="w-12 h-12 flex items-center justify-center border border-border rounded-lg hover:bg-bg-muted active:scale-95 transition-transform">
  <Plus className="w-5 h-5" />
</button>

// Tailwind breakdown:
// w-12 h-12 = 48×48px
// border-border = uses border token
// rounded-lg = uses radius-lg token
// hover:bg-bg-muted = uses muted surface token
// active:scale-95 = press feedback
```

---

### Sprint 1.10: Sticky Category Navigation

**File**: `packages/web/src/apps/ordering/customer/components/CategoryNav.tsx`  
**Fix using Tailwind**:

```typescript
// ❌ WRONG:
const navStyles = "position: sticky; top: 0; z-index: 10; background: white; box-shadow: 0 2px 4px rgba(0,0,0,0.1);";

// ✅ CORRECT:
<div className="sticky top-0 z-10 bg-bg shadow-sm">
  <div className="flex gap-2 overflow-x-auto px-4 py-3">
    {categories.map(cat => (
      <button 
        key={cat.id}
        className={cn(
          "px-4 py-2 rounded-full whitespace-nowrap",
          activeCategory === cat.id 
            ? "bg-brand text-text-inverse" 
            : "bg-bg-surface text-text hover:bg-bg-muted"
        )}
      >
        {cat.name}
      </button>
    ))}
  </div>
</div>

// Tailwind breakdown:
// sticky top-0 = makes nav sticky
// z-10 = stays above content
// bg-bg = uses background token
// shadow-sm = uses shadow token
// px-4 py-2 = padding
// rounded-full = pill shape (uses radius-full token)
// bg-brand / bg-bg-surface = uses design tokens
// text-text-inverse / text-text = uses text tokens
```

---

## New Components (Following Design System)

### ConfirmButton Pattern

**File**: `packages/web/src/components/patterns/ConfirmButton.tsx` (NEW)

```typescript
import { type ReactNode, useState } from 'react';
import { Button } from '@web/components/ui';
import { cn } from '@web/lib/utils';

interface ConfirmButtonProps {
  onConfirm: () => void;
  message: string;
  confirmVariant?: 'destructive' | 'primary';
  children: ReactNode;
  className?: string;
}

export function ConfirmButton({ 
  onConfirm, 
  message, 
  confirmVariant = 'destructive',
  children,
  className 
}: ConfirmButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  
  const handleClick = () => {
    if (!showConfirm) {
      setShowConfirm(true);
      // Auto-reset after 3 seconds
      setTimeout(() => setShowConfirm(false), 3000);
    } else {
      onConfirm();
      setShowConfirm(false);
    }
  };
  
  return (
    <Button
      variant={showConfirm ? confirmVariant : 'secondary'}
      onClick={handleClick}
      className={cn('transition-all', className)}
    >
      {showConfirm ? message : children}
    </Button>
  );
}
```

**Usage** (follows existing Button component patterns):
```typescript
<ConfirmButton
  onConfirm={() => deleteOrder(order.id)}
  message="Delete?"
  confirmVariant="destructive"
>
  Delete Order
</ConfirmButton>
```

---

### Toast Notification Pattern

**File**: `packages/web/src/components/patterns/Toast.tsx` (NEW)

```typescript
import { type ReactNode } from 'react';
import { cn } from '@web/lib/utils';
import { X, CheckCircle, AlertCircle } from 'lucide-react';

type ToastVariant = 'success' | 'error' | 'info';

interface ToastProps {
  variant?: ToastVariant;
  title: string;
  message?: string;
  duration?: number;
  onDismiss?: () => void;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function Toast({ 
  variant = 'info',
  title,
  message,
  duration = 4000,
  onDismiss,
  action
}: ToastProps) {
  const variantStyles = {
    success: 'bg-success-light text-success border-success',
    error: 'bg-danger-light text-danger border-danger',
    info: 'bg-info-light text-info border-info',
  };
  
  // Auto-dismiss after duration
  setTimeout(() => onDismiss?.(), duration);
  
  return (
    <div className={cn(
      "fixed bottom-4 left-1/2 -translate-x-1/2 w-[90%] max-w-md p-4 rounded-lg border shadow-lg flex items-start gap-3 animate-in slide-in-from-bottom",
      variantStyles[variant]
    )}>
      {/* Icon */}
      {variant === 'success' && <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />}
      {variant === 'error' && <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />}
      
      {/* Content */}
      <div className="flex-1">
        <h4 className="font-medium text-sm">{title}</h4>
        {message && <p className="text-sm opacity-90 mt-0.5">{message}</p>}
      </div>
      
      {/* Actions */}
      <div className="flex items-center gap-2">
        {action && (
          <button 
            onClick={action.onClick}
            className="text-sm font-medium underline"
          >
            {action.label}
          </button>
        )}
        <button 
          onClick={onDismiss}
          className="p-1 hover:bg-black/5 rounded"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
```

---

### EmptyState Pattern

**File**: `packages/web/src/components/patterns/EmptyState.tsx` (NEW)

```typescript
import { type ReactNode } from 'react';
import { Package } from 'lucide-react';

interface EmptyStateProps {
  illustration?: ReactNode;
  title: string;
  description?: string;
  action?: string;
  onAction?: () => void;
}

export function EmptyState({ 
  illustration,
  title, 
  description,
  action,
  onAction 
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {illustration || (
        <div className="w-16 h-16 rounded-full bg-bg-muted flex items-center justify-center mb-4">
          <Package className="w-8 h-8 text-text-tertiary" />
        </div>
      )}
      
      <h3 className="text-lg font-semibold text-text mb-2">{title}</h3>
      
      {description && (
        <p className="text-text-secondary max-w-md mb-6">{description}</p>
      )}
      
      {action && onAction && (
        <button 
          onClick={onAction}
          className="px-6 py-3 bg-brand text-text-inverse rounded-lg hover:bg-brand-hover transition-colors"
        >
          {action}
        </button>
      )}
    </div>
  );
}
```

**Usage**:
```typescript
<EmptyState
  title="No orders yet"
  description="When customers place orders, they'll appear here."
  action="Create Order"
  onAction={() => navigate('/orders/new')}
/>
```

---

### Skeleton Loading Pattern

**File**: `packages/web/src/components/patterns/Skeleton.tsx` (NEW)

```typescript
import { cn } from '@web/lib/utils';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div 
      className={cn(
        "animate-pulse rounded-md bg-bg-muted",
        className
      )}
    />
  );
}

// Pre-defined skeleton components
export function SkeletonCard() {
  return (
    <div className="bg-bg-surface rounded-lg border border-border p-4 space-y-3">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-12 w-full" />
    </div>
  );
}

export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
```

---

### BackToTop Button

**File**: `packages/web/src/components/patterns/BackToTop.tsx` (NEW)

```typescript
import { useState, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';
import { cn } from '@web/lib/utils';

export function BackToTop() {
  const [visible, setVisible] = useState(false);
  
  useEffect(() => {
    const handleScroll = () => {
      // Show after scrolling 2-3 screen heights
      if (window.scrollY > window.innerHeight * 2) {
        setVisible(true);
      } else {
        setVisible(false);
      }
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  if (!visible) return null;
  
  return (
    <button
      onClick={scrollToTop}
      className="fixed bottom-20 right-4 w-12 h-12 rounded-full bg-brand text-text-inverse shadow-lg flex items-center justify-center hover:bg-brand-hover transition-colors z-40"
      aria-label="Back to top"
    >
      <ArrowUp className="w-5 h-5" />
    </button>
  );
}
```

---

## Spacing & Sizing Reference (Tailwind)

### Touch Target Sizing
```typescript
// Buttons/Inputs (48×48px minimum)
className="min-h-[48px] px-4 py-3"     // 48px min-height, 16px padding
className="w-12 h-12"                       // 48×48px
className="p-3"                            // 12px padding (48×48px if content sized)

// Between buttons
className="gap-2"                           // 8px spacing
className="gap-3"                           // 12px spacing

// List items
className="space-y-2"                      // 8px between items
className="space-y-3"                      // 12px between items
className="space-y-4"                      // 16px between items (form fields)
```

### Typography Sizing
```typescript
className="text-base"                       // 16px (body text)
className="text-sm"                         // 14px (secondary)
className="text-lg"                         // 18px (H3)
className="text-xl"                         // 20px (H2)
className="text-2xl"                        // 24px (H2 large)
className="text-3xl"                        // 30px (H1)
```

### Component Spacing
```typescript
// FAB size
className="w-14 h-14"                       // 56×56px (standard FAB)

// Badge on FAB
className="absolute -top-1 -right-1 w-5 h-5"  // Offset from top-right

// Bottom sheet
className="h-[70vh]"                        // 70% viewport height
className="max-h-[calc(70vh-60px)]"        // Account for drag handle

// Drag handle
className="w-8 h-1 bg-border rounded-full"  // 32×4px pill shape
```

---

## Color Token Reference (from tokens.css)

### Surfaces
- `bg-bg` — Main background
- `bg-bg-surface` — Card/surface background
- `bg-bg-muted` — Muted background
- `bg-bg-elevated` — Elevated surface

### Text
- `text-text` — Primary text
- `text-text-secondary` — Secondary text
- `text-text-tertiary` — Tertiary text
- `text-text-inverse` — Inverse text (white on dark)

### Semantic Colors
- `bg-brand` / `text-brand` — Primary brand color (blue)
- `bg-brand-hover` — Brand hover state
- `bg-primary` / `text-primary` — Primary actions
- `bg-danger` / `text-danger` — Destructive actions
- `bg-success` / `text-success` — Success state
- `bg-warning` / `text-warning` — Warning state
- `bg-info` / `text-info` — Info state

### Light Variants
- `bg-primary-light` — Primary light variant
- `bg-danger-light` — Danger light variant
- `bg-success-light` — Success light variant
- `bg-warning-light` — Warning light variant
- `bg-info-light` — Info light variant

---

## Testing Compliance

### Before Implementing
- [ ] Read existing component patterns from `@web/components/ui/`
- [ ] Verify token exists in `tokens.css` before using
- [ ] Check if shared component already exists
- [ ] Follow import boundary rules (no app-to-app imports)

### After Implementing
- [ ] No hardcoded colors in code (grep for `#[0-9a-f]`)
- [ ] No hardcoded pixel values in CSS (grep for `px` except in Tailwind arbitrary values)
- [ ] All spacing uses Tailwind classes (`p-4`, `gap-3`, etc.)
- [ ] All colors use token classes (`bg-primary`, `text-text`, etc.)
- [ ] Components imported from correct barrel (`@web/components/ui`, `@web/components/patterns`)
- [ ] Design system compliance check passed

---

## Quick Reference Card

| What You Need | ❌ Don't Use | ✅ Use Instead |
|----------------|--------------|------------------|
| Button padding | `padding: 12px 16px` | `px-4 py-3` |
| Button height | `height: 48px` | `min-h-[48px]` |
| Button color | `background: #2563eb` | `bg-brand` or `bg-primary` |
| Text color | `color: #ffffff` | `text-text-inverse` |
| Border | `border: 1px solid #e5e7eb` | `border border-border` |
| Spacing | `gap: 8px` | `gap-2` |
| Shadow | `box-shadow: 0 4px 6px` | `shadow-md` |
| Radius | `border-radius: 8px` | `rounded-lg` |

---

## Compliance Checklist

### For Each Fix
- [ ] Uses Tailwind spacing classes (p-4, gap-3, etc.)
- [ ] Uses design token classes (bg-brand, text-text, etc.)
- [ ] No hardcoded colors (no `#` hex values)
- [ ] No hardcoded pixel values in CSS (except Tailwind arbitrary values)
- [ ] Follows existing component patterns
- [ ] Uses correct imports from barrels
- [ ] Respects import boundary rules

### For New Components
- [ ] Created in correct location (ui/ or patterns/)
- [ ] Follows existing component structure
- [ ] Uses design tokens for all visual values
- [ ] Exported via barrel file
- [ ] Has TypeScript types
- [ ] Has responsive variants (mobile-first)

---

**Document Version**: 2.0 (Revised for Design System Compliance)  
**Last Updated**: 2026-04-11  
**Status**: Ready for execution — All code examples follow Nexus design system rules
