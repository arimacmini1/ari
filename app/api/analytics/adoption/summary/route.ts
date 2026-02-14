import { NextRequest, NextResponse } from 'next/server'
import { resolveProjectContext } from '@/lib/project-context'
import { listTelemetryEvents } from '@/lib/telemetry-store'
import { computeAdoptionSummary, type AdoptionPeriod } from '@/lib/telemetry-adoption'

const PERIODS: AdoptionPeriod[] = ['last_24h', 'last_7d', 'last_30d', 'ytd']

export async function GET(req: NextRequest) {
  const projectContext = resolveProjectContext(req)
  if (!projectContext.ok) return projectContext.response

  const periodParam = req.nextUrl.searchParams.get('period')
  const period = PERIODS.includes(periodParam as AdoptionPeriod)
    ? (periodParam as AdoptionPeriod)
    : 'last_30d'

  const events = listTelemetryEvents({ project_id: projectContext.projectId })
  const summary = computeAdoptionSummary(events, projectContext.projectId, period)

  return NextResponse.json({ summary })
}
