import { NextRequest, NextResponse } from 'next/server';
import { getPluginVersionById } from '@/lib/plugins/registry-service';
import { executePlugin } from '@/lib/plugins/sandbox-runtime';
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
