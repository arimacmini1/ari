import { NextRequest, NextResponse } from 'next/server'
import { ACTIVE_PROJECT_COOKIE, getRequestedProjectId } from '@/lib/project-context'
import { getProject } from '@/lib/project-store'

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30

export async function GET(req: NextRequest) {
  const projectId = getRequestedProjectId(req)
  if (!projectId) {
    return NextResponse.json({ active_project_id: null })
  }
  const project = getProject(projectId)
  if (!project) {
    return NextResponse.json({ active_project_id: null })
  }
  return NextResponse.json({ active_project_id: project.project_id })
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const projectId = String(body?.project_id || '').trim()
  if (!projectId) {
    return NextResponse.json({ error: 'project_id is required.' }, { status: 400 })
  }

  const project = getProject(projectId)
  if (!project) {
    return NextResponse.json({ error: `Invalid project context: ${projectId}` }, { status: 404 })
  }

  const response = NextResponse.json({ active_project_id: project.project_id }, { status: 200 })
  response.cookies.set(ACTIVE_PROJECT_COOKIE, project.project_id, {
    path: '/',
    maxAge: COOKIE_MAX_AGE_SECONDS,
    sameSite: 'lax',
  })
  return response
}

