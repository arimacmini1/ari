-- RBAC schema for Feature 07 (F07-MH-03)
-- Stores roles, permissions, and user-role assignments.

CREATE TABLE IF NOT EXISTS rbac_roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(64) NOT NULL UNIQUE,
  description TEXT
);

CREATE TABLE IF NOT EXISTS rbac_permissions (
  id SERIAL PRIMARY KEY,
  name VARCHAR(64) NOT NULL UNIQUE,
  description TEXT
);

CREATE TABLE IF NOT EXISTS rbac_role_permissions (
  role_id INT NOT NULL REFERENCES rbac_roles(id) ON DELETE CASCADE,
  permission_id INT NOT NULL REFERENCES rbac_permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS rbac_user_roles (
  user_id VARCHAR(255) NOT NULL,
  role_id INT NOT NULL REFERENCES rbac_roles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, role_id)
);

CREATE INDEX IF NOT EXISTS idx_rbac_user_roles_user_id ON rbac_user_roles (user_id);
