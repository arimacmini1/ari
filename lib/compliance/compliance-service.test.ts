import { describe, expect, it, vi, beforeEach } from 'vitest';
import { getComplianceSnapshot } from '@/lib/compliance/compliance-service';
import { query } from '@/lib/db/postgres';
import { verifyAuditLogChain } from '@/lib/audit/audit-service';

vi.mock('@/lib/db/postgres', () => ({
  query: vi.fn(),
}));

vi.mock('@/lib/audit/audit-service', () => ({
  verifyAuditLogChain: vi.fn(),
}));

describe('getComplianceSnapshot', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns framework controls and overall score', async () => {
    (query as any).mockImplementation((sql: string) => {
      if (sql.includes("pg_settings")) {
        return Promise.resolve({ rows: [{ setting: 'on' }], rowCount: 1 });
      }
      if (sql.includes('pg_stat_ssl')) {
        return Promise.resolve({ rows: [{ ssl: true, version: 'TLSv1.3' }], rowCount: 1 });
      }
      if (sql.includes("to_regclass('public.audit_logs')")) {
        return Promise.resolve({ rows: [{ exists: 'audit_logs' }], rowCount: 1 });
      }
      if (sql.includes('pg_class')) {
        return Promise.resolve({ rows: [{ relrowsecurity: true }], rowCount: 1 });
      }
      if (sql.includes('pg_policies')) {
        return Promise.resolve({ rows: [{ count: '3' }], rowCount: 1 });
      }
      if (sql.includes('COUNT(*)') && sql.includes('audit_logs')) {
        return Promise.resolve({ rows: [{ count: '5' }], rowCount: 1 });
      }
      if (sql.includes('rbac_roles')) {
        return Promise.resolve({ rows: [{ count: '4' }], rowCount: 1 });
      }
      if (sql.includes('compliance_manual_status')) {
        return Promise.resolve({ rows: [], rowCount: 0 });
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    });

    (verifyAuditLogChain as any).mockResolvedValue({
      valid: true,
      verified_count: 5,
      errors: [],
      verification_timestamp: new Date(),
    });

    const snapshot = await getComplianceSnapshot();

    expect(snapshot.frameworks.SOC2.length).toBeGreaterThan(0);
    expect(snapshot.frameworks.GDPR.length).toBeGreaterThan(0);
    expect(snapshot.frameworks.HIPAA.length).toBeGreaterThan(0);
    expect(snapshot.overall_score).toBeGreaterThan(0);
  });
});
