import { NextRequest, NextResponse } from 'next/server';
import { enforcePermission } from '@/lib/rbac/enforce';
import { listInstallations } from '@/lib/plugins/installation-service';

export async function GET(req: NextRequest) {
  const result = await enforcePermission(req, {
    permission: 'assign',
    action: 'access',
    resourceType: 'plugin',
    resourceId: 'installations',
  });
  if (!result.allowed) return result.response!;

  const installations = await listInstallations();
  return NextResponse.json({ installations });
}
