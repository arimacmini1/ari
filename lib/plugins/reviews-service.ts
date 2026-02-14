import { query } from '@/lib/db/postgres'

export type PluginReviewStatus = 'pending' | 'approved' | 'rejected'

export interface PluginReviewRecord {
  id: string
  plugin_id: string
  version_id: string
  user_id: string
  rating: number
  review_text: string
  status: PluginReviewStatus
  moderation_note: string | null
  moderated_by: string | null
  moderated_at: string | null
  created_at: string
  updated_at: string
}

export interface PluginReviewReportRecord {
  id: string
  review_id: string
  plugin_id: string
  reported_by: string
  reason: string
  created_at: string
}

export async function listPluginReviews(options: {
  pluginId: string
  status?: PluginReviewStatus
  limit?: number
  offset?: number
}): Promise<PluginReviewRecord[]> {
  const limit = Math.min(Math.max(options.limit ?? 50, 1), 200)
  const offset = Math.max(options.offset ?? 0, 0)

  const params: any[] = [options.pluginId, limit, offset]
  const statusClause = options.status ? `AND status = $4` : ''
  if (options.status) params.push(options.status)

  const result = await query<PluginReviewRecord>(
    `
    SELECT
      id, plugin_id, version_id, user_id, rating, review_text, status,
      moderation_note, moderated_by, moderated_at, created_at, updated_at
    FROM plugin_reviews
    WHERE plugin_id = $1
    ${statusClause}
    ORDER BY created_at DESC
    LIMIT $2
    OFFSET $3
    `,
    params
  )
  return result.rows
}

export async function createPluginReview(input: {
  pluginId: string
  versionId: string
  userId: string
  rating: number
  reviewText: string
}): Promise<PluginReviewRecord> {
  const result = await query<PluginReviewRecord>(
    `
    INSERT INTO plugin_reviews (plugin_id, version_id, user_id, rating, review_text, status)
    VALUES ($1, $2, $3, $4, $5, 'pending')
    ON CONFLICT (plugin_id, version_id, user_id)
    DO UPDATE SET rating = EXCLUDED.rating, review_text = EXCLUDED.review_text, status = 'pending', updated_at = CURRENT_TIMESTAMP
    RETURNING
      id, plugin_id, version_id, user_id, rating, review_text, status,
      moderation_note, moderated_by, moderated_at, created_at, updated_at
    `,
    [input.pluginId, input.versionId, input.userId, input.rating, input.reviewText]
  )

  const row = result.rows[0]
  if (!row) {
    throw new Error('Failed to create review')
  }
  return row
}

export async function moderatePluginReview(input: {
  reviewId: string
  status: Exclude<PluginReviewStatus, 'pending'>
  moderatorId: string
  note?: string
}): Promise<PluginReviewRecord | null> {
  const result = await query<PluginReviewRecord>(
    `
    UPDATE plugin_reviews
    SET
      status = $2,
      moderation_note = $3,
      moderated_by = $4,
      moderated_at = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING
      id, plugin_id, version_id, user_id, rating, review_text, status,
      moderation_note, moderated_by, moderated_at, created_at, updated_at
    `,
    [input.reviewId, input.status, input.note ?? null, input.moderatorId]
  )
  return result.rows[0] ?? null
}

export async function reportPluginReview(input: {
  reviewId: string
  pluginId: string
  reporterId: string
  reason: string
}): Promise<PluginReviewReportRecord> {
  const result = await query<PluginReviewReportRecord>(
    `
    INSERT INTO plugin_review_reports (review_id, plugin_id, reported_by, reason)
    VALUES ($1, $2, $3, $4)
    RETURNING id, review_id, plugin_id, reported_by, reason, created_at
    `,
    [input.reviewId, input.pluginId, input.reporterId, input.reason]
  )

  const row = result.rows[0]
  if (!row) throw new Error('Failed to create abuse report')
  return row
}

