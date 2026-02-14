# Feature 05 – AI Trace Viewer

**Priority:** 05 (after Output Simulator)
**Target completion:** weeks 13–15
**Why this feature now:** Features 00–04 built the heartbeat telemetry, canvas, agent dashboard, orchestrator, and artifact preview. The pipeline is: user draws canvas → orchestrator decomposes → agents execute → artifacts produced. But users have no visibility into *how* agents reasoned through decisions, *why* they chose alternatives, or where confidence was low. The Trace Viewer closes this transparency gap: expand any execution to see a decision tree/DAG where each node is a decision point with reasoning context, confidence score, and alternatives considered. Users can inspect failed executions, identify bottleneck decisions, and iteratively refine rule sets. This feature turns black-box agent behavior into debuggable white-box reasoning paths.

## Definition of Done

By end of week 15, a real user can click on any completed execution in the execution history, open the Trace Viewer modal, and see a collapsible/expandable decision tree showing all reasoning nodes for that execution. Each decision node displays: reasoning context (first 100 chars with expand to see full), confidence score (visual gauge 0–100%), timestamp, alternatives considered (collapsed list, expandable to compare rejection reasons). Users can collapse/expand subtrees, filter by confidence threshold, search for specific reasoning patterns, and fork/re-execute alternative paths with delta computation (only re-run affected downstream tasks). The trace viewer renders 1,000+ nodes in <2s, handles traces from 10–100 agent executions, and exports as JSON or Markdown for sharing.

## Must-Have Tasks (vertical slice — trace inspection and fork execution)

- [x] `F05-MH-01` Build trace viewer modal with collapsible decision tree rendering
   - Owner: Frontend
   - Dependencies: `F00-MH-03`, `F04-MH-02`
  - Blocks: `F05-CH-02`, `F05-MH-02`, `F05-MH-03`, `F05-MH-05`, `F05-SH-01`, `F13-MH-01`, `F13-MH-02`, `F14-MH-02`
  - Roadmap ref: `P1-MH-09`
  - Acceptance criteria:
    - New modal route (or fullscreen panel): `/traces/<execution_id>` shows execution metadata (agent_id, start_time, duration, cost, status)
    - Trace tree rendered as collapsible/expandable hierarchy: root = execution, level 1 = agent, level 2 = decision nodes
    - Each decision node displays: node_id, decision_context (first 100 chars), confidence_score (0–100%, color-coded: red <30%, yellow 30–70%, green >70%), timestamp, decision_outcome (selected action)
    - Click "Expand Context" on node to see full reasoning_context text (modal or tooltip, max 2000 chars)
    - Tree supports keyboard navigation: arrow keys to expand/collapse, enter to expand context
    - Performance: lazy-load decision nodes (render visible nodes + 50 buffer), virtualize tree for 1,000+ nodes
    - Export button: "Export as JSON" saves full trace + tree structure to file
  - Effort: L
  - Gotchas / debug notes: Hierarchical tree virtualization is hard. Use a library like `react-big-tree` or `virtuoso` with custom tree rendering. Don't fetch all nodes at once — fetch root (execution metadata) immediately, then stream decision nodes on demand (paginate by 50). Keyboard nav on trees is surprising — test arrow/enter/space carefully. Tree may have 1,000+ nodes; ensure parent-child relationship tracking is memory-efficient (IDs only, not object refs).
  - Progress / Fixes / Updates:
    - 2026-02-08: Task initialized. Blocked by F00-MH-03 (trace data model), F04-MH-02 (artifact UI patterns).
    - 2026-02-09: ✅ DEPENDENCIES MET. F00-MH-03 and F04-MH-02 complete. Starting implementation. Building trace viewer modal component with collapsible decision tree.

