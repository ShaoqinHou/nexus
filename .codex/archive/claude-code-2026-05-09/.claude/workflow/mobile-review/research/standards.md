# Mobile UI Standards for POS & Ordering Apps

> **Purpose**: Comprehensive reference for reviewing mobile UI of restaurant POS and ordering applications
> **Sources**: WCAG 2.1, Apple HIG, Material Design 3, web.dev, Nielsen Norman Group

---

## 1. Touch Targets

**Sources**: WCAG 2.1 SC 2.5.5, Apple HIG, Material Design 3, web.dev

### Minimum Sizes
- **WCAG 2.1 (AAA)**: 44×44 CSS pixels minimum for all interactive elements
- **Apple HIG**: 44×44 points minimum for iOS/iPadOS
- **web.dev**: 48 device-independent pixels recommended (≈9mm, finger pad size)
- **Material Design 3**: 48×48dp minimum for touch targets

### Spacing Requirements
- **web.dev**: 8 pixels minimum spacing between touch targets (horizontal and vertical)
- **Rationale**: Prevent accidental activation of neighboring targets

### Application Examples
- **Buttons**: Full target area including padding must meet minimum
- **Icon buttons**: Small icons (24px) must have padding to reach 48px touch target
- **Form inputs**: Input field + label + padding must meet minimum
- **List items**: Tappable rows (menu items, orders) must meet minimum
- **Nav elements**: Bottom nav items, tabs, sidebar links must meet minimum

### Edge Cases
- **Inline text links**: Exempt from WCAG 2.5.5 (within sentence/block)
- **Essential controls**: Exempt if size is essential to information
- **Equivalent targets**: Only one of multiple targets for same action needs to meet minimum

---

## 2. Typography

**Sources**: Apple HIG, Material Design 3, WCAG 2.1

### Minimum Sizes
- **Body text**: 16px minimum for mobile readability (iOS), 14sp minimum (Android)
- **Small text**: 12-14px for secondary/caption text (use sparingly)
- **Headings**: 
  - H1: 28-32px (screen titles)
  - H2: 20-24px (section headers)
  - H3: 16-18px (subsection headers)

### Line Height & Spacing
- **Body text**: 1.4-1.6 line-height (140-160% of font size)
- **Headings**: 1.2-1.3 line-height
- **Paragraph spacing**: 1em (100% of font size) between paragraphs

### Contrast Ratios (WCAG 2.1)
- **AA level**: 4.5:1 for normal text, 3:1 for large text (18pt+)
- **AAA level**: 7:1 for normal text, 4.5:1 for large text
- **Text on images**: Ensure contrast or use overlay/shadow

### Dense Information Displays
- **Order lists**: Use card layout with clear visual separation
- **Menu items**: Primary info (name, price) at minimum size, secondary (description) can be smaller
- **Tables**: Avoid on mobile if possible; use card-based lists instead

---

## 3. One-Handed / Thumb Zone Design

**Source**: Steven Hoober, "Designing for Touch", Luke Wroblewski

