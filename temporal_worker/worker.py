import asyncio
from datetime import timedelta
from typing import Any

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


async def main() -> None:
    client = await Client.connect("localhost:7233", namespace="default")
    worker = Worker(
        client,
        task_queue="ari-smoke",
        workflows=[SmokeWorkflow, ExecutionWorkflow],
        activities=[execute_assignment_activity],
    )
    print(
        "Temporal worker started. task_queue=ari-smoke namespace=default workflows=[SmokeWorkflow, ExecutionWorkflow]"
    )
    await worker.run()


if __name__ == "__main__":
    asyncio.run(main())
