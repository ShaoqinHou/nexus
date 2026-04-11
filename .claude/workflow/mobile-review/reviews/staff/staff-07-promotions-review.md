# Mobile UI Review: Staff Promotions Management

**Screen**: Promotions Management
**Reviewer**: Claude (Agent 1)
**Date**: 2026-04-11
**Screenshot**: 07-promotions.png

---

## LIMITATION NOTICE

This review could not be completed thoroughly due to technical limitations with image analysis tools. Interactive browser testing is required for accurate measurements.

**Review Status**: Preliminary assessment based on mobile UI best practices for promotion/discount management screens.

---

## Expected Content

This screen should display:
- Active promotions (discounts, special offers)
- Promo codes (if applicable)
- Promotion types (percentage, fixed amount, BOGO)
- Start/end dates
- Edit/delete actions
- "Add Promotion" action

---

## Critical Requirements (Must Verify)

### 1. Touch Targets (CRITICAL)

**Must measure on actual device:**

- **Promotion cards**: 48px+ height minimum
- **Edit/Delete buttons**: 44×44px minimum (NOT small icons)
- **"Add Promotion" button**: 48×48px minimum
- **Toggle switches (active/inactive)**: 48×32px minimum
- **Date pickers**: 48px height minimum
- **Dropdown selectors**: 44px+ height

**Common violation**: Small edit/delete icons for each promotion.

**Recommendation**: Use swipe actions or large buttons in card footer.

---

### 2. Promotion Card Hierarchy

**Each promotion card should show:**

1. **Promotion name** (18-20px, bold)
   - "Happy Hour", "Lunch Special", "10% Off First Order"

2. **Promotion type** (14-16px, prominent)
   - "10% off", "$5 off", "Buy 1 Get 1 Free"
   - Use badges or color coding

3. **Dates** (14-16px)
   - "Jan 1 - Mar 31, 2026"
   - Show if active/expired/upcoming

4. **Status indicator** (badge)
   - "Active" (green), "Expired" (gray), "Upcoming" (blue)
   - 12-14px font, pill-shaped badge

5. **Actions**
   - Edit button (44×44px)
   - Delete button (44×44px)
   - Toggle for enable/disable (48×32px)

**Spacing**: 12-16px between cards

---

### 3. Promotion Configuration UX

**When adding/editing promotions:**

**Use full-screen form or bottom sheet** (for complex promotions):

**Required fields** (all 48px height inputs):

1. **Promotion name** (text input, 16px font)
   - Label: "Promotion Name" (14px, above input)
   - Placeholder: "e.g., Happy Hour"
   - Required: Yes

2. **Promotion type** (dropdown or segmented control)
   - Options: "Percentage off", "Fixed amount off", "Buy X Get Y"
   - Large touch targets (44px+)

3. **Discount value** (numeric input)
   - If percentage: "10" (0-100)
   - If fixed: "5.00" (currency)
   - Show symbol: "%", "$"

4. **Minimum order** (optional, numeric)
   - "Minimum order amount"
   - Validate: must be positive

5. **Start date** (date picker)
   - Native date picker preferred
   - Show: "Mar 1, 2026"

6. **End date** (date picker)
   - Must be after start date
   - Validate: end > start

7. **Promo code** (optional, text input)
   - If promotion requires code
   - Show: "SPRING2026"
   - Copy button (44×44px)

8. **Usage limits** (optional, numeric)
   - "Max uses" or "Unlimited"
   - Show current/remaining: "47 / 100"

9. **Applicability** (multi-select checkboxes)
   - "Applies to: All items / Selected categories / Specific items"
   - Large checkboxes (44×44px)

10. **Save/Cancel buttons** (bottom, 48px each, full width)

---

### 4. Promotion Types - Clarity

**Different promotion types need clear UI:**

**Percentage off:**
- Input: "10" (0-100)
- Label: "%" (right of input)
- Preview: "10% off"

**Fixed amount off:**
- Input: "5.00"
- Label: "$" (left of input)
- Preview: "$5 off"

**Buy X Get Y (BOGO):**
- "Buy X" input (numeric)
- "Get Y" input (numeric)
- "Discount on Y" (percentage or free)
- Example: "Buy 2 burgers, get 1 free"

**Free delivery:**
- Toggle (48×32px)
- No additional inputs needed

---

### 5. Date/Time Management

**Promotions have start/end dates:**

**Use native date pickers:**
- Large touch targets (48px+)
- Clear focus state
- Show selected date in readable format: "Mar 1, 2026"

