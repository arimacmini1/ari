import argparse
import asyncio
from dataclasses import fields, is_dataclass
from datetime import date, datetime, time, timedelta
import inspect
import json
import sys
import uuid
from typing import Any

from temporalio.client import (
    Client,
    Schedule,
    ScheduleActionStartWorkflow,
    ScheduleIntervalSpec,
    ScheduleSpec,
)

WORKFLOW_NAME = "SelfBootstrapWorkflow"
TASK_QUEUE = "ari-smoke"
NAMESPACE = "default"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Run or control SelfBootstrap Temporal workflow"
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    start_parser = subparsers.add_parser("start", help="Start a self-bootstrap workflow")
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
    start_parser.add_argument(
        "--roadmap-task-id",
        dest="roadmap_task_id",
        help="Optional roadmap task id label (e.g. P2-MH-10)",
    )

    status_parser = subparsers.add_parser("status", help="Query workflow status")
    status_parser.add_argument("--workflow-id", dest="workflow_id", required=True)

    approve_parser = subparsers.add_parser("approve", help="Signal approval gate")
    approve_parser.add_argument("--workflow-id", dest="workflow_id", required=True)
    approve_parser.add_argument(
        "--note",
        dest="note",
        default="manual-approval",
        help="Optional approval note",
    )

    docs_parity_parser = subparsers.add_parser(
        "docs-parity", help="Provide docs parity evidence gate"
    )
    docs_parity_parser.add_argument("--workflow-id", dest="workflow_id", required=True)
    docs_parity_parser.add_argument(
        "--evidence-path",
        dest="evidence_path",
        required=True,
        help="Path to docs parity evidence (e.g. output of npm run docs:parity)",
    )

    terminate_parser = subparsers.add_parser("terminate", help="Terminate a workflow run")
    terminate_parser.add_argument("--workflow-id", dest="workflow_id", required=True)
    terminate_parser.add_argument(
        "--reason",
        dest="reason",
        default="manual-termination",
        help="Optional termination reason",
    )

    schedule_create_parser = subparsers.add_parser(
        "schedule-create", help="Create recurring self-bootstrap trigger"
    )
    schedule_create_parser.add_argument(
        "--schedule-id",
        dest="schedule_id",
        help="Optional deterministic schedule ID override",
    )
    schedule_create_parser.add_argument(
        "--roadmap-task-id",
        dest="roadmap_task_id",
        required=True,
        help="Roadmap task id for automatic self-runs (e.g. P2-MH-10)",
    )
    schedule_create_parser.add_argument(
        "--interval-seconds",
        dest="interval_seconds",
        type=int,
        default=300,
        help="Recurring interval in seconds (default: 300)",
    )
    schedule_create_parser.add_argument(
        "--payload-json",
        dest="payload_json",
        help="Optional JSON payload merged into scheduled workflow payload",
    )
    schedule_create_parser.add_argument(
        "--trigger-immediately",
        action="store_true",
        help="Also trigger one run immediately after schedule creation",
    )

    schedule_list_parser = subparsers.add_parser(
        "schedule-list", help="List self-bootstrap schedules"
    )
    schedule_list_parser.add_argument(
        "--contains",
        dest="contains",
        default="ari-self-bootstrap",
        help="Filter schedule IDs by substring",
    )

    schedule_describe_parser = subparsers.add_parser(
        "schedule-describe", help="Describe one schedule"
    )
    schedule_describe_parser.add_argument(
        "--schedule-id", dest="schedule_id", required=True
    )

    schedule_pause_parser = subparsers.add_parser(
        "schedule-pause", help="Pause a schedule"
    )
    schedule_pause_parser.add_argument("--schedule-id", dest="schedule_id", required=True)
    schedule_pause_parser.add_argument(
        "--note",
        dest="note",
        default="manual-pause",
        help="Optional pause note",
    )

    schedule_unpause_parser = subparsers.add_parser(
        "schedule-unpause", help="Unpause a schedule"
    )
    schedule_unpause_parser.add_argument(
        "--schedule-id", dest="schedule_id", required=True
    )
    schedule_unpause_parser.add_argument(
        "--note",
        dest="note",
        default="manual-unpause",
        help="Optional unpause note",
    )

    schedule_trigger_parser = subparsers.add_parser(
        "schedule-trigger", help="Trigger a schedule immediately"
    )
    schedule_trigger_parser.add_argument(
        "--schedule-id", dest="schedule_id", required=True
    )

    schedule_delete_parser = subparsers.add_parser(
        "schedule-delete", help="Delete a schedule"
    )
    schedule_delete_parser.add_argument(
        "--schedule-id", dest="schedule_id", required=True
    )

    return parser.parse_args()


