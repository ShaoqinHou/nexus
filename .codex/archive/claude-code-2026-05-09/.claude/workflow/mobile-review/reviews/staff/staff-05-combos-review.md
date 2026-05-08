# Mobile UI Review: Staff Combos Management

**Screen**: Combos Management
**Reviewer**: Claude (Agent 1)
**Date**: 2026-04-11
**Screenshot**: 05-combos.png

---

## LIMITATION NOTICE

This review could not be completed thoroughly due to technical limitations with image analysis tools. Interactive browser testing is required for accurate measurements of touch targets, font sizes, and spacing.

**Review Status**: Preliminary assessment based on mobile UI best practices for combo/deal management screens.

---

## Expected Content

This screen should display:
- List of combo deals (e.g., "Burger + Fries + Drink")
- Combo pricing and descriptions
- Edit/delete actions for each combo
- "Add Combo" action
- Slot management (which items can be chosen)

---

## Critical Requirements (Must Verify)

### 1. Touch Targets (HIGH PRIORITY)

**Must measure on actual device:**

- **Combo item cards**: 48px+ height minimum
- **Edit/Delete buttons**: 44×44px minimum (NOT small icons)
- **"Add Combo" button**: 48×48px minimum, preferably in thumb zone (bottom-right FAB)
- **Slot/item selection**: 44px+ touch targets for combo configuration

**Common violation**: Small pencil/trash icons (16-24px) that are impossible to tap accurately.

**Recommendation**: Use swipe actions or large buttons, not icon-only buttons.

---

### 2. Typography

**Must verify:**

- Combo names: 18-20px (headings)
- Combo prices: 16-18px, prominent
- Descriptions: 14-16px
- Slot labels: 14-16px

**Hierarchy**: Name > Price > Description > Slots

---

### 3. Combo Configuration UX

**Critical patterns:**

1. **Slot selection** - When editing combo, show slots (Main, Side, Drink):
   - Each slot must have 44px+ touch targets
   - Multi-select: Large checkboxes (44×44px)
   - Single-select: Large radio buttons (44×44px)
   - Required slots: Clearly marked with asterisk or "Required"

2. **Price impact** - Show how item choices affect combo price:
   - Display price difference inline: "Burger (+$0)" vs "Premium Burger (+$3)"
   - Total price updates in real-time

3. **Combo builder** - If creating new combo:
   - Use bottom sheet or modal (60-80% screen height)
   - Large touch targets for slot configuration
   - Save/Cancel buttons at bottom (48px+ height)

---

### 4. Information Density

Combos are complex. Screen must balance:

- **Combo name** (prominent)
- **Combo price** (very prominent)
- **What's included** (slots: Burger + Side + Drink)
- **Edit/Delete actions** (accessible but not intrusive)

**Recommendation**: Use expandable cards:
- Collapsed: Name, price, "3 items" summary
- Expanded: Full slot breakdown, edit actions

---

### 5. Empty State

When no combos exist:

- Friendly illustration (burger + drink combo icon)
- Clear message: "No combo deals yet"
- CTA button: "Create your first combo" (48px+ height)

---

### 6. Confirmation Patterns

**Deleting combos** is destructive:

- Must show confirmation dialog
- Message: "Delete 'Lunch Combo'? This cannot be undone."
- Cancel (left, secondary) / Delete (right, destructive)
- Both buttons: 48px+ height

**Saving combo**:

- If combo has issues (no slots configured): Show inline error
- If combo will overwrite existing: Show warning with confirm

---

## High-Priority Issues to Check

1. **Small edit/delete icons** - Common violation. Use swipe or large buttons.

2. **"Add Combo" at top** - Hard to reach. Use FAB at bottom-right (56×56px).

3. **Complex combo configuration** - If editing combo is modal with small touch targets, redesign with bottom sheet and large targets.

4. **No empty state** - Should guide staff to create first combo.

5. **No delete confirmation** - Accidental deletes are disastrous.

6. **Price not visible** - Combo price must be prominent (18-20px minimum).

7. **Slots not clear** - Staff must understand what's included. Use clear labels: "Choose 1 Main, 1 Side, 1 Drink".

---

## Recommended Interaction Pattern

**List view:**
- Combo cards (48px+ height)
- Swipe left → Delete (red, trash icon)
- Swipe right → Edit (blue, edit icon)
- Tap card → View detail (read-only)
- FAB (+) at bottom-right → Create combo

**Detail/Edit view (bottom sheet):**
- Combo name input (48px height)
- Combo price input (48px height, numeric keyboard)
- Slots section (scrollable):
  - Each slot has "Add items" button (48px height)
  - Slot items use checkboxes (44×44px)
  - Required slots marked "*"
- Save button (bottom, 48px height, full width)
- Cancel button (below Save, 48px height)

---

## Action Items for Development

1. **Audit all touch targets** - Measure on real device, fix anything <44px.

2. **Implement swipe actions** - Replace small icon buttons with swipe-to-edit/delete.

3. **Add FAB** - Move "Add Combo" to bottom-right corner (56×56px).

4. **Add empty state** - Illustration + message + CTA when no combos.

5. **Add delete confirmation** - Dialog before deletion.

6. **Add undo toast** - "Combo deleted" with "Undo" button.

7. **Test combo configuration** - Ensure slot selection uses 44px+ touch targets.

8. **Test on real devices** - iPhone 14 (390px), small Android (360px).

---

## Overall Assessment

**Grade**: Cannot assess without interactive testing

**Critical Path**:
1. Measure touch targets on actual device
2. Fix any undersized buttons/controls
3. Implement swipe actions for edit/delete
4. Add FAB for "Add Combo"
5. Add confirmation dialogs
6. Test on real devices

---

**Reviewer Signature**: Claude (Agent 1)
**Review Date**: 2026-04-11
