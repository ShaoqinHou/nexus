# Mobile UX Improvements

**Status**: 🟡 In Progress (Critical Fixes)
**Priority**: P0 - Production Blocker
**Date**: 2026-04-11
**Archive After**: Implementation complete + verified

---

## Problem Statement

The Nexus mobile interfaces (both staff and customer-facing) have critical mobile UX issues that block production readiness:

- **Touch targets**: Many buttons below 48×48px minimum (fails WCAG 2.1 AA)
- **Category navigation**: Non-sticky, scrolls away on menu screens
- **Typography**: Small fonts, inadequate line heights on mobile
- **Loading states**: Missing skeleton screens, spinners, toasts
- **Design system violations**: Hardcoded values instead of design tokens

User testing revealed staff UI is "bad" on mobile — too small, poor contrast, hard to tap.

## User Stories

### Staff-Facing (Merchant Portal)

- As a **server**, I want to tap Order Dashboard buttons accurately on first try, so I can manage orders quickly without frustration
- As a **manager**, I want readable Order Cards with clear status badges, so I can scan orders at a glance
- As a **kitchen staff**, I want prominent order buttons on Kitchen Display, so I can accept/complete orders without mis-taps
- As a **admin**, I want accessible form inputs and toggles, so I can configure menu items on mobile without zooming

### Customer-Facing (QR Ordering)

- As a **customer**, I want sticky category navigation, so I don't lose context while browsing long menus
- As a **customer**, I want prominent search bar, so I can find items quickly
- As a **customer**, I want clear combo slot completion status, so I know when my order is complete
- As a **customer**, I want quantity buttons I can tap easily, so adjusting quantities is frustration-free

## Success Criteria

- [ ] **90%+ score** on mobile UI checklist (`research/checklist.md`)
- [ ] **100% compliance** with WCAG 2.1 Level AA touch targets (48×48px minimum)
- [ ] **100% compliance** with design system (no hardcoded colors/pixels)
- [ ] **All loading states** implemented (skeletons, spinners, toasts)
- [ ] **Sticky navigation** on menu browse screens
- [ ] **Contrast ratios** meet WCAG AA (4.5:1 for text)

## Scope

### In Scope

- **Touch target fixes**: Increase all buttons below 48×48px to minimum
- **Navigation improvements**: Sticky category nav, back-to-top button
- **Typography**: Increase body text to 16px minimum, improve line heights
- **Loading states**: Add skeleton screens, spinners, toast notifications
- **Empty states**: Clear messaging for empty carts, search results, menus
- **Design system compliance**: Migrate hardcoded values to Tailwind classes + tokens
- **Accessibility**: Focus states, aria-labels, alt text

### Out of Scope

- Redesign of overall information architecture
- New features beyond mobile UX baseline
- Desktop-specific improvements
- Performance optimization (separate initiative)
- Native app development

## Research & Standards

- **Research document**: `.claude/workflow/mobile-review/research/standards.md`
- **Checklist**: `.claude/workflow/mobile-review/research/checklist.md`
- **Final review**: `.claude/workflow/mobile-review/FINAL-REVIEW.md`
- **Implementation plan**: `.claude/workflow/mobile-review/IMPLEMENTATION-PLAN-CORRECTED.md`

**Key standards**:
- WCAG 2.1 Level AA: 48×48px minimum touch targets
- Apple HIG: 44×44pt minimum
- Material Design 3: 48×48dp recommended
- Contrast ratio: 4.5:1 for normal text, 3:1 for large text

## Competitive Analysis

| Feature | Mr Yum | Uber Eats | DoorDash | Nexus (Current) | Nexus (Target) |
|---------|--------|-----------|----------|-----------------|----------------|
| Sticky categories | ✅ | ✅ | ✅ | ❌ | ✅ |
| Full-width search | ✅ | ✅ | ✅ | ❌ | ✅ |
| Touch targets 48px | ✅ | ✅ | ✅ | ❌ | ✅ |
| Loading states | ✅ | ✅ | ✅ | ❌ | ✅ |
| Bottom sheets | ✅ | ✅ | ✅ | ✅ | ✅ |

## Implementation Roadmap

### Phase 1: Critical Fixes (Week 1)
- Fix all touch targets below 48×48px
- Implement sticky category navigation
- Add loading states (skeletons, spinners)
- Add empty states
- Replace search icon with full-width bar

### Phase 2: High-Priority (Week 2)
- Back-to-top button
- Combo sheet UX improvements
- Toast notifications
- Order confirmation enhancements
- Filter UX improvements

### Phase 3: Polish (Week 3)
- Dark mode toggle
- Search enhancements
- Pull-to-refresh
- Accessibility audit
- Micro-interactions

## Design System Compliance

**Rules enforced via `.claude/hooks/check-edited-file.sh`**:

1. ✅ **Use Tailwind classes**, not hardcoded pixels
   - ✅ `className="px-4 py-3 min-h-[48px]"`
   - ❌ `style={{ padding: '12px 16px', minHeight: '48px' }}`

2. ✅ **Use design tokens**, not hardcoded colors
   - ✅ `className="bg-brand text-text-inverse"`
   - ❌ `style={{ backgroundColor: '#2563eb', color: '#ffffff' }}`

3. ✅ **Use token-based semantic classes**
   - ✅ `className="text-text text-text-secondary"`
   - ❌ `className="text-gray-900 text-gray-600"`

4. ✅ **Arbitrary values only for mobile standards**
   - ✅ `min-h-[48px]` (WCAG minimum)
   - ❌ `h-[57px]` (magic number)

## Related Work

- **PR**: (To be created)
- **Issue**: Mobile UX baseline for production readiness
- **Epic**: Restaurant ordering MVP

## Archive Instructions

After implementation is complete and verified:

1. Move this file to `.claude/workflow/design/archive/mobile-ux-improvements-2026-04.md`
2. Update FINAL-REVIEW.md with "✅ Completed" badge
3. Add success metrics to project memory (if applicable)
