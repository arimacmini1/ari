import { NextRequest, NextResponse } from 'next/server'
import { enforcePermission } from '@/lib/rbac/enforce'
import { createAuditLog } from '@/lib/audit/audit-service'
import { PluginReviewReportSchema } from '@/lib/plugins/reviews-schema'
import { reportPluginReview } from '@/lib/plugins/reviews-service'

export async function POST(
  req: NextRequest,
  { params }: { params: { reviewId: string } }
) {
  const result = await enforcePermission(req, {
    permission: 'assign',
    action: 'create',
    resourceType: 'plugin',
    resourceId: `review_report:${params.reviewId}`,
  })
  if (!result.allowed) return result.response!

  const body = await req.json()
  const parsed = PluginReviewReportSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const pluginId = String(body?.pluginId || '').trim()
  if (!pluginId) return NextResponse.json({ error: 'pluginId is required' }, { status: 400 })

  const report = await reportPluginReview({
    reviewId: params.reviewId,
    pluginId,
    reporterId: result.userId,
    reason: parsed.data.reason,
  })

  await createAuditLog({
    actor: result.userId,
    action: 'create',
    resource_type: 'plugin',
    resource_id: report.plugin_id,
    context: {
      review_id: report.review_id,
      report_id: report.id,
      reason: report.reason,
    },
  })

  return NextResponse.json({ report }, { status: 201 })
}

