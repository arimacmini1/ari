#!/usr/bin/env bash
set -euo pipefail

compose_file="docker-compose.temporal.yml"

if ! command -v docker >/dev/null 2>&1; then
  echo "ERROR: docker not found. Install Docker Desktop (WSL2 enabled) and retry." >&2
  exit 1
fi

compose() {
  if docker compose version >/dev/null 2>&1; then
    docker compose -f "${compose_file}" "$@"
  else
    docker-compose -f "${compose_file}" "$@"
  fi
}

echo "Starting Temporal (Postgres + Server + UI)..."
compose up -d

echo "Waiting for Temporal to accept connections on localhost:7233..."
for i in $(seq 1 60); do
  if (echo >/dev/tcp/127.0.0.1/7233) >/dev/null 2>&1; then
    echo "Temporal is up."
    break
  fi
  sleep 2
  if [[ "${i}" == "60" ]]; then
    echo "ERROR: Temporal did not become ready in time." >&2
    compose ps
    exit 1
  fi
done

python_dir="temporal_worker"
venv_dir="${python_dir}/.venv"

if ! command -v python3 >/dev/null 2>&1; then
  echo "ERROR: python3 not found." >&2
  exit 1
fi

if [[ ! -d "${venv_dir}" ]]; then
  echo "Creating venv at ${venv_dir}..."
  python3 -m venv "${venv_dir}"
fi

echo "Installing worker deps..."
"${venv_dir}/bin/pip" -q install -r "${python_dir}/requirements.txt"

echo ""
echo "Temporal UI: http://localhost:8080"
echo "Temporal gRPC: localhost:7233"
echo ""
echo "Starting Python worker (Ctrl+C to stop worker; Temporal containers stay running)..."
exec "${venv_dir}/bin/python" "${python_dir}/worker.py"

