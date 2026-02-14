import { NextRequest, NextResponse } from 'next/server'
import { getProject, type ProjectRecord } from '@/lib/project-store'

export const ACTIVE_PROJECT_COOKIE = 'aei_active_project_id'
const PROJECT_HEADER = 'x-project-id'

export function getRequestedProjectId(req: NextRequest): string | null {
  const fromHeader = req.headers.get(PROJECT_HEADER)?.trim()
  if (fromHeader) return fromHeader
  const fromCookie = req.cookies.get(ACTIVE_PROJECT_COOKIE)?.value?.trim()
  return fromCookie || null
}

export function createMissingProjectResponse() {
  return NextResponse.json(
    {
      error:
        'Missing active project context. Set `x-project-id` header or select an active project in the UI.',
    },
    { status: 400 }
  )
}

export function createInvalidProjectResponse(projectId: string) {
  return NextResponse.json(
    { error: `Invalid project context: ${projectId}` },
    { status: 404 }
  )
}

export function resolveProjectContext(req: NextRequest): {
  ok: true
  projectId: string
  project: ProjectRecord
} | {
  ok: false
  response: NextResponse
} {
  const projectId = getRequestedProjectId(req)
  if (!projectId) {
    return { ok: false, response: createMissingProjectResponse() }
  }

  const project = getProject(projectId)
  if (!project) {
    return { ok: false, response: createInvalidProjectResponse(projectId) }
  }

  return { ok: true, projectId, project }
}

