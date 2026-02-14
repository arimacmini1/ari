#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-http://localhost:3000}"

payload='{"execution_id":"exec-001","node_id":"decision-2","alternative_outcome":"Use monolithic architecture"}'

echo "Checking trace compare kill switch at ${BASE_URL}..."
compare_status=$(
  curl -s -o /tmp/trace-compare-killswitch.json -w "%{http_code}" \
    -X POST "${BASE_URL}/api/traces/compare" \
    -H "Content-Type: application/json" \
    -d "${payload}"
)

echo "Checking trace fork kill switch at ${BASE_URL}..."
fork_status=$(
  curl -s -o /tmp/trace-fork-killswitch.json -w "%{http_code}" \
    -X POST "${BASE_URL}/api/traces/fork" \
    -H "Content-Type: application/json" \
    -d "${payload}"
)

echo "compare_status=${compare_status}"
echo "fork_status=${fork_status}"

if [[ "${compare_status}" == "503" && "${fork_status}" == "503" ]]; then
  echo "PASS: Kill switch is active for compare and fork."
  exit 0
fi

echo "FAIL: Expected 503 for both endpoints."
echo "Compare response:"
cat /tmp/trace-compare-killswitch.json || true
echo
echo "Fork response:"
cat /tmp/trace-fork-killswitch.json || true
echo
exit 1

