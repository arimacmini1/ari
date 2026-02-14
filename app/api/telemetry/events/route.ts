import { NextRequest, NextResponse } from 'next/server'
import { resolveProjectContext } from '@/lib/project-context'
import { normalizeTelemetryEvent } from '@/lib/telemetry-events'
import { recordTelemetryEvent } from '@/lib/telemetry-store'

const USER_HEADER = 'x-user-id'

export async function POST(req: NextRequest) {
  const projectContext = resolveProjectContext(req)
  if (!projectContext.ok) return projectContext.response

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 })
  }

  const userId = req.headers.get(USER_HEADER)?.trim() || 'anonymous'
  const normalized = normalizeTelemetryEvent(body as any, {
    project_id: projectContext.projectId,
    user_id: userId,
    source: 'main_workspace_chat',
  })
  if (!normalized.ok) {
    return NextResponse.json({ error: normalized.error }, { status: 400 })
  }

  const result = recordTelemetryEvent(normalized.event)
  return NextResponse.json({
    status: result.status,
    event: result.event,
  })
}