- [x] `F05-MH-02` Implement confidence threshold filtering and search within traces
   - Owner: Frontend
   - Dependencies: `F05-MH-01`
  - Blocks: `F05-MH-03`, `F05-MH-04`, `F05-SH-02`
  - Roadmap ref: —
  - Acceptance criteria:
    - Confidence filter slider: drag to set min confidence (0–100%), tree re-renders to hide nodes below threshold
    - Search box: substring search in decision_context field (case-insensitive), results highlight matching text in yellow
    - Search results counter: "Found 12 matching decisions in 1,000-node trace"
    - Quick-jump: clicking search result scrolls tree to that node, highlights parent path (breadcrumb highlighter)
    - Filter state persists across expand/collapse (filtered state is modal-scoped, not persisted)
    - Performance: search/filter <500ms even for 1,000-node trace
  - Effort: M
  - Gotchas / debug notes: Tree filtering changes visible node set; must recalculate virtual scrolling offsets. Search can be expensive: pre-index decision_context on trace load (simple array of {node_id, context_substring}). Highlight matching text without re-rendering entire tree — use CSS marks or inline span elements.
  - Progress / Fixes / Updates:
    - YYYY-MM-DD: Not started.

- [x] `F05-MH-03` Build alternative path expansion and diff viewer for forked decisions
    - Owner: Frontend / Backend
    - Dependencies: `F05-MH-01`, `F04-MH-04`
  - Blocks: `F05-CH-03`, `F05-MH-04`, `F05-SH-03`, `F13-MH-03`
   - Roadmap ref: `P1-MH-09`
   - Acceptance criteria:
     - Each decision node shows "Alternatives" section (collapsed): list of alternative_outcomes with rejection_reason
     - Click "Explore Alternative" on a rejected outcome → backend simulates re-execution from that decision point (delta execution: only recalculate downstream decisions)
     - Side-by-side diff view: left = original trace (from that node down), right = re-executed trace (alternative path)
     - Diff highlights: nodes that changed (confidence, outcome, cost), nodes that were added/removed
     - Estimated impact: "Choosing alternative would cost $0.05 more, save 2 seconds"
     - Delta execution latency: <5s for 100-node downstream
     - Store forked executions as new execution record (user can commit and execute)
   - Effort: L
   - Gotchas / debug notes: Delta execution is new code path. Don't re-execute the entire execution — only recalculate the affected subtree. Requires backend support for "partial re-execution" (complex, Phase 2 feature — for MVP, run full re-execution and compute diff). Diff computation same as F04-MH-04 (reuse artifact diff).
   - Progress / Fixes / Updates:
    - 2026-02-09: Blocked by F05-MH-01. Waiting for trace viewer modal.

- [x] `F05-MH-04` Implement timeline scrubber for decision point navigation and playback
    - Owner: Frontend
    - Dependencies: `F05-MH-02`
  - Blocks: `F05-CH-03`, `F05-SH-04`
   - Roadmap ref: —
   - Acceptance criteria:
     - Timeline scrubber at bottom of trace viewer: horizontal slider showing execution timeline
     - Scrubber positions mark decision points (small dots on timeline, color-coded by confidence)
     - Click/drag scrubber to jump to decision point; tree scrolls to that node, highlights it
     - Playback button: auto-advance scrubber through timeline at 2x speed (configurable 0.5x–4x)
     - Decision timestamps: show wall-clock time and elapsed time from execution start
     - Scrubber shows critical path overlay (thicker line for critical decisions vs. side-task decisions)
   - Effort: M
   - Gotchas / debug notes: Timeline computation requires sorting decision nodes by timestamp. Decision timing may have jitter (wall-clock skew across agents) — sort by relative sequence ID not absolute timestamp. Playback at variable speed requires smooth animation (use `requestAnimationFrame`, not `setInterval`). Critical path detection: needs topological analysis (Phase 2, for MVP just show all nodes evenly).
   - Progress / Fixes / Updates:
    - 2026-02-09: Blocked by F05-MH-02. Waiting for confidence filtering.

- [x] `F05-MH-05` Wire trace viewer into execution history and dashboard context menus
    - Owner: Full-stack
    - Dependencies: `F05-MH-01`, `F02-MH-03`, `F03-MH-05`
  - Blocks: `F12-CH-02`, `F13-MH-05`
   - Roadmap ref: —
   - Acceptance criteria:
     - Execution history (in Orchestrator Hub) shows list of past executions: execution_id, status, start_time, duration, cost, agent count
     - Click row or "Inspect Traces" button → opens trace viewer modal
     - Dashboard: agent context menu includes "View Recent Traces" → shows last 5 executions for that agent, click to open trace viewer
     - Trace viewer integrates with artifact preview: each trace node can link to corresponding artifact (if available)
     - Trace loading: spinner while fetching trace from backend, error state if trace not found
   - Effort: M
   - Gotchas / debug notes: Trace viewer modal must be responsive (works on mobile, but optimized for desktop). Execution history may be long (100+ executions); paginate or virtualize list. Trace fetching is potentially slow for old traces (archive queries); implement caching on frontend.
   - Progress / Fixes / Updates:
    - 2026-02-09: Blocked by F05-MH-01. Waiting for trace viewer modal.

