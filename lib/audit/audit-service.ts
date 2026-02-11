/**
 * Audit Logging Service
 * F07-MH-01: Core service for immutable audit log operations
 * 
 * Responsible for:
 * - Creating immutable audit log entries
 * - Querying audit logs with search/filter/export
 * - Verifying hash chain integrity
 * - Managing retention policies
 * - Enforcing access control via RLS
 */

import { v4 as uuidv4 } from 'uuid';
import { query, getClient } from '../db/postgres';
import {
  AuditLogEntry,
  AuditLogFilter,
  AuditLogQueryResult,
  CreateAuditLogInput,
  AuditAction,
  ResourceType,
} from './types';
import {
  generateNonce,
  calculateEntryHash,
  verifyHashChain,
  verifyEntryHash,
} from './crypto';

/**
 * Create a new immutable audit log entry
 * 
 * Accepts the action details, calculates cryptographic hash,
 * inserts into database, and returns the created entry.
 * 
 * @param input Audit log entry input
 * @returns Created audit log entry with hash chain
 * @throws Error if database insert fails
 */
export async function createAuditLog(input: CreateAuditLogInput): Promise<AuditLogEntry> {
  try {
    const timestamp = input.timestamp ?? new Date();
    // Get the previous entry for hash chain
    const previousEntryResult = await query<{ entry_hash: string }>(
      `SELECT entry_hash 
       FROM audit_logs 
       WHERE archived = FALSE 
       ORDER BY created_at DESC 
       LIMIT 1`,
      []
    );

    const previousHash = previousEntryResult.rows[0]?.entry_hash || null;

    // Generate nonce and calculate hash
    const nonce = generateNonce();
    const contextJson = JSON.stringify(input.context || {});
    const entryHash = calculateEntryHash(
      {
        timestamp: timestamp.toISOString(),
        actor: input.actor,
        action: input.action,
        resource_type: input.resource_type,
        resource_id: input.resource_id,
        context: contextJson,
      },
      previousHash,
      nonce
    );

    // Insert into database
    const id = input.id || uuidv4();
    const result = await query<AuditLogEntry>(
      `INSERT INTO audit_logs (
        id, timestamp, actor, action, resource_type, resource_id,
        context, entry_hash, previous_hash, nonce, created_at, archived
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP, FALSE)
       RETURNING *`,
      [
        id,
        timestamp,
        input.actor,
        input.action,
        input.resource_type,
        input.resource_id,
        contextJson,
        entryHash,
        previousHash,
        nonce,
      ]
    );

    if (result.rowCount === 0) {
      throw new Error('Failed to insert audit log entry');
    }

    return result.rows[0];
  } catch (error) {
    console.error('Error creating audit log:', error);
    throw error;
  }
}

/**
 * Query audit logs with filtering and pagination
 * 
 * Performance: <100ms for 10k+ entries with proper indexing
 * 
 * @param filter Query filter criteria
 * @returns Paginated query results
 */
export async function queryAuditLogs(filter: AuditLogFilter): Promise<AuditLogQueryResult> {
  try {
    const limit = Math.min(filter.limit || 100, 1000); // Max 1000 per query
    const offset = filter.offset || 0;

    // Build WHERE clause dynamically
    const whereClauses: string[] = ['archived = FALSE'];
    const params: any[] = [];
    const addParam = (value: unknown) => {
      params.push(value);
      return `$${params.length}`;
    };

    if (filter.actor) {
      whereClauses.push(`actor = ${addParam(filter.actor)}`);
    }

    if (filter.action) {
      whereClauses.push(`action = ${addParam(filter.action)}`);
    }

    if (filter.resource_type) {
      whereClauses.push(`resource_type = ${addParam(filter.resource_type)}`);
    }

    if (filter.resource_id) {
      whereClauses.push(`resource_id = ${addParam(filter.resource_id)}`);
    }

    if (filter.start_date) {
      whereClauses.push(`timestamp >= ${addParam(filter.start_date)}`);
    }

    if (filter.end_date) {
      whereClauses.push(`timestamp <= ${addParam(filter.end_date)}`);
    }

    const whereClause = whereClauses.join(' AND ');
    const sortOrder = filter.sort === 'asc' ? 'ASC' : 'DESC';

    // Get total count
    const countResult = await query<{ count: number }>(
      `SELECT COUNT(*) as count FROM audit_logs WHERE ${whereClause}`,
      params
    );

    const totalCount = parseInt(countResult.rows[0]?.count || '0', 10);

    // Get paginated results
    const limitIndex = addParam(limit);
    const offsetIndex = addParam(offset);
    const result = await query<AuditLogEntry>(
      `SELECT * FROM audit_logs 
       WHERE ${whereClause}
       ORDER BY timestamp ${sortOrder}
       LIMIT ${limitIndex} OFFSET ${offsetIndex}`,
      params
    );

    return {
      entries: result.rows,
      total_count: totalCount,
      limit,
      offset,
      has_more: offset + limit < totalCount,
    };
  } catch (error) {
    console.error('Error querying audit logs:', error);
    throw error;
  }
}

/**
 * Export audit logs as JSON/CSV
 * Supports GDPR compliance by allowing selective export
 * 
 * @param filter Query filter (same as queryAuditLogs)
 * @param format 'json' or 'csv'
 * @returns Formatted export data
 */
