import { NextRequest, NextResponse } from 'next/server'
import { createProject, listProjects } from '@/lib/project-store'
import { upsertProjectMembership } from '@/lib/project-membership-store'

export async function GET() {
  const projects = listProjects()
  return NextResponse.json({ projects })
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const name = String(body?.name || '').trim()
  if (!name) {
    return NextResponse.json({ error: 'Project name is required.' }, { status: 400 })
  }

  const warning = body?.budget_warning_threshold
  const hardCap = body?.budget_hard_cap
  if (typeof warning === 'number' && warning < 0) {
    return NextResponse.json({ error: 'budget_warning_threshold cannot be negative.' }, { status: 400 })
  }
  if (typeof hardCap === 'number' && hardCap < 0) {
    return NextResponse.json({ error: 'budget_hard_cap cannot be negative.' }, { status: 400 })
  }
  if (typeof warning === 'number' && typeof hardCap === 'number' && hardCap < warning) {
    return NextResponse.json(
      { error: 'budget_hard_cap must be greater than or equal to budget_warning_threshold.' },
      { status: 400 }
    )
  }

  const project = createProject({
    name,
    budget_warning_threshold: typeof warning === 'number' ? warning : undefined,
    budget_hard_cap: typeof hardCap === 'number' ? hardCap : undefined,
  })

  const actorUserId =
    req.headers.get('x-user-id')?.trim() ||
    process.env.RBAC_BOOTSTRAP_ADMIN_USER_ID?.trim() ||
    'anonymous'
  upsertProjectMembership({
    projectId: project.project_id,
    userId: actorUserId,
    role: 'Admin',
    actorUserId,
  })

  return NextResponse.json({ project }, { status: 201 })
}
