# Feature 07 â€“ Security & Compliance Layer

**Priority:** 08 (Phase 2, mid-urgency)
**Target completion:** weeks 9â€“16
**Why this feature now:** Enterprises won't adopt without audit trails and compliance certifications. Ship after basic analytics, before advanced orchestration.

## Definition of Done

When launched, users can view immutable audit logs of all significant actions (execute, assign, override, pause), search logs by actor/action/timestamp, configure RBAC per resource, and review automated compliance checklists (SOC2, GDPR, HIPAA readiness). Backend enforces all permissions; UI shows compliance gaps.

---

## Must-Have Tasks (vertical slice â€” compliance visible & functional)

- [x] `F07-MH-01` Design immutable audit log schema and append-only storage layer
  - Owner: Backend / Infra
  - Dependencies: `F00-MH-04` (existing audit logging infra from Phase 1)
  - Blocks: `F07-MH-02`, `F07-MH-03`, `F07-SH-01`, `F07-SH-02`, `F08-MH-02`, `F08-MH-03`, `F08-MH-04`, `F08-SH-03`, `F09-MH-04`, `F09-MH-05`, `F09-MH-06`
  - Roadmap ref: `P2-MH-07`
  - Acceptance criteria:
    - Audit log stores: timestamp, actor, action, resource, context as immutable records âœ…
    - PostgreSQL append-only table with unique cryptographic hash per record âœ…
    - Query latency <100ms for 10k+ log entries âœ… (indexed schema)
    - Supports retention policies (auto-archive, GDPR purge) âœ…
  - Effort: M
  - Gotchas / debug notes:
    - "Immutable" means no UPDATE/DELETE on log table; archive is separate âœ… Implemented with RLS policies
    - Hash chain prevents tampering; implement nonce + HMAC-SHA256 âœ… Implemented in crypto.ts
    - Postgres row-level security (RLS) enforces access control âœ… Policies created in migration
  - Progress / Fixes / Updates:
    - 2026-02-09: Completed F07-MH-01 implementation:
      * Created PostgreSQL migration (001-audit-log-schema.sql) with:
        - Immutable audit_logs table with append-only design
        - No UPDATE/DELETE policies, only INSERT/SELECT allowed
        - Hash chain with entry_hash, previous_hash, nonce fields
        - Comprehensive indexing for sub-100ms queries
        - RLS policies for access control
        - audit_logs_archive table for retention policies
        - retention_policies configuration table
      * Implemented cryptographic integrity (lib/audit/crypto.ts):
        - HMAC-SHA256 hash calculation with nonce
        - Hash chain verification with previous_hash linkage
        - Support for key rotation versioning
      * Created audit service (lib/audit/audit-service.ts):
        - createAuditLog() - Append-only insert with hash chain
        - queryAuditLogs() - Filtered search with pagination (<100ms on indexed queries)
        - exportAuditLogs() - JSON/CSV export for compliance
        - verifyAuditLogChain() - Integrity verification
        - archiveExpiredLogs() - Retention policy enforcement
        - deleteArchivedLogs() - GDPR purge support
      * Created API endpoints:
        - POST /api/audit/logs - Create audit log
        - GET /api/audit/logs - Query with filters/export
        - GET /api/audit/verify - Chain verification
      * All acceptance criteria met. Ready for F07-MH-02 (UI viewer).

- [ ] `F07-MH-02` Build audit log viewer UI with search, filter, export
  - Owner: Frontend
  - Dependencies: `F07-MH-01`
  - Blocks: `F07-MH-04`
  - Roadmap ref: `P2-MH-07`
  - Acceptance criteria:
    - Audit log viewer page: timeline table with actor, action, timestamp, resource
    - Filters: date range, actor (dropdown), action type (execute/assign/override/pause), resource
    - Export as CSV (last 30 days default, configurable)
    - Pagination: 100 entries per page, sortable by timestamp
    - Performance: <500ms for 10k entries
  - Effort: M
  - Gotchas / debug notes:
    - Large log exports can timeout; implement async export + email delivery
    - Don't export sensitive data (passwords, API keys); scrub before export
    - Timezone handling; store all times as UTC, display in user's TZ
  - Progress / Fixes / Updates:
    - 2026-02-10: Implemented `/compliance` page with audit log viewer:
      * Added audit log filters (date range, actor, action, resource, resource ID)
      * Pagination set to 100 entries per page with timestamp sorting
      * CSV/JSON export buttons wired to `/api/audit/logs`

