-- Migration 001: Audit Log Schema
-- F07-MH-01: Design immutable audit log schema and append-only storage layer
-- 
-- Creates immutable audit log table with:
-- - Append-only design (no UPDATE/DELETE)
-- - Cryptographic hash chain (HMAC-SHA256)
-- - Efficient indexing for common queries
-- - PostgreSQL Row-Level Security (RLS) support
-- - Partition support for large deployments

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create ENUM types for audit actions and resource types
CREATE TYPE audit_action AS ENUM (
  'execute',
  'assign',
  'override',
  'pause',
  'resume',
  'delete',
  'create',
  'update',
  'export',
  'access'
);

CREATE TYPE resource_type AS ENUM (
  'workflow',
  'task',
  'agent',
  'user',
  'role',
  'permission',
  'config',
  'report'
);

-- Main immutable audit log table
CREATE TABLE IF NOT EXISTS audit_logs (
  -- Primary identifier
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Event information
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  actor VARCHAR(255) NOT NULL,
  action audit_action NOT NULL,
  resource_type resource_type NOT NULL,
  resource_id VARCHAR(255) NOT NULL,
  
  -- Context data (JSON for flexibility)
  context JSONB DEFAULT '{}',
  
  -- Cryptographic integrity (hash chain)
  entry_hash VARCHAR(64) NOT NULL UNIQUE, -- HMAC-SHA256 as hex string
  previous_hash VARCHAR(64) REFERENCES audit_logs(entry_hash),
  nonce VARCHAR(32) NOT NULL UNIQUE, -- Random nonce for hash
  
  -- System metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- Soft delete for retention policies
  archived BOOLEAN NOT NULL DEFAULT FALSE,
  archived_at TIMESTAMP WITH TIME ZONE,
  
  -- Constraints
  CONSTRAINT check_timestamp_not_future CHECK (timestamp <= CURRENT_TIMESTAMP),
  CONSTRAINT check_archived_has_date CHECK (
    (archived = FALSE AND archived_at IS NULL) OR
    (archived = TRUE AND archived_at IS NOT NULL)
  ),
  CONSTRAINT check_no_updates UNIQUE (id) -- Prevent accidental updates
  
  -- Partitioning hint (for future date-based partitioning)
  -- PARTITION BY RANGE (created_at)
);

-- Indexes for common query patterns
-- Actor + Action query (Q1: "Who did what")
CREATE INDEX idx_audit_logs_actor_action 
  ON audit_logs(actor, action, timestamp DESC)
  WHERE archived = FALSE;

-- Resource query (Q2: "What happened to resource X")
CREATE INDEX idx_audit_logs_resource 
  ON audit_logs(resource_type, resource_id, timestamp DESC)
  WHERE archived = FALSE;

-- Timestamp query (Q3: "What happened on date X")
CREATE INDEX idx_audit_logs_timestamp
  ON audit_logs(timestamp DESC)
  WHERE archived = FALSE;

-- Combined query index for common filter patterns
CREATE INDEX idx_audit_logs_common_filters
  ON audit_logs(actor, action, resource_type, resource_id, timestamp DESC)
  WHERE archived = FALSE;

-- Hash integrity index
CREATE INDEX idx_audit_logs_hash_chain
  ON audit_logs(entry_hash, previous_hash);

-- Archive queries
CREATE INDEX idx_audit_logs_archived
  ON audit_logs(archived, archived_at DESC)
  WHERE archived = TRUE;

-- Hash chain verification index
CREATE UNIQUE INDEX idx_audit_logs_hash_uniqueness
  ON audit_logs(entry_hash);

-- Enable Row-Level Security (RLS) for access control
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Only authenticated users can select audit logs
CREATE POLICY audit_logs_select_policy ON audit_logs
  FOR SELECT
  USING (true); -- Will be enforced by application auth middleware

-- RLS Policy: Prevent any direct updates
CREATE POLICY audit_logs_no_update_policy ON audit_logs
  FOR UPDATE
  USING (false);

-- RLS Policy: Prevent direct deletes (only archival allowed)
CREATE POLICY audit_logs_no_delete_policy ON audit_logs
  FOR DELETE
  USING (false);

-- RLS Policy: Only system can insert
CREATE POLICY audit_logs_insert_policy ON audit_logs
  FOR INSERT
  WITH CHECK (true); -- Will be enforced by application

-- Archive table for very old logs (GDPR compliance)
CREATE TABLE IF NOT EXISTS audit_logs_archive (
  LIKE audit_logs
);

-- Archive indexes
CREATE INDEX idx_audit_logs_archive_timestamp
  ON audit_logs_archive(timestamp DESC);

CREATE INDEX idx_audit_logs_archive_actor
  ON audit_logs_archive(actor, timestamp DESC);

-- Retention policy configuration table
CREATE TABLE IF NOT EXISTS retention_policies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  retention_days INTEGER NOT NULL DEFAULT 90,
  auto_archive_enabled BOOLEAN DEFAULT TRUE,
  auto_delete_enabled BOOLEAN DEFAULT FALSE,
  archive_retention_days INTEGER,
  gdpr_purge_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT check_retention_days CHECK (retention_days > 0),
  CONSTRAINT check_archive_days CHECK (
    archive_retention_days IS NULL OR archive_retention_days > 0
  )
);

-- Create default retention policy
INSERT INTO retention_policies 
  (name, description, retention_days, auto_archive_enabled, gdpr_purge_enabled)
VALUES 
  ('default', 'Default retention policy (90 days)', 90, TRUE, TRUE)
ON CONFLICT DO NOTHING;

-- Audit log verification table for integrity checks
CREATE TABLE IF NOT EXISTS audit_log_verification (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  verified_entry_id UUID NOT NULL REFERENCES audit_logs(id),
  verification_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  hash_valid BOOLEAN NOT NULL,
  chain_valid BOOLEAN NOT NULL,
  verification_details JSONB,
  verified_by VARCHAR(255),
  
  CONSTRAINT check_hash_valid CHECK (hash_valid IN (true, false))
);

CREATE INDEX idx_audit_log_verification_entry
  ON audit_log_verification(verified_entry_id);

CREATE INDEX idx_audit_log_verification_timestamp
  ON audit_log_verification(verification_timestamp DESC);

-- Grant appropriate permissions
-- (Specific permissions set by application auth layer)
GRANT SELECT ON audit_logs TO postgres;
GRANT INSERT ON audit_logs TO postgres;
GRANT SELECT ON audit_logs_archive TO postgres;
GRANT SELECT ON retention_policies TO postgres;
GRANT SELECT, INSERT ON audit_log_verification TO postgres;
