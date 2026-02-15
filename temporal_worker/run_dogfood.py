import argparse
import asyncio
import json
import sys
import uuid
from typing import Any

from temporalio.client import Client

WORKFLOW_NAME = "DogfoodB1B8Workflow"
TASK_QUEUE = "ari-smoke"
NAMESPACE = "default"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Run or control Dogfood B1-B8 Temporal workflow"
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    start_parser = subparsers.add_parser("start", help="Start a dogfood workflow")
    start_parser.add_argument(
        "--workflow-id",
        dest="workflow_id",
        help="Optional deterministic workflow ID override",
    )
    start_parser.add_argument(
        "--payload-json",
        dest="payload_json",
        help="Optional JSON payload; if omitted, payload is read from stdin",
    )
    start_parser.add_argument(
        "--wait",
        action="store_true",
        help="Wait for completion and print final result",
    )

    status_parser = subparsers.add_parser("status", help="Query workflow status")
    status_parser.add_argument("--workflow-id", dest="workflow_id", required=True)

    approve_parser = subparsers.add_parser(
        "approve", help="Signal approval gate to resume"
    )
    approve_parser.add_argument("--workflow-id", dest="workflow_id", required=True)
    approve_parser.add_argument(
        "--note",
        dest="note",
        default="manual-approval",
        help="Optional approval note",
    )

    terminate_parser = subparsers.add_parser(
        "terminate", help="Terminate a workflow run"
    )
    terminate_parser.add_argument("--workflow-id", dest="workflow_id", required=True)
    terminate_parser.add_argument(
        "--reason",
        dest="reason",
        default="manual-termination",
        help="Optional termination reason",
    )

    return parser.parse_args()


def load_start_payload(args: argparse.Namespace) -> dict[str, Any]:
    raw_payload = args.payload_json
    if not raw_payload:
        raw_payload = sys.stdin.read()

    if raw_payload and raw_payload.strip():
        payload = json.loads(raw_payload)
        if not isinstance(payload, dict):
            raise ValueError("Payload must be a JSON object")
        return payload

    return {"block_inputs": {}}


async def run_start(client: Client, args: argparse.Namespace) -> None:
    payload = load_start_payload(args)
    workflow_id = args.workflow_id or f"ari-dogfood-{uuid.uuid4().hex[:10]}"

    handle = await client.start_workflow(
        WORKFLOW_NAME,
        payload,
        id=workflow_id,
        task_queue=TASK_QUEUE,
    )

    response: dict[str, Any] = {
        "workflow_id": workflow_id,
        "run_id": handle.result_run_id,
        "status": "started",
        "wait": bool(args.wait),
    }

    if args.wait:
        result = await handle.result()
        response["status"] = "complete"
        response["result"] = result

    print(json.dumps(response))


async def run_status(client: Client, args: argparse.Namespace) -> None:
    handle = client.get_workflow_handle(args.workflow_id)
    status = await handle.query("get_status")
    print(json.dumps({"workflow_id": args.workflow_id, "status": status}))


async def run_approve(client: Client, args: argparse.Namespace) -> None:
    handle = client.get_workflow_handle(args.workflow_id)
    await handle.signal("approve_resume", args.note)
    print(
        json.dumps(
            {
                "workflow_id": args.workflow_id,
                "status": "approval_signal_sent",
                "note": args.note,
            }
        )
    )


async def run_terminate(client: Client, args: argparse.Namespace) -> None:
    handle = client.get_workflow_handle(args.workflow_id)
    await handle.terminate(args.reason)
    print(
        json.dumps(
            {
                "workflow_id": args.workflow_id,
                "status": "terminated",
                "reason": args.reason,
            }
        )
    )


async def main() -> None:
    args = parse_args()
    client = await Client.connect("localhost:7233", namespace=NAMESPACE)

    if args.command == "start":
        await run_start(client, args)
    elif args.command == "status":
        await run_status(client, args)
    elif args.command == "approve":
        await run_approve(client, args)
    elif args.command == "terminate":
        await run_terminate(client, args)
    else:
        raise ValueError(f"Unsupported command: {args.command}")


if __name__ == "__main__":
    asyncio.run(main())