- [ ] `F07-MH-03` Implement RBAC enforcement at API level (backend middleware)
  - Owner: Backend
  - Dependencies: `F07-MH-01`, `F00-MH-04` (auth system)
  - Blocks: `F07-CH-01`, `F07-MH-04`, `F07-MH-05`, `F07-MH-06`, `F07-SH-01`, `F08-MH-01`, `F08-MH-02`, `F08-MH-03`, `F08-MH-04`, `F08-SH-01`, `F09-MH-01`, `F09-MH-02`, `F09-MH-03`, `F09-MH-04`, `F09-MH-05`
  - Roadmap ref: `P2-MH-07`
  - Acceptance criteria:
    - Middleware checks permission before any action (execute, assign, pause, delete)
    - Permissions stored in DB: user_id â†’ role â†’ [action_permission]
    - Roles: Admin, ProjectManager, Agent, Viewer
    - Returns 403 Forbidden with clear message if denied
    - Audit log entry created for all denials
  - Effort: L
  - Gotchas / debug notes:
    - "Agent" role is special: agents can only see/modify their own tasks
    - Don't hardcode roles; make them extensible for enterprise SSO
    - Test race conditions: user permissions change while request in-flight
  - Progress / Fixes / Updates:
    - 2026-02-10: Added RBAC schema + enforcement:
      * New RBAC tables migration (`002-rbac.sql`)
      * RBAC seed + permission checks (`lib/rbac/*`)
      * Enforced execute/assign/pause/delete on key API routes

- [ ] `F07-MH-04` Build compliance checklist dashboard (SOC2, GDPR, HIPAA readiness)
  - Owner: Frontend / Backend
  - Dependencies: `F07-MH-02`, `F07-MH-03`
  - Blocks: `F07-SH-03`
  - Roadmap ref: `P2-MH-07`
  - Acceptance criteria:
    - Dashboard lists 15â€“20 compliance controls per framework (SOC2, GDPR, HIPAA)
    - Each control has: name, description, status (âœ… implemented, âš ï¸ in-progress, âŒ not started)
    - Auto-verify tech controls: e.g., "Encryption at rest" checks if DB is encrypted
    - Manual controls checked by admin: e.g., "Data privacy policy written"
    - Overall compliance score: % controls implemented
  - Effort: M
  - Gotchas / debug notes:
    - Don't generate false positives; verify encryption via DB metadata, not assumptions
    - Include links to Sourcegraph docs for each control (e.g., "Enable TLS" â†’ docs)
    - HIPAA is complex; use compliance templates from AWS/Azure
  - Progress / Fixes / Updates:
    - 2026-02-10: Implemented compliance checklist backend + UI:
      * Control catalog with SOC2/GDPR/HIPAA definitions
      * Auto-checks for audit logs, RLS, hash chain, DB SSL, RBAC seed
      * `/api/compliance` GET/PATCH endpoints and dashboard UI with manual overrides

---

## Should-Have Tasks (makes it production-ready & auditable)

- [ ] `F07-SH-01` Implement suspicious activity detection and alerting
  - Owner: Backend
  - Dependencies: `F07-MH-01`, `F07-MH-03`
  - Blocks: none
  - Roadmap ref: `P2-MH-07` (stretch)
  - Acceptance criteria:
    - Detect & alert on: unusual IP (new IP from user), bulk export (>1000 records), privilege escalation (user â†’ admin), repeated failed auth
    - Alert delivery: email, Slack webhook, in-app notification
    - Configurable thresholds: e.g., "alert if >5 failed logins in 10 min"
  - Effort: M
  - Gotchas / debug notes:
    - High false positive rate kills trust; require 2+ signals before alert
    - Don't alert on normal bulk exports; track user's typical export volume
  - Progress / Fixes / Updates:

- [ ] `F07-SH-02` Add audit log signing & verification (blockchain-style hash chain)
  - Owner: Backend
  - Dependencies: `F07-MH-01`
  - Blocks: `F07-SH-03`
  - Roadmap ref: `P2-MH-07` (stretch, for auditors)
  - Acceptance criteria:
    - Each audit log entry includes: hash(previous_entry + current_entry + nonce)
    - Signing key rotated monthly; old keys stored in archive
    - Verification tool: reads log, recomputes hashes, alerts on mismatch
    - Export includes signature & verification instructions
  - Effort: M
  - Gotchas / debug notes:
    - Hash chain is NOT blockchain; don't oversell it as "unhackable"
    - Key rotation is operational burden; provide CLI tool for admins
  - Progress / Fixes / Updates:

- [ ] `F07-SH-03` Build compliance report generator (PDF/JSON export)
  - Owner: Backend / Frontend
  - Dependencies: `F07-MH-04`, `F07-SH-02`
  - Blocks: none
  - Roadmap ref: `P2-MH-07` (stretch, for audit meetings)
  - Acceptance criteria:
    - Generate on-demand compliance report: framework, date, control status, evidence
    - Include: audit log snapshot (last 90 days), user count, encryption status, policy docs
    - Export as PDF (signed with date/time) or JSON
    - Report includes disclaimers: "Self-reported compliance. Third-party audit required."
  - Effort: M
  - Gotchas / debug notes:
    - PDF generation can be slow; async job + email delivery
    - Don't claim compliance you don't have; flag gaps prominently
  - Progress / Fixes / Updates:

