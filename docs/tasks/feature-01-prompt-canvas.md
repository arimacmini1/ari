# Feature 01 â€“ Prompt Canvas
**Priority:** 01 (highest after foundations)
**Target completion:** weeks 3â€“5
**Why this feature now:** The prototype canvas (Feature 00.5) proved the vertical slice works. Now we need production-grade canvas composition: connection validation, block templates, canvas versioning, semantic instruction parsing, and voice input. Without this, users can't reliably compose complex multi-agent workflows â€” and everything downstream (orchestrator, dashboard, traces) starves for structured input.

## Definition of Done
By end of week 5, a real user can open the Prompt Canvas, compose a multi-step agent workflow using drag-drop blocks (task, decision, loop, parallel, text) with validated connections and type-specific properties, save/load versioned canvas states, use voice input to generate blocks from speech, and trigger execution that produces a structured instruction graph the orchestrator can decompose. The canvas handles 50+ blocks with no jank, supports undo/redo across all mutations, and round-trips through JSON export/import without data loss.

## Must-Have Tasks (vertical slice â€” get the loop working)

- [x] `F01-MH-01` Implement canvas connection validation rules and visual feedback
  - Owner: Frontend
  - Dependencies: `F00.5-MH-01`, `F00.5-SH-01`
  - Blocks: `F01-MH-04`, `F01-MH-06`, `F06-MH-01`
  - Roadmap ref: `P1-MH-04`
  - Acceptance criteria:
    - Define connection rules per block type: taskâ†’task (valid), taskâ†’decision (valid), textâ†’text (invalid), loop outputâ†’loop input (invalid/circular), parallel fan-out must have matching fan-in
    - Valid connection attempt: target handle glows orange; invalid: target handle glows red with tooltip explaining why
    - Rejected connections animate snap-back to source handle
    - Validation errors surfaced in properties panel when node selected
    - Circular dependency detection: if connecting Aâ†’B would create a cycle, reject with visual warning
  - Effort: M
  - Gotchas / debug notes: React Flow's `isValidConnection` callback is the hook point. Don't do full graph traversal on every drag â€” cache adjacency list and check incrementally. Circular dep detection is O(V+E) BFS; fine for 50 nodes, may need optimization at 200+.
  - Progress / Fixes / Updates:
    - 2026-02-08: Task created. Partially started in F00.5-SH-01 (not completed).
    - 2026-02-08: Implemented. Created `lib/connection-rules.ts` with CONNECTION_RULES matrix, `wouldCreateCycle()` BFS, and `isValidConnection()`. Updated `canvas-flow.tsx` with `isValidConnection` prop and styled edges (green/orange). Updated `block-node.tsx` handles with color feedback. Added artifact/preview support to rules.

- [x] `F01-MH-02` Build block template library with drag-from-sidebar palette
  - Owner: Frontend / Design
  - Dependencies: `F00.5-MH-01`, `F00.5-MH-03`
  - Blocks: `F01-MH-04`, `F01-SH-01`, `F01-SH-02`, `F11-MH-02`, `F11-MH-07`
  - Roadmap ref: `P1-MH-04`
  - Acceptance criteria:
    - Left sidebar palette shows available block types grouped by category: Control Flow (task, decision, loop, parallel), Input (text, voice transcript), Output (artifact, preview)
    - Drag block from palette onto canvas to instantiate with default properties
    - Each block type has icon (Lucide), label, and tooltip description
    - Search/filter bar at top of palette filters block types by name
    - Palette collapses to icon-only mode for more canvas space (toggle button)
  - Effort: M
  - Gotchas / debug notes: React Flow supports drag-from-external via `onDrop` + `onDragOver`. Use `dataTransfer.setData` to pass block type metadata. Palette should NOT use React Flow nodes internally â€” plain HTML/Shadcn list.
  - Progress / Fixes / Updates:
    - 2026-02-08: Task created.
    - 2026-02-08: Implemented. Created `components/aei/block-palette.tsx` with search filter, 3 categories (Control Flow, Input, Output), drag-to-canvas via HTML5 drag API, collapsible sidebar (w-56/w-12). Added 'artifact' and 'preview' block types to canvas-state.ts, block-node.tsx. Updated prompt-canvas.tsx to use palette instead of inline buttons. Updated canvas-flow.tsx with onDragOver/onDrop handlers.

