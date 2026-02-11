import { query } from "@/lib/db/postgres"

export type MergeStatus = "pending" | "approved" | "rejected"

export interface MergeRequest {
  id: string
  source_id: string
  target_id: string
  created_at: string
  status: MergeStatus
}

export async function listMergeRequests(status: MergeStatus = "pending"): Promise<MergeRequest[]> {
  const result = await query<MergeRequest>(
    `SELECT id, source_id, target_id, created_at, status
     FROM merge_requests
     WHERE status = $1
     ORDER BY created_at DESC`,
    [status]
  )
  return result.rows
}

export async function createMergeRequest(sourceId: string, targetId: string): Promise<MergeRequest> {
  const result = await query<MergeRequest>(
    `INSERT INTO merge_requests (source_id, target_id, status)
     VALUES ($1, $2, 'pending')
     RETURNING id, source_id, target_id, created_at, status`,
    [sourceId, targetId]
  )
  return result.rows[0]
}

export async function approveMergeRequest(id: string): Promise<MergeRequest | null> {
  const result = await query<MergeRequest>(
    `UPDATE merge_requests
     SET status = 'approved', updated_at = CURRENT_TIMESTAMP
     WHERE id = $1
     RETURNING id, source_id, target_id, created_at, status`,
    [id]
  )
  return result.rows[0] ?? null
}

export async function rejectMergeRequest(id: string): Promise<MergeRequest | null> {
  const result = await query<MergeRequest>(
    `UPDATE merge_requests
     SET status = 'rejected', updated_at = CURRENT_TIMESTAMP
     WHERE id = $1
     RETURNING id, source_id, target_id, created_at, status`,
    [id]
  )
  return result.rows[0] ?? null
}
