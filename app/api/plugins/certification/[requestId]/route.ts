import { NextRequest, NextResponse } from 'next/server'
import { enforcePermission } from '@/lib/rbac/enforce'
import { createAuditLog } from '@/lib/audit/audit-service'
import { PluginCertificationDecisionSchema } from '@/lib/plugins/certification-schema'
import { decideCertificationRequest } from '@/lib/plugins/certification-service'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { requestId: string } }
) {
  const result = await enforcePermission(req, {
    permission: 'assign',
    action: 'update',
    resourceType: 'plugin',
    resourceId: `certification:${params.requestId}`,
  })
  if (!result.allowed) return result.response!

  const body = await req.json()
  const parsed = PluginCertificationDecisionSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const updated = await decideCertificationRequest({
    requestId: params.requestId,
    status: parsed.data.status,
    decidedBy: result.userId,
    reason: parsed.data.reason,
  })
  if (!updated) return NextResponse.json({ error: 'Certification request not found' }, { status: 404 })

  await createAuditLog({
    actor: result.userId,
    action: 'update',
    resource_type: 'plugin',
    resource_id: updated.plugin_id,
    context: {
      certification_request_id: updated.id,
      version_id: updated.version_id,
      status: updated.status,
      decision_reason: updated.decision_reason,
    },
  })

  return NextResponse.json({ certification: updated })
}

