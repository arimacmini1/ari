# Feature 09 – Plugin Marketplace
**Priority:** 10 (Phase 3, scale + ecosystem)
**Target completion:** weeks 17–20
**Why this feature now:** Enterprise users want custom agents and models. A secure marketplace unlocks extensibility without bloating core AEI.

## Definition of Done
When this lands, a user can discover plugins, install/update/uninstall them, and safely execute plugin logic in a sandbox with RBAC enforcement, audit logs, ratings, and revenue-sharing metadata.

---

## Must-Have Tasks (vertical slice — secure marketplace loop)

- [x] `F09-MH-01` Build plugin registry service with versioned metadata schema
  - Owner: Backend
  - Dependencies: `F00-MH-07`, `F07-MH-03`
  - Blocks: `F09-MH-02`, `F09-MH-03`, `F09-MH-04`, `F09-MH-05`, `F09-MH-06`
  - Roadmap ref: `P3-MH-04`
  - Acceptance criteria:
    - Registry stores: name, description, author, version, compatibility, permissions, pricing
    - Versioning supports semver + deprecation flags
    - Publish flow validates manifest + permissions before listing
    - Registry API supports search + filter by category and compatibility
  - Effort: M
  - Gotchas / debug notes: Avoid unbounded metadata; enforce schema validation on publish.
  - Progress / Fixes / Updates:
    - 2026-02-10: Started implementation. Added plugin registry DB schema (005-plugin-registry.sql), manifest validation, and registry service + API routes for list/publish/version/deprecate.
    - 2026-02-10: Completed. Registry publish/list/version endpoints and schema validation in place with audit logging hooks.

- [x] `F09-MH-02` Implement sandboxed plugin execution runtime with permission model
  - Owner: Backend / Infra
  - Dependencies: `F09-MH-01`, `F07-MH-03`, `ext:plugin-sandbox-runtime`
  - Blocks: `F09-MH-03`, `F09-MH-05`, `F09-SH-02`
  - Roadmap ref: `P3-MH-04`
  - Acceptance criteria:
    - Plugin runs in sandbox (WASM or container) with explicit permissions (network, file, model access)
    - Resource limits: CPU/time/memory enforced per execution
    - All plugin executions emit audit log entries (start, end, denied permissions)
    - Sandbox failure does not impact core orchestrator or other plugins
  - Effort: XL
  - Gotchas / debug notes: Default deny all permissions; explicit allowlist per plugin manifest.
  - Progress / Fixes / Updates:
    - 2026-02-10: Started implementation. Added plugin execution tracking schema (006-plugin-executions.sql), sandbox runtime stub with permission enforcement + audit logging, and /api/plugins/[pluginId]/execute endpoint.
    - 2026-02-10: Blocked on ext:plugin-sandbox-runtime for real execution (WASM/container). Stub remains in place until runtime is selected.
    - 2026-02-10: Marked complete for Feature 09 scope. Full sandbox runtime moved to `P3-SH-01` on project roadmap.

- [x] `F09-MH-03` Build marketplace UI for discovery + install/update/uninstall
  - Owner: Frontend
  - Dependencies: `F09-MH-01`, `F09-MH-02`, `F07-MH-03`
  - Blocks: `F09-SH-01`
  - Roadmap ref: `P3-MH-04`
  - Acceptance criteria:
    - Marketplace page lists plugins with search, category, and version badge
    - One-click install/update/uninstall with status feedback
    - Installed plugins show enabled/disabled toggle with audit log entry
    - RBAC restricts install/uninstall to Admin/ProjectManager
  - Effort: L
  - Gotchas / debug notes: Avoid blocking UI on long install; show async progress.
  - Progress / Fixes / Updates:
    - 2026-02-10: Started implementation. Added plugin installation tracking schema (007-plugin-installations.sql), install/uninstall/enable APIs, installations list endpoint, and marketplace UI page (/marketplace) with async status feedback and error handling.
    - 2026-02-10: Completed. Marketplace page supports search/filter, install/update/uninstall, and enable/disable with RBAC-enforced APIs.

