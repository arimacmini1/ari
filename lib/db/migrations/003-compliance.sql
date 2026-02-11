-- Compliance manual control status storage (F07-MH-04)

CREATE TABLE IF NOT EXISTS compliance_manual_status (
  control_id VARCHAR(128) PRIMARY KEY,
  status VARCHAR(32) NOT NULL,
  updated_by VARCHAR(255) NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_compliance_manual_status_updated_at
  ON compliance_manual_status (updated_at DESC);
