# Feature 16 - Team Collaboration (Shared Canvas, Live Edit, Comment Threads)
**Priority:** 10 (Phase 2 team workflows + shared authoring)
**Target completion:** weeks 20-24
**Why this feature now:** Multi-user editing exists in basic form, but teams still lack first-class collaboration primitives (threaded comments + mention workflow) to coordinate on the same canvas without context switching.

## Scope Lock (B1 - this execution)
- In scope (first vertical slice):
  - `F16-MH-01` only: block-level comment threads with mention-aware activity feed, synchronized for active collaborators on the same canvas/project.
- Out of scope (deferred to later slices):
  - server-persisted collaboration backend,
  - cross-user delivery guarantees for mentions,
  - full canvas-level rollback/version browsing UX consolidation.
- Success metrics for this slice:
  - A user can post comments on a selected block and see thread history.
  - `@mention` tokens in comments generate unread activity entries.
  - Mention unread count appears in both canvas toolbar and global header bell.
  - Comments + activity synchronize across concurrent sessions on same machine/profile.

## Definition of Done
When this feature fully lands, multiple users can collaborate on the same canvas with live edits, threaded discussions on blocks, mention-driven awareness, and safe version rollback history so teams can coordinate and recover quickly.

---

## Must-Have Tasks (MH-only scope first)

- [x] `F16-MH-01` Add block-level comment threads and mention activity feed to Prompt Canvas
  - Owner: Frontend
  - Dependencies: `F01-MH-06`, `F14-MH-01`, `F08-MH-01`
  - Blocks: `F16-MH-02`, `F16-MH-03`
  - Roadmap ref: `P2-SH-01`
  - Acceptance criteria:
    - Comments can be posted against the currently selected canvas block
    - Each block has a thread timeline with author, timestamp, and body
    - `@mention` tokens generate activity entries and unread state
    - Unread mention count is visible in canvas and global header
    - Comment/activity state syncs via collaboration channel for same project + canvas
  - Effort: M
  - Gotchas / debug notes: Keep mention parsing deterministic; avoid creating unread noise for non-target users.
  - Progress / Fixes / Updates:
    - 2026-02-13: Started Feature 16 B1 scope-lock slice for collaboration comments.
      - Added collaboration comment domain model + mention parser (`lib/canvas-comments.ts`).
      - Added comment sync hook with local persistence + `BroadcastChannel` replication (`lib/use-canvas-comments.ts`).
      - Added canvas comments panel with block thread + mention activity feed (`components/aei/canvas-comments-panel.tsx`).
      - Integrated comments/mention status into Prompt Canvas workflow controls and side panel (`components/aei/prompt-canvas.tsx`).
      - Integrated unread mention indicator in header notifications (`components/aei/header.tsx`).
    - 2026-02-13 (follow-up): Began auth-identifier mention mapping hardening for dogfood checklist closure.
      - Added canonical mention target resolution against collaborator/user identity directory (`lib/canvas-comments.ts`).
      - Updated comments activity generation to store mention target user IDs and avoid unread noise for non-target users (`lib/use-canvas-comments.ts`).
      - Extended collaboration identity event payload with collaborator IDs to support mention mapping (`components/aei/prompt-canvas.tsx`).
      - Added mention parser/target resolver unit tests (`lib/canvas-comments.test.ts`).

- [x] `F16-MH-02` Harden shared canvas live-edit contracts for multi-user consistency
  - Owner: Frontend / Backend
  - Dependencies: `F08-MH-01`, `F01-MH-06`, `F16-MH-01`
  - Blocks: `F16-MH-03`, `F16-MH-04`
  - Roadmap ref: `P2-SH-01`
  - Acceptance criteria:
    - Concurrent edits preserve node/edge integrity with deterministic conflict behavior
    - Presence and cursor updates remain responsive with 5+ concurrent editors
    - Conflict resolution UI records selected outcome and suppresses duplicate prompts
    - Shared state transport supports eventual transition to backend transport without API break
  - Effort: L
  - Gotchas / debug notes: Existing local broadcast transport is not enough for distributed sessions.
  - Progress / Fixes / Updates:
    - 2026-02-13: Implemented deterministic operation ordering and conflict prompt de-dup in collaboration core.
      - Updated collab operation application to use deterministic per-target clocks (`ts + clientId + opId`) for stable convergence across message ordering (`lib/canvas-collab.ts`).
      - Added transport abstraction seam to collaboration hook so channel backend can be swapped without caller API changes (`lib/canvas-collab-transport.ts`, `lib/use-canvas-collaboration.ts`).
      - Added duplicate conflict suppression + resolution history recording in collaboration hook (`lib/use-canvas-collaboration.ts`).
      - Added regression tests for deterministic equal-timestamp conflict outcomes (`lib/canvas-collab.test.ts`).
      - Verification notes: test config fixed (`vitest.config.ts` alias-based resolution), `npm run test`, `npm run build`, and `npm run docs:parity` pass.

