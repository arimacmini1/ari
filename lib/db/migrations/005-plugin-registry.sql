-- F09-MH-01: Plugin registry schema (plugins + versions)

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS plugins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  author TEXT NOT NULL,
  categories TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'deprecated', 'disabled')),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS plugin_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plugin_id UUID NOT NULL REFERENCES plugins(id) ON DELETE CASCADE,
  version TEXT NOT NULL,
  manifest_json JSONB NOT NULL,
  compatibility TEXT[] NOT NULL DEFAULT '{}',
  permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
  pricing JSONB NOT NULL DEFAULT '{}'::jsonb,
  deprecated BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (plugin_id, version)
);

CREATE INDEX IF NOT EXISTS idx_plugins_name ON plugins (name);
CREATE INDEX IF NOT EXISTS idx_plugins_categories ON plugins USING GIN (categories);
CREATE INDEX IF NOT EXISTS idx_plugin_versions_plugin_created
  ON plugin_versions (plugin_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_plugin_versions_compatibility
  ON plugin_versions USING GIN (compatibility);
