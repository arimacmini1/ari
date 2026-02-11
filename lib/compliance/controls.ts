export type ComplianceFramework = 'SOC2' | 'GDPR' | 'HIPAA';
export type ControlStatus = 'implemented' | 'in_progress' | 'not_started';
export type ControlType = 'auto' | 'manual';

export type AutoCheckKey =
  | 'db_ssl'
  | 'audit_logs_present'
  | 'audit_rls_enabled'
  | 'audit_hash_chain_verified'
  | 'rbac_seeded';

export interface ComplianceControl {
  id: string;
  framework: ComplianceFramework;
  name: string;
  description: string;
  type: ControlType;
  autoCheck?: AutoCheckKey;
  status?: ControlStatus;
  evidence?: string;
}

const SOC2_CONTROLS: ComplianceControl[] = [
  {
    id: 'soc2-cc1-1',
    framework: 'SOC2',
    name: 'Access Control Policy',
    description: 'Documented access control policy with role definitions.',
    type: 'manual',
  },
  {
    id: 'soc2-cc1-2',
    framework: 'SOC2',
    name: 'RBAC Enforcement',
    description: 'Role-based access control enforced at the API layer.',
    type: 'auto',
    autoCheck: 'rbac_seeded',
  },
  {
    id: 'soc2-cc2-1',
    framework: 'SOC2',
    name: 'Audit Logging Enabled',
    description: 'Immutable audit logs captured for critical actions.',
    type: 'auto',
    autoCheck: 'audit_logs_present',
  },
  {
    id: 'soc2-cc2-2',
    framework: 'SOC2',
    name: 'Audit Log Integrity',
    description: 'Hash chain verification confirms tamper detection.',
    type: 'auto',
    autoCheck: 'audit_hash_chain_verified',
  },
  {
    id: 'soc2-cc2-3',
    framework: 'SOC2',
    name: 'Immutable Log Storage',
    description: 'Row-level security blocks updates/deletes on audit logs.',
    type: 'auto',
    autoCheck: 'audit_rls_enabled',
  },
  {
    id: 'soc2-cc3-1',
    framework: 'SOC2',
    name: 'Change Management',
    description: 'Documented change approvals and release notes.',
    type: 'manual',
  },
  {
    id: 'soc2-cc3-2',
    framework: 'SOC2',
    name: 'Risk Assessment',
    description: 'Periodic risk assessments with remediation tracking.',
    type: 'manual',
  },
  {
    id: 'soc2-cc4-1',
    framework: 'SOC2',
    name: 'Incident Response Plan',
    description: 'Incident response playbook and escalation paths.',
    type: 'manual',
  },
  {
    id: 'soc2-cc4-2',
    framework: 'SOC2',
    name: 'Security Monitoring',
    description: 'Alerts for suspicious activity and access anomalies.',
    type: 'manual',
  },
  {
    id: 'soc2-cc5-1',
    framework: 'SOC2',
    name: 'Data Encryption In Transit',
    description: 'Database connections use TLS encryption.',
    type: 'auto',
    autoCheck: 'db_ssl',
  },
  {
    id: 'soc2-cc5-2',
    framework: 'SOC2',
    name: 'Data Encryption At Rest',
    description: 'Storage layer provides encryption at rest.',
    type: 'manual',
  },
  {
    id: 'soc2-cc6-1',
    framework: 'SOC2',
    name: 'User Provisioning',
    description: 'Documented onboarding/offboarding processes.',
    type: 'manual',
  },
  {
    id: 'soc2-cc6-2',
    framework: 'SOC2',
    name: 'Least Privilege Reviews',
    description: 'Periodic access reviews performed by admins.',
    type: 'manual',
  },
  {
    id: 'soc2-cc7-1',
    framework: 'SOC2',
    name: 'Backup & Recovery',
    description: 'Regular backups with tested recovery procedures.',
    type: 'manual',
  },
  {
    id: 'soc2-cc7-2',
    framework: 'SOC2',
    name: 'Availability Monitoring',
    description: 'Uptime and latency alerts for critical systems.',
    type: 'manual',
  },
];

