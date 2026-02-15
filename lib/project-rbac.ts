import { NextRequest, NextResponse } from "next/server"
import { createAuditLog } from "@/lib/audit/audit-service"
import { AuditAction, ResourceType } from "@/lib/audit/types"
import { RbacPermission, ROLE_PERMISSIONS, RbacRole } from "@/lib/rbac/constants"
import { getProjectMembership } from "@/lib/project-membership-store"

interface ProjectPermissionOptions {
  projectId: string
  permission: RbacPermission
  action: AuditAction
  resourceType: ResourceType
  resourceId: string
  context?: Record<string, unknown>
}

interface ProjectPermissionResult {
  allowed: boolean
  response?: NextResponse
  userId: string
  role: RbacRole | "unknown"
}

function denyResponse(message: string): NextResponse {
  return NextResponse.json({ error: message }, { status: 403 })
}

function getUserId(req: NextRequest): string {
  return req.headers.get("x-user-id")?.trim() || "anonymous"
}

function isBootstrapAdmin(req: NextRequest, userId: string): boolean {
  const bootstrapAdminId = process.env.RBAC_BOOTSTRAP_ADMIN_USER_ID?.trim()
  return Boolean(bootstrapAdminId && userId === bootstrapAdminId)
}

async function logProjectDeniedAccess(input: {
  userId: string
  req: NextRequest
  options: ProjectPermissionOptions
  reason: string
}) {
  const { userId, req, options, reason } = input
  try {
    await createAuditLog({
    timestamp: new Date(),
    actor: userId,
      action: "access",
      resource_type: "permission",
      resource_id: options.permission,
      context: {
        denied_action: options.action,
        denied_resource_type: options.resourceType,
        denied_resource_id: options.resourceId,
        project_id: options.projectId,
        reason,
        method: req.method,
        path: req.nextUrl.pathname,
      },
    })
  } catch (error) {
    console.warn("Failed to write project access denial audit log:", error)
  }
}

export async function enforceProjectPermission(
  req: NextRequest,
  options: ProjectPermissionOptions
): Promise<ProjectPermissionResult> {
  const userId = getUserId(req)
  if (isBootstrapAdmin(req, userId)) {
    return { allowed: true, userId, role: "Admin" }
  }

  const membership = getProjectMembership(options.projectId, userId)
  if (!membership) {
    await logProjectDeniedAccess({
      userId,
      req,
      options,
      reason: "No project membership found",
    })
    return {
      allowed: false,
      response: denyResponse(`Forbidden: no access to project ${options.projectId}.`),
      userId,
      role: "unknown",
    }
  }

  const permissions = ROLE_PERMISSIONS[membership.role]
  if (!permissions.includes(options.permission)) {
    await logProjectDeniedAccess({
      userId,
      req,
      options,
      reason: `Project role ${membership.role} lacks permission ${options.permission}`,
    })
    return {
      allowed: false,
      response: denyResponse("Forbidden: insufficient project-scoped role permissions."),
      userId,
      role: membership.role,
    }
  }

  return { allowed: true, userId, role: membership.role }
}
