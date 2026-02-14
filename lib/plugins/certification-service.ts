import { query } from '@/lib/db/postgres'
import { getPluginVersionById } from '@/lib/plugins/registry-service'

export type CertificationStatus = 'submitted' | 'scanned' | 'approved' | 'denied'

export interface PluginCertificationRequest {
  id: string
  plugin_id: string
  version_id: string
  status: CertificationStatus
  scan_report: Record<string, any>
  decision_reason: string | null
  decided_by: string | null
  decided_at: string | null
  created_at: string
  updated_at: string
}

function runSafetyChecks(input: {
  permissions: string[]
  entrypoint: string
}): { ok: boolean; report: Record<string, any> } {
  const warnings: string[] = []
  const failures: string[] = []

  const permissions = Array.isArray(input.permissions) ? input.permissions : []
  const entrypoint = String(input.entrypoint || '')

  if (entrypoint.includes('..') || entrypoint.startsWith('/') || entrypoint.startsWith('~')) {
    failures.push('Invalid entrypoint path')
  }

  if (permissions.includes('secrets')) {
    warnings.push('Requests secrets permission (high risk)')
  }

  if (permissions.includes('filesystem')) {
    warnings.push('Requests filesystem permission (review carefully)')
  }

  if (permissions.includes('network')) {
    warnings.push('Requests network permission (review egress controls)')
  }

  const ok = failures.length === 0
  return {
    ok,
    report: {
      checks: [
        { id: 'entrypoint_path', status: failures.includes('Invalid entrypoint path') ? 'fail' : 'pass' },
        { id: 'permissions_review', status: 'pass', warnings },
      ],
      failures,
      warnings,
      note:
        'This is a lightweight built-in safety check. Full static analysis/CVE scanning requires external integrations.',
    },
  }
}

export async function submitCertificationRequest(input: {
  pluginId: string
  versionId: string
}): Promise<PluginCertificationRequest> {
  const version = await getPluginVersionById(input.versionId)
  if (!version || version.plugin_id !== input.pluginId) {
    throw new Error('Plugin version not found')
  }

  const checks = runSafetyChecks({
    permissions: Array.isArray(version.permissions) ? (version.permissions as any) : [],
    entrypoint: (version.manifest_json as any)?.entrypoint ?? '',
  })

  const inserted = await query<PluginCertificationRequest>(
    `
    INSERT INTO plugin_certification_requests (plugin_id, version_id, status, scan_report)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (version_id)
    DO UPDATE SET status = EXCLUDED.status, scan_report = EXCLUDED.scan_report, updated_at = CURRENT_TIMESTAMP
    RETURNING id, plugin_id, version_id, status, scan_report, decision_reason, decided_by, decided_at, created_at, updated_at
    `,
    [input.pluginId, input.versionId, 'scanned', JSON.stringify(checks.report)]
  )

  const row = inserted.rows[0]
  if (!row) throw new Error('Failed to create certification request')
  return row
}

export async function decideCertificationRequest(input: {
  requestId: string
  status: 'approved' | 'denied'
  decidedBy: string
  reason?: string
}): Promise<PluginCertificationRequest | null> {
  const result = await query<PluginCertificationRequest>(
    `
    UPDATE plugin_certification_requests
    SET status = $2, decision_reason = $3, decided_by = $4, decided_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING id, plugin_id, version_id, status, scan_report, decision_reason, decided_by, decided_at, created_at, updated_at
    `,
    [input.requestId, input.status, input.reason ?? null, input.decidedBy]
  )
  return result.rows[0] ?? null
}

export async function getCertificationForVersion(versionId: string): Promise<PluginCertificationRequest | null> {
  const result = await query<PluginCertificationRequest>(
    `
    SELECT id, plugin_id, version_id, status, scan_report, decision_reason, decided_by, decided_at, created_at, updated_at
    FROM plugin_certification_requests
    WHERE version_id = $1
    LIMIT 1
    `,
    [versionId]
  )
  return result.rows[0] ?? null
}

