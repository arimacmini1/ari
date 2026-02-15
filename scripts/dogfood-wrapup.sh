#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

usage() {
  cat <<'EOF'
Usage:
  scripts/dogfood-wrapup.sh --task-id <FXX-*> --workflow-id <workflow_id> [--no-cleanup]

Runs the standard end-of-slice dogfood wrap-up:
  1) Companion docs sync (create/update onboarding + architecture docs)
  2) Docs parity check
  3) Evidence manifest generation
  4) Evidence cleanup apply (moves non-evidence into screehshots_evidence/_trash/)

Examples:
  scripts/dogfood-wrapup.sh --task-id F03-MH-09 --workflow-id ari-self-bootstrap-abc123
  scripts/dogfood-wrapup.sh --task-id F03-MH-09 --workflow-id ari-self-bootstrap-abc123 --no-cleanup
EOF
}

task_id=""
workflow_id=""
no_cleanup=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --task-id)
      task_id="${2:-}"
      shift 2
      ;;
    --workflow-id)
      workflow_id="${2:-}"
      shift 2
      ;;
    --no-cleanup)
      no_cleanup=1
      shift 1
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown arg: $1" >&2
      usage
      exit 2
      ;;
  esac
done

if [[ -z "${task_id}" || -z "${workflow_id}" ]]; then
  usage
  exit 2
fi

run_pm() {
  if command -v pnpm >/dev/null 2>&1; then
    pnpm run -s "$@"
  else
    npm run -s "$@"
  fi
}

echo "Dogfood wrap-up"
echo "  task_id:     ${task_id}"
echo "  workflow_id: ${workflow_id}"
echo ""

echo "[1/4] Companion docs sync..."
run_pm docs:sync-companion -- --task-id "${task_id}" --workflow-id "${workflow_id}"

echo ""
echo "[2/4] Docs parity..."
run_pm docs:parity

echo ""
echo "[3/4] Evidence manifest..."
run_pm evidence:manifest -- --task-id "${task_id}" --workflow-id "${workflow_id}"

if [[ "${no_cleanup}" == "1" ]]; then
  echo ""
  echo "[4/4] Evidence cleanup skipped (--no-cleanup)."
  exit 0
fi

echo ""
echo "[4/4] Evidence cleanup apply (moves to _trash)..."
run_pm evidence:cleanup:apply
