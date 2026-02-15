#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

usage() {
  cat <<'EOF'
Usage:
  scripts/temporal-export-history.sh <workflow_id> [output_json_path] [namespace]

Examples:
  scripts/temporal-export-history.sh ari-dogfood-f7d12b42f8
  scripts/temporal-export-history.sh ari-dogfood-f7d12b42f8 screehshots_evidence/custom-history.json
  scripts/temporal-export-history.sh ari-dogfood-f7d12b42f8 screehshots_evidence/custom-history.json default
EOF
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

workflow_id="${1:-}"
if [[ -z "${workflow_id}" ]]; then
  usage
  exit 1
fi

output_path="${2:-screehshots_evidence/temporal-workflow-history-${workflow_id}.json}"
namespace="${3:-default}"

if ! command -v docker >/dev/null 2>&1; then
  echo "ERROR: docker not found. Install/start Docker and retry." >&2
  exit 1
fi

if ! docker ps --format '{{.Names}}' | grep -q '^temporal-admin-tools$'; then
  echo "ERROR: temporal-admin-tools container is not running." >&2
  echo "Start Temporal first (e.g. scripts/temporal-dev.sh)." >&2
  exit 1
fi

mkdir -p "$(dirname "${output_path}")"

docker exec temporal-admin-tools temporal workflow show \
  --workflow-id "${workflow_id}" \
  --namespace "${namespace}" \
  -o json > "${output_path}"

echo "Exported workflow history:"
echo "  workflow_id: ${workflow_id}"
echo "  namespace:   ${namespace}"
echo "  output:      ${output_path}"
