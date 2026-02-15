import { NextRequest, NextResponse } from 'next/server'
import { enforcePermission } from '@/lib/rbac/enforce'
import { createAuditLog } from '@/lib/audit/audit-service'
import { getPluginById, getPluginVersionById } from '@/lib/plugins/registry-service'
import { getInstallationForUser } from '@/lib/plugins/installation-service'
import { PluginReviewCreateSchema } from '@/lib/plugins/reviews-schema'
import { createPluginReview, listPluginReviews } from '@/lib/plugins/reviews-service'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ pluginId: string }> }
) {
  const { pluginId } = await params
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') || 'approved'
  const limit = Number(searchParams.get('limit') || '50')
  const offset = Number(searchParams.get('offset') || '0')

  const plugin = await getPluginById(pluginId)
  if (!plugin) return NextResponse.json({ error: 'Plugin not found' }, { status: 404 })

  const reviews = await listPluginReviews({
    pluginId: plugin.id,
    status: status === 'pending' || status === 'rejected' ? (status as any) : 'approved',
    limit,
    offset,
  })

  return NextResponse.json({ reviews })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ pluginId: string }> }
) {
  const { pluginId } = await params
  const result = await enforcePermission(req, {
    permission: 'assign',
    action: 'create',
    resourceType: 'plugin',
    resourceId: pluginId,
  })
  if (!result.allowed) return result.response!

  const plugin = await getPluginById(pluginId)
  if (!plugin) return NextResponse.json({ error: 'Plugin not found' }, { status: 404 })

  const installation = await getInstallationForUser(plugin.id, result.userId)
  if (!installation || installation.status === 'uninstalled') {
    return NextResponse.json({ error: 'Install required before reviewing.' }, { status: 400 })
  }

  const body = await req.json()
  const parsed = PluginReviewCreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const versionId = parsed.data.versionId || installation.version_id
  const version = await getPluginVersionById(versionId)
  if (!version || version.plugin_id !== plugin.id) {
    return NextResponse.json({ error: 'Plugin version not found' }, { status: 404 })
  }

  const review = await createPluginReview({
    pluginId: plugin.id,
    versionId: version.id,
    userId: result.userId,
    rating: parsed.data.rating,
    reviewText: parsed.data.reviewText ?? '',
  })

  await createAuditLog({
    timestamp: new Date(),
    actor: result.userId,
    action: 'create',
    resource_type: 'plugin',
    resource_id: plugin.id,
    context: {
      review_id: review.id,
      version_id: review.version_id,
      rating: review.rating,
      status: review.status,
    },
  })

  return NextResponse.json({ review }, { status: 201 })
}
