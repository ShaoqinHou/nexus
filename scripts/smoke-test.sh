#!/bin/bash
# Post-deploy smoke test — verifies all critical production endpoints
# Usage: bash scripts/smoke-test.sh [base_url]
# Default: https://cv.rehou.games/nexus/api

BASE="${1:-https://cv.rehou.games/nexus/api}"
PASS=0
FAIL=0

check() {
  local name="$1"
  local result="$2"
  if [ "$result" = "ok" ] || [ "$result" = "true" ] || echo "$result" | grep -q "ok\|true\|✓"; then
    echo "  ✓ $name"
    PASS=$((PASS + 1))
  else
    echo "  ✗ $name — $result"
    FAIL=$((FAIL + 1))
  fi
}

echo "=== SMOKE TEST: $BASE ==="
echo ""

# 1. Health
HEALTH=$(curl -s "$BASE/platform/health" 2>/dev/null | node -e "try{const d=JSON.parse(require('fs').readFileSync(0,'utf8'));process.stdout.write(d.status)}catch{process.stdout.write('FAIL')}" 2>/dev/null)
check "API Health" "$HEALTH"

# 2. Menu
MENU=$(curl -s "$BASE/order/demo/ordering/menu" 2>/dev/null | node -e "try{const d=JSON.parse(require('fs').readFileSync(0,'utf8'));process.stdout.write(d.data?'ok':'FAIL')}catch{process.stdout.write('FAIL')}" 2>/dev/null)
check "Menu endpoint" "$MENU"

# 3. Chinese menu
ZH=$(curl -s "$BASE/order/demo/ordering/menu?lang=zh" 2>/dev/null | node -e "try{const d=JSON.parse(require('fs').readFileSync(0,'utf8'));const n=d.data.categories[0].category.name;process.stdout.write(/[\u4e00-\u9fff]/.test(n)?'ok':'english')}catch{process.stdout.write('FAIL')}" 2>/dev/null)
check "Chinese translations" "$ZH"

# 4. Login
TOKEN=$(curl -s "$BASE/platform/auth/login" -H 'Content-Type: application/json' -d '{"email":"demo@example.com","password":"password123","tenantSlug":"demo"}' 2>/dev/null | node -e "try{const d=JSON.parse(require('fs').readFileSync(0,'utf8'));process.stdout.write(d.token?'ok':'FAIL')}catch{process.stdout.write('FAIL')}" 2>/dev/null)
check "Auth login" "$TOKEN"

# 5. Orders (needs real token)
REAL_TOKEN=$(curl -s "$BASE/platform/auth/login" -H 'Content-Type: application/json' -d '{"email":"demo@example.com","password":"password123","tenantSlug":"demo"}' 2>/dev/null | node -e "try{process.stdout.write(JSON.parse(require('fs').readFileSync(0,'utf8')).token||'')}catch{}" 2>/dev/null)
if [ -n "$REAL_TOKEN" ]; then
  ORDERS=$(curl -s "$BASE/t/demo/ordering/orders" -H "Authorization: Bearer $REAL_TOKEN" 2>/dev/null | node -e "try{const d=JSON.parse(require('fs').readFileSync(0,'utf8'));process.stdout.write(Array.isArray(d.data)?'ok':'FAIL')}catch{process.stdout.write('FAIL')}" 2>/dev/null)
  check "Orders API" "$ORDERS"

  # 6. Kitchen SSE
  SSE=$(timeout 3 curl -s "$BASE/t/demo/kitchen/stream?token=$REAL_TOKEN" 2>/dev/null | head -1 | grep -q "orders" && echo "ok" || echo "FAIL")
  check "Kitchen SSE" "$SSE"

  # 7. Settings
  SETTINGS=$(curl -s "$BASE/t/demo/settings" -H "Authorization: Bearer $REAL_TOKEN" 2>/dev/null | node -e "try{const d=JSON.parse(require('fs').readFileSync(0,'utf8'));process.stdout.write(d.data?'ok':'FAIL')}catch{process.stdout.write('FAIL')}" 2>/dev/null)
  check "Settings API" "$SETTINGS"
fi

echo ""
echo "=== RESULT: $PASS passed, $FAIL failed ==="

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
