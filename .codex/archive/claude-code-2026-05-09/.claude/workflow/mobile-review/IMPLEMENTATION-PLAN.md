# Mobile UI Fixes — Implementation Plan

**Date**: 2026-04-11  
**Status**: Ready for execution  
**Based on**: FINAL-REVIEW.md comprehensive mobile UI audit  
**Goal**: Achieve 90%+ mobile UI score, production-ready quality

---

## Phase 1: Critical Fixes (Week 1) — BLOCKING ISSUES

**Timeline**: 6-9 days (can parallelize staff/customer work)  
**Goal**: Resolve production blockers, achieve basic accessibility compliance  
**Success Criteria**: All critical issues from FINAL-REVIEW.md resolved

### Sprint 1.1: Staff-Facing Critical Fixes (5-7 days)

#### 1.1 Orders Dashboard Action Buttons (2-3 days)
**File**: `packages/web/src/apps/ordering/merchant/orders-dashboard.tsx`  
**Issue**: Status buttons 28-32px, need 48×48px  
**Tasks**:
- [ ] Measure current button sizes with DevTools
- [ ] Update button CSS to `min-height: 48px; min-width: 48px`
- [ ] Add 8px horizontal/vertical spacing between buttons
- [ ] Implement swipe actions alternative (left=delete, right=edit)
- [ ] Add confirmation dialogs for status changes
- [ ] Add undo toasts after status changes
- [ ] Test on iPhone 14 (390px) and small Android (360px)
- [ ] Verify WCAG 2.1 AAA compliance (44×44px minimum)

**Code Changes**:
```typescript
// Add to styles
const buttonStyles = css`
  min-height: 48px;
  min-width: 48px;
  padding: 12px 16px;
  gap: 8px;
`;

// Confirmation dialog
const confirmStatusChange = (order: Order, newStatus: OrderStatus) => {
  return confirm(`Mark order #${order.tableNumber} as ${newStatus}?`);
};
```

**Estimated**: 2-3 days

---

#### 1.2 Kitchen Display Color Coding (1-2 days)
**File**: `packages/web/src/apps/ordering/merchant/kitchen-display.tsx`  
**Issue**: No visual status differentiation  
**Tasks**:
- [ ] Define color scheme: New (yellow #FCD34D), Cooking (orange #F97316), Ready (green #22C55E), Delivered (blue #3B82F6)
- [ ] Add color-coded status badges to order cards
- [ ] Add elapsed time display (e.g., "5 min ago")
- [ ] Implement color aging (yellow → orange → red as time passes)
- [ ] Add status filter tabs (All, New, Cooking, Ready, Delivered)
- [ ] Test color contrast ratios (WCAG AA)
- [ ] Verify status visibility from 6ft distance

**Code Changes**:
```typescript
const statusColors = {
  new: 'bg-yellow-100 text-yellow-800',
  cooking: 'bg-orange-100 text-orange-800',
  ready: 'bg-green-100 text-green-800',
  delivered: 'bg-blue-100 text-blue-800',
};

const elapsedTime = (order: Order) => {
  const minutes = Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 60000);
  return `${minutes} min ago`;
};
```

**Estimated**: 1-2 days

---

#### 1.3 Touch Target Audit & Fixes (2-3 days)
**Files**: All staff-facing components  
**Issue**: Widespread touch target violations  
**Tasks**:
- [ ] Create audit checklist (Excel/Google Sheets)
- [ ] Test on real device (iPhone 14 + small Android)
- [ ] Use browser inspector to measure every interactive element
- [ ] Document all elements below 44×44px
- [ ] Fix all icon buttons (add padding to reach 44×44px)
- [ ] Fix all navigation items (sidebar, tabs)
- [ ] Fix all form inputs (48px height minimum)
- [ ] Fix all toggles (48×32px minimum)
- [ ] Fix all checkboxes (44×44px minimum)
- [ ] Re-test after fixes
- [ ] Document measurements for future reference

**Measurement Tool**:
```javascript
// Run in browser console on each screen
document.querySelectorAll('button, a, input, [role="button"]').forEach(el => {
  const rect = el.getBoundingClientRect();
  if (rect.width < 44 || rect.height < 44) {
    console.log('Small touch target:', el, rect.width, 'x', rect.height);
  }
});
```

**Estimated**: 2-3 days

---

#### 1.4 Input Field Heights (1 day)
**File**: `packages/web/src/components/ui/Input.tsx`  
**Issue**: Inputs 40-42px, need 48px  
**Tasks**:
- [ ] Update Input component base styles to `min-height: 48px`
- [ ] Update vertical padding to `12px` (16px total with border)
- [ ] Add 16px vertical spacing between form fields
- [ ] Test all forms (login, menu edit, settings)
- [ ] Verify on mobile devices

**Code Changes**:
```css
/* In Input component */
.input {
  min-height: 48px;
  padding: 12px 16px;
  font-size: 16px; /* Prevents iOS zoom */
}

