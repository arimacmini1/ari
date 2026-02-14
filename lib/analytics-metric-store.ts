import type { KPISummary } from '@/lib/analytics-model'

export type AnalyticsPeriod = 'last_24h' | 'last_7d' | 'last_30d' | 'ytd'
export type MetricEventType = 'agent_delta' | 'execution_rollup'
export type MetricStatus = 'processing' | 'success' | 'failed' | 'queued'

export interface ExecutionMetricEvent {
  event_id: string
  event_type: MetricEventType
  timestamp: string
  project_id: string
  execution_id?: string
  agent_id?: string
  status: MetricStatus
  tokens: number
  estimated_cost: number
  actual_cost?: number
  latency_ms: number
  error_count: number
  success_count: number
  quality_score: number
}

declare global {
  var __aei_execution_metric_db: Map<string, ExecutionMetricEvent> | undefined
}

function getMetricDb(): Map<string, ExecutionMetricEvent> {
  if (!globalThis.__aei_execution_metric_db) {
    globalThis.__aei_execution_metric_db = new Map<string, ExecutionMetricEvent>()
  }
  return globalThis.__aei_execution_metric_db
}

function toNonNegativeNumber(input: unknown): number {
  const value = Number(input)
  if (!Number.isFinite(value) || value < 0) return 0
  return value
}

function toBoundedQuality(input: unknown): number {
  const value = Number(input)
  if (!Number.isFinite(value)) return 0
  if (value < 0) return 0
  if (value > 100) return 100
  return value
}

export function normalizeExecutionMetricEvent(
  event: Partial<ExecutionMetricEvent>,
  defaults?: { project_id?: string; timestamp?: string }
): ExecutionMetricEvent {
  const nowIso = defaults?.timestamp ?? new Date().toISOString()
  const projectId = (event.project_id || defaults?.project_id || '').trim()

  return {
    event_id: (event.event_id || `metric-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`).trim(),
    event_type: event.event_type === 'execution_rollup' ? 'execution_rollup' : 'agent_delta',
    timestamp: event.timestamp || nowIso,
    project_id: projectId,
    execution_id: event.execution_id?.trim() || undefined,
    agent_id: event.agent_id?.trim() || undefined,
    status: event.status || 'queued',
    tokens: toNonNegativeNumber(event.tokens),
    estimated_cost: toNonNegativeNumber(event.estimated_cost),
    actual_cost:
      typeof event.actual_cost === 'number' && Number.isFinite(event.actual_cost) && event.actual_cost >= 0
        ? event.actual_cost
        : undefined,
    latency_ms: toNonNegativeNumber(event.latency_ms),
    error_count: Math.floor(toNonNegativeNumber(event.error_count)),
    success_count: Math.floor(toNonNegativeNumber(event.success_count)),
    quality_score: toBoundedQuality(event.quality_score),
  }
}

export function recordExecutionMetricEvent(event: ExecutionMetricEvent): {
  status: 'stored' | 'duplicate'
  event: ExecutionMetricEvent
} {
  const db = getMetricDb()
  if (db.has(event.event_id)) {
    return { status: 'duplicate', event: db.get(event.event_id)! }
  }
  db.set(event.event_id, event)
  return { status: 'stored', event }
}

export function listExecutionMetricEvents(filters?: {
  project_id?: string
  since?: string
  event_type?: MetricEventType
}): ExecutionMetricEvent[] {
  const db = getMetricDb()
  let events = Array.from(db.values())
  if (filters?.project_id) {
    events = events.filter((event) => event.project_id === filters.project_id)
  }
  if (filters?.event_type) {
    events = events.filter((event) => event.event_type === filters.event_type)
  }
  if (filters?.since) {
    const sinceMs = new Date(filters.since).getTime()
    if (!Number.isNaN(sinceMs)) {
      events = events.filter((event) => new Date(event.timestamp).getTime() >= sinceMs)
    }
  }
  return events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
}

function getPeriodWindow(period: AnalyticsPeriod): { start: Date; end: Date; durationMs: number } {
  const end = new Date()
  let start: Date

  if (period === 'ytd') {
    start = new Date(Date.UTC(end.getUTCFullYear(), 0, 1, 0, 0, 0, 0))
  } else {
    const durationMs =
      period === 'last_24h'
        ? 24 * 60 * 60 * 1000
        : period === 'last_7d'
          ? 7 * 24 * 60 * 60 * 1000
          : 30 * 24 * 60 * 60 * 1000
    start = new Date(end.getTime() - durationMs)
  }

  return { start, end, durationMs: Math.max(1, end.getTime() - start.getTime()) }
}

function getEventsInWindow(events: ExecutionMetricEvent[], start: Date, end: Date): ExecutionMetricEvent[] {
  return events.filter((event) => {
    const ts = new Date(event.timestamp).getTime()
    return !Number.isNaN(ts) && ts >= start.getTime() && ts <= end.getTime()
  })
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.max(0, Math.min(sorted.length - 1, Math.ceil(sorted.length * p) - 1))
  return sorted[index]
}

