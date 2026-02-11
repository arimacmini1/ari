<!--
  Feature 07 On-Boarding Guide
  Version: 1.0 (2026-02-10, initial creation for F07-MH-01/02/03/04)
  Status: MVP - Audit Logs, RBAC Enforcement, Compliance Checklist
-->

# Feature 07 - Security & Compliance: On-Boarding Guide

## Quick Start

### 1) Open the Compliance Hub
1. In the sidebar, click **"Compliance"**
2. You will land on `/compliance`
3. Tabs:
   - **Audit Logs** (viewer + export)
   - **Compliance Checklist** (SOC2 / GDPR / HIPAA)

### 2) Verify Audit Logs
1. Open **Audit Logs** tab
2. Apply filters (date range, actor, action, resource type)
3. Click **Apply Filters**
4. Export:
   - **Export CSV**
   - **Export JSON**

### 3) Review Compliance Checklist
1. Open **Compliance Checklist** tab
2. Verify auto checks (RLS, hash chain, RBAC seed, DB SSL)
3. Update manual controls:
   - Select **implemented / in_progress / not_started**
   - Add notes
   - Click **Save**

---

## Feature Overview

### What You Get
- **Immutable audit logs** with hash chain integrity
- **RBAC enforcement** at API level (execute/assign/pause/delete)
- **Compliance checklist dashboard** with auto checks + manual status
- **Exportable audit logs** (CSV/JSON)

### Key Capabilities
**Audit Log Viewer**
- Filter by actor, action, resource, resource ID
- Date range filter
- Pagination: 100 entries per page
- Sort by timestamp (newest/oldest)
- Export CSV/JSON

**RBAC Enforcement**
- Roles: Admin, ProjectManager, Agent, Viewer
- Permissions enforced before sensitive actions
- Denials are logged to audit trail

**Compliance Dashboard**
- SOC2, GDPR, HIPAA controls
- Auto checks:
  - audit logs present
  - RLS enabled on audit_logs
  - hash chain verification
  - DB SSL
  - RBAC seeded
- Manual updates with notes

---

## Testing Guide

### Audit Log Viewer Checklist (F07-MH-02)
- [ ] Navigate to `/compliance` and open **Audit Logs**
- [ ] Apply a date range filter
- [ ] Filter by action (execute/assign/pause)
- [ ] Filter by resource type (workflow/agent)
- [ ] Pagination: next/previous works
- [ ] Export CSV works (downloaded file)
- [ ] Export JSON works (downloaded file)

### RBAC Enforcement Checklist (F07-MH-03)
- [ ] Requests without permissions return **403**
- [ ] Denied requests create an audit log entry
- [ ] Agent role can only pause/resume its own agent ID
- [ ] Admin role can execute, assign, delete

### Compliance Checklist (F07-MH-04)
- [ ] Auto checks show evidence text
- [ ] Manual controls can be saved (PATCH /api/compliance)
- [ ] Status persists after refresh

---

## Quick Reference

### Routes
- `/compliance` - main UI
- `/api/audit/logs` - query/export audit logs
- `/api/audit/verify` - verify hash chain
- `/api/compliance` - compliance snapshot + manual updates

### Key Files
- `app/compliance/page.tsx`
- `components/compliance/audit-log-viewer.tsx`
- `components/compliance/compliance-dashboard.tsx`
- `lib/audit/audit-service.ts`
- `lib/rbac/enforce.ts`
- `lib/compliance/compliance-service.ts`

---

## Debugging Guide

### Issue: Audit logs empty
**Check:**
1. Migration ran for `audit_logs`
2. `DATABASE_URL` set
3. API returns data for `/api/audit/logs`

### Issue: Export fails
**Check:**
1. `/api/audit/logs?export=csv` returns 200
2. Browser download not blocked

### Issue: Compliance auto checks show "unavailable"
**Check:**
1. Database reachable
2. RLS policies exist on `audit_logs`
3. `audit_logs` table exists

---

## Related Docs

- `/docs/architecture/feature-07-architecture.md`
- `/docs/architecture/feature-07-audit-logs.md`
- `/docs/on-boarding/feature-07-audit-logs-usage.md`
- `/docs/tasks/feature-07-security-compliance.md`