.form-group + .form-group {
  margin-top: 16px;
}
```

**Estimated**: 1 day

---

#### 1.5 Confirmation Dialogs (2-3 days)
**File**: `packages/web/src/components/patterns/ConfirmButton.tsx`  
**Issue**: No confirmations for destructive actions  
**Tasks**:
- [ ] Implement ConfirmButton pattern (3-second auto-reset)
- [ ] Add to all delete actions (menu items, modifiers, staff)
- [ ] Add to all remove actions (cart, order items)
- [ ] Add to all status changes (orders)
- [ ] Test confirmation flow
- [ ] Verify dialog accessibility (focus trap, ESC to close)

**Code Changes**:
```typescript
interface ConfirmButtonProps {
  onConfirm: () => void;
  message: string;
  children: React.ReactNode;
}

export function ConfirmButton({ onConfirm, message, children }: ConfirmButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  
  // 3-second auto-reset after first click
  const handleClick = () => {
    if (!showConfirm) {
      setShowConfirm(true);
      setTimeout(() => setShowConfirm(false), 3000);
    } else {
      onConfirm();
      setShowConfirm(false);
    }
  };
  
  return (
    <button onClick={handleClick} className={showConfirm ? 'bg-red-600' : ''}>
      {showConfirm ? message : children}
    </button>
  );
}
```

**Estimated**: 2-3 days

---

### Sprint 1.2: Customer-Facing Critical Fixes (1-2 days)

#### 1.6 Cart Button to Thumb Zone (2 hours)
**File**: `packages/web/src/apps/ordering/customer/components/CartButton.tsx`  
**Issue**: Cart button top-right (hard zone)  
**Tasks**:
- [ ] Move cart button from top-right to bottom-right
- [ ] Make floating action button (FAB) with shadow
- [ ] Increase size to 56×56px
- [ ] Show order total: "$24.50 (3 items)"
- [ ] Add smooth animation on cart updates
- [ ] Test on various screen sizes

**Code Changes**:
```css
.cart-fab {
  position: fixed;
  bottom: 16px;
  right: 16px;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  z-index: 50;
}
```

**Estimated**: 2 hours

---

#### 1.7 Required Modifier Badges (1 hour)
**File**: `packages/web/src/apps/ordering/customer/components/ItemDetailSheet.tsx`  
**Issue**: No clear required indicators  
**Tasks**:
- [ ] Add red asterisk (*) to required modifier headers
- [ ] Add "Required" badge in red text
- [ ] Add "Optional" label to non-required modifiers
- [ ] Prevent sheet close if required modifiers missing
- [ ] Show inline error: "Please select required options"
- [ ] Test validation flow

**Code Changes**:
```typescript
<div className="modifier-group">
  <div className="flex items-center gap-2">
    <h3>{group.name}</h3>
    {group.required && (
      <>
        <span className="text-red-500">*</span>
        <span className="text-xs text-red-500 bg-red-50 px-2 py-1 rounded">Required</span>
      </>
    )}
    {!group.required && (
      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">Optional</span>
    )}
  </div>
</div>
```

**Estimated**: 1 hour

---

#### 1.8 Bottom Sheet Height (2 hours)
**File**: `packages/web/src/components/patterns/BottomSheet.tsx`  
**Issue**: Sheets 50-60%, need 70-75%  
**Tasks**:
- [ ] Update item detail sheet to 70% height
- [ ] Update cart sheet to 75% height
- [ ] Update combo sheet to 70% height
- [ ] Add drag handle at top (32×4px white pill)
- [ ] Test on iPhone SE and small Android
- [ ] Ensure CTAs visible without scroll

**Code Changes**:
```css
.bottom-sheet {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  /* Item detail: 70%, Cart: 75%, Combo: 70% */
  height: 70vh; 
  border-radius: 16px 16px 0 0;
  box-shadow: 0 -4px 6px rgba(0,0,0,0.1);
}

