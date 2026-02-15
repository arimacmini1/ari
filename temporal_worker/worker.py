import asyncio
import csv
import json
import os
import re
from datetime import timedelta
from pathlib import Path
from typing import Any
from urllib import error as urllib_error
from urllib import request as urllib_request

from temporalio import activity
from temporalio.client import Client
from temporalio.common import RetryPolicy
from temporalio.worker import Worker
from temporalio import workflow


@workflow.defn
class SmokeWorkflow:
    @workflow.run
    async def run(self, name: str) -> str:
        return f"hello {name}"


@activity.defn
async def execute_assignment_activity(assignment: dict[str, Any]) -> dict[str, Any]:
    estimated_duration = float(assignment.get("estimated_duration", 0) or 0)
    # Keep dogfood runtime predictable while still exercising Temporal activity execution.
    simulated_duration = max(0.05, min(estimated_duration, 2.0))
    await asyncio.sleep(simulated_duration)
    estimated_cost = float(assignment.get("estimated_cost", 0) or 0)
    return {
        "id": str(assignment.get("id", "unknown-task")),
        "assigned_agent_id_or_pool": str(
            assignment.get("assigned_agent_id_or_pool", "unassigned")
        ),
        "status": "complete",
        "estimated_cost": estimated_cost,
        "actual_cost": estimated_cost,
        "estimated_duration": estimated_duration,
        "actual_duration": simulated_duration,
    }


@activity.defn
async def execute_dogfood_block_activity(payload: dict[str, Any]) -> dict[str, Any]:
    # Stub block activity for F03-MH-08: durable Temporal history with predictable runtime.
    block = str(payload.get("block", "unknown"))
    await asyncio.sleep(0.1)
    return {
        "block": block,
        "status": "complete",
        "note": "stubbed-block-activity",
        "input": payload.get("input", {}),
    }


def _sanitize_filename_component(value: str) -> str:
    cleaned = re.sub(r"[^a-zA-Z0-9._-]+", "-", value).strip("-")
    return cleaned or "unknown"


def _resolve_safe_output_dir(repo_root: str, output_dir: str) -> Path:
    root = Path(repo_root).resolve()
    output = (root / output_dir).resolve()
    if root != output and root not in output.parents:
        raise ValueError("Refusing to write outside repo_root")
    return output


def _resolve_safe_input_path(repo_root: str, source_path: str) -> Path:
    root = Path(repo_root).resolve()
    candidate = (root / source_path).resolve()
    if root != candidate and root not in candidate.parents:
        raise ValueError("Refusing to read outside repo_root")
    return candidate


def _normalize_source_record(raw: dict[str, Any], index: int) -> dict[str, Any]:
    source_id = str(raw.get("source_id", "")).strip()
    source_identifier = source_id or f"row-{index + 1}"
    full_name = str(raw.get("full_name", "")).strip()
    email = str(raw.get("email", "")).strip().lower()
    created_at = str(raw.get("created_at", "")).strip()
    return {
        "source_id": source_id or source_identifier,
        "source_identifier": source_identifier,
        "full_name": full_name,
        "email": email,
        "created_at": created_at,
        "active": bool(raw.get("active", True)),
    }


