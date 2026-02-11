import { query, getClient } from '@/lib/db/postgres';
import { PluginManifestInput } from '@/lib/plugins/registry-schema';

export interface PluginRecord {
  id: string;
  name: string;
  description: string;
  author: string;
  categories: string[];
  status: 'active' | 'deprecated' | 'disabled';
  created_at: string;
  updated_at: string;
}

export interface PluginVersionRecord {
  id: string;
  plugin_id: string;
  version: string;
  manifest_json: PluginManifestInput;
  compatibility: string[];
  permissions: string[];
  pricing: Record<string, any>;
  deprecated: boolean;
  created_at: string;
}

export interface PluginListItem extends PluginRecord {
  latest_version?: PluginVersionRecord;
}

export async function listPlugins(options: {
  search?: string;
  category?: string;
  compatibility?: string;
}): Promise<PluginListItem[]> {
  const { search, category, compatibility } = options;
  const params: any[] = [];
  const filters: string[] = [];

  if (search) {
    params.push(`%${search}%`);
    params.push(`%${search}%`);
    filters.push(`(p.name ILIKE $${params.length - 1} OR p.description ILIKE $${params.length})`);
  }

  if (category) {
    params.push(category);
    filters.push(`$${params.length} = ANY(p.categories)`);
  }

  if (compatibility) {
    params.push(compatibility);
    filters.push(`$${params.length} = ANY(v.compatibility)`);
  }

  const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

  const result = await query<PluginListItem & PluginVersionRecord>(
    `
    SELECT
      p.id, p.name, p.description, p.author, p.categories, p.status, p.created_at, p.updated_at,
      v.id as version_id, v.version, v.manifest_json, v.compatibility, v.permissions, v.pricing, v.deprecated, v.created_at as version_created_at
    FROM plugins p
    LEFT JOIN LATERAL (
      SELECT id, version, manifest_json, compatibility, permissions, pricing, deprecated, created_at
      FROM plugin_versions
      WHERE plugin_id = p.id
      ORDER BY created_at DESC
      LIMIT 1
    ) v ON true
    ${whereClause}
    ORDER BY p.updated_at DESC
    `,
    params
  );

  return result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    author: row.author,
    categories: row.categories || [],
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
    latest_version: row.version ? {
      id: (row as any).version_id,
      plugin_id: row.id,
      version: (row as any).version,
      manifest_json: (row as any).manifest_json,
      compatibility: (row as any).compatibility || [],
      permissions: (row as any).permissions || [],
      pricing: (row as any).pricing || {},
      deprecated: (row as any).deprecated ?? false,
      created_at: (row as any).version_created_at,
    } : undefined,
  }));
}

export async function getPluginById(pluginId: string): Promise<PluginRecord | null> {
  const result = await query<PluginRecord>(
    `SELECT id, name, description, author, categories, status, created_at, updated_at
     FROM plugins WHERE id = $1`,
    [pluginId]
  );
  return result.rows[0] ?? null;
}

export async function getLatestPluginVersion(pluginId: string): Promise<PluginVersionRecord | null> {
  const result = await query<PluginVersionRecord>(
    `SELECT id, plugin_id, version, manifest_json, compatibility, permissions, pricing, deprecated, created_at
     FROM plugin_versions
     WHERE plugin_id = $1
     ORDER BY created_at DESC
     LIMIT 1`,
    [pluginId]
  );
  return result.rows[0] ?? null;
}

export async function getPluginVersionById(versionId: string): Promise<PluginVersionRecord | null> {
  const result = await query<PluginVersionRecord>(
    `SELECT id, plugin_id, version, manifest_json, compatibility, permissions, pricing, deprecated, created_at
     FROM plugin_versions WHERE id = $1`,
    [versionId]
  );
  return result.rows[0] ?? null;
}

export async function publishPlugin(manifest: PluginManifestInput): Promise<{
  plugin: PluginRecord;
  version: PluginVersionRecord;
}> {
  const client = await getClient();
  const categories = manifest.categories?.length ? manifest.categories : (manifest.category ? [manifest.category] : []);

  try {
    await client.query('BEGIN');

    const existing = await client.query<PluginRecord>(
      `SELECT id, name, description, author, categories, status, created_at, updated_at
       FROM plugins WHERE name = $1`,
      [manifest.name]
    );

    let plugin: PluginRecord;
    if (existing.rows[0]) {
      plugin = existing.rows[0];
      await client.query(
        `UPDATE plugins SET description = $1, author = $2, categories = $3, updated_at = CURRENT_TIMESTAMP
         WHERE id = $4`,
        [manifest.description, manifest.author, categories, plugin.id]
      );
    } else {
      const inserted = await client.query<PluginRecord>(
        `INSERT INTO plugins (name, description, author, categories)
         VALUES ($1, $2, $3, $4)
         RETURNING id, name, description, author, categories, status, created_at, updated_at`,
        [manifest.name, manifest.description, manifest.author, categories]
      );
      plugin = inserted.rows[0];
    }

    const versionResult = await client.query<PluginVersionRecord>(
      `INSERT INTO plugin_versions (plugin_id, version, manifest_json, compatibility, permissions, pricing)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, plugin_id, version, manifest_json, compatibility, permissions, pricing, deprecated, created_at`,
      [
        plugin.id,
        manifest.version,
        manifest,
        manifest.compatibility || [],
        manifest.permissions || [],
        manifest.pricing || {},
      ]
    );

    await client.query('COMMIT');

    return { plugin, version: versionResult.rows[0] };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function publishPluginVersion(
  pluginId: string,
  manifest: PluginManifestInput
): Promise<PluginVersionRecord> {
  const result = await query<PluginVersionRecord>(
    `INSERT INTO plugin_versions (plugin_id, version, manifest_json, compatibility, permissions, pricing)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, plugin_id, version, manifest_json, compatibility, permissions, pricing, deprecated, created_at`,
    [
      pluginId,
      manifest.version,
      manifest,
      manifest.compatibility || [],
      manifest.permissions || [],
      manifest.pricing || {},
    ]
  );
  return result.rows[0];
}

export async function deprecatePluginVersion(versionId: string, deprecated: boolean): Promise<PluginVersionRecord | null> {
  const result = await query<PluginVersionRecord>(
    `UPDATE plugin_versions
     SET deprecated = $2
     WHERE id = $1
     RETURNING id, plugin_id, version, manifest_json, compatibility, permissions, pricing, deprecated, created_at`,
    [versionId, deprecated]
  );
  return result.rows[0] ?? null;
}
