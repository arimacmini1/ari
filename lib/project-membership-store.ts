import { type RbacRole, RBAC_ROLES } from "@/lib/rbac/constants"

export interface ProjectMembershipRecord {
  project_id: string
  user_id: string
  role: RbacRole
  invited_by: string
  created_at: string
  updated_at: string
}

declare global {
  var __aei_project_memberships_db: Map<string, ProjectMembershipRecord> | undefined
}

function getMembershipsDb(): Map<string, ProjectMembershipRecord> {
  if (!globalThis.__aei_project_memberships_db) {
    globalThis.__aei_project_memberships_db = new Map<string, ProjectMembershipRecord>()
  }
  return globalThis.__aei_project_memberships_db
}

function membershipKey(projectId: string, userId: string): string {
  return `${projectId}:${userId}`
}

function normalizeRole(role: unknown): RbacRole | null {
  if (typeof role !== "string") return null
  return (RBAC_ROLES as readonly string[]).includes(role) ? (role as RbacRole) : null
}

export function listProjectMemberships(projectId: string): ProjectMembershipRecord[] {
  return Array.from(getMembershipsDb().values())
    .filter((membership) => membership.project_id === projectId)
    .sort((left, right) => left.user_id.localeCompare(right.user_id))
}

export function getProjectMembership(projectId: string, userId: string): ProjectMembershipRecord | null {
  return getMembershipsDb().get(membershipKey(projectId, userId)) ?? null
}

export function upsertProjectMembership(input: {
  projectId: string
  userId: string
  role: unknown
  actorUserId: string
}): ProjectMembershipRecord {
  const role = normalizeRole(input.role)
  if (!role) {
    throw new Error(`Invalid role: ${String(input.role)}`)
  }

  const key = membershipKey(input.projectId, input.userId)
  const membershipsDb = getMembershipsDb()
  const existing = membershipsDb.get(key)
  const now = new Date().toISOString()

  if (existing) {
    const updated: ProjectMembershipRecord = {
      ...existing,
      role,
      invited_by: input.actorUserId,
      updated_at: now,
    }
    membershipsDb.set(key, updated)
    return updated
  }

  const created: ProjectMembershipRecord = {
    project_id: input.projectId,
    user_id: input.userId,
    role,
    invited_by: input.actorUserId,
    created_at: now,
    updated_at: now,
  }
  membershipsDb.set(key, created)
  return created
}