function computeWindowKpis(events: ExecutionMetricEvent[]): KPISummary['kpis'] {
  const rollups = events.filter((event) => event.event_type === 'execution_rollup')
  const agentDeltas = events.filter((event) => event.event_type === 'agent_delta')

  const totalCost = rollups.reduce((sum, event) => sum + (event.actual_cost ?? event.estimated_cost), 0)
  const earliestMs = rollups.length > 0 ? new Date(rollups[0].timestamp).getTime() : Date.now()
  const latestMs =
    rollups.length > 0 ? new Date(rollups[rollups.length - 1].timestamp).getTime() : earliestMs + 24 * 60 * 60 * 1000
  const daySpan = Math.max(1, Math.ceil((latestMs - earliestMs) / (24 * 60 * 60 * 1000)))

  const successTotal = rollups.reduce((sum, event) => sum + event.success_count, 0)
  const errorTotal = rollups.reduce((sum, event) => sum + event.error_count, 0)
  const attempts = successTotal + errorTotal

  const latencyValues = rollups.map((event) => event.latency_ms).filter((value) => Number.isFinite(value) && value >= 0)
  const qualityEvents = rollups.filter((event) => event.quality_score > 0)
  const activeAgents = new Set(agentDeltas.map((event) => event.agent_id).filter(Boolean))

  return {
    cost_total: totalCost,
    cost_daily: totalCost / daySpan,
    quality_score_avg:
      qualityEvents.length > 0
        ? qualityEvents.reduce((sum, event) => sum + event.quality_score, 0) / qualityEvents.length
        : 0,
    error_rate: attempts > 0 ? (errorTotal / attempts) * 100 : 0,
    latency_p95: percentile(latencyValues, 0.95),
    agent_count_active: activeAgents.size,
    success_rate: attempts > 0 ? (successTotal / attempts) * 100 : 0,
    token_spend: rollups.reduce((sum, event) => sum + event.tokens, 0),
    execution_duration_avg:
      latencyValues.length > 0 ? latencyValues.reduce((sum, value) => sum + value, 0) / latencyValues.length : 0,
  }
}

function buildTrend(current: number, previous: number): { current: number; previous: number; percent_change: number } {
  if (previous === 0) {
    return { current, previous, percent_change: current === 0 ? 0 : 100 }
  }
  return {
    current,
    previous,
    percent_change: ((current - previous) / previous) * 100,
  }
}

export function buildAnalyticsSummary(
  events: ExecutionMetricEvent[],
  period: AnalyticsPeriod
): KPISummary {
  const { start, end, durationMs } = getPeriodWindow(period)
  const currentWindowEvents = getEventsInWindow(events, start, end)
  const previousStart = new Date(start.getTime() - durationMs)
  const previousEnd = new Date(start.getTime())
  const previousWindowEvents = getEventsInWindow(events, previousStart, previousEnd)

  const currentKpis = computeWindowKpis(currentWindowEvents)
  const previousKpis = computeWindowKpis(previousWindowEvents)

  return {
    timestamp: new Date().toISOString(),
    period,
    kpis: currentKpis,
    trends: {
      cost_total: buildTrend(currentKpis.cost_total ?? 0, previousKpis.cost_total ?? 0),
      cost_daily: buildTrend(currentKpis.cost_daily ?? 0, previousKpis.cost_daily ?? 0),
      quality_score_avg: buildTrend(currentKpis.quality_score_avg ?? 0, previousKpis.quality_score_avg ?? 0),
      error_rate: buildTrend(currentKpis.error_rate ?? 0, previousKpis.error_rate ?? 0),
      latency_p95: buildTrend(currentKpis.latency_p95 ?? 0, previousKpis.latency_p95 ?? 0),
      agent_count_active: buildTrend(currentKpis.agent_count_active ?? 0, previousKpis.agent_count_active ?? 0),
      success_rate: buildTrend(currentKpis.success_rate ?? 0, previousKpis.success_rate ?? 0),
      token_spend: buildTrend(currentKpis.token_spend ?? 0, previousKpis.token_spend ?? 0),
      execution_duration_avg: buildTrend(
        currentKpis.execution_duration_avg ?? 0,
        previousKpis.execution_duration_avg ?? 0
      ),
    },
    metadata: {
      total_executions: new Set(
        currentWindowEvents
          .filter((event) => event.event_type === 'execution_rollup')
          .map((event) => event.execution_id)
          .filter(Boolean)
      ).size,
      total_agents: new Set(currentWindowEvents.map((event) => event.agent_id).filter(Boolean)).size,
      total_projects: new Set(currentWindowEvents.map((event) => event.project_id).filter(Boolean)).size,
    },
  }
}