## Should-Have Tasks (makes trace analysis powerful and exploratory)

- [ ] `F05-SH-01` Add confidence aggregation and swarm health heatmap visualization
  - Owner: Frontend
  - Dependencies: `F05-MH-01`, `F02-MH-04`
  - Blocks: `F05-CH-01`
  - Roadmap ref: —
  - Acceptance criteria:
    - Trace metadata shows aggregated metrics: overall execution confidence (weighted avg of decision confidences), critical decision count (count of <30% confidence nodes)
    - Heatmap overlay: nodes in decision tree color-coded by confidence (green >70%, yellow 30–70%, red <30%)
    - Agent health summary: if multi-agent execution, table showing per-agent contribution (% of decisions, avg confidence, cost)
    - Warning badge: if execution has >5 low-confidence decisions, show "⚠️ Low Confidence Execution" alert
  - Effort: M
  - Gotchas / debug notes: Aggregation needs careful weighting (should low-confidence decisions in parallel branches count equally?). Phase 2 will define aggregation strategy; for MVP use simple average. Heatmap color intensity may conflict with tree collapse/expand indicators — test colors carefully.
  - Progress / Fixes / Updates:
    - YYYY-MM-DD: Not started.

- [ ] `F05-SH-02` Implement trace comparison across executions (compare decision trees)
  - Owner: Frontend
  - Dependencies: `F05-MH-02`, `F03-MH-05`
  - Blocks: `F05-CH-01`
  - Roadmap ref: —
  - Acceptance criteria:
    - In execution history, multi-select 2 executions (same rule set, different agents or parameters)
    - "Compare Traces" view: side-by-side trace trees for both executions
    - Diff highlights: nodes that appear in both (neutral), only in A (blue), only in B (green), same decision but different confidence (yellow with Δ value)
    - Aggregated comparison: "Execution A: 87% avg confidence, 12 decisions, $0.42. Execution B: 91% avg confidence, 14 decisions, $0.38."
    - Use case: "Did different agent types produce different reasoning paths for the same task?"
  - Effort: L
  - Gotchas / debug notes: Trace comparison requires matching decision nodes across executions (hard problem — decisions may differ in count/order). Recommend simple heuristic: match by timestamp proximity + task_id, allow some mismatches. Phase 2 can add ML-based decision matching.
  - Progress / Fixes / Updates:
    - YYYY-MM-DD: Not started.

- [ ] `F05-SH-03` Build decision-level annotation system (users can add comments to decisions)
  - Owner: Frontend / Backend
  - Dependencies: `F05-MH-03`
  - Blocks: none
  - Roadmap ref: —
  - Acceptance criteria:
    - Click icon on decision node → "Add Note" modal
    - User types comment (max 500 chars) related to that decision (e.g., "This was a risky choice, should have lower confidence")
    - Note saved to backend linked to (execution_id, decision_id)
    - Other team members can see notes (no edit/delete yet, read-only)
    - Notes persist across trace reload
  - Effort: S
  - Gotchas / debug notes: Notes are user-generated data; need backend schema change (new `decision_notes` table or `metadata` field on traces). For MVP, store in-memory or simple JSON file per execution.
  - Progress / Fixes / Updates:
    - YYYY-MM-DD: Not started.

- [ ] `F05-SH-04` Implement trace export in multiple formats (JSON, Markdown, CSV)
  - Owner: Backend / Frontend
  - Dependencies: `F05-MH-04`
  - Blocks: none
  - Roadmap ref: —
  - Acceptance criteria:
    - "Export" dropdown menu in trace viewer: "As JSON", "As Markdown", "As CSV"
    - JSON export: full trace structure including all decision nodes, alternatives, metadata (compact format, <1MB per typical trace)
    - Markdown export: human-readable report with decision tree as nested list, confidence scores as badges, cost/duration summary
    - CSV export: one row per decision node with columns: decision_id, timestamp, outcome, confidence, cost, agent_id
    - Exports include execution metadata header (execution_id, start_time, rule_set, agents involved)
  - Effort: M
  - Gotchas / debug notes: CSV export of hierarchical tree is awkward (CSV is flat). Include parent_id and depth columns to allow re-building tree from CSV. JSON export can be large (1,000-node trace ≈ 500KB); gzip on backend if needed. Markdown export should be readable in GitHub or Notion.
  - Progress / Fixes / Updates:
    - YYYY-MM-DD: Not started.

