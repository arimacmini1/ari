import { NextRequest, NextResponse } from 'next/server';
import { enforcePermission } from '@/lib/rbac/enforce';
import { getPluginVersionById } from '@/lib/plugins/registry-service';
import { executePlugin } from '@/lib/plugins/sandbox-runtime';

export async function POST(
  req: NextRequest,
  { params }: { params: { pluginId: string } }
) {
  const result = await enforcePermission(req, {
    permission: 'execute',
    action: 'execute',
    resourceType: 'plugin',
    resourceId: params.pluginId,
  });
  if (!result.allowed) return result.response!;

  const body = await req.json();
  const versionId = String(body?.versionId || '');
  if (!versionId) {
    return NextResponse.json({ error: 'versionId is required' }, { status: 400 });
  }

  const version = await getPluginVersionById(versionId);
  if (!version || version.plugin_id !== params.pluginId) {
    return NextResponse.json({ error: 'Plugin version not found' }, { status: 404 });
  }

  const execution = await executePlugin(result.userId, {
    versionId,
    requestedPermissions: Array.isArray(body?.requestedPermissions) ? body.requestedPermissions : [],
    resourceLimits: body?.resourceLimits,
    input: body?.input,
  });

  return NextResponse.json({ execution });
}
