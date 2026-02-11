<!--
  Feature 11 On-Boarding Guide
  Version: 1.0 (2026-02-10, auto-generated)
  Status: Draft
-->

# Feature 11 – Familiar Mode & Onboarding: On-Boarding Guide

## Quick Start

### 1) Open the feature surface
1. Navigate to `/` (defaults to Familiar Mode)
2. Type a message and hit Enter (chat reply should appear)
3. After 3 user messages, confirm a draft canvas preview updates
4. Click **Update** in the draft panel to force a refresh, then **Undo** to revert the last patch
5. Click **Reset** to discard the draft preview while keeping chat intact
6. Click **Clear Chat** to wipe the transcript (confirm dialog)
7. Click **Open Full Workspace** and confirm Prompt Canvas contains an expanded graph

### 2) Run the core flow
1. Chat (fast model) to refine requirements
2. Expand (strong model) to full canvas
3. Verify chat context and draft state persist across toggles

---

## Feature Overview

### What You Get
- Chat-first planning surface with real-time LLM participation (fast model)
- Draft canvas preview that updates incrementally during chat (JSON patch)
- High-quality final expansion into Prompt Canvas (strong model)

---

## Testing Guide

### Must-Have Tasks
- [ ] `F11-MH-01`: Familiar Mode shell + persistence
- [ ] `F11-MH-06`: Real-time chat LLM replies (fast model)
- [ ] `F11-MH-07`: Draft canvas preview updates (patch)
- [ ] `F11-MH-02`: Strong-model expansion into full Prompt Canvas

---

## Key Files
- `docs/tasks/feature-11-familiar-mode-onboarding.md`
- `components/aei/familiar-mode.tsx`
- `components/aei/console-chat.tsx`
- `components/aei/draft-canvas-preview.tsx`
- `app/api/familiar/chat/route.ts`
- `app/api/familiar/draft/route.ts`
- `app/api/familiar/expand/route.ts`

---

## Debugging Guide

### Issue: [describe]
**Check:**
1. …
2. …

### Issue: LLM calls not happening
**Check:**
1. Env vars exist in `.env.local`: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`
2. Optional model overrides: `OPENAI_FAST_MODEL`, `ANTHROPIC_FAST_MODEL`, `GEMINI_FAST_MODEL`, `OPENAI_STRONG_MODEL`, `ANTHROPIC_STRONG_MODEL`, `GEMINI_STRONG_MODEL`
3. Network errors in server logs for `/api/familiar/*`

---

## Related Docs
- `/docs/tasks/feature-11-familiar-mode-onboarding.md`
- `/docs/architecture/feature-11-architecture.md`