## Could-Have Tasks (polish — defer without shame)

- [ ] `F05-CH-01` Add ML-powered recommendation engine for decision analysis
  - Owner: Backend / AI
  - Dependencies: `F05-SH-01`, `F05-SH-02`
  - Blocks: none
  - Roadmap ref: —
  - Acceptance criteria:
    - Analyzer examines trace confidence scores and patterns
    - Suggestions: "95% of similar executions chose outcome A; you chose B (rare). Consider re-evaluating."
    - "This decision has 3 precedents in history; all succeeded. High confidence in this path."
    - Bottleneck detection: "Decision node #42 is on critical path and has low confidence; optimize here."
    - Suggestions shown as interactive cards in trace viewer
  - Effort: L
  - Gotchas / debug notes: Recommendations require ML model trained on historical traces. For MVP, use simple heuristic rules (count precedents, flag rare outcomes). Real ML comes in Phase 3.
  - Progress / Fixes / Updates:
    - YYYY-MM-DD: Not started.

- [ ] `F05-CH-02` Implement decision bookmarking and trace curation (save important traces)
  - Owner: Frontend / Backend
  - Dependencies: `F05-MH-01`
  - Blocks: none
  - Roadmap ref: —
  - Acceptance criteria:
    - "Bookmark" button on trace modal, bookmarked traces saved to user's collection
    - Bookmark collection accessible from navigation: `/traces/bookmarks`
    - Bookmark metadata: name (user-provided), timestamp, execution_id, tags (e.g., "critical", "interesting", "buggy")
    - Filter/search bookmarks by tag or name
  - Effort: S
  - Gotchas / debug notes: Bookmarks are user-specific data (need user context). For MVP single-user mode, store in localStorage. Multi-user bookmark sharing comes in Phase 2.
  - Progress / Fixes / Updates:
    - YYYY-MM-DD: Not started.

- [ ] `F05-CH-03` Build interactive "what-if" simulator for decision re-weighting
  - Owner: Frontend / Backend
  - Dependencies: `F05-MH-03`, `F05-MH-04`
  - Blocks: none
  - Roadmap ref: —
  - Acceptance criteria:
    - "What-if" panel in trace viewer: adjust confidence threshold for a decision and see downstream impact
    - Slider: set hypothetical confidence (0–100%) for selected decision node
    - Backend re-simulates downstream decisions with new confidence input
    - Results show: "If this decision was 80% confident instead of 42%, overall execution would cost $0.03 more but finish 1s faster"
    - Side-by-side comparison of original vs. what-if trace (same as F05-MH-03 fork)
  - Effort: M
  - Gotchas / debug notes: What-if simulation is expensive. For MVP, cache results per (decision_id, hypothetical_confidence) pair. Real-time updates only for downstream nodes, not full re-execution. Phase 2 optimizes with delta computation.
  - Progress / Fixes / Updates:
    - YYYY-MM-DD: Not started.

## Required Spikes / Decisions (do these first or in parallel)

- **Spike:** Trace loading performance. Fetch a 1,000-node trace from backend, measure parse time, measure initial render time. Target: <2s total. If slower, implement streaming or pagination.

- **Decision:** Trace node matching for comparison. Two traces from same execution graph but different agents may have different decision counts. Define matching heuristic: timestamp proximity? task_id? Vector embedding? Lock matching strategy by day 1.

- **Decision:** Confidence aggregation formula. How do we compute "overall execution confidence" from per-decision confidences? Simple average? Weighted by decision criticality? Weighted by cost impact? Lock formula by day 2 of sprint.

- **Experiment:** Tree virtualization library. Test `react-big-tree`, `virtuoso`, or custom implementation with 1,000-node trace. Measure render time and scroll smoothness. Recommend by day 1.

