import { NextRequest, NextResponse } from 'next/server';
import { enforcePermission } from '@/lib/rbac/enforce';
import { createAuditLog } from '@/lib/audit/audit-service';
import { getPluginById } from '@/lib/plugins/registry-service';
import { setPluginEnabled } from '@/lib/plugins/installation-service';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ pluginId: string }> }
) {
  const { pluginId } = await params;
  const result = await enforcePermission(req, {
    permission: 'assign',
    action: 'update',
    resourceType: 'plugin',
    resourceId: pluginId,
  });
  if (!result.allowed) return result.response!;

  const plugin = await getPluginById(pluginId);
  if (!plugin) {
    return NextResponse.json({ error: 'Plugin not found' }, { status: 404 });
  }

  const body = await req.json();
  const enabled = Boolean(body?.enabled);

  const installation = await setPluginEnabled(plugin.id, enabled);
  if (!installation) {
    return NextResponse.json({ error: 'Plugin not installed' }, { status: 404 });
  }

  await createAuditLog({
    timestamp: new Date(),
    actor: result.userId,
    action: 'update',
    resource_type: 'plugin',
    resource_id: plugin.id,
    context: {
      status: enabled ? 'installed' : 'disabled',
      version_id: installation.version_id,
    },
  });

  return NextResponse.json({ installation });
}
