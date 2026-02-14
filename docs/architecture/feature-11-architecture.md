# Feature 11 - Familiar Mode and Onboarding: Architecture
**Status:** Draft
**Last updated:** 2026-02-11

## Summary
Feature 11 is now delivered as a one-screen main-dashboard experience. AI Copilot owns the chat-first planning loop, incremental draft generation, and strong-model canvas apply. Familiar Mode no longer acts as a separate page gate for this flow.
Prompt behavior is managed by a registry + router layer so prompts can be added/modified without changing route logic.

## Components
- UI:
- `app/page.tsx` (main dashboard shell + copilot panel mount)
- `components/aei/copilot-workbench.tsx` (chat, draft, apply, history, checkpoints)
- `components/aei/console-chat.tsx` (provider chat + draft patch calls)
- `components/aei/draft-canvas-preview.tsx` (read-only mini canvas)
- `app/layout.tsx` + `components/ui/toaster.tsx` (non-blocking toast notifications)
- APIs:
- `POST /api/familiar/chat` (fast model conversational reply)
- `GET /api/familiar/prompts` (available prompt definitions for selector)
- `POST /api/familiar/draft` (fast model draft patch ops)
- `POST /api/familiar/expand` (strong model final canvas JSON)
- Prompt routing:
- `lib/copilot/prompt-registry.ts` (versioned prompts; single source of truth)
- `lib/copilot/prompt-router.ts` (auto route + manual override resolution)

## State Model
- `localStorage` keys:
- Chat: `aei.familiar.chat`
- Draft: `aei.familiar.draft`, `aei.familiar.draft.history`, `aei.familiar.draft.meta`
- Archives: `aei.familiar.chats`
- Per-message checkpoints: `aei.familiar.checkpoints`
- Canvas target: `canvas-state`
- Expansion metadata: `aei.familiar.expansionSource`, `aei.familiar.expansionModel`

## Data Flow
1. User sends chat message in AI Copilot.
2. `console-chat` sends `promptId` (`auto` or manual) to `/api/familiar/chat`.
3. Server resolves prompt via router and calls fast model with selected system prompt.
4. Assistant response and resolved prompt metadata return to client.
5. Every N user messages, `console-chat` calls `/api/familiar/draft` and applies patch ops.
6. Copilot workbench stores draft metadata/history and renders mini-preview.
7. User clicks `Apply to Canvas`:
- calls `/api/familiar/expand` with timeout (`12s`)
- on success, writes expanded canvas to `canvas-state`
- on timeout/failure, writes deterministic fallback canvas to `canvas-state` and shows toast
8. Prompt Canvas reflects `canvas-state` updates.

## Checkpoint and Archive Design
- Per-message checkpoints:
- captured from each new user message
- snapshot includes truncated chat transcript to that message + current draft canvas
- restored via checkpoint dropdown
- Archive history:
- `New` archives current session
- archive entries include `title`, `timestamp`, `preview`, `messages`, `draftState`
- UI supports restore and delete actions

## Error and UX Handling
- Expansion latency hardened with timeout and deterministic fallback.
- Fallback/error surfaced as non-blocking toasts (instead of banner-only behavior).
- Controls are idempotent against repeated clicks while expansion is in-flight.

## Risks
- `localStorage` persistence is client-only and not multi-device.
- Checkpoint snapshots use current draft timing; if draft lags user message cadence, checkpoint canvas may reflect latest stable draft, not exact token-by-token state.
- Large transcript/archive payloads can approach browser storage limits.
- Prompt routing currently uses keyword heuristics; domain-specific prompts should include stronger routing signals or explicit user override.
