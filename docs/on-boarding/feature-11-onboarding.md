<!--
  Feature 11 On-Boarding Guide
  Version: 1.2 (2026-02-11)
  Status: In Progress
-->

# Feature 11 - Familiar Mode and Onboarding: On-Boarding Guide

## Quick Start

### 1) Open the feature surface
1. Navigate to `/` (main dashboard opens directly).
2. Open AI Copilot panel if collapsed.
3. Type a message and press Enter (assistant reply should appear).
4. After 3 user messages, confirm automatic draft update runs (canvas state refreshes from draft patch ops).
5. Click `Apply to Canvas` and verify Prompt Canvas receives expanded graph updates.

### 2) Validate control flows
1. Click `New` to archive current session and start blank.
2. Open `History` and restore an archived chat entry.
3. Verify archive cards show timestamp + preview and support delete.
4. Open `Checkpoints` (bookmark icon), restore a checkpoint from a specific user message.
5. Use `Prompt` selector:
   - choose `Auto` and send a code-heavy prompt (should resolve to architecture prompt)
   - choose a specific prompt manually and verify replies use that mode
6. Trigger an expansion fallback (timeout/provider failure) and verify non-blocking toast appears.

---

## Feature Overview

### What You Get
- One-screen dashboard workflow: Prompt Canvas + AI Copilot.
- Real-time LLM chat with incremental draft canvas preview.
- Subject-routed system prompts with optional manual prompt override.
- Strong-model canvas apply with timeout + deterministic fallback.
- Session controls: clear, new/archive, history restore/delete.
- Per-message checkpoints with chat + draft snapshot restore.

---

## Testing Guide

### Must-Have Tasks
- [x] `F11-MH-01`: Familiar entry flow migrated into main dashboard copilot
- [x] `F11-MH-06`: Real-time chat LLM replies (fast model)
- [x] `F11-MH-07`: Draft canvas updates via patch ops
- [x] `F11-MH-02`: Strong-model apply to Prompt Canvas with fallback

### Manual Checklist
- [ ] AI Copilot replies on each message
- [ ] Automatic draft update runs every 3 user turns and updates canvas state
- [ ] `Apply to Canvas` updates `canvas-state`
- [ ] Expansion timeout/failure shows toast and deterministic fallback still applies
- [ ] `New` archives current session
- [ ] `History` restore works and delete removes archive item
- [ ] `Checkpoints` restore a specific message snapshot

---

## Key Files
- `app/page.tsx`
- `app/layout.tsx`
- `components/aei/copilot-workbench.tsx`
- `components/aei/console-chat.tsx`
- `app/api/familiar/chat/route.ts`
- `app/api/familiar/prompts/route.ts`
- `app/api/familiar/draft/route.ts`
- `app/api/familiar/expand/route.ts`
- `lib/copilot/prompt-registry.ts`
- `lib/copilot/prompt-router.ts`

---

## Debugging Guide

### Issue: LLM calls not happening
1. Check `.env.local`: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`.
2. Optional model overrides:
`OPENAI_FAST_MODEL`, `ANTHROPIC_FAST_MODEL`, `GEMINI_FAST_MODEL`,
`OPENAI_STRONG_MODEL`, `ANTHROPIC_STRONG_MODEL`, `GEMINI_STRONG_MODEL`.
3. Check network responses for:
`/api/familiar/chat`, `/api/familiar/draft`, `/api/familiar/expand`.

### Issue: Apply to Canvas falls back often
1. Check provider quota/errors from `/api/familiar/expand`.
2. Reduce prompt length or chat transcript size.
3. Confirm timeout behavior (`12s`) is expected for current model/account limits.

---

## Related Docs
- `/docs/tasks/feature-11-familiar-mode-onboarding.md`
- `/docs/architecture/feature-11-architecture.md`
