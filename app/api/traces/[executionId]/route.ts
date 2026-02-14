/**
 * GET /api/traces/[executionId]
 * Fetch trace data for a specific execution
 */

import { NextRequest, NextResponse } from "next/server"
import { getTraceExecution, getTraceProjectId } from "@/lib/mock-trace-store"
import { resolveProjectScope } from "@/lib/project-scope"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ executionId: string }> }
) {
  const scope = resolveProjectScope(request)
  if (!scope.ok) {
    return scope.response
  }

  const { executionId } = await params
  const trace = getTraceExecution(executionId)
  if (!trace) {
    return NextResponse.json({ error: `Trace ${executionId} not found.` }, { status: 404 })
  }

  const traceProjectId = getTraceProjectId(executionId)
  if (!scope.adminOverride && scope.projectId && traceProjectId !== scope.projectId) {
    return NextResponse.json(
      { error: `Trace ${executionId} not found in active project ${scope.projectId}.` },
      { status: 404 }
    )
  }

  return NextResponse.json({ trace })
}