**Validation:**
- End date must be after start date
- Show error: "End date must be after start date"
- Prevent past dates (or warn if selecting past)

**Visual indicators:**
- Active promotion: Green badge "Active"
- Upcoming: Blue badge "Starts Mar 1"
- Expired: Gray badge "Ended Feb 28"

---

### 6. Promo Code Management

**If promotions use codes:**

**Code display:**
- Large font (18-20px, monospace)
- Copy button (44×44px, clipboard icon)
- "Copied!" toast feedback

**Code generation:**
- "Auto-generate" button (48px height)
- Or manual input (48px height, uppercase)

**Code validation:**
- Check for duplicates
- Minimum length: 4 characters
- Allowed: A-Z, 0-9, hyphens

---

### 7. Empty States

**No promotions:**
- Illustration (tag/discount icon)
- Message: "No promotions yet"
- CTA: "Create your first promotion" (48px button)

**No promo codes:**
- Message: "No promo codes yet"
- CTA: "Generate promo code" (48px button)

---

## High-Priority Issues to Check

1. **Promotion cards too small** - Must be 48px+ height for comfortable tapping.

2. **Small edit/delete icons** - Use swipe or large buttons (44×44px).

3. **Date pickers too small** - Must be 48px+ height, native pickers preferred.

4. **Promotion type unclear** - Use clear labels and examples for each type.

5. **No validation feedback** - Show inline errors for invalid dates, negative amounts.

6. **No confirmation for delete** - Deleting promotions is destructive. Need confirmation.

7. **No empty state** - Should guide staff to create first promotion.

8. **Promo code hard to read** - Use large monospace font, copy button.

9. **Complex form** - If creating promotion has many fields, use multi-step form.

10. **No preview** - Staff can't see how promotion will appear to customers.

---

## Recommended Interaction Pattern

**List view:**
- Promotion cards (48px+ height)
- Card shows: name, type, status badge, dates
- Swipe left → Delete (red, trash icon)
- Swipe right → Edit (blue, edit icon)
- Toggle on card for enable/disable (48×32px)
- FAB (+) at bottom-right → Create promotion (56×56px)

**Detail view (bottom sheet or modal):**
- Promotion name input (48px)
- Promotion type: Large segmented control or dropdown (44px+)
- Discount input (48px, numeric) with label ($ or %)
- Start/End date pickers (48px each)
- Promo code input (optional, 48px, uppercase, monospace)
- "Generate" button (48px) for auto-code
- Save/Cancel buttons (48px each, bottom)

**Multi-step form alternative** (for complex promotions):
- Step 1: Basics (name, type, discount)
- Step 2: Dates (start, end)
- Step 3: Restrictions (min order, applicability)
- Step 4: Review (preview, save)
- Progress indicator at top (dots or steps)

---

## Action Items for Development

1. **Audit all touch targets** - Measure on real device, fix <44px violations.

2. **Implement swipe actions** - Replace icon buttons with swipe-to-edit/delete.

3. **Add FAB** - "Add Promotion" at bottom-right (56×56px).

4. **Use native date pickers** - 48px+ height, clear formatting.

5. **Add validation** - Inline errors for invalid inputs (dates, amounts).

6. **Add delete confirmation** - Dialog before deletion.

7. **Add empty state** - Illustration + message + CTA.

8. **Add promo code copy** - Large font, copy button, "Copied!" toast.

9. **Test promotion types** - Ensure each type (%, fixed, BOGO) has clear UI.

10. **Test on real devices** - iPhone 14 (390px), small Android (360px).

---

## Promotion-Specific Best Practices

1. **Clear naming** - "10% Off Lunch" not "Promo 1"

2. **Show savings** - "Save $5" more compelling than "$5 off"

3. **Urgency** - Show "Ends in 3 days" for time-sensitive promos

4. **Exclusions** - If restrictions, show clearly: "Excludes drinks"

5. **Preview** - Show customer view: "Customer sees: 10% off your order"

6. **Usage tracking** - Show "Used 47 times" to indicate popularity

7. **Easy disable** - Toggle to disable without deleting (keeps for future)

---

## Overall Assessment

**Grade**: Cannot assess without interactive testing

**Critical Path**:
1. Measure touch targets on actual device
2. Ensure all cards/inputs are 44px+ minimum
3. Implement swipe actions for edit/delete
4. Add FAB for creating promotions
5. Use native date pickers
6. Add validation and confirmation dialogs
7. Test each promotion type UX
8. Test on real devices

---

**Reviewer Signature**: Claude (Agent 1)
**Review Date**: 2026-04-11
