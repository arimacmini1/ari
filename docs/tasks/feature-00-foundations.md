# Feature 00 â€“ Foundations & Agent Runtime
**Priority:** 00 (highest)
**Target completion:** weeks 1â€“3
**Why this feature now:** Every agent, every dashboard update, every cost tracking, and every trace depends on the heartbeat protocol, WebSocket transport, and trace schema we build here. Without this, all downstream features are DOA. This is the skeleton AEI runs on.

## Definition of Done
By end of week 3, a real agent (mock or real) can connect to AEI, send standardized heartbeats with telemetry (status, CPU, memory, tokens-per-minute, cost), and the backend can ingest 100+ concurrent agents with <500ms p99 latency. The dashboard can subscribe to live agent state changes via WebSocket with <100ms latency. Structured traces capture reasoning decisions with confidence scores and alternatives. Every action (execute, assign, override, pause) is immutably logged to Postgres. This is the closed loop: agent acts â†’ AEI observes â†’ audit trail grows â†’ no secrets.

## Must-Have Tasks (vertical slice â€” get the loop working)

- [x] `F00-MH-01` Design and implement agent heartbeat protocol and telemetry schema
  - Owner: Backend / AI
  - Dependencies: `none`
  - Blocks: `F00-CH-01`, `F00-CH-03`, `F00-MH-02`, `F00-MH-05`, `F00-MH-06`, `F00-SH-01`, `F01-MH-06`, `F02-MH-02`, `F02-MH-04`, `F02-MH-05`, `F02-SH-02`, `F03-MH-01`, `F06-MH-07`
  - Roadmap ref: `P1-MH-01`
  - Acceptance criteria:
    - Agents can register with AEI server via HTTP POST with standardized heartbeat payload (agent_id, status, metrics, parent/child relationships, timestamp)
    - Heartbeat endpoint handles 100+ concurrent POST requests at <500ms p99 latency (load test with k6 or similar)
    - Telemetry schema captures: status enum (idle/processing/waiting/error/complete), CPU usage %, memory usage %, tokens-per-minute, cumulative cost ($), confidence score (0â€“100%), parent_agent_id, child_agent_ids
    - Schema versioned and documented in OpenAPI spec
    - Heartbeat payloads stored in Postgres for historical playback
  - Effort: M
  - Gotchas / debug notes: Early load testing will reveal timeout and connection pool exhaustion issues; use pgbouncer or equivalent. Heartbeat timestamp skew across agents will cause confusing traces â€” enforce server-side timestamp override. Don't store full heartbeat history forever (will explode storage); implement 7-day rolling window with daily rollups.
  - Progress / Fixes / Updates:
    - 2026-02-08: Task initialized. Ready for implementation.

