<!--
  Feature 14 On-Boarding Guide
  Version: 1.1 (2026-02-13)
  Status: In Progress
-->

# Feature 14 – Projects & Workspaces (Scoping, Budgets, Invites): On-Boarding Guide

**Feature task file:** `docs/tasks/feature-14-projects-workspaces.md`  
**Related architecture:** `docs/architecture/feature-14-architecture.md`  
**Status:** IN PROGRESS (F14-MH-01 and F14-MH-02 implemented)

## Quick Start (10 minutes)

This guide validates:
- Create/select an active project
- Executions are project-scoped
- Traces (fetch + compare + fork) are project-scoped
- Code Explorer snapshots are project-scoped

### What You’ll Need
- Dev server: `npm run dev`
- Two projects created (UI or API)

### 1) Create/select a project in UI
1. Open `http://localhost:3000/`
2. In the header, find the **Project** selector.
3. Click **New** and create a project (example: `dogfood_chain`).
4. Select the new project as the active project.
5. Refresh the page and confirm the selection persists.

---

## Feature Overview

### What You Get
- Multiple projects with an “active project” context.
- API enforcement that prevents cross-project data access (server-side scoping).
- Trace and Code Explorer snapshot isolation by active project.

---

## Testing Guide

### Manual Testing Checklist (Project Scoping)
- [ ] Create two projects and switch between them; state remains isolated
- [ ] Run an execution in Project A; verify trace is not visible in Project B
- [ ] Run compare/fork from Project B and confirm 404s
- [ ] Save a Code Explorer snapshot in Project A; confirm Project B cannot read it

### Test 0 — Find project IDs
```bash
curl -s localhost:3000/api/projects
```
Copy two `project_id` values into:
```bash
PROJECT_A="<PROJECT_A_ID>"
PROJECT_B="<PROJECT_B_ID>"
```

### Test 1 — Execution + trace isolation (API)
Create an execution in Project A:
```bash
curl -s -X POST localhost:3000/api/executions \
  -H 'content-type: application/json' \
  -H "x-project-id: $PROJECT_A" \
  -H 'x-user-id: drew' \
  -d '{"rule_set_id":"rs-1","assignment_plan":[{"id":"t1","assigned_agent_id_or_pool":"agent-1","estimated_cost":0.01,"estimated_duration":1,"status":"pending"}]}'
```

Copy the returned `execution_id` into:
```bash
EXEC_ID="<EXECUTION_ID>"
```

Expected: trace fetch succeeds in Project A:
```bash
curl -i -s localhost:3000/api/traces/$EXEC_ID -H "x-project-id: $PROJECT_A"
```

Expected: trace fetch fails (404) in Project B:
```bash
curl -i -s localhost:3000/api/traces/$EXEC_ID -H "x-project-id: $PROJECT_B"
```

Expected: compare fails (404) in Project B:
```bash
curl -i -s -X POST localhost:3000/api/traces/compare \
  -H 'content-type: application/json' \
  -H "x-project-id: $PROJECT_B" \
  -d "{\"execution_id\":\"$EXEC_ID\",\"node_id\":\"decision-dispatch\",\"alternative_outcome\":\"Try alternative\"}"
```

### Test 2 — Code Explorer snapshot isolation (API)
Save a snapshot in Project A:
```bash
curl -i -s -X POST "localhost:3000/api/code-explorer/snapshot" \
  -H 'content-type: application/json' \
  -H "x-project-id: $PROJECT_A" \
  -d '{"source":"generated","artifacts":[]}'
```

Expected: read succeeds in Project A:
```bash
curl -i -s "localhost:3000/api/code-explorer/snapshot?source=generated" \
  -H "x-project-id: $PROJECT_A"
```

Expected: read fails (404) in Project B (unless you also wrote a snapshot there):
```bash
curl -i -s "localhost:3000/api/code-explorer/snapshot?source=generated" \
  -H "x-project-id: $PROJECT_B"
```

### Test 3 — Project invites, role updates, and scoped enforcement
Invite a second user to Project A as `Viewer`:
```bash
curl -i -s -X POST localhost:3000/api/projects/$PROJECT_A/members \
  -H 'content-type: application/json' \
  -H "x-project-id: $PROJECT_A" \
  -H 'x-user-id: drew' \
  -d '{"user_id":"qa-user-2","role":"Viewer"}'
```

