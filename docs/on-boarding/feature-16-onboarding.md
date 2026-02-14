<!--
  Feature 16 On-Boarding Guide
  Version: 1.0 (2026-02-13)
  Status: In Progress (Slices 1-4)
-->

# Feature 16 - Team Collaboration (Shared Canvas, Live Edit, Comment Threads): On-Boarding Guide

**Feature task file:** `docs/tasks/feature-16-team-collaboration.md`  
**Related architecture:** `docs/architecture/feature-16-architecture.md`  
**Status:** IN PROGRESS (slices 1-4 complete)

## Quick Start (10 minutes)

This guide validates slice 1:
- Block-level comment thread posting
- `@mention` activity generation
- Unread mention badges in canvas and header
- Multi-session comment/activity synchronization
- Deterministic conflict handling with duplicate prompt suppression
- Activity feed filtering by mentions/comments/edits with persisted read-state
- Version rollback metadata + rollback activity event propagation

### What You’ll Need
- Dev server: `npm run dev`
- Prompt Canvas tab open in two browser windows (same user profile)
- At least one block in canvas

---

## Testing Guide

### Manual Testing Checklist
- [ ] Select a canvas block and post a comment
- [ ] Post comment with `@<your-handle>` mention and confirm unread indicator
- [ ] Verify canvas toolbar mention count and header bell badge reflect unread state
- [ ] Open second session and verify comment + activity sync
- [ ] Mark activity read and verify badge decreases
- [ ] Trigger two near-simultaneous edits to same block and verify a single conflict prompt
- [ ] Filter activity by mentions/comments/edits and verify results + read-state persist after refresh
- [ ] Save 3+ versions, revert one, and confirm rollback appears in history + activity feed

### Test 1 — Post block comment
1. Open Prompt Canvas.
2. Select a block.
3. Open comments panel and post a short comment.

Expected: comment appears in selected block thread with author and timestamp.

### Test 2 — Mention activity + unread badges
1. Post a comment containing `@user` where `user` matches your local mention handle.
2. Observe mention activity list.

Expected: new activity entry appears as unread; canvas/header unread badges update.

### Test 3 — Cross-session sync
1. Open a second browser tab/window to the same app and project.
2. Add a new comment in session A.

Expected: session B receives updated thread and activity shortly without refresh.

### Test 4 — Mark read behavior
1. In activity panel, click an unread mention entry or use "Mark all read".
2. Observe header bell + canvas badges.

Expected: unread count decreases and reaches zero when all read.

---

## Troubleshooting

### Issue: Comments do not sync between tabs
**Symptoms:** Comment appears only in current tab.
**Cause:** Browser may not support `BroadcastChannel` in current context.
**Solution:** Verify browser support; test in a modern Chromium/Firefox build.

### Issue: Mention badge never increments
**Symptoms:** `@mention` text added but unread stays zero.
**Cause:** Mention handle mismatch with local normalized actor handle.
**Solution:** Use lowercase alphanumeric handle matching current display name normalization.

### Issue: Comment missing after reload
**Symptoms:** Newly posted comment disappeared.
**Cause:** localStorage write failed or profile storage cleared.
**Solution:** Confirm storage is enabled and not blocked in browser privacy mode.

---

## Related Features
- Feature 01 – Prompt Canvas
- Feature 08 – Multi-User Mode
- Feature 14 – Projects & Workspaces

---

## Reporting Issues

If you find bugs or issues:
1. Capture repro steps and expected/actual behavior.
2. Add notes under `F16-MH-01` progress in `docs/tasks/feature-16-team-collaboration.md`.
