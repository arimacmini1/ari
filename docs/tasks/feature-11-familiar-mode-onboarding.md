# Feature 11 – Familiar Mode & Onboarding
**Priority:** 05 (Phase 1 adoption + dogfooding)
**Target completion:** weeks 6–8
**Why this feature now:** Phase 1 needs a chat-first entry, fast onboarding, and a read-only artifact view to make the core loop approachable and testable without full execution risk.

## Definition of Done
When this lands, a real user can start a project in chat-first Familiar Mode with real-time LLM participation, iteratively refine requirements while a draft canvas preview updates during the chat, then expand into the full Prompt Canvas (high-quality final graph) without losing context. Replit import, Code Peek, and the onboarding tutorial complete the end-to-end "Prompt → Preview → Deploy" mental model.

## Must-Have Tasks (vertical slice — get the loop working)

- [ ] `F11-MH-01` Build Familiar Mode entry flow (chat-first start + minimal chrome)
  - Owner: Frontend / Design
  - Dependencies: `F01-MH-06`, `F02-MH-01`
  - Blocks: `F11-MH-02`, `F11-MH-05`, `F11-SH-01`
  - Roadmap ref: `P1-MH-12`
  - Acceptance criteria:
    - New project can start in a single chat prompt with minimal UI chrome
    - Users can toggle into full Canvas + Dashboard without losing chat context
    - First-run guidance explains the transition from prompt → canvas → swarm
    - Familiar Mode state persists across reloads for the current project
  - Effort: M
  - Gotchas / debug notes: Keep the Familiar shell thin; reuse existing workspace routes instead of duplicating views.
  - Progress / Fixes / Updates:
    - 2026-02-10: Started. Drafted initial UX flow (chat-first shell -> expand to full workspace) and identified reuse points in existing workspace routes.
    - 2026-02-11: Implemented Familiar Mode shell with chat-first UI, first-run guidance, and localStorage persistence. Added toggle into full workspace and back, with shared chat storage.
    - 2026-02-11: Added Clear Chat action with confirmation plus Reset Draft control to discard the auto-drafted preview.

- [ ] `F11-MH-02` Implement chat-to-canvas expansion with context preservation
  - Owner: Frontend / AI-Agent
  - Dependencies: `F11-MH-01`, `F01-MH-02`, `F01-MH-04`
  - Blocks: `F11-MH-03`, `F11-MH-05`
  - Roadmap ref: `P1-MH-12`
  - Acceptance criteria:
    - Expansion uses a strong model to convert the refined chat transcript into a high-quality canvas graph (nodes + edges) within 5s for typical prompts
    - Generated blocks reuse the block template library (task/decision/parallel/text/artifact/preview)
    - Users can switch back to chat view and see the full conversation history (no context loss)
    - If LLM expansion fails, system falls back to deterministic expansion and surfaces a recoverable warning with suggested fixes
  - Effort: L
  - Gotchas / debug notes: Avoid lossy conversion; store raw chat alongside generated canvas metadata. Keep a clear separation: fast model for chat, strong model for final expansion.
  - Progress / Fixes / Updates:
    - 2026-02-11: Implemented stub. On Enter Full Workspace, last chat prompt is transformed into a minimal canvas state (text + task node with edge) and stored in localStorage for Prompt Canvas to load.
    - 2026-02-11: Added hybrid LLM expansion via `/api/familiar/expand` with provider fallback (OpenAI → Anthropic → Gemini). Deterministic fallback retained if no API keys are configured or parsing fails.
    - 2026-02-11: Updated scope. Next: split fast-model chat from strong-model expansion (separate routing + env vars), and add incremental draft-canvas updates during chat.
    - 2026-02-11: Split fast vs strong routing (fast chat + draft endpoints, strong expand defaults) and wired incremental draft updates in Familiar Mode.

- [x] `F11-MH-06` Add real-time LLM participation in Familiar Mode chat (fast model)
  - Owner: Backend / Frontend
  - Dependencies: `F11-MH-01`
  - Blocks: `F11-MH-07`, `F11-MH-02`
  - Roadmap ref: `P1-MH-12`
  - Acceptance criteria:
    - Every user message triggers a server-side LLM call and appends an assistant response to chat
    - Fast-model routing uses configured provider priority (Gemini Flash / Haiku / 4o-mini) with graceful fallback when keys are missing
    - Chat remains responsive: <2s median response for typical prompts (best-effort; depends on provider)
    - Errors are shown inline and do not wipe conversation state
  - Effort: M
  - Gotchas / debug notes: Never expose API keys to the client; all calls go through API routes. Keep message format stable across providers.
  - Progress / Fixes / Updates:
    - 2026-02-11: Implemented `/api/familiar/chat` with fast-model routing (Gemini → Anthropic → OpenAI) and inline error handling. Wired Familiar Mode chat to call server and append assistant replies with persistence.

