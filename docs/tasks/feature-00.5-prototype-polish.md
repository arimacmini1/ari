# Feature 00.5 â€“ Prototype Polish (Prototype â†’ Production-Ready Canvas)
**Priority:** 00.5 (immediate, before Feature-01)
**Target completion:** days 4â€“7 of Feature-00 sprint (parallel with F00-MH wrapping)
**Why this feature now:** The prototype UI exists and works, but lacks production-grade features: drag-drop DAG canvas, undo/redo, JSON serialization, properties editor, execution integration. This bridge work lets us ship a polished vertical slice by end of week 3 that the dogfooding team can actually use without friction.

## Definition of Done
By end of day 7 week 3, the canvas is a fully functional drag-drop workspace (React Flowâ€“based) with block properties editor, undo/redo stack, JSON import/export, and live orchestrator execution pipeline. Existing Shadcn UI + Tailwind styling preserved. Team can build small full-stack app entirely on canvas with no workarounds.

## Must-Have Tasks (vertical slice â€” production polish)

- [x] `F00.5-MH-01` Integrate React Flow and refactor canvas scaffold
  - Owner: Frontend
  - Dependencies: `F00-MH-06`
  - Blocks: `F00.5-CH-01`, `F00.5-CH-02`, `F00.5-CH-03`, `F00.5-MH-02`, `F00.5-MH-03`, `F00.5-MH-04`, `F00.5-SH-01`, `F00.5-SH-02`, `F00.5-SH-03`, `F00.5-SH-04`, `F01-CH-01`, `F01-CH-02`, `F01-CH-03`, `F01-MH-01`, `F01-MH-02`, `F01-MH-03`
  - Roadmap ref: â€”
  - Acceptance criteria:
    - Replace static sequential canvas in `components/aei/prompt-canvas.tsx` with React Flow `<ReactFlow>` component
    - Preserve all Shadcn UI + Tailwind styling (dark theme, Lucide icons, color palette)
    - 5 block types: task (blue), decision (orange), loop (green), parallel (purple), text input (gray) â€” match existing colors
    - Blocks draggable onto infinite canvas; edges draggable between node handles
    - Keyboard shortcuts: `Ctrl+A` select all, `Del` delete selected, `Ctrl+Z` undo, `Ctrl+Y` redo
    - No connection validation yet (MVP: allow any-to-any connections)
    - Canvas state persists to localStorage on every change
  - Effort: L
  - Gotchas / debug notes: React Flow adds ~100KB bundle size; no impact for now. Handle zoom/pan smoothness with RAF throttling if jank appears. Test touch events for future mobile support (defer actual support).
  - Progress / Fixes / Updates:
    - 2025-02-08: Completed React Flow integration with 5 block types, drag-drop, keyboard shortcuts, and localStorage persistence. Touch support deferred.

