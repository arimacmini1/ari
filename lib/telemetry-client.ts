const TELEMETRY_ENDPOINT = "/api/telemetry/events"
const TELEMETRY_STORAGE_SUFFIX = "session_id"

export function getOrCreateTelemetrySessionId(storageKey: string): string {
  if (typeof window === "undefined") return "session-unknown"
  const key = `${storageKey}.${TELEMETRY_STORAGE_SUFFIX}`
  const existing = window.localStorage.getItem(key)
  if (existing) return existing
  const fallback = `session-${Math.random().toString(36).slice(2, 10)}`
  const nextId = typeof window.crypto?.randomUUID === "function" ? window.crypto.randomUUID() : fallback
  window.localStorage.setItem(key, nextId)
  return nextId
}

export async function emitTelemetryEvent(input: {
  storageKey: string
  eventName: string
  metadata?: Record<string, unknown>
}) {
  if (typeof window === "undefined") return
  const sessionId = getOrCreateTelemetrySessionId(input.storageKey)
  const eventId =
    typeof window.crypto?.randomUUID === "function"
      ? window.crypto.randomUUID()
      : `evt-${Math.random().toString(36).slice(2, 10)}`
  try {
    await fetch(TELEMETRY_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_id: eventId,
        event_name: input.eventName,
        session_id: sessionId,
        metadata: input.metadata,
      }),
    })
  } catch {
    // Telemetry is best-effort; never block core UX.
  }
}
