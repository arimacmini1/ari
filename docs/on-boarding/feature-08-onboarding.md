<!--
  Feature 08 On-Boarding Guide
  Version: 1.0 (2026-02-10, initial creation for F08-MH-01/02/03/04)
  Status: MVP - Collaboration, Branching, Approvals
-->

# Feature 08 – Multi-User Mode: On-Boarding Guide

## Quick Start

### 1) Open Prompt Canvas
1. Open the app and select **Prompt Canvas**
2. You should see the new **Branches** and **Approvals** buttons in the toolbar

### 2) Simulate Collaboration (same device)
1. Open the app in two browser tabs
2. In Tab A, drag a node onto the canvas
3. In Tab B, edit the same node label within ~5 seconds
4. You should see a **conflict banner** with resolution buttons

### 3) Branch + Merge
1. Click **Branches**
2. Create a branch (name + optional description)
3. Switch to the branch and make edits
4. Click **Request merge** to queue an approval

### 4) Approve or Reject
1. Click **Approvals**
2. Approve or reject the pending request
3. Approved merges apply to the current branch

---

## Feature Overview

### What You Get
- **Real-time collaboration** (multi-tab presence + cursor sync)
- **Conflict detection** with per-conflict resolution
- **Branching + merging** for canvas workflows
- **Approval queue** with RBAC gating + audit logging

### Key Capabilities
**Collaboration**
- Presence list shows active collaborators
- Cursor markers for other users
- Changes broadcast via local collaboration channel (MVP)

**Conflicts**
- Conflict banner for simultaneous edits
- Per-conflict resolution actions (mine vs theirs)

**Branching**
- Create branches from current canvas
- Switch branches and edit independently
- Merge via approval flow

**Approvals**
- Queue merge requests
- Approve/Reject with RBAC enforcement
- Audit logs for approval decisions

---

## Testing Guide

### Collaboration (F08-MH-01)
- [ ] Open two tabs and confirm presence shows both users
- [ ] Confirm cursors render in both tabs
- [ ] Make edits in Tab A and confirm Tab B updates

### Conflict Handling (F08-MH-02)
- [ ] Edit the same node label in both tabs within 5 seconds
- [ ] Banner appears with resolution actions
- [ ] Choose **Keep mine** or **Use theirs** and verify node content

### Branching + Merge (F08-MH-03)
- [ ] Create a branch and switch to it
- [ ] Edit nodes in branch
- [ ] Request merge

### Approvals (F08-MH-04)
- [ ] Open **Approvals**
- [ ] Approve merge (Admin/ProjectManager)
- [ ] Reject merge and confirm no changes applied
- [ ] Verify audit log entries for approve/reject

---

## Quick Reference

### Routes
- `/api/merges` (GET pending, POST create request)
- `/api/merges/[id]/approve` (POST)
- `/api/merges/[id]/reject` (POST)
- `/api/audit/logs` (audit log viewer/export)

### Key Files
- `components/aei/prompt-canvas.tsx`
- `components/aei/canvas-flow.tsx`
- `lib/use-canvas-collaboration.ts`
- `lib/canvas-collab.ts`
- `lib/canvas-merge.ts`
- `lib/merge-requests.ts`
- `lib/db/migrations/004-merge-requests.sql`
- `app/api/merges/route.ts`
- `app/api/merges/[id]/approve/route.ts`
- `app/api/merges/[id]/reject/route.ts`

---

## Debugging Guide

### Issue: Approvals return 403
**Check:**
1. `RBAC_BOOTSTRAP_ADMIN_USER_ID` is set in `.env.local`
2. Request includes `x-user-id` header
3. User has `approve_merge` permission (Admin/ProjectManager)

### Issue: No pending merge requests
**Check:**
1. Branch created and changes made
2. **Request merge** clicked
3. Migration `004-merge-requests.sql` applied

### Issue: Conflicts not detected
**Check:**
1. Edits happen within 5 seconds of each other
2. Both tabs are on the same canvas
3. Conflict banner appears only when edits overlap on the same node

---

## Related Docs

- `/docs/architecture/feature-08-architecture.md`
- `/docs/tasks/feature-08-multi-user-mode.md`
- `/docs/on-boarding/feature-07-onboarding.md`