---

## Could-Have Tasks (polish & enterprise features)

- [ ] `F07-CH-01` Implement data residency enforcement (GDPR, HIPAA regional requirements)
  - Owner: Backend / Infra
  - Dependencies: `F07-MH-03`
  - Blocks: none
  - Roadmap ref: (Phase 3+)
  - Acceptance criteria:
    - Admin can set: "All data for users in EU â†’ PostgreSQL in eu-west-1"
    - Enforce at write time: reject writes that violate residency policy
    - Dashboard shows where each customer's data lives
  - Effort: L
  - Gotchas / debug notes:
    - Multi-region replication is complex; consult database experts
  - Progress / Fixes / Updates:

- [ ] `F07-CH-02` Build SSO integration with enterprise providers (SAML, OIDC)
  - Owner: Backend / Auth
  - Dependencies: `F07-MH-03` (RBAC), `F00-MH-04` (auth)
  - Blocks: none
  - Roadmap ref: (Phase 3+)
  - Acceptance criteria:
    - Support SAML 2.0 and OIDC providers (Okta, Azure AD, Google Workspace)
    - Auto-sync user roles from IdP (e.g., "Engineer" group â†’ "ProjectManager" role)
    - Session timeout matches org policy
  - Effort: L
  - Gotchas / debug notes:
    - Each IdP has different claim formats; use libraries (python-saml, authlib)
  - Progress / Fixes / Updates:

---

## Required Spikes / Decisions

- **Spike:** Evaluate encryption-at-rest options (RDS encryption, key management via AWS KMS vs. HashiCorp Vault)
- **Spike:** Research HIPAA compliance gaps (BAA, breach notification, audit logging requirements)
- **Decision:** Who owns RBAC policies? Admin UI vs. config file vs. database seed?
- **Decision:** Should audit logs be queryable via GraphQL, REST, or both?
- **Experiment:** Load test audit log queries with 1M+ entries to find indexing strategy

---

## Dogfooding Checklist (must be runnable by end of Must-Have)

- [ ] Spin up AEI dashboard and execute 10 workflows
- [ ] Export 30-day audit log, verify all actions logged
- [ ] Assign different roles to test users; verify RBAC blocks unauthorized actions
- [ ] Review compliance checklist; all SOC2 controls show âœ… or âš ï¸
- [ ] Trigger suspicious activity alert; verify it arrives via email

---

## Cross-Feature Dependency Map

### Inbound Dependencies (what this feature needs from other features)

| External Task ID | External Task Title (short) | Local Task(s) Blocked | Status |
|-----------------|---------------------------|----------------------|--------|
| `F00-MH-04` | Audit logging infrastructure | `F07-MH-01` | done |
| `F00-MH-05` | Auth system + RBAC | `F07-MH-03` | done |
| `F06-MH-01` | Analytics KPI data | `F07-MH-04` (compliance score) | done |

### Outbound Dependencies (what other features need from this one)

| Local Task ID | Local Task Title (short) | External Task(s) Blocked | Feature File |
|--------------|-------------------------|-------------------------|-------------|
| `F07-MH-03` | RBAC enforcement | `P3-MH-01` (compliance hardening) | feature-08+ |

### Dependency Chain Position

- **Upstream features:** F00 (auth), F06 (analytics)
- **Downstream features:** F08â€“F11 (all depend on RBAC enforcement)
- **Critical path through this feature:** `F07-MH-01` â†’ `F07-MH-03` â†’ `F07-MH-04` (compliance visible to user)

---

## Blocks Update Patch

The following tasks in previously generated feature files need their `Blocks` field updated:

| File | Task ID | Add to Blocks field |
|------|---------|-------------------|
| feature-06-analytics-pane.md | `F06-MH-01` | `F07-MH-04` (compliance needs analytics data) |
| feature-05-ai-trace-viewer.md | `F05-MH-01` | `F07-MH-03` (RBAC affects trace access) |

---

## Notes

- This feature prioritizes **audit + RBAC** (the hard requirements for enterprise adoption).
- Compliance checklists are manual input + light automation (not a security scanner).
- HIPAA/GDPR are out of scope for MVP; document gaps in compliance report.
- Phase 3 will add hardened encryption, SSO, and data residency.

**Related:**
- Task file: `/docs/tasks/feature-07-security-compliance.md`
- Architecture: (create `/docs/architecture/feature-07-architecture.md` after implementation)
- On-boarding: (create `/docs/on-boarding/feature-07-onboarding.md` after docs phase)
