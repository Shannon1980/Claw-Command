#!/usr/bin/env bash
# Smoke tests for Mission Control API endpoints.
# Run: ./scripts/smoke-test-mc-api.sh [BASE_URL]
# Default BASE_URL: http://localhost:3000

BASE="${1:-http://localhost:3000}"
FAIL=0

test_endpoint() {
  local method="$1"
  local path="$2"
  local desc="$3"
  local res
  if [ "$method" = "GET" ]; then
    res=$(curl -s -o /dev/null -w "%{http_code}" "$BASE$path")
  else
    res=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE$path" -H "Content-Type: application/json" -d '{}')
  fi
  if [ "$res" = "200" ]; then
    echo "✓ $desc ($res)"
  else
    echo "✗ $desc (got $res)"
    FAIL=1
  fi
}

echo "Mission Control API smoke tests"
echo "Base URL: $BASE"
echo ""

test_endpoint "GET" "/api/mission-control/opportunities" "GET /opportunities"
test_endpoint "GET" "/api/mission-control/teaching-tasks" "GET /teaching-tasks"
test_endpoint "GET" "/api/mission-control/blockers" "GET /blockers"
test_endpoint "GET" "/api/mission-control/agents" "GET /agents"
test_endpoint "GET" "/api/mission-control/schedule" "GET /schedule"
test_endpoint "GET" "/api/mission-control/memory" "GET /memory"
test_endpoint "GET" "/api/mission-control/recall?q=test" "GET /recall"
test_endpoint "POST" "/api/mission-control/seed" "POST /seed"

echo ""
if [ $FAIL -eq 0 ]; then
  echo "All passed."
  exit 0
else
  echo "Some tests failed."
  exit 1
fi