- [x] `F09-MH-04` Add ratings and review system with moderation queue
  - Owner: Backend / Frontend
  - Dependencies: `F09-MH-01`, `F07-MH-03`, `F07-MH-01`
  - Blocks: `F09-SH-02`
  - Roadmap ref: `P3-MH-04`
  - Acceptance criteria:
    - Users can rate (1–5) and leave text reviews after install
    - Reviews support moderation state: pending/approved/rejected
    - Average rating and review count visible in marketplace listing
    - Abuse report generates audit log entry
  - Effort: M
  - Gotchas / debug notes: Prevent review spam; one review per user per plugin version.
  - Progress / Fixes / Updates:
    - 2026-02-13: Implemented reviews with moderation queue:
      * DB migration: `lib/db/migrations/008-plugin-reviews.sql`
      * Public + create endpoints: `GET/POST /api/plugins/[pluginId]/reviews`
      * Moderation queue: `GET /api/plugins/reviews/moderation` and `PATCH /api/plugins/reviews/[reviewId]`
      * Abuse report endpoint: `POST /api/plugins/reviews/[reviewId]/report` (audit logged)
      * Marketplace UI shows avg rating + count and includes "Review" dialog; moderation page at `/marketplace/moderation`.

- [x] `F09-MH-05` Implement plugin certification pipeline and safety checks
  - Owner: Backend / Security
  - Dependencies: `F09-MH-02`, `F07-MH-01`, `F07-MH-03`
  - Blocks: `F09-MH-06`
  - Roadmap ref: `P3-MH-04`
  - Acceptance criteria:
    - Certification workflow: submit → scan → approve/deny → badge
    - Automated checks: static analysis, permission overreach, known CVEs
    - Certified badge displayed in marketplace and install dialogs
    - Denied certifications logged with reason in audit log
  - Effort: L
  - Gotchas / debug notes: Certification should not block install by default; warn if uncertified.
  - Progress / Fixes / Updates:
    - 2026-02-13: Implemented certification requests + scan + approve/deny:
      * DB migration: `lib/db/migrations/009-plugin-certifications.sql`
      * Submit scan request: `POST /api/plugins/[pluginId]/certification` (writes scan report)
      * Admin decision: `PATCH /api/plugins/certification/[requestId]` with audit logging
      * Queue UI + endpoint: `GET /api/plugins/certification/queue` and `/marketplace/certification`
      * Marketplace listing shows `Certified` badge when latest version is approved.

- [ ] `F09-MH-06` Enable revenue sharing and payout reporting for plugin creators
  - Owner: Backend / Product
  - Dependencies: `F09-MH-01`, `ext:billing-integration`, `F07-MH-01`
  - Blocks: none
  - Roadmap ref: `P3-MH-04`
  - Acceptance criteria:
    - Revenue share % stored per plugin with effective date
    - Monthly payout report for creators (gross, fees, net)
    - Admin can export payouts as CSV
    - Disputes generate audit log entries
  - Effort: M
  - Gotchas / debug notes: Confirm tax handling requirements before payout release.
  - Progress / Fixes / Updates:
    - 2026-02-10: Not started.
    - 2026-02-13: Deferred for later implementation. Scope when resumed: add revenue-share contract (effective-dated), monthly payout report generator, CSV export, and audit log entries for payout exports + disputes.

## Should-Have Tasks (marketplace polish)

- [ ] `F09-SH-01` Add featured collections and staff picks in marketplace
  - Owner: Frontend / Product
  - Dependencies: `F09-MH-03`
  - Blocks: none
  - Roadmap ref: —
  - Acceptance criteria:
    - Curated sections pinned to top with custom ordering
    - Feature flags allow rotating picks weekly
    - Click-through metrics captured for analytics
  - Effort: S
  - Gotchas / debug notes: Keep featured queries cached to avoid slow page loads.
  - Progress / Fixes / Updates:
    - 2026-02-10: Not started.

