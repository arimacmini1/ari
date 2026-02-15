import { NextRequest, NextResponse } from "next/server"
import { rejectMergeRequest } from "@/lib/merge-requests"
import { createAuditLog } from "@/lib/audit/audit-service"
import { resolveProjectContext } from "@/lib/project-context"
import { enforceProjectPermission } from "@/lib/project-rbac"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const projectContext = resolveProjectContext(req)
  if (!projectContext.ok) {
    return projectContext.response
  }

  const result = await enforceProjectPermission(req, {
    projectId: projectContext.projectId,
    permission: "approve_merge",
    action: "delete",
    resourceType: "workflow",
    resourceId: id,
  })
  if (!result.allowed) return result.response!

  const merge = await rejectMergeRequest(id)
  if (!merge) {
    return NextResponse.json({ error: "Merge request not found" }, { status: 404 })
  }

  await createAuditLog({
    timestamp: new Date(),
    actor: result.userId,
    action: "delete",
    resource_type: "workflow",
    resource_id: merge.id,
    context: { status: "rejected", project_id: projectContext.projectId },
  })

  return NextResponse.json({ merge })
}
