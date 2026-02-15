import { NextRequest, NextResponse } from 'next/server';
import { enforcePermission } from '@/lib/rbac/enforce';
import { createAuditLog } from '@/lib/audit/audit-service';
import { PluginPublishInputSchema } from '@/lib/plugins/registry-schema';
import { listPlugins, publishPlugin } from '@/lib/plugins/registry-service';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search') || undefined;
  const category = searchParams.get('category') || undefined;
  const compatibility = searchParams.get('compatibility') || undefined;

  const plugins = await listPlugins({ search, category, compatibility });
  return NextResponse.json({ plugins });
}

export async function POST(req: NextRequest) {
  const result = await enforcePermission(req, {
    permission: 'assign',
    action: 'create',
    resourceType: 'plugin',
    resourceId: 'registry',
  });
  if (!result.allowed) return result.response!;

  const body = await req.json();
  const parsed = PluginPublishInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { plugin, version } = await publishPlugin(parsed.data.manifest);

  await createAuditLog({
    timestamp: new Date(),
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

  return NextResponse.json({ plugin, version }, { status: 201 });
}
