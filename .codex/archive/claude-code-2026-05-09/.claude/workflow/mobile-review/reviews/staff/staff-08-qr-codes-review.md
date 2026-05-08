# Mobile UI Review: Staff QR Codes

**Screen**: QR Codes Management
**Reviewer**: Claude (Agent 1)
**Date**: 2026-04-11
**Screenshot**: 08-qr-codes.png

---

## LIMITATION NOTICE

This review could not be completed thoroughly due to technical limitations with image analysis tools. Interactive browser testing is required for accurate measurements.

**Review Status**: Preliminary assessment based on mobile UI best practices for QR code management screens.

---

## Expected Content

This screen should display:
- List of QR codes for tables
- QR code images (visible and tappable)
- Table numbers/labels
- Print/download actions
- "Generate QR Code" action
- QR code preview/modal

---

## Critical Requirements (Must Verify)

### 1. Touch Targets (CRITICAL)

**Must measure on actual device:**

- **QR code cards**: 48px+ height minimum (likely taller due to QR image)
- **QR code images**: 100-150px minimum for visibility, tappable area 44×44px+
- **Table labels**: 16-18px font
- **Print/Download buttons**: 48×48px minimum (NOT small icons)
- **Delete actions**: 44×44px minimum
- **"Generate QR" button**: 48×48px minimum
- **Share buttons**: 48×48px minimum

**Common violation**: Small print/download icons (16-24px) next to QR codes.

**Recommendation**: Use large action buttons below QR code or swipe actions.

---

### 2. QR Code Display

**QR codes must be clearly visible:**

**Size requirements:**
- **Minimum size**: 100×100px (for scannability)
- **Recommended**: 150-200px square (easier to scan)
- **High resolution**: Ensure crisp at 2x/3x display

**QR code card layout:**
```
┌─────────────────────────────┐
│ Table 1              [edit]  │  18px label
│                              |
│      [QR CODE 150px]        │  Scannable size
│                              |
│  [Print] [Download] [Share]  │  48×48px buttons
└─────────────────────────────┘  48px+ total height
```

**Spacing**: 16px between QR code and buttons

---

### 3. QR Code Actions

**Each QR code should support:**

1. **Print** (48×48px button)
   - Icon: printer
   - Label: "Print" or icon-only (if icon is 48px+)
   - Action: Open print dialog or generate PDF

2. **Download** (48×48px button)
   - Icon: download arrow
   - Label: "Download" or icon-only
   - Action: Download PNG/PDF

3. **Share** (48×48px button)
   - Icon: share arrow
   - Label: "Share" or icon-only
   - Action: Native share sheet (iOS/Android)

4. **Edit** (48×48px button or swipe)
   - Icon: pencil
   - Action: Edit table number/label

5. **Delete** (48×48px button or swipe)
   - Icon: trash
   - Action: Remove QR code (with confirmation)

**Button layout**: Horizontal row below QR code, 8-12px spacing between buttons

---

### 4. QR Code Preview/Modal

**Tapping QR code should open preview:**

**Full-screen modal with:**
- Large QR code (250-300px, centered)
- Table number/label (24px heading)
- URL/destination text (14-16px, readable)
- Action buttons at bottom:
  - Print (48px, full width)
  - Download (48px, full width)
  - Share (48px, full width)
  - Close (48px, full width)

**Spacing**: 16px between QR code and text, 24px to buttons

---

### 5. Generate QR Code Flow

**Creating new QR codes:**

**Use modal or bottom sheet** (50-60% screen height):

**Required fields** (all 48px height inputs):

1. **Table number/label** (text or numeric input)
   - Label: "Table Number" (14px, above input)
   - Placeholder: "e.g., 1, A1, Patio-1"
   - Auto-suggest: Next sequential number
   - Required: Yes

2. **Location** (optional, dropdown or text)
   - "Indoor", "Outdoor", "Patio", "Bar"
   - Large touch targets (44px+)

3. **Preview** (QR code generates in real-time)
   - Show as user types
   - Update live

**Actions**:
- Generate button (48px, full width, primary)
- Cancel button (48px, full width, secondary)

---

### 6. QR Code Quality

**Technical requirements:**

**Resolution:**
- Generate at 2x or 3x display size
- Ensure crisp on retina displays
- Test on actual devices

**Error correction:**
- Use high error correction level (H)
- Ensures scannability if partially damaged

**Contrast:**
- Standard: Black on white
- Alternative: White on black (inverted)
- Avoid colors unless sufficient contrast

**Size for printing:**
- Print at 300-600 DPI
- Minimum 2×2 inches (5×5 cm) for physical scanning

---

