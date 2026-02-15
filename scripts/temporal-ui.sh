#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

url="http://localhost:8080/"
compose_file="docker-compose.temporal.yml"

usage() {
  cat <<'EOF'
Usage:
  scripts/temporal-ui.sh [--no-open]

Starts the local Temporal Docker stack (server + UI) and opens the Temporal UI.

Notes:
  - Temporal UI: http://localhost:8080/
  - Temporal gRPC: localhost:7233
EOF
}

no_open=0
if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi
if [[ "${1:-}" == "--no-open" ]]; then
  no_open=1
fi

compose() {
  if docker compose version >/dev/null 2>&1; then
    docker compose -f "${compose_file}" "$@"
  else
    docker-compose -f "${compose_file}" "$@"
  fi
}

if ! command -v docker >/dev/null 2>&1; then
  echo "ERROR: docker not found. Start Docker Desktop and enable WSL integration." >&2
  exit 1
fi

echo "Starting Temporal (Postgres + Server + UI)..."
compose up -d

echo "Waiting for Temporal UI on ${url} ..."
for i in $(seq 1 60); do
  if (echo >/dev/tcp/127.0.0.1/8080) >/dev/null 2>&1; then
    echo "Temporal UI is up."
    break
  fi
  sleep 1
  if [[ "${i}" == "60" ]]; then
    echo "ERROR: Temporal UI did not become ready in time." >&2
    compose ps || true
    exit 1
  fi
done

echo ""
echo "Temporal UI: ${url}"
echo ""

if [[ "${no_open}" == "1" ]]; then
  exit 0
fi

if command -v wslview >/dev/null 2>&1; then
  exec wslview "${url}"
elif command -v xdg-open >/dev/null 2>&1; then
  exec xdg-open "${url}"
elif command -v explorer.exe >/dev/null 2>&1; then
  exec explorer.exe "${url}"
else
  echo "Open this in your browser: ${url}"
fi

