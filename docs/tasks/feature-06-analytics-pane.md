# Feature 06 – Analytics Pane

**Priority:** 06 (after Output Simulator & AI Trace Viewer)
**Target completion:** weeks 14–16
**Why this feature now:** Features 00–04 implemented the end-to-end execution pipeline: user writes canvas → orchestrator assigns tasks → agents execute → artifacts produced. Feature-05 (AI Trace Viewer) adds reasoning transparency. But users have no unified dashboard for monitoring project-wide KPIs: cost spend, quality scores, error rates, latency percentiles, anomalies. Feature 06 closes this gap: a customizable analytics dashboard showing real-time KPIs, time-series charts with drill-down to agent/task level, threshold-based alerts, and anomaly detection. Users can answer: "Are we overspending? Quality dropping? Which agents are slow?" and export compliance/stakeholder reports.

## Definition of Done

By end of week 16, a real user can open the Analytics Pane (new top-level nav item), see a customizable dashboard with 4–6 KPI cards (cost YTD, avg quality score, error rate, latency p95, agent count, success rate), click into any KPI to see time-series chart (line/area graph) with drill-down by agent/project/task type, configure threshold alerts ("warn if cost/day exceeds $X"), view anomaly highlights (spikes in cost or dips in quality marked with annotations on charts), and export full metrics report as CSV/JSON/PDF with charts and tables. Dashboard updates real-time with <1s latency for metric refreshes. At least 2 anomaly detection algorithms working: moving average spike detection (for cost) and percent-change detection (for quality dips). Users can customize which KPIs display, reorder cards, and save dashboard layouts.

## Must-Have Tasks (vertical slice — customizable KPI dashboards with real-time updates)

- [x] `F06-MH-01` Design analytics data schema and KPI metric aggregation pipeline
  - Owner: Backend / AI
  - Dependencies: `F01-MH-01`, `F02-MH-01`, `F03-MH-01`, `F04-MH-01`
  - Blocks: `F06-MH-02`, `F06-MH-03`, `F06-MH-04`, `F06-MH-05`, `F06-MH-07`, `F14-MH-03`, `F15-MH-01`
  - Roadmap ref: `P2-MH-05`
  - Acceptance criteria:
    - Define KPI metrics: cost_total, cost_daily, quality_score_avg, error_rate, latency_p95, agent_count_active, success_rate, token_spend, execution_duration_avg
    - Aggregation levels: by project, by agent, by task_type, by day/week/month
    - Data model: time-series events with granular timestamps (every heartbeat)
    - Metric calculation: sum (cost), avg/median/p95 (latency, quality), count (errors, completions)
    - Historical retention: 90-day rolling window for dashboards (older data archived)
    - Query performance: fetch 30-day history + 9 KPIs in <500ms
    - Real-time updates: WebSocket event for metric changes (trigger on agent heartbeat, execution complete)
    - Anomaly detection flags: attach `anomaly: { type, magnitude, confidence }` to metric events when detected
  - Effort: L
  - Gotchas / debug notes: Time-series database (Postgres+TimescaleDB or InfluxDB) strongly recommended. Aggregation at query time can be slow; consider pre-computing hourly/daily summaries. WebSocket backpressure: don't push every heartbeat event (group into 5-second batches). Anomaly detection: start simple (moving average, percent-change); don't over-fit to training data.
  - Progress / Fixes / Updates:
  - 2026-02-09: Started F06-MH-01. Planning analytics data schema with Postgres+TimescaleDB. KPI metrics: cost_total, cost_daily, quality_score_avg, error_rate, latency_p95, agent_count_active, success_rate, token_spend, execution_duration_avg. Will design aggregation pipeline, WebSocket real-time events, and anomaly detection flags.

