import { NextRequest, NextResponse } from "next/server"
import { createMergeRequest, listMergeRequests } from "@/lib/merge-requests"
import { enforcePermission } from "@/lib/rbac/enforce"
import { createAuditLog } from "@/lib/audit/audit-service"

export async function GET(req: NextRequest) {
  const result = await enforcePermission(req, {
    permission: "approve_merge",
    action: "access",
    resourceType: "workflow",
    resourceId: "merge-queue",
  })
  if (!result.allowed) return result.response!

  const merges = await listMergeRequests("pending")
  return NextResponse.json({ merges })
}

export async function POST(req: NextRequest) {
  const result = await enforcePermission(req, {
    permission: "assign",
    action: "create",
    resourceType: "workflow",
    resourceId: "merge-request",
  })
  if (!result.allowed) return result.response!

  const body = await req.json()
  const source_id = String(body?.source_id || "")
  const target_id = String(body?.target_id || "")
  if (!source_id || !target_id) {
    return NextResponse.json({ error: "source_id and target_id required" }, { status: 400 })
  }

  const merge = await createMergeRequest(source_id, target_id)
  await createAuditLog({
    timestamp: new Date(),
    actor: result.userId,
    action: "create",
    resource_type: "workflow",
    resource_id: merge.id,
    context: { source_id, target_id, status: "pending" },
  })

  return NextResponse.json({ merge }, { status: 201 })
}