- [x] `F11-MH-07` Implement incremental draft canvas preview during chat (JSON patch)
  - Owner: Backend / Frontend
  - Dependencies: `F11-MH-06`, `F01-MH-02`
  - Blocks: `F11-MH-02`
  - Roadmap ref: `P1-MH-12`
  - Acceptance criteria:
    - After N user turns (default 3), server generates a draft canvas update and UI renders a mini-canvas preview in Familiar Mode
    - Draft updates are applied as JSON Patch (or a constrained patch format) to avoid full-regeneration flicker
    - User can request an update explicitly (button: "Update draft") and undo the last patch
    - Draft state persists across reloads and survives toggle into/out of full workspace
  - Effort: L
  - Gotchas / debug notes: Patch application must be deterministic; validate patch before applying. Keep nodes stable (IDs) to avoid re-render churn.
  - Progress / Fixes / Updates:
    - 2026-02-11: Added `/api/familiar/draft` to return collab-style patch ops and applied patches client-side with validation. Draft preview panel renders a mini canvas, supports manual update and undo, and persists across reloads.

- [ ] `F11-MH-03` Prototype Replit project import → canvas flow
  - Owner: Backend / AI-Agent
  - Dependencies: `F01-MH-04`, `F01-MH-06`, `F03-MH-01`
  - Blocks: `F11-CH-01`
  - Roadmap ref: `P1-MH-13`
  - Acceptance criteria:
    - Accept a Replit project description or export and map it to a starter canvas
    - Import completes in <60s for small projects
    - Generates a starter task decomposition and agent assignment preview
    - Imported canvas is editable and versioned like any other canvas
  - Effort: M
  - Gotchas / debug notes: Prefer deterministic mappings; log import failures with actionable hints.
  - Progress / Fixes / Updates:
    - 2026-02-10: Not started.

- [ ] `F11-MH-04` Add Code Peek panel for generated artifacts (read-only)
  - Owner: Frontend
  - Dependencies: `F03-MH-03`, `F04-MH-02`
  - Blocks: `F11-CH-02`, `F11-MH-05`
  - Roadmap ref: `P1-MH-14`
  - Acceptance criteria:
    - Toggleable panel shows generated code/schema/config in read-only mode
    - Panel updates when new artifacts are produced by the mock execution pipeline
    - Clear messaging states editing is out of scope for AEI
    - Panel opens/closes in <500ms with 100+ agents active
  - Effort: S
  - Gotchas / debug notes: Reuse artifact preview components; avoid mounting heavy editors when panel is closed.
  - Progress / Fixes / Updates:
    - 2026-02-10: Not started.

- [ ] `F11-MH-05` Ship Replit-style onboarding tutorial flow
  - Owner: Product / Design
  - Dependencies: `F11-MH-01`, `F11-MH-02`, `F03-MH-03`
  - Blocks: `F11-SH-02`
  - Roadmap ref: `P1-MH-15`
  - Acceptance criteria:
    - Guided walkthrough builds a simple Todo/MVP app in <15 minutes
    - Tutorial highlights where Familiar Mode upgrades into multi-agent orchestration
    - Completion metrics logged (time to first output, drop-off step)
    - Tutorial can be re-run or skipped by experienced users
  - Effort: M
  - Gotchas / debug notes: Keep the tutorial as a scripted canvas template with checkpointed steps.
  - Progress / Fixes / Updates:
    - 2026-02-10: Not started.

## Should-Have Tasks (makes it dogfood-able and lovable)

- [ ] `F11-SH-01` Add Familiar Mode quick-start templates
  - Owner: Frontend / Product
  - Dependencies: `F11-MH-01`
  - Blocks: none
  - Roadmap ref: —
  - Acceptance criteria:
    - Provide 3–5 starter templates (Todo, landing page, API + DB)
    - Templates prefill chat prompt and initial canvas layout
    - Template use is logged for learning and iteration
  - Effort: S
  - Gotchas / debug notes: Keep templates lightweight; avoid overfitting to a single stack.
  - Progress / Fixes / Updates:
    - 2026-02-10: Not started.

- [ ] `F11-SH-02` Add onboarding checkpoints and resume flow
  - Owner: Frontend / Product
  - Dependencies: `F11-MH-05`
  - Blocks: none
  - Roadmap ref: —
  - Acceptance criteria:
    - Tutorial progress persists per user and can be resumed
    - Resume flow offers “continue” or “restart” options
  - Effort: S
  - Gotchas / debug notes: Keep checkpoint metadata minimal to avoid fragile migrations.
  - Progress / Fixes / Updates:
    - 2026-02-10: Not started.

## Could-Have Tasks (polish — defer without shame)

