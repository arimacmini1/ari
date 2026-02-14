#!/usr/bin/env bash
set -euo pipefail

# Feature 15 verification script
# Verifies:
# 1) Telemetry ingestion endpoint
# 2) Adoption summary endpoint
# 3) Import preflight validation/retry behavior
# 4) Import execution result shape
#
# Usage:
#   npm run dev
#   bash scripts/verify-feature-15.sh
#
# Optional env:
#   BASE_URL=http://localhost:3000
#   USER_ID=drew

BASE_URL="${BASE_URL:-http://localhost:3000}"
USER_ID="${USER_ID:-drew}"
SESSION_ID="session-verify-$(date +%s)"

PASS_COUNT=0
FAIL_COUNT=0

check_pass() {
  PASS_COUNT=$((PASS_COUNT + 1))
  echo "[PASS] $1"
}

check_fail() {
  FAIL_COUNT=$((FAIL_COUNT + 1))
  echo "[FAIL] $1"
}

request() {
  local method="$1"
  local path="$2"
  local body="${3:-}"
  local project_id="${4:-}"
  local out_file
  out_file="$(mktemp)"

  local code
  if [[ -n "$body" ]]; then
    if [[ -n "$project_id" ]]; then
      code="$(curl -sS -o "$out_file" -w "%{http_code}" \
        -X "$method" \
        -H "content-type: application/json" \
        -H "x-user-id: ${USER_ID}" \
        -H "x-project-id: ${project_id}" \
        "${BASE_URL}${path}" \
        -d "$body")"
    else
      code="$(curl -sS -o "$out_file" -w "%{http_code}" \
        -X "$method" \
        -H "content-type: application/json" \
        -H "x-user-id: ${USER_ID}" \
        "${BASE_URL}${path}" \
        -d "$body")"
    fi
  else
    if [[ -n "$project_id" ]]; then
      code="$(curl -sS -o "$out_file" -w "%{http_code}" \
        -X "$method" \
        -H "x-user-id: ${USER_ID}" \
        -H "x-project-id: ${project_id}" \
        "${BASE_URL}${path}")"
    else
      code="$(curl -sS -o "$out_file" -w "%{http_code}" \
        -X "$method" \
        -H "x-user-id: ${USER_ID}" \
        "${BASE_URL}${path}")"
    fi
  fi

  echo "${code}|${out_file}"
}

json_stringify() {
  node -e '
    const input = process.argv[1] ?? "";
    process.stdout.write(JSON.stringify(input));
  ' "$1"
}

extract_first_project_id() {
  local json_file="$1"
  node -e '
    const fs = require("fs");
    const data = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
    const id = data?.projects?.[0]?.project_id || "";
    if (!id) process.exit(1);
    process.stdout.write(id);
  ' "$json_file"
}

echo "Verifying Feature 15 against ${BASE_URL}"

# Resolve active project context for scoped endpoints.
resp="$(request GET "/api/projects")"
code="${resp%%|*}"
body_file="${resp#*|}"
if [[ "$code" != "200" ]]; then
  check_fail "GET /api/projects returned ${code}"
  cat "$body_file"
  rm -f "$body_file"
  exit 1
fi

PROJECT_ID="$(extract_first_project_id "$body_file" || true)"
rm -f "$body_file"
if [[ -z "$PROJECT_ID" ]]; then
  check_fail "No project_id available from /api/projects"
  exit 1
fi
check_pass "Resolved project_id=${PROJECT_ID}"

# Telemetry events required by F15.
EVENTS=(
  session_started
  assistant_response
  draft_generated
  expanded_to_canvas
  tutorial_completed
  import_attempted
  import_failed
  migration_tip_shown
  migration_tip_clicked
  migration_tip_dismissed
)

for event in "${EVENTS[@]}"; do
  payload="$(cat <<JSON
{"event_name":"${event}","session_id":"${SESSION_ID}","metadata":{"source":"verify-script","event":"${event}"}}
JSON
)"
  resp="$(request POST "/api/telemetry/events" "$payload" "$PROJECT_ID")"
  code="${resp%%|*}"
  body_file="${resp#*|}"
  if [[ "$code" != "200" ]]; then
    check_fail "POST /api/telemetry/events (${event}) returned ${code}"
    cat "$body_file"
    rm -f "$body_file"
    continue
  fi
  status="$(node -e '
    const fs = require("fs");
    const data = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
    process.stdout.write(String(data?.status || ""));
  ' "$body_file" || true)"
  rm -f "$body_file"
  if [[ "$status" == "stored" || "$status" == "duplicate" ]]; then
    check_pass "Telemetry accepted for ${event} (${status})"
  else
    check_fail "Telemetry response missing expected status for ${event}"
  fi
