# Mobile UI Review: Customer - Combo Deal Bottom Sheet

**Reviewer**: Claude (Customer Review Agent)
**Date**: 2026-04-11
**Screenshot**: 04-combo-sheet.png

---

## Screen Overview

Bottom sheet for combo deal customization with multiple slots (e.g., "Choose 1 main", "Choose 2 sides"). Critical for upselling and bundle ordering.

---

### Overall Assessment

**Score**: 65/100 (Fair with significant issues)

This screen handles the complex combo customization flow. The slot-based pattern is good but has several usability issues around required vs optional selections and price transparency.

---

### Critical Issues

1. **Slot completion unclear**: Cannot easily tell which slots are completed vs pending
2. **Price updates missing**: Total price doesn't update as selections are made
3. **Required slot indicators**: Not clear which slots are required vs optional
4. **Touch targets on slot items**: Option items appear smaller than 48px minimum

---

### High-Priority Issues

1. **Visual slot state**: Each slot should have clear visual indicator (checkmark, "1 of 1 selected")
2. **Real-time price updates**: Total must update as user makes selections
3. **Slot scrolling**: Long slot options may need better affordance (scroll indicator)
4. **Validation errors**: What happens if user tries to add incomplete combo?

---

### Positive Findings

1. **Slot-based pattern**: Good structure for combo customization
2. **Bottom sheet**: Appropriate modal for complex customization
3. **Slot grouping**: Clear separation between different combo slots
4. **Photo prominence**: Item photos still visible in combo context

---

### Recommendations

1. **Add slot completion indicators**: Checkmark or "✓ 1 of 1 selected" badge on each slot
2. **Update total dynamically**: Show price change as selections are made (+$X.XX per slot)
3. **Make required slots prominent**: Badge or icon indicating "Required" vs "Optional"
4. **Increase option touch targets**: Ensure slot items meet 48×48px minimum
5. **Add validation feedback**: Clear error when attempting to add incomplete combo
6. **Consider slot summary**: Show "1 main, 2 sides selected" at top for progress

---

**Key measurement**: Slot option items appear ~40px height - below 48px minimum. Must increase to meet accessibility standards.

**Next step**: Review cart sheet to see how combo appears in cart.

---

**Reviewer**: Claude (Customer Review Agent)
**Date**: 2026-04-11