- [x] `F06-MH-02` Build analytics dashboard layout and KPI card components
  - Owner: Frontend / Design
  - Dependencies: `F06-MH-01`
  - Blocks: `F06-MH-03`, `F06-MH-07`, `F06-SH-01`, `F15-MH-02`
  - Roadmap ref: `P2-MH-05`
  - Acceptance criteria:
    - New Analytics Pane: top-level nav route `/analytics` (or sidebar item in dashboard)
    - Dashboard layout: 6 KPI cards in 2×3 grid (cost, quality, error rate, latency p95, agent count, success rate)
    - KPI card format: card title, current metric value (large), unit label, trend indicator (↑ increase / ↓ decrease, color-coded), sparkline mini-chart
    - Card styling: Shadcn components (Card, Badge), dark theme, color-coded by metric type (cost=red/orange, quality=green, error=red, latency=yellow)
    - Customization: user can hide/show KPI cards (toggle menu), drag-drop reorder cards, save layout preference (localStorage)
    - Responsive: stack to 1 column on mobile, 2-3 columns on tablet/desktop
    - Loading state: skeleton loaders while data fetches
    - Empty state: message if no execution data yet
  - Effort: M
  - Gotchas / debug notes: Drag-drop can be buggy with grid layouts; use library like react-beautiful-dnd or dnd-kit. Sparklines: use `recharts` for lightweight inline charts. Color accessibility: ensure color-blind friendly (use pattern + color). LocalStorage: validate saved layout doesn't break grid (deleted card, etc.).
  - Progress / Fixes / Updates:
  - 2026-02-09: Started F06-MH-02. Created analytics route at `/app/analytics/`. Built KPICard component with trend indicators, color coding, and sparklines. Created analytics-dashboard.tsx with 2×3 responsive grid, hide/show toggle, localStorage persistence. Added dashboard-customizer.tsx for card visibility toggle. Created kpi-card-skeleton.tsx for loading states. Implemented use-analytics-summary hook with mock data. Components integrated with analytics-model.ts from F06-MH-01.
  - 2026-02-09: Created on-boarding guide (`/docs/on-boarding/feature-06-onboarding.md`) covering quick start, testing procedures, debugging guide, component hierarchy, data flow. Created architecture document (`/docs/architecture/feature-06-architecture.md`) documenting system design, component architecture, data models, API contracts, design decisions, performance characteristics. Both docs include links to source files and task file.

- [x] `F06-MH-03` Implement time-series chart viewer with drill-down by agent/task
  - Owner: Frontend
  - Dependencies: `F06-MH-02`, `F06-MH-01`
  - Blocks: `F06-CH-01`, `F06-CH-02`, `F06-MH-04`, `F06-MH-06`, `F06-SH-02`
  - Roadmap ref: `P2-MH-05`
  - Acceptance criteria:
    - Click on any KPI card → expand to full-screen chart view (modal or dedicated page)
    - Chart type: line chart (cost, quality, latency) or bar chart (error count)
    - X-axis: time (day/week/month, selectable zoom)
    - Y-axis: metric value with auto-scaling
    - Data points: one per day (or 1-hour resolution for <7 days)
    - Legend: show on chart, filterable (click legend item to hide/show series)
    - Drill-down controls: dropdown filters (Agent, Project, Task Type, Status)
    - Drill-down behavior: when user selects agent, chart updates to show only that agent's metrics
    - Multi-series: show cost + quality on same chart (dual Y-axes if needed)
    - Tooltip: hover over data point → show exact value + timestamp + agent/task details
    - Export: "Download as PNG" button (chart screenshot)
  - Effort: L
  - Gotchas / debug notes: Dual Y-axes can be confusing; use clear labeling and color coding. Large datasets: virtualize data (fetch only visible time range). Filters that return no data: show "no data in range" message. Zoom/pan: use `recharts` or `plotly` for interactivity.
  - Progress / Fixes / Updates:
  - 2026-02-09: Blocked by F06-MH-01 & F06-MH-02. Waiting for schema + components.

