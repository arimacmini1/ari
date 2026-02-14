import { NextRequest, NextResponse } from 'next/server'
import { enforcePermission } from '@/lib/rbac/enforce'
import { query } from '@/lib/db/postgres'

export async function GET(req: NextRequest) {
  const result = await enforcePermission(req, {
    permission: 'assign',
    action: 'access',
    resourceType: 'plugin',
    resourceId: 'reviews_moderation',
  })
  if (!result.allowed) return result.response!

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') || 'pending'
  const limit = Math.min(Math.max(Number(searchParams.get('limit') || '50'), 1), 200)

  const rows = await query<any>(
    `
    SELECT
      r.id, r.plugin_id, r.version_id, r.user_id, r.rating, r.review_text, r.status, r.created_at,
      p.name as plugin_name,
      v.version as version
    FROM plugin_reviews r
    JOIN plugins p ON p.id = r.plugin_id
    JOIN plugin_versions v ON v.id = r.version_id
    WHERE r.status = $1
    ORDER BY r.created_at DESC
    LIMIT $2
    `,
    [status, limit]
  )

  return NextResponse.json({ reviews: rows.rows })
}

