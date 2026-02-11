export interface MergeRequest {
  id: string
  source_id: string
  target_id: string
  created_at: string
  status: "pending" | "approved" | "rejected"
}

const store = new Map<string, MergeRequest>()

export function listMerges(): MergeRequest[] {
  return Array.from(store.values()).filter((m) => m.status === "pending")
}

export function createMerge(source_id: string, target_id: string): MergeRequest {
  const merge: MergeRequest = {
    id: `merge-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    source_id,
    target_id,
    created_at: new Date().toISOString(),
    status: "pending",
  }
  store.set(merge.id, merge)
  return merge
}

export function approveMerge(id: string): MergeRequest | null {
  const merge = store.get(id)
  if (!merge) return null
  merge.status = "approved"
  store.set(id, merge)
  return merge
}

export function rejectMerge(id: string): MergeRequest | null {
  const merge = store.get(id)
  if (!merge) return null
  merge.status = "rejected"
  store.set(id, merge)
  return merge
}
