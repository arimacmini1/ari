import argparse
import asyncio
from datetime import datetime, timezone
import json
from pathlib import Path
import re
import subprocess
import sys
import uuid
from typing import Any

from temporalio.client import Client

WORKFLOW_NAME = "DogfoodB1B8Workflow"
TASK_QUEUE = "ari-smoke"
NAMESPACE = "default"
DEFAULT_NEXT_STEP_STATE = "docs/Ari-v3.0/process/dogfood-next-step-state.json"
BLOCK_SEQUENCE = ["B1", "B2", "B3", "B4", "B5", "B6", "B7", "B8"]


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
    start_parser.add_argument(
        "--head-sha",
        dest="head_sha",
        help="Optional current head SHA for deterministic review state checks",
    )
    start_parser.add_argument(
        "--max-remediation-rounds",
        dest="max_remediation_rounds",
        type=int,
        default=2,
        help="Maximum remediation rounds when PR loop is enabled (default: 2)",
    )
    start_parser.add_argument(
        "--required-check",
        dest="required_checks",
        action="append",
        default=[],
        help="Required check id; can be repeated",
    )
    start_parser.add_argument(
        "--enable-pr-loop",
        dest="enable_pr_loop",
        action="store_true",
        help="Enable deterministic PR sub-loop (default)",
    )
    start_parser.add_argument(
        "--disable-pr-loop",
        dest="disable_pr_loop",
        action="store_true",
        help="Disable deterministic PR sub-loop",
    )
    start_parser.add_argument(
        "--enable-remediation",
        dest="enable_remediation",
        action="store_true",
        help="Enable remediation loop when review findings are actionable",
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

    rerun_parser = subparsers.add_parser(
        "rerun", help="Start a new deterministic rerun linked to a previous workflow"
    )
    rerun_parser.add_argument("--workflow-id", dest="workflow_id", required=True)
    rerun_parser.add_argument("--head-sha", dest="head_sha")
    rerun_parser.add_argument(
        "--max-remediation-rounds",
        dest="max_remediation_rounds",
        type=int,
        default=2,
    )
    rerun_parser.add_argument(
        "--required-check",
        dest="required_checks",
        action="append",
        default=[],
    )
    rerun_parser.add_argument(
        "--enable-remediation",
        dest="enable_remediation",
        action="store_true",
    )

    next_step_parser = subparsers.add_parser(
        "next-step",
        aliases=["start-next-step"],
        help="Advance exactly one dogfood block using persisted session state",
    )
    next_step_parser.add_argument(
        "--task-id",
        dest="task_id",
        help="Roadmap task ID (required first run, then persisted)",
    )
    next_step_parser.add_argument(
        "--workflow-id",
        dest="workflow_id",
        help="Optional workflow id override; otherwise restored from state",
    )
    next_step_parser.add_argument(
        "--state-file",
        dest="state_file",
        default=DEFAULT_NEXT_STEP_STATE,
        help=f"State file path (default: {DEFAULT_NEXT_STEP_STATE})",
    )
    next_step_parser.add_argument(
        "--head-sha",
        dest="head_sha",
        help="Optional current head SHA for deterministic review state checks",
    )
    next_step_parser.add_argument(
        "--max-remediation-rounds",
        dest="max_remediation_rounds",
        type=int,
        default=2,
    )
    next_step_parser.add_argument(
        "--required-check",
        dest="required_checks",
        action="append",
        default=[],
    )
    next_step_parser.add_argument(
        "--enable-pr-loop",
        dest="enable_pr_loop",
        action="store_true",
    )
    next_step_parser.add_argument(
        "--disable-pr-loop",
        dest="disable_pr_loop",
        action="store_true",
    )
    next_step_parser.add_argument(
        "--enable-remediation",
        dest="enable_remediation",
        action="store_true",
    )
    next_step_parser.add_argument(
        "--wait-seconds",
        dest="wait_seconds",
        type=int,
        default=120,
        help="How long to wait for the block to complete after signal",
    )
    next_step_parser.add_argument(
        "--poll-interval",
        dest="poll_interval",
        type=float,
        default=1.0,
        help="Polling interval in seconds while waiting for completion",
    )

    return parser.parse_args()


def _current_head_sha() -> str:
    try:
        return (
            subprocess.check_output(["git", "rev-parse", "HEAD"], text=True, stderr=subprocess.DEVNULL)
            .strip()
        )
    except Exception:
        return ""


def _merge_pr_loop_payload(payload: dict[str, Any], args: argparse.Namespace) -> dict[str, Any]:
    pr_loop = payload.get("pr_loop")
    if not isinstance(pr_loop, dict):
        pr_loop = {}

    enabled = True
    if getattr(args, "disable_pr_loop", False):
        enabled = False
    elif getattr(args, "enable_pr_loop", False):
        enabled = True
    elif "enabled" in pr_loop:
        enabled = bool(pr_loop.get("enabled"))

    pr_loop["enabled"] = enabled
    pr_loop["head_sha"] = getattr(args, "head_sha", None) or pr_loop.get("head_sha") or _current_head_sha()
    pr_loop["max_remediation_rounds"] = max(
        0, int(getattr(args, "max_remediation_rounds", pr_loop.get("max_remediation_rounds", 2)))
    )
    pr_loop["required_checks"] = [
        c for c in (getattr(args, "required_checks", None) or pr_loop.get("required_checks", [])) if c
    ]
    pr_loop["enable_remediation"] = bool(
        getattr(args, "enable_remediation", False) or pr_loop.get("enable_remediation", False)
    )

    payload["pr_loop"] = pr_loop
    return payload


def _slugify(value: str) -> str:
    cleaned = re.sub(r"[^a-zA-Z0-9]+", "-", value.strip().lower()).strip("-")
    return cleaned or "dogfood"


def _load_state(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {}
    try:
        loaded = json.loads(path.read_text())
    except Exception:
        return {}
    return loaded if isinstance(loaded, dict) else {}


def _save_state(path: Path, state: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(state, indent=2, sort_keys=True) + "\n")


def _is_terminal_status(status: str) -> bool:
    return status in {"complete", "failed", "terminated"}


def _completed_blocks(history: list[Any]) -> list[str]:
    out: list[str] = []
    for event in history:
        if not isinstance(event, dict):
            continue
        block = str(event.get("block") or "")
        event_status = str(event.get("status") or "")
        if block in BLOCK_SEQUENCE and event_status == "completed":
            out.append(block)
    return out


def _latest_completed_block(history: list[Any]) -> str:
    blocks = _completed_blocks(history)
    return blocks[-1] if blocks else ""


async def _query_status(client: Client, workflow_id: str) -> dict[str, Any] | None:
    try:
        handle = client.get_workflow_handle(workflow_id)
        status = await handle.query("get_status")
        return status if isinstance(status, dict) else None
    except Exception:
        return None


def load_start_payload(args: argparse.Namespace) -> dict[str, Any]:
    raw_payload = args.payload_json
    if not raw_payload:
        raw_payload = sys.stdin.read()

    if raw_payload and raw_payload.strip():
        payload = json.loads(raw_payload)
        if not isinstance(payload, dict):
            raise ValueError("Payload must be a JSON object")
        return _merge_pr_loop_payload(payload, args)

    return _merge_pr_loop_payload({"block_inputs": {}}, args)


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


async def run_rerun(client: Client, args: argparse.Namespace) -> None:
    payload: dict[str, Any] = {"block_inputs": {}, "rerun_of_workflow_id": args.workflow_id}
    payload = _merge_pr_loop_payload(payload, args)
    new_workflow_id = f"{args.workflow_id}-rerun-{uuid.uuid4().hex[:8]}"

    handle = await client.start_workflow(
        WORKFLOW_NAME,
        payload,
        id=new_workflow_id,
        task_queue=TASK_QUEUE,
    )

    print(
        json.dumps(
            {
                "status": "started",
                "workflow_id": new_workflow_id,
                "run_id": handle.result_run_id,
                "rerun_of_workflow_id": args.workflow_id,
                "pr_loop": payload.get("pr_loop", {}),
            }
        )
    )


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


async def run_next_step(client: Client, args: argparse.Namespace) -> None:
    state_path = Path(args.state_file).resolve()
    prior_state = _load_state(state_path)
    task_id = str(args.task_id or prior_state.get("task_id") or "").strip()
    workflow_id = str(args.workflow_id or prior_state.get("workflow_id") or "").strip()

    created_workflow = False
    run_id: str | None = None

    status: dict[str, Any] | None = None
    if workflow_id:
        status = await _query_status(client, workflow_id)
        if status and _is_terminal_status(str(status.get("status", ""))):
            workflow_id = ""
            status = None

    if not workflow_id:
        if not task_id:
            raise ValueError("Task id is required on first run: pass --task-id <TXX-MH-YY>")
        workflow_id = f"ari-dogfood-{_slugify(task_id)}"
        payload = _merge_pr_loop_payload({"block_inputs": {}, "step_mode": True, "task_id": task_id}, args)
        handle = await client.start_workflow(
            WORKFLOW_NAME,
            payload,
            id=workflow_id,
            task_queue=TASK_QUEUE,
        )
        created_workflow = True
        run_id = handle.result_run_id
        status = await _query_status(client, workflow_id)

    if not status:
        raise RuntimeError(f"Unable to query workflow status for {workflow_id}")

    history_before = status.get("history", [])
    before_len = len(history_before) if isinstance(history_before, list) else 0

    handle = client.get_workflow_handle(workflow_id)
    await handle.signal("advance_step", f"next-step:{task_id or 'unknown'}")

    wait_seconds = max(5, int(args.wait_seconds or 120))
    poll_interval = max(0.25, float(args.poll_interval or 1.0))
    deadline = asyncio.get_running_loop().time() + wait_seconds
    latest_status = status

    while True:
        polled = await _query_status(client, workflow_id)
        if not polled:
            raise RuntimeError(f"Workflow status unavailable while waiting: {workflow_id}")
        latest_status = polled
        history = polled.get("history", [])
        history_len = len(history) if isinstance(history, list) else 0
        workflow_status = str(polled.get("status", ""))
        if history_len > before_len and (
            workflow_status in {"waiting_for_advance", "waiting_for_approval", "complete", "failed"}
        ):
            break
        if asyncio.get_running_loop().time() >= deadline:
            break
        await asyncio.sleep(poll_interval)

    latest_history = latest_status.get("history", [])
    if not isinstance(latest_history, list):
        latest_history = []
    delta_events = latest_history[before_len:]
    completed = _completed_blocks(latest_history)
    last_completed = _latest_completed_block(latest_history)

    state = {
        "version": "1",
        "task_id": task_id,
        "workflow_id": workflow_id,
        "current_block": latest_status.get("current_block", "unknown"),
        "workflow_status": latest_status.get("status", "unknown"),
        "last_completed_block": last_completed,
        "completed_blocks": completed,
        "history_length": len(latest_history),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    _save_state(state_path, state)

    print(
        json.dumps(
            {
                "status": "advanced",
                "task_id": task_id,
                "workflow_id": workflow_id,
                "run_id": run_id,
                "created_workflow": created_workflow,
                "state_file": str(state_path),
                "workflow_status": latest_status.get("status"),
                "current_block": latest_status.get("current_block"),
                "last_completed_block": last_completed or None,
                "completed_blocks": completed,
                "delta_event_count": len(delta_events),
                "delta_events": delta_events,
            }
        )
    )


async def main() -> None:
    args = parse_args()
    client = await Client.connect("localhost:7233", namespace=NAMESPACE)

    if args.command == "start":
        await run_start(client, args)
    elif args.command == "rerun":
        await run_rerun(client, args)
    elif args.command == "status":
        await run_status(client, args)
    elif args.command == "approve":
        await run_approve(client, args)
    elif args.command == "terminate":
        await run_terminate(client, args)
    elif args.command == "next-step" or args.command == "start-next-step":
        await run_next_step(client, args)
    else:
        raise ValueError(f"Unsupported command: {args.command}")


if __name__ == "__main__":
    asyncio.run(main())
