#!/bin/bash
# Session start hook — reports workspace health summary

WORKFLOW_DIR=".claude/workflow"

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

cat <<EOF
{"additionalContext": "Workspace health:\n- Branch: ${BRANCH}\n- API package: ${API_PKG}\n- Web package: ${WEB_PKG}\n- node_modules: ${NODE_MODS}\n- API server (3001): ${API_PORT}\n- Web server (5173): ${WEB_PORT}\n- Backend modules: ${MODULE_COUNT}\n- Frontend apps: ${APP_COUNT}\n- Verify marker: ${VERIFY_STATUS}"}
EOF
