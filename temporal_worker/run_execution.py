import argparse
import asyncio
import json
import sys
import uuid
from typing import Any

from temporalio.client import Client


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Run Temporal execution workflow for AEI execution pipeline"
    )
    parser.add_argument(
        "--workflow-id",
        dest="workflow_id",
        help="Optional deterministic workflow ID override",
    )
    parser.add_argument(
        "--payload-json",
        dest="payload_json",
        help="Optional JSON payload. If omitted, payload is read from stdin.",
    )
    return parser.parse_args()


def load_payload(args: argparse.Namespace) -> dict[str, Any]:
    raw_payload = args.payload_json
    if not raw_payload:
        raw_payload = sys.stdin.read()
    if not raw_payload or not raw_payload.strip():
        raise ValueError("Missing payload JSON input")
    payload = json.loads(raw_payload)
    if not isinstance(payload, dict):
        raise ValueError("Payload must be a JSON object")
    if "execution_id" not in payload:
        raise ValueError("Payload must include execution_id")
    if "assignment_plan" not in payload:
        raise ValueError("Payload must include assignment_plan")
    return payload


async def main() -> None:
    args = parse_args()
    payload = load_payload(args)
    default_id = f"ari-exec-{payload['execution_id']}-{uuid.uuid4().hex[:8]}"
    workflow_id = args.workflow_id or default_id

    client = await Client.connect("localhost:7233", namespace="default")
    result = await client.execute_workflow(
        "ExecutionWorkflow",
        payload,
        id=workflow_id,
        task_queue="ari-smoke",
    )
    print(json.dumps({"workflow_id": workflow_id, "result": result}))


if __name__ == "__main__":
    asyncio.run(main())
