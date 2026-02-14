/**
 * POST /api/traces/fork
 * Create a forked execution trace from a decision node + selected alternative outcome.
 *
 * Note: This is a mock implementation that produces a synthetic fork trace and stores
 * it in-memory for retrieval through GET /api/traces/[executionId].
 */

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getTraceExecution, getTraceProjectId, upsertTraceExecution } from "@/lib/mock-trace-store"
import { buildScopedForkExecution } from "@/lib/trace-compare"
import { getTraceFeatureFlags } from "@/lib/trace-feature-flags"
import { createForkJob, updateForkJob } from "@/lib/trace-fork-job-store"
import { resolveProjectScope } from "@/lib/project-scope"

const ForkRequestSchema = z.object({
  execution_id: z.string().min(1),
  node_id: z.string().min(1),
  alternative_outcome: z.string().min(1),
})

export async function POST(request: NextRequest) {
  if (getTraceFeatureFlags().fork_disabled) {
    return NextResponse.json(
      { error: "Trace forking is disabled by server configuration." },
      { status: 503 }
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 })
  }

  const parsed = ForkRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request.", details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  try {
    const scope = resolveProjectScope(request)
    if (!scope.ok) {
      return scope.response
    }

    const baseExecution = getTraceExecution(parsed.data.execution_id)
    if (!baseExecution) {
      return NextResponse.json(
        { error: `Trace ${parsed.data.execution_id} not found.` },
        { status: 404 }
      )
    }

    const baseProjectId = getTraceProjectId(parsed.data.execution_id)
    if (!scope.adminOverride && scope.projectId && baseProjectId !== scope.projectId) {
      return NextResponse.json(
        { error: `Trace ${parsed.data.execution_id} not found in active project ${scope.projectId}.` },
        { status: 404 }
      )
    }

    const scopedProjectId = scope.projectId ?? baseProjectId ?? "project-default"
    const forkId = `fork_job_${parsed.data.execution_id}_${parsed.data.node_id}_${Date.now()}`
    createForkJob({
      fork_id: forkId,
      project_id: scopedProjectId,
      status: "queued",
      base_execution_id: parsed.data.execution_id,
      fork_node_id: parsed.data.node_id,
      selected_alternative_outcome: parsed.data.alternative_outcome,
      note: "Fork queued for scoped downstream re-execution.",
    })

    setTimeout(() => {
      const runStart = Date.now()
      updateForkJob(forkId, { status: "running", note: "Fork is running." })
      try {
        const forkExecutionId = `fork_${parsed.data.execution_id}_${parsed.data.node_id}_${Date.now()}`
        const { forkedExecution, affected_nodes } = buildScopedForkExecution({
          execution: baseExecution,
          forkExecutionId,
          forkNodeId: parsed.data.node_id,
          alternativeOutcome: parsed.data.alternative_outcome,
        })
        upsertTraceExecution(forkedExecution, scopedProjectId)
        updateForkJob(forkId, {
          status: "completed",
          fork_execution_id: forkExecutionId,
          affected_nodes,
          mode: "scoped",
          note: "Scoped downstream re-execution simulated: only fork subtree was re-evaluated.",
          timings_ms: { fork_exec_ms: Date.now() - runStart },
        })
      } catch (error) {
        updateForkJob(forkId, {
          status: "failed",
          error: error instanceof Error ? error.message : "Failed to fork trace.",
          timings_ms: { fork_exec_ms: Date.now() - runStart },
        })
      }
    }, 120)

    const statusCode = 202
    return NextResponse.json(
      {
        fork: {
          fork_id: forkId,
          status: "queued",
          base_execution_id: parsed.data.execution_id,
          fork_node_id: parsed.data.node_id,
          selected_alternative_outcome: parsed.data.alternative_outcome,
          poll_url: `/api/traces/fork/${forkId}`,
        },
      },
      { status: statusCode }
    )
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fork trace." },
      { status: 500 }
    )
  }
}
