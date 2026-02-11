export const RBAC_ROLES = ['Admin', 'ProjectManager', 'Agent', 'Viewer'] as const;

export type RbacRole = (typeof RBAC_ROLES)[number];

export const RBAC_PERMISSIONS = [
  'execute',
  'assign',
  'pause',
  'delete',
  'approve_merge',
  'view_audit_logs',
  'export_audit_logs',
  'verify_audit_logs',
  'manage_compliance',
] as const;

export type RbacPermission = (typeof RBAC_PERMISSIONS)[number];

export const ROLE_PERMISSIONS: Record<RbacRole, RbacPermission[]> = {
  Admin: [...RBAC_PERMISSIONS],
  ProjectManager: [
    'execute',
    'assign',
    'pause',
    'delete',
    'approve_merge',
    'view_audit_logs',
    'export_audit_logs',
    'verify_audit_logs',
    'manage_compliance',
  ],
  Agent: ['pause'],
  Viewer: ['view_audit_logs'],
};

export const RBAC_ROLE_DESCRIPTIONS: Record<RbacRole, string> = {
  Admin: 'Full access to all actions and compliance controls.',
  ProjectManager: 'Can execute workflows and manage agents; limited admin access.',
  Agent: 'Can control only their own agent lifecycle actions.',
  Viewer: 'Read-only access to audit logs and compliance views.',
};

export const RBAC_PERMISSION_DESCRIPTIONS: Record<RbacPermission, string> = {
  execute: 'Create and dispatch executions.',
  assign: 'Assign or reassign tasks and agents.',
  pause: 'Pause or resume agent execution.',
  delete: 'Delete or terminate resources.',
  approve_merge: 'Approve or reject workflow merge requests.',
  view_audit_logs: 'View audit log entries.',
  export_audit_logs: 'Export audit logs to CSV/JSON.',
  verify_audit_logs: 'Verify audit hash chain integrity.',
  manage_compliance: 'Update compliance checklist status.',
};
