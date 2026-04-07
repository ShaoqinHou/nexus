#!/bin/bash
# PostToolUse hook for Edit/Write — checks cross-app and cross-module imports

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
{"additionalContext": "WARNING: Import boundary violation detected.\n${VIOLATIONS}\n\nRules:\n- apps/{a}/ CANNOT import from apps/{b}/ -- use components/ or platform/\n- modules/{a}/ CANNOT import from modules/{b}/ -- use lib/\n- components/ui/ CANNOT import from apps/ or platform/\nSee .claude/rules/import-boundaries.md"}
EOF
fi

exit 0
