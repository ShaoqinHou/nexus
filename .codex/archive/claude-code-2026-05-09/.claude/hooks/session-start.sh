#!/bin/bash
# Session start hook — workspace health + review-queue status

WORKFLOW_DIR=".claude/workflow"
SCRATCH_DIR="$WORKFLOW_DIR/scratch"

# Check basics
BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
API_PKG=$([ -f "packages/api/package.json" ] && echo "ok" || echo "missing")
WEB_PKG=$([ -f "packages/web/package.json" ] && echo "ok" || echo "missing")
NODE_MODS=$([ -d "node_modules" ] && echo "ok" || echo "missing")

# Check dev server ports
API_PORT="down"
WEB_PORT="down"
if command -v curl &>/dev/null; then
  curl -s --connect-timeout 1 http://localhost:3001/api/health &>/dev/null && API_PORT="up"
  curl -s --connect-timeout 1 http://localhost:5173 &>/dev/null && WEB_PORT="up"
fi

# Check verify marker age
VERIFY_STATUS="none"
if [ -f "$WORKFLOW_DIR/verify-marker.txt" ]; then
  MARKER_AGE=$(( $(date +%s) - $(date -r "$WORKFLOW_DIR/verify-marker.txt" +%s 2>/dev/null || echo 0) ))
  if [ "$MARKER_AGE" -lt 3600 ]; then
    VERIFY_STATUS="fresh (${MARKER_AGE}s ago)"
  else
    VERIFY_STATUS="stale (${MARKER_AGE}s ago)"
  fi
fi

# Count modules
MODULE_COUNT=$(ls -d packages/api/src/modules/*/ 2>/dev/null | wc -l | tr -d ' ')
APP_COUNT=$(ls -d packages/web/src/apps/*/ 2>/dev/null | wc -l | tr -d ' ')

# Review queue depth (set by commit-review.sh hook on successful commits)
REVIEW_QUEUE=0
if [ -s "$SCRATCH_DIR/review-queue.txt" ]; then
  REVIEW_QUEUE=$(grep -c '[^ ]' "$SCRATCH_DIR/review-queue.txt" 2>/dev/null)
  [ -z "$REVIEW_QUEUE" ] && REVIEW_QUEUE=0
fi

# Driver status — lockdir present means a background /commit-review is running
REVIEW_DRIVER="idle"
if [ -d "$SCRATCH_DIR/.review.lock" ]; then
  REVIEW_DRIVER="running"
fi

# Auto-fix branches from fixer agent runs
AUTOFIX=$(git branch --list 'auto-fix/*' 2>/dev/null | sed 's/^[* ] //' | head -3 | tr '\n' ',' | sed 's/,$//')
AUTOFIX_FIELD=""
if [ -n "$AUTOFIX" ]; then
  AUTOFIX_FIELD="\n- Auto-fix branches: ${AUTOFIX}"
fi

cat <<EOF
{"additionalContext": "Workspace health:\n- Branch: ${BRANCH}\n- API package: ${API_PKG}\n- Web package: ${WEB_PKG}\n- node_modules: ${NODE_MODS}\n- API server (3001): ${API_PORT}\n- Web server (5173): ${WEB_PORT}\n- Backend modules: ${MODULE_COUNT}\n- Frontend apps: ${APP_COUNT}\n- Verify marker: ${VERIFY_STATUS}\n- Review queue: ${REVIEW_QUEUE} pending | driver: ${REVIEW_DRIVER}${AUTOFIX_FIELD}"}
EOF
