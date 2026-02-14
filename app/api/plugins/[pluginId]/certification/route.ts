import { NextRequest, NextResponse } from 'next/server'
import { enforcePermission } from '@/lib/rbac/enforce'
import { createAuditLog } from '@/lib/audit/audit-service'
import { getPluginById, getPluginVersionById } from '@/lib/plugins/registry-service'
import { PluginCertificationSubmitSchema } from '@/lib/plugins/certification-schema'
import { getCertificationForVersion, submitCertificationRequest } from '@/lib/plugins/certification-service'

export async function GET(
  _req: NextRequest,
  { params }: { params: { pluginId: string } }
) {
  const plugin = await getPluginById(params.pluginId)
  if (!plugin) return NextResponse.json({ error: 'Plugin not found' }, { status: 404 })

  return NextResponse.json({ plugin_id: plugin.id })
}

export async function POST(
  req: NextRequest,
  { params }: { params: { pluginId: string } }
) {
  const result = await enforcePermission(req, {
    permission: 'assign',
    action: 'create',
    resourceType: 'plugin',
    resourceId: params.pluginId,
  })
  if (!result.allowed) return result.response!

  const plugin = await getPluginById(params.pluginId)
  if (!plugin) return NextResponse.json({ error: 'Plugin not found' }, { status: 404 })

  const body = await req.json()
  const parsed = PluginCertificationSubmitSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const version = await getPluginVersionById(parsed.data.versionId)
  if (!version || version.plugin_id !== plugin.id) {
    return NextResponse.json({ error: 'Plugin version not found' }, { status: 404 })
  }

  const requestRow = await submitCertificationRequest({ pluginId: plugin.id, versionId: version.id })

  await createAuditLog({
    actor: result.userId,
    action: 'create',
    resource_type: 'plugin',
    resource_id: plugin.id,
    context: {
      certification_request_id: requestRow.id,
      version_id: requestRow.version_id,
      status: requestRow.status,
    },
  })

  const existing = await getCertificationForVersion(version.id)
  return NextResponse.json({ certification: existing ?? requestRow }, { status: 201 })
}

