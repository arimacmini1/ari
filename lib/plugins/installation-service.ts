import { query } from '@/lib/db/postgres';
import { getLatestPluginVersion } from '@/lib/plugins/registry-service';

export interface PluginInstallationRecord {
  id: string;
  plugin_id: string;
  version_id: string;
  installed_by: string;
  status: 'installed' | 'disabled' | 'uninstalled';
  installed_at: string;
  updated_at: string;
}

export interface PluginInstallationListItem extends PluginInstallationRecord {
  plugin_name: string;
  plugin_description: string;
  version: string;
}

export async function listInstallations(): Promise<PluginInstallationListItem[]> {
  const result = await query<PluginInstallationListItem>(
    `SELECT i.id, i.plugin_id, i.version_id, i.installed_by, i.status, i.installed_at, i.updated_at,
            p.name as plugin_name, p.description as plugin_description, v.version
     FROM plugin_installations i
     JOIN plugins p ON p.id = i.plugin_id
     JOIN plugin_versions v ON v.id = i.version_id
     ORDER BY i.updated_at DESC`
  );
  return result.rows;
}

export async function getInstallationForUser(
  pluginId: string,
  userId: string
): Promise<PluginInstallationRecord | null> {
  const result = await query<PluginInstallationRecord>(
    `SELECT id, plugin_id, version_id, installed_by, status, installed_at, updated_at
     FROM plugin_installations
     WHERE plugin_id = $1 AND installed_by = $2
     LIMIT 1`,
    [pluginId, userId]
  )
  return result.rows[0] ?? null
}

export async function installPlugin(
  pluginId: string,
  actor: string,
  versionId?: string
): Promise<PluginInstallationRecord> {
  let resolvedVersionId = versionId;
  if (!resolvedVersionId) {
    const latest = await getLatestPluginVersion(pluginId);
    if (!latest) {
      throw new Error('No plugin versions available');
    }
    resolvedVersionId = latest.id;
  }

  const result = await query<PluginInstallationRecord>(
    `INSERT INTO plugin_installations (plugin_id, version_id, installed_by, status)
     VALUES ($1, $2, $3, 'installed')
     ON CONFLICT (plugin_id)
     DO UPDATE SET version_id = EXCLUDED.version_id, status = 'installed', updated_at = CURRENT_TIMESTAMP
     RETURNING id, plugin_id, version_id, installed_by, status, installed_at, updated_at`,
    [pluginId, resolvedVersionId, actor]
  );

  return result.rows[0];
}

export async function uninstallPlugin(
  pluginId: string
): Promise<PluginInstallationRecord | null> {
  const result = await query<PluginInstallationRecord>(
    `UPDATE plugin_installations
     SET status = 'uninstalled', updated_at = CURRENT_TIMESTAMP
     WHERE plugin_id = $1
     RETURNING id, plugin_id, version_id, installed_by, status, installed_at, updated_at`,
    [pluginId]
  );
  return result.rows[0] ?? null;
}

export async function setPluginEnabled(
  pluginId: string,
  enabled: boolean
): Promise<PluginInstallationRecord | null> {
  const status = enabled ? 'installed' : 'disabled';
  const result = await query<PluginInstallationRecord>(
    `UPDATE plugin_installations
     SET status = $2, updated_at = CURRENT_TIMESTAMP
     WHERE plugin_id = $1
     RETURNING id, plugin_id, version_id, installed_by, status, installed_at, updated_at`,
    [pluginId, status]
  );
  return result.rows[0] ?? null;
}