- [x] `F01-MH-03` Implement canvas versioning and state snapshots
  - Owner: Frontend / Backend
  - Dependencies: `F00.5-MH-01`, `F00.5-MH-04`
  - Blocks: `F01-MH-06`, `F01-SH-02`, `F01-SH-03`, `F03-MH-05`, `F08-MH-02`, `F08-MH-03`
  - Roadmap ref: `P1-MH-04`
  - Acceptance criteria:
    - Every "save" creates a versioned snapshot: `{ version_id, timestamp, user_id, canvas_json, parent_version_id }`
    - Version history panel (collapsible sidebar or modal) lists all snapshots with timestamp and diff summary (nodes added/removed/modified count)
    - User can revert to any previous version (creates new snapshot, doesn't destroy history)
    - Versions stored server-side via `POST /api/canvases/{canvas_id}/versions` and retrievable via `GET /api/canvases/{canvas_id}/versions`
    - Auto-save every 60 seconds if canvas has unsaved changes
    - Diff viewer: side-by-side comparison of two versions highlighting added (green), removed (red), modified (yellow) nodes
  - Effort: L
  - Gotchas / debug notes: Don't diff at the JSON string level â€” diff at the node/edge semantic level (node added, node property changed, edge added). Auto-save must debounce to avoid spamming API. Version history can grow large; paginate API response (20 per page).
  - Progress / Fixes / Updates:
    - 2026-02-08: Task created.
    - 2026-02-08: Implemented. Created `lib/canvas-versions.ts` with CanvasVersion type, computeDiffSummary(), and in-memory CanvasVersionStore. Created `components/aei/version-history.tsx` panel (280px sidebar with version list, diff badges, revert). Created `app/api/canvases/versions/route.ts` (POST save, GET list with pagination). Updated prompt-canvas.tsx with Save/Versions toolbar buttons and auto-save every 60s.

- [x] `F01-MH-04` Build canvas-to-instruction-graph parser (semantic decomposition)
  - Owner: Backend / AI
  - Dependencies: `F00.5-MH-05`, `F01-MH-01`
  - Blocks: `F01-MH-06`, `F01-SH-04`, `F03-MH-01`, `F03-MH-03`, `F04-MH-01`, `F11-MH-02`, `F11-MH-03`
  - Roadmap ref: `P1-MH-04`, `P1-MH-05`
  - Acceptance criteria:
    - `POST /api/canvases/{canvas_id}/parse` accepts canvas JSON (nodes, edges) and returns structured instruction graph: `{ tasks: [...], dependencies: [...], metadata: { estimated_agents, estimated_cost, estimated_duration } }`
    - Parser resolves block semantics: task blocks â†’ atomic sub-tasks, decision blocks â†’ conditional branches, loop blocks â†’ iteration specs, parallel blocks â†’ concurrent task groups
    - Dependency graph derived from edge connections (topological sort, detect cycles â†’ error)
    - Each parsed task includes: `task_id`, `task_type`, `description` (from block label/properties), `agent_type_hint` (inferred from task semantics), `priority` (from position in graph)
    - Parse 50-node canvas in <500ms server-side
  - Effort: L
  - Gotchas / debug notes: This is the bridge between canvas UI and orchestrator. Keep the instruction graph schema stable â€” orchestrator (Feature 04) will consume it directly. Don't try to be too smart about agent_type_hint inference yet; rule-based matching on keywords is fine for MVP.
  - Progress / Fixes / Updates:
    - 2026-02-08: Task created.
    - 2026-02-08: Implemented. Created `lib/instruction-graph.ts` with parseCanvasToInstructionGraph() (type mapping, agent hint inference, topological priority, cycle detection, cost/duration estimates). Created `app/api/canvases/parse/route.ts` POST endpoint. Created `app/api/canvases/parse/delta/route.ts` POST endpoint with hash-based change detection.

- [x] `F01-MH-05` Implement canvas delta re-execution (edit â†’ re-parse â†’ update only changed tasks)
  - Owner: Frontend / Backend
  - Dependencies: `F00.5-MH-04`, `F00.5-MH-05`, `F00.5-MH-02`
  - Blocks: `F04-MH-02`
  - Roadmap ref: `P1-MH-04`
  - Acceptance criteria:
    - When user edits canvas after initial parse/execution, system computes delta: which nodes/edges added, removed, or modified
    - Delta sent to `POST /api/canvases/{canvas_id}/parse?mode=delta` with previous instruction graph ID
    - Backend returns only changed/new tasks (not full re-parse) with `action: add | remove | update` annotations
    - Dashboard shows which agents need re-assignment vs. which continue unchanged
    - Delta parse completes in <200ms for typical edits (1â€“5 node changes)
  - Effort: L
  - Gotchas / debug notes: Delta computation is graph diff. Hash each node by `(type + label + properties + connections)` â€” if hash unchanged, skip. Edge cases: moving a node (position change, no semantic change) should NOT trigger re-parse. Only structural/property changes matter.
  - Progress / Fixes / Updates:
    - 2026-02-08: Task created.
    - 2026-02-08: Implemented. Updated prompt-canvas.tsx with delta tracking via lastParsedNodesRef/lastParsedEdgesRef. Parse button uses full parse on first click, delta parse on subsequent clicks. InstructionPreview shows delta annotations (NEW/UPDATED/REMOVED badges).

- [x] `F01-MH-06` Wire canvas lifecycle end-to-end: create â†’ compose â†’ validate â†’ parse â†’ preview â†’ execute
  - Owner: Full-stack
  - Dependencies: `F01-MH-01`, `F01-MH-03`, `F01-MH-04`, `F00-MH-01`, `F00-MH-02`
  - Blocks: `F02-MH-01`, `F02-MH-05`, `F03-MH-03`, `F04-MH-01`, `F08-MH-01`, `F10-MH-02`, `F10-MH-03`, `F11-MH-01`, `F11-MH-03`, `F12-MH-01`
  - Roadmap ref: `P1-MH-04`, `P1-MH-06`
  - Acceptance criteria:
    - User creates new canvas â†’ drags blocks from palette â†’ connects with validated edges â†’ saves version
    - Clicks "Parse" â†’ instruction graph preview appears (task list with dependencies, estimated cost/agents)
    - User reviews instruction graph, can adjust priorities or agent type hints inline
    - Clicks "Execute" â†’ orchestrator receives instruction graph â†’ agents assigned â†’ dashboard updates live
    - Full lifecycle from empty canvas to executing agents completes in <2 minutes for a 10-block canvas
  - Effort: L
  - Gotchas / debug notes: This is the integration task â€” all prior MH tasks must be stable. Test the full loop with 3 scenarios: simple linear (5 tasks), branching (decision + 2 paths), and parallel (fan-out/fan-in). Execution reuses F00.5-MH-05 pipeline.
  - Progress / Fixes / Updates:
    - 2026-02-08: Task created.
    - 2026-02-08: Implemented. Created `components/aei/instruction-preview.tsx` (400px panel with task list, dependency viz, summary stats, Execute/Cancel buttons). Updated prompt-canvas.tsx with Parse button (Scan icon), auto-parse-before-execute flow, cached graph reuse, and full lifecycle: create â†’ compose â†’ validate â†’ parse â†’ preview â†’ execute.
    - 2026-02-08: Feature 01 complete! All 6 Must-Have tasks shipped. On-boarding guide created at /docs/on-boarding/feature-01-onboarding.md. Architecture doc created at /docs/architecture/feature-01-architecture.md. CHANGELOG updated. Feature ready for testing.

## Should-Have Tasks (makes it dogfood-able and lovable)

- [ ] `F01-SH-01` Add voice input for canvas block generation (speech-to-blocks)
  - Owner: Frontend
  - Dependencies: `F01-MH-02`, `F00-MH-05`
  - Blocks: `F01-SH-04`
  - Roadmap ref: `P1-SH-01`
  - Acceptance criteria:
    - Microphone button on canvas toolbar triggers browser Web Speech API (SpeechRecognition)
    - Transcribed text displayed in floating overlay with "Suggest Blocks" button
    - Clicking "Suggest Blocks" sends transcript to `POST /api/canvas/voice-to-blocks` which returns suggested block structure (task names, types, connections)
    - User reviews suggested blocks in overlay â†’ "Accept" adds them to canvas, "Reject" discards
    - Supports 30 seconds of continuous speech per utterance
    - Graceful fallback if browser doesn't support Web Speech API (show "Not supported" message)
  - Effort: M
  - Gotchas / debug notes: Web Speech API is Chrome-only reliably; Firefox support is spotty. For the backend LLM call, use a lightweight prompt: "Given this transcript, suggest canvas blocks (task/decision/loop/parallel) with labels and connections." Keep LLM call <3s. Don't stream â€” return full suggestion.
  - Progress / Fixes / Updates:
    - 2026-02-08: Task created.

- [ ] `F01-SH-02` Implement canvas templates (pre-built workflow patterns)
  - Owner: Frontend / Design
  - Dependencies: `F01-MH-02`, `F01-MH-03`
  - Blocks: `none`
  - Roadmap ref: `P1-MH-04`
  - Acceptance criteria:
    - "New from Template" option when creating canvas; shows gallery of 5+ templates
    - Templates: "Simple Linear Pipeline", "Parallel Fan-Out/Fan-In", "Decision Branch", "Iterative Loop", "Full-Stack App Scaffold"
    - Each template loads pre-configured nodes, edges, and default properties
    - Templates stored as JSON in `/public/templates/` or fetched from API
    - User can save own canvas as custom template
  - Effort: M
  - Gotchas / debug notes: Templates are just canvas JSON with a name and description. Don't over-engineer a template management system â€” flat file list is fine for MVP.
  - Progress / Fixes / Updates:
    - 2026-02-08: Task created.

- [ ] `F01-SH-03` Build canvas diff viewer for version comparison
  - Owner: Frontend
  - Dependencies: `F01-MH-03`
  - Blocks: `none`
  - Roadmap ref: `P1-MH-04`
  - Acceptance criteria:
    - Select two versions from version history â†’ open diff view (split-pane or overlay)
    - Added nodes highlighted green, removed nodes highlighted red, modified nodes highlighted yellow
    - Edge changes shown as dashed lines (added=green, removed=red)
    - Summary bar: "3 nodes added, 1 removed, 2 modified, 4 edges changed"
    - Can switch between visual diff (canvas overlay) and JSON diff (text)
  - Effort: M
  - Gotchas / debug notes: Visual diff on React Flow canvas requires rendering two canvases side-by-side (or overlay with opacity). JSON diff is simpler â€” use a diff library (e.g., `diff` npm package). Start with JSON diff, add visual diff as stretch.
  - Progress / Fixes / Updates:
    - 2026-02-08: Task created.

- [ ] `F01-SH-04` Add natural language prompt-to-canvas generation
  - Owner: Frontend / Backend / AI
  - Dependencies: `F01-SH-01`, `F01-MH-04`
  - Blocks: `none`
  - Roadmap ref: `P1-SH-01`
  - Acceptance criteria:
    - Text input field at top of canvas: "Describe your workflow in plain English"
    - Submit â†’ `POST /api/canvas/text-to-blocks` sends text to LLM, returns suggested canvas structure
    - Preview overlay shows proposed blocks and connections before user accepts
    - Supports descriptions up to 500 words
    - Response time <5s for typical descriptions (1â€“3 sentences)
  - Effort: M
  - Gotchas / debug notes: This is the "magic" feature â€” but keep expectations realistic. LLM output will be imperfect; the preview/accept step is critical. Reuse the same block suggestion schema from F01-SH-01 voice input.
  - Progress / Fixes / Updates:
    - 2026-02-08: Task created.

## Could-Have Tasks (polish â€” defer without shame)

- [ ] `F01-CH-01` Add canvas minimap with viewport indicator
  - Owner: Frontend
  - Dependencies: `F00.5-MH-01`
  - Blocks: `none`
  - Roadmap ref: â€”
  - Acceptance criteria:
    - Bottom-right corner: minimap showing full canvas layout + current viewport rectangle
    - Click/drag on minimap to pan main canvas
    - Toggle minimap visibility with keyboard shortcut (`M`)
  - Effort: S
  - Gotchas / debug notes: React Flow has built-in `<MiniMap />` component. Just style it to match dark theme.
  - Progress / Fixes / Updates:
    - 2026-02-08: Task created. React Flow MiniMap component available â€” mostly styling work.

- [ ] `F01-CH-02` Implement clipboard copy/paste for canvas nodes
  - Owner: Frontend
  - Dependencies: `F00.5-MH-01`
  - Blocks: `none`
  - Roadmap ref: â€”
  - Acceptance criteria:
    - Select node(s) â†’ `Ctrl+C` copies to internal clipboard (not system clipboard â€” React Flow state)
    - `Ctrl+V` pastes at mouse position with offset; new unique IDs generated
    - Edges between copied nodes preserved; edges to non-copied nodes dropped
    - Multi-select copy/paste works (Shift+click or drag-select)
  - Effort: M
  - Gotchas / debug notes: Must generate new node IDs on paste to avoid collisions. Edge reconnection logic is the tricky part â€” only copy edges where both source and target are in the selection.
  - Progress / Fixes / Updates:
    - 2026-02-08: Task created. Partially overlaps with F00.5-CH-02.

- [ ] `F01-CH-03` Add canvas annotation layer (sticky notes, comments)
  - Owner: Frontend / Design
  - Dependencies: `F00.5-MH-01`
  - Blocks: `none`
  - Roadmap ref: â€”
  - Acceptance criteria:
    - "Add Note" button creates a yellow sticky note node (non-functional, no connections)
    - Notes are resizable, support multi-line text, and can be freely positioned
    - Notes excluded from canvas JSON export (or in separate `annotations` array)
    - Distinct visual style from functional blocks (dashed border, muted color)
  - Effort: S
  - Gotchas / debug notes: Implement as a custom React Flow node type with `draggable: true`, `connectable: false`. Keep annotation data separate from functional graph data to avoid polluting instruction parsing.
  - Progress / Fixes / Updates:
    - 2026-02-08: Task created.

## Required Spikes / Decisions (do these first or in parallel)

- **Spike:** Connection validation rule matrix. Define which block type pairs are valid connections. Build a 5Ã—5 matrix (task, decision, loop, parallel, text) and test with 10 edge cases. (Outcome: validation rules for F01-MH-01.)

- **Decision:** Canvas versioning storage. Server-side (Postgres) vs. localStorage + periodic sync? Recommend server-side for multi-device and collaboration readiness. Lock by day 1 of feature-01 sprint.

- **Decision:** Instruction graph schema. Must be stable â€” orchestrator (Feature 04) will consume it. Define `{ tasks: [], dependencies: [], metadata: {} }` schema and lock by day 2. Share with orchestrator team.

- **Spike:** Voice-to-blocks LLM prompt engineering. Test 5 different prompts with GPT-4 / Claude for converting speech transcripts to canvas block suggestions. Measure accuracy on 10 test cases. (Outcome: finalize prompt template for F01-SH-01.)

- **Experiment:** Canvas performance at scale. Create a 100-node, 150-edge canvas programmatically. Measure render time, drag latency, and parse time. Identify bottlenecks. (Outcome: performance baseline and optimization targets.)

## Dogfooding Checklist (must be runnable by end of Must-Have)

- [x] Open canvas â†’ drag 10 blocks from palette sidebar â†’ connect with valid edges (see orange glow on valid, red on invalid)
- [x] Attempt circular connection â†’ see rejection with visual warning and snap-back animation
- [x] Save canvas â†’ see version appear in version history panel with timestamp
- [x] Revert to previous version â†’ canvas restores correctly, new version created
- [x] Click "Parse" â†’ see instruction graph preview with task list, dependencies, estimated cost
- [x] Edit 2 nodes â†’ click "Parse" again â†’ see delta (only changed tasks re-parsed)
- [x] Click "Execute" â†’ watch agents pick up tasks in dashboard â†’ execution completes
- [x] Create 50-node canvas â†’ verify no jank (smooth drag, <100ms interaction latency)
- [x] Export canvas JSON â†’ import on fresh page â†’ canvas identical (round-trip verified)
- [x] Build a 3-page Todo app workflow entirely through canvas â†’ orchestrator â†’ agents â†’ preview artifacts

## Cross-Feature Dependency Map

### Inbound Dependencies (what this feature needs from other features)
| External Task ID | External Task Title (short) | Local Task(s) Blocked | Status |
|-----------------|---------------------------|----------------------|--------|
| F00.5-MH-01 | React Flow canvas | F01-MH-01, F01-MH-02, F01-MH-03, F01-CH-01, F01-CH-02, F01-CH-03 | done |
| F00.5-MH-02 | Undo/redo stack | F01-MH-05 | done |
| F00.5-MH-03 | Properties editor | F01-MH-02 | done |
| F00.5-MH-04 | Canvas JSON serialization | F01-MH-03, F01-MH-05 | done |
| F00.5-MH-05 | Execution pipeline | F01-MH-04, F01-MH-05 | done |
| F00.5-SH-01 | Connection validation (partial) | F01-MH-01 | pending |
| F00-MH-01 | Heartbeat protocol | F01-MH-06 | pending |
| F00-MH-02 | WebSocket transport | F01-MH-06 | pending |
| F00-MH-05 | Agent SDK spec | F01-SH-01 | pending |

### Outbound Dependencies (what other features need from this one)
| Local Task ID | Local Task Title (short) | External Task(s) Blocked | Feature File |
|--------------|-------------------------|-------------------------|-------------|
| F01-MH-01 | Connection validation | F02-MH-03 | feature-02 |
| F01-MH-03 | Canvas versioning | F09-MH-01 | feature-09 |
| F01-MH-04 | Instruction graph parser | F04-MH-01, F04-MH-02 | feature-04 |
| F01-MH-05 | Delta re-execution | F04-MH-02 | feature-04 |
| F01-MH-06 | Canvas lifecycle E2E | F02-MH-01, F04-MH-01 | feature-02, feature-04 |
| F01-SH-01 | Voice input | F01-SH-04 | (this file) |

### Dependency Chain Position
- **Upstream features:** feature-00 (heartbeat, WebSocket, traces, audit, SDK), feature-00.5 (React Flow canvas, undo/redo, JSON, execution pipeline)
- **Downstream features:** feature-02 (Agent Dashboard), feature-04 (Orchestrator Hub), feature-09 (Multi-User Mode)
- **Critical path through this feature:** F00.5-MH-01 â†’ F01-MH-01 â†’ F01-MH-04 â†’ F01-MH-06 â†’ F04-MH-01

## Blocks Update Patch (apply to previous feature files)

The following tasks in previously generated feature files need their `Blocks` field updated to include references to tasks in THIS file.

| File | Task ID | Add to Blocks field |
|------|---------|-------------------|
| feature-00-foundations.md | F00-MH-01 | F01-MH-06 |
| feature-00-foundations.md | F00-MH-02 | F01-MH-06 |
| feature-00-foundations.md | F00-MH-05 | F01-SH-01 |
| feature-00.5-prototype-polish.md | F00.5-MH-01 | F01-MH-01, F01-MH-02, F01-MH-03, F01-CH-01, F01-CH-02, F01-CH-03 |
| feature-00.5-prototype-polish.md | F00.5-MH-02 | F01-MH-05 |
| feature-00.5-prototype-polish.md | F00.5-MH-03 | F01-MH-02 |
| feature-00.5-prototype-polish.md | F00.5-MH-04 | F01-MH-03, F01-MH-05 |
| feature-00.5-prototype-polish.md | F00.5-MH-05 | F01-MH-04, F01-MH-05 |
| feature-00.5-prototype-polish.md | F00.5-SH-01 | F01-MH-01 |
