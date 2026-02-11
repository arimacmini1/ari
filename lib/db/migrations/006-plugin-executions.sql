-- F09-MH-02: Plugin execution sandbox tracking

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS plugin_executions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plugin_id UUID NOT NULL REFERENCES plugins(id) ON DELETE CASCADE,
  version_id UUID NOT NULL REFERENCES plugin_versions(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'failed', 'denied')),
  requested_permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
  granted_permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
  resource_limits JSONB NOT NULL DEFAULT '{}'::jsonb,
  error TEXT,
  started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_plugin_exec_status
  ON plugin_executions (status, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_plugin_exec_plugin
  ON plugin_executions (plugin_id, started_at DESC);
