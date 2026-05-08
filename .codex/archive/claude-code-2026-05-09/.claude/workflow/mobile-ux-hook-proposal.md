# Mobile UX Hook Enhancements — Proposal

**Date**: 2026-04-11
**Purpose**: Automate enforcement of mobile UX standards in `.claude/hooks/check-edited-file.sh`

---

## Current State

The hook currently checks:
- ✅ Cross-app imports (apps/{a}/ importing from apps/{b}/)
- ✅ Cross-module imports (modules/{a}/ importing from modules/{b}/)
- ✅ UI component import boundaries

## Proposed Enhancements

Add 4 new automated checks for mobile UX violations:

### Check 4: Hardcoded Colors (FAIL)

**Pattern**: `#[0-9a-fA-F]{6}` in className or style attributes

**Why**: Design system requires CSS custom properties via Tailwind classes.

**Examples**:
```typescript
// ❌ FAIL
className="bg-[#2563eb] text-[#ffffff]"
style={{ backgroundColor: '#2563eb', color: '#ffffff' }}

// ✅ PASS
className="bg-brand text-text-inverse"
```

**Exception**: Color values in test files (snapshots, mock data).

---

### Check 5: Hardcoded Pixel Values (FAIL)

**Pattern**: `\b\d+px\b` outside Tailwind arbitrary values `min-h-[48px]`

**Why**: Design system requires Tailwind spacing scale (`p-4`, `gap-3`, `m-2`).

**Examples**:
```typescript
// ❌ FAIL
style={{ padding: '12px 16px', height: '48px', margin: '8px' }}

// ✅ PASS (Tailwind classes)
className="p-4 h-12 m-2"

// ✅ PASS (Arbitrary values for mobile standards)
className="min-h-[48px] min-w-[48px]"
```

**Exception**: Arbitrary values in brackets `[]` (used for WCAG minimums like `min-h-[48px]`).

---

### Check 6: Touch Target Violations (WARN)

**Pattern**: Buttons without `min-h-[48px]`, `h-12` (48px), or larger

**Why**: WCAG 2.1 AA requires 48×48px minimum touch targets.

**Examples**:
```typescript
// ❌ WARN
<button className="px-2 py-1 text-sm">Tap</button>  // ~32px height

// ✅ PASS
<button className="px-4 py-3 min-h-[48px]">Tap</button>  // 48px+ height
<button className="h-12 w-12">+</button>  // 48×48px
```

**Scope**: Only check `<button>`, clickable `<div>` with `onClick`/`onTap`.

---

### Check 7: Missing Design Tokens (WARN)

**Pattern**: Using hardcoded semantic colors (`text-gray-900`, `bg-blue-500`) instead of tokens (`text-text`, `bg-brand`)

**Why**: Design system ensures consistent theming and dark mode support.

**Examples**:
```typescript
// ❌ WARN
className="text-gray-900 bg-blue-500 border-gray-200"

// ✅ PASS
className="text-text bg-brand border-border"
```

**Token mapping**:
- Gray colors → `text-text`, `text-text-secondary`, `text-text-tertiary`
- Blue/primary → `bg-brand`, `text-brand`
- Semantic → `bg-success`, `bg-warning`, `bg-danger`
- Borders → `border-border`, `border-border-strong`

---

## Implementation Strategy

### Approach A: Add to Existing Hook (Recommended)

Extend `.claude/hooks/check-edited-file.sh` with 4 new checks.

**Pros**:
- Single hook runs on every edit
- Immediate feedback
- No additional workflow overhead

**Cons**:
- Hook file becomes longer (~200 lines)
- False positives need careful tuning

### Approach B: Separate Mobile UX Hook

Create `.claude/hooks/check-mobile-ux.sh` as independent hook.

**Pros**:
- Separation of concerns
- Can disable mobile checks temporarily if needed
- Easier to maintain

**Cons**:
- Two hooks running on every edit
- More files to manage

**Recommendation**: **Approach A** (extend existing hook)

---

## Proposed Code Changes

Add to `.claude/hooks/check-edited-file.sh` after Check 3:

