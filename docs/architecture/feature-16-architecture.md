# Feature 16 - Team Collaboration (Shared Canvas, Live Edit, Comment Threads): Architecture
**Feature task file:** `docs/tasks/feature-16-team-collaboration.md`  
**Related on-boarding:** `docs/on-boarding/feature-16-onboarding.md`  
**Status:** IN PROGRESS (slices 1-4 complete)  
**Last updated:** 2026-02-13

## Overview
Feature 16 extends existing live canvas collaboration with structured communication: block-level comment threads, mention parsing, and project-scoped activity/read-state so collaborators can coordinate edits in-context.

## System Design
```
Prompt Canvas
  ├─ Existing live-edit channel (presence/cursor/ops)
  ├─ Comments panel (thread + activity UI)
  ├─ Version history metadata (actor/source/collaboration context)
  ├─ Rollback snapshot creation + collaboration broadcast
  └─ Header bell unread indicator

Collaboration Comment Layer (client MVP)
  ├─ Comment/domain model
  ├─ Mention extraction + activity derivation
  ├─ Local persistence (project + canvas scoped)
  └─ Broadcast sync channel (multi-tab/session)
```

### Key Components
- **`lib/canvas-comments.ts`:** Canonical types for comments/threads/activity plus mention extraction and preview helpers.
- **`lib/use-canvas-comments.ts`:** State source-of-truth for comment threads and activity feed (`mention/comment/edit`) with read-state persistence per `(project_id, canvas_id)`.
- **`components/aei/canvas-comments-panel.tsx`:** Collaboration UI for selected block thread, comment posting, and recent mention activity.
- **`components/aei/prompt-canvas.tsx`:** Integrates comments hook/panel, streams remote edit events into activity, and surfaces unread mention badge.
- **`components/aei/header.tsx`:** Consumes collaboration notification event and shows unread mention count in notification bell.

### Data Flow (current slices)
1. User selects a block and posts a comment in the comments panel.
2. Hook normalizes comment, extracts `@mentions`, writes thread state.
3. Mention entries are generated and unread state computed for current actor handle.
4. Updated state is persisted to localStorage and broadcast to active collaboration channel.
5. Other sessions receive sync state and refresh comments/activity.
6. Hook emits unread count event; header and canvas badge update.
7. Saving or autosaving a version writes actor/source/collaborator metadata.
8. Rollback creates a new version entry (`save_source=rollback`) and emits rollback activity event.

## Architecture Decisions

### Decision: Start with client-scoped comment storage for first slice
- **Chosen approach:** local persistence + local collaboration channel.
- **Why:** delivers immediately usable vertical slice without waiting for backend schemas/transport.
- **Alternatives considered:** add API + DB persistence in same slice.
- **Tradeoffs:** no cross-device durability yet; mention routing is local-handle based.

### Decision: Mention parsing as deterministic token extraction
- **Chosen approach:** regex-based `@handle` extraction normalized to lowercase.
- **Why:** simple and predictable for first iteration; avoids expensive NLP entity matching.
- **Alternatives considered:** free-form mention inference.
- **Tradeoffs:** requires explicit canonical handle strategy in later slice.

## Integration Points

### Upstream Dependencies
- Feature 01 – Prompt Canvas lifecycle and state model
- Feature 08 – Baseline live collaboration (presence/cursor/ops)
- Feature 14 – Active project context

### Downstream Dependents
- Phase 3 collaboration-centric enablement/training workflows
- Future enterprise review and moderated collaboration features

## Known Issues & Constraints
- Comments are not yet persisted server-side.
- Mention identity currently uses normalized display name heuristic.
- Activity stream currently reflects collaboration events in client scope only (no server fan-out yet).
- Rollback confirmation currently relies on version selection UI flow (no extra confirmation dialog yet).

## Future Improvements
- Server-backed comment/activity APIs with audit-ready persistence.
- Mention autocomplete using project membership identity.
- Unified activity stream merging comments, edits, and rollback events.
- Real backend room transport implementation behind `CollabTransport` interface.

## References
- Task file: `docs/tasks/feature-16-team-collaboration.md`
- Related files: `lib/use-canvas-collaboration.ts`, `components/aei/prompt-canvas.tsx`
