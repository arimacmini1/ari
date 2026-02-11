# Feature 11 – Familiar Mode & Onboarding: Architecture
**Status:** Draft
**Last updated:** 2026-02-11

## Summary
Familiar Mode is a chat-first planning surface that maintains a conversation state, produces incremental draft canvas updates, and generates a high-quality final canvas graph on expansion into the full workspace. The design uses a hybrid model strategy: fast models for conversational turns and draft patches, strong models only for final expansion.

## Components
- UI components:
- `components/aei/familiar-mode.tsx` (chat-first shell + guidance + draft preview)
- `components/aei/console-chat.tsx` (message list + input + persistence + API wiring)
- `components/aei/draft-canvas-preview.tsx` (read-only mini canvas)
- Backend services:
- `POST /api/familiar/chat` (fast model; returns assistant reply)
- `POST /api/familiar/draft` (fast model; returns draft canvas patches)
- `POST /api/familiar/expand` (strong model; returns final canvas JSON)
- Data stores:
- `localStorage` for MVP: transcript, draft graph, last expansion source
- Future: DB for conversation state + audit (if needed)

## Data Flow
1. User sends chat message in Familiar Mode → server calls fast model → assistant reply returned and appended to transcript
2. Every N messages (or on demand), server returns draft canvas patch → client applies patch and renders mini canvas preview
3. User clicks "Open Full Workspace" → server calls strong model to produce final canvas JSON → client writes to `canvas-state` and opens Prompt Canvas

## APIs
- `POST /api/familiar/expand` (strong model, full canvas JSON)
- `POST /api/familiar/chat` (fast model, assistant reply)
- `POST /api/familiar/draft` (fast model, collab-style patch ops)

## Dependencies
- Upstream features:
- Feature 01 Prompt Canvas (canvas schema + parser + block types)
- Feature 02 Agent Dashboard (full workspace)
- External services:
- LLM providers via API keys: OpenAI, Anthropic, Gemini

## Risks
- Draft patch instability: validate patch ops and keep IDs stable to avoid UI churn
- Cost surprises: fast chat can still add up; add visible usage + rate limiting