## Dogfooding Checklist (must be runnable by end of Must-Have)

- [x] Execute a multi-agent workflow (5+ agents) from Orchestrator Hub that completes successfully
- [x] Open Orchestrator Hub execution history → see list of past executions with metadata
- [x] Click "Inspect Traces" on a completed execution → trace viewer modal opens
- [x] Trace tree visible with 50+ decision nodes in collapsible hierarchy (root = execution, level 1 = agent, level 2+ = decisions)
- [x] Each decision node shows: reasoning context (abbreviated), confidence score (color-coded badge), timestamp
- [x] Click "Expand" on a node → see full reasoning context (modal or expanded tooltip)
- [x] Confidence filter slider: drag to 70% → tree hides low-confidence nodes (<70%), node count decreases
- [x] Search for keyword in trace (e.g., "error" or "fallback") → search highlights matching decision nodes
- [x] Click search result → tree scrolls to that node, highlights it with breadcrumb navigation
- [x] On a decision node with alternatives: click "Explore Alternative" → backend re-simulates that path
- [x] Alt path re-execution shows: original trace vs. alt trace side-by-side with diffs (added/removed nodes)
- [x] Impact estimate visible: "Alt path would cost $X more/less, save Y seconds"
- [x] Timeline scrubber at bottom of trace viewer: visible decision points as dots, play button for 2x playback
- [x] Drag scrubber → trace jumps to that point in time, highlights current decision node
- [x] Click "Export as JSON" → trace downloads as JSON file (can paste into GitHub or share)
- [x] From Agent Dashboard: right-click agent → "View Recent Traces" → see last 5 executions, click one → opens trace viewer
- [x] Render 1,000-node trace in <2s (may show spinner during load)
- [x] Team member opens same trace in their session → sees same decision tree (no real-time collab yet, but same data)

## Cross-Feature Dependency Map

### Inbound Dependencies (what this feature needs from other features)
| External Task ID | External Task Title (short) | Local Task(s) Blocked | Status |
|-----------------|---------------------------|----------------------|--------|
| F00-MH-03 | Trace data model | F05-MH-01, F05-MH-02, F05-MH-04 | done |
| F04-MH-02 | Artifact preview UI | F05-MH-01, F05-SH-01 | done |
| F04-MH-04 | Artifact validation & diff | F05-MH-03, F05-SH-02 | done |
| F02-MH-03 | Agent action APIs | F05-MH-05 | done |
| F02-MH-04 | Real-time metrics | F05-SH-01 | done |
| F03-MH-05 | Execution history | F05-MH-05, F05-SH-02 | done |

### Outbound Dependencies (what other features need from this one)
| Local Task ID | Local Task Title (short) | External Task(s) Blocked | Feature File |
|--------------|-------------------------|-------------------------|-------------|
| F05-MH-01 | Trace viewer modal | F06-MH-02, F06-MH-03 | feature-06 |
| F05-MH-03 | Alternative path exploration | F06-SH-02 | feature-06 |
| F05-MH-04 | Timeline scrubber | F07-SH-03 | feature-07 |

### Dependency Chain Position
- **Upstream features:** feature-00 (foundations), feature-02 (dashboard), feature-03 (orchestrator), feature-04 (artifacts)
- **Downstream features:** feature-06 (analytics), feature-07 (advanced visualizations)
- **Critical path through this feature:** F00-MH-03 → F05-MH-01 → F05-MH-02 → F05-MH-04 → F06-MH-02

## Blocks Update Patch (apply to previous feature files)

The following tasks in previously generated feature files need their `Blocks` field updated to include references to tasks in THIS file.

| File | Task ID | Add to Blocks field |
|------|---------|-------------------|
| feature-00-foundations.md | F00-MH-03 | F05-MH-01, F05-MH-02, F05-MH-04 |
| feature-04-output-simulator.md | F04-MH-02 | F05-MH-01, F05-SH-01 |
| feature-04-output-simulator.md | F04-MH-04 | F05-MH-03, F05-SH-02 |
| feature-02-agent-dashboard.md | F02-MH-03 | F05-MH-05 |
| feature-03-orchestrator-hub.md | F03-MH-05 | F05-MH-05, F05-SH-02 |