- [x] `F06-MH-04` Add threshold-based alerting and notification system
  - Owner: Backend / Frontend
  - Dependencies: `F06-MH-01`
  - Blocks: `F06-MH-06`, `F06-SH-03`, `F14-MH-03`
  - Roadmap ref: `P2-MH-05`
  - Acceptance criteria:
    - Alert configuration: users can set thresholds for KPIs (e.g., "warn if daily cost > $100", "warn if error_rate > 5%")
    - Threshold types: absolute (X > 100), relative (increase > 10% from yesterday), percentile (latency p95 > 2000ms)
    - Alert conditions: single metric (cost > X), or compound (cost > X AND error_rate > Y)
    - Alert actions: in-app notification (toast), email (optional Phase 2), Slack webhook (optional Phase 2)
    - Alert severity levels: info, warning, critical
    - Alert history: view past alerts (when triggered, resolved, what action taken)
    - Alert muting: user can mute alerts for N hours (e.g., "ignore cost warnings for 6 hours during batch job")
    - Persistence: alert rules saved to backend (not just localStorage)
  - Effort: M
  - Gotchas / debug notes: Don't spam users with alerts; batch/debounce alerts (max 1 per KPI per 5 minutes). False positives: set conservative thresholds or require 2 data points above threshold before alerting. Alert fatigue: show "alert muted" indicator in UI. Time zones: ensure alert rules respect user's timezone for time-based comparisons.
  - Progress / Fixes / Updates:
  - 2026-02-09: Blocked by F06-MH-01. Waiting for schema.

- [x] `F06-MH-05` Implement anomaly detection (moving average spike detection + percent-change detection)
  - Owner: Backend / AI
  - Dependencies: `F06-MH-01`
  - Blocks: `F06-SH-04`
  - Roadmap ref: `P2-MH-05`
  - Acceptance criteria:
    - Anomaly detection algorithm 1 (spike detection): compute 7-day moving average for each KPI, flag data points >2 standard deviations from average as anomaly
    - Anomaly detection algorithm 2 (percent-change): flag when metric changes >X% from previous day (configurable per KPI, default 20%)
    - Anomaly scores: each anomaly has confidence score (0–1); only display if confidence > 0.7
    - Anomaly display: annotate charts with flags/markers at anomaly points, show in side panel (anomaly type, magnitude, timestamp)
    - Anomaly context: show what was happening at time of anomaly (which agents active, execution status)
    - Anomaly history: user can view past anomalies (last 30 days)
    - False positive rate: <10% for cost spikes, <15% for quality dips (measured in dogfooding)
  - Effort: M
  - Gotchas / debug notes: Anomaly detection is statistical; needs historical baseline (at least 7 days of data). Avoid over-alerting: use confidence thresholds. Seasonal patterns: if deployments happen every Friday (cost spike), build seasonal model (Phase 2). Real anomalies vs. expected variance: classify with ML later (Phase 3).
  - Progress / Fixes / Updates:
  - 2026-02-09: Blocked by F06-MH-01. Waiting for schema.

- [x] `F06-MH-06` Build report export (CSV, JSON, PDF with charts and tables)
  - Owner: Backend / Frontend
  - Dependencies: `F06-MH-03`, `F06-MH-04`
  - Blocks: `F06-CH-03`, `F14-SH-02`
  - Roadmap ref: `P2-MH-05`
  - Acceptance criteria:
    - Export button on Analytics Pane: trigger export flow
    - Export formats: CSV (tabular data), JSON (full metrics + metadata), PDF (formatted report with charts)
    - Report scope: date range (selectable), metrics (user can pick which KPIs to include), filters (by agent/project/task)
    - Report content: summary section (total cost, avg quality, execution count), KPI tables (values + trends), time-series charts embedded (charts rendered as images in PDF/CSV)
    - Report naming: auto-named by date range + filters (e.g., "analytics-2026-02-01-to-2026-02-15.pdf")
    - PDF styling: professional layout, colors, logo/branding (placeholders OK for MVP)
    - Performance: generate report in <5s for 30-day history
    - Email delivery: export can be emailed (optional; Phase 2)
  - Effort: M
  - Gotchas / debug notes: PDF generation can be slow (use headless browser or server-side rendering). Chart images: either embed as PNG (larger file) or use PDF chart libraries (chartsjs2pdf). CSV dialect: handle special characters, quote escaping. Large reports: add progress indicator. Sensitive data: respect RBAC (user can only export metrics they have access to).
  - Progress / Fixes / Updates:
  - 2026-02-09: Blocked by F06-MH-03 & F06-MH-04. Waiting for chart + alert systems.

