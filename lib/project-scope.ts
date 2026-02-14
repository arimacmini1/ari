import { NextRequest, NextResponse } from "next/server"
import { resolveProjectContext } from "@/lib/project-context"

const ADMIN_OVERRIDE_HEADER = "x-project-admin-override"
const USER_ID_HEADER = "x-user-id"

export function canUseAdminProjectOverride(req: NextRequest): boolean {
  const wantsOverride = req.headers.get(ADMIN_OVERRIDE_HEADER)?.toLowerCase() === "true"
  if (!wantsOverride) return false

  const bootstrapAdminId = process.env.RBAC_BOOTSTRAP_ADMIN_USER_ID?.trim()
  const requestUserId = req.headers.get(USER_ID_HEADER)?.trim()
  return Boolean(bootstrapAdminId && requestUserId && bootstrapAdminId === requestUserId)
}

export function resolveProjectScope(req: NextRequest):
  | { ok: true; projectId: string | null; adminOverride: boolean }
  | { ok: false; response: NextResponse } {
  if (canUseAdminProjectOverride(req)) {
    return { ok: true, projectId: null, adminOverride: true }
  }

  const context = resolveProjectContext(req)
  if (!context.ok) {
    return context
  }
  return { ok: true, projectId: context.projectId, adminOverride: false }
}
