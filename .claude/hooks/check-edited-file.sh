#!/bin/bash
# PostToolUse hook for Edit/Write — checks import boundaries and mobile UX violations

TOOL_INPUT="$1"

# Extract file path
FILE_PATH=""
if command -v jq &>/dev/null; then
  FILE_PATH=$(echo "$TOOL_INPUT" | jq -r '.file_path // empty' 2>/dev/null)
else
  FILE_PATH=$(node -e "try{console.log(JSON.parse(process.argv[1]).file_path||'')}catch{console.log('')}" "$TOOL_INPUT" 2>/dev/null)
fi

# Only check .ts/.tsx files
if [[ ! "$FILE_PATH" =~ \.(ts|tsx)$ ]]; then
  exit 0
fi

VIOLATIONS=""

# Check 1: Cross-app imports (packages/web/src/apps/)
if [[ "$FILE_PATH" =~ apps/ ]]; then
  APP=$(echo "$FILE_PATH" | sed -n 's|.*apps/\([^/]*\)/.*|\1|p')
  if [ -n "$APP" ] && [ -f "$FILE_PATH" ]; then
    while IFS= read -r line; do
      if echo "$line" | grep -qE "from.*['\"].*apps/" ; then
        IMPORTED_APP=$(echo "$line" | sed -n "s|.*apps/\([^/'\"]*\).*|\1|p")
        if [ -n "$IMPORTED_APP" ] && [ "$IMPORTED_APP" != "$APP" ]; then
          VIOLATIONS="${VIOLATIONS}\n  - ${FILE_PATH}: apps/${APP} imports from apps/${IMPORTED_APP}"
        fi
      fi
    done < "$FILE_PATH"
  fi
fi

# Check 2: Cross-module imports (packages/api/src/modules/)
if [[ "$FILE_PATH" =~ modules/ ]]; then
  MODULE=$(echo "$FILE_PATH" | sed -n 's|.*modules/\([^/]*\)/.*|\1|p')
  if [ -n "$MODULE" ] && [ -f "$FILE_PATH" ]; then
    while IFS= read -r line; do
      if echo "$line" | grep -qE "from.*['\"].*modules/" ; then
        IMPORTED_MODULE=$(echo "$line" | sed -n "s|.*modules/\([^/'\"]*\).*|\1|p")
        if [ -n "$IMPORTED_MODULE" ] && [ "$IMPORTED_MODULE" != "$MODULE" ]; then
          VIOLATIONS="${VIOLATIONS}\n  - ${FILE_PATH}: modules/${MODULE} imports from modules/${IMPORTED_MODULE}"
        fi
      fi
    done < "$FILE_PATH"
  fi
fi

# Check 3: UI components importing from apps or platform
if [[ "$FILE_PATH" =~ components/ui/ ]]; then
  if [ -f "$FILE_PATH" ]; then
    while IFS= read -r line; do
      if echo "$line" | grep -qE "from.*['\"].*(apps/|platform/)" ; then
        VIOLATIONS="${VIOLATIONS}\n  - ${FILE_PATH}: components/ui/ imports from apps/ or platform/"
      fi
    done < "$FILE_PATH"
  fi
fi

