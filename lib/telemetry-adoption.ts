import type { TelemetryEvent } from '@/lib/telemetry-events'

export type AdoptionPeriod = 'last_24h' | 'last_7d' | 'last_30d' | 'ytd'

export interface AdoptionSummary {
  timestamp: string
  period: AdoptionPeriod
  project_id: string
  sessions_total: number
  sessions_with_assistant: number
  sessions_converted: number
  conversion_rate: number
  time_to_first_output_avg_s: number | null
  tutorial_completion_rate: number
  import_attempts: number
  import_failures: number
  import_failure_rate: number
  usage_split: {
    chat_only: number
    expanded_to_canvas: number
  }
}

function getPeriodMs(period: AdoptionPeriod): number {
  switch (period) {
    case 'last_24h':
      return 24 * 60 * 60 * 1000
    case 'last_7d':
      return 7 * 24 * 60 * 60 * 1000
    case 'last_30d':
      return 30 * 24 * 60 * 60 * 1000
    case 'ytd': {
      const now = new Date()
      const start = new Date(Date.UTC(now.getUTCFullYear(), 0, 1)).getTime()
      return now.getTime() - start
    }
  }
}

export function computeAdoptionSummary(
  events: TelemetryEvent[],
  projectId: string,
  period: AdoptionPeriod
): AdoptionSummary {
  const now = new Date()
  const cutoff = new Date(now.getTime() - getPeriodMs(period))
  const filtered = events.filter((event) => new Date(event.timestamp) >= cutoff)

  const sessions = new Map<string, {
    startedAt?: number
    firstAssistantAt?: number
    expanded?: boolean
    tutorialCompleted?: boolean
  }>()

  let importAttempts = 0
  let importFailures = 0

  for (const event of filtered) {
    const sessionId = event.session_id
    if (!sessions.has(sessionId)) {
      sessions.set(sessionId, {})
    }
    const entry = sessions.get(sessionId)!
    if (event.event_name === 'session_started') {
      const startedAt = new Date(event.timestamp).getTime()
      if (!entry.startedAt || startedAt < entry.startedAt) {
        entry.startedAt = startedAt
      }
    }
    if (event.event_name === 'assistant_response') {
      const responseAt = new Date(event.timestamp).getTime()
      if (!entry.firstAssistantAt || responseAt < entry.firstAssistantAt) {
        entry.firstAssistantAt = responseAt
      }
    }
    if (event.event_name === 'expanded_to_canvas') {
      entry.expanded = true
    }
    if (event.event_name === 'tutorial_completed') {
      entry.tutorialCompleted = true
    }
    if (event.event_name === 'import_attempted') {
      importAttempts += 1
    }
    if (event.event_name === 'import_failed') {
      importFailures += 1
    }
  }

  const sessionEntries = Array.from(sessions.values())
  const sessionsTotal = sessionEntries.length
  const sessionsWithAssistant = sessionEntries.filter((entry) => entry.firstAssistantAt).length
  const sessionsConverted = sessionEntries.filter((entry) => entry.expanded).length
  const tutorialCompleted = sessionEntries.filter((entry) => entry.tutorialCompleted).length

  const conversionRate = sessionsTotal > 0 ? (sessionsConverted / sessionsTotal) * 100 : 0
  const tutorialCompletionRate = sessionsTotal > 0 ? (tutorialCompleted / sessionsTotal) * 100 : 0
  const importFailureRate = importAttempts > 0 ? (importFailures / importAttempts) * 100 : 0

  const timeToFirstOutputValues: number[] = []
  for (const entry of sessionEntries) {
    if (entry.startedAt && entry.firstAssistantAt) {
      timeToFirstOutputValues.push((entry.firstAssistantAt - entry.startedAt) / 1000)
    }
  }
  const timeToFirstOutputAvgS =
    timeToFirstOutputValues.length > 0
      ? timeToFirstOutputValues.reduce((sum, value) => sum + value, 0) / timeToFirstOutputValues.length
      : null

  return {
    timestamp: now.toISOString(),
    period,
    project_id: projectId,
    sessions_total: sessionsTotal,
    sessions_with_assistant: sessionsWithAssistant,
    sessions_converted: sessionsConverted,
    conversion_rate: Number(conversionRate.toFixed(2)),
    time_to_first_output_avg_s: timeToFirstOutputAvgS === null ? null : Number(timeToFirstOutputAvgS.toFixed(2)),
    tutorial_completion_rate: Number(tutorialCompletionRate.toFixed(2)),
    import_attempts: importAttempts,
    import_failures: importFailures,
    import_failure_rate: Number(importFailureRate.toFixed(2)),
    usage_split: {
      chat_only: Math.max(0, sessionsTotal - sessionsConverted),
      expanded_to_canvas: sessionsConverted,
    },
  }
}
