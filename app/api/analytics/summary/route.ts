import { NextRequest, NextResponse } from 'next/server'
import { resolveProjectContext } from '@/lib/project-context'
import {
  AnalyticsPeriod,
  buildAnalyticsSummary,
  listExecutionMetricEvents,
} from '@/lib/analytics-metric-store'

const PERIODS: AnalyticsPeriod[] = ['last_24h', 'last_7d', 'last_30d', 'ytd']

export async function GET(req: NextRequest) {
  const projectContext = resolveProjectContext(req)
  if (!projectContext.ok) return projectContext.response

  const periodParam = req.nextUrl.searchParams.get('period')
  const period = PERIODS.includes(periodParam as AnalyticsPeriod)
    ? (periodParam as AnalyticsPeriod)
    : 'last_30d'

  const events = listExecutionMetricEvents({ project_id: projectContext.projectId })
  const summary = buildAnalyticsSummary(events, period)
  return NextResponse.json({ summary })
}

