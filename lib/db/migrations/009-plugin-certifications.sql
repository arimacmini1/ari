-- F09-MH-05: Plugin certification pipeline + safety checks

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS plugin_certification_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plugin_id UUID NOT NULL REFERENCES plugins(id) ON DELETE CASCADE,
  version_id UUID NOT NULL REFERENCES plugin_versions(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('submitted', 'scanned', 'approved', 'denied')) DEFAULT 'submitted',
  scan_report JSONB NOT NULL DEFAULT '{}'::jsonb,
  decision_reason TEXT,
  decided_by TEXT,
  decided_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (version_id)
);

CREATE INDEX IF NOT EXISTS idx_plugin_cert_requests_status_created
  ON plugin_certification_requests (status, created_at DESC);

