import { NextRequest, NextResponse } from 'next/server';
import { getLatestPluginVersion, getPluginById } from '@/lib/plugins/registry-service';

export async function GET(
  _req: NextRequest,
  { params }: { params: { pluginId: string } }
) {
  const plugin = await getPluginById(params.pluginId);
  if (!plugin) {
    return NextResponse.json({ error: 'Plugin not found' }, { status: 404 });
  }

  const latestVersion = await getLatestPluginVersion(plugin.id);
  return NextResponse.json({ plugin, latest_version: latestVersion });
}
