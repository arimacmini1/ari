# Feature 08 – Multi-User Mode
**Priority:** 09 (Phase 2, collaboration + workflow version control)
**Target completion:** weeks 12-16
**Why this feature now:** The canvas is powerful but single-player. Teams need real-time co-editing and Git-like branching to collaborate safely without overwriting each other.

## Definition of Done
A real user can invite another teammate into the same Prompt Canvas, see their live cursor and edits in real time, resolve edit conflicts, and create/merge branches with a visible diff and audit trail. Collaboration is permissioned (RBAC) and all critical actions are logged.

## Must-Have Tasks (vertical slice - real-time co-edit + branching)

- [ ] `F08-MH-01` Implement real-time co-editing sync with presence and cursors
  - Owner: Frontend / Backend
  - Dependencies: `F01-MH-06`, `F00-MH-02`, `F00-MH-07`, `F07-MH-03`
  - Blocks: `F08-CH-01`, `F08-CH-02`, `F08-MH-02`, `F08-SH-01`, `F08-SH-03`
  - Roadmap ref: `P2-MH-03`
  - Acceptance criteria:
    - Two users on same canvas see each other's cursor and selection in <200ms
    - Canvas state is synced via WebSocket channel (per-canvas room)
    - Edits are merged without data loss using CRDT or OT strategy
    - Presence list shows who is online + last activity timestamp
    - Basic rate limiting prevents edit storms from freezing UI
  - Effort: L
  - Gotchas / debug notes: Pick one sync strategy (Yjs/Automerge or OT). Do not broadcast full canvas every change; send patches. Handle reconnect by resyncing full state.
  - Progress / Fixes / Updates:
  - Progress / Fixes / Updates:
  - Progress / Fixes / Updates:
  - Progress / Fixes / Updates:
    - 2026-02-10: Started implementation. Added collaboration ops diff/apply engine and BroadcastChannel-based presence/cursor sync. Wired Prompt Canvas to broadcast ops/cursors and render collaborator presence/cursors (multi-tab support). Pending: conflict UI + branch/merge.

- [ ] `F08-MH-02` Add conflict detection and resolution UI for simultaneous edits
  - Owner: Frontend
  - Dependencies: `F08-MH-01`, `F01-MH-03`, `F07-MH-01`, `F07-MH-03`
  - Blocks: `F08-MH-03`
  - Roadmap ref: `P2-MH-03`
  - Acceptance criteria:
    - When two users edit the same block property, conflict banner appears
    - Conflict resolution modal shows: "yours", "theirs", "merged"
    - Choosing a resolution updates canvas immediately and writes a version snapshot
    - Conflict events are recorded in audit log (actor, block_id, resolution)
  - Effort: M
  - Gotchas / debug notes: Use per-field conflict detection (label vs. properties). Avoid modal spam by batching conflicts into a single panel.
  - Progress / Fixes / Updates:
  - Progress / Fixes / Updates:
    - 2026-02-10: Refined conflict UX. Added multi-conflict banner and merge conflict resolution dialog with per-item selections.

- [ ] `F08-MH-03` Implement branching and merging for prompt workflows (Git-like)
  - Owner: Backend / Frontend
  - Dependencies: `F01-MH-03`, `F07-MH-01`, `F07-MH-03`, `F08-MH-02`
  - Blocks: `F08-MH-04`, `F08-SH-02`
  - Roadmap ref: `P2-MH-06`
  - Acceptance criteria:
    - Users can create a branch from any canvas version (name + description)
    - Branch can be edited independently without affecting main
    - Merge supports 3-way merge using common ancestor version
    - Merge conflicts reuse the conflict UI from F08-MH-02
    - Branch history timeline shows author + timestamp per commit
  - Effort: L
  - Gotchas / debug notes: Store canvas versions as immutable snapshots; merge at node/edge semantic level, not raw JSON. Avoid auto-merge on conflicting node property edits.
  - Progress / Fixes / Updates:
  - Progress / Fixes / Updates:
  - Progress / Fixes / Updates:
  - Progress / Fixes / Updates:
    - 2026-02-10: Started branch/merge workflow. Added branch manager dialog, branch switching, and three-way merge with conflict resolution UI.

