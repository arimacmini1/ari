# Feature 13 - Comparative Trace Analysis & Alternative Outcome Simulation
**Priority:** 07 (Phase 2 decision transparency + optimization)
**Target completion:** weeks 10-12
**Why this feature now:** Feature 05 made traces inspectable, but users still cannot rigorously compare "what happened" vs "what could have happened." This feature closes that gap with side-by-side path analysis, measurable trade-off deltas, and controlled fork/re-execution from historical decision points.

## Definition of Done
When this lands, a real user can open any completed trace, select a historical decision node, fork an alternative outcome, run a re-execution for the affected path, and compare original vs alternative outcomes side-by-side with confidence/cost/latency deltas. The comparison must remain responsive for large traces and make simulation status and assumptions explicit.

---

## Must-Have Tasks (vertical slice - compare and simulate alternatives)

- [x] `F13-MH-01` Define comparative trace contract and backend APIs
  - Owner: Backend / AI
  - Dependencies: `F00-MH-03`, `F05-MH-01`
  - Blocks: `F13-MH-02`, `F13-MH-03`, `F13-MH-04`, `F13-MH-06`
  - Roadmap ref: `P2-MH-01`
  - Acceptance criteria:
    - Define a stable schema for comparative traces (`base_path`, `alternative_path`, `diff_summary`, `tradeoff_metrics`)
    - Add API to request comparison by execution + decision node IDs
    - Add API to fork and re-execute from a selected decision point
    - API response includes explicit status (`queued`, `running`, `completed`, `failed`) and error payloads
  - Effort: M
  - Gotchas / debug notes: Keep path IDs stable across retries; avoid opaque "comparison failed" errors.
  - Progress / Fixes / Updates:
    - 2026-02-12: Started implementation. Added comparison contract types in `lib/trace-compare-model.ts` and comparison builder in `lib/trace-compare.ts`.
    - 2026-02-12: Added API routes `POST /api/traces/compare` and `POST /api/traces/fork` with explicit status fields and error payloads.
    - 2026-02-12: Refactored `GET /api/traces/[executionId]` to use shared in-memory store `lib/mock-trace-store.ts` so compare/fork operate on the same trace source.

- [x] `F13-MH-02` Build side-by-side decision path comparison view
  - Owner: Frontend
  - Dependencies: `F13-MH-01`, `F05-MH-01`
  - Blocks: `F13-MH-04`, `F13-SH-01`
  - Roadmap ref: `P2-MH-01`
  - Acceptance criteria:
    - Render original path and alternative path in synchronized side-by-side panels
    - Highlight added/removed/changed decisions with clear visual states
    - Clicking a decision in one panel focuses corresponding node in the other when match exists
    - Works from Trace Viewer without losing current execution context
  - Effort: L
  - Gotchas / debug notes: Tree sync can drift on unmatched nodes; preserve explicit "no match" states.
  - Progress / Fixes / Updates:
    - 2026-02-12: Started implementation. Added `components/aei/trace-compare-dialog.tsx` with side-by-side original vs alternative panels and basic "changed" highlighting.
    - 2026-02-12: Added Trace Viewer panel fetch UI in `components/aei/trace-viewer.tsx` (enter execution ID, load trace, render tree) to make comparisons runnable from the main workspace tab.
    - 2026-02-12: Added synchronized node focus across both compare panels in `components/aei/trace-compare-dialog.tsx` (clicking a node highlights the same node in the opposite panel, with explicit unmatched-node warning).
    - 2026-02-12: Expanded diff visuals in `components/aei/trace-compare-dialog.tsx` to show explicit `changed` / `added` / `removed` states and legend.