Expected: list members includes `qa-user-2` role `Viewer`:
```bash
curl -i -s localhost:3000/api/projects/$PROJECT_A/members \
  -H "x-project-id: $PROJECT_A" \
  -H 'x-user-id: drew'
```

Expected: `qa-user-2` cannot execute (project-scoped role enforcement):
```bash
curl -i -s -X POST localhost:3000/api/executions \
  -H 'content-type: application/json' \
  -H "x-project-id: $PROJECT_A" \
  -H 'x-user-id: qa-user-2' \
  -d '{"rule_set_id":"rs-role-test","assignment_plan":[{"id":"t1","assigned_agent_id_or_pool":"agent-1","estimated_cost":0.01,"estimated_duration":1,"status":"pending"}]}'
```

Update `qa-user-2` to `ProjectManager`:
```bash
curl -i -s -X PATCH localhost:3000/api/projects/$PROJECT_A/members/qa-user-2 \
  -H 'content-type: application/json' \
  -H "x-project-id: $PROJECT_A" \
  -H 'x-user-id: drew' \
  -d '{"role":"ProjectManager"}'
```

Expected: `qa-user-2` can now execute:
```bash
curl -i -s -X POST localhost:3000/api/executions \
  -H 'content-type: application/json' \
  -H "x-project-id: $PROJECT_A" \
  -H 'x-user-id: qa-user-2' \
  -d '{"rule_set_id":"rs-role-test-2","assignment_plan":[{"id":"t2","assigned_agent_id_or_pool":"agent-1","estimated_cost":0.01,"estimated_duration":1,"status":"pending"}]}'
```

Expected: audit logs contain membership invite/update events:
```bash
curl -s "localhost:3000/api/audit/logs?resource_type=role"
```

---

## Key Files
- `docs/tasks/feature-14-projects-workspaces.md`
- `docs/architecture/feature-14-architecture.md`
- `lib/project-context.ts`
- `lib/project-store.ts`
- `components/aei/active-project-provider.tsx`
- `app/api/projects/route.ts`
- `app/api/projects/active/route.ts`
- `app/api/projects/[projectId]/members/route.ts`
- `app/api/projects/[projectId]/members/[userId]/route.ts`
- `app/api/executions/route.ts`
- `lib/project-membership-store.ts`
- `lib/project-rbac.ts`
- `app/api/traces/[executionId]/route.ts`
- `app/api/traces/compare/route.ts`
- `app/api/traces/fork/route.ts`
- `app/api/traces/fork/[forkId]/route.ts`
- `app/api/code-explorer/snapshot/route.ts`

---

## Debugging Guide

### Issue: `-H: command not found`
**Symptoms:** You ran `-H 'x-project-id: ...'` by itself and bash said `command not found`.  
**Fix:** `-H` is a flag to `curl`. Example:
```bash
curl -s localhost:3000/api/projects -H 'x-project-id: project-default'
```

### Issue: `403 Forbidden: insufficient permissions.`
**Symptoms:** `POST /api/executions` returns `{"error":"Forbidden: insufficient permissions."}`.  
**Cause:** RBAC requires a known user id + role with `execute` permission.  
**Fix:**
1. Add `RBAC_BOOTSTRAP_ADMIN_USER_ID=drew` to `.env.local`
2. Restart `npm run dev`
3. Include `-H 'x-user-id: drew'` on protected routes.

### Issue: `Invalid project context: project-...` after restart
**Symptoms:** Requests 400/404 with `Invalid project context: ...` even though it worked earlier.  
**Cause:** Projects are in-memory; restarting the dev server resets them.  
**Fix:** Recreate the project (UI or `POST /api/projects`) and use the new `project_id`.

### Issue: `Forbidden: no access to project ...`
**Symptoms:** Key actions (`/api/executions`, plugin install/execute, merge approvals) return project access denied.  
**Cause:** User is not a project member or role lacks permission.  
**Fix:** Invite the user via `POST /api/projects/{projectId}/members` and assign `ProjectManager` or `Admin` as needed.

---

## Related Docs
- `docs/tasks/feature-14-projects-workspaces.md`
- `docs/architecture/feature-14-architecture.md`