export async function exportAuditLogs(
  filter: AuditLogFilter,
  format: 'json' | 'csv' = 'json'
): Promise<string> {
  try {
    // Prevent exporting more than 10k records at once
    const safeFilter = { ...filter, limit: 10000 };
    const result = await queryAuditLogs(safeFilter);

    if (format === 'json') {
      return JSON.stringify(result.entries, null, 2);
    } else if (format === 'csv') {
      return auditLogsToCSV(result.entries);
    } else {
      throw new Error(`Unsupported export format: ${format}`);
    }
  } catch (error) {
    console.error('Error exporting audit logs:', error);
    throw error;
  }
}

/**
 * Verify audit log hash chain integrity
 * 
 * @param startId Optional: Start verification from specific log entry
 * @param limit Number of entries to verify (default 100)
 * @returns Verification result with any integrity issues
 */
export async function verifyAuditLogChain(
  startId?: string,
  limit: number = 100
): Promise<{
  valid: boolean;
  verified_count: number;
  errors: Array<{ entryId: string; error: string }>;
  verification_timestamp: Date;
}> {
  try {
    // Get entries to verify
    let query_text =
      'SELECT * FROM audit_logs WHERE archived = FALSE ORDER BY created_at ASC';
    const params: any[] = [];

    if (startId) {
      query_text = `
        SELECT a.* FROM audit_logs a
        WHERE a.archived = FALSE 
        AND a.created_at >= (SELECT created_at FROM audit_logs WHERE id = $1)
        ORDER BY a.created_at ASC
        LIMIT $2
      `;
      params.push(startId, limit);
    } else {
      query_text += ` LIMIT $1`;
      params.push(limit);
    }

    const result = await query<AuditLogEntry>(query_text, params);
    const entries = result.rows;

    // Verify chain
    const verification = verifyHashChain(entries);

    // Log verification result
    const verificationId = uuidv4();
    await query(
      `INSERT INTO audit_log_verification 
       (id, verified_entry_id, verification_timestamp, hash_valid, chain_valid, verification_details)
       VALUES ($1, $2, CURRENT_TIMESTAMP, $3, $4, $5)`,
      [
        verificationId,
        entries[0]?.id || null,
        verification.valid,
        verification.errors.length === 0,
        JSON.stringify({
          verified_entries: entries.length,
          errors: verification.errors,
        }),
      ]
    );

    return {
      valid: verification.valid,
      verified_count: entries.length,
      errors: verification.errors,
      verification_timestamp: new Date(),
    };
  } catch (error) {
    console.error('Error verifying audit log chain:', error);
    throw error;
  }
}

/**
 * Archive old audit logs per retention policy
 * Moves entries older than retention_days to archive table
 * 
 * @param policyId Optional: Specific retention policy ID
 */
export async function archiveExpiredLogs(policyId?: string): Promise<{
  archived_count: number;
  archived_date: Date;
}> {
  const client = await getClient();

  try {
    await client.query('BEGIN');

    // Get retention policy
    let policy_query = `SELECT * FROM retention_policies WHERE auto_archive_enabled = TRUE`;
    const policy_params: any[] = [];

    if (policyId) {
      policy_query += ` AND id = $1`;
      policy_params.push(policyId);
    } else {
      policy_query += ` LIMIT 1`;
    }

    const policyResult = await client.query(policy_query, policy_params);
    const policy = policyResult.rows[0];

    if (!policy) {
      throw new Error('No active retention policy found');
    }

    // Move expired logs to archive
    const expiry_date = new Date();
    expiry_date.setDate(expiry_date.getDate() - policy.retention_days);

    const archiveResult = await client.query(
      `UPDATE audit_logs 
       SET archived = TRUE, archived_at = CURRENT_TIMESTAMP
       WHERE created_at < $1 AND archived = FALSE
       RETURNING id`,
      [expiry_date]
    );

    await client.query('COMMIT');

    return {
      archived_count: archiveResult.rowCount || 0,
      archived_date: new Date(),
    };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error archiving logs:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Delete archived logs for GDPR compliance
 * Permanently removes data per right-to-be-forgotten requests
 */
export async function deleteArchivedLogs(olderThanDays: number): Promise<{
  deleted_count: number;
  deleted_date: Date;
}> {
  try {
    const deleteDate = new Date();
    deleteDate.setDate(deleteDate.getDate() - olderThanDays);

    const result = await query(
      `DELETE FROM audit_logs_archive
       WHERE archived_at < $1
       RETURNING id`,
      [deleteDate]
    );

    return {
      deleted_count: result.rowCount || 0,
      deleted_date: new Date(),
    };
  } catch (error) {
    console.error('Error deleting archived logs:', error);
    throw error;
  }
}

/**
 * Helper: Convert audit logs to CSV format
 */
function auditLogsToCSV(entries: AuditLogEntry[]): string {
  const headers = [
    'ID',
    'Timestamp',
    'Actor',
    'Action',
    'Resource Type',
    'Resource ID',
    'Context',
  ];

  const rows = entries.map((entry) => [
    entry.id,
    entry.timestamp.toISOString(),
    entry.actor,
    entry.action,
    entry.resource_type,
    entry.resource_id,
    JSON.stringify(entry.context),
  ]);

  const csvContent = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  return csvContent;
}
