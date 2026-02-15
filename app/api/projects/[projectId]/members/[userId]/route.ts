import { NextRequest, NextResponse } from "next/server"
import { createAuditLog } from "@/lib/audit/audit-service"
import { RBAC_ROLES } from "@/lib/rbac/constants"
import { getProject } from "@/lib/project-store"
import { enforceProjectPermission } from "@/lib/project-rbac"
import { getProjectMembership, upsertProjectMembership } from "@/lib/project-membership-store"

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; userId: string }> }
) {
  const { projectId, userId } = await params
  const project = getProject(projectId)
  if (!project) {
    return NextResponse.json({ error: `Project ${projectId} not found.` }, { status: 404 })
  }

  const permission = await enforceProjectPermission(req, {
    projectId,
    permission: "assign",
    action: "update",
    resourceType: "role",
    resourceId: `${projectId}:${userId}`,
  })
  if (!permission.allowed) return permission.response!

  const existing = getProjectMembership(projectId, userId)
  if (!existing) {
    return NextResponse.json(
      { error: `Membership for user ${userId} not found in project ${projectId}.` },
      { status: 404 }
    )
  }

  const body = await req.json().catch(() => ({}))
  const role = String(body?.role || "").trim()
  if (!(RBAC_ROLES as readonly string[]).includes(role)) {
    return NextResponse.json({ error: `Invalid role: ${role}` }, { status: 400 })
  }

  const membership = upsertProjectMembership({
    projectId,
    userId,
    role,
    actorUserId: permission.userId,
  })

  await createAuditLog({
    timestamp: new Date(),
    actor: permission.userId,
    action: "update",
    resource_type: "role",
    resource_id: `${projectId}:${userId}`,
    context: {
      project_id: projectId,
      target_user_id: userId,
      previous_role: existing.role,
      updated_role: role,
      event: "project_membership_role_updated",
    },
  })

  return NextResponse.json({ membership }, { status: 200 })
}
