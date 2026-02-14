# Feature 14 – Projects & Workspaces (Scoping, Budgets, Invites)
**Priority:** 08 (Phase 2+ governance and multi-project scaling)
**Target completion:** weeks 16–18
**Why this feature now:** AEI is currently “one global workspace.” Teams need project boundaries so costs, agents, executions, and audit views can be scoped and governed without mixing contexts.

## Definition of Done
When this lands, a real user can create/select a Project, run executions within it, and see Agent Dashboard / Prompt Canvas / Analytics scoped to the active project. Budgets are enforced (warn at thresholds, optionally block), and invites/roles are project-scoped.

---

## Must-Have Tasks (vertical slice — project scoping + budget guardrails)

- [x] `F14-MH-01` Add Project model + active-project context (UI + API)
  - Owner: Backend / Frontend
  - Dependencies: `F00-MH-07`, `F07-MH-03`
  - Blocks: `F14-CH-01`, `F14-MH-02`, `F14-MH-03`, `F14-MH-04`, `F15-MH-02`
  - Roadmap ref: `P1-SH-06`
  - Acceptance criteria:
    - User can create a project with name + optional budget fields
    - User can list projects and select an active project in the UI
    - Active project context is carried across routes and page refresh
    - API requests include active project id and reject missing/invalid project context (except admin/global endpoints)
  - Effort: L
  - Gotchas / debug notes: Don’t leak global data across projects; ensure the “active project” doesn’t silently fall back to a default.
  - Progress / Fixes / Updates:
    - 2026-02-13: Implemented core project context vertical slice.
      - Added project APIs: `GET/POST /api/projects` and active context API `GET/POST /api/projects/active`.
      - Added active project UI provider + selector in header with localStorage + cookie persistence across refresh.
      - Added request-level project context resolver (`x-project-id` header or active-project cookie).
      - Enforced project context in execution APIs (`/api/executions`, `/api/executions/[executionId]`) and added `project_id` to execution records.
      - Added migration scaffold for future persistent storage: `lib/db/migrations/010-projects-workspaces.sql`.

- [x] `F14-MH-02` Scope executions, traces, and snapshots to active project
  - Owner: Backend
  - Dependencies: `F14-MH-01`, `F03-MH-03`, `F05-MH-01`, `F12-MH-02`
  - Blocks: `F14-MH-03`, `F14-SH-01`
  - Roadmap ref: `P1-SH-06`
  - Acceptance criteria:
    - Execution records include `project_id`
    - Trace fetch/compare/fork endpoints only access traces within project scope (admin override allowed)
    - Code Explorer snapshot endpoints are project-scoped by default
    - Switching projects does not mutate or delete artifacts in other projects
  - Effort: L
  - Gotchas / debug notes: Be explicit about admin/global view; avoid “security by UI toggle.”
  - Progress / Fixes / Updates:
    - 2026-02-13: Implemented project scoping for traces/snapshots and scoped fork status.
      - Enforced active project context on `GET /api/traces/[executionId]`, `POST /api/traces/compare`, `POST /api/traces/fork`, and `GET /api/traces/fork/[forkId]`.
      - Added trace-project association in `lib/mock-trace-store.ts` and set `project_id` on execution-created traces.
      - Scoped Code Explorer snapshots by `(project_id, source)` in `GET/POST /api/code-explorer/snapshot`.
      - Added admin override path via `x-project-admin-override: true` for bootstrap admin user id.
      - Validation: `npm run build`, `npm run docs:parity`, `npm run dogfood:status`.