- [x] `F08-MH-04` Add merge approval flow and audit logging for multi-user actions
  - Owner: Backend / Frontend
  - Dependencies: `F08-MH-03`, `F07-MH-01`, `F07-MH-03`
  - Blocks: none
  - Roadmap ref: `P2-MH-06`
  - Acceptance criteria:
    - RBAC enforces who can merge to main (Admin/ProjectManager only)
    - Merge requests appear in an "Approvals" queue with diff summary
    - Approve/Reject writes audit log entry with reason
    - Approved merge triggers notification to collaborators
  - Effort: M
  - Gotchas / debug notes: Avoid blocking all work on approvals; only gate merge-to-main. Keep approval UI minimal for MVP.
  - Progress / Fixes / Updates:
    - 2026-02-10: Persisted merge approvals queue in DB (merge_requests table) and wired merge APIs to use it with RBAC + audit logging.

## Should-Have Tasks (makes it team-ready)

- [ ] `F08-SH-01` Add share/invite flow with role selection per canvas
  - Owner: Frontend / Backend
  - Dependencies: `F00-MH-07`, `F07-MH-03`, `F08-MH-01`
  - Blocks: none
  - Roadmap ref: `P2-MH-03`
  - Acceptance criteria:
    - Invite users by email to a specific canvas with role: Viewer/Editor/Owner
    - Invited users can join the live session via link
    - Role changes apply immediately to permissions
  - Effort: M
  - Gotchas / debug notes: Keep invite flow simple (email optional, link-based OK for MVP). Audit role changes.
  - Progress / Fixes / Updates:
  - Progress / Fixes / Updates:
  - Progress / Fixes / Updates:
  - Progress / Fixes / Updates:
    - 2026-02-10: Task created. Not started.

- [ ] `F08-SH-02` Build branch diff viewer (visual + JSON)
  - Owner: Frontend
  - Dependencies: `F08-MH-03`
  - Blocks: none
  - Roadmap ref: `P2-MH-06`
  - Acceptance criteria:
    - Compare two branches side-by-side with added/removed/modified nodes highlighted
    - JSON diff view available for precise inspection
    - Diff summary (nodes added/removed/modified, edges changed)
  - Effort: M
  - Gotchas / debug notes: Reuse visual diff patterns from canvas versioning if available. Large canvases: paginate or virtualize diff lists.
  - Progress / Fixes / Updates:
  - Progress / Fixes / Updates:
  - Progress / Fixes / Updates:
  - Progress / Fixes / Updates:
    - 2026-02-10: Task created. Not started.

- [ ] `F08-SH-03` Show collaboration activity feed (edits, merges, approvals)
  - Owner: Frontend
  - Dependencies: `F07-MH-01`, `F08-MH-01`
  - Blocks: none
  - Roadmap ref: `P2-MH-03`
  - Acceptance criteria:
    - Activity feed lists last 50 actions with actor, timestamp, action type
    - Filter by user, action, date range
    - Clicking an entry highlights affected node(s) on canvas
  - Effort: M
  - Gotchas / debug notes: Feed should read from audit log to avoid duplicate pipelines.
  - Progress / Fixes / Updates:
  - Progress / Fixes / Updates:
  - Progress / Fixes / Updates:
  - Progress / Fixes / Updates:
    - 2026-02-10: Task created. Not started.

## Could-Have Tasks (polish - defer without shame)

- [ ] `F08-CH-01` Add per-node locking for high-stakes edits
  - Owner: Frontend / Backend
  - Dependencies: `F08-MH-01`
  - Blocks: none
  - Roadmap ref: —
  - Acceptance criteria:
    - User can lock a node; others see lock icon and cannot edit
    - Locks expire after inactivity timeout (default 10 minutes)
  - Effort: S
  - Gotchas / debug notes: Locking should be optional; avoid blocking natural collaboration.
  - Progress / Fixes / Updates:
  - Progress / Fixes / Updates:
  - Progress / Fixes / Updates:
  - Progress / Fixes / Updates:
    - 2026-02-10: Task created. Not started.