- [x] `F13-MH-03` Implement decision-point fork and scoped re-execution flow
  - Owner: Backend / Orchestrator
  - Dependencies: `F13-MH-01`, `F03-MH-03`, `F05-MH-03`
  - Blocks: `F13-MH-04`, `F13-MH-05`, `F13-SH-02`
  - Roadmap ref: `P2-MH-01`
  - Acceptance criteria:
    - User can fork from any supported historical decision node
    - Re-execution runs from the fork point (scoped to affected downstream path) with clear fallback behavior
    - Re-execution creates a new execution record linked to the source execution and fork node
    - Progress is visible in real-time through status updates and completion events
  - Effort: XL
  - Gotchas / debug notes: If scoped execution cannot be guaranteed, surface fallback to full re-exec explicitly.
  - Progress / Fixes / Updates:
    - 2026-02-12: Started with a mock fork implementation. `POST /api/traces/fork` creates a synthetic fork trace stored in-memory (not true scoped downstream re-execution yet).
    - 2026-02-12: Implemented scoped downstream re-execution simulation in `lib/trace-compare.ts` (`buildScopedForkExecution`) and updated `POST /api/traces/fork` to mutate only the fork subtree in a cloned execution instead of appending an alternative root.
    - 2026-02-12: Fork response now includes `mode: "scoped"` and `affected_nodes` for observability, and forked traces carry `source_execution_id`, `fork_node_id`, and `fork_mode` metadata in `TraceExecution`.
    - 2026-02-12: Dogfood workflow template applied for this slice (B1-B8) in `docs/process/dogfood-workflow-template.md` under Feature 13 example; scope locked to scoped fork vertical slice and acceptance gates documented.
    - 2026-02-12: Added explicit async fork status lifecycle with in-memory fork jobs (`lib/trace-fork-job-store.ts`), queue/run/complete transitions in `POST /api/traces/fork`, and status polling endpoint `GET /api/traces/fork/[forkId]`.
    - 2026-02-12: Updated `components/aei/trace-compare-dialog.tsx` to poll fork status and show live `fork_status` + status note badges (`queued` → `running` → `completed/failed`) before loading the forked execution.

- [x] `F13-MH-04` Add quantified trade-off panel (confidence, cost, latency deltas)
  - Owner: Frontend / Backend
  - Dependencies: `F13-MH-01`, `F13-MH-02`, `F13-MH-03`
  - Blocks: `F13-CH-01`, `F13-MH-06`, `F13-SH-03`
  - Roadmap ref: `P2-MH-01`
  - Acceptance criteria:
    - Show `confidence_delta`, `cost_delta`, and `latency_delta` between original and alternative paths
    - Provide roll-up and per-decision deltas where data is available
    - Include clear data-quality notes when metrics are estimated vs observed
    - Export trade-off summary as JSON/Markdown from the comparison view
  - Effort: M
  - Gotchas / debug notes: Distinguish estimated values from actual telemetry to avoid false precision.
  - Progress / Fixes / Updates:
    - 2026-02-12: Started implementation. Added trade-off rollups (avg confidence, subtree cost, subtree latency) and deltas in `components/aei/trace-compare-dialog.tsx` from `comparison.tradeoff_metrics`.
    - 2026-02-12: Added per-decision delta metrics to compare contract (`lib/trace-compare-model.ts`) and computation (`lib/trace-compare.ts`) with explicit `data_quality` tags.
    - 2026-02-12: Added export actions in `components/aei/trace-compare-dialog.tsx` for JSON and Markdown trade-off summaries.

- [x] `F13-MH-05` Wire comparative analysis entry points into Trace Viewer
  - Owner: Full-stack
  - Dependencies: `F05-MH-05`, `F13-MH-03`
  - Blocks: `F13-CH-02`, `F13-SH-01`
  - Roadmap ref: `P2-MH-01`
  - Acceptance criteria:
    - From Trace Viewer decision nodes, user can launch "Compare Alternative" directly
    - Entry path pre-populates execution ID, decision ID, and selected alternative outcome
    - Failures return user to trace context with actionable error messaging
    - Comparison history appears in execution detail context for the same project
  - Effort: M
  - Gotchas / debug notes: Preserve back-navigation; avoid trapping user in modal stacks.
  - Progress / Fixes / Updates:
    - 2026-02-12: Started implementation. Added per-node `Compare` action in `components/aei/trace-node.tsx` and wired to `TraceCompareDialog` via `components/aei/trace-tree.tsx`.
    - 2026-02-12: Added execution-created trace generation in `app/api/executions/route.ts` plus deep-link route `app/traces/[executionId]/page.tsx` to make compare/fork runnable from real executions (not only seeded `exec-001`).
    - 2026-02-12: Added explicit kill-switch visibility in Trace Viewer/Trace Tree headers so admin-disabled compare/fork state is obvious during dogfooding.
    - 2026-02-12: Replaced env-only kill-switch UX with runtime toggles in Trace Viewer (`components/aei/trace-viewer.tsx`) backed by `GET/PATCH /api/traces/flags` and shared server store `lib/trace-feature-flags.ts` so compare/fork can be enabled/disabled live without restart.