- [x] `F16-MH-03` Ship project-scoped collaboration activity stream with mention filtering
  - Owner: Full-stack
  - Dependencies: `F16-MH-01`, `F14-MH-01`
  - Blocks: `F16-MH-04`
  - Roadmap ref: `P2-SH-01`
  - Acceptance criteria:
    - Activity stream includes comments, edits, and mention events
    - Users can filter by `mentions`, `comments`, and `edits`
    - Activity stream respects project scope and active project switching
    - Read state survives refresh and clears predictably
  - Effort: M
  - Gotchas / debug notes: Avoid mixing activity across projects.
  - Progress / Fixes / Updates:
    - 2026-02-13: Implemented project-scoped activity feed with mention/comment/edit filtering.
      - Refactored activity model to typed collaboration feed entries (`mention`, `comment`, `edit`) with shared read-state (`lib/canvas-comments.ts`).
      - Extended comments hook to emit comment + mention events, persist project-scoped activity state, and record edit events (`lib/use-canvas-comments.ts`).
      - Extended collaboration hook to emit remote node edit events with actor/action metadata (`lib/use-canvas-collaboration.ts`).
      - Wired edit-event ingestion into canvas comments activity and added feed filters in UI (`components/aei/prompt-canvas.tsx`, `components/aei/canvas-comments-panel.tsx`).
      - Verification notes: activity read-state is persisted in project+canvas storage key and survives refresh/project switching.
      - Validation: `npm run build`, `npm run docs:parity`.
    - 2026-02-13 (dogfood fix): resolved cross-tab sync identity and mention badge visibility issues.
      - Updated collaboration `clientId` model to include per-tab session id so tabs no longer ignore each other as same client (`lib/use-canvas-collaboration.ts`).
      - Scoped collaboration transport channel by project key to avoid cross-project signal bleed (`lib/use-canvas-collaboration.ts`, `components/aei/prompt-canvas.tsx`).
      - Updated mention activity defaults to unread so badges surface reliably during collaboration dogfood (`lib/use-canvas-comments.ts`).

- [x] `F16-MH-04` Unify canvas version history + rollback with collaboration metadata
  - Owner: Frontend / Backend
  - Dependencies: `F01-MH-03`, `F16-MH-02`, `F16-MH-03`
  - Blocks: none
  - Roadmap ref: `P2-SH-01`
  - Acceptance criteria:
    - Version history entries include actor and collaboration context
    - Users can rollback to a selected version with confirmation
    - Rollback emits activity event and updates collaborators
    - Version list remains usable for 100+ snapshots
  - Effort: M
  - Gotchas / debug notes: Ensure rollback does not silently discard recent unsaved edits.
  - Progress / Fixes / Updates:
    - 2026-02-13: Implemented collaboration-aware version metadata and rollback activity flow.
      - Extended version store entries with actor name, save source (`manual|autosave|rollback`), collaborator context, and rollback linkage (`lib/canvas-versions.ts`).
      - Added version retention cap (250 snapshots) to keep history usable with 100+ snapshots (`lib/canvas-versions.ts`).
      - Updated version history UI to show source, actor, collaborator count, and rollback lineage (`components/aei/version-history.tsx`).
      - Added rollback activity event type and feed entries (`lib/canvas-comments.ts`, `lib/use-canvas-comments.ts`).
      - Updated rollback flow to create explicit rollback snapshot + emit rollback activity + broadcast state changes to collaborators (`components/aei/prompt-canvas.tsx`).
      - Validation: `npm run test`, `npm run build`, `npm run docs:parity`.

---

## Should-Have Tasks (team quality)

- [ ] `F16-SH-01` Add inline comment anchors directly on canvas nodes
  - Owner: Frontend
  - Dependencies: `F16-MH-01`
  - Blocks: none
  - Roadmap ref: `P2-SH-01`
  - Acceptance criteria:
    - Nodes with active threads show comment count badge
    - Clicking badge focuses corresponding thread
    - Badge state updates live as comments are added/resolved
  - Effort: S
  - Gotchas / debug notes: Keep badges legible at low zoom.
  - Progress / Fixes / Updates:
    - 2026-02-13: Not started.

