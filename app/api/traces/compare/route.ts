/**
 * POST /api/traces/compare
 * Build a comparative trace view for a decision node + selected alternative outcome.
 */

import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getTraceExecution, getTraceProjectId } from "@/lib/mock-trace-store"
import { buildTraceComparison } from "@/lib/trace-compare"
import { getTraceFeatureFlags } from "@/lib/trace-feature-flags"
import { resolveProjectScope } from "@/lib/project-scope"

const CompareRequestSchema = z.object({
  execution_id: z.string().min(1),
  node_id: z.string().min(1),
  alternative_outcome: z.string().min(1),
})

export async function POST(request: NextRequest) {
  if (getTraceFeatureFlags().compare_disabled) {
    return NextResponse.json(
      { error: "Trace comparison is disabled by server configuration." },
      { status: 503 }
    )
  }

  const start = Date.now()

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 })
  }

  const parsed = CompareRequestSchema.safeParse(body)
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

    const execution = getTraceExecution(parsed.data.execution_id)
    if (!execution) {
      return NextResponse.json(
        { error: `Trace ${parsed.data.execution_id} not found.` },
        { status: 404 }
      )
    }

    const traceProjectId = getTraceProjectId(parsed.data.execution_id)
    if (!scope.adminOverride && scope.projectId && traceProjectId !== scope.projectId) {
      return NextResponse.json(
        { error: `Trace ${parsed.data.execution_id} not found in active project ${scope.projectId}.` },
        { status: 404 }
      )
    }

    const draft = buildTraceComparison({
      execution,
      forkNodeId: parsed.data.node_id,
      alternativeOutcome: parsed.data.alternative_outcome,
    })

    const comparison = {
      ...draft,
      comparison_id: `cmp_${parsed.data.execution_id}_${parsed.data.node_id}_${Date.now()}`,
      status: "completed" as const,
      created_at: new Date().toISOString(),
      timings_ms: {
        diff_compute_ms: Date.now() - start,
      },
    }

    return NextResponse.json({ comparison })
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to build comparison.",
        status: "failed",
        timings_ms: { diff_compute_ms: Date.now() - start },
      },
      { status: 500 }
    )
  }
}
