import { NextRequest, NextResponse } from 'next/server'
import { enforcePermission } from '@/lib/rbac/enforce'
import { query } from '@/lib/db/postgres'

export async function GET(req: NextRequest) {
  const result = await enforcePermission(req, {
    permission: 'assign',
    action: 'access',
    resourceType: 'plugin',
    resourceId: 'certification_queue',
  })
  if (!result.allowed) return result.response!

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') || 'scanned'
  const limit = Math.min(Math.max(Number(searchParams.get('limit') || '50'), 1), 200)

  const rows = await query<any>(
    `
    SELECT
      c.id, c.plugin_id, c.version_id, c.status, c.scan_report, c.decision_reason, c.decided_by, c.decided_at, c.created_at,
      p.name as plugin_name,
      v.version as version
    FROM plugin_certification_requests c
    JOIN plugins p ON p.id = c.plugin_id
    JOIN plugin_versions v ON v.id = c.version_id
    WHERE c.status = $1
    ORDER BY c.created_at DESC
    LIMIT $2
    `,
    [status, limit]
  )

  return NextResponse.json({ requests: rows.rows })
}