- [ ] `F16-SH-02` Add mention autocomplete for active collaborators
  - Owner: Frontend
  - Dependencies: `F16-MH-01`, `F08-MH-01`
  - Blocks: none
  - Roadmap ref: `P2-SH-01`
  - Acceptance criteria:
    - Typing `@` shows active collaborator suggestions
    - Selecting suggestion inserts mention token format used by parser
    - Suggestion list updates when collaborators join/leave
  - Effort: S
  - Gotchas / debug notes: Maintain keyboard-only interaction support.
  - Progress / Fixes / Updates:
    - 2026-02-13: Not started.

---

## Could-Have Tasks (polish)

- [ ] `F16-CH-01` Add comment resolve/reopen workflow with lightweight moderation controls
  - Owner: Frontend / Product
  - Dependencies: `F16-MH-01`
  - Blocks: none
  - Roadmap ref: —
  - Acceptance criteria:
    - Thread can be marked resolved/reopened
    - Resolved threads can be hidden by default
    - Role-based moderation hooks are available for future admin policy
  - Effort: S
  - Gotchas / debug notes: Preserve auditability of resolved comments.
  - Progress / Fixes / Updates:
    - 2026-02-13: Not started.

---

## Required Spikes / Decisions (do these first or in parallel)

- Decision: Persistent storage and retention policy for collaboration comments/activity
- Decision: Mention identity model (`display name` vs `user id` canonical handle)
- Spike: Backend collaboration transport strategy (WebSocket room model vs CRDT provider)

---

## Dogfooding Checklist (must be runnable by end of Must-Have)

- [x] Select a block and add a thread comment in Prompt Canvas
- [x] Add a comment with `@mention` and verify unread mention count updates
- [x] Confirm header bell and canvas mention badge show unread state
- [x] Open a second canvas session and verify comment/activity sync
- [x] Validate mention/user mapping against real auth identifiers
- [x] Trigger simultaneous node edits and verify conflict prompts are de-duplicated
- [x] Filter activity feed by mentions/comments/edits and verify read-state survives refresh
- [x] Revert to a saved version and verify rollback appears in activity feed and syncs to collaborators

---

## Cross-Feature Dependency Map

### Inbound Dependencies (what this feature needs from other features)
| External Task ID | External Task Title (short) | Local Task(s) Blocked | Status |
|-----------------|-----------------------------|------------------------|--------|
| `F01-MH-03` | Canvas versioning and snapshots | `F16-MH-04` | pending / done |
| `F01-MH-06` | Canvas lifecycle baseline | `F16-MH-01`, `F16-MH-02` | pending / done |
| `F08-MH-01` | Multi-user collaboration baseline | `F16-MH-01`, `F16-MH-02`, `F16-SH-02` | pending / done |
| `F14-MH-01` | Project active-context model | `F16-MH-01`, `F16-MH-03` | pending / done |

### Outbound Dependencies (what other features need from this one)
| Local Task ID | Local Task Title (short) | External Task(s) Blocked | Feature File |
|--------------|---------------------------|--------------------------|-------------|
| `F16-MH-01` | Comment threads + mentions | `P3-SH-01` (training/certification workflows needing collaboration review loops) | roadmap |

### Dependency Chain Position
- **Upstream features:** feature-01 (canvas lifecycle/versioning), feature-08 (multi-user baseline), feature-14 (project scope)
- **Downstream features:** phase-3 collaboration-heavy onboarding/certification and enterprise review workflows
- **Critical path through this feature:** `F16-MH-01` -> `F16-MH-02` + `F16-MH-03` -> `F16-MH-04`

---

## Blocks Update Patch (apply to previous feature files)

The following tasks in previously generated feature files need their `Blocks` field
updated to include references to tasks in THIS file.

| File | Task ID | Add to Blocks field |
|------|---------|---------------------|
| feature-01-prompt-canvas.md | `F01-MH-03` | `F16-MH-04` |
| feature-01-prompt-canvas.md | `F01-MH-06` | `F16-MH-01`, `F16-MH-02` |
| feature-08-multi-user-mode.md | `F08-MH-01` | `F16-MH-01`, `F16-MH-02`, `F16-SH-02` |
| feature-14-projects-workspaces.md | `F14-MH-01` | `F16-MH-01`, `F16-MH-03` |
