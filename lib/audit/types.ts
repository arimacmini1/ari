/**
 * Audit Log Types and Interfaces
 * F07-MH-01: Design immutable audit log schema
 * 
 * Defines all types for audit logging system including actions, contexts, and search filters.
 */

import { z } from 'zod';

/**
 * Supported audit log actions
 * These are immutable and cannot be changed for compliance reasons
 */
export type AuditAction =
  | 'execute'
  | 'assign'
  | 'override'
  | 'pause'
  | 'resume'
  | 'delete'
  | 'create'
  | 'update'
  | 'export'
  | 'access';

/**
 * Resource types that can be audited
 */
export type ResourceType =
  | 'workflow'
  | 'task'
  | 'agent'
  | 'plugin'
  | 'plugin_execution'
  | 'user'
  | 'role'
  | 'permission'
  | 'config'
  | 'report';

/**
 * Audit log entry - immutable record
 * Each entry has a unique cryptographic hash to prevent tampering
 */
export interface AuditLogEntry {
  id: string; // UUID
  timestamp: Date; // When action occurred (UTC)
  actor: string; // User ID or system identifier
  action: AuditAction; // What action was performed
  resource_type: ResourceType; // What type of resource
  resource_id: string; // Specific resource ID
  context: Record<string, any>; // Additional context data
  
  // Cryptographic integrity fields
  entry_hash: string; // HMAC-SHA256 hash of this entry
  previous_hash: string; // Hash of previous entry (chain)
  nonce: string; // Random nonce used in hash calculation
  
  // Immutability markers
  created_at: Date; // When record was inserted
  archived: boolean; // Soft delete for retention policies
  archived_at?: Date; // When/if archived
}

/**
 * Zod validation schema for audit log entry creation
 */
export const AuditLogEntrySchema = z.object({
  id: z.string().uuid().optional(),
  timestamp: z.date().default(() => new Date()),
  actor: z.string().min(1, 'Actor cannot be empty'),
  action: z.enum([
    'execute',
    'assign',
    'override',
    'pause',
    'resume',
    'delete',
    'create',
    'update',
    'export',
    'access',
  ]),
  resource_type: z.enum([
    'workflow',
    'task',
    'agent',
    'plugin',
    'plugin_execution',
    'user',
    'role',
    'permission',
    'config',
    'report',
  ]),
  resource_id: z.string().min(1),
  context: z.record(z.any()).default({}),
});

export type CreateAuditLogInput = z.infer<typeof AuditLogEntrySchema>;

/**
 * Query filters for audit log search
 */
export interface AuditLogFilter {
  actor?: string; // Filter by user/system
  action?: AuditAction; // Filter by action type
  resource_type?: ResourceType; // Filter by resource type
  resource_id?: string; // Filter by specific resource
  start_date?: Date; // Filter by date range start
  end_date?: Date; // Filter by date range end
  limit?: number; // Pagination limit (default 100, max 1000)
  offset?: number; // Pagination offset
  sort?: 'asc' | 'desc'; // Sort by timestamp
}

/**
 * Audit log query results with pagination
 */
export interface AuditLogQueryResult {
  entries: AuditLogEntry[];
  total_count: number;
  limit: number;
  offset: number;
  has_more: boolean;
}

/**
 * Retention policy for audit logs
 */
export interface RetentionPolicy {
  id: string;
  name: string;
  description: string;
  retention_days: number; // How long to keep active logs
  auto_archive_enabled: boolean; // Auto-archive after retention_days
  auto_delete_enabled: boolean; // Auto-delete archived logs
  archive_retention_days?: number; // Keep archived for N days before delete
  gdpr_purge_enabled: boolean; // Support GDPR right-to-be-forgotten
}

/**
 * Encryption metadata for audit logs
 */
export interface AuditLogEncryption {
  algorithm: 'hmac-sha256' | 'aes-256-gcm';
  key_version: number;
  key_rotation_date: Date;
  encrypted: boolean;
}
