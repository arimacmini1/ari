import { NextRequest, NextResponse } from "next/server"
import { createAuditLog } from "@/lib/audit/audit-service"
import { RBAC_ROLES } from "@/lib/rbac/constants"
import { getProject } from "@/lib/project-store"
import { enforceProjectPermission } from "@/lib/project-rbac"
import { listProjectMemberships, upsertProjectMembership } from "@/lib/project-membership-store"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params
  const project = getProject(projectId)
  if (!project) {
    return NextResponse.json({ error: `Project ${projectId} not found.` }, { status: 404 })
  }

  const permission = await enforceProjectPermission(req, {
    projectId,
    permission: "assign",
    action: "access",
    resourceType: "role",
    resourceId: projectId,
  })
  if (!permission.allowed) return permission.response!

  const memberships = listProjectMemberships(projectId)
  return NextResponse.json({ project_id: projectId, memberships }, { status: 200 })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params
  const project = getProject(projectId)
  if (!project) {
    return NextResponse.json({ error: `Project ${projectId} not found.` }, { status: 404 })
  }

  const permission = await enforceProjectPermission(req, {
    projectId,
    permission: "assign",
    action: "create",
    resourceType: "role",
    resourceId: projectId,
  })
  if (!permission.allowed) return permission.response!

  const body = await req.json().catch(() => ({}))
  const inviteUserId = String(body?.user_id || req.headers.get("x-invite-user-id") || "").trim()
  if (!inviteUserId) {
    return NextResponse.json(
      { error: "user_id is required (body.user_id or x-invite-user-id header)." },
      { status: 400 }
    )
  }

  const role = String(body?.role || "Viewer").trim()
  if (!(RBAC_ROLES as readonly string[]).includes(role)) {
    return NextResponse.json({ error: `Invalid role: ${role}` }, { status: 400 })
  }

  const membership = upsertProjectMembership({
    projectId,
    userId: inviteUserId,
    role,
    actorUserId: permission.userId,
  })

  await createAuditLog({
    timestamp: new Date(),
    actor: permission.userId,
    action: "create",
    resource_type: "role",
    resource_id: `${projectId}:${inviteUserId}`,
    context: {
      project_id: projectId,
      invited_user_id: inviteUserId,
      assigned_role: role,
      event: "project_membership_invited",
    },
  })

  return NextResponse.json({ membership }, { status: 201 })
}