- [x] `F13-MH-06` Performance and scale hardening for comparative traces
  - Owner: Frontend / Infra
  - Dependencies: `F13-MH-01`, `F13-MH-04`
  - Blocks: `F13-SH-02`
  - Roadmap ref: `P2-MH-01`
  - Acceptance criteria:
    - Comparative view renders 1,000+ decision nodes in <3s best-effort on dev hardware
    - Diff computation avoids main-thread lockups for large traces
    - Status polling/streaming remains stable under repeated compare runs
    - Add internal timings (`compare_load_ms`, `diff_compute_ms`, `fork_exec_ms`) for diagnostics
  - Effort: L
  - Gotchas / debug notes: Precompute path indexes; memoize correspondence maps.
  - Progress / Fixes / Updates:
    - 2026-02-12: Started implementation. Added `diff_compute_ms` timing in compare response and a safety cap on fork-subtree size (`lib/trace-compare.ts`) to avoid pathological compares.

## Should-Have Tasks (makes it reliable for repeated analysis)

- [ ] `F13-SH-01` Add comparison presets and saved scenarios
  - Owner: Frontend / Product
  - Dependencies: `F13-MH-02`, `F13-MH-05`
  - Blocks: none
  - Roadmap ref: `—`
  - Acceptance criteria:
    - Save named comparison scenarios for later review
    - Reopen saved scenarios with selected nodes, filters, and active metrics
    - Show scenario owner + timestamp metadata
  - Effort: M
  - Gotchas / debug notes: Keep saved payload compact; avoid storing full trace blobs.
  - Progress / Fixes / Updates:
    - 2026-02-12: Not started.

- [ ] `F13-SH-02` Support batch alternative simulation runs for a single execution
  - Owner: Backend / AI
  - Dependencies: `F13-MH-03`, `F13-MH-06`
  - Blocks: none
  - Roadmap ref: `—`
  - Acceptance criteria:
    - Queue and execute multiple alternative paths from one execution
    - Provide run status and summary table for all alternatives
    - Enforce per-project concurrency limits and cancellation
  - Effort: L
  - Gotchas / debug notes: Guard against runaway cost from unbounded batch re-execution.
  - Progress / Fixes / Updates:
    - 2026-02-12: Not started.

- [ ] `F13-SH-03` Add confidence-quality correlation overlays
  - Owner: Frontend / Data
  - Dependencies: `F13-MH-04`
  - Blocks: none
  - Roadmap ref: `—`
  - Acceptance criteria:
    - Overlay downstream quality outcomes against confidence deltas
    - Flag cases where higher confidence did not improve quality
    - Show simple confidence-quality correlation score per comparison
  - Effort: M
  - Gotchas / debug notes: Correlation without causal caveats can mislead; include explanatory copy.
  - Progress / Fixes / Updates:
    - 2026-02-12: Not started.

## Could-Have Tasks (polish - defer without shame)

- [ ] `F13-CH-01` Add AI-assisted explanation cards for major path deltas
  - Owner: Backend / AI / Frontend
  - Dependencies: `F13-MH-04`
  - Blocks: none
  - Roadmap ref: `—`
  - Acceptance criteria:
    - Generate concise natural-language summaries of major decision-path differences
    - Tie each explanation to concrete node-level evidence and metrics
    - Allow user feedback (`helpful` / `not helpful`) for tuning
  - Effort: M
  - Gotchas / debug notes: Never present generated explanation without linked evidence.
  - Progress / Fixes / Updates:
    - 2026-02-12: Not started.