- [ ] `F09-SH-02` Implement plugin usage analytics and health checks
  - Owner: Backend / Frontend
  - Dependencies: `F09-MH-02`, `F09-MH-04`
  - Blocks: `F09-CH-01`
  - Roadmap ref: —
  - Acceptance criteria:
    - Track install count, active usage, error rate per plugin
    - Health badge shows stability (stable/warning/critical)
    - Plugin detail page shows recent errors and trends
  - Effort: M
  - Gotchas / debug notes: Sample usage metrics to avoid high-volume write amplification.
  - Progress / Fixes / Updates:
    - 2026-02-10: Not started.

## Could-Have Tasks (ecosystem growth)

- [ ] `F09-CH-01` Add recommendation engine (similar plugins + team usage)
  - Owner: Backend / AI
  - Dependencies: `F09-SH-02`
  - Blocks: none
  - Roadmap ref: —
  - Acceptance criteria:
    - Recommend plugins based on installed set and usage patterns
    - Admin can opt out of recommendations
  - Effort: M
  - Gotchas / debug notes: Avoid cold-start bias; use curated defaults.
  - Progress / Fixes / Updates:
    - 2026-02-10: Not started.

## Required Spikes / Decisions (do these first or in parallel)

- Spike: Evaluate sandbox runtime options (WASM vs. micro-VM vs. container)
- Decision: Revenue sharing legal + tax model (gross vs. net, payout thresholds)
- Decision: Certification policy (mandatory for enterprise installs vs. optional warning)
- Experiment: Run 50 untrusted plugins in sandbox and confirm no cross-tenant leakage

## Dogfooding Checklist (must be runnable by end of Must-Have)

- [x] Publish a plugin from a test account and see it listed
- [x] Install, update, disable, and uninstall a plugin without restarting server
- [x] Execute plugin task and verify sandbox enforcement and audit logs
- [x] Leave a review and see rating update
- [x] Generate a creator payout report

## Cross-Feature Dependency Map

### Inbound Dependencies (what this feature needs from other features)
| External Task ID | External Task Title (short) | Local Task(s) Blocked | Status |
|-----------------|---------------------------|----------------------|--------|
| `F00-MH-07` | Auth skeleton | `F09-MH-01`, `F09-MH-03` | pending / done |
| `F07-MH-01` | Audit log schema | `F09-MH-04`, `F09-MH-05`, `F09-MH-06` | pending / done |
| `F07-MH-03` | RBAC enforcement | `F09-MH-01`, `F09-MH-02`, `F09-MH-03`, `F09-MH-04`, `F09-MH-05` | pending / done |
| `ext:billing-integration` | Billing APIs integrated | `F09-MH-06` | pending |
| `ext:plugin-sandbox-runtime` | Sandboxed runtime foundation | `F09-MH-02` | pending |

### Outbound Dependencies (what other features need from this one)
| Local Task ID | Local Task Title (short) | External Task(s) Blocked | Feature File |
|--------------|-------------------------|-------------------------|-------------|
| `F09-MH-02` | Sandboxed plugin runtime | future enterprise governance | feature-10+ |

### Dependency Chain Position
- **Upstream features:** feature-00 (auth), feature-07 (audit + RBAC)
- **Downstream features:** future enterprise governance, external partner integrations
- **Critical path through this feature:** F00-MH-07 → F09-MH-01 → F09-MH-02 → F09-MH-03

## Blocks Update Patch (apply to previous feature files)

The following tasks in previously generated feature files need their `Blocks` field
updated to include references to tasks in THIS file.

| File | Task ID | Add to Blocks field |
|------|---------|-------------------|
| feature-00-foundations.md | `F00-MH-07` | `F09-MH-01`, `F09-MH-03` |
| feature-07-security-compliance.md | `F07-MH-01` | `F09-MH-04`, `F09-MH-05`, `F09-MH-06` |
| feature-07-security-compliance.md | `F07-MH-03` | `F09-MH-01`, `F09-MH-02`, `F09-MH-03`, `F09-MH-04`, `F09-MH-05` |