# Check 4: Hardcoded colors (FAIL) - Design system requires tokens
if [ -f "$FILE_PATH" ] && ! [[ "$FILE_PATH" =~ __tests__ ]]; then
  LINENO=0
  while IFS= read -r line; do
    LINENO=$((LINENO + 1))
    # Skip comments
    if [[ "$line" =~ ^\s*// ]] || [[ "$line" =~ ^\s*/\* ]]; then
      continue
    fi
    # Match #hex colors in className or style attributes
    if echo "$line" | grep -qE '(className|style).*#[0-9a-fA-F]{6}'; then
      VIOLATIONS="${VIOLATIONS}\n  - ${FILE_PATH}:${LINENO}: Hardcoded color (#hex) — use design tokens (bg-brand, text-text, bg-bg-surface)"
    fi
  done < "$FILE_PATH"
fi

# Check 5: Hardcoded pixel values (FAIL) - Design system requires Tailwind classes
if [ -f "$FILE_PATH" ] && ! [[ "$FILE_PATH" =~ __tests__ ]]; then
  LINENO=0
  while IFS= read -r line; do
    LINENO=$((LINENO + 1))
    # Skip comments and arbitrary values in brackets []
    if [[ "$line" =~ ^\s*// ]] || [[ "$line" =~ ^\s*/\* ]]; then
      continue
    fi
    # Match Npx patterns outside Tailwind arbitrary values like min-h-[48px]
    if echo "$line" | grep -qE '\b[0-9]+px\b' && ! echo "$line" | grep -qE '\[[^]]*px[^]]*\]'; then
      VIOLATIONS="${VIOLATIONS}\n  - ${FILE_PATH}:${LINENO}: Hardcoded pixels — use Tailwind classes (p-4, h-12, m-2, gap-3)"
    fi
  done < "$FILE_PATH"
fi

# Check 6: Touch target violations (WARN) - WCAG 2.1 AA requires 48×48px minimum
if [ -f "$FILE_PATH" ] && ! [[ "$FILE_PATH" =~ __tests__ ]]; then
  LINENO=0
  while IFS= read -r line; do
    LINENO=$((LINENO + 1))
    # Check button elements and clickable divs for min-h-[48px] or h-12 or larger
    if echo "$line" | grep -qE '<(button|div.*onClick|div.*onTap)' && \
       ! echo "$line" | grep -qE 'min-h-\[48px\]|min-h-\[4[89]px\]|min-h-\[5-9][0-9]px\|min-h-\[1-9][0-9][0-9]px\|h-(1[2-9]|2[0-9]|3[0-9]|40|full)'; then
      VIOLATIONS="${VIOLATIONS}\n  - ${FILE_PATH}:${LINENO}: Touch target may be below 48px — add min-h-[48px] or h-12 (WARN)"
    fi
  done < "$FILE_PATH"
fi

# Check 7: Missing design tokens (WARN) - Use semantic tokens not hardcoded colors
if [ -f "$FILE_PATH" ] && ! [[ "$FILE_PATH" =~ __tests__ ]]; then
  LINENO=0
  while IFS= read -r line; do
    LINENO=$((LINENO + 1))
    # Skip comments
    if [[ "$line" =~ ^\s*// ]] || [[ "$line" =~ ^\s*/\* ]]; then
      continue
    fi
    # Match hardcoded gray/semantic colors in className when token alternatives exist
    if echo "$line" | grep -qE "className.*(text|bg|border)-(gray|red|green|blue|yellow|orange|purple|pink)-[0-9]+" && \
       ! echo "$line" | grep -qE "text-text|bg-bg|bg-brand|border-border|text-(inverse|secondary|tertiary)|bg-(success|warning|danger|info)"; then
      VIOLATIONS="${VIOLATIONS}\n  - ${FILE_PATH}:${LINENO}: Hardcoded semantic color — use tokens (text-text, bg-bg-surface, bg-brand) (WARN)"
    fi
  done < "$FILE_PATH"
fi

if [ -n "$VIOLATIONS" ]; then
  WORKFLOW_DIR=".claude/workflow"
  ISSUES_FILE="$WORKFLOW_DIR/issues.md"
  mkdir -p "$WORKFLOW_DIR"

  _write_issue() {
    echo "- [$(date -u +%Y-%m-%dT%H:%M:%SZ)] [import-boundary] ${VIOLATIONS}" >> "$ISSUES_FILE"
  }

  # mkdir-based lock for MINGW64 (flock not reliably available)
  LOCKDIR="$WORKFLOW_DIR/.issues.lockdir"
  if mkdir "$LOCKDIR" 2>/dev/null; then
    _write_issue
    rmdir "$LOCKDIR"
  else
    sleep 0.5
    _write_issue
  fi

  cat <<EOF
{"additionalContext": "WARNING: Code quality violation detected.\n${VIOLATIONS}\n\nImport boundary rules:\n- apps/{a}/ CANNOT import from apps/{b}/ — use components/ or platform/\n- modules/{a}/ CANNOT import from modules/{b}/ — use lib/\n- components/ui/ CANNOT import from apps/ or platform/\n\nMobile UX rules:\n- Use design tokens, not hardcoded colors (bg-brand, text-text, not #hex)\n- Use Tailwind classes, not hardcoded pixels (p-4, h-12, not 12px)\n- Touch targets must be 48×48px minimum (min-h-[48px])\n- Use semantic tokens, not Tailwind defaults (text-text, not text-gray-900)\n\nSee: .claude/rules/import-boundaries.md | .claude/workflow/mobile-ux-hook-proposal.md"}
EOF
fi

exit 0
