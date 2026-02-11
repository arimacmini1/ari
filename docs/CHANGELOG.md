# AEI Project Changelog

All notable feature completions are documented here.

> **🔨 Critical Hotfix:** Executions API Route Mismatch fixed (2026-02-08). See [BUG-FIXES.md](./BUG-FIXES.md) for details.

---

## [2026-02-08] Feature 03 – Orchestrator Hub Documentation Complete

**Status:** ✅ On-boarding guide and architecture documentation created

### Documentation Files
- **On-Boarding Guide:** `/docs/on-boarding/feature-03-onboarding.md`
  - Quick start (2-3 minutes to first use)
  - Feature overview with capabilities and limitations
  - Comprehensive testing guide (7 sections, 40+ test cases)
  - Workflow guide for common tasks
  - Troubleshooting and support

- **Architecture Guide:** `/docs/architecture/feature-03-architecture.md`
  - System architecture and component design
  - Frontend and backend components
  - Data flow and algorithms (topological sort, greedy assignment)
  - Performance considerations and scaling
  - Error handling and testing strategy
  - Future enhancements (Phase 2+)

### Key Features Documented
- Rule management (create, edit, delete coordination rules)
- Task decomposition and dependency ordering (Kahn's algorithm)
- Agent assignment via rule-based affinity matching
- Non-destructive simulation pipeline
- Constraint adjustment and re-simulation (<2s target)
- Task dispatch and execution tracking
- Execution history and replay viewer

### Notes
- Feature 03 core implementation complete; documentation provides comprehensive on-boarding
- Both guides follow established documentation standards from Features 01 & 02
- Ready for QA testing and user on-boarding

---

## [2026-02-09] Feature 02 – Agent Dashboard Completed

**Status:** All Must-Have tasks complete. 4 WebSocket/render bugs found and fixed during testing.

### What's New
- **Hierarchical agent tree** with Orchestrators at root, workers nested (expand/collapse, checkboxes)
- **Real-time WebSocket updates** via mock (every 2s) with status badge color changes
- **Context menu actions:** Pause/Resume, Terminate, Reassign (stub), Inspect Logs
- **Sparkline charts:** Inline SVG for CPU, memory, tokens/min, cost (5-min rolling window)
- **Orchestrator assignments:** Parent-child relationships update live during execution
- **Agent logs modal:** Timestamped logs with copy-to-clipboard

### Bug Fixes During Testing
- Fixed mock WebSocket never activating (conditional logic routed to real WS)
- Fixed `readyState` TypeError (WebSocket.prototype read-only getter)
- Fixed infinite re-render loop in WebSocket hook (`isConnected` in deps)
- Fixed infinite re-render loop in AgentPanel (hook objects in useEffect deps)

### Files
- On-boarding: `/docs/on-boarding/feature-02-onboarding.md`
- Architecture: `/docs/architecture/feature-02-architecture.md`
- Task file: `/docs/tasks/feature-02-agent-dashboard.md`

### Key Lesson
Never put custom hook return objects in useEffect dependency arrays — they create new references every render. Use refs for stable access.

---

## [2026-02-08] Feature 01 – Prompt Canvas Completed

**Status:** ✅ All Must-Have tasks complete, on-boarding and architecture documentation created

### Feature Overview
Production-grade visual canvas for composing multi-agent workflows. Users drag-drop blocks (task, decision, loop, parallel, text), connect with validated edges, and the system converts visual structure into a structured instruction graph for the orchestrator.

### What's New

#### Must-Have Tasks Completed (6 tasks)
- ✅ `F01-MH-01` - Connection validation rules with visual feedback (green/orange/red)
- ✅ `F01-MH-02` - Block template library with drag-from-sidebar palette (7 block types)
- ✅ `F01-MH-03` - Canvas versioning with immutable snapshots and full history
- ✅ `F01-MH-04` - Canvas-to-instruction-graph parser (semantic decomposition)
- ✅ `F01-MH-05` - Delta re-execution (edit → re-parse only changed tasks in <200ms)
- ✅ `F01-MH-06` - End-to-end lifecycle: create → compose → validate → parse → preview → execute

#### Key Features
- **7 Block Types:** Task, Decision, Loop, Parallel, Text (Input), Artifact, Preview (Output)
- **Connection Validation:** 5×5 rule matrix, circular dependency detection, visual feedback
- **Versioning:** Immutable snapshots with full history, diff viewer, revert capability
- **Instruction Parsing:** Converts visual canvas → structured task graph with priorities and dependencies
- **Delta Parsing:** Edit-time re-parsing in <200ms (vs. 500ms full parse)
- **Performance:** Smooth rendering at 50 blocks, undo/redo up to 50 changes
- **Export/Import:** Lossless JSON round-trip

### Files Created
- `/docs/on-boarding/feature-01-onboarding.md` - User guide, testing procedures, debugging tips
- `/docs/architecture/feature-01-architecture.md` - System design, component architecture, data models, design decisions

### Key Components

**Frontend:**
- `components/aei/prompt-canvas.tsx` - Main canvas orchestrator
- `components/aei/canvas-flow.tsx` - React Flow wrapper with validation
- `components/aei/block-node.tsx` - Individual block rendering
- `components/aei/block-palette.tsx` - Sidebar with block types and search
- `components/aei/version-history.tsx` - Version history panel with revert
- `components/aei/instruction-preview.tsx` - Parse preview with task list

**Backend:**
- `lib/instruction-graph.ts` - Canvas → instruction graph parser
- `lib/connection-rules.ts` - Block type validation matrix and cycle detection
- `lib/canvas-versions.ts` - Version storage and diff computation
- `app/api/canvases/parse/route.ts` - Parse endpoint (full)
- `app/api/canvases/parse/delta/route.ts` - Parse endpoint (delta)
- `app/api/canvases/versions/route.ts` - Version history CRUD

### Performance Metrics
| Operation | Latency |
|-----------|---------|
| Drag block | <16ms |
| Full parse (50 nodes) | ~400-500ms |
| Delta parse (1-5 changes) | ~150-200ms |
| Save version | ~50ms |
| Undo/redo | <16ms |

### Dependencies
**Upstream (must be complete before Feature 01):**
- `F00.5-MH-01` - React Flow canvas (used)
- `F00.5-MH-02` - Undo/redo stack (extended with versioning)
- `F00.5-MH-03` - Properties editor (used for block editing)
- `F00.5-MH-04` - Canvas JSON serialization (used for versioning)
- `F00.5-MH-05` - Execution pipeline (used for orchestrator integration)
- `F00-MH-01` - Heartbeat protocol (used in execution)
- `F00-MH-02` - WebSocket transport (used in execution)

**Downstream (Feature 02, 04 depend on this):**
- `F02-MH-01` - Agent Dashboard (receives instruction graphs)
- `F04-MH-01` - Orchestrator Hub (consumes instruction graphs)

### Testing Status
- ✅ Manual testing: All 10 test categories pass (block ops, validation, versioning, parsing, execution, undo, JSON, performance, search, palette)
- ✅ Performance: 50-block canvas smooth (<100ms drag latency)
- ✅ Integration: Full end-to-end flow works (create → compose → validate → parse → preview → execute)

### Known Issues
None reported. All acceptance criteria met.

### Next Steps
1. Feature 01-SH tasks (voice input, templates, NLP-to-canvas) scheduled for iteration 2
2. Feature 02 (Agent Dashboard) unblocked and can begin
3. Feature 04 (Orchestrator) ready to integrate with instruction graph schema

### Related Documentation
- **On-Boarding Guide:** `/docs/on-boarding/feature-01-onboarding.md` - How to use, test, debug
- **Architecture Doc:** `/docs/architecture/feature-01-architecture.md` - System design, decisions, performance
- **Task File:** `/docs/tasks/feature-01-prompt-canvas.md` - Feature planning, task breakdown, progress notes
- **Roadmap:** `/docs/tasks/project-roadmap.md` - Feature sequencing and dependencies

---

## [2026-02-08] Feature 00.5 – Prototype Polish Completed

**Status:** ✅ Foundation for Feature 01

### Feature Overview
Prototype canvas implementation with React Flow, undo/redo, properties editor, JSON serialization, and mock execution pipeline.

### What's New
- React Flow-based drag-drop canvas
- 5-block types (Task, Decision, Loop, Parallel, Text)
- Properties panel for block editing
- Undo/redo stack (50 entry limit)
- JSON export/import
- Mock orchestration execution
- localStorage persistence

### Files
- `/docs/on-boarding/feature-00.5-onboarding.md` - User guide

### Next Steps
Feature 01 (Prompt Canvas) extends this with production-grade features: connection validation, versioning, semantic parsing.

---

## [2026-02-08] Feature 00 – Foundations Completed

**Status:** ✅ Infrastructure foundation

### Feature Overview
Agent runtime, heartbeat protocol, WebSocket transport, audit logging, SDK spec.

### Key Components
- Agent heartbeat (alive checks)
- WebSocket bidirectional communication
- Structured logging and audit trail
- Agent SDK specification

### Next Steps
Feature 00.5 and Feature 01 build on top of this foundation.
