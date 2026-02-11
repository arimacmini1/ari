-- F09-MH-03: Plugin install/uninstall tracking

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS plugin_installations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plugin_id UUID NOT NULL REFERENCES plugins(id) ON DELETE CASCADE,
  version_id UUID NOT NULL REFERENCES plugin_versions(id) ON DELETE CASCADE,
  installed_by TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('installed', 'disabled', 'uninstalled')),
  installed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (plugin_id)
);

CREATE INDEX IF NOT EXISTS idx_plugin_installations_status
  ON plugin_installations (status, updated_at DESC);