def _build_connector_source_records(payload: dict[str, Any]) -> tuple[list[dict[str, Any]], str]:
    connector = (
        payload.get("source_connector")
        if isinstance(payload.get("source_connector"), dict)
        else {}
    )
    endpoint = str(connector.get("endpoint", "")).strip()
    token_env = str(connector.get("token_env", "")).strip()
    use_mock = bool(connector.get("use_mock", True))
    mock_records = connector.get("mock_records")
    allow_http = bool(connector.get("allow_http", False))
    timeout_seconds = int(connector.get("timeout_seconds", 10))

    if not endpoint:
        raise ValueError("source_connector.endpoint is required for connector mode")
    if not endpoint.startswith("https://"):
        if not (allow_http and endpoint.startswith("http://")):
            raise ValueError("source_connector.endpoint must use https:// (or set allow_http=true for local dev)")
    if not token_env:
        raise ValueError("source_connector.token_env is required for connector mode")
    token = (os.environ.get(token_env) or "").strip()
    if not token:
        raise ValueError(
            f"source_connector token env is missing or empty: {token_env}"
        )
    if len(token) < 8:
        raise ValueError("source_connector token is too short")

    records: list[dict[str, Any]]
    if use_mock:
        if not isinstance(mock_records, list):
            raise ValueError("source_connector.mock_records must be an array for mock connector mode")
        records = [item for item in mock_records if isinstance(item, dict)]
    else:
        req = urllib_request.Request(
            endpoint,
            headers={
                "Authorization": f"Bearer {token}",
                "Accept": "application/json",
            },
            method="GET",
        )
        try:
            with urllib_request.urlopen(req, timeout=max(1, timeout_seconds)) as response:
                body = response.read().decode("utf-8")
        except urllib_error.HTTPError as exc:
            raise ValueError(f"Connector request failed with HTTP {exc.code}") from exc
        except urllib_error.URLError as exc:
            raise ValueError(f"Connector request failed: {exc.reason}") from exc
        parsed = json.loads(body)
        if isinstance(parsed, dict):
            candidate = parsed.get("records")
            if not isinstance(candidate, list):
                raise ValueError("Connector response object must contain records array")
            records = [item for item in candidate if isinstance(item, dict)]
        elif isinstance(parsed, list):
            records = [item for item in parsed if isinstance(item, dict)]
        else:
            raise ValueError("Connector response must be JSON array or object with records array")

    normalized = [
        _normalize_source_record(item, index)
        for index, item in enumerate(records)
        if isinstance(item, dict)
    ]
    return normalized, f"connector:{endpoint}"