- [x] `F14-MH-03` Add budget enforcement and alerts per project
  - Owner: Backend / Frontend
  - Dependencies: `F14-MH-01`, `F06-MH-01`, `F06-MH-04`
  - Blocks: `F14-SH-02`
  - Roadmap ref: `P2-SH-03`
  - Acceptance criteria:
    - Project has budget thresholds (soft warning, hard cap)
    - Warn when estimated or actual spend crosses warning threshold (in-app notification)
    - Block new executions when hard cap reached (clear error message)
    - Budget checks are enforced in API layer (not just UI)
  - Effort: M
  - Gotchas / debug notes: “Estimated cost” should be clearly labeled; avoid false precision.
  - Progress / Fixes / Updates:
    - 2026-02-13: Implemented API-level budget enforcement and in-app warning surfacing.
      - Added project spend evaluation helper `lib/project-budget.ts`:
        - Uses `actual_cost` when available, otherwise `estimated_cost`
        - Computes `current_spend`, `incoming_estimated_cost`, and `projected_spend`
      - Enforced hard cap in `POST /api/executions`:
        - Blocks with `402` and clear payload `{ error, code: PROJECT_BUDGET_HARD_CAP_REACHED, project_id, budget }`
      - Added warning payload in successful dispatch responses:
        - `budget_warning: { code: PROJECT_BUDGET_WARNING_THRESHOLD, project_id, budget }`
      - Added in-app notifications in `components/aei/simulation-panel.tsx`:
        - Toast on successful dispatch
        - Destructive toast when warning threshold is crossed
        - Destructive toast when execution is blocked by hard cap

- [x] `F14-MH-04` Implement project invites with project-scoped roles
  - Owner: Backend / Frontend
  - Dependencies: `F14-MH-01`, `F07-MH-03`
  - Blocks: none
  - Roadmap ref: `P1-SH-06`
  - Acceptance criteria:
    - Admin/ProjectManager can invite a user to a project and assign a role
    - Role enforcement is scoped to (user, project) for key actions (execute/install/merge approvals)
    - Invite and role changes emit audit log entries
  - Effort: M
  - Gotchas / debug notes: With auth still skeletal, allow “invite by user_id header” as a dev-mode shortcut but keep server-side enforcement strict.
  - Progress / Fixes / Updates:
    - 2026-02-13: Implemented project invite/membership APIs and project-scoped role enforcement for key actions.
      - Added project membership store and scoped RBAC helper:
        - `lib/project-membership-store.ts`
        - `lib/project-rbac.ts`
      - Added project membership/invite APIs:
        - `GET/POST /api/projects/[projectId]/members`
        - `PATCH /api/projects/[projectId]/members/[userId]`
      - Added dev-mode invite shortcut support:
        - `POST /api/projects/[projectId]/members` accepts `body.user_id` or `x-invite-user-id` header.
      - Enforced project-scoped role checks for key actions:
        - `POST /api/executions` (`execute`)
        - `POST /api/plugins/[pluginId]/install` (`assign`)
        - `POST /api/plugins/[pluginId]/execute` (`execute`)
        - `POST /api/merges/[id]/approve` and `/reject` (`approve_merge`)
      - Invite and role updates now emit audit logs (`resource_type: role`) with project context.
      - Project creation now auto-assigns creator as project `Admin` membership to avoid first-use lockout.
      - Validation: `npm run build`, `npm run docs:parity`, `npm run dogfood:status`.
    - 2026-02-13 (dogfood fixes): Corrected scoped membership routing + state consistency.
      - Fixed dynamic route params handling for membership routes to use async `params` signature in Next.js.
      - Moved project/membership/execution in-memory stores to `globalThis`-backed maps to avoid cross-route state divergence in dev.
      - Updated project-scoped RBAC to use project membership role as authority for scoped actions (bootstrap admin still bypasses).

---

## Should-Have Tasks (makes it team-ready)

- [ ] `F14-SH-01` Add admin global view and cross-project filters
  - Owner: Frontend
  - Dependencies: `F14-MH-02`, `F07-MH-03`
  - Blocks: none
  - Roadmap ref: `P1-SH-06`
  - Acceptance criteria:
    - Admin can view “All Projects” in dashboards with clear visual indicator
    - Filters allow narrowing by project without switching active project
    - Non-admin users cannot access cross-project views
  - Effort: S
  - Gotchas / debug notes: Make “global view” impossible to confuse with “active project.”
  - Progress / Fixes / Updates:
    - 2026-02-13: Not started.

