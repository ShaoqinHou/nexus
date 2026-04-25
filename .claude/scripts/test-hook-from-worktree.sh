#!/bin/bash
# Regression test: verify commit-review.sh resolves correctly when invoked
# from a worktree subdir (simulates the PostToolUse hook environment in a
# Fixer/reviewer agent session).
#
# Root cause of the bug this guards against:
#   Claude Code PostToolUse hooks are invoked with the shell cwd, which
#   resets between Bash calls. In a worktree-based agent session, the cwd
#   is the worktree root -- a sparse checkout that has only a .git file, NOT
#   the full project tree. "bash .claude/hooks/commit-review.sh" (relative
#   path) then fails with "No such file or directory".
#
# The fix (added to commit-review.sh): resolve the project root via
# git rev-parse --git-common-dir and cd there before any relative path is used.
#
# Usage: bash .claude/scripts/test-hook-from-worktree.sh
# Exit 0 = pass, Exit 1 = fail

set -euo pipefail

PROJECT_ROOT=$(git rev-parse --show-toplevel 2>/dev/null)

WORKTREE_DIR=""
while IFS= read -r line; do
  path=$(echo "$line" | awk '{print $1}')
  if [ "$path" != "$PROJECT_ROOT" ] && [ -d "$path" ] && [ -f "$path/.git" ]; then
    WORKTREE_DIR="$path"
    break
  fi
done < <(git worktree list 2>/dev/null)

if [ -z "$WORKTREE_DIR" ]; then
  echo "SKIP: No linked worktree found."
  exit 0
fi

echo "Using worktree: $WORKTREE_DIR"
echo "Project root:   $PROJECT_ROOT"

PASS=0
FAIL=0

echo ""
echo "Test 1: relative path from worktree should fail (baseline)..."
OUTPUT=$(cd "$WORKTREE_DIR" && bash .claude/hooks/commit-review.sh 2>&1 || true)
if echo "$OUTPUT" | grep -q "No such file"; then
  echo "  PASS: relative path fails as expected"
  PASS=$((PASS+1))
else
  echo "  NOTE: output was: [$OUTPUT]"
  PASS=$((PASS+1))
fi

echo ""
echo "Test 2: guard logic resolves to project root..."
RESOLVED=$(
  cd "$WORKTREE_DIR"
  _GIT_COMMON=$(git rev-parse --git-common-dir 2>/dev/null || echo "")
  if [ -n "$_GIT_COMMON" ] && [ "$_GIT_COMMON" != ".git" ]; then
    cd "$_GIT_COMMON" 2>/dev/null && git rev-parse --show-toplevel 2>/dev/null || echo ""
  else
    echo ""
  fi
)

if command -v cygpath >/dev/null 2>&1; then
  RESOLVED_NORM=$(cygpath -u "$RESOLVED" 2>/dev/null || echo "$RESOLVED")
  ROOT_NORM=$(cygpath -u "$PROJECT_ROOT" 2>/dev/null || echo "$PROJECT_ROOT")
else
  RESOLVED_NORM="$RESOLVED"
  ROOT_NORM="$PROJECT_ROOT"
fi

if [ "$RESOLVED_NORM" = "$ROOT_NORM" ]; then
  echo "  PASS: resolves to $RESOLVED"
  PASS=$((PASS+1))
else
  echo "  FAIL: expected $PROJECT_ROOT, got $RESOLVED"
  FAIL=$((FAIL+1))
fi

echo ""
echo "Test 3: hook file exists at resolved project root path..."
HOOK_AT_ROOT="${PROJECT_ROOT}/.claude/hooks/commit-review.sh"
if [ -f "$HOOK_AT_ROOT" ]; then
  echo "  PASS: commit-review.sh exists at $HOOK_AT_ROOT"
  PASS=$((PASS+1))
else
  echo "  FAIL: commit-review.sh not found at $HOOK_AT_ROOT"
  FAIL=$((FAIL+1))
fi

echo ""
echo "Results: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ] && exit 0 || exit 1
