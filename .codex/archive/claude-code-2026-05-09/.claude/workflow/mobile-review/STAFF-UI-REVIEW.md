# Staff Mobile UX Review

## Review Date: 2025-02-21 (Cycle 1)

## Overall Assessment: 56/100 (Critical Issues)

---

## Orders Dashboard (`/ordering/orders`)

### Touch Target Issues

| Element | Current Size | Required Size | Priority |
|---------|--------------|---------------|----------|
| Order cards (full card buttons) | ❌ Unknown height | ✅ min-h-[48px] | HIGH |
| Status filter dropdown | ❌ Default | ✅ h-12 (48px) | HIGH |
| Table Number input | ❌ Default | ✅ h-12 (48px) | HIGH |
| Clear table filter button | ❌ Default | ✅ min-h-[44px] min-w-[44px] | MEDIUM |

### Layout Issues

| Issue | Description | Priority |
|-------|-------------|----------|
| Card spacing | Order cards need better vertical spacing for mobile | MEDIUM |
| Text truncation | Long order details may overflow on small screens | MEDIUM |
| Status badges | Ensure badges don't crowd content | LOW |

---

## Menu Management (`/ordering/menu`)

### Touch Target Issues

| Element | Current Size | Required Size | Priority |
|---------|--------------|---------------|----------|
| Category "Add" button | ❌ Default | ✅ min-h-[48px] min-w-[48px] | HIGH |
| Category action buttons (Edit, Del) | ❌ Icon buttons | ✅ min-h-[44px] min-w-[44px] | HIGH |
| Move up/down buttons | ❌ Icon buttons | ✅ min-h-[44px] min-w-[44px] | HIGH |
| Item "Add Item" button | ❌ Default | ✅ min-h-[48px] min-w-[48px] | HIGH |
| Item action buttons (Edit, Delete, Manage) | ❌ Icon buttons | ✅ min-h-[44px] min-w-[44px] | HIGH |
| Availability toggle | ❓ Need to check | ✅ h-12 w-12 touch area | HIGH |

### Layout Issues

| Issue | Description | Priority |
|-------|-------------|----------|
| Category section headers | Need better mobile spacing | MEDIUM |
| Item card layout | Ensure image + text + actions fit mobile width | MEDIUM |
| Button groups | Multiple small buttons are hard to tap accurately | HIGH |

---

## Modifiers Management (`/ordering/modifiers`)

### Touch Target Issues

| Element | Current Size | Required Size | Priority |
|---------|--------------|---------------|----------|
| Group "Add" button | ❌ Default | ✅ min-h-[48px] min-w-[48px] | HIGH |
| Group action buttons (Edit, Del) | ❌ Icon/text buttons | ✅ min-h-[44px] min-w-[44px] | HIGH |
| Option "Add Option" button | ❌ Default | ✅ min-h-[48px] min-w-[48px] | HIGH |
| Option action buttons (Edit, Delete) | ❌ Icon/text buttons | ✅ min-h-[44px] min-w-[44px] | HIGH |

### Layout Issues

| Issue | Description | Priority |
|-------|-------------|----------|
| Modifier option list | Needs better vertical spacing | MEDIUM |
| Price display | Ensure prices don't crowd action buttons | LOW |

---

## Forms & Dialogs (All Pages)

### Touch Target Issues

| Element | Current Size | Required Size | Priority |
|---------|--------------|---------------|----------|
| Input fields | ❓ Need to check | ✅ h-12 (48px) | HIGH |
| Form submit buttons | ❓ Need to check | ✅ h-12 (48px) | HIGH |
| Cancel/close buttons | ❓ Need to check | ✅ min-h-[44px] min-w-[44px] | HIGH |
| Dialog action buttons | ❓ Need to check | ✅ h-12 (48px) | MEDIUM |

---

## Priority Implementation Order

### Phase 1: Critical Touch Targets (HIGH priority)
1. ✅ Orders Dashboard - order cards, filter controls
2. ✅ Menu Management - all action buttons
3. ✅ Modifiers Management - all action buttons

### Phase 2: Form Improvements (HIGH priority)
4. ✅ Input field sizing across all forms
5. ✅ Dialog button sizing

### Phase 3: Layout Polish (MEDIUM priority)
6. ✅ Spacing and padding improvements
7. ✅ Text truncation and overflow handling

---

## Files to Modify

1. `packages/web/src/apps/ordering/merchant/OrdersDashboard.tsx`
2. `packages/web/src/apps/ordering/merchant/MenuManagement.tsx`
3. `packages/web/src/apps/ordering/merchant/ModifierManager.tsx`
4. `packages/web/src/components/ui/Input.tsx` (if needed for form inputs)
5. `packages/web/src/components/ui/Button.tsx` (if needed for consistent sizing)

---

## Success Criteria

After fixes, all staff interfaces should have:
- ✅ All touch targets ≥ 48×48px (WCAG 2.1 Level AA)
- ✅ Proper spacing for mobile tap accuracy
- ✅ Consistent button sizing across pages
- ✅ Forms optimized for mobile input
- ✅ No cramped or overlapping controls

**Target Score**: 90/100 after Phase 1-3 completion