- [ ] `F11-CH-01` Support Replit import via repository URL
  - Owner: Backend
  - Dependencies: `F11-MH-03`
  - Blocks: none
  - Roadmap ref: —
  - Acceptance criteria:
    - Accept a Git URL and fetch project metadata for import
    - Validate access and report import errors clearly
  - Effort: M
  - Gotchas / debug notes: Avoid storing credentials; use short-lived tokens.
  - Progress / Fixes / Updates:
    - 2026-02-10: Not started.

- [ ] `F11-CH-02` Add Code Peek diff view between executions
  - Owner: Frontend
  - Dependencies: `F11-MH-04`, `F04-MH-04`
  - Blocks: none
  - Roadmap ref: —
  - Acceptance criteria:
    - Show side-by-side diff for two artifact versions
    - Highlight added/removed/modified sections with summary counts
  - Effort: M
  - Gotchas / debug notes: Large files need virtualization; diff in background to avoid UI freezes.
  - Progress / Fixes / Updates:
    - 2026-02-10: Not started.

## Required Spikes / Decisions (do these first or in parallel)

- Decision: Model routing matrix (fast chat vs strong expand) and provider priority order
- Spike: Define incremental draft-canvas patch format (JSON Patch vs constrained patch ops)
- Spike: Define chat-to-canvas conversion heuristics and fallback rules (deterministic + LLM)
- Decision: Import format support (Replit export vs. project description JSON)
- Experiment: Run 5 mock imports and measure mapping accuracy + time-to-canvas
- Decision: Code Peek panel mounting strategy (lazy vs. preloaded)

## Dogfooding Checklist (must be runnable by end of Must-Have)

- [ ] Start a new project in Familiar Mode and expand to full Canvas
- [ ] Chat with LLM for 5+ turns; confirm conversation + draft canvas persists across reload
- [ ] See draft canvas update after 3 user messages and undo the last patch
- [ ] Convert refined chat transcript into a valid full canvas graph without data loss
- [ ] Import a small Replit project and edit the resulting canvas
- [ ] Open Code Peek and inspect generated artifacts in read-only mode
- [ ] Complete the tutorial in under 15 minutes

## Cross-Feature Dependency Map

### Inbound Dependencies (what this feature needs from other features)
| External Task ID | External Task Title (short) | Local Task(s) Blocked | Status |
|-----------------|---------------------------|----------------------|--------|
| `F01-MH-06` | Canvas lifecycle E2E | `F11-MH-01`, `F11-MH-03` | pending / done |
| `F02-MH-01` | Agent dashboard hierarchy | `F11-MH-01` | pending / done |
| `F01-MH-02` | Block template library | `F11-MH-02` | pending / done |
| `F01-MH-04` | Canvas parser | `F11-MH-02`, `F11-MH-03` | pending / done |
| `F03-MH-01` | Orchestrator rule engine | `F11-MH-03` | pending / done |
| `F03-MH-03` | Simulation pipeline | `F11-MH-04`, `F11-MH-05` | pending / done |
| `F04-MH-02` | Artifact preview panel | `F11-MH-04` | pending / done |

### Outbound Dependencies (what other features need from this one)
| Local Task ID | Local Task Title (short) | External Task(s) Blocked | Feature File |
|--------------|-------------------------|-------------------------|-------------|
| `F11-MH-05` | Onboarding tutorial flow | `P2-MH-01` (comparative trace analysis validation) | feature-12+ |

### Dependency Chain Position
- **Upstream features:** feature-01 (canvas), feature-02 (dashboard), feature-03 (orchestrator), feature-04 (artifacts)
- **Downstream features:** future onboarding analytics, comparative trace analysis
- **Critical path through this feature:** F01-MH-06 → F11-MH-01 → F11-MH-02 → F11-MH-05

## Blocks Update Patch (apply to previous feature files)

The following tasks in previously generated feature files need their `Blocks` field
updated to include references to tasks in THIS file.

| File | Task ID | Add to Blocks field |
|------|---------|-------------------|
| feature-01-prompt-canvas.md | `F01-MH-06` | `F11-MH-01`, `F11-MH-03` |
| feature-01-prompt-canvas.md | `F01-MH-02` | `F11-MH-02` |
| feature-01-prompt-canvas.md | `F01-MH-04` | `F11-MH-02`, `F11-MH-03` |
| feature-02-agent-dashboard.md | `F02-MH-01` | `F11-MH-01` |
| feature-03-orchestrator-hub.md | `F03-MH-01` | `F11-MH-03` |
| feature-03-orchestrator-hub.md | `F03-MH-03` | `F11-MH-04`, `F11-MH-05` |
| feature-04-output-simulator.md | `F04-MH-02` | `F11-MH-04` |
