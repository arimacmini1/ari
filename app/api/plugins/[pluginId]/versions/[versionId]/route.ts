import { NextRequest, NextResponse } from 'next/server';
import { enforcePermission } from '@/lib/rbac/enforce';
import { createAuditLog } from '@/lib/audit/audit-service';
import { deprecatePluginVersion, getPluginById, getPluginVersionById } from '@/lib/plugins/registry-service';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ pluginId: string; versionId: string }> }
) {
  const { pluginId, versionId } = await params;
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

  const version = await getPluginVersionById(versionId);
  if (!version || version.plugin_id !== plugin.id) {
    return NextResponse.json({ error: 'Version not found' }, { status: 404 });
  }

  const body = await req.json();
  const deprecated = Boolean(body?.deprecated);
  const updated = await deprecatePluginVersion(version.id, deprecated);

  await createAuditLog({
    timestamp: new Date(),
    actor: result.userId,
    action: 'update',
    resource_type: 'plugin',
    resource_id: plugin.id,
    context: {
      version_id: version.id,
      version: version.version,
      deprecated,
    },
  });

  return NextResponse.json({ version: updated });
}