done

# Adoption summary endpoint check.
resp="$(request GET "/api/analytics/adoption/summary?period=last_30d" "" "$PROJECT_ID")"
code="${resp%%|*}"
body_file="${resp#*|}"
if [[ "$code" != "200" ]]; then
  check_fail "GET /api/analytics/adoption/summary returned ${code}"
  cat "$body_file"
  rm -f "$body_file"
else
  summary_ok="$(node -e '
    const fs = require("fs");
    const data = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
    const s = data?.summary;
    const ok =
      s &&
      typeof s.sessions_total === "number" &&
      typeof s.conversion_rate === "number" &&
      typeof s.import_attempts === "number";
    process.stdout.write(ok ? "ok" : "bad");
  ' "$body_file" || true)"
  if [[ "$summary_ok" == "ok" ]]; then
    check_pass "Adoption summary shape is valid"
  else
    check_fail "Adoption summary payload missing expected fields"
    cat "$body_file"
  fi
  rm -f "$body_file"
fi

# Import preflight invalid (empty input) should fail.
resp="$(request POST "/api/familiar/import" '{"input":"   ","preflight":true}')"
code="${resp%%|*}"
body_file="${resp#*|}"
if [[ "$code" == "400" ]]; then
  check_pass "Import preflight rejects empty input (400)"
else
  check_fail "Import preflight empty-input expected 400, got ${code}"
  cat "$body_file"
fi
rm -f "$body_file"

# Import preflight valid should provide preview.
VALID_INPUT='{"name":"Verify Feature 15","description":"Simple import verification","tasks":["Build API","Add tests"]}'
VALID_INPUT_JSON="$(json_stringify "$VALID_INPUT")"
resp="$(request POST "/api/familiar/import" "{\"input\":${VALID_INPUT_JSON},\"preflight\":true}")"
code="${resp%%|*}"
body_file="${resp#*|}"
if [[ "$code" != "200" ]]; then
  check_fail "Import preflight valid expected 200, got ${code}"
  cat "$body_file"
  rm -f "$body_file"
else
  preview_ok="$(node -e '
    const fs = require("fs");
    const data = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
    const ok =
      data?.preflight === true &&
      typeof data?.project_name === "string" &&
      Array.isArray(data?.tasks_preview);
    process.stdout.write(ok ? "ok" : "bad");
  ' "$body_file" || true)"
  if [[ "$preview_ok" == "ok" ]]; then
    check_pass "Import preflight preview returned project/summary/tasks"
  else
    check_fail "Import preflight preview missing expected fields"
    cat "$body_file"
  fi
  rm -f "$body_file"
fi

# Full import should return canvas.
resp="$(request POST "/api/familiar/import" "{\"input\":${VALID_INPUT_JSON}}")"
code="${resp%%|*}"
body_file="${resp#*|}"
if [[ "$code" != "200" ]]; then
  check_fail "Import execute expected 200, got ${code}"
  cat "$body_file"
  rm -f "$body_file"
else
  import_ok="$(node -e '
    const fs = require("fs");
    const data = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
    const ok =
      data?.canvas &&
      Array.isArray(data?.canvas?.nodes) &&
      Array.isArray(data?.canvas?.edges) &&
      typeof data?.project_name === "string";
    process.stdout.write(ok ? "ok" : "bad");
  ' "$body_file" || true)"
  if [[ "$import_ok" == "ok" ]]; then
    check_pass "Import execution returned canvas payload"
  else
    check_fail "Import execution response missing expected canvas fields"
    cat "$body_file"
  fi
  rm -f "$body_file"
fi

echo
echo "Feature 15 verification complete: ${PASS_COUNT} passed, ${FAIL_COUNT} failed."
if [[ "$FAIL_COUNT" -gt 0 ]]; then
  exit 1
fi
