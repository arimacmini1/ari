import { TraceCompareStatus } from "@/lib/trace-compare-model"

export interface TraceForkJob {
  fork_id: string
  project_id: string
  status: TraceCompareStatus
  created_at: string
  updated_at: string
  base_execution_id: string
  fork_node_id: string
  selected_alternative_outcome: string
  fork_execution_id?: string
  note?: string
  affected_nodes?: number
  mode?: "scoped" | "full"
  timings_ms?: {
    fork_exec_ms?: number
  }
  error?: string
}

declare global {
  var __aei_trace_fork_jobs: Map<string, TraceForkJob> | undefined
}

function getStore(): Map<string, TraceForkJob> {
  if (!globalThis.__aei_trace_fork_jobs) {
    globalThis.__aei_trace_fork_jobs = new Map<string, TraceForkJob>()
  }
  return globalThis.__aei_trace_fork_jobs
}

export function createForkJob(job: Omit<TraceForkJob, "created_at" | "updated_at">): TraceForkJob {
  const now = new Date().toISOString()
  const record: TraceForkJob = {
    ...job,
    created_at: now,
    updated_at: now,
  }
  getStore().set(record.fork_id, record)
  return record
}

export function updateForkJob(
  forkId: string,
  patch: Partial<Omit<TraceForkJob, "fork_id" | "created_at">>
): TraceForkJob | null {
  const store = getStore()
  const existing = store.get(forkId)
  if (!existing) return null
  const next: TraceForkJob = {
    ...existing,
    ...patch,
    updated_at: new Date().toISOString(),
  }
  store.set(forkId, next)
  return next
}

export function getForkJob(forkId: string): TraceForkJob | null {
  const found = getStore().get(forkId)
  return found ? { ...found } : null
}
