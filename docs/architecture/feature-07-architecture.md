<!--
  Feature 07 Architecture Doc
  Version: 1.0 (2026-02-10)
  Status: MVP - Audit Logs, RBAC, Compliance Checklist
-->

# Feature 07 - Security & Compliance Architecture

## Scope
Feature 07 delivers an immutable audit log system, RBAC enforcement, and a compliance checklist dashboard (SOC2/GDPR/HIPAA).

This document complements:
- `/docs/architecture/feature-07-audit-logs.md` (audit log internals)
- `/docs/on-boarding/feature-07-onboarding.md` (user guide)

---

## System Overview

```
Client UI (/compliance)
  ├─ Audit Log Viewer (filters, export)
  └─ Compliance Checklist (auto + manual controls)
         │
         ▼
API Routes
  ├─ /api/audit/logs
  ├─ /api/audit/verify
  └─ /api/compliance
         │
         ▼
Services
  ├─ Audit Service (hash chain, export)
  ├─ RBAC Enforcement (permissions)
  └─ Compliance Service (auto checks)
         │
         ▼
Postgres
  ├─ audit_logs, audit_logs_archive
  ├─ audit_log_verification
  ├─ rbac_roles, rbac_permissions, rbac_user_roles
  └─ compliance_manual_status
```

---

## Key Design Decisions

### 1) Immutable Audit Logs
- Append-only table with RLS to block UPDATE/DELETE
- Hash chain via HMAC-SHA256 + nonce
- Verification results stored in `audit_log_verification`

### 2) RBAC at API Level
- Permission checks occur before sensitive actions
- Denials are logged to audit trail
- Roles: Admin, ProjectManager, Agent, Viewer
- Agent role restricted to its own agent resource

### 3) Compliance Checklist
- Controls catalog stored in code (SOC2/GDPR/HIPAA)
- Auto checks query Postgres state (RLS, SSL, log integrity)
- Manual controls stored in `compliance_manual_status`

---

## Data Model

### Audit Logs
See `/docs/architecture/feature-07-audit-logs.md`.

### RBAC
```
rbac_roles(id, name, description)
rbac_permissions(id, name, description)
rbac_role_permissions(role_id, permission_id)
rbac_user_roles(user_id, role_id, assigned_at)
```

### Compliance Manual Status
```
compliance_manual_status(
  control_id PRIMARY KEY,
  status,
  updated_by,
  updated_at,
  notes
)
```

---

## API Surface

### /api/audit/logs
- GET: query + export
- POST: create log entry

### /api/audit/verify
- GET: verify hash chain integrity

### /api/compliance
- GET: returns auto + manual controls grouped by framework
- PATCH: updates manual control status

---

## Security Considerations

- Hash chain detects tampering and reordering
- RLS prevents log mutation
- RBAC checks all sensitive endpoints
- Compliance updates require `manage_compliance` permission

---

## Performance Notes

- Indexed audit log queries target sub-100ms for 10k entries
- Export capped at 10k entries per request
- Verification is CPU-bound; defaults to 50 entries for auto checks

---

## Operational Notes

### Required Environment Variables
- `DATABASE_URL`
- `AUDIT_LOG_SECRET`
- `AUDIT_LOG_KEY_VERSION`
- `RBAC_BOOTSTRAP_ADMIN_USER_ID` (optional)

### Migrations
- `lib/db/migrations/001-audit-log-schema.sql`
- `lib/db/migrations/002-rbac.sql`
- `lib/db/migrations/003-compliance.sql`

---

## File Map

### UI
- `app/compliance/page.tsx`
- `components/compliance/audit-log-viewer.tsx`
- `components/compliance/compliance-dashboard.tsx`

### Services
- `lib/audit/audit-service.ts`
- `lib/rbac/enforce.ts`
- `lib/rbac/rbac-service.ts`
- `lib/compliance/compliance-service.ts`
- `lib/compliance/controls.ts`

---

## Future Work
- UI for RBAC role management
- Async export for large audit log sets
- Compliance report generator (PDF/JSON)