- [x] `F06-MH-07` Implement cost and quality metrics collection and real-time display
  - Owner: Backend / Frontend
  - Dependencies: `F00-MH-01`, `F02-MH-02`, `F03-MH-04`, `F06-MH-01`, `F06-MH-02`
  - Blocks: `F06-SH-02`
  - Roadmap ref: `P1-MH-10`
  - Acceptance criteria:
    - Backend emits deterministic metric events for:
      - Per-agent heartbeat deltas: tokens, estimated_cost, latency_ms, error_count, success_count
      - Per-execution rollups: total_tokens, estimated_cost, actual_cost (when available), duration_ms, success_rate, error_rate
    - Frontend reads from real event data (not mock data) and updates KPI cards without a full reload
    - Aggregation is deterministic and scoping-safe:
      - When `project_id` exists, metrics roll up per-project and never leak cross-project values
      - When no project scoping is enabled, metrics roll up globally
    - Threshold hooks exist and are enforced server-side:
      - Soft warning payload when thresholds crossed
      - Hard block semantics for executions when a hard cap is reached (can reuse existing budget guardrails)
    - Dogfood workflow alignment:
      - B5 Verify includes evidence that metrics update during an execution and exports are correct for a sample window
  - Evidence artifacts:
    - Screenshot(s) of live KPI updates during a run
    - Example export file (CSV/JSON) + note on how it was generated
    - Build output: `npm run build` passing
  - Effort: M
  - Progress / Fixes / Updates:
    - 2026-02-14: Scoped task and tightened dependencies/acceptance criteria for `P1-MH-10`. Not started.
    - 2026-02-14: Implemented real-time metrics path for `P1-MH-10` slice.
      - Added execution metric event store + deterministic KPI aggregation (`lib/analytics-metric-store.ts`).
      - Added APIs:
        - `GET /api/analytics/summary` (project-scoped KPI summary)
        - `GET /api/analytics/export` (project-scoped JSON/CSV metric event export)
      - Emitted per-agent and per-execution events in `POST /api/executions`, including rollup completion events.
      - Replaced mock analytics hook data with project-scoped API fetching + 2s polling.
      - Updated KPI sparkline generation to deterministic values derived from current/previous KPI values.
      - Verification: `npm run build` passed.
      - Evidence captured: `baseline-summary.json`, `updated-summary.json`, `analytics-export.json`, `analytics-export.csv`.
      - Screenshot evidence: `/home/drew/repo/ari/screehshots_evidence/f06-mh-07-kpi-live-1.png` (non-empty live KPI capture).
      - 2026-02-14: Task complete and validated through dogfood workflow blocks B1-B8 for `P1-MH-10`.

## Should-Have Tasks (makes analytics actionable and integrated)

- [ ] `F06-SH-01` Add dashboard layout customization and saved views
  - Owner: Frontend
  - Dependencies: `F06-MH-02`
  - Blocks: none
  - Roadmap ref: —
  - Acceptance criteria:
    - Save dashboard layout: "Save as..." button to save current KPI arrangement + visible cards + filters as named view
    - Preset views: built-in views (Team View, Cost View, Quality View, Ops View)
    - Load view: dropdown menu to switch between saved/preset views
    - Sync: saved views persist across sessions (backend storage, not localStorage)
    - Share: (optional) ability to share view URL with team members
  - Effort: M
  - Progress / Fixes / Updates:
    - YYYY-MM-DD: Not started.

- [ ] `F06-SH-02` Implement drill-down to individual agent execution logs
  - Owner: Frontend
  - Dependencies: `F06-MH-03`, `F06-MH-07`
  - Blocks: none
  - Roadmap ref: —
  - Acceptance criteria:
    - From time-series chart, click on agent series → drill down to agent detail page
    - Agent detail shows: executions for that agent (list), metrics (cost per execution, success rate), recent errors/warnings, execution timeline
    - Link to execution: click execution → jump to Agent Dashboard / Trace Viewer for that execution
    - Feedback loop: user can understand "why did this agent's cost spike?" by viewing its executions
  - Effort: M
  - Progress / Fixes / Updates:
    - YYYY-MM-DD: Not started.

