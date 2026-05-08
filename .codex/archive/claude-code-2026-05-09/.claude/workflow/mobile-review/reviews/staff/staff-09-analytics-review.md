# Mobile UI Review: Staff Analytics Dashboard

**Screen**: Analytics Dashboard
**Reviewer**: Claude (Agent 1)
**Date**: 2026-04-11
**Screenshot**: 09-analytics.png

---

## LIMITATION NOTICE

This review could not be completed thoroughly due to technical limitations with image analysis tools. Interactive browser testing is required for accurate measurements.

**Review Status**: Preliminary assessment based on mobile UI best practices for analytics/dashboard screens.

---

## Expected Content

This screen should display:
- Key metrics (revenue, orders, average order value)
- Date range selector
- Charts/graphs (sales trends, popular items)
- Filters (category, time period)
- Export options
- Drill-down capabilities

---

## Critical Requirements (Must Verify)

### 1. Touch Targets (CRITICAL)

**Must measure on actual device:**

- **Metric cards**: 48px+ height minimum
- **Date range selector**: 44px+ height
- **Filter buttons**: 44×44px minimum
- **Export button**: 48×48px minimum
- **Chart data points** (if interactive): 44×44px minimum
- **Drill-down tappable areas**: 44px+ minimum
- **Tab selectors** (if multiple views): 44px+ height

**Common violation**: Small filter buttons, cramped date pickers, interactive charts with small touch targets.

**Recommendation**: Use large buttons for filters, native date pickers, ensure charts have adequate touch targets.

---

### 2. Metrics Display

**Key metrics must be prominent and readable:**

**Metric card layout:**
```
┌─────────────────────────────┐
│ Revenue         $12,450     │  18px label, 24px value
│ ↑ 15% from last week        │  14px secondary
└─────────────────────────────┘  48px+ height
```

**Each metric card shows:**
- **Metric name** (16-18px, label)
- **Value** (24-28px, bold, prominent)
- **Trend** (14px, arrow icon, percentage)
- **Time period** (12-14px, secondary: "This week")

**Spacing**: 12-16px between metric cards

---

### 3. Date Range Selection

**Staff need to change time periods:**

**Use large, accessible controls:**

1. **Preset ranges** (buttons, 44px+ height):
   - "Today"
   - "This Week"
   - "This Month"
   - "Custom Range"

2. **Custom range** (if "Custom" selected):
   - Start date picker (48px height)
   - End date picker (48px height)
   - "Apply" button (48px height)

**Native date pickers preferred:**
- Large touch targets (48px+)
- Clear focus state
- Familiar UI (iOS/Android native)

---

### 4. Charts and Graphs

**Mobile charts need special consideration:**

**Size:**
- Minimum height: 200-250px for readability
- Width: Full viewport width (360-390px)

**Touch targets:**
- If interactive (tap data point for details): 44×44px minimum
- Legend items: 44px+ tappable

**Chart types for mobile:**
- **Line charts**: Trends over time (sales, orders)
- **Bar charts**: Comparisons (item popularity, category performance)
- **Pie charts**: Distribution (sales by category) - AVOID (hard to read on mobile)

**Color accessibility:**
- Use high contrast colors
- Test with color blind simulators
- Provide patterns/icons in addition to color

**Labels:**
- Axis labels: 12-14px minimum
- Data labels: 14-16px
- Legend: 14-16px

---

### 5. Filters and Controls

**Staff need to slice data:**

**Filter options** (all 44px+ touch targets):

1. **Category filter** (dropdown or multi-select)
   - "All Categories", "Burgers", "Drinks", etc.
   - Large buttons or chips (44px+ height)

2. **Status filter** (if applicable)
   - "All", "Completed", "Pending"

3. **Comparison toggle**
   - "Compare to: Previous period"
   - Toggle switch (48×32px)

4. **Export button**
   - "Export CSV" or "Export PDF"
   - 48×48px button

**Layout:**
- Filters at top (below date selector)
- Horizontal scroll if many filters (with affordance)
- Clear active state (bold, colored background)

---

### 6. Data Density

**Balance information with readability:**

**Recommended layout:**

1. **Top**: Date range selector (44px+)

2. **Metrics row** (horizontal scroll or grid):
   - 3-4 key metrics
   - Each card 48px+ height

3. **Filters** (if applicable):
   - Horizontal scroll, 44px+ buttons

4. **Charts** (vertical scroll):
   - Sales trend chart (200-250px height)
   - Popular items chart (200-250px height)
   - 16-24px spacing between charts

5. **Bottom**: Export button or tab navigation

---

### 7. Drill-Down Capabilities

**Staff need to investigate data:**

**Tapping metric/card should:**
- Open detail view (bottom sheet or new screen)
- Show breakdown (e.g., revenue by item, by hour)
- Back button to return to overview