const GDPR_CONTROLS: ComplianceControl[] = [
  {
    id: 'gdpr-1',
    framework: 'GDPR',
    name: 'Data Processing Register',
    description: 'Maintain records of processing activities.',
    type: 'manual',
  },
  {
    id: 'gdpr-2',
    framework: 'GDPR',
    name: 'Right to Access',
    description: 'Process for providing data access to users.',
    type: 'manual',
  },
  {
    id: 'gdpr-3',
    framework: 'GDPR',
    name: 'Right to Erasure',
    description: 'GDPR purge workflows for archived audit logs.',
    type: 'manual',
  },
  {
    id: 'gdpr-4',
    framework: 'GDPR',
    name: 'Data Minimization',
    description: 'Collect only necessary personal data in logs.',
    type: 'manual',
  },
  {
    id: 'gdpr-5',
    framework: 'GDPR',
    name: 'Audit Logging',
    description: 'Immutable audit trail for access to personal data.',
    type: 'auto',
    autoCheck: 'audit_logs_present',
  },
  {
    id: 'gdpr-6',
    framework: 'GDPR',
    name: 'Access Controls',
    description: 'Role-based access restrictions for personal data.',
    type: 'auto',
    autoCheck: 'rbac_seeded',
  },
  {
    id: 'gdpr-7',
    framework: 'GDPR',
    name: 'Data Retention Policy',
    description: 'Documented retention policies for audit logs.',
    type: 'manual',
  },
  {
    id: 'gdpr-8',
    framework: 'GDPR',
    name: 'Breach Notification',
    description: 'Process for notifying regulators within 72 hours.',
    type: 'manual',
  },
  {
    id: 'gdpr-9',
    framework: 'GDPR',
    name: 'DPIA Process',
    description: 'Data Protection Impact Assessments for high-risk processing.',
    type: 'manual',
  },
  {
    id: 'gdpr-10',
    framework: 'GDPR',
    name: 'Encryption In Transit',
    description: 'Transport encryption for data access.',
    type: 'auto',
    autoCheck: 'db_ssl',
  },
  {
    id: 'gdpr-11',
    framework: 'GDPR',
    name: 'Encryption At Rest',
    description: 'Storage encryption for personal data.',
    type: 'manual',
  },
  {
    id: 'gdpr-12',
    framework: 'GDPR',
    name: 'Third-Party Processors',
    description: 'Data processing agreements for vendors.',
    type: 'manual',
  },
  {
    id: 'gdpr-13',
    framework: 'GDPR',
    name: 'Access Logging Integrity',
    description: 'RLS protects audit log immutability.',
    type: 'auto',
    autoCheck: 'audit_rls_enabled',
  },
  {
    id: 'gdpr-14',
    framework: 'GDPR',
    name: 'User Consent Records',
    description: 'Consent tracking and revocation procedures.',
    type: 'manual',
  },
  {
    id: 'gdpr-15',
    framework: 'GDPR',
    name: 'Privacy Policy',
    description: 'Published and maintained privacy policy.',
    type: 'manual',
  },
];

const HIPAA_CONTROLS: ComplianceControl[] = [
  {
    id: 'hipaa-1',
    framework: 'HIPAA',
    name: 'Security Management Process',
    description: 'Risk analysis and management procedures.',
    type: 'manual',
  },
  {
    id: 'hipaa-2',
    framework: 'HIPAA',
    name: 'Assigned Security Responsibility',
    description: 'Designated security officer for HIPAA program.',
    type: 'manual',
  },
  {
    id: 'hipaa-3',
    framework: 'HIPAA',
    name: 'Workforce Security',
    description: 'Policies for workforce access and clearance.',
    type: 'manual',
  },
  {
    id: 'hipaa-4',
    framework: 'HIPAA',
    name: 'Information Access Management',
    description: 'Role-based access controls for PHI.',
    type: 'auto',
    autoCheck: 'rbac_seeded',
  },
  {
    id: 'hipaa-5',
    framework: 'HIPAA',
    name: 'Audit Controls',
    description: 'Audit logs for PHI access and modification.',
    type: 'auto',
    autoCheck: 'audit_logs_present',
  },
  {
    id: 'hipaa-6',
    framework: 'HIPAA',
    name: 'Integrity Controls',
    description: 'Hash chain verification for audit log integrity.',
    type: 'auto',
    autoCheck: 'audit_hash_chain_verified',
  },
  {
    id: 'hipaa-7',
    framework: 'HIPAA',
    name: 'Person or Entity Authentication',
    description: 'Multi-factor or SSO authentication controls.',
    type: 'manual',
  },
  {
    id: 'hipaa-8',
    framework: 'HIPAA',
    name: 'Transmission Security',
    description: 'TLS encryption for data in transit.',
    type: 'auto',
    autoCheck: 'db_ssl',
  },
  {
    id: 'hipaa-9',
    framework: 'HIPAA',
    name: 'Device and Media Controls',
    description: 'Policies for device disposal and media reuse.',
    type: 'manual',
  },
  {
    id: 'hipaa-10',
    framework: 'HIPAA',
    name: 'Contingency Plan',
    description: 'Emergency mode operation and data backup plan.',
    type: 'manual',
  },
  {
    id: 'hipaa-11',
    framework: 'HIPAA',
    name: 'Facility Access Controls',
    description: 'Physical security controls for data centers.',
    type: 'manual',
  },
  {
    id: 'hipaa-12',
    framework: 'HIPAA',
    name: 'Automatic Logoff',
    description: 'Session timeout policies enforced.',
    type: 'manual',
  },
  {
    id: 'hipaa-13',
    framework: 'HIPAA',
    name: 'Encryption At Rest',
    description: 'Storage encryption for PHI.',
    type: 'manual',
  },
  {
    id: 'hipaa-14',
    framework: 'HIPAA',
    name: 'Policy Documentation',
    description: 'Written policies and procedure updates.',
    type: 'manual',
  },
  {
    id: 'hipaa-15',
    framework: 'HIPAA',
    name: 'RLS Audit Protection',
    description: 'Database policies prevent audit log tampering.',
    type: 'auto',
    autoCheck: 'audit_rls_enabled',
  },
];

export const COMPLIANCE_CONTROLS: ComplianceControl[] = [
  ...SOC2_CONTROLS,
  ...GDPR_CONTROLS,
  ...HIPAA_CONTROLS,
];
