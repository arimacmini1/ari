import asyncio
import argparse
import uuid

from temporalio.client import Client


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run Temporal smoke workflow")
    parser.add_argument(
        "--workflow-id",
        dest="workflow_id",
        help="Optional workflow ID override for deterministic runs",
    )
    return parser.parse_args()


async def main() -> None:
    args = parse_args()
    workflow_id = args.workflow_id or f"ari-smoke-{uuid.uuid4().hex[:12]}"
    print(f"Starting SmokeWorkflow with workflow_id={workflow_id}")

    client = await Client.connect("localhost:7233", namespace="default")
    result = await client.execute_workflow(
        "SmokeWorkflow",
        "ari",
        id=workflow_id,
        task_queue="ari-smoke",
    )
    print(result)


if __name__ == "__main__":
    asyncio.run(main())
