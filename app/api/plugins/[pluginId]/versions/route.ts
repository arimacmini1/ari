import { NextRequest, NextResponse } from 'next/server';
import { enforcePermission } from '@/lib/rbac/enforce';
import { createAuditLog } from '@/lib/audit/audit-service';
import { PluginPublishInputSchema } from '@/lib/plugins/registry-schema';
import { getPluginById, publishPluginVersion } from '@/lib/plugins/registry-service';

export async function POST(
  req: NextRequest,
  { params }: { params: { pluginId: string } }
) {
  const result = await enforcePermission(req, {
    permission: 'assign',
    action: 'create',
    resourceType: 'plugin',
    resourceId: params.pluginId,
  });
  if (!result.allowed) return result.response!;

  const plugin = await getPluginById(params.pluginId);
  if (!plugin) {
    return NextResponse.json({ error: 'Plugin not found' }, { status: 404 });
  }

  const body = await req.json();
  const parsed = PluginPublishInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const version = await publishPluginVersion(plugin.id, parsed.data.manifest);

  await createAuditLog({
    actor: result.userId,
    action: 'create',
    resource_type: 'plugin',
    resource_id: plugin.id,
    context: {
      name: plugin.name,
      version: version.version,
      version_id: version.id,
    },
  });

  return NextResponse.json({ version }, { status: 201 });
}
