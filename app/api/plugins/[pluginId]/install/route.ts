import { NextRequest, NextResponse } from 'next/server';
import { createAuditLog } from '@/lib/audit/audit-service';
import { getPluginById } from '@/lib/plugins/registry-service';
import { installPlugin } from '@/lib/plugins/installation-service';
import { resolveProjectContext } from '@/lib/project-context';
import { enforceProjectPermission } from '@/lib/project-rbac';

export async function POST(
  req: NextRequest,
  { params }: { params: { pluginId: string } }
) {
  const projectContext = resolveProjectContext(req);
  if (!projectContext.ok) {
    return projectContext.response;
  }

  const result = await enforceProjectPermission(req, {
    projectId: projectContext.projectId,
    permission: 'assign',
    action: 'update',
    resourceType: 'plugin',
    resourceId: params.pluginId,
  });
  if (!result.allowed) return result.response!;

  const plugin = await getPluginById(params.pluginId);
  if (!plugin) {
    return NextResponse.json({ error: 'Plugin not found' }, { status: 404 });
  }

  const body = await req.json();
  const versionId = body?.versionId ? String(body.versionId) : undefined;

  const installation = await installPlugin(plugin.id, result.userId, versionId);

  await createAuditLog({
    actor: result.userId,
    action: 'update',
    resource_type: 'plugin',
    resource_id: plugin.id,
    context: {
      status: 'installed',
      version_id: installation.version_id,
      project_id: projectContext.projectId,
    },
  });

  return NextResponse.json({ installation });
}