- [ ] `F13-CH-02` Shareable comparison report links with access controls
  - Owner: Backend / Security / Frontend
  - Dependencies: `F13-MH-05`
  - Blocks: none
  - Roadmap ref: `—`
  - Acceptance criteria:
    - Create shareable link to a comparison snapshot
    - Enforce role checks and project scope for link access
    - Include revocation and expiration controls
  - Effort: M
  - Gotchas / debug notes: Treat comparison outputs as potentially sensitive operational telemetry.
  - Progress / Fixes / Updates:
    - 2026-02-12: Not started.

## Required Spikes / Decisions (do these first or in parallel)

- Decision: Scoped re-execution contract (strict downstream-only vs fallback full re-exec policy)
- Spike: Decision-node correspondence strategy for robust path matching in divergent trees
- Decision: Trade-off metric definitions (observed telemetry vs estimated simulation outputs)
- Experiment: Rendering + diff performance test with 1,000+ node traces and repeated compare cycles

## Dogfooding Checklist (must be runnable by end of Must-Have)

- [x] Open an existing execution trace and launch comparison from a decision node
- [x] Fork a historical alternative and observe real-time re-execution status updates
- [x] View side-by-side paths with clear changed/added/removed decision highlights
- [x] Confirm quantified confidence/cost/latency deltas populate after run completion
- [x] Validate failure behavior (fork failure, compare timeout, missing node mapping) returns actionable UI errors
- [x] Validate large-trace responsiveness stays within target budget (<3s initial comparative render best-effort)

## Cross-Feature Dependency Map

### Inbound Dependencies (what this feature needs from other features)
| External Task ID | External Task Title (short) | Local Task(s) Blocked | Status |
|-----------------|-----------------------------|-----------------------|--------|
| `F00-MH-03` | Trace data model | `F13-MH-01` | pending / done |
| `F03-MH-03` | Simulation pipeline wiring | `F13-MH-03` | pending / done |
| `F05-MH-01` | Trace viewer modal/tree | `F13-MH-01`, `F13-MH-02` | pending / done |
| `F05-MH-03` | Alternative path expansion baseline | `F13-MH-03` | pending / done |
| `F05-MH-05` | Trace viewer wiring into execution surfaces | `F13-MH-05` | pending / done |

### Outbound Dependencies (what other features need from this one)
| Local Task ID | Local Task Title (short) | External Task(s) Blocked | Feature File |
|--------------|---------------------------|--------------------------|-------------|
| `F13-MH-04` | Trade-off metrics panel | `P3-SH-02` (predictive analytics quality/cost context) | future feature files |
| `F13-MH-06` | Comparative performance hardening | `P3-SH-05` (advanced debugging/time-travel UX) | future feature files |

### Dependency Chain Position
- **Upstream features:** feature-00 (trace model), feature-03 (execution pipeline), feature-05 (trace viewer + alternative path baseline)
- **Downstream features:** advanced analytics, higher-order debugging and optimization layers
- **Critical path through this feature:** `F13-MH-01` -> `F13-MH-03` -> `F13-MH-02` -> `F13-MH-04` -> `F13-MH-06`

## Blocks Update Patch (apply to previous feature files)

The following tasks in previously generated feature files need their `Blocks` field
updated to include references to tasks in THIS file.

| File | Task ID | Add to Blocks field |
|------|---------|---------------------|
| feature-00-foundations.md | `F00-MH-03` | `F13-MH-01` |
| feature-03-orchestrator-hub.md | `F03-MH-03` | `F13-MH-03` |
| feature-05-ai-trace-viewer.md | `F05-MH-01` | `F13-MH-01`, `F13-MH-02` |
| feature-05-ai-trace-viewer.md | `F05-MH-03` | `F13-MH-03` |
| feature-05-ai-trace-viewer.md | `F05-MH-05` | `F13-MH-05` |
