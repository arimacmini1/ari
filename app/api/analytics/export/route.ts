import { NextRequest, NextResponse } from 'next/server'
import { resolveProjectContext } from '@/lib/project-context'
import { listExecutionMetricEvents } from '@/lib/analytics-metric-store'

function toCsvValue(value: string | number | undefined): string {
  if (value === undefined) return ''
  const asText = String(value)
  if (asText.includes(',') || asText.includes('"') || asText.includes('\n')) {
    return `"${asText.replaceAll('"', '""')}"`
  }
  return asText
}

export async function GET(req: NextRequest) {
  const projectContext = resolveProjectContext(req)
  if (!projectContext.ok) return projectContext.response

  const format = (req.nextUrl.searchParams.get('format') || 'json').toLowerCase()
  const since = req.nextUrl.searchParams.get('since') || undefined

  const events = listExecutionMetricEvents({
    project_id: projectContext.projectId,
    since,
  })

  if (format === 'csv') {
    const header = [
      'event_id',
      'event_type',
      'timestamp',
      'project_id',
      'execution_id',
      'agent_id',
      'status',
      'tokens',
      'estimated_cost',
      'actual_cost',
      'latency_ms',
      'error_count',
      'success_count',
      'quality_score',
    ]
    const rows = events.map((event) =>
      [
        event.event_id,
        event.event_type,
        event.timestamp,
        event.project_id,
        event.execution_id,
        event.agent_id,
        event.status,
        event.tokens,
        event.estimated_cost,
        event.actual_cost,
        event.latency_ms,
        event.error_count,
        event.success_count,
        event.quality_score,
      ]
        .map((value) => toCsvValue(value))
        .join(',')
    )
    const csv = [header.join(','), ...rows].join('\n')
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="analytics-${projectContext.projectId}.csv"`,
      },
    })
  }

  return NextResponse.json({
    project_id: projectContext.projectId,
    format: 'json',
    count: events.length,
    events,
  })
}

