import { NextRequest, NextResponse } from "next/server"
import { approveMergeRequest } from "@/lib/merge-requests"
import { enforcePermission } from "@/lib/rbac/enforce"
import { createAuditLog } from "@/lib/audit/audit-service"

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const result = await enforcePermission(req, {
    permission: "approve_merge",
    action: "update",
    resourceType: "workflow",
    resourceId: params.id,
  })
  if (!result.allowed) return result.response!

  const merge = await approveMergeRequest(params.id)
  if (!merge) {
    return NextResponse.json({ error: "Merge request not found" }, { status: 404 })
  }

  await createAuditLog({
    actor: result.userId,
    action: "update",
    resource_type: "workflow",
    resource_id: merge.id,
    context: { status: "approved" },
  })

  return NextResponse.json({ merge })
}