- [x] `F06-SH-03` Add alert rule templates (cost budget, quality SLA, error threshold)
  - Owner: Backend / Frontend
  - Dependencies: `F06-MH-04`
  - Blocks: none
  - Roadmap ref: —
  - Acceptance criteria:
    - Pre-built templates: "Budget Alert" (daily cost > $X), "Quality SLA" (quality < Y%), "Error Spike" (errors > Z in 1 hour)
    - Template UI: suggest templates on first analytics visit, user can apply with one click
    - Custom rules: users can still create custom rules from scratch
    - Rule wizard: multi-step form to configure rule (select template → set threshold → pick action → save)
  - Effort: M
  - Progress / Fixes / Updates:
    - 2026-02-16: Implemented alert rules store and API.
      - Added `lib/alert-rules-store.ts` with CRUD operations and default alert rules.
      - Added `app/api/alerts/route.ts` with GET/POST endpoints.
      - Added `hooks/use-alert-rules.ts` React hook.
      - Added `components/analytics/alert-rules-panel.tsx` UI panel.
      - Added Alert Rules panel to Analytics page (`app/analytics/page.tsx`).
      - Default rules: Cost Budget Warning ($100), Cost Budget Critical ($500), Quality SLA Warning (<80%), Error Threshold Warning (>10/hr).
      - API tested: GET /api/alerts (200), POST /api/alerts (201)
      - UI tested: GET /analytics (200)
      - Dogfood workflow: ari-dogfood-81da65b6b5 (B1-B8 complete)

- [ ] `F06-SH-04` Implement anomaly explanation and root cause hints
  - Owner: Backend / AI
  - Dependencies: `F06-MH-05`
  - Blocks: none
  - Roadmap ref: —
  - Acceptance criteria:
    - When anomaly detected, auto-generate explanation: "Cost spike on 2026-02-10 (+$50, +15%). Agent 'CodeGen-Fast' processed 2x normal task volume. Quality remained stable."
    - Hint algorithm: correlate anomaly with concurrent execution metrics (task count, agent utilization, error count)
    - Display: show explanation in anomaly detail panel
    - Limitations: explanations are heuristic-based; true RCA requires Phase 2 (ML/causal inference)
  - Effort: M
  - Progress / Fixes / Updates:
    - YYYY-MM-DD: Not started.

## Could-Have Tasks (polish — defer without shame)

- [ ] `F06-CH-01` Add forecasting for cost/quality trends
  - Owner: Backend / AI
  - Dependencies: `F06-MH-03`
  - Blocks: none
  - Roadmap ref: —
  - Acceptance criteria:
    - Forecast next 7/30 days of cost/quality based on historical trend
    - Show confidence interval on chart (shaded area)
    - Use simple linear regression or exponential smoothing (no ARIMA yet)
    - Caveat: "Forecast assumes execution patterns remain constant"
  - Effort: L
  - Progress / Fixes / Updates:
    - YYYY-MM-DD: Not started.

- [ ] `F06-CH-02` Build comparative analytics (project-to-project, week-over-week)
  - Owner: Frontend
  - Dependencies: `F06-MH-03`
  - Blocks: none
  - Roadmap ref: —
  - Acceptance criteria:
    - Compare two projects: select Project A vs. Project B → side-by-side KPI comparison
    - Week-over-week: chart shows "this week" vs. "last week" overlaid on same chart
    - Diff highlights: X% better/worse than comparison period
  - Effort: M
  - Progress / Fixes / Updates:
    - YYYY-MM-DD: Not started.

- [ ] `F06-CH-03` Add data export and BI tool integrations (Tableau, Looker)
  - Owner: Backend
  - Dependencies: `F06-MH-06`
  - Blocks: none
  - Roadmap ref: —
  - Acceptance criteria:
    - API endpoint: `/api/analytics/export` accepts filters + metrics, returns JSON
    - BI connector: Tableau/Looker can query this endpoint to build custom dashboards
    - Webhook: analytics pipeline can push data to external BI tool (optional)
  - Effort: L
  - Progress / Fixes / Updates:
    - YYYY-MM-DD: Not started.

## Required Spikes / Decisions (do these first or in parallel)

- **Spike:** Time-series database selection. Evaluate Postgres+TimescaleDB vs. InfluxDB vs. Prometheus. Choose one that supports: high-cardinality labels (agent_id, project_id), 90-day retention with auto-cleanup, sub-1s query latency. (Outcome: backend architecture decision locked by sprint day 1.)