def _to_jsonable(value: Any) -> Any:
    if is_dataclass(value):
        serialized: dict[str, Any] = {}
        for field in fields(value):
            serialized[field.name] = _to_jsonable(getattr(value, field.name))
        return serialized
    if isinstance(value, dict):
        return {str(key): _to_jsonable(item) for key, item in value.items()}
    if isinstance(value, (list, tuple, set)):
        return [_to_jsonable(item) for item in value]
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, date):
        return value.isoformat()
    if isinstance(value, time):
        return value.isoformat()
    if isinstance(value, timedelta):
        return int(value.total_seconds())
    if isinstance(value, (str, int, float, bool)) or value is None:
        return value
    return repr(value)


def load_payload_base(args: argparse.Namespace) -> dict[str, Any]:
    raw_payload = args.payload_json
    if not raw_payload:
        raw_payload = sys.stdin.read()

    if raw_payload and raw_payload.strip():
        payload = json.loads(raw_payload)
        if not isinstance(payload, dict):
            raise ValueError("Payload must be a JSON object")
    else:
        payload = {}

    payload.setdefault("repo_root", ".")
    payload.setdefault("output_dir", "screehshots_evidence")
    roadmap_task_id = getattr(args, "roadmap_task_id", None)
    if roadmap_task_id:
        payload.setdefault("roadmap_task_id", roadmap_task_id)
    return payload


async def run_start(client: Client, args: argparse.Namespace) -> None:
    workflow_id = args.workflow_id or f"ari-self-bootstrap-{uuid.uuid4().hex[:10]}"
    payload = load_payload_base(args)
    payload.setdefault("workflow_id", workflow_id)

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