- [ ] `F14-SH-02` Add scheduled budget reports per project
  - Owner: Backend
  - Dependencies: `F14-MH-03`, `F06-MH-06`
  - Blocks: none
  - Roadmap ref: `P2-SH-03`
  - Acceptance criteria:
    - Generate daily/weekly budget summary per project (cost, top agents, top workflows)
    - Export as JSON/CSV and log exports in audit trail
  - Effort: M
  - Gotchas / debug notes: Avoid high write amplification; summarize from existing metric rollups.
  - Progress / Fixes / Updates:
    - 2026-02-13: Not started.

---

## Could-Have Tasks (polish — defer without shame)

- [ ] `F14-CH-01` Add project templates (starter policies, budgets, dashboards)
  - Owner: Frontend / Product
  - Dependencies: `F14-MH-01`
  - Blocks: none
  - Roadmap ref: —
  - Acceptance criteria:
    - Create project from template (budget + alert rules + default dashboard layout)
    - Template catalog is editable by Admin
  - Effort: S
  - Gotchas / debug notes: Keep template payload compact; don’t embed large trace/artifact blobs.
  - Progress / Fixes / Updates:
    - 2026-02-13: Not started.

---

## Required Spikes / Decisions (do these first or in parallel)

- Decision: Project context propagation strategy (header vs. cookie vs. route segment)
- Decision: Budget data source (actual spend only vs. include estimates)
- Spike: Minimal auth strategy for project membership (given current `x-user-id` header model)

---

## Dogfooding Checklist (must be runnable by end of Must-Have)

- [x] Create two projects and switch between them; state remains isolated
- [x] Run an execution in Project A; verify traces/artifacts are not visible in Project B
- [x] Set a low hard cap; confirm new execution is blocked at cap with clear error
- [x] Invite a second user to a project and verify role enforcement works
- [x] Verify audit log records project membership changes and budget enforcement events

---

## Cross-Feature Dependency Map

### Inbound Dependencies (what this feature needs from other features)
| External Task ID | External Task Title (short) | Local Task(s) Blocked | Status |
|-----------------|-----------------------------|------------------------|--------|
| `F00-MH-07` | Auth skeleton | `F14-MH-01`, `F14-MH-04` | pending / done |
| `F07-MH-03` | RBAC enforcement | `F14-MH-01`, `F14-MH-04`, `F14-SH-01` | pending / done |
| `F03-MH-03` | Execution pipeline wiring | `F14-MH-02` | pending / done |
| `F05-MH-01` | Trace viewer baseline | `F14-MH-02` | pending / done |
| `F12-MH-02` | Snapshot loader | `F14-MH-02` | pending / done |
| `F06-MH-01` | KPI schema/pipeline | `F14-MH-03` | pending / done |
| `F06-MH-04` | Threshold alerting | `F14-MH-03` | pending / done |
| `F06-MH-06` | Report export | `F14-SH-02` | pending / done |

### Outbound Dependencies (what other features need from this one)
| Local Task ID | Local Task Title (short) | External Task(s) Blocked | Feature File |
|--------------|---------------------------|--------------------------|-------------|
| `F14-MH-03` | Budget enforcement per project | `P2-SH-03` | roadmap |

### Dependency Chain Position
- **Upstream features:** feature-00 (auth), feature-06 (metrics/alerts), feature-07 (RBAC/audit), feature-12 (snapshots), feature-13 (trace compare/fork)
- **Downstream features:** future multi-tenant, billing, enterprise governance
- **Critical path through this feature:** `F14-MH-01` → `F14-MH-02` → `F14-MH-03` → `F14-MH-04`

---

## Blocks Update Patch (apply to previous feature files)

The following tasks in previously generated feature files need their `Blocks` field
updated to include references to tasks in THIS file.

| File | Task ID | Add to Blocks field |
|------|---------|---------------------|
| feature-00-foundations.md | `F00-MH-07` | `F14-MH-01`, `F14-MH-04` |
| feature-07-security-compliance.md | `F07-MH-03` | `F14-MH-01`, `F14-MH-04`, `F14-SH-01` |
| feature-06-analytics-pane.md | `F06-MH-04` | `F14-MH-03` |
