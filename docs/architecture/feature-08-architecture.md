<!--
  Feature 08 Architecture Document
  Version: 1.0 (2026-02-10, initial creation for F08-MH-01/02/03/04)
  Status: MVP - Collaboration, Branching, Approvals
-->

# Feature 08 – Multi-User Mode: Architecture & Design

## System Overview

Feature 08 enables **real-time collaboration**, **conflict resolution**, **branching**, and **approval workflows** for Prompt Canvas. The MVP uses local collaboration channels for live updates while approvals are enforced server-side with RBAC and audit logging.

**Key Architecture Decisions:**
- **Collaboration transport:** BroadcastChannel (MVP) for multi-tab sync
- **Conflict strategy:** last-write-wins + explicit conflict UI
- **Branching model:** in-memory branch manager on client for MVP
- **Approvals:** server-side queue with RBAC + audit logs (DB-backed)

**Architecture Diagram:**

```
┌─────────────────────────────── Frontend ───────────────────────────────┐
│ Prompt Canvas (components/aei/prompt-canvas.tsx)                        │
│  ├─ Collaboration Hook (use-canvas-collaboration.ts)                   │
│  │   ├─ BroadcastChannel for ops + presence + cursors                  │
│  │   └─ Conflict detection (node-level)                                │
│  ├─ Branch Manager (local state)                                       │
│  │   ├─ Create / Switch / Merge                                        │
│  │   └─ Merge conflict UI                                              │
│  └─ Approvals Dialog                                                   │
│      ├─ GET /api/merges                                                │
│      └─ POST /api/merges/[id]/approve|reject                           │
└────────────────────────────────────┬───────────────────────────────────┘
                                     │ HTTP
┌─────────────────────────────── Backend ────────────────────────────────┐
│ /api/merges (route.ts)                                                 │
│  ├─ RBAC enforcePermission(approve_merge)                              │
│  ├─ merge_requests table (DB)                                          │
│  └─ audit logs (create/update/delete)                                  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Component Architecture

### Frontend Components

#### 1) PromptCanvas (`components/aei/prompt-canvas.tsx`)
**Responsibilities:**
- Render Prompt Canvas UI, toolbar actions, and previews
- Manage branch state (create/switch/merge)
- Display conflict banner and merge conflict dialog
- Drive approvals UI (request + approve + reject)

**Key State:**
- `branches[]` (client-side)
- `mergeConflicts[]` (merge conflict results)
- `pendingMerges[]` (server-side queue)

#### 2) Collaboration Hook (`lib/use-canvas-collaboration.ts`)
**Responsibilities:**
- Broadcast local ops to collaborators
- Apply remote ops to local state
- Track presence/cursors
- Detect conflicts when edits overlap in time

#### 3) Merge Logic (`lib/canvas-merge.ts`)
**Responsibilities:**
- Three-way merge: base + ours + theirs
- Return merged state + conflicts list

---

## Backend Components

### Merge Queue API

**Routes**
- `GET /api/merges` – list pending merge requests
- `POST /api/merges` – create a merge request
- `POST /api/merges/[id]/approve` – approve request
- `POST /api/merges/[id]/reject` – reject request

**RBAC Enforcement**
- `approve_merge` permission required for listing/approving/rejecting
- Request creation uses `assign` permission (same as orchestration actions)

**Audit Logging**
- Create: `action=create`, resource_type=`workflow`, resource_id=`merge-id`
- Approve: `action=update`, resource_type=`workflow`, resource_id=`merge-id`
- Reject: `action=delete`, resource_type=`workflow`, resource_id=`merge-id`

### Database Schema

**Migration:** `lib/db/migrations/004-merge-requests.sql`

```sql
CREATE TABLE merge_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_id TEXT NOT NULL,
  target_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

---

## Data Flow

1. User creates a branch and edits canvas
2. User clicks **Request merge**
3. Frontend calls `POST /api/merges` with `source_id`, `target_id`
4. Backend inserts merge request (status = pending) and logs audit entry
5. Approver opens **Approvals** and approves/rejects
6. Backend updates merge status + writes audit log
7. Frontend applies merge via three-way merge; if conflicts exist, shows conflict dialog

---

## Known Limitations (MVP)

- Collaboration uses BroadcastChannel (same-device multi-tab only)
- Branches are client-side only (not persisted server-side yet)
- Merge conflict UI is functional but not diff-rich (no inline field diffs)
- Approval queue is persistent, but merge application still happens on client

---

## Future Enhancements

- Replace BroadcastChannel with WebSocket collaboration for multi-user teams
- Persist branch history in DB with per-user authorship
- Add diff visualization (node/edge changes) to merge conflict UI
- Integrate GitHub approvals as a separate feature (queued for later phase)

---

## References

- `/docs/tasks/feature-08-multi-user-mode.md`
- `/docs/on-boarding/feature-08-onboarding.md`
- `/lib/use-canvas-collaboration.ts`
- `/lib/canvas-merge.ts`
- `/app/api/merges/route.ts`
