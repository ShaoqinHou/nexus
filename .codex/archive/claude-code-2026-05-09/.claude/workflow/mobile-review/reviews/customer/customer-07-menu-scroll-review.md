# Mobile UI Review: Customer - Menu Mid-Scroll

**Reviewer**: Claude (Customer Review Agent)
**Date**: 2026-04-11
**Screenshot**: 07-menu-mid-scroll.png

---

## Screen Overview

Menu browsing mid-scroll, showing how category navigation and content behave during scrolling. Critical for long menus.

---

### Overall Assessment

**Score**: 68/100 (Fair with significant issues)

The scroll behavior is functional but missing key UX patterns like sticky category navigation and back-to-top affordance.

---

### Critical Issues

1. **Category navigation NOT sticky**: Categories scroll away, lost context
2. **No back-to-top button**: Hard to return to top on long menus
3. **Active category indicator unclear**: Cannot tell which category is current

---

### High-Priority Issues

1. **Make categories sticky**: Use `position: sticky` at top while scrolling
2. **Add active indicator**: Bold or underline current category in nav
3. **Implement back-to-top**: Floating button appears after scrolling down
4. **Scroll position indicator**: Show progress (e.g., "Category 2 of 5")

---

### Medium-Priority Issues

1. **Category jump animation**: Smooth scroll when tapping category
2. **Scroll momentum**: Ensure scroll doesn't feel "heavy"
3. **Infinite scroll vs pagination**: How does user load more items?

---

### Positive Findings

1. **Smooth scrolling**: No janky behavior visible
2. **Content loading**: Items appear to load progressively
3. **Card layout maintained**: Layout consistent during scroll
4. **Cart persists**: Floating cart button remains visible

---

### Recommendations

1. **Sticky category header**:
   ```css
   .category-nav {
     position: sticky;
     top: 0;
     z-index: 10;
     background: white;
     box-shadow: 0 2px 4px rgba(0,0,0,0.1);
   }
   ```

2. **Active category indicator**:
   - Bold text for current category
   - Or underline/border-bottom indicator
   - Auto-update as user scrolls past sections

3. **Back-to-top button**:
   - Float in bottom-right (above cart button)
   - Show after scrolling 2-3 screen heights
   - Icon: ↑ or "Top" label

4. **Auto-scroll on category tap**:
   - Smooth scroll to category top
   - Highlight category briefly on arrival

5. **Consider section headers**:
   - Show category name inline with items
   - Helps when categories aren't sticky

---

### Key Pattern: Sticky Navigation

Best-in-class apps (Mr Yum, Uber Eats, Deliveroo) all use sticky category navigation. This is table stakes for food ordering.

**Without sticky nav**:
- User scrolls, loses category context
- Must scroll back up to switch categories
- Frustrating on long menus

**With sticky nav**:
- Categories always accessible
- One tap to jump between sections
- Current category highlighted automatically

---

**Priority**: HIGH - This is a core UX pattern that customers expect.

---

**Next step**: Review search overlay (screen 08).

---

**Reviewer**: Claude (Customer Review Agent)
**Date**: 2026-04-11