### Thumb Zone Concept
- **Easy zone**: Bottom 1/3 of screen (thumb's natural reach)
- **Stretch zone**: Middle 1/3 (requires adjustment)
- **Hard zone**: Top 1/3 and corners (requires two hands or grip change)

### Bottom Navigation Pattern
- **Primary actions**: Place in bottom 1/3 of screen
- **Tab bar**: 3-5 items max, use icons + labels
- **FAB (Floating Action Button)**: Bottom-right corner for primary action
- **Bottom sheet**: For item details, cart, filters (swipe to dismiss)

### Swipe Gestures
- **Affordance**: Visual hint (partial reveal, indicator, "swipe for more" text)
- **Actions**: 
  - Swipe left: Destructive (delete, archive)
  - Swipe right: Secondary (edit, share)
  - Pull to refresh: Top of list
- **Discovery**: First-time user education if not obvious

### Reachability
- **Critical actions**: Bottom half, easy thumb reach
- **Destructive actions**: Not in easy zone (prevent accidental)
- **Primary CTA**: Bottom-right or center-bottom

---

## 4. POS-Specific Mobile Patterns

**Sources**: Square POS, Toast POS, Lightspeed POS analysis

### Kitchen Display (Mobile)
- **Ticket cards**: Large, clear status (color-coded)
- **Time elapsed**: Prominent, color changes as order ages
- **Action buttons**: "Complete" large and accessible
- **Filter/sort**: Easy access, thumb-friendly

### Menu Management (Mobile)
- **List view**: Card-based items with thumbnail
- **Quick actions**: Swipe for edit/delete, not small icons
- **Drag handle**: Large touch target for reordering
- **Inline editing**: Edit in place, not separate modal when possible

### Order Dashboard (Mobile)
- **Status tabs**: Horizontal scroll, clear active state
- **Order cards**: Key info (table, total, status) visible without scroll
- **Quick actions**: "Mark complete", "View details" as primary buttons
- **Search**: Prominent, auto-focus on staff screens

### Modifiers & Variants
- **Selection**: Large radio buttons/checkboxes (44px+)
- **Multi-select**: Toggle chips or clear checkboxes
- **Required vs optional**: Visual distinction

---

## 5. Customer Ordering Mobile Patterns

**Sources**: Mr Yum, Uber Eats, DoorDash, Deliveroo analysis

### Bottom Sheet Pattern
- **Item details**: Bottom sheet (60-80% screen height)
- **Cart**: Full-height or 80% sheet
- **Swipe to dismiss**: Clear affordance (handle at top)
- **Backdrop**: Dark overlay, tap to dismiss

### Category Navigation
- **Horizontal scroll**: Sticky top, clear active indicator
- **Sidebar**: Collapsible, icon + label
- **Alphabetical jump**: For long menus (A-Z sidebar)

### Food Item Cards
- **Photo**: Large (aspect ratio 4:3 or 1:1)
- **Hierarchy**: Photo > Name > Price > Description
- **Spacing**: 8-12px between items
- **Tappable area**: Full card (44px+ height)

### Quantity Adjuster
- **Large buttons**: Minus/plus at least 44×44px
- **Current quantity**: Centered, clear visibility
- **Quick-add**: "+ Add" button on item card
- **Stepper**: Use, not native input (better mobile UX)

### Modifier Selection UX
- **Bottom sheet**: Open from item card
- **Sections**: Clear visual grouping
- **Required indicators**: Asterisk or "Required" label
- **Multi-select**: Checkboxes or toggle chips
- **Single-select**: Radio buttons or segmented control
- **Price impact**: Show modifier price inline

---

## 6. Mobile Navigation Patterns

**Sources**: Apple HIG, Material Design 3

### Bottom Tab Bar vs Hamburger
- **3-5 sections**: Bottom tab bar (direct access)
- **6+ sections**: Hamburger/sidebar (organize with subheaders)
- **Critical features**: In bottom bar for one-tap access
- **Secondary features**: In sidebar/drawer

### Breadcrumbs & Back Navigation
- **Deep navigation**: Back button (top-left)
- **Breadcrumbs**: Below top bar, tap to jump back
- **Home affordance**: Logo/icon to return to root

### Modal/Sheet Presentation
- **Modal dialogs**: For focused tasks, require explicit action
- **Bottom sheets**: For item details, forms, filters (dismissible)
- **Full-screen**: For complex workflows (multi-step)

### Loading States
- **Skeleton screens**: For lists/cards (gray placeholders)
- **Spinners**: For isolated actions (button, form submission)
- **Progressive loading**: Show items as they load
- **Pull to refresh**: Manual refresh affordance at top of scrollable areas

---

## 7. Form Input on Mobile

**Sources**: Material Design 3, Apple HIG

### Input Field Sizing
- **Height**: Minimum 48px (touch target)
- **Padding**: 12-16px vertical, 16px horizontal
- **Border**: 1px, clear focus state
- **Spacing**: 16-24px between fields

### Select/Dropdown Patterns
- **Prefer**: Native picker (single-column, search-enabled)
- **Custom**: When search/filter is critical (multi-select with chips)
- **Avoid**: Custom dropdowns that obscure affordances

### Toggle vs Checkbox
- **Binary on/off**: Toggle switch (48×32px minimum)
- **Multi-select**: Checkboxes (44×44px)
- **Single-select**: Radio buttons or segmented control
- **State change**: Immediate for toggles, explicit save for checkboxes

### Validation Feedback
- **Timing**: On blur (field exit) or on submit
- **Placement**: Inline below field, red text/icon
- **Message**: Specific, actionable ("Email is invalid" not "Error")

### Keyboard Handling
- **Auto-focus**: First field on form load
- **Keyboard type**: Match input (email, numeric, URL)
- **Return key**: "Next" for multi-field, "Done"/"Go" for last
- **Dismiss**: Tap outside or "Done" button

---

## 8. Error States & Feedback

**Sources**: Material Design 3, Apple HIG

### Toast Notifications
- **Placement**: Bottom-center or bottom (above nav)
- **Duration**: 3-4 seconds (success), 5-7 seconds (error)
- **Action**: Optional button ("Undo", "Retry")
- **Stacking**: Limit to 1-2 visible, auto-dismiss

### Inline Errors
- **Placement**: Below field or at top of form
- **Style**: Red text + icon, clear indication
- **Recovery**: How to fix (specific guidance)

### Empty States
- **Illustration**: Optional, on-brand
- **Message**: Clear, friendly ("No orders yet" not "null")
- **Action**: Primary CTA ("Create your first order")

### Loading States
- **Spinners**: Isolated actions (button click)
- **Skeleton screens**: Lists, cards (match final layout)
- **Progress bars**: Multi-step flows, file uploads
- **Shimmer**: Subtle animation for polish

---

## 9. POS-Specific Critical Requirements

### Kitchen Display (KDS)
- **Color coding**: Status一目了然 (new=yellow, cooking=orange, ready=green, delivered=blue)
- **Time urgency**: Elapsed time prominent, color changes over time
- **Large targets**: "Complete" button at least 60×60px (fast-paced environment)
- **One-tap actions**: Reduce steps for common actions

### Order Management
- **Quick filters**: Status tabs (pending, cooking, ready, completed)
- **Bulk actions**: Select multiple for batch operations
- **Search**: Prominent, real-time filtering
- **Sort**: Date, table, amount (clear affordance)

### Menu Editing (Mobile)
- **Image upload**: Large tap target, camera or gallery
- **Price input**: Numeric keyboard, clear validation
- **Availability**: Toggle switch, immediate feedback
- **Preview**: See changes before saving

---

## 10. Customer Ordering Critical Requirements

### Browse & Discovery
- **Visual hierarchy**: Photos prominent, clear pricing
- **Search**: Easy access, real-time filtering
- **Filters**: Bottom sheet or modal, clear apply/reset
- **Categories**: Quick navigation, back button always available

### Cart & Checkout
- **Persistent access**: Bottom bar or floating button
- **Real-time updates**: Tax, total, delivery fee visible
- **Validation**: Prevent checkout with errors
- **Payment progress**: Clear steps, current step highlighted

### Order Tracking
- **Real-time updates**: Poll or push for status changes
- **Estimated time**: Prominent, updates as it changes
- **Status history**: Optional expandable section
- **Contact**: Call restaurant button if delayed

---

## Quick Reference Card

| Element | Minimum Size | Spacing | Notes |
|---------|--------------|---------|-------|
| Touch targets | 48×48px | 8px apart | WCAG AAA: 44×44px |
| Body text | 16px | 1.4-1.6 line-height | 12px for secondary |
| Buttons (height) | 48px | 16-24px apart | Full-width on mobile |
| Input fields | 48px height | 16-24px apart | 16px font |
| Icons | 24×24px | - | Touch area with padding |
| List items | 48px+ height | 8-12px apart | Full-width tappable |
| Nav items | 48×48px | - | Bottom bar: 3-5 items |
| Toggles | 48×32px | 16px apart | Track + thumb |
| Checkboxes | 44×44px | 12px apart | Include label tap |

---

## Testing Checklist

For each screen, verify:
1. [ ] All interactive elements meet 48×48px minimum
2. [ ] Touch targets have 8px+ spacing
3. [ ] Body text is 16px+, secondary 12-14px
4. [ ] Contrast ratio meets WCAG AA (4.5:1)
5. [ ] Primary actions in bottom 1/3 (thumb zone)
6. [ ] No horizontal scrolling (except horizontal lists)
7. [ ] Form inputs auto-focus with correct keyboard type
8. [ ] Loading/empty/error states are present
9. [ ] Swipe gestures have visual affordance
10. [ ] No elements within 16px of screen edge (safe area)