.drag-handle {
  width: 32px;
  height: 4px;
  background: #e5e7eb;
  border-radius: 2px;
  margin: 8px auto;
}
```

**Estimated**: 2 hours

---

#### 1.9 Quantity Adjusters (1 hour)
**File**: `packages/web/src/components/patterns/QuantityAdjuster.tsx`  
**Issue**: Buttons 36-40px, need 48×48px  
**Tasks**:
- [ ] Update minus/plus buttons to 48×48px
- [ ] Add 8px spacing from other elements
- [ ] Test tap accuracy on real device

**Code Changes**:
```css
.quantity-button {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: white;
}
```

**Estimated**: 1 hour

---

#### 1.10 Sticky Category Navigation (2 hours)
**File**: `packages/web/src/apps/ordering/customer/components/CategoryNav.tsx`  
**Issue**: Categories scroll away  
**Tasks**:
- [ ] Add `position: sticky; top: 0;` to category nav
- [ ] Add z-index: 10 to stay above content
- [ ] Add shadow on scroll
- [ ] Add active pill background (primary color)
- [ ] Test sticky behavior on long menus

**Code Changes**:
```css
.category-nav {
  position: sticky;
  top: 0;
  z-index: 10;
  background: white;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.category-pill.active {
  background: var(--color-primary);
  color: white;
}
```

**Estimated**: 2 hours

---

## Phase 2: High-Priority Features (Week 2) — CONVERSION OPTIMIZATION

**Timeline**: 5-7 days  
**Goal**: Improve UX, match competitor standards, increase conversion

### Sprint 2.1: Staff-Facing High-Priority (3-4 days)

#### 2.1 Swipe Actions (2-3 days)
**Files**: Menu management, modifiers, promotions lists  
**Tasks**:
- [ ] Implement swipe-to-delete (left swipe, red background)
- [ ] Implement swipe-to-edit (right swipe, blue background)
- [ ] Add visual affordance (partial reveal)
- [ ] Add haptic feedback
- [ ] Test swipe gestures on iOS and Android
- [ ] Add swipe hint animation on first load

**Libraries**: Consider `react-swipeable` or native gesture handlers

**Estimated**: 2-3 days

---

#### 2.2 FABs for Add Actions (1 day)
**Files**: All list screens with "Add" button  
**Tasks**:
- [ ] Replace top "Add" buttons with FAB at bottom-right
- [ ] Use 56×56px size (Material Design standard)
- [ ] Add shadow and elevation
- [ ] Ensure always visible, doesn't cover content
- [ ] Test on various screen sizes

**Estimated**: 1 day

---

#### 2.3 Loading States (2-3 days)
**Files**: All list screens, forms, async operations  
**Tasks**:
- [ ] Implement skeleton screens for lists (menu items, orders, staff)
- [ ] Add spinner to buttons during async operations
- [ ] Add pull-to-refresh to scrollable lists
- [ ] Add loading overlays for forms
- [ ] Add progress bars for long operations
- [ ] Test loading states on slow 3G connection

**Skeleton Component**:
```typescript
function SkeletonCard() {
  return (
    <div className="bg-gray-100 rounded-lg p-4 animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
      <div className="h-4 bg-gray-200 rounded w-1/2" />
    </div>
  );
}
```

**Estimated**: 2-3 days

---

#### 2.4 Empty States (2-3 days)
**Files**: All list screens  
**Tasks**:
- [ ] Create EmptyState component with illustration
- [ ] Add friendly message: "No orders yet", "No menu items"
- [ ] Add clear CTA: "Create your first order", "Add menu item"
- [ ] Apply to all list views
- [ ] Test empty state visibility

**EmptyState Component**:
```typescript
interface EmptyStateProps {
  illustration?: string;
  message: string;
  action: string;
  onAction: () => void;
}

export function EmptyState({ illustration, message, action, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      {illustration && <img src={illustration} alt="" className="w-32 h-32 mb-4" />}
      <p className="text-gray-600 mb-4">{message}</p>
      <button onClick={onAction} className="btn-primary">{action}</button>
    </div>
  );
}
```

**Estimated**: 2-3 days

---

#### 2.5 Undo Toasts (1-2 days)
**File**: `packages/web/src/components/patterns/Toast.tsx`  
**Tasks**:
- [ ] Implement toast notification system
- [ ] Add undo button to toasts
- [ ] Position at bottom-center (above nav)
- [ ] Auto-dismiss after 5-7 seconds
- [ ] Add to all destructive actions
- [ ] Test undo functionality

**Estimated**: 1-2 days

---

### Sprint 2.2: Customer-Facing High-Priority (2-3 days)

#### 2.6 Expand First Category (1 hour)
**File**: `packages/web/src/apps/ordering/customer/components/Menu.tsx`  
**Tasks**:
- [ ] Auto-expand first category on load
- [ ] Show 2-3 featured items immediately
- [ ] Improve first impression
- [ ] Test initial load state

**Estimated**: 1 hour

---

#### 2.7 Active Category Pill (1 hour)
**File**: `packages/web/src/apps/ordering/customer/components/CategoryNav.tsx`  
**Tasks**:
- [ ] Add pill background to active category
- [ ] Use primary color background
- [ ] Use white text for contrast
- [ ] Test active state visibility

**Estimated**: 1 hour

---

#### 2.8 Back to Top Button (2 hours)
**File**: `packages/web/src/apps/ordering/customer/components/BackToTop.tsx`  
**Tasks**:
- [ ] Create floating back-to-top button
- [ ] Show after scrolling 2-3 screen heights
- [ ] Position bottom-right (above cart FAB)
- [ ] Smooth scroll to top
- [ ] Hide when at top

**Estimated**: 2 hours

---

#### 2.9 Combo Sheet Improvements (3-4 hours)
**File**: `packages/web/src/apps/ordering/customer/components/ComboSheet.tsx`  
**Tasks**:
- [ ] Add slot completion badges ("✓ 1 of 1 selected")
- [ ] Update total price in real-time
- [ ] Make required slots prominent
- [ ] Show validation errors
- [ ] Test combo flow end-to-end

**Estimated**: 3-4 hours

---

#### 2.10 Toast Notifications (2-3 hours)
**File**: `packages/web/src/components/patterns/Toast.tsx`  
**Tasks**:
- [ ] Implement success toasts: "Added to cart" with Undo
- [ ] Implement error toasts: Inline error messages
- [ ] Position at bottom-center
- [ ] Duration: 3-4s for success, 5-7s for errors
- [ ] Add to all add-to-cart actions

**Estimated**: 2-3 hours

---

## Phase 3: Polish & Testing (Week 3) — QUALITY ASSURANCE

**Timeline**: 5-7 days  
**Goal**: Achieve production-ready quality, comprehensive testing

### Sprint 3.1: Accessibility Audit (2-3 days)

#### 3.1 Screen Reader Testing (1-2 days)
**Tasks**:
- [ ] Test with VoiceOver (iOS)
- [ ] Test with TalkBack (Android)
- [ ] Verify all images have alt text
- [ ] Verify all icons have aria-labels
- [ ] Verify announcements for dynamic changes
- [ ] Fix all accessibility issues found

**Tools**: iOS Simulator, Android Emulator, NVDA (Windows)

**Estimated**: 1-2 days

---

#### 3.2 Keyboard Navigation (1 day)
**Tasks**:
- [ ] Test Tab through entire interface
- [ ] Verify focus indicators visible
- [ ] Verify logical tab order
- [ ] Verify Enter/Space activate controls
- [ ] Verify Escape closes modals/sheets
- [ ] Fix all keyboard navigation issues

**Estimated**: 1 day

---

#### 3.3 Contrast Verification (1 day)
**Tasks**:
- [ ] Use axe DevTools or contrast checker
- [ ] Verify all text meets WCAG AA (4.5:1)
- [ ] Verify all interactive elements meet 3:1
- [ ] Fix all contrast violations
- [ ] Document all color combinations

**Estimated**: 1 day

---

### Sprint 3.2: Real Device Testing (1-2 days)

#### 3.4 iPhone 14 Testing (1 day)
**Tasks**:
- [ ] Test on iPhone 14 (390×844)
- [ ] Verify all touch targets with actual touch
- [ ] Verify no horizontal scrolling
- [ ] Test all gestures (swipe, tap, long-press)
- [ ] Verify performance on mid-range device

**Estimated**: 1 day

---

#### 3.5 Small Android Testing (1 day)
**Tasks**:
- [ ] Test on small Android (360×640)
- [ ] Verify content fits without cutoff
- [ ] Verify all touch targets accessible
- [ ] Test all forms and inputs
- [ ] Verify keyboard doesn't cover inputs

**Estimated**: 1 day

---

### Sprint 3.3: Usability Testing (2-3 days)

#### 3.6 Staff Usability Testing (1-2 days)
**Tasks**:
- [ ] Recruit 3-5 restaurant staff members
- [ ] Observe them using Orders Dashboard
- [ ] Observe them using Kitchen Display
- [ ] Observe them using Menu Management
- [ ] Record task completion times
- [ ] Record errors and frustrations
- [ ] Gather feedback on button sizes, layout
- [ ] Prioritize improvements based on feedback

**Script**:
- Task 1: Change order status from "Pending" to "Ready"
- Task 2: Add new menu item "Burger" with modifiers
- Task 3: Find order for table 5
- Task 4: Complete order on Kitchen Display

**Estimated**: 1-2 days

---

#### 3.7 Customer Usability Testing (1 day)
**Tasks**:
- [ ] Recruit 3-5 customers
- [ ] Observe them browsing menu
- [ ] Observe them adding items to cart
- [ ] Observe them customizing modifiers
- [ ] Observe them checking out
- [ ] Record where they struggle
- [ ] Gather feedback on UX
- [ ] Prioritize improvements based on feedback

**Script**:
- Task 1: Find and add "Burger" to cart
- Task 2: Customize burger with modifiers
- Task 3: View cart and proceed to checkout
- Task 4: Find vegetarian options

**Estimated**: 1 day

---

### Sprint 3.4: Performance & Polish (2-3 days)

#### 3.8 Performance Optimization (1-2 days)
**Tasks**:
- [ ] Test load times on 3G connection
- [ ] Optimize images (WebP, lazy loading)
- [ ] Implement code splitting
- [ ] Minimize JavaScript bundle
- [ ] Add service worker for offline support
- [ ] Test Lighthouse performance score (>80)

**Estimated**: 1-2 days

---

#### 3.9 Micro-interactions (1 day)
**Tasks**:
- [ ] Add button press animations
- [ ] Add card lift on tap
- [ ] Add smooth page transitions
- [ ] Add loading shimmer
- [ ] Add haptic feedback (where supported)
- [ ] Test all animations at 60fps

**Estimated**: 1 day

---

## Testing Checklist

### Before Launch (Must Pass)

#### Touch Target Verification
- [ ] All primary buttons: 48×48px minimum
- [ ] All secondary buttons: 44×44px minimum
- [ ] All icon buttons: Padding to reach 44×44px
- [ ] Destructive buttons: 48×48px minimum + confirmation
- [ ] Order cards: 48px+ height
- [ ] Menu items: 48px+ height
- [ ] Navigation items: 44×44px minimum
- [ ] Form inputs: 48px height minimum
- [ ] Toggles: 48×32px minimum
- [ ] Checkboxes: 44×44px minimum

#### Spacing Verification
- [ ] Horizontal spacing: 8px+ between buttons
- [ ] Vertical spacing: 8px+ between buttons
- [ ] List item spacing: 8-12px between cards
- [ ] Field spacing: 16-24px between form fields

#### Typography Verification
- [ ] Body text: 16px minimum
- [ ] Headings: H1 (28-32px), H2 (20-24px), H3 (16-18px)
- [ ] Secondary text: 12-14px
- [ ] Line height: 1.4-1.6 for body text

#### Accessibility Verification
- [ ] WCAG AA contrast ratios (4.5:1 for text, 3:1 for large text)
- [ ] All images have alt text
- [ ] All icons have aria-labels
- [ ] Focus indicators visible on all interactive elements
- [ ] Screen reader announcements for dynamic changes
- [ ] Keyboard navigation functional (Tab through interface)

#### UX Pattern Verification
- [ ] Bottom sheets at 70%+ height
- [ ] Cart button in thumb zone (bottom-right/center)
- [ ] Category navigation sticky
- [ ] Required modifiers clearly indicated
- [ ] Loading states on all async operations
- [ ] Empty states on all list views
- [ ] Confirmation dialogs for destructive actions
- [ ] Toast notifications with undo

---

## Success Metrics

### Phase 1 Completion (After Week 1)
- [ ] 100% of touch targets meet 44×44px minimum
- [ ] Kitchen Display has color-coded status
- [ ] Cart button in thumb zone
- [ ] Required modifiers clearly indicated
- [ ] Bottom sheets at 70%+ height
- [ ] All critical accessibility violations resolved
- [ ] Average score improves from 62% to 75%+

### Phase 2 Completion (After Week 2)
- [ ] Swipe actions working on all list screens
- [ ] Loading states present on all async operations
- [ ] Empty states on all list views
- [ ] Toast notifications with undo
- [ ] Categories expanded by default
- [ ] Active category has pill background
- [ ] Back-to-top button functional
- [ ] Combo sheet shows slot completion
- [ ] Average score improves to 85%+

### Phase 3 Completion (After Week 3)
- [ ] 90%+ score on mobile UI checklist
- [ ] Zero critical accessibility violations
- [ ] WCAG AA compliance verified
- [ ] Average task completion time < 10 seconds
- [ ] Error rate < 5% (tapping wrong item)
- [ ] Staff satisfaction > 4/5
- [ ] Customer satisfaction > 4/5
- [ ] Lighthouse accessibility score > 90
- [ ] Lighthouse performance score > 80
- [ ] Average score improves to 90%+

---

## Risk Mitigation

### If Touch Target Fixes Take Longer
- **Fallback**: Prioritize highest-traffic screens (Orders Dashboard, Kitchen Display)
- **Trade-off**: Leave low-traffic screens (Analytics, Settings) for Phase 2

### If Color Coding Affects Performance
- **Fallback**: Use simpler color scheme (fewer color changes)
- **Trade-off**: Prioritize readability over animations

### If Bottom Sheet Height Causes Issues
- **Fallback**: Test different heights (65%, 70%, 75%)
- **Trade-off**: Ensure CTAs are visible, sheet is dismissible

### If Swipe Actions Are Complex
- **Fallback**: Use large buttons instead of swipe
- **Trade-off**: Sacrifice gesture convenience for reliability

---

## Next Steps After Implementation

1. **Conduct final review** using same checklist
2. **Compare scores** (before vs after)
3. **Identify remaining gaps**
4. **Create Phase 4 plan** if needed (iterate until 90%+ score)
5. **Plan production deployment**
6. **Monitor post-launch metrics** (cart abandonment, conversion rate, accessibility complaints)

---

## File Modifications Summary

### Core Components to Modify
- `packages/web/src/components/ui/Input.tsx` — 48px height
- `packages/web/src/components/patterns/ConfirmButton.tsx` — NEW
- `packages/web/src/components/patterns/Toast.tsx` — NEW
- `packages/web/src/components/patterns/BottomSheet.tsx` — 70% height
- `packages/web/src/components/patterns/EmptyState.tsx` — NEW
- `packages/web/src/components/patterns/FAB.tsx` — NEW
- `packages/web/src/components/patterns/Skeleton.tsx` — NEW
- `packages/web/src/components/patterns/BackToTop.tsx` — NEW

### Staff Screens to Modify
- `packages/web/src/apps/ordering/merchant/orders-dashboard.tsx` — Button fixes, swipe
- `packages/web/src/apps/ordering/merchant/kitchen-display.tsx` — Color coding
- `packages/web/src/apps/ordering/merchant/menu-management.tsx` — Swipe, FAB
- `packages/web/src/apps/ordering/merchant/modifiers.tsx` — Swipe, FAB
- `packages/web/src/apps/ordering/merchant/staff.tsx` — Swipe, confirmations

### Customer Screens to Modify
- `packages/web/src/apps/ordering/customer/components/CartButton.tsx` — Move to bottom-right
- `packages/web/src/apps/ordering/customer/components/ItemDetailSheet.tsx` — 70% height, required badges
- `packages/web/src/apps/ordering/customer/components/CategoryNav.tsx` — Sticky, active pill
- `packages/web/src/apps/ordering/customer/components/Menu.tsx` — Expand first category
- `packages/web/src/apps/ordering/customer/components/ComboSheet.tsx` — Slot badges, real-time price

---

**Document Version**: 1.0  
**Last Updated**: 2026-04-11  
**Status**: Ready for execution — Awaiting user approval to proceed