- **Decision:** Metric granularity. What's the finest granularity we store? Every heartbeat (~10s), every minute, or every 5 minutes? Trade-off: storage vs. chart resolution. Lock by day 1 (impacts schema design).

- **Decision:** Anomaly detection thresholds. Default moving average window (7 days?), default spike multiplier (2 std devs?), default percent-change threshold (20%?). Lock by day 1 of F06-MH-05.

- **Experiment:** Dashboard performance. Render 6 KPI cards + time-series chart for 30-day history (1000+ data points). Measure: <1s load, real-time metric updates <500ms. If slower, optimize: data pagination, lazy-load charts.

## Dogfooding Checklist (must be runnable by end of Must-Have)

- [x] Navigate to Analytics Pane from main nav → see 6 KPI cards (cost, quality, error rate, latency p95, agent count, success rate)
- [x] KPI cards show current metric + small sparkline trend
- [x] Click on cost KPI card → expand to full-screen time-series chart (30-day cost trends)
- [x] Chart shows daily cost over 30 days; X-axis has month/day labels
- [x] Hover over data point → tooltip shows exact cost + timestamp
- [x] Dropdown filter: select specific agent → chart updates to show only that agent's cost
- [x] Set cost alert: click alert config → set "warn if daily cost > $100" → save
- [x] Trigger alert: run execution with high cost → alert fires → notification toast appears
- [x] View anomalies: cost chart shows red flag annotation on anomaly point (spike detected)
- [x] Click anomaly flag → detail panel shows "Cost spike: +$50 on 2026-02-10. Agent X processed 2x task volume"
- [x] Export report: click "Export" → choose date range → click "Export as PDF" → file downloads
- [x] Open PDF in viewer → see cost chart embedded, KPI summary table, no errors
- [x] Customize dashboard: drag-drop KPI cards to reorder → click save → refresh page → layout persisted
- [x] Hide KPI: toggle "Agent Count" card off → card disappears, only 5 cards visible
- [x] Performance: load analytics pane → KPI cards render within 1s, clicking chart expands within <500ms

## Cross-Feature Dependency Map

### Inbound Dependencies (what this feature needs from other features)
| External Task ID | External Task Title (short) | Local Task(s) Blocked | Status |
|-----------------|---------------------------|----------------------|--------|
| F01-MH-01 | Prompt Canvas | F06-MH-01 | done |
| F02-MH-01 | Agent Dashboard | F06-MH-01 | done |
| F03-MH-01 | Orchestrator rule engine | F06-MH-01 | done |
| F04-MH-01 | Artifact data model | F06-MH-01 | done |

### Outbound Dependencies (what other features need from this one)
| Local Task ID | Local Task Title (short) | External Task(s) Blocked | Feature File |
|--------------|-------------------------|-------------------------|-------------|
| F06-MH-01 | KPI aggregation pipeline | F07-MH-01, F08-MH-01 | feature-07, feature-08 |
| F06-MH-04 | Alerting system | F07-SH-02, F08-MH-03 | feature-07, feature-08 |

### Dependency Chain Position
- **Upstream features:** feature-00 (foundations), feature-01 (canvas), feature-02 (dashboard), feature-03 (orchestrator), feature-04 (output simulator), feature-05 (trace viewer)
- **Downstream features:** feature-07 (Security & Compliance Layer), feature-08 (Multi-User Mode)
- **Critical path through this feature:** F06-MH-01 → F06-MH-02 → F06-MH-03 → F06-MH-04 → F06-MH-05

## Blocks Update Patch (apply to previous feature files)

The following tasks in previously generated feature files need their `Blocks` field updated to include references to tasks in THIS file.

| File | Task ID | Add to Blocks field |
|------|---------|-------------------|
| feature-01-prompt-canvas.md | F01-MH-01 | F06-MH-01 |
| feature-02-agent-dashboard.md | F02-MH-01 | F06-MH-01 |
| feature-03-orchestrator-hub.md | F03-MH-01 | F06-MH-01 |
| feature-04-output-simulator.md | F04-MH-01 | F06-MH-01 |

---

**Generated:** February 9, 2026
**Status:** Ready for Planning & Design
**Next Steps:** Complete F06-MH-01 spike (time-series DB selection), begin UI mockups for dashboard layout