**Tapping chart data point should:**
- Show details in tooltip or bottom sheet
- Date/time, value, comparison
- Related items (if applicable)

---

### 8. Loading States

**Analytics data takes time to load:**

**Use skeleton screens:**
- Match final layout (metric cards, chart shapes)
- Gray placeholders with subtle shimmer
- Show spinners on individual metrics if data loads separately

**Pull-to-refresh:**
- Affordance at top
- Spinner during fetch
- Timestamp of last update: "Updated 2 min ago"

---

### 9. Empty States

**No data for selected period:**

- Illustration (chart/graph icon with "x")
- Message: "No data for this time period"
- Subtext: "Try a different date range"
- CTA: "Change date range" (48px button)

**First time using analytics:**
- Illustration (analytics icon)
- Message: "Start taking orders to see analytics"
- CTA: "Go to orders" (48px button)

---

### 10. Export Functionality

**Staff need to share reports:**

**Export options:**
- **CSV**: Raw data (for spreadsheets)
- **PDF**: Formatted report (for sharing/printing)

**Export flow:**
1. Tap "Export" button (48×48px)
2. Choose format (modal with 2 options, 48px buttons)
3. Generate and download
4. Show toast: "Report downloaded"

**Exported PDF should include:**
- Restaurant name/logo
- Date range
- Key metrics
- Charts (if space permits)
- Generated timestamp

---

## High-Priority Issues to Check

1. **Date picker too small** - Must be 44px+ height, native picker preferred.

2. **Filter buttons too small** - All filter controls must be 44px+.

3. **Charts not readable on mobile** - Line/bar charts should be 200px+ height.

4. **Metric cards too cramped** - Must be 48px+ height with clear spacing.

5. **No drill-down** - Tapping metrics/charts should show details.

6. **No export functionality** - Staff need to download reports.

7. **Pull-to-refresh missing** - Should manually refresh data.

8. **Loading states unclear** - Should use skeleton screens.

9. **Colors not accessible** - Test charts for color blindness.

10. **No empty state** - Should handle no-data scenarios gracefully.

---

## Recommended Interaction Pattern

**Screen layout:**

1. **Header** (44px+):
   - Title: "Analytics" (20px)
   - Date range selector (44px+ button)

2. **Metrics row** (horizontal scroll):
   - 3-4 metric cards (80-100px wide, 48px+ tall)
   - Revenue, Orders, Avg Order Value, etc.

3. **Filters** (horizontal scroll, 44px+ buttons):
   - Category, Status, Comparison toggle

4. **Charts** (vertical scroll):
   - Sales trend (200-250px height)
   - Popular items (200-250px height)
   - 16-24px spacing

5. **Bottom**: Export button (48px, full width) or tab navigation

**Interactions:**
- Tap date selector → Open date range picker
- Tap metric card → Open detail bottom sheet
- Tap chart → Show data point details
- Pull down → Refresh data
- Tap export → Choose format (CSV/PDF)

---

## Action Items for Development

1. **Audit all touch targets** - Measure on real device, fix <44px violations.

2. **Use native date pickers** - 44px+ height, clear formatting.

3. **Ensure charts are 200px+ height** - Test readability on actual devices.

4. **Add drill-down** - Tap metric/chart to see details.

5. **Add export functionality** - CSV and PDF export with clear UI.

6. **Add pull-to-refresh** - Affordance, spinner, timestamp.

7. **Add skeleton loading** - Match final layout, shimmer effect.

8. **Add empty states** - Handle no-data scenarios.

9. **Test color accessibility** - Use high contrast, test with simulators.

10. **Test on real devices** - iPhone 14 (390px), small Android (360px).

---

## Analytics Best Practices

1. **Progressive disclosure** - Show overview first, drill-down on demand

2. **Real-time updates** - Show timestamp, allow manual refresh

3. **Comparison context** - Always show trend (↑15% vs last week)

4. **Actionable insights** - Highlight anomalies: "Sales down 20% today"

5. **Mobile-first charts** - Simple, readable, avoid complex visualizations

6. **Export quality** - PDFs should look professional for sharing

7. **Performance** - Analytics queries can be slow, use caching

8. **Offline support** - Cache last viewed data for offline access

---

## Overall Assessment

**Grade**: Cannot assess without interactive testing

**Critical Path**:
1. Measure touch targets on actual device
2. Ensure all controls are 44px+ minimum
3. Use native date pickers
4. Ensure charts are readable on mobile (200px+ height)
5. Add drill-down capabilities
6. Add export functionality
7. Add loading states (skeleton screens)
8. Test color accessibility
9. Test on real devices

---

**Reviewer Signature**: Claude (Agent 1)
**Review Date**: 2026-04-11