- [ ] `F08-CH-02` Support offline edits with rebase on reconnect
  - Owner: Backend / Frontend
  - Dependencies: `F08-MH-01`
  - Blocks: none
  - Roadmap ref: —
  - Acceptance criteria:
    - User can continue editing while offline
    - On reconnect, changes rebase with conflict prompts if needed
  - Effort: L
  - Gotchas / debug notes: Offline mode is complex; only do if CRDT library supports it cleanly.
  - Progress / Fixes / Updates:
  - Progress / Fixes / Updates:
  - Progress / Fixes / Updates:
  - Progress / Fixes / Updates:
    - 2026-02-10: Task created. Not started.

## Required Spikes / Decisions (do these first or in parallel)

- Spike: Choose collaboration sync engine (Yjs vs. Automerge vs. OT). Evaluate latency, bundle size, merge behavior.
- Decision: Conflict resolution strategy (field-level vs. node-level) and UX (modal vs. side panel).
- Decision: Branch storage model (separate canvas_id vs. version graph with branch pointers).
- Experiment: Simulate 5 concurrent editors on a 50-node canvas; target <300ms update latency and no dropped edits.

**Deferred:** GitHub integration is queued for a later feature (align with CI/CD integrations in the roadmap).

## Dogfooding Checklist (must be runnable by end of Must-Have)

- [ ] Open same canvas in two browsers; see both cursors and edits live
- [ ] Trigger a conflict (edit same node label) and resolve it successfully
- [ ] Create a branch, make changes, and merge back to main
- [ ] Merge conflict appears and is resolved via merge UI
- [ ] Approve merge as Admin; reject merge as Viewer
- [ ] Activity feed shows last 10 collaboration events

## Cross-Feature Dependency Map

### Inbound Dependencies (what this feature needs from other features)
| External Task ID | External Task Title (short) | Local Task(s) Blocked | Status |
|-----------------|---------------------------|----------------------|--------|
| `F01-MH-06` | Canvas lifecycle E2E | `F08-MH-01` | pending / done |
| `F01-MH-03` | Canvas versioning | `F08-MH-02`, `F08-MH-03` | pending / done |
| `F00-MH-02` | WebSocket transport | `F08-MH-01` | pending / done |
| `F00-MH-07` | Auth skeleton | `F08-MH-01`, `F08-SH-01` | pending / done |
| `F07-MH-01` | Audit log schema | `F08-MH-03`, `F08-MH-04`, `F08-SH-03` | pending / done |
| `F07-MH-03` | RBAC enforcement | `F08-MH-01`, `F08-MH-03`, `F08-MH-04`, `F08-SH-01` | pending / done |

### Outbound Dependencies (what other features need from this one)
| Local Task ID | Local Task Title (short) | External Task(s) Blocked | Feature File |
|--------------|-------------------------|-------------------------|-------------|
| `F08-MH-03` | Branching + merge engine | `P3-SH-04` (future workflow governance) | feature-10+ |

### Dependency Chain Position
- **Upstream features:** feature-00 (auth, WebSocket), feature-01 (canvas + versioning), feature-07 (RBAC + audit)
- **Downstream features:** feature-10+ (enterprise workflow governance), future multi-user reporting
- **Critical path through this feature:** F01-MH-06 -> F08-MH-01 -> F08-MH-02 -> F08-MH-03 -> F08-MH-04

## Blocks Update Patch (apply to previous feature files)

The following tasks in previously generated feature files need their `Blocks` field
updated to include references to tasks in THIS file.

| File | Task ID | Add to Blocks field |
|------|---------|-------------------|
| feature-00-foundations.md | `F00-MH-02` | `F08-MH-01` |
| feature-00-foundations.md | `F00-MH-07` | `F08-MH-01`, `F08-SH-01` |
| feature-01-prompt-canvas.md | `F01-MH-03` | `F08-MH-02`, `F08-MH-03` |
| feature-01-prompt-canvas.md | `F01-MH-06` | `F08-MH-01` |
| feature-07-security-compliance.md | `F07-MH-01` | `F08-MH-03`, `F08-MH-04`, `F08-SH-03` |
| feature-07-security-compliance.md | `F07-MH-03` | `F08-MH-01`, `F08-MH-03`, `F08-MH-04`, `F08-SH-01` |

