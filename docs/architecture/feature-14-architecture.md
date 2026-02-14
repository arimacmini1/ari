# Feature 14 – Projects & Workspaces (Scoping, Budgets, Invites): Architecture
**Feature task file:** `docs/tasks/feature-14-projects-workspaces.md`  
**Related on-boarding:** `docs/on-boarding/feature-14-onboarding.md`  
**Status:** IN PROGRESS  
**Last updated:** 2026-02-13

## Summary
Feature 14 introduces an “active project” context and enforces server-side scoping so executions, traces, and snapshots don’t leak across projects.

Current implementation is intentionally in-memory (MVP / dogfood) with SQL migration scaffolds for future persistence.

## Components
### UI
- `components/aei/active-project-provider.tsx`: loads projects, persists active project via cookie + localStorage, exposes `setActiveProjectId` + `createProject`
- `components/aei/header.tsx`: Project selector UI (Select + New)

### Backend (API routes)
- `app/api/projects/route.ts`: list/create projects
- `app/api/projects/active/route.ts`: get/set active project cookie
- `app/api/projects/[projectId]/members/route.ts`: invite/list project members
- `app/api/projects/[projectId]/members/[userId]/route.ts`: update project-scoped role
- `app/api/executions/route.ts`: execution create/list is project-scoped; creates a trace bound to the project
- `app/api/traces/[executionId]/route.ts`: trace fetch is project-scoped
- `app/api/traces/compare/route.ts`: compare is project-scoped
- `app/api/traces/fork/route.ts`: fork is project-scoped; fork results inherit the base project
- `app/api/traces/fork/[forkId]/route.ts`: fork job status is project-scoped
- `app/api/code-explorer/snapshot/route.ts`: snapshots are stored per `(project_id, source)`

### Shared libs / stores
- `lib/project-store.ts`: in-memory projects store (seeds `project-default`)
- `lib/project-context.ts`: active project resolution (`x-project-id` header, then cookie `aei_active_project_id`)
- `lib/project-scope.ts`: shared scope resolver, including a bootstrap-admin override path
- `lib/project-membership-store.ts`: in-memory `(project_id, user_id) -> role` membership map
- `lib/project-rbac.ts`: layered RBAC + project membership permission enforcement
- `lib/execution-store.ts`: shared in-memory executions DB keyed by `execution_id` (includes `project_id`)
- `lib/mock-trace-store.ts`: shared in-memory traces DB with a `execution_id → project_id` index
- `lib/code-explorer-snapshot.ts`: snapshot normalization (data model stays unchanged; storage is project-scoped)

## Data Flow
### Active project selection
1. UI loads projects (`GET /api/projects`)
2. UI persists active project via `POST /api/projects/active` (sets cookie `aei_active_project_id`)
3. Subsequent API calls either send `x-project-id` explicitly or rely on the cookie

### Execution → trace creation
1. Client calls `POST /api/executions` with `x-project-id` (or cookie) and a `x-user-id`
2. Server resolves active project, enforces global RBAC + project membership role permission, and stores an execution record with `project_id`
3. Server also writes a trace record with `project_id` so Trace Viewer can load it

### Project invite and role assignment
1. Admin/ProjectManager calls `POST /api/projects/{projectId}/members` with `user_id` and `role`
2. Server validates scoped permission (`assign`) using project membership
3. Membership record is written/updated and an audit event is emitted (`resource_type: role`)
4. Role updates use `PATCH /api/projects/{projectId}/members/{userId}` with the same enforcement path

## APIs
### Projects
- `GET /api/projects`
- `POST /api/projects`
- `GET /api/projects/active`
- `POST /api/projects/active`
- `GET /api/projects/[projectId]/members`
- `POST /api/projects/[projectId]/members`
- `PATCH /api/projects/[projectId]/members/[userId]`

### Executions (scoped)
- `GET /api/executions`
- `POST /api/executions`
- `GET /api/executions/[executionId]`

### Traces (scoped)
- `GET /api/traces/[executionId]`
- `POST /api/traces/compare`
- `POST /api/traces/fork`
- `GET /api/traces/fork/[forkId]`

### Snapshots (scoped)
- `GET /api/code-explorer/snapshot?source=generated|imported`
- `POST /api/code-explorer/snapshot`

## Dependencies
### Upstream features
- RBAC enforcement: `lib/rbac/*` (executions require `execute` permission)
- Trace Viewer baseline: Feature 05 (trace model + UI) and Feature 13 (compare/fork)
- Code Explorer snapshot baseline: Feature 12

### External services
- Optional Postgres usage via `DATABASE_URL` for RBAC/audit (depending on your local setup)

## Risks
1. **In-memory stores reset on restart:** project IDs, executions, traces, and snapshots are not durable yet.
2. **Admin override is minimal:** current override uses `RBAC_BOOTSTRAP_ADMIN_USER_ID` + `x-user-id` equality and a header opt-in; it is not a full “global admin view” UI yet.
3. **Scope coupling depends on request context:** key action routes now require active project context; missing header/cookie produces explicit request failures.
