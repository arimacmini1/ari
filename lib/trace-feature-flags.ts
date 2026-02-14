export interface TraceFeatureFlags {
  compare_disabled: boolean
  fork_disabled: boolean
}

declare global {
  var __aei_trace_feature_flags: TraceFeatureFlags | undefined
}

function initialFlags(): TraceFeatureFlags {
  return {
    compare_disabled: process.env.AEI_DISABLE_TRACE_COMPARE === "1",
    fork_disabled: process.env.AEI_DISABLE_TRACE_FORK === "1",
  }
}

function getStore(): TraceFeatureFlags {
  if (!globalThis.__aei_trace_feature_flags) {
    globalThis.__aei_trace_feature_flags = initialFlags()
  }
  return globalThis.__aei_trace_feature_flags
}

export function getTraceFeatureFlags(): TraceFeatureFlags {
  const store = getStore()
  return { ...store }
}

export function updateTraceFeatureFlags(next: Partial<TraceFeatureFlags>): TraceFeatureFlags {
  const store = getStore()
  if (typeof next.compare_disabled === "boolean") {
    store.compare_disabled = next.compare_disabled
  }
  if (typeof next.fork_disabled === "boolean") {
    store.fork_disabled = next.fork_disabled
  }
  return { ...store }
}
