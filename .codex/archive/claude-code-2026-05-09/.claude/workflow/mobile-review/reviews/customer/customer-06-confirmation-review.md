# Mobile UI Review: Customer - Order Confirmation

**Reviewer**: Claude (Customer Review Agent)
**Date**: 2026-04-11
**Screenshot**: 06-order-confirmation.png

---

## Screen Overview

Post-order confirmation showing order status, estimated time, and order details. Critical for setting customer expectations and reducing anxiety.

---

### Overall Assessment

**Score**: 78/100 (Good with minor issues)

Strong confirmation screen with clear status, estimated time, and order details. Main issues are real-time update verification and contact options.

---

### Critical Issues

None identified - this screen is well-executed.

---

### High-Priority Issues

1. **Real-time updates**: Cannot verify if status updates automatically (polling/websocket)
2. **Estimated time updates**: Does time update if kitchen is delayed?
3. **Contact restaurant**: No visible way to call restaurant if order is delayed

---

### Medium-Priority Issues

1. **Order details expandable**: Are full modifier details viewable?
2. **Reorder button**: Should have "Reorder" CTA for future convenience
3. **Status history**: Optional expandable section for status timeline

---

### Positive Findings

1. **Clear status badge**: Large, color-coded status indicator
2. **Estimated time prominent**: Time estimate clearly displayed
3. **Order summary**: Items and modifiers shown for confirmation
4. **Visual hierarchy**: Status → time → details flow is logical
5. **Reassurance**: Confirmation message reduces post-order anxiety
6. **Clean layout**: Not cluttered, focuses on key information

---

### Recommendations

1. **Verify real-time updates**: Ensure status polls or uses websockets for live updates
2. **Add contact button**: "Call Restaurant" button for delayed orders
3. **Show estimated time range**: "15-20 min" better than exact "17 min"
4. **Add status timeline**: Optional expandable section showing: Received → Cooking → Ready
5. **Implement reorder**: Save order details for "Reorder" button on future visits
6. **Add share option**: Let users share order status with dining companions

---

### Key Features to Verify

1. **Polling interval**: How often does status update? (Recommended: 5-10s)
2. **Error handling**: What if polling fails? Show retry button
3. **Push notifications**: Consider browser push for status changes
4. **Session persistence**: Does status survive page refresh?

---

**Comparison to best-in-class**:
- Uber Eats: Live map, driver tracking (overkill for table service)
- Mr Yum: Simple status badges, estimated time, contact option ✓
- DoorDash: Detailed timeline, reorder button ✓

This screen follows Mr Yum's simple approach well. Adding contact option and reorder capability would bring it to DoorDash level.

---

**Next step**: Review menu scroll behavior (screen 07).

---

**Reviewer**: Claude (Customer Review Agent)
**Date**: 2026-04-11
