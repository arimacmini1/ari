import { NextRequest, NextResponse } from "next/server"
import { getForkJob } from "@/lib/trace-fork-job-store"
import { resolveProjectScope } from "@/lib/project-scope"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ forkId: string }> }
) {
  const scope = resolveProjectScope(request)
  if (!scope.ok) {
    return scope.response
  }

  const { forkId } = await params
  const fork = getForkJob(forkId)
  if (!fork) {
    return NextResponse.json({ error: "Fork job not found." }, { status: 404 })
  }
  if (!scope.adminOverride && scope.projectId && fork.project_id !== scope.projectId) {
    return NextResponse.json(
      { error: `Fork job ${forkId} not found in active project ${scope.projectId}.` },
      { status: 404 }
    )
  }
  return NextResponse.json({ fork })
}
