# Mobile UX Hook Implementation — Summary

**Date**: 2026-04-11
**Status**: ✅ Implemented
**Rollout Mode**: Week 1 (WARN-ONLY) → Week 2+ (FAIL mode enabled)

---

## What Was Implemented

Enhanced `.claude/hooks/check-edited-file.sh` with 4 new automated mobile UX checks:

### Check 4: Hardcoded Colors (FAIL)
```typescript
// ❌ DETECTED
className="bg-[#2563eb] text-[#ffffff]"
style={{ backgroundColor: '#2563eb' }}

// ✅ CORRECT
className="bg-brand text-text-inverse"
```

### Check 5: Hardcoded Pixels (FAIL)
```typescript
// ❌ DETECTED
style={{ padding: '12px 16px', height: '48px' }}

// ✅ CORRECT
className="p-4 h-12"
className="min-h-[48px]"  // Exception: WCAG minimum
```

### Check 6: Touch Targets (WARN)
```typescript
// ❌ WARNED
<button className="px-2 py-1 text-sm">Tap</button>  // ~32px

// ✅ CORRECT
<button className="px-4 py-3 min-h-[48px]">Tap</button>
<button className="h-12 w-12">+</button>
```

### Check 7: Design Tokens (WARN)
```typescript
// ❌ WARNED
className="text-gray-900 bg-blue-500 border-gray-200"

// ✅ CORRECT
className="text-text bg-brand border-border"
```

---

## Rollout Plan

### Week 1: WARN-ONLY Mode (Current)
- All violations logged to `.claude/workflow/issues.md`
- Hook returns warning context but doesn't block
- Team can:
  1. Fix current mobile UX issues (per implementation plan)
  2. Learn the patterns
  3. Report false positives for tuning

### Week 2+: FAIL Mode (Enable after mobile fixes deployed)
- Hardcoded colors/pixels become blocking violations
- Touch targets and design tokens remain WARN
- New violations must be fixed before proceeding
- Technical debt paid down incrementally

---

## What Gets Checked

**Every `.ts`/`.tsx` file edit** triggers the hook:
- Cross-app imports (existing)
- Cross-module imports (existing)
- UI component boundaries (existing)
- **NEW: Mobile UX violations**

**What's skipped**:
- Test files (`__tests__`)
- Comments (`//`, `/* */`)
- Tailwind arbitrary values like `min-h-[48px]`

---

## Example Output

When you edit a file with violations:

```
WARNING: Code quality violation detected.

  - packages/web/src/apps/ordering/merchant/OrderDashboard.tsx:45: Hardcoded pixels — use Tailwind classes (p-4, h-12, m-2, gap-3)
  - packages/web/src/apps/ordering/merchant/OrderDashboard.tsx:67: Touch target may be below 48px — add min-h-[48px] or h-12 (WARN)

Import boundary rules:
- apps/{a}/ CANNOT import from apps/{b}/ — use components/ or platform/
- modules/{a}/ CANNOT import from modules/{b}/ — use lib/
- components/ui/ CANNOT import from apps/ or platform/

Mobile UX rules:
- Use design tokens, not hardcoded colors (bg-brand, text-text, not #hex)
- Use Tailwind classes, not hardcoded pixels (p-4, h-12, not 12px)
- Touch targets must be 48×48px minimum (min-h-[48px])
- Use semantic tokens, not Tailwind defaults (text-text, not text-gray-900)

See: .claude/rules/import-boundaries.md | .claude/workflow/mobile-ux-hook-proposal.md
```

---

## Design Doc Created

`.claude/workflow/design/mobile-ux-improvements.md`
- Documents the mobile UX baseline work
- Links to research, reviews, implementation plan
- Will be archived after fixes complete

---

## Next Steps

1. **Current Week**: Fix mobile UX issues per IMPLEMENTATION-PLAN-CORRECTED.md
2. **Monitor**: Check `.claude/workflow/issues.md` for violations
3. **Tune**: Report false positives if any (e.g., legitimate exceptions)
4. **Week 2**: Enable FAIL mode for hardcoded colors/pixels

---

## Files Created/Modified

✅ `.claude/workflow/design/mobile-ux-improvements.md` — Design doc
✅ `.claude/workflow/mobile-ux-hook-proposal.md` — Detailed proposal
✅ `.claude/hooks/check-edited-file.sh` — Enhanced with mobile UX checks

---

**Implementation complete**. Hook is now active and will check every file edit for mobile UX violations.