async def run_docs_parity(client: Client, args: argparse.Namespace) -> None:
    handle = client.get_workflow_handle(args.workflow_id)
    await handle.signal("provide_docs_parity", args.evidence_path)
    print(
        json.dumps(
            {
                "workflow_id": args.workflow_id,
                "status": "docs_parity_signal_sent",
                "evidence_path": args.evidence_path,
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


async def run_schedule_create(client: Client, args: argparse.Namespace) -> None:
    schedule_id = args.schedule_id or f"ari-self-bootstrap-schedule-{uuid.uuid4().hex[:10]}"
    workflow_start_id = f"{schedule_id}-workflow"
    interval_seconds = max(60, int(args.interval_seconds))
    payload = load_payload_base(args)
    payload.setdefault("continuous_mode", True)

    schedule = Schedule(
        action=ScheduleActionStartWorkflow(
            WORKFLOW_NAME,
            payload,
            id=workflow_start_id,
            task_queue=TASK_QUEUE,
            memo={
                "source": "self-bootstrap-schedule",
                "roadmap_task_id": args.roadmap_task_id,
            },
        ),
        spec=ScheduleSpec(
            intervals=[ScheduleIntervalSpec(every=timedelta(seconds=interval_seconds))]
        ),
    )
    await client.create_schedule(
        schedule_id,
        schedule,
        trigger_immediately=bool(args.trigger_immediately),
        memo={
            "kind": "self-bootstrap-continuous",
            "roadmap_task_id": args.roadmap_task_id,
            "workflow_name": WORKFLOW_NAME,
            "task_queue": TASK_QUEUE,
        },
    )
    print(
        json.dumps(
            {
                "schedule_id": schedule_id,
                "status": "created",
                "workflow": WORKFLOW_NAME,
                "workflow_start_id": workflow_start_id,
                "interval_seconds": interval_seconds,
                "roadmap_task_id": args.roadmap_task_id,
                "trigger_immediately": bool(args.trigger_immediately),
            }
        )
    )


async def run_schedule_list(client: Client, args: argparse.Namespace) -> None:
    contains = args.contains or ""
    schedules: list[dict[str, Any]] = []
    iterator = await client.list_schedules()
    async for entry in iterator:
        schedule_id = str(getattr(entry, "id", ""))
        if contains and contains not in schedule_id:
            continue
        memo_attr = getattr(entry, "memo", None)
        memo_value = memo_attr() if callable(memo_attr) else memo_attr
        if inspect.isawaitable(memo_value):
            memo_value = await memo_value
        search_attr = getattr(entry, "search_attributes", None)
        search_value = search_attr() if callable(search_attr) else search_attr
        if inspect.isawaitable(search_value):
            search_value = await search_value
        info = getattr(entry, "info", None)
        recent_actions = getattr(info, "recent_actions", []) if info else []
        recent_workflow_ids = []
        for action in recent_actions:
            action_exec = getattr(action, "action", None)
            workflow_id = getattr(action_exec, "workflow_id", None)
            if workflow_id:
                recent_workflow_ids.append(str(workflow_id))
        schedules.append(
            {
                "schedule_id": schedule_id,
                "memo": _to_jsonable(memo_value),
                "search_attributes": _to_jsonable(search_value),
                "recent_workflow_ids": recent_workflow_ids,
                "next_action_times": _to_jsonable(
                    getattr(info, "next_action_times", []) if info else []
                ),
            }
        )
    print(
        json.dumps(
            {
                "contains": contains,
                "count": len(schedules),
                "schedules": schedules,
            }
        )
    )


async def run_schedule_describe(client: Client, args: argparse.Namespace) -> None:
    handle = client.get_schedule_handle(args.schedule_id)
    description = await handle.describe()
    print(
        json.dumps(
            {
                "schedule_id": args.schedule_id,
                "description": _to_jsonable(description),
            }
        )
    )


async def run_schedule_pause(client: Client, args: argparse.Namespace) -> None:
    handle = client.get_schedule_handle(args.schedule_id)
    await handle.pause(note=args.note)
    print(
        json.dumps(
            {
                "schedule_id": args.schedule_id,
                "status": "paused",
                "note": args.note,
            }
        )
    )


async def run_schedule_unpause(client: Client, args: argparse.Namespace) -> None:
    handle = client.get_schedule_handle(args.schedule_id)
    await handle.unpause(note=args.note)
    print(
        json.dumps(
            {
                "schedule_id": args.schedule_id,
                "status": "unpaused",
                "note": args.note,
            }
        )
    )


async def run_schedule_trigger(client: Client, args: argparse.Namespace) -> None:
    handle = client.get_schedule_handle(args.schedule_id)
    await handle.trigger()
    print(
        json.dumps(
            {
                "schedule_id": args.schedule_id,
                "status": "triggered",
            }
        )
    )


async def run_schedule_delete(client: Client, args: argparse.Namespace) -> None:
    handle = client.get_schedule_handle(args.schedule_id)
    await handle.delete()
    print(
        json.dumps(
            {
                "schedule_id": args.schedule_id,
                "status": "deleted",
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
    elif args.command == "docs-parity":
        await run_docs_parity(client, args)
    elif args.command == "terminate":
        await run_terminate(client, args)
    elif args.command == "schedule-create":
        await run_schedule_create(client, args)
    elif args.command == "schedule-list":
        await run_schedule_list(client, args)
    elif args.command == "schedule-describe":
        await run_schedule_describe(client, args)
    elif args.command == "schedule-pause":
        await run_schedule_pause(client, args)
    elif args.command == "schedule-unpause":
        await run_schedule_unpause(client, args)
    elif args.command == "schedule-trigger":
        await run_schedule_trigger(client, args)
    elif args.command == "schedule-delete":
        await run_schedule_delete(client, args)
    else:
        raise ValueError(f"Unsupported command: {args.command}")


if __name__ == "__main__":
    asyncio.run(main())
