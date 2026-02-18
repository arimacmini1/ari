#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

usage() {
  cat <<'EOF'
Usage:
  scripts/dogfood-wrapup.sh --task-id <FXX-*> --workflow-id <workflow_id> [--head-sha <sha>] [--no-pr-loop-checks] [--no-cleanup]

Runs the standard end-of-slice dogfood wrap-up:
  1) Companion docs sync (create/update onboarding + architecture docs)
  2) PR risk-policy preflight gate (current head SHA)
  3) PR review clean-state gate (current head SHA)
  4) Docs parity check
  5) Evidence manifest generation
  6) Evidence cleanup apply (moves non-evidence into screehshots_evidence/_trash/)

Examples:
  scripts/dogfood-wrapup.sh --task-id F03-MH-09 --workflow-id ari-self-bootstrap-abc123
  scripts/dogfood-wrapup.sh --task-id F03-MH-09 --workflow-id ari-self-bootstrap-abc123 --head-sha "$(git rev-parse HEAD)"
  scripts/dogfood-wrapup.sh --task-id F03-MH-09 --workflow-id ari-self-bootstrap-abc123 --no-cleanup
EOF
}

task_id=""
workflow_id=""
head_sha=""
no_cleanup=0
no_pr_loop_checks=0

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
    --head-sha)
      head_sha="${2:-}"
      shift 2
      ;;
    --no-pr-loop-checks)
      no_pr_loop_checks=1
      shift 1
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
if [[ "${head_sha}" == "" ]]; then
  head_sha="$(git rev-parse HEAD)"
fi
echo "  head_sha:    ${head_sha}"
echo ""

echo "[1/6] Companion docs sync..."
run_pm docs:sync-companion -- --task-id "${task_id}" --workflow-id "${workflow_id}"

echo ""
if [[ "${no_pr_loop_checks}" == "1" ]]; then
  echo "[2/6] PR loop checks skipped (--no-pr-loop-checks)."
  echo "[3/6] PR loop checks skipped (--no-pr-loop-checks)."
else
  echo "[2/6] Risk-policy preflight gate..."
  run_pm harness:risk-gate -- --head-sha "${head_sha}"
  echo ""
  echo "[3/6] Review clean-state gate..."
  run_pm harness:review:local-llm -- --head-sha "${head_sha}"
fi

echo ""
echo "[4/6] Docs parity..."
run_pm docs:parity

echo ""
echo "[5/6] Evidence manifest..."
run_pm evidence:manifest -- --task-id "${task_id}" --workflow-id "${workflow_id}"

if [[ "${no_cleanup}" == "1" ]]; then
  echo ""
  echo "[6/6] Evidence cleanup skipped (--no-cleanup)."
  exit 0
fi

echo ""
echo "[6/6] Evidence cleanup apply (moves to _trash)..."
run_pm evidence:cleanup:apply
