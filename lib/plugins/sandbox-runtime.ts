import { query } from '@/lib/db/postgres';
import { createAuditLog } from '@/lib/audit/audit-service';
import { getPluginVersionById } from '@/lib/plugins/registry-service';

export type PluginExecutionStatus = 'running' | 'completed' | 'failed' | 'denied';

export interface PluginExecutionRequest {
  versionId: string;
  requestedPermissions: string[];
  resourceLimits?: {
    cpuMs?: number;
    memoryMb?: number;
    timeoutMs?: number;
  };
  input?: Record<string, any>;
}

export interface PluginExecutionResult {
  execution_id: string;
  status: PluginExecutionStatus;
  granted_permissions: string[];
  output?: Record<string, any>;
  error?: string;
}

function intersection(a: string[], b: string[]): string[] {
  const setB = new Set(b);
  return a.filter((item) => setB.has(item));
}

export async function executePlugin(
  actor: string,
  request: PluginExecutionRequest
): Promise<PluginExecutionResult> {
  const version = await getPluginVersionById(request.versionId);
  if (!version) {
    return {
      execution_id: 'unknown',
      status: 'failed',
      granted_permissions: [],
      error: 'Plugin version not found',
    };
  }

  const allowedPermissions = Array.isArray(version.permissions) ? version.permissions : [];
  const requested = request.requestedPermissions || [];
  const granted = intersection(requested, allowedPermissions);
  const denied = requested.filter((perm) => !granted.includes(perm));

  const resourceLimits = {
    cpuMs: request.resourceLimits?.cpuMs ?? 2000,
    memoryMb: request.resourceLimits?.memoryMb ?? 128,
    timeoutMs: request.resourceLimits?.timeoutMs ?? 3000,
  };

  const execution = await query<{ id: string }>(
    `INSERT INTO plugin_executions (plugin_id, version_id, status, requested_permissions, granted_permissions, resource_limits)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [
      version.plugin_id,
      version.id,
      denied.length ? 'denied' : 'running',
      JSON.stringify(requested),
      JSON.stringify(granted),
      JSON.stringify(resourceLimits),
    ]
  );

  const executionId = execution.rows[0]?.id || 'unknown';

  await createAuditLog({
    actor,
    action: 'execute',
    resource_type: 'plugin_execution',
    resource_id: executionId,
    context: {
      plugin_id: version.plugin_id,
      version_id: version.id,
      requested_permissions: requested,
      granted_permissions: granted,
      denied_permissions: denied,
    },
  });

  if (denied.length) {
    await createAuditLog({
      actor,
      action: 'access',
      resource_type: 'plugin_execution',
      resource_id: executionId,
      context: {
        plugin_id: version.plugin_id,
        version_id: version.id,
        denied_permissions: denied,
        reason: 'Requested permissions exceed plugin manifest allowlist',
      },
    });

    await query(
      `UPDATE plugin_executions
       SET status = 'denied', error = $2, completed_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [executionId, `Denied permissions: ${denied.join(', ')}`]
    );

    return {
      execution_id: executionId,
      status: 'denied',
      granted_permissions: granted,
      error: `Denied permissions: ${denied.join(', ')}`,
    };
  }

  await query(
    `UPDATE plugin_executions
     SET status = 'completed', completed_at = CURRENT_TIMESTAMP
     WHERE id = $1`,
    [executionId]
  );

  await createAuditLog({
    actor,
    action: 'update',
    resource_type: 'plugin_execution',
    resource_id: executionId,
    context: {
      plugin_id: version.plugin_id,
      version_id: version.id,
      status: 'completed',
    },
  });

  return {
    execution_id: executionId,
    status: 'completed',
    granted_permissions: granted,
    output: {
      message: 'Sandbox execution simulated. Runtime integration pending.',
    },
  };
}
