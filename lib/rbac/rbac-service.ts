import { query } from '@/lib/db/postgres';
import {
  RBAC_PERMISSIONS,
  RBAC_ROLE_DESCRIPTIONS,
  RBAC_ROLES,
  RBAC_PERMISSION_DESCRIPTIONS,
  ROLE_PERMISSIONS,
  RbacPermission,
  RbacRole,
} from '@/lib/rbac/constants';

interface RoleRecord {
  id: number;
  name: string;
}

interface PermissionRecord {
  id: number;
  name: string;
}

export async function ensureRbacSeed(): Promise<void> {
  await query<{ count: string }>('SELECT COUNT(*)::text as count FROM rbac_roles');

  await query(
    `INSERT INTO rbac_roles (name, description)
     SELECT * FROM UNNEST ($1::text[], $2::text[])
     ON CONFLICT (name) DO NOTHING`,
    [RBAC_ROLES, RBAC_ROLES.map((role) => RBAC_ROLE_DESCRIPTIONS[role])]
  );

  await query(
    `INSERT INTO rbac_permissions (name, description)
     SELECT * FROM UNNEST ($1::text[], $2::text[])
     ON CONFLICT (name) DO NOTHING`,
    [RBAC_PERMISSIONS, RBAC_PERMISSIONS.map((perm) => RBAC_PERMISSION_DESCRIPTIONS[perm])]
  );

  const roleResult = await query<RoleRecord>('SELECT id, name FROM rbac_roles');
  const permResult = await query<PermissionRecord>('SELECT id, name FROM rbac_permissions');
  const roleRows = roleResult.rows;
  const permissionRows = permResult.rows;

  const roleIdByName = new Map(roleRows.map((row) => [row.name, row.id]));
  const permissionIdByName = new Map(permissionRows.map((row) => [row.name, row.id]));

  for (const role of RBAC_ROLES) {
    const roleId = roleIdByName.get(role);
    if (!roleId) continue;
    const permissionsForRole = ROLE_PERMISSIONS[role];

    for (const perm of permissionsForRole) {
      const permissionId = permissionIdByName.get(perm);
      if (!permissionId) continue;
      await query(
        `INSERT INTO rbac_role_permissions (role_id, permission_id)
         VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [roleId, permissionId]
      );
    }
  }

  const bootstrapAdminId = process.env.RBAC_BOOTSTRAP_ADMIN_USER_ID;
  if (bootstrapAdminId) {
    const adminRoleId = roleIdByName.get('Admin');
    if (adminRoleId) {
      await query(
        `INSERT INTO rbac_user_roles (user_id, role_id)
         VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [bootstrapAdminId, adminRoleId]
      );
    }
  }
}

export async function getUserRole(userId: string): Promise<RbacRole | null> {
  const result = await query<{ name: string }>(
    `SELECT r.name
     FROM rbac_user_roles ur
     JOIN rbac_roles r ON ur.role_id = r.id
     WHERE ur.user_id = $1
     ORDER BY r.name ASC
     LIMIT 1`,
    [userId]
  );

  return (result.rows[0]?.name as RbacRole) || null;
}

export async function getRolePermissions(role: RbacRole): Promise<RbacPermission[]> {
  const result = await query<{ name: string }>(
    `SELECT p.name
     FROM rbac_role_permissions rp
     JOIN rbac_permissions p ON rp.permission_id = p.id
     JOIN rbac_roles r ON rp.role_id = r.id
     WHERE r.name = $1`,
    [role]
  );

  return result.rows.map((row) => row.name as RbacPermission);
}

export async function userHasPermission(
  userId: string,
  permission: RbacPermission
): Promise<{ allowed: boolean; role: RbacRole | null }> {
  const role = await getUserRole(userId);
  if (!role) {
    return { allowed: false, role: null };
  }

  const permissions = await getRolePermissions(role);
  return { allowed: permissions.includes(permission), role };
}
