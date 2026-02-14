import type { TelemetryEvent } from '@/lib/telemetry-events'

declare global {
  var __aei_telemetry_db: Map<string, TelemetryEvent> | undefined
}

function getTelemetryDb(): Map<string, TelemetryEvent> {
  if (!globalThis.__aei_telemetry_db) {
    globalThis.__aei_telemetry_db = new Map<string, TelemetryEvent>()
  }
  return globalThis.__aei_telemetry_db
}

export function recordTelemetryEvent(event: TelemetryEvent): {
  status: 'stored' | 'duplicate'
  event: TelemetryEvent
} {
  const db = getTelemetryDb()
  if (db.has(event.event_id)) {
    return { status: 'duplicate', event: db.get(event.event_id)! }
  }
  db.set(event.event_id, event)
  return { status: 'stored', event }
}

export function listTelemetryEvents(filters?: {
  project_id?: string
  session_id?: string
  since?: string
}): TelemetryEvent[] {
  const db = getTelemetryDb()
  let events = Array.from(db.values())
  if (filters?.project_id) {
    events = events.filter((e) => e.project_id === filters.project_id)
  }
  if (filters?.session_id) {
    events = events.filter((e) => e.session_id === filters.session_id)
  }
  if (filters?.since) {
    const sinceTime = new Date(filters.since).getTime()
    if (!Number.isNaN(sinceTime)) {
      events = events.filter((e) => new Date(e.timestamp).getTime() >= sinceTime)
    }
  }
  return events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
}