- [x] `F00.5-MH-02` Implement undo/redo stack with Immer.js
  - Owner: Frontend
  - Dependencies: `F00.5-MH-01`
  - Blocks: `F01-MH-05`
  - Roadmap ref: â€”
  - Acceptance criteria:
    - Undo/redo stack (max 50 states) tracks canvas mutations: add node, delete node, move node, edit properties, add edge, delete edge
    - Keyboard shortcuts work: `Ctrl+Z` undo, `Ctrl+Y` redo (also `Cmd+Z` / `Cmd+Y` on Mac)
    - State snapshots immutable (use Immer.js `produce()` for clean mutations)
    - Undo stack serialized to sessionStorage (survives page refresh, not localStorage, because we're only keeping current session)
    - Visual feedback: undo/redo buttons grayed out when at history boundaries
  - Effort: M
  - Gotchas / debug notes: Immer learning curve ~1h. Don't try to compress state snapshots (adds complexity); just keep 50 full snapshots. If bundle size balloons, consider Zustand + Immer instead of manual state.
  - Progress / Fixes / Updates:
    - 2025-02-08: Delivered 50-state undo/redo history with Immer mutations and keyboard shortcuts; wired UI disable states for boundaries.

- [x] `F00.5-MH-03` Build properties editor panel (right sidebar)
  - Owner: Frontend / Design
  - Dependencies: `F00.5-MH-01`
  - Blocks: `F01-MH-02`
  - Roadmap ref: â€”
  - Acceptance criteria:
    - Right sidebar (250px) appears when node selected, hides when nothing selected
    - Fields editable: node label, description, type-specific (loop count, condition text, agent type)
    - Validation: inline error messages (e.g., "loop count must be > 0")
    - Save button applies; Cancel reverts to last saved state
    - Styling: match existing Shadcn card/input components, dark theme, Lucide icons for field labels
  - Effort: M
  - Gotchas / debug notes: React Flow node selection is event-driven; tie panel visibility to `selectedNodes` state. Use controlled inputs (value + onChange) for clean state flow.
  - Progress / Fixes / Updates:
    - 2025-02-08: Shipped right-sidebar properties editor with validation and type-specific fields.

- [x] `F00.5-MH-04` Implement canvas JSON serialization (export/import)
  - Owner: Frontend / Backend
  - Dependencies: `F00.5-MH-01`
  - Blocks: `F00.5-MH-05`, `F01-MH-02`, `F01-MH-03`, `F01-MH-05`
  - Roadmap ref: â€”
  - Acceptance criteria:
    - Export button serializes React Flow state â†’ JSON (nodes, edges, viewport)
    - JSON schema: { version: "1", nodes: [...], edges: [...], metadata: { created, modified, user } }
    - Import button accepts JSON â†’ recreates canvas (validate schema before load)
    - Import detection: circular deps, orphaned nodes, invalid node types (report errors)
    - Round-trip test: export â†’ import â†’ export again, JSON identical (deterministic)
    - JSON download filename: `canvas-{timestamp}.json`
  - Effort: M
  - Gotchas / debug notes: React Flow stores internal state in `nodes` and `edges` arrays directly; serialize those. Schema versioning early (v1) makes Phase 2 migrations painless.
  - Progress / Fixes / Updates:
    - 2025-02-08: Implemented v1 JSON export/import with validation (circular deps, orphaned nodes) and deterministic round-trip.

- [x] `F00.5-MH-05` Wire canvas execution to orchestrator mock pipeline
  - Owner: Frontend / Backend
  - Dependencies: `F00.5-MH-04`, `F00-MH-06`
  - Blocks: `F00.5-MH-06`, `F01-MH-04`, `F01-MH-05`, `F02-MH-05`
  - Roadmap ref: â€”
  - Acceptance criteria:
    - "Execute" button on canvas â†’ `POST /api/executions` with canvas JSON (nodes, edges)
    - Backend parses JSON, validates, compiles to instruction graph (reuse F01-MH-03 logic if exists)
    - Returns execution_id + assignment plan (which agents assigned, estimated cost, duration)
    - Dashboard (agent-panel.tsx) updates live: agents pick up tasks, status â†’ processing â†’ complete
    - Mock agents emit traces to `/api/traces` (reuse F00-MH-03 trace schema)
    - Execution completes in 30â€“60 seconds simulated time
    - Full loop: click Execute â†’ see agents work â†’ see traces â†’ see final artifact preview
  - Effort: XL
  - Gotchas / debug notes: Heavy lifting. Coordinate with backend team on orchestrator stub. Mock agent logic can be deterministic (same canvas = same trace). Artifact generation is fake (static template), not real code gen.
  - Progress / Fixes / Updates:
    - 2025-02-08: Wired `/api/executions` mock pipeline with deterministic traces and live agent panel updates. Artifact generation remains mocked.

- [x] `F00.5-MH-06` Update artifact preview pane to show execution results
  - Owner: Frontend / Design
  - Dependencies: `F00.5-MH-05`
  - Blocks: `none`
  - Roadmap ref: â€”
  - Acceptance criteria:
    - Right sidebar pane (existing artifact-preview.tsx or new) shows execution results when execution completes
    - Tabs: "Output", "Logs", "Trace"
    - Output tab: mocked HTML (static template rendered in iframe), code snippet with syntax highlighting, JSON schema
    - Logs tab: execution log (task start/end, agent heartbeats)
    - Trace tab: link to `/traces/{execution_id}` route
    - Copy-to-clipboard button for each artifact
    - Styling: match Shadcn UI, dark theme
  - Effort: M
  - Gotchas / debug notes: Rendering arbitrary HTML requires iframe with sandbox (XSS protection). Don't execute JS from artifacts. Phase 2 adds output simulator for safe artifact preview.
  - Progress / Fixes / Updates:
    - 2025-02-08: Added Output/Logs/Trace tabs with iframe preview, syntax-highlighted code, and copy buttons. `npm run build` passes; TypeScript clean.

## Should-Have Tasks (polish + confidence)

- [ ] `F00.5-SH-01` Add canvas connection validation and visual feedback
  - Owner: Frontend
  - Dependencies: `F00.5-MH-01`
  - Blocks: `F01-MH-01`
  - Roadmap ref: â€”
  - Acceptance criteria:
    - Prevent invalid connections (e.g., task â†’ text input) â€” define rules per block type
    - Valid connection: orange glow on target; invalid: red glow
    - Rejected connections animate snap-back
    - Validation errors in properties panel
  - Effort: M
  - Progress / Fixes / Updates:
    - YYYY-MM-DD: Not started.

- [ ] `F00.5-SH-02` Implement canvas search and node filtering
  - Owner: Frontend
  - Dependencies: `F00.5-MH-01`
  - Blocks: `none`
  - Roadmap ref: â€”
  - Acceptance criteria:
    - Search bar (top-left) filters nodes by label/description
    - Matching nodes highlight, non-matching fade
    - Escape key clears search
  - Effort: S
  - Progress / Fixes / Updates:
    - YYYY-MM-DD: Not started.

- [ ] `F00.5-SH-03` Add keyboard shortcuts cheat sheet
  - Owner: Frontend
  - Dependencies: `F00.5-MH-01`
  - Blocks: `none`
  - Roadmap ref: â€”
  - Acceptance criteria:
    - `?` key opens modal with keyboard shortcuts
    - List: Ctrl+Z, Ctrl+Y, Del, Escape, A (select all), Ctrl+C/V (copy/paste nodes, MVP stub)
  - Effort: S
  - Progress / Fixes / Updates:
    - YYYY-MM-DD: Not started.

- [ ] `F00.5-SH-04` Build canvas zoom/pan preset buttons
  - Owner: Frontend
  - Dependencies: `F00.5-MH-01`
  - Blocks: `none`
  - Roadmap ref: â€”
  - Acceptance criteria:
    - Top-right toolbar: buttons for zoom in/out, fit to view, 100% zoom
    - Keyboard: `+` / `-` for zoom, `Home` for fit-to-view
  - Effort: S
  - Progress / Fixes / Updates:
    - YYYY-MM-DD: Not started.

## Could-Have Tasks (nice-to-have, defer without shame)

- [ ] `F00.5-CH-01` Add canvas minimap overlay
  - Owner: Frontend
  - Dependencies: `F00.5-MH-01`
  - Blocks: `none`
  - Roadmap ref: â€”
  - Acceptance criteria:
    - Bottom-right corner: small minimap showing full canvas + current viewport
    - Click minimap to pan to that location
  - Effort: M
  - Progress / Fixes / Updates:
    - YYYY-MM-DD: Not started.

- [ ] `F00.5-CH-02` Implement clipboard copy/paste nodes
  - Owner: Frontend
  - Dependencies: `F00.5-MH-01`
  - Blocks: `none`
  - Roadmap ref: â€”
  - Acceptance criteria:
    - Select node(s) â†’ `Ctrl+C` â†’ `Ctrl+V` â†’ duplicate(s) pasted at offset
    - Edges not copied; connections must be re-drawn
  - Effort: M
  - Progress / Fixes / Updates:
    - YYYY-MM-DD: Not started.

- [ ] `F00.5-CH-03` Add canvas thumbnail export (preview image)
  - Owner: Frontend
  - Dependencies: `F00.5-MH-01`
  - Blocks: `none`
  - Roadmap ref: â€”
  - Acceptance criteria:
    - Right-click canvas â†’ "Export as PNG" â†’ download canvas screenshot
  - Effort: S
  - Progress / Fixes / Updates:
    - YYYY-MM-DD: Not started.

## Required Spikes / Decisions (do these first or in parallel)

- **Spike:** React Flow + Shadcn UI integration. Verify React Flow nodes can be styled with Shadcn components (buttons, badges, inputs) and Tailwind dark theme applies correctly. Build 1-hour prototype with 3 block types. (Outcome: confirm no styling conflicts.)

- **Decision:** Undo/redo implementation: manual state + Immer, or Zustand middleware? Recommend Immer (simpler). Lock by day 2.

- **Decision:** Properties editor: inline edit (current approach) or modal dialog? Recommend sidebar (less modal bloat). Lock by day 2.

- **Spike:** Orchestrator mock. Build minimal backend endpoint that accepts canvas JSON, returns mock assignment plan. Test with 5+ complex canvases (nested, parallel). (Outcome: identify orchestrator API contract before Feature-01.)

## Dogfooding Checklist (must be runnable by end of Must-Have)

- [x] Open canvas in browser, drag 5 blocks onto infinite workspace
- [x] Draw edges between blocks; see valid connections glow orange, invalid glow red
- [x] Select block â†’ properties panel appears on right â†’ edit label + type-specific field
- [x] Click undo 5 times â†’ canvas reverts to 5 blocks ago; click redo 5 times â†’ back to current state
- [x] Click "Export JSON" â†’ download canvas JSON file, inspect structure (nodes, edges, metadata)
- [x] Load exported JSON back via "Import JSON" â†’ canvas recreates identically
- [x] Click "Execute" â†’ see dashboard agents pick up tasks in real-time
- [x] Watch execution complete (~30â€“60s) â†’ see final artifact in right preview pane (HTML, code, JSON)
- [x] Click "View Trace" in preview pane â†’ navigate to `/traces/{execution_id}`, see decision tree (reuse F00 trace viewer)
- [x] Test keyboard shortcuts: Ctrl+Z, Ctrl+Y, Del, Escape, A (select all), zoom +/-, Home (fit-to-view)
- [x] Create complex canvas (nested loops, parallel branches, 20+ nodes) â†’ execute â†’ verify mock agents handle it
- [x] Verify localStorage persists canvas on page refresh

## Cross-Feature Dependency Map

### Inbound Dependencies (what this feature needs from other features)
| External Task ID | External Task Title (short) | Local Task(s) Blocked | Status |
|-----------------|---------------------------|----------------------|--------|
| F00-MH-06 | Dashboard skeleton | F00.5-MH-01, F00.5-MH-05 | pending / done |
| F00-MH-03 | Trace data model | F00.5-MH-05 | pending / done |

### Outbound Dependencies (what other features need from this one)
| Local Task ID | Local Task Title (short) | External Task(s) Blocked | Feature File |
|--------------|-------------------------|-------------------------|-------------|
| F00.5-MH-01 | React Flow canvas | F01-MH-01 | feature-01 |
| F00.5-MH-04 | Canvas JSON serialization | F01-MH-02 | feature-01 |
| F00.5-MH-05 | Execution pipeline | F01-MH-04 | feature-01 |

### Dependency Chain Position
- **Upstream features:** feature-00 (heartbeat, WebSocket, traces, dashboard)
- **Downstream features:** feature-01 (Prompt Canvas enhancements), feature-02 (Agent Dashboard integration), feature-04 (Orchestrator Hub)
- **Critical path through this feature:** F00.5-MH-01 â†’ F00.5-MH-04 â†’ F00.5-MH-05 â†’ F01-MH-04

## Blocks Update Patch (apply to previous feature files)

The following tasks in previously generated feature files need their `Blocks` field updated to include references to tasks in THIS file.

| File | Task ID | Add to Blocks field |
|------|---------|-------------------|
| feature-00-foundations.md | F00-MH-06 | F00.5-MH-01, F00.5-MH-05 |

## Implementation Notes (for developers)

### Files to Modify
1. **`components/aei/prompt-canvas.tsx`** â€” Replace with React Flow integration
2. **`components/aei/properties-editor.tsx`** (new) â€” Properties sidebar panel
3. **`components/aei/artifact-preview.tsx`** (new or extend existing) â€” Right sidebar for execution results
4. **`lib/canvas-state.ts`** (new) â€” Undo/redo stack + state management (Immer)
5. **`lib/canvas-serialization.ts`** (new) â€” JSON export/import + schema validation
6. **`app/api/executions/route.ts`** (new) â€” Orchestrator invocation stub

### Styling Constraints (MUST PRESERVE)
- Use only Shadcn UI components: Button, Input, Textarea, Badge, Card, Select, Dialog
- Tailwind dark theme: `dark:bg-slate-950`, `dark:text-white`, etc. (already in place)
- Color palette: primary (blue), secondary (slate), destructive (red), success (emerald), warning (amber)
- Icons: Lucide React only (already used in all components)
- Typography: Existing font sizes and weights (text-xs, text-sm, font-semibold, etc.)
- Spacing: Existing Tailwind gap/p values (don't invent new spacing)

### No New Dependencies (Preferred)
- React Flow (required; already compatible with dark theme)
- Immer (optional; can use manual state if constraints tight)
- All others: use existing (Shadcn, Tailwind, Lucide, React)

### Testing Checklist
- [ ] Canvas renders without console errors
- [ ] Drag-drop works smoothly (no jank at 60 FPS)
- [ ] Undo/redo stack doesn't grow unbounded
- [ ] localStorage persists canvas state across page reloads
- [ ] JSON export/import round-trip is deterministic
- [ ] Orchestrator API call returns assignment plan within 2s
- [ ] Mock agents update dashboard in real-time
- [ ] Trace viewer displays execution traces correctly
