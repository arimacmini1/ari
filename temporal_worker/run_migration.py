import argparse
import asyncio
import json
import sys
import uuid
from pathlib import Path
from typing import Any

from temporalio.client import Client

WORKFLOW_NAME = "MendixMigrationWorkflow"
TASK_QUEUE = "ari-smoke"
NAMESPACE = "default"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Run Mendix -> PostgreSQL migration Temporal workflow"
    )
    parser.add_argument(
        "--workflow-id",
        dest="workflow_id",
        help="Optional deterministic workflow ID override",
    )
    parser.add_argument(
        "--migration-id",
        dest="migration_id",
        help="Optional migration id label used in reports",
    )
    parser.add_argument(
        "--payload-json",
        dest="payload_json",
        help="Optional JSON payload. If omitted, payload is read from stdin.",
    )
    parser.add_argument(
        "--dry-run",
        dest="dry_run",
        action="store_true",
        help="Force dry-run mode (default behavior when payload is omitted).",
    )
    parser.add_argument(
        "--resume-from",
        dest="resume_from",
        choices=["extract", "transform", "load", "validate"],
        help="Optional resume checkpoint stage.",
    )
    parser.add_argument(
        "--source-path",
        dest="source_path",
        help="Optional source file path (JSON/CSV), relative to repo_root.",
    )
    parser.add_argument(
        "--source-format",
        dest="source_format",
        choices=["json", "csv"],
        help="Optional explicit source format override for --source-path.",
    )
    parser.add_argument(
        "--source-mode",
        dest="source_mode",
        choices=["inline", "file", "connector"],
        help="Source ingest mode. Defaults by available flags (connector > file > inline).",
    )
    parser.add_argument(
        "--connector-endpoint",
        dest="connector_endpoint",
        help="Connector endpoint URL (https://...) for connector mode.",
    )
    parser.add_argument(
        "--connector-token-env",
        dest="connector_token_env",
        help="Environment variable name containing connector token.",
    )
    parser.add_argument(
        "--connector-use-mock",
        dest="connector_use_mock",
        action="store_true",
        help="Use mock connector records for this slice.",
    )
    parser.add_argument(
        "--connector-live",
        dest="connector_live",
        action="store_true",
        help="Enable live connector HTTP fetch mode (disables mock records).",
    )
    parser.add_argument(
        "--connector-allow-http",
        dest="connector_allow_http",
        action="store_true",
        help="Allow non-HTTPS connector endpoint for local development only.",
    )
    parser.add_argument(
        "--connector-timeout-seconds",
        dest="connector_timeout_seconds",
        type=int,
        default=10,
        help="Connector HTTP timeout in seconds (default: 10).",
    )
    parser.add_argument(
        "--connector-mock-path",
        dest="connector_mock_path",
        help="Optional JSON file containing connector mock records array or {records:[...]} object.",
    )
    return parser.parse_args()


def _default_payload() -> dict[str, Any]:
    return {
        "dry_run": True,
        "repo_root": ".",
        "output_dir": "screehshots_evidence",
        "sample_verify_count": 2,
        "source": {
            "system": "mendix_stub",
            "records": [
                {
                    "source_id": "mx-001",
                    "full_name": "Alex Rivera",
                    "email": "alex.rivera@example.com",
                    "created_at": "2026-01-15T10:00:00Z",
                    "active": True,
                },
                {
                    "source_id": "mx-002",
                    "full_name": "Sam Jordan",
                    "email": "sam.jordan@example.com",
                    "created_at": "2026-01-20T12:30:00Z",
                    "active": True,
                },
            ],
        },
    }


def load_payload(args: argparse.Namespace) -> dict[str, Any]:
    raw_payload = args.payload_json
    if not raw_payload:
        raw_payload = sys.stdin.read()

    if raw_payload and raw_payload.strip():
        payload = json.loads(raw_payload)
        if not isinstance(payload, dict):
            raise ValueError("Payload must be a JSON object")
    else:
        payload = _default_payload()

    if args.dry_run:
        payload["dry_run"] = True
    else:
        payload.setdefault("dry_run", True)

    payload.setdefault("repo_root", ".")
    payload.setdefault("output_dir", "screehshots_evidence")
    payload.setdefault("sample_verify_count", 2)
    if args.resume_from:
        payload["resume_from_checkpoint"] = args.resume_from
    if args.migration_id:
        payload["migration_id"] = args.migration_id
    if args.source_path:
        payload["source_path"] = args.source_path
        if args.source_format:
            payload["source_format"] = args.source_format

    mode = args.source_mode
    if not mode:
        if args.connector_endpoint or args.connector_mock_path:
            mode = "connector"
        elif args.source_path:
            mode = "file"
        else:
            mode = "inline"
    payload["source_mode"] = mode

    if mode == "connector":
        use_mock = not args.connector_live
        if args.connector_use_mock:
            use_mock = True
        connector: dict[str, Any] = {
            "endpoint": args.connector_endpoint or "https://mock.mendix.local/api/v1/records",
            "token_env": args.connector_token_env or "MENDIX_CONNECTOR_TOKEN",
            "use_mock": use_mock,
            "allow_http": bool(args.connector_allow_http),
            "timeout_seconds": max(1, int(args.connector_timeout_seconds)),
        }
        if args.connector_mock_path:
            raw = Path(args.connector_mock_path).read_text(encoding="utf-8")
            parsed = json.loads(raw)
            if isinstance(parsed, dict):
                records = parsed.get("records")
                connector["mock_records"] = records if isinstance(records, list) else []
            elif isinstance(parsed, list):
                connector["mock_records"] = parsed
            else:
                connector["mock_records"] = []
        payload["source_connector"] = connector

    return payload


async def main() -> None:
    args = parse_args()
    payload = load_payload(args)
    migration_id = str(
        payload.get("migration_id")
        or args.migration_id
        or f"migration-{uuid.uuid4().hex[:8]}"
    )
    payload.setdefault("migration_id", migration_id)

    workflow_id = args.workflow_id or f"ari-migration-{migration_id}-{uuid.uuid4().hex[:8]}"
    client = await Client.connect("localhost:7233", namespace=NAMESPACE)

    result = await client.execute_workflow(
        WORKFLOW_NAME,
        payload,
        id=workflow_id,
        task_queue=TASK_QUEUE,
    )
    print(json.dumps({"workflow_id": workflow_id, "result": result}))


if __name__ == "__main__":
    asyncio.run(main())
