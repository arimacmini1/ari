import { NextRequest, NextResponse } from 'next/server'
import { enforcePermission } from '@/lib/rbac/enforce'
import { createAuditLog } from '@/lib/audit/audit-service'
import { PluginReviewModerateSchema } from '@/lib/plugins/reviews-schema'
import { moderatePluginReview } from '@/lib/plugins/reviews-service'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ reviewId: string }> }
) {
  const { reviewId } = await params
  const result = await enforcePermission(req, {
    permission: 'assign',
    action: 'update',
    resourceType: 'plugin',
    resourceId: `review:${reviewId}`,
  })
  if (!result.allowed) return result.response!

  const body = await req.json()
  const parsed = PluginReviewModerateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const updated = await moderatePluginReview({
    reviewId,
    status: parsed.data.status,
    moderatorId: result.userId,
    note: parsed.data.note,
  })
  if (!updated) return NextResponse.json({ error: 'Review not found' }, { status: 404 })

  await createAuditLog({
    timestamp: new Date(),
    actor: result.userId,
    action: 'update',
    resource_type: 'plugin',
    resource_id: updated.plugin_id,
    context: {
      review_id: updated.id,
      version_id: updated.version_id,
      status: updated.status,
      moderation_note: updated.moderation_note,
    },
  })

  return NextResponse.json({ review: updated })
}
