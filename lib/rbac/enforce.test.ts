import { describe, expect, it, vi, beforeEach } from 'vitest';
import { enforcePermission } from '@/lib/rbac/enforce';

vi.mock('@/lib/rbac/rbac-service', () => ({
  ensureRbacSeed: vi.fn(),
  userHasPermission: vi.fn(),
}));

vi.mock('@/lib/audit/audit-service', () => ({
  createAuditLog: vi.fn(),
}));

const { ensureRbacSeed, userHasPermission } = await import('@/lib/rbac/rbac-service');
const { createAuditLog } = await import('@/lib/audit/audit-service');

describe('enforcePermission', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('denies when permission is missing and logs denial', async () => {
    (ensureRbacSeed as any).mockResolvedValue(undefined);
    (userHasPermission as any).mockResolvedValue({ allowed: false, role: null });

    const req = {
      headers: { get: (key: string) => (key === 'x-user-id' ? 'user-1' : null) },
      method: 'POST',
      nextUrl: { pathname: '/api/executions' },
    } as any;

    const result = await enforcePermission(req, {
      permission: 'execute',
      action: 'execute',
      resourceType: 'workflow',
      resourceId: 'rule-1',
    });

    expect(result.allowed).toBe(false);
    expect(createAuditLog).toHaveBeenCalled();
  });

  it('allows agent pause within own scope', async () => {
    (ensureRbacSeed as any).mockResolvedValue(undefined);
    (userHasPermission as any).mockResolvedValue({ allowed: true, role: 'Agent' });

    const req = {
      headers: { get: (key: string) => (key === 'x-user-id' ? 'agent-7' : null) },
      method: 'POST',
      nextUrl: { pathname: '/api/agents/agent-7/pause' },
    } as any;

    const result = await enforcePermission(req, {
      permission: 'pause',
      action: 'pause',
      resourceType: 'agent',
      resourceId: 'agent-7',
      context: { agent_id: 'agent-7' },
    });

    expect(result.allowed).toBe(true);
  });
});