### 7. Bulk Operations

**Staff often need QR codes for all tables:**

**"Generate All" button:**
- FAB or prominent button (48×48px)
- Action: Generate QR codes for all missing tables
- Feedback: "Generated 5 QR codes" toast

**"Print All" button:**
- Generate PDF with all QR codes
- One per page or grid layout (2×2)
- Table labels clearly visible

**Bulk download:**
- ZIP file with all QR codes
- Named: "table-1.png", "table-2.png", etc.

---

### 8. Empty State

**No QR codes generated:**

- Illustration (QR code icon, table icon)
- Message: "No QR codes yet"
- Subtext: "Generate QR codes for your tables so customers can scan and order"
- CTAs:
  - "Generate QR Code" (48px, primary)
  - "Generate All Tables" (48px, secondary)

---

### 9. QR Code Information

**What staff need to know:**

**Show on card or modal:**
- Table number (prominent)
- Scan URL (full link, 14px, tappable to copy)
- Generated date (14px, secondary)
- Last printed date (if applicable)

**Customer-facing URL:**
- Short and clean: "cv.rehou.games/nexus/demo/order/table-1"
- Avoid long, complex URLs

---

## High-Priority Issues to Check

1. **QR codes too small** - Must be 100px minimum, 150-200px recommended for scannability.

2. **Action buttons too small** - Print/Download/Share must be 48×48px, not small icons.

3. **No print support** - Staff need to print QR codes for tables. Must generate print-ready PDF.

4. **No share functionality** - Staff need to share QR codes via email/messaging apps.

5. **No bulk operations** - Generating one-by-one is tedious. Need "Generate All".

6. **No confirmation for delete** - Deleting QR codes is destructive (need to reprint). Need confirmation.

7. **No empty state** - Should guide staff to generate first QR code.

8. **QR code not scannable** - Test on actual devices. Ensure high resolution, good contrast.

9. **No table number editing** - If table number wrong, must be able to edit without regenerating.

10. **No preview modal** - Tapping QR code should show large version with actions.

---

## Recommended Interaction Pattern

**List view:**
- QR code cards (150-200px tall)
- Each card shows:
  - Table label (18-20px, top-left)
  - QR code (150px, centered, tappable)
  - Action buttons row (48×48px each):
    - Print (left)
    - Download (center)
    - Share (right)
- Swipe card left → Delete (red, trash icon)
- FABs at bottom-right:
  - "+" (Generate QR, 56×56px, right)
  - "Generate All" (48px, left of +)

**QR code preview (modal):**
- Large QR code (250-300px, centered)
- Table number (24px heading)
- URL (14px, tappable to copy)
- Action buttons (48px, full width, stacked):
  - Print
  - Download
  - Share
  - Close

**Generate flow (modal):**
- Table number input (48px, auto-focus)
- Location dropdown (optional, 48px)
- Live preview of QR code
- Generate button (48px, primary)
- Cancel button (48px, secondary)

---

## Action Items for Development

1. **Audit all touch targets** - Measure on real device, fix <44px violations.

2. **Ensure QR codes are 150px+** - Test scannability on actual devices.

3. **Add print functionality** - Generate PDF with QR codes, one per page.

4. **Add download** - Download individual QR codes as PNG.

5. **Add share** - Native share sheet for QR codes.

6. **Add "Generate All"** - Bulk generate for all tables.

7. **Add preview modal** - Tap QR code to see large version.

8. **Add delete confirmation** - Dialog before deletion.

9. **Add empty state** - Illustration + message + CTAs.

10. **Test scannability** - Print QR codes, test with multiple phones.

---

## QR Code Best Practices

1. **High resolution** - Generate at 2x or 3x for retina displays

2. **Error correction** - Use level H (highest) for damaged QR codes

3. **Contrast** - Black on white (standard) or white on black (inverted)

4. **Quiet zone** - 4px white border around QR code (ensure scanning)

5. **Testing** - Test on multiple devices (iPhone, Android, older phones)

6. **Print size** - Minimum 2×2 inches (5×5 cm) for physical QR codes

7. **URL shortening** - Use short, clean URLs for better scannability

8. **Versioning** - If QR code format changes, support old versions

---

## Overall Assessment

**Grade**: Cannot assess without interactive testing

**Critical Path**:
1. Measure touch targets on actual device
2. Ensure QR codes are 150px+ minimum
3. Add print/download/share functionality
4. Add "Generate All" bulk operation
5. Add preview modal for QR codes
6. Add delete confirmation
7. Test scannability on real devices
8. Test print output quality

---

**Reviewer Signature**: Claude (Agent 1)
**Review Date**: 2026-04-11