```bash
# Check 4: Hardcoded colors (FAIL)
if [ -f "$FILE_PATH" ]; then
  while IFS= read -r line; do
    # Skip test files and comments
    if [[ "$FILE_PATH" =~ __tests__ ]] || [[ "$line" =~ ^\s*// ]]; then
      continue
    fi
    # Match #hex colors in className or style
    if echo "$line" | grep -qE '(className|style).*#[0-9a-fA-F]{6}'; then
      VIOLATIONS="${VIOLATIONS}\n  - ${FILE_PATH}:${LINENO}: Hardcoded color (#hex) — use design tokens (bg-brand, text-text)"
    fi
  done < "$FILE_PATH"
fi

# Check 5: Hardcoded pixel values (FAIL)
if [ -f "$FILE_PATH" ]; then
  while IFS= read -r line; do
    # Skip test files, comments, and arbitrary values []
    if [[ "$FILE_PATH" =~ __tests__ ]] || [[ "$line" =~ ^\s*// ]] || [[ "$line" =~ \[.*\] ]]; then
      continue
    fi
    # Match Npx patterns outside Tailwind arbitrary values
    if echo "$line" | grep -qE '\b[0-9]+px\b' && ! echo "$line" | grep -qE '\[.*px.*\]'; then
      VIOLATIONS="${VIOLATIONS}\n  - ${FILE_PATH}:${LINENO}: Hardcoded pixels — use Tailwind classes (p-4, h-12, m-2)"
    fi
  done < "$FILE_PATH"
fi

# Check 6: Touch target violations (WARN)
if [ -f "$FILE_PATH" ]; then
  while IFS= read -r line; do
    # Skip test files
    if [[ "$FILE_PATH" =~ __tests__ ]]; then
      continue
    fi
    # Check button elements for min-h-[48px] or h-12 or larger
    if echo "$line" | grep -qE '<button' && ! echo "$line" | grep -qE 'min-h-\[48px\]|h-(1[2-9]|2[0-9]|3[0-9]|40|full)'; then
      VIOLATIONS="${VIOLATIONS}\n  - ${FILE_PATH}:${LINENO}: Button may be below 48px height — add min-h-[48px]"
    fi
  done < "$FILE_PATH"
fi

# Check 7: Missing design tokens (WARN)
if [ -f "$FILE_PATH" ]; then
  while IFS= read -r line; do
    # Skip test files and comments
    if [[ "$FILE_PATH" =~ __tests__ ]] || [[ "$line" =~ ^\s*// ]]; then
      continue
    fi
    # Match hardcoded gray/blue colors in className
    if echo "$line" | grep -qE "className.*text-gray-[0-9]+|bg-gray-[0-9]+|border-gray-[0-9]+" && \
       ! echo "$line" | grep -qE "text-text|bg-bg|border-border"; then
      VIOLATIONS="${VIOLATIONS}\n  - ${FILE_PATH}:${LINENO}: Hardcoded semantic color — use tokens (text-text, bg-bg-surface)"
    fi
  done < "$FILE_PATH"
fi
```

---

## Logging & Output

**FAIL violations** (hardcoded colors, hardcoded pixels):
- Log to `.claude/workflow/issues.md` with `[mobile-ux-fail]` tag
- Return `additionalContext` with error message
- Should block completion until fixed

**WARN violations** (touch targets, design tokens):
- Log to `.claude/workflow/issues.md` with `[mobile-ux-warn]` tag
- Return `additionalContext` with warning message
- Should NOT block completion, but should be addressed

---

## Testing the Hook

Before deploying:

1. **Test FAIL cases**:
   ```bash
   # Edit a file with hardcoded colors
   echo 'className="bg-[#2563eb]"' >> test.tsx
   # Run hook: should detect violation
   ```

2. **Test PASS cases**:
   ```bash
   # Edit a file with design tokens
   echo 'className="bg-brand text-text"' >> test.tsx
   # Run hook: should pass
   ```

3. **Test false positive handling**:
   ```bash
   # Test files should be skipped
   echo 'className="bg-[#2563eb]"' > test.test.tsx
   # Run hook: should skip
   ```

---

## Rollout Plan

### Phase 1: Deploy in WARN-Only Mode (1 Week)
- All checks log to issues.md but don't block
- Team reviews violations and fixes existing code
- Tune patterns to reduce false positives

### Phase 2: Enable FAIL Mode (After)
- Hardcoded colors/pixels become blocking
- Touch targets and design tokens remain WARN
- Existing violations must be fixed before new features

### Phase 3: Full Enforcement (Ongoing)
- All checks active
- New violations caught immediately
- Technical debt paid down incrementally

---

## Open Questions

1. **Should we add an exception mechanism?**
   - E.g., `// eslint-disable-next-line mobile-ux` comments?
   - Or require justification in issues.md?

2. **Should we auto-fix some violations?**
   - E.g., replace `text-gray-900` with `text-text` automatically?
   - Risk: May not always be semantically correct

3. **How to handle legacy code?**
   - Flag all violations on first run?
   - Or only check newly edited files (current behavior)?

---

## Approval Required

- [ ] Lead approves approach (extend existing hook vs separate hook)
- [ ] Team reviews proposed patterns (false positive risk)
- [ ] Decision on exception mechanism and auto-fix
- [ ] Timeline for rollout (WARN-only → FAIL mode)

---

**Next Step**: Implement Check 4-7 in `.claude/hooks/check-edited-file.sh` after approval
