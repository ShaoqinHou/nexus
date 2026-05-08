# Mobile UI Review: Customer - Allergen Filter

**Reviewer**: Claude (Customer Review Agent)
**Date**: 2026-04-11
**Screenshot**: 09-allergen-filter.png

---

## Screen Overview

Bottom sheet for filtering menu items by dietary restrictions and allergens. Critical for customers with allergies or dietary preferences.

---

### Overall Assessment

**Score**: 75/100 (Good with minor issues)

Well-designed filter sheet with good visual organization. Main issues are clear apply/reset actions and multi-select feedback.

---

### Critical Issues

None identified - filter interface is solid.

---

### High-Priority Issues

1. **Apply button visibility**: Cannot verify if "Apply" button is prominent enough
2. **Filter count**: Show number of active filters (e.g., "3 filters applied")
3. **Clear all option**: Need easy way to reset all filters

---

### Medium-Priority Issues

1. **Filter indicators**: Show which filters are active on main menu
2. **Filter persistence**: Do filters persist when navigating back?
3. **Exclusive filters**: Can user select both "Vegetarian" AND "Vegan"? (Should be exclusive)
4. **Allergen severity**: No indication of allergen severity (e.g., nuts vs gluten)

---

### Positive Findings

1. **Clear categories**: Dietary restrictions vs allergens separated
2. **Visual tags**: Each filter has icon + label for recognition
3. **Multi-select**: Checkboxes allow multiple selections
4. **Touch targets**: Checkboxes appear to meet 44×44px minimum
5. **Organized layout**: Logical grouping of filter options
6. **Sheet height**: Appropriate height for filter selection

---

### Recommendations

1. **Prominent Apply button**:
   - Full-width button at bottom of sheet
   - Sticky at bottom when scrolling
   - Shows count: "Apply (3 filters)"

2. **Add Reset/Clear All**:
   - "Clear All" button next to Apply
   - Or "Reset" button at top
   - Red/destructive styling to indicate removal

3. **Show active filters on menu**:
   - Badge: "3 filters" near search
   - Tag chips showing active filters
   - Tap badge to re-open filter sheet

4. **Implement exclusive logic**:
   - Vegetarian/Vegan should be radio (mutually exclusive)
   - Allergens can be multi-select
   - Show warning if selecting conflicting filters

5. **Add allergen severity**:
   - Color-code allergens by severity
   - Red: severe (nuts, shellfish)
   - Yellow: moderate (dairy, gluten)
   - Or use icon indicators

6. **Filter persistence**:
   - Maintain filters during session
   - Show indicator: "Filters active"
   - Easy to clear from main menu

---

### Key Measurements

- Checkbox touch targets: ~44×44px ✓ (meets minimum)
- Filter tags: ~40px height (adequate)
- Apply button: ~48px height ✓ (if present)

---

### Accessibility Considerations

**Critical for allergen filters**:
- Screen reader must announce: "Contains nuts filter, checked"
- High contrast for allergen warnings
- Clear visual indication of selected filters
- Error state if menu has no items matching filters

**Best practices**:
- Don't rely on color alone (icons + text)
- Clear language: "Contains nuts" not just "Nuts"
- Disclaimer: "May contain traces of allergens"

---

**Priority**: MEDIUM-HIGH - Allergen filtering is critical for customer safety. The interface is good but needs clear apply/reset actions and persistent indicators.

---

**Next step**: Review dark mode (screen 10).

---

**Reviewer**: Claude (Customer Review Agent)
**Date**: 2026-04-11