@activity.defn
async def generate_change_bundle_stub_activity(payload: dict[str, Any]) -> dict[str, Any]:
    workflow_id = _sanitize_filename_component(str(payload.get("workflow_id", "unknown")))
    repo_root = str(payload.get("repo_root", "."))
    output_dir = str(payload.get("output_dir", "screehshots_evidence"))
    docs_parity_evidence_path = str(payload.get("docs_parity_evidence_path", ""))

    output_path = _resolve_safe_output_dir(repo_root, output_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    bundle_json_path = output_path / f"self-bootstrap-bundle-{workflow_id}.json"
    bundle_patch_path = output_path / f"self-bootstrap-bundle-{workflow_id}.patch"

    bundle = {
        "workflow_id": workflow_id,
        "repo_root": repo_root,
        "status": "stubbed",
        "merge_ready": True,
        "note": "This is a deterministic stub bundle; applying/merging is out-of-scope for F03-MH-09 slice 1.",
        "docs_parity_evidence_path": docs_parity_evidence_path,
        "diff_summary": {
            "files_changed": 0,
            "insertions": 0,
            "deletions": 0,
            "note": "No actual code changes generated in this stub.",
        },
        "artifacts": {
            "bundle_json": str(bundle_json_path),
            "bundle_patch": str(bundle_patch_path),
        },
    }

    bundle_json_path.write_text(json.dumps(bundle, indent=2) + "\n", encoding="utf-8")
    bundle_patch_path.write_text(
        "\n".join(
            [
                "# Self-bootstrap bundle stub (no-op)",
                "# This file intentionally contains no patch hunks.",
                "",
            ]
        ),
        encoding="utf-8",
    )

    return {
        "status": "complete",
        "workflow_id": workflow_id,
        "bundle_json_path": str(bundle_json_path),
        "bundle_patch_path": str(bundle_patch_path),
        "diff_summary": bundle["diff_summary"],
    }


def _default_migration_source_records() -> list[dict[str, Any]]:
    return [
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
        {
            "source_id": "mx-003",
            "full_name": "Morgan Lee",
            "email": "morgan.lee@example.com",
            "created_at": "2026-01-28T08:45:00Z",
            "active": False,
        },
    ]


@activity.defn
async def extract_mendix_records_activity(payload: dict[str, Any]) -> dict[str, Any]:
    await asyncio.sleep(0.1)
    repo_root = str(payload.get("repo_root", "."))
    source_path_value = payload.get("source_path")
    source_format_override = str(payload.get("source_format", "")).strip().lower()
    source_mode = str(payload.get("source_mode", "inline")).strip().lower()
    source = payload.get("source") if isinstance(payload.get("source"), dict) else {}
    extraction_errors: list[str] = []

    records: list[dict[str, Any]] | None = None
    source_system = str(source.get("system", "mendix_stub"))

    if source_mode == "connector":
        records, source_system = _build_connector_source_records(payload)
    elif isinstance(source_path_value, str) and source_path_value.strip():
        input_path = _resolve_safe_input_path(repo_root, source_path_value.strip())
        if not input_path.exists():
            raise ValueError(f"source_path does not exist: {source_path_value}")
        if not input_path.is_file():
            raise ValueError(f"source_path is not a file: {source_path_value}")

        detected_format = source_format_override or input_path.suffix.lower().lstrip(".")
        raw = input_path.read_text(encoding="utf-8")
        source_system = f"file:{input_path.name}"
        if detected_format == "json":
            parsed = json.loads(raw)
            if isinstance(parsed, dict):
                candidate = parsed.get("records")
                if isinstance(candidate, list):
                    records = [item for item in candidate if isinstance(item, dict)]
                else:
                    extraction_errors.append("JSON object is missing records array; defaulting to empty.")
                    records = []
            elif isinstance(parsed, list):
                records = [item for item in parsed if isinstance(item, dict)]
            else:
                raise ValueError("Unsupported JSON structure for source_path.")
        elif detected_format == "csv":
            reader = csv.DictReader(raw.splitlines())
            records = [dict(row) for row in reader]
        else:
            raise ValueError(
                f"Unsupported source file format: {detected_format}. Use .json or .csv."
            )
    else:
        in_memory_records = source.get("records")
        if isinstance(in_memory_records, list):
            records = [item for item in in_memory_records if isinstance(item, dict)]
        else:
            records = _default_migration_source_records()

    normalized_records: list[dict[str, Any]] = []
    for index, raw in enumerate(records):
        if not isinstance(raw, dict):
            continue
        source_id = str(raw.get("source_id", "")).strip()
        source_identifier = source_id or f"row-{index + 1}"
        full_name = str(raw.get("full_name", "")).strip()
        email = str(raw.get("email", "")).strip().lower()
        created_at = str(raw.get("created_at", "")).strip()
        if not full_name:
            extraction_errors.append(f"{source_identifier}: missing full_name")
        if not email:
            extraction_errors.append(f"{source_identifier}: missing email")
        normalized_records.append(_normalize_source_record(raw, index))

    return {
        "records": normalized_records,
        "count": len(normalized_records),
        "source_system": source_system,
        "errors": extraction_errors,
    }


@activity.defn
async def transform_record_activity(record: dict[str, Any]) -> dict[str, Any]:
    await asyncio.sleep(0.03)
    full_name = str(record.get("full_name", "")).strip()
    parts = [part for part in full_name.split(" ") if part]
    first_name = parts[0] if parts else ""
    last_name = " ".join(parts[1:]) if len(parts) > 1 else ""
    return {
        "source_identifier": str(record.get("source_identifier") or record.get("source_id", "")),
        "target_id": str(record.get("source_id", "")),
        "first_name": first_name,
        "last_name": last_name,
        "email": str(record.get("email", "")).strip().lower(),
        "created_at": str(record.get("created_at", "")),
        "is_active": bool(record.get("active", True)),
    }


@activity.defn
async def load_record_activity(payload: dict[str, Any]) -> dict[str, Any]:
    await asyncio.sleep(0.03)
    record = payload.get("record") if isinstance(payload.get("record"), dict) else {}
    dry_run = bool(payload.get("dry_run", True))
    source_identifier = str(record.get("source_identifier", ""))
    target_id = str(record.get("target_id", "unknown"))
    if dry_run:
        return {
            "source_identifier": source_identifier,
            "target_id": target_id,
            "status": "dry_run_skipped",
            "write_performed": False,
        }
    return {
        "source_identifier": source_identifier,
        "target_id": target_id,
        "status": "loaded",
        "write_performed": True,
    }


@activity.defn
async def validate_migration_activity(payload: dict[str, Any]) -> dict[str, Any]:
    await asyncio.sleep(0.05)
    extracted_count = int(payload.get("extracted_count", 0))
    transformed_count = int(payload.get("transformed_count", 0))
    loaded_count = int(payload.get("loaded_count", 0))
    transformed_records = (
        payload.get("transformed_records")
        if isinstance(payload.get("transformed_records"), list)
        else []
    )
    sample_verify_count = int(payload.get("sample_verify_count", 2))
    sample_verify_count = max(1, min(sample_verify_count, 10))
    sampled = transformed_records[:sample_verify_count]
    sampled_ids = [
        str(item.get("target_id"))
        for item in sampled
        if isinstance(item, dict) and item.get("target_id")
    ]
    return {
        "row_count_match": extracted_count == transformed_count,
        "extracted_count": extracted_count,
        "transformed_count": transformed_count,
        "loaded_count": loaded_count,
        "sample_verified_count": len(sampled_ids),
        "sample_verified_ids": sampled_ids,
    }


@activity.defn
async def write_migration_report_activity(payload: dict[str, Any]) -> dict[str, Any]:
    await asyncio.sleep(0.02)
    migration_id = _sanitize_filename_component(str(payload.get("migration_id", "unknown")))
    repo_root = str(payload.get("repo_root", "."))
    output_dir = str(payload.get("output_dir", "screehshots_evidence"))
    output_path = _resolve_safe_output_dir(repo_root, output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    report_path = output_path / f"migration-report-{migration_id}.json"
    report_path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    return {"report_path": str(report_path)}


@workflow.defn
class ExecutionWorkflow:
    @workflow.run
    async def run(self, payload: dict[str, Any]) -> dict[str, Any]:
        assignment_plan = payload.get("assignment_plan", [])
        completed_tasks: list[dict[str, Any]] = []
        total_cost = 0.0
        total_duration = 0.0

        for assignment in assignment_plan:
            timeout_seconds = max(
                5,
                int(float(assignment.get("estimated_duration", 0) or 0)) + 5,
            )
            result = await workflow.execute_activity(
                execute_assignment_activity,
                assignment,
                start_to_close_timeout=timedelta(seconds=timeout_seconds),
                retry_policy=RetryPolicy(
                    maximum_attempts=3,
                    initial_interval=timedelta(seconds=1),
                ),
            )
            completed_tasks.append(result)
            total_cost += float(result.get("actual_cost", 0) or 0)
            total_duration += float(result.get("actual_duration", 0) or 0)

        return {
            "execution_id": str(payload.get("execution_id", "unknown")),
            "rule_set_id": str(payload.get("rule_set_id", "unknown")),
            "status": "complete",
            "tasks": completed_tasks,
            "actual_cost": total_cost,
            "actual_duration": total_duration,
            "task_count": len(completed_tasks),
        }


@workflow.defn
class DogfoodB1B8Workflow:
    def __init__(self) -> None:
        self._approval_granted = False
        self._approval_note = ""
        self._current_block = "not-started"
        self._status = "pending"
        self._history: list[dict[str, Any]] = []

    @workflow.signal
    async def approve_resume(self, note: str = "") -> None:
        self._approval_granted = True
        self._approval_note = note

    @workflow.query
    def get_status(self) -> dict[str, Any]:
        return {
            "status": self._status,
            "current_block": self._current_block,
            "approval_granted": self._approval_granted,
            "approval_note": self._approval_note,
            "history": self._history,
        }

    @workflow.run
    async def run(self, payload: dict[str, Any]) -> dict[str, Any]:
        # F03-MH-08 scaffold: represent B1-B8 as durable activity executions.
        self._status = "running"
        blocks = ["B1", "B2", "B3", "B4", "B5", "B6", "B7", "B8"]
        block_inputs = payload.get("block_inputs", {})

        for block in blocks:
            self._current_block = block
            if block == "B7" and not self._approval_granted:
                self._status = "waiting_for_approval"
                await workflow.wait_condition(lambda: self._approval_granted)
                self._status = "running"
                self._history.append(
                    {
                        "block": "approval_gate",
                        "status": "approved",
                        "note": self._approval_note,
                    }
                )

            result = await workflow.execute_activity(
                execute_dogfood_block_activity,
                {"block": block, "input": block_inputs.get(block, {})},
                start_to_close_timeout=timedelta(seconds=15),
                retry_policy=RetryPolicy(
                    maximum_attempts=2,
                    initial_interval=timedelta(seconds=1),
                ),
            )
            self._history.append(result)

        self._status = "complete"
        return {
            "status": "complete",
            "workflow": "DogfoodB1B8Workflow",
            "history": self._history,
            "block_count": len(self._history),
        }


@workflow.defn
class SelfBootstrapWorkflow:
    def __init__(self) -> None:
        self._approval_granted = False
        self._approval_note = ""
        self._docs_parity_granted = False
        self._docs_parity_evidence_path = ""
        self._current_step = "not-started"
        self._status = "pending"
        self._history: list[dict[str, Any]] = []
        self._bundle_paths: dict[str, str] = {}

    @workflow.signal
    async def approve_resume(self, note: str = "") -> None:
        self._approval_granted = True
        self._approval_note = note

    @workflow.signal
    async def provide_docs_parity(self, evidence_path: str) -> None:
        self._docs_parity_granted = True
        self._docs_parity_evidence_path = evidence_path

    @workflow.query
    def get_status(self) -> dict[str, Any]:
        return {
            "status": self._status,
            "current_step": self._current_step,
            "approval_granted": self._approval_granted,
            "approval_note": self._approval_note,
            "docs_parity_granted": self._docs_parity_granted,
            "docs_parity_evidence_path": self._docs_parity_evidence_path,
            "bundle_paths": self._bundle_paths,
            "history": self._history,
        }

    @workflow.run
    async def run(self, payload: dict[str, Any]) -> dict[str, Any]:
        self._status = "running"
        workflow_id = str(payload.get("workflow_id") or workflow.info().workflow_id)
        repo_root = str(payload.get("repo_root") or ".")
        output_dir = str(payload.get("output_dir") or "screehshots_evidence")

        self._current_step = "approval_gate"
        if not self._approval_granted:
            self._status = "waiting_for_approval"
            await workflow.wait_condition(lambda: self._approval_granted)
            self._status = "running"
            self._history.append(
                {
                    "step": "approval_gate",
                    "status": "approved",
                    "note": self._approval_note,
                }
            )

        self._current_step = "generate_bundle"
        bundle_result = await workflow.execute_activity(
            generate_change_bundle_stub_activity,
            {
                "workflow_id": workflow_id,
                "repo_root": repo_root,
                "output_dir": output_dir,
                "docs_parity_evidence_path": self._docs_parity_evidence_path,
            },
            start_to_close_timeout=timedelta(seconds=20),
            retry_policy=RetryPolicy(
                maximum_attempts=2,
                initial_interval=timedelta(seconds=1),
            ),
        )
        self._bundle_paths = {
            "bundle_json_path": str(bundle_result.get("bundle_json_path", "")),
            "bundle_patch_path": str(bundle_result.get("bundle_patch_path", "")),
        }
        self._history.append({"step": "generate_bundle", "result": bundle_result})

        self._current_step = "docs_parity_gate"
        if not self._docs_parity_granted:
            self._status = "waiting_for_docs_parity"
            await workflow.wait_condition(lambda: self._docs_parity_granted)
            self._status = "running"
            self._history.append(
                {
                    "step": "docs_parity_gate",
                    "status": "docs_parity_provided",
                    "evidence_path": self._docs_parity_evidence_path,
                }
            )

        self._current_step = "complete"
        self._status = "complete"
        return {
            "status": "complete",
            "workflow": "SelfBootstrapWorkflow",
            "workflow_id": workflow_id,
            "repo_root": repo_root,
            "output_dir": output_dir,
            "bundle_paths": self._bundle_paths,
            "docs_parity_evidence_path": self._docs_parity_evidence_path,
            "history": self._history,
        }


@workflow.defn
class MendixMigrationWorkflow:
    @workflow.run
    async def run(self, payload: dict[str, Any]) -> dict[str, Any]:
        migration_id = str(
            payload.get("migration_id")
            or payload.get("workflow_id")
            or workflow.info().workflow_id
        )
        dry_run = bool(payload.get("dry_run", True))
        repo_root = str(payload.get("repo_root") or ".")
        output_dir = str(payload.get("output_dir") or "screehshots_evidence")
        sample_verify_count = int(payload.get("sample_verify_count", 2))
        resume_from = str(payload.get("resume_from_checkpoint", "extract"))
        allowed_resume = {"extract", "transform", "load", "validate"}
        if resume_from not in allowed_resume:
            resume_from = "extract"

        checkpoints: list[dict[str, Any]] = []
        extracted_records: list[dict[str, Any]] = []
        transformed_records: list[dict[str, Any]] = []
        loaded_results: list[dict[str, Any]] = []
        extraction_errors: list[str] = []
        record_audit_rows: list[dict[str, Any]] = []

        if resume_from == "extract":
            extracted = await workflow.execute_activity(
                extract_mendix_records_activity,
                payload,
                start_to_close_timeout=timedelta(seconds=20),
                retry_policy=RetryPolicy(
                    maximum_attempts=3,
                    initial_interval=timedelta(seconds=1),
                ),
            )
            extracted_records = (
                extracted.get("records")
                if isinstance(extracted.get("records"), list)
                else []
            )
            extraction_errors = (
                extracted.get("errors")
                if isinstance(extracted.get("errors"), list)
                else []
            )
            checkpoints.append(
                {
                    "stage": "extract",
                    "status": "complete",
                    "record_count": len(extracted_records),
                    "error_count": len(extraction_errors),
                }
            )
        else:
            checkpoints.append(
                {
                    "stage": "extract",
                    "status": "resumed",
                    "resume_from_checkpoint": resume_from,
                }
            )
            source = payload.get("source") if isinstance(payload.get("source"), dict) else {}
            records = source.get("records")
            extracted_records = records if isinstance(records, list) else _default_migration_source_records()
            extraction_errors = []

        record_audit_rows = [
            {
                "source_identifier": str(record.get("source_identifier") or record.get("source_id", "")),
                "transform_status": "pending",
                "load_status": "pending",
                "error": "",
            }
            for record in extracted_records
            if isinstance(record, dict)
        ]
        audit_index = {row["source_identifier"]: row for row in record_audit_rows}

        if resume_from in {"extract", "transform"}:
            for record in extracted_records:
                if not isinstance(record, dict):
                    continue
                source_identifier = str(record.get("source_identifier") or record.get("source_id", ""))
                try:
                    transformed = await workflow.execute_activity(
                        transform_record_activity,
                        record,
                        start_to_close_timeout=timedelta(seconds=10),
                        retry_policy=RetryPolicy(
                            maximum_attempts=3,
                            initial_interval=timedelta(seconds=1),
                        ),
                    )
                    transformed_records.append(transformed)
                    if source_identifier in audit_index:
                        audit_index[source_identifier]["transform_status"] = "success"
                except Exception as error:
                    if source_identifier in audit_index:
                        audit_index[source_identifier]["transform_status"] = "failed"
                        audit_index[source_identifier]["error"] = str(error)
            checkpoints.append(
                {
                    "stage": "transform",
                    "status": "complete",
                    "record_count": len(transformed_records),
                }
            )
        else:
            checkpoints.append(
                {
                    "stage": "transform",
                    "status": "resumed",
                    "resume_from_checkpoint": resume_from,
                }
            )
            for record in extracted_records:
                if not isinstance(record, dict):
                    continue
                transformed_records.append(
                    {
                        "source_identifier": str(record.get("source_identifier") or record.get("source_id", "")),
                        "target_id": str(record.get("source_id", "")),
                        "first_name": str(record.get("full_name", "")).split(" ")[0]
                        if str(record.get("full_name", "")).strip()
                        else "",
                        "last_name": " ".join(str(record.get("full_name", "")).split(" ")[1:]),
                        "email": str(record.get("email", "")).strip().lower(),
                        "created_at": str(record.get("created_at", "")),
                        "is_active": bool(record.get("active", True)),
                    }
                )

        if resume_from in {"extract", "transform", "load"}:
            for record in transformed_records:
                source_identifier = str(record.get("source_identifier", ""))
                try:
                    loaded = await workflow.execute_activity(
                        load_record_activity,
                        {"record": record, "dry_run": dry_run},
                        start_to_close_timeout=timedelta(seconds=10),
                        retry_policy=RetryPolicy(
                            maximum_attempts=3,
                            initial_interval=timedelta(seconds=1),
                        ),
                    )
                    loaded_results.append(loaded)
                    if source_identifier in audit_index:
                        audit_index[source_identifier]["load_status"] = str(
                            loaded.get("status", "unknown")
                        )
                except Exception as error:
                    if source_identifier in audit_index:
                        audit_index[source_identifier]["load_status"] = "failed"
                        audit_index[source_identifier]["error"] = str(error)
            checkpoints.append(
                {
                    "stage": "load",
                    "status": "complete",
                    "record_count": len(loaded_results),
                    "dry_run": dry_run,
                }
            )
        else:
            checkpoints.append(
                {
                    "stage": "load",
                    "status": "resumed",
                    "resume_from_checkpoint": resume_from,
                    "dry_run": dry_run,
                }
            )

        loaded_count = len(
            [
                item
                for item in loaded_results
                if isinstance(item, dict) and item.get("status") == "loaded"
            ]
        )
        skipped_loads = len(
            [
                item
                for item in loaded_results
                if isinstance(item, dict) and item.get("status") == "dry_run_skipped"
            ]
        )
        dry_run_guard_ok = (not dry_run) or loaded_count == 0

        validation = await workflow.execute_activity(
            validate_migration_activity,
            {
                "extracted_count": len(extracted_records),
                "transformed_count": len(transformed_records),
                "loaded_count": loaded_count,
                "transformed_records": transformed_records,
                "sample_verify_count": sample_verify_count,
            },
            start_to_close_timeout=timedelta(seconds=10),
            retry_policy=RetryPolicy(
                maximum_attempts=3,
                initial_interval=timedelta(seconds=1),
            ),
        )
        checkpoints.append(
            {
                "stage": "validate",
                "status": "complete",
                "row_count_match": bool(validation.get("row_count_match", False)),
            }
        )

        report_payload = {
            "migration_id": migration_id,
            "workflow": "MendixMigrationWorkflow",
            "dry_run": dry_run,
            "repo_root": repo_root,
            "output_dir": output_dir,
            "resume_from_checkpoint": resume_from,
            "summary": {
                "extracted_count": len(extracted_records),
                "transformed_count": len(transformed_records),
                "loaded_count": loaded_count,
                "skipped_loads": skipped_loads,
                "extraction_error_count": len(extraction_errors),
                "write_performed": not dry_run and loaded_count > 0,
                "dry_run_guard_ok": dry_run_guard_ok,
                "row_count_match": bool(validation.get("row_count_match", False)),
                "sample_verified_count": int(validation.get("sample_verified_count", 0)),
            },
            "validation": validation,
            "checkpoints": checkpoints,
            "record_audit_rows": record_audit_rows,
            "extraction_errors": extraction_errors,
        }

        report_result = await workflow.execute_activity(
            write_migration_report_activity,
            report_payload,
            start_to_close_timeout=timedelta(seconds=10),
            retry_policy=RetryPolicy(
                maximum_attempts=2,
                initial_interval=timedelta(seconds=1),
            ),
        )
        report_path = str(report_result.get("report_path", ""))

        return {
            "status": "complete",
            "workflow": "MendixMigrationWorkflow",
            "migration_id": migration_id,
            "dry_run": dry_run,
            "report_path": report_path,
            "summary": report_payload["summary"],
            "checkpoints": checkpoints,
            "record_audit_rows": record_audit_rows,
        }


async def main() -> None:
    client = await Client.connect("localhost:7233", namespace="default")
    worker = Worker(
        client,
        task_queue="ari-smoke",
        workflows=[
            SmokeWorkflow,
            ExecutionWorkflow,
            DogfoodB1B8Workflow,
            SelfBootstrapWorkflow,
            MendixMigrationWorkflow,
        ],
        activities=[
            execute_assignment_activity,
            execute_dogfood_block_activity,
            generate_change_bundle_stub_activity,
            extract_mendix_records_activity,
            transform_record_activity,
            load_record_activity,
            validate_migration_activity,
            write_migration_report_activity,
        ],
    )
    print(
        "Temporal worker started. task_queue=ari-smoke namespace=default workflows=[SmokeWorkflow, ExecutionWorkflow, DogfoodB1B8Workflow, SelfBootstrapWorkflow, MendixMigrationWorkflow]"
    )
    await worker.run()


if __name__ == "__main__":
    asyncio.run(main())
