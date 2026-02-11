import { NextRequest, NextResponse } from 'next/server';
import { enforcePermission } from '@/lib/rbac/enforce';
import { createAuditLog } from '@/lib/audit/audit-service';
import { getPluginById } from '@/lib/plugins/registry-service';
import { uninstallPlugin } from '@/lib/plugins/installation-service';

export async function POST(
  req: NextRequest,
  { params }: { params: { pluginId: string } }
) {
  const result = await enforcePermission(req, {
    permission: 'assign',
    action: 'delete',
    resourceType: 'plugin',
    resourceId: params.pluginId,
  });
  if (!result.allowed) return result.response!;

  const plugin = await getPluginById(params.pluginId);
  if (!plugin) {
    return NextResponse.json({ error: 'Plugin not found' }, { status: 404 });
  }

  const installation = await uninstallPlugin(plugin.id);
  if (!installation) {
    return NextResponse.json({ error: 'Plugin not installed' }, { status: 404 });
  }

  await createAuditLog({
    actor: result.userId,
    action: 'delete',
    resource_type: 'plugin',
    resource_id: plugin.id,
    context: {
      status: 'uninstalled',
      version_id: installation.version_id,
    },
  });

  return NextResponse.json({ installation });
}
