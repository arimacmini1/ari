import { randomUUID } from 'crypto'

export type TelemetryEventName =
  | 'session_started'
  | 'assistant_response'
  | 'draft_generated'
  | 'expanded_to_canvas'
  | 'tutorial_completed'
  | 'import_attempted'
  | 'import_failed'
  | 'migration_tip_shown'
  | 'migration_tip_dismissed'
  | 'migration_tip_clicked'

export interface TelemetryEvent {
  event_id: string
  event_name: TelemetryEventName
  schema_version: number
  timestamp: string
  project_id: string
  user_id: string
  session_id: string
  source: 'main_workspace_chat'
  metadata?: Record<string, unknown>
}

export interface TelemetryEventInput {
  event_id?: string
  event_name: string
  schema_version?: number
  timestamp?: string
  session_id?: string
  metadata?: Record<string, unknown>
}

export const TELEMETRY_SCHEMA_VERSION = 1

const ALLOWED_EVENTS = new Set<TelemetryEventName>([
  'session_started',
  'assistant_response',
  'draft_generated',
  'expanded_to_canvas',
  'tutorial_completed',
  'import_attempted',
  'import_failed',
  'migration_tip_shown',
  'migration_tip_dismissed',
  'migration_tip_clicked',
])

export function normalizeTelemetryEvent(input: TelemetryEventInput, context: {
  project_id: string
  user_id: string
  source: 'main_workspace_chat'
}): { ok: true; event: TelemetryEvent } | { ok: false; error: string } {
  if (!input || typeof input !== 'object') {
    return { ok: false, error: 'Missing telemetry payload.' }
  }
  if (!ALLOWED_EVENTS.has(input.event_name as TelemetryEventName)) {
    return { ok: false, error: `Unsupported telemetry event: ${input.event_name}` }
  }
  const timestamp = typeof input.timestamp === 'string' ? input.timestamp : new Date().toISOString()
  const parsed = new Date(timestamp)
  if (Number.isNaN(parsed.getTime())) {
    return { ok: false, error: 'Invalid telemetry timestamp.' }
  }
  const sessionId = typeof input.session_id === 'string' && input.session_id.trim()
    ? input.session_id.trim()
    : 'session-unknown'

  return {
    ok: true,
    event: {
      event_id: typeof input.event_id === 'string' && input.event_id.trim()
        ? input.event_id.trim()
        : `evt-${randomUUID()}`,
      event_name: input.event_name as TelemetryEventName,
      schema_version: typeof input.schema_version === 'number' ? input.schema_version : TELEMETRY_SCHEMA_VERSION,
      timestamp,
      project_id: context.project_id,
      user_id: context.user_id,
      session_id: sessionId,
      source: context.source,
      metadata: typeof input.metadata === 'object' && input.metadata ? input.metadata : undefined,
    },
  }
}
