import { query } from '@/lib/db/postgres';
import { verifyAuditLogChain } from '@/lib/audit/audit-service';
import {
  AutoCheckKey,
  COMPLIANCE_CONTROLS,
  ComplianceControl,
  ComplianceFramework,
  ControlStatus,
} from '@/lib/compliance/controls';

interface AutoCheckResult {
  status: ControlStatus;
  evidence: string;
}

interface ManualStatusRow {
  control_id: string;
  status: ControlStatus;
  updated_by: string;
  updated_at: string;
  notes: string | null;
}

async function checkDatabaseSsl(): Promise<AutoCheckResult> {
  try {
    const sslSetting = await query<{ setting: string }>(
      "SELECT setting FROM pg_settings WHERE name = 'ssl'"
    );
    const sslEnabled = sslSetting.rows[0]?.setting === 'on';

    const sslSession = await query<{ ssl: boolean; version: string | null }>(
      'SELECT ssl, version FROM pg_stat_ssl WHERE pid = pg_backend_pid()'
    );
    const sessionSsl = sslSession.rows[0]?.ssl === true;

    if (sslEnabled && sessionSsl) {
      return {
        status: 'implemented',
        evidence: `SSL enabled. Session TLS ${sslSession.rows[0]?.version || 'active'}.`,
      };
    }

    return {
      status: 'in_progress',
      evidence: `SSL setting=${sslEnabled ? 'on' : 'off'}, session SSL=${sessionSsl ? 'on' : 'off'}.`,
    };
  } catch (error) {
    return {
      status: 'in_progress',
      evidence: 'DB SSL status unavailable.',
    };
  }
}

async function checkAuditLogsPresent(): Promise<AutoCheckResult> {
  try {
    const exists = await query<{ exists: string | null }>(
      "SELECT to_regclass('public.audit_logs') as exists"
    );
    const hasTable = Boolean(exists.rows[0]?.exists);
    return {
      status: hasTable ? 'implemented' : 'not_started',
      evidence: hasTable ? 'audit_logs table present.' : 'audit_logs table missing.',
    };
  } catch (error) {
    return {
      status: 'in_progress',
      evidence: 'Audit log table check failed.',
    };
  }
}

async function checkAuditRlsEnabled(): Promise<AutoCheckResult> {
  try {
    const rls = await query<{ relrowsecurity: boolean }>(
      "SELECT relrowsecurity FROM pg_class WHERE relname = 'audit_logs'"
    );
    const policies = await query<{ count: string }>(
      "SELECT COUNT(*)::text as count FROM pg_policies WHERE tablename = 'audit_logs'"
    );
    const enabled = rls.rows[0]?.relrowsecurity === true;
    const policyCount = parseInt(policies.rows[0]?.count || '0', 10);

    if (enabled && policyCount > 0) {
      return {
        status: 'implemented',
        evidence: `RLS enabled with ${policyCount} policies.`,
      };
    }

    return {
      status: 'in_progress',
      evidence: `RLS enabled=${enabled ? 'true' : 'false'}, policies=${policyCount}.`,
    };
  } catch (error) {
    return {
      status: 'in_progress',
      evidence: 'RLS status unavailable.',
    };
  }
}

async function checkAuditHashChain(): Promise<AutoCheckResult> {
  try {
    const count = await query<{ count: string }>(
      'SELECT COUNT(*)::text as count FROM audit_logs WHERE archived = FALSE'
    );
    const total = parseInt(count.rows[0]?.count || '0', 10);
    if (total === 0) {
      return {
        status: 'in_progress',
        evidence: 'No audit log entries to verify yet.',
      };
    }

    const result = await verifyAuditLogChain(undefined, Math.min(total, 50));
    if (result.valid) {
      return {
        status: 'implemented',
        evidence: `Verified ${result.verified_count} entries.`,
      };
    }

    return {
      status: 'in_progress',
      evidence: `Verification errors: ${result.errors.length}.`,
    };
  } catch (error) {
    return {
      status: 'in_progress',
      evidence: 'Hash chain verification unavailable.',
    };
  }
}

async function checkRbacSeeded(): Promise<AutoCheckResult> {
  try {
    const count = await query<{ count: string }>(
      'SELECT COUNT(*)::text as count FROM rbac_roles'
    );
    const total = parseInt(count.rows[0]?.count || '0', 10);
    return {
      status: total > 0 ? 'implemented' : 'not_started',
      evidence: total > 0 ? 'RBAC roles seeded.' : 'RBAC roles missing.',
    };
  } catch (error) {
    return {
      status: 'in_progress',
      evidence: 'RBAC check unavailable.',
    };
  }
}

async function runAutoChecks(): Promise<Record<AutoCheckKey, AutoCheckResult>> {
  const [dbSsl, auditLogs, auditRls, auditHash, rbacSeeded] = await Promise.all([
    checkDatabaseSsl(),
    checkAuditLogsPresent(),
    checkAuditRlsEnabled(),
    checkAuditHashChain(),
    checkRbacSeeded(),
  ]);

  return {
    db_ssl: dbSsl,
    audit_logs_present: auditLogs,
    audit_rls_enabled: auditRls,
    audit_hash_chain_verified: auditHash,
    rbac_seeded: rbacSeeded,
  };
}

async function loadManualStatuses(): Promise<Record<string, ManualStatusRow>> {
  try {
    const result = await query<ManualStatusRow>('SELECT * FROM compliance_manual_status');
    return result.rows.reduce<Record<string, ManualStatusRow>>((acc, row) => {
      acc[row.control_id] = row;
      return acc;
    }, {});
  } catch (error) {
    return {};
  }
}

export async function getComplianceSnapshot(): Promise<{
  frameworks: Record<ComplianceFramework, ComplianceControl[]>;
  overall_score: number;
}> {
  const [autoChecks, manualStatuses] = await Promise.all([
    runAutoChecks(),
    loadManualStatuses(),
  ]);

  const controls = COMPLIANCE_CONTROLS.map((control) => {
    if (control.type === 'auto' && control.autoCheck) {
      const result = autoChecks[control.autoCheck];
      return {
        ...control,
        status: result.status,
        evidence: result.evidence,
      };
    }

    const manual = manualStatuses[control.id];
    if (manual) {
      return {
        ...control,
        status: manual.status,
        evidence: `Updated by ${manual.updated_by} at ${manual.updated_at}. ${manual.notes || ''}`.trim(),
      };
    }

    return {
      ...control,
      status: control.status || 'not_started',
    };
  });

  const implementedCount = controls.filter((c) => c.status === 'implemented').length;
  const overall_score = controls.length
    ? Math.round((implementedCount / controls.length) * 100)
    : 0;

  return {
    frameworks: {
      SOC2: controls.filter((c) => c.framework === 'SOC2'),
      GDPR: controls.filter((c) => c.framework === 'GDPR'),
      HIPAA: controls.filter((c) => c.framework === 'HIPAA'),
    },
    overall_score,
  };
}

export async function updateManualControlStatus(
  controlId: string,
  status: ControlStatus,
  updatedBy: string,
  notes?: string
): Promise<void> {
  await query(
    `INSERT INTO compliance_manual_status (control_id, status, updated_by, notes)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (control_id)
     DO UPDATE SET status = EXCLUDED.status, updated_by = EXCLUDED.updated_by, updated_at = NOW(), notes = EXCLUDED.notes`,
    [controlId, status, updatedBy, notes || null]
  );
}