- [x] `F00-MH-02` Implement real-time WebSocket transport and agent state subscription model
  - Owner: Backend / Infra
  - Dependencies: `F00-MH-01`
  - Blocks: `F00-MH-06`, `F01-MH-06`, `F02-MH-02`, `F02-MH-05`, `F03-MH-04`, `F08-MH-01`
  - Roadmap ref: `P1-MH-02`
  - Acceptance criteria:
    - WebSocket server (e.g., ws://, not wss yet for MVP) listens on dedicated port (e.g., 8080) and accepts client subscriptions
    - Clients can subscribe to agent state updates with pattern: `subscribe:agent:{agent_id}` or `subscribe:agents:all`
    - Server broadcasts agent state delta (only changed fields) to all subscribed clients on each heartbeat receipt
    - Handles 50+ concurrent WebSocket connections with memory stable (no leaks after 1 hour, 10k updates/sec throughput)
    - Graceful reconnect logic: client can resume with last-seen-sequence-id, server buffers 100 missed updates
    - Dashboard receives updates with measured latency <100ms (p99) from heartbeat ingestion to WebSocket push
  - Effort: M
  - Gotchas / debug notes: WebSocket backpressure is silent killer â€” if client slow, server will OOM. Use async message queues (e.g., Node.js streams, Python asyncio queues) not synchronous broadcast. Test reconnect storms (client rapid connect/disconnect). Browser DevTools WebSocket inspector will be your friend here.
  - Progress / Fixes / Updates:
    - 2026-02-08: Task initialized. Blocked by F00-MH-01.

- [x] `F00-MH-03` Design and implement trace data model for agent reasoning decisions
  - Owner: Backend / AI
  - Dependencies: `none`
  - Blocks: `F00-MH-05`, `F00-SH-02`, `F00.5-MH-05`, `F05-MH-01`, `F05-MH-02`, `F05-MH-04`, `F13-MH-01`
  - Roadmap ref: `P1-MH-08`
  - Acceptance criteria:
    - Structured trace schema captures per-decision-point: decision_id, execution_id, timestamp, reasoning_context (plain text or structured JSON), confidence_score (0â€“100%), alternatives_considered (list of alt options + why rejected), selected_outcome (chosen action), parent_decision_id (trace tree structure)
    - Agents can emit trace events during execution (even mock agents for MVP) via `POST /api/traces` endpoint
    - Traces stored in Postgres, indexed by execution_id and agent_id for fast retrieval
    - Trace viewer can load and render 1,000+ decision nodes per execution without browser lag (must load async, paginate or virtualize)
    - Export trace as JSON or Markdown for external analysis (Slack paste, email, GitHub issue)
    - Trace retention: 30 days (configurable)
  - Effort: M
  - Gotchas / debug notes: Tracing is a logging hammer â€” agents will emit 100+ traces per execution. Don't inline all of them in memory; stream to disk, then parse on demand. Confidence score aggregation (how confident is the overall execution?) is a Phase 2 question â€” don't try to compute it yet. Mock traces for MVP must look realistic (include actual GPT-style reasoning text) so dogfooders don't skip them.
  - Progress / Fixes / Updates:
    - 2026-02-08: Task initialized. Ready for schema design.

- [x] `F00-MH-04` Set up foundational audit logging infrastructure with immutable logs
  - Owner: Backend / Infra
  - Dependencies: `none`
  - Blocks: `F00-MH-05`, `F00-MH-07`
  - Roadmap ref: `P1-MH-07`
  - Acceptance criteria:
    - Every significant action (execute, assign, override, pause, terminate, reassign) appended to `audit_logs` table with: timestamp (server time), actor_id (user UUID or service principal), action_type (enum), resource_id (what was affected), context (JSON blob of before/after state or reasoning), immutable_hash (blake3(timestamp + actor_id + action_type + resource_id + context))
    - Logs written to Postgres with transaction guarantees (no audit gaps)
    - Audit log viewer UI (basic React table, no frills) shows filtered timeline: searchable by actor, action_type, time range (date picker)
    - Immutable hash verified on read (detect tampering via hash mismatch in test harness)
    - RBAC enforcement: users cannot view audit logs for agents outside their team (via Postgres row-level security or app-level check)
    - Zero audit gaps: every Phase 1 critical action (agent execution, override, pause) is logged before the action executes (transactional atomicity)
  - Effort: M
  - Gotchas / debug notes: RBAC filtering at query time will kill performance on large audit tables. Index on (actor_id, timestamp) and (resource_id, timestamp) early. Don't try to cryptographically seal audit logs yet (no blockchain, no Merkle trees) â€” immutable hash + table-level integrity (no delete permissions) is enough for MVP. Audit log writes are on the critical path: batch writes or use async queue to avoid blocking agent heartbeat ingestion.
  - Progress / Fixes / Updates:
    - 2026-02-08: Task initialized. Spike needed on Postgres schema design.

- [x] `F00-MH-05` Create agent SDK / protocol spec document and reference implementation
  - Owner: Backend / AI
  - Dependencies: `F00-MH-01`, `F00-MH-03`, `F00-MH-04`
  - Blocks: `F00-SH-03`, `F00-SH-04`, `F01-SH-01`, `F02-MH-03`, `F03-MH-01`, `F03-MH-03`
  - Roadmap ref: `P1-MH-08` (partial)
  - Acceptance criteria:
    - OpenAPI/AsyncAPI spec document published in `/docs/api/` with clear examples for heartbeat, trace, and subscription endpoints
    - Reference implementation in Python (or Node.js) showing a simple mock agent that: registers via heartbeat, emits traces, responds to pause/resume commands
    - Spec includes auth (bearer token for now), error handling (retry backoff, exponential backoff for 5xx), and versioning strategy
    - README with 5-minute quickstart: "Run mock agent, see it in dashboard"
  - Effort: M
  - Gotchas / debug notes: SDK documentation is where all downstream teams (agents, orchestrators, integrations) will live. Over-document the error cases and backoff logic; under-document the happy path. Don't lock in APIs yet â€” version everything as v0 and expect breaking changes in weeks 3â€“4.
  - Progress / Fixes / Updates:
    - 2026-02-08: Task initialized. Blocked by F00-MH-01, F00-MH-03, F00-MH-04.

- [x] `F00-MH-06` Build minimal Web Dashboard skeleton with real-time agent list view
  - Owner: Frontend
  - Dependencies: `F00-MH-01`, `F00-MH-02`
  - Blocks: `F00-CH-02`, `F00-SH-02`, `F00.5-MH-01`, `F00.5-MH-05`, `F02-MH-01`
  - Roadmap ref: `P1-MH-03`
  - Acceptance criteria:
    - Single-page React app (no routing yet, just one view) that connects to WebSocket server on app load
    - Displays list of all active agents as a simple HTML table: agent_id, status, CPU %, memory %, cost ($), last heartbeat timestamp
    - Table updates in real-time as heartbeats arrive (row background color change or subtle highlight on update)
    - Shows "connected" vs "disconnected" indicator for WebSocket health
    - No styling beyond readability (we're not designers); dark theme OK if it helps with eye strain
    - Performance verified: 100+ agents on screen, <100ms latency per update, <5% CPU usage (browser)
  - Effort: L
  - Gotchas / debug notes: Real-time table rendering with React is deceptively hard. Use a list component library (e.g., react-window, virtualizer) if table will have 100+ rows or re-renders will lag. Don't update the whole table on each WebSocket message; update only the changed rows (use keys). Browser DevTools Performance tab is essential for debugging jank.
  - Progress / Fixes / Updates:
    - 2026-02-08: Task initialized. Blocked by F00-MH-01, F00-MH-02.

- [x] `F00-MH-07` Establish auth skeleton and bearer token validation
  - Owner: Backend / Infra
  - Dependencies: `F00-MH-04`
  - Blocks: `F02-MH-03`, `F08-MH-01`, `F08-SH-01`, `F09-MH-01`, `F09-MH-03`, `F10-MH-01`, `F14-MH-01`, `none` (internal)`
  - Roadmap ref: `P1-SH-04`
  - Acceptance criteria:
    - Backend middleware validates `Authorization: Bearer <token>` on all endpoints
    - For MVP, token is a static string (e.g., "dev-token-xyz") or env var; no OAuth yet
    - Rejected requests return 401 with clear error message
    - Agent heartbeats require valid token
    - WebSocket connections require token in query param or header (decide: `ws://host/ws?token=xyz` vs header)
    - Auth skeleton documented for Phase 2 OAuth swap
  - Effort: S
  - Gotchas / debug notes: Sharing one static token across all agents is a security smell; Phase 2 will issue per-agent tokens. For now, guard the token in .env and rotate it in CI/CD. WebSocket token passing in query param is simpler than custom headers for initial browser support.
  - Progress / Fixes / Updates:
    - 2026-02-08: Task initialized. Blocked by F00-MH-04.

## Should-Have Tasks (makes it dogfood-able and lovable)

- [ ] `F00-SH-01` Implement graceful agent heartbeat timeout and health status
  - Owner: Backend
  - Dependencies: `F00-MH-01`
  - Blocks: `none`
  - Roadmap ref: â€”
  - Acceptance criteria:
    - If agent doesn't send heartbeat for 30 seconds, mark as "stale" (status = unknown/offline)
    - If agent doesn't send for 2 minutes, mark as "dead" and emit warning event
    - Dashboard displays stale/dead indicators (red dot, "offline" label)
    - Resets to "online" when heartbeat resumes
  - Effort: S
  - Progress / Fixes / Updates:
    - 2026-02-08: Task initialized. Blocked by F00-MH-01.

- [ ] `F00-SH-02` Build trace viewer UI mockup (not interactive yet, static view)
  - Owner: Frontend
  - Dependencies: `F00-MH-03`, `F00-MH-06`
  - Blocks: `none`
  - Roadmap ref: â€”
  - Acceptance criteria:
    - Separate route/modal (e.g., `/traces/<execution_id>`) shows a single execution's trace tree
    - Tree view of decisions (collapsible, indented by parent-child relationship)
    - Each decision shows: reasoning_context (first 200 chars), confidence_score, timestamp
    - Click decision to expand and see full context + alternatives
    - "Export JSON" button works
  - Effort: M
  - Progress / Fixes / Updates:
    - 2026-02-08: Task initialized. Blocked by F00-MH-03, F00-MH-06.

- [ ] `F00-SH-03` Create sample mock agents (3â€“5 agents for manual testing)
  - Owner: AI / Backend
  - Dependencies: `F00-MH-05`
  - Blocks: `none`
  - Roadmap ref: â€”
  - Acceptance criteria:
    - Mock agents in `/scripts/mock-agents/` (Python or Node.js) that connect to dev AEI server
    - Each mock agent: sends heartbeats every 5 seconds, emits 10â€“20 fake traces per "execution", simulates varying CPU/memory/cost
    - Can start/stop mock agents easily (`python scripts/mock-agents/agent1.py --server localhost:3000`)
    - Used for load testing and manual QA
  - Effort: M
  - Progress / Fixes / Updates:
    - 2026-02-08: Task initialized. Blocked by F00-MH-05.

- [ ] `F00-SH-04` Document heartbeat and trace payload examples in `/docs/api/`
  - Owner: Backend / Documentation
  - Dependencies: `F00-MH-05`
  - Blocks: `none`
  - Roadmap ref: â€”
  - Acceptance criteria:
    - `/docs/api/heartbeat-examples.md` with 5+ real JSON examples (idle agent, busy agent, agent with error, parent/child, cost rollup)
    - `/docs/api/trace-examples.md` with 3+ realistic trace examples (LLM decision, tool selection, refinement loop)
    - Copy-paste ready for integration testing
  - Effort: S
  - Progress / Fixes / Updates:
    - 2026-02-08: Task initialized. Blocked by F00-MH-05.

## Could-Have Tasks (polish â€” defer without shame)

- [ ] `F00-CH-01` Add metrics export for Prometheus scrape endpoint
  - Owner: Backend / Infra
  - Dependencies: `F00-MH-01`
  - Blocks: `F00-CH-02`
  - Roadmap ref: â€”
  - Acceptance criteria:
    - Metrics exposed on `GET /metrics` in Prometheus format
    - Key metrics: agent_heartbeats_total, agent_status_gauge, heartbeat_latency_histogram, trace_events_total, audit_log_entries_total
  - Effort: S
  - Progress / Fixes / Updates:
    - 2026-02-08: Task initialized. Blocked by F00-MH-01.

- [ ] `F00-CH-02` Build debug dashboard for AEI developers (internal tool)
  - Owner: Frontend
  - Dependencies: `F00-MH-06`, `F00-CH-01`
  - Blocks: `none`
  - Roadmap ref: â€”
  - Acceptance criteria:
    - Admin-only view (`/debug/health`) showing: WebSocket connection count, Postgres query latency, recent errors, audit log sample
    - Used by AEI team to debug issues during dogfooding
  - Effort: S
  - Progress / Fixes / Updates:
    - 2026-02-08: Task initialized. Blocked by F00-MH-06, F00-CH-01.

- [ ] `F00-CH-03` Implement cost proxy and token counter (estimate only, not real)
  - Owner: Backend / AI
  - Dependencies: `F00-MH-01`
  - Blocks: `none`
  - Roadmap ref: â€”
  - Acceptance criteria:
    - Backend maintains a rolling sum of agent costs (sum all `cost` fields from heartbeats)
    - Dashboard shows global cost counter (updates in real-time)
    - Cost is estimated/mocked for MVP (hardcoded multiplier on tokens, not real API)
  - Effort: S
  - Progress / Fixes / Updates:
    - 2026-02-08: Task initialized. Blocked by F00-MH-01.

## Required Spikes / Decisions (do these first or in parallel)

- **Spike:** Load test WebSocket server with k6 or similar. Target: 50+ concurrent connections, 10k updates/sec throughput, measure latency distribution.

- **Spike:** Database schema design. Finalize Postgres tables: `agents`, `heartbeats`, `traces`, `audit_logs`, `users`, `teams`. Create initial migrations.

- **Decision:** Bearer token strategy for MVP. Static env var or per-agent tokens? Decide by end of day 3 of week 1. (Recommend: static env var, document as placeholder for Phase 2 OAuth.)

- **Decision:** Final trace schema. Must be extensible for Phase 2 (alternative selection algos, confidence aggregation, etc.). Lock schema by end of week 1.

- **Decision:** WebSocket message format (raw JSON delta vs. full state). Recommend delta to reduce bandwidth. Lock by end of week 1.

- **Experiment:** Prototype agent SDK in Python. Build a simple mock agent that sends heartbeats and traces. Run it against dev server locally. Measure end-to-end latency and identify pain points. (Outcome: inform SDK design.)

## Dogfooding Checklist (must be runnable by end of Must-Have)

- [x] Start 5 mock agents locally (e.g., `python scripts/mock-agents/agent*.py`), each with unique agent_id
- [x] Open AEI dashboard in browser (`http://localhost:3000`), see all 5 agents in real-time table
- [x] Trigger a mock execution on one agent (e.g., `curl -X POST http://localhost:3000/api/agents/{agent_id}/execute` with a test prompt)
- [x] Observe trace tree populate in `/traces/<execution_id>` route (tree view with 20+ decision nodes visible, expandable)
- [x] Verify audit log shows every action: agent execution, trace emission, status changes (search by agent_id, filter by timestamp)
- [x] Observe cost counter increment in real-time as agents "consume" tokens
- [x] Simulate network failure: kill one mock agent mid-execution, see status change to "dead" in dashboard, verify trace captures the failure context
- [x] Load test: start 50 mock agents, measure WebSocket latency and dashboard FPS (must stay >30 FPS, latency <100ms p99)
- [x] Export a trace as JSON, paste into test GitHub issue, see it renders cleanly
- [x] Verify RBAC blocks access to audit logs for agents outside my team (if multi-team setup available)

## Cross-Feature Dependency Map

### Inbound Dependencies (what this feature needs from other features)
| External Task ID | External Task Title (short) | Local Task(s) Blocked | Status |
|-----------------|---------------------------|----------------------|--------|
| (none â€” feature-00 is the foundation) | â€” | â€” | â€” |

### Outbound Dependencies (what other features need from this one)
| Local Task ID | Local Task Title (short) | External Task(s) Blocked | Feature File |
|--------------|-------------------------|-------------------------|-------------|
| F00-MH-01 | Heartbeat protocol | F01-MH-*, F02-MH-*, F03-MH-* | feature-01, feature-02, feature-03 |
| F00-MH-02 | WebSocket transport | F01-MH-*, F02-MH-* | feature-01, feature-02 |
| F00-MH-03 | Trace data model | F05-MH-* | feature-05 |
| F00-MH-04 | Audit logging | F08-MH-* | feature-08 |
| F00-MH-05 | Agent SDK spec | F01-MH-*, F03-MH-* | feature-01, feature-03 |
| F00-MH-06 | Dashboard skeleton | F02-MH-* | feature-02 |
| F00-MH-07 | Auth skeleton | F08-MH-*, F09-MH-* | feature-08, feature-09 |

### Dependency Chain Position
- **Upstream features:** none (this IS the foundation)
- **Downstream features:** feature-01 through feature-11 (all depend on this)
- **Critical path through this feature:** F00-MH-01 â†’ F00-MH-02 â†’ F00-MH-06 â†’ (hands off to feature-02)
