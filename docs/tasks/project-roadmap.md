# AEI Project Roadmap – Must-Have Tasks

**Generated from:** Master AEI PRD (v2.1)
**Date:** February 10, 2026
**Status:** Ready for Engineering

> See also: [project-roadmap-should-haves.md](./project-roadmap-should-haves.md) and [project-roadmap-could-haves.md](./project-roadmap-could-haves.md)

---

## Phase 1 – Agent Mission Control MVP (Target: weeks 1–8)

### Must-Have Tier (blocker for any meaningful demo / internal dogfooding)

- [ ] `P1-MH-01` Design & implement agent heartbeat protocol and telemetry schema
  - Owner hint: Backend / AI
  - Dependencies: `none`
  - Blocks: `P1-MH-02`, `P1-MH-05`, `P1-MH-06`, `P1-MH-10`
  - Feature refs: `F00-MH-01`
  - Acceptance criteria:
    - Agents can register with AEI server with standardized heartbeat payload (status, metrics, parent/child relationships)
    - Heartbeat ingestion works at 100+ concurrent agents with <500ms p99 latency
    - Telemetry schema supports: status (idle/processing/waiting/error/complete), CPU, memory, tokens-per-minute, cost, confidence scores
  - Est. effort: M

- [ ] `P1-MH-02` Implement real-time WebSocket transport and agent state subscription model
  - Owner hint: Backend / Infra
  - Dependencies: `P1-MH-01`
  - Blocks: `P1-MH-03`, `P1-MH-06`
  - Feature refs: `F00-MH-02`
  - Acceptance criteria:
    - WebSocket server handles 50+ concurrent connections (test with mock agents)
    - Dashboard can subscribe to agent updates and receive <100ms latency updates
    - Backpressure handling prevents memory leaks with high-frequency telemetry
    - Connection recovery on network interruption
  - Est. effort: M

- [ ] `P1-MH-03` Build core Agent Dashboard UI with live agent tree and status visualization
  - Owner hint: Frontend / Design
  - Dependencies: `P1-MH-01`, `P1-MH-02`
  - Blocks: `P1-MH-12`, `P1-SH-02`
  - Feature refs: `F00-MH-06`
  - Acceptance criteria:
    - Hierarchical tree view shows Orchestrators at top, agents grouped by type/project
    - Status badges (idle, processing, waiting, error, complete) update in real-time
    - Sparklines render CPU/memory/tokens/cost metrics for each agent
    - Can handle 100+ visible agents with <500ms dashboard render latency
    - Right-click context menu available (reassign, pause, terminate, inspect logs placeholders OK for MVP)
  - Est. effort: L

- [ ] `P1-MH-04` Create Prompt Canvas basic scaffold with drag-drop block composition
  - Owner hint: Frontend / Design
  - Dependencies: `none`
  - Blocks: `P1-MH-05`, `P1-MH-06`, `P1-MH-12`, `P1-MH-13`
  - Feature refs: `TBD (F01)`
  - Acceptance criteria:
    - Canvas accepts text input, draggable blocks (task, decision, loop, parallel), and connection lines
    - Support simple chat fallback that auto-converts to a visual canvas flow
    - Parse canvas state to JSON representing instruction graph (nodes, edges, metadata)
    - Support undo/redo for canvas edits
    - Visual feedback for valid/invalid connections
    - Export canvas as structured prompt JSON (preview mode, no execution yet)
  - Est. effort: L

- [ ] `P1-MH-05` Implement basic Orchestrator rule engine and task decomposition
  - Owner hint: Backend / AI
  - Dependencies: `P1-MH-01`, `P1-MH-04`
  - Blocks: `P1-MH-06`, `P1-MH-11`, `P1-MH-13`
  - Feature refs: `TBD (F04)`
  - Acceptance criteria:
    - Orchestrator can ingest canvas JSON and simple rule definitions (priority, dependencies, agent type affinity)
    - Decompose high-level goal into atomic sub-tasks with dependency graph
    - Route sub-tasks to appropriate agent types based on task semantics and agent capabilities
    - Return task assignment plan (no execution yet, preview only)
    - Handle edge cases: circular dependencies, resource constraints, unknown agent types
  - Est. effort: L

- [ ] `P1-MH-06` Build end-to-end mock execution pipeline: canvas → orchestrator → agent mock → artifact
  - Owner hint: Backend / AI
  - Dependencies: `P1-MH-02`, `P1-MH-05`
  - Blocks: `P1-MH-08`, `P1-MH-09`, `P1-MH-10`, `P1-SH-05`, `P1-MH-14`, `P1-MH-15`
  - Feature refs: `TBD`
  - Acceptance criteria:
    - User draws prompt canvas, triggers "execute" (orchestrator decomposes, assigns tasks)
    - Mock agents receive assignments and simulate work (incremental progress updates via heartbeat)
    - After ~30s of simulated work, produce preview artifacts (mockup HTML, JSON schema stubs, code snippets)
    - Dashboard shows live agent activity, completion status, preview output
    - Full flow completes in <15 min wall-clock time for small app
  - Est. effort: XL

- [ ] `P1-MH-07` Set up foundational audit logging infrastructure with immutable logs
  - Owner hint: Backend / Infra
  - Dependencies: `none`
  - Blocks: `P1-SH-04`
  - Feature refs: `F00-MH-04`
  - Acceptance criteria:
    - Every significant action (execute, assign, override, pause) appended to audit log with timestamp, actor, action type, context
    - Logs written to Postgres with unique, cryptographically hashable records
    - Audit log viewer UI shows filtered timeline (searchable by actor, action, time range)
    - Zero audit gaps for Phase 1 critical actions
    - RBAC enforcement prevents unauthorized access to audit logs
  - Est. effort: M

- [ ] `P1-MH-08` Design and implement trace data model for agent reasoning decisions
  - Owner hint: Backend / AI
  - Dependencies: `P1-MH-06`
  - Blocks: `P1-MH-09`
  - Feature refs: `F00-MH-03`, `F00-MH-05`
  - Acceptance criteria:
    - Structured trace format captures: decision point, reasoning context, confidence score, alternatives considered, selected outcome
    - Agents emit trace events during mock execution (can simulate for MVP)
    - Traces stored and retrievable by execution ID
    - Support for 1,000+ decision nodes per execution without performance degradation
    - Export trace as JSON for external analysis
  - Est. effort: M

- [ ] `P1-MH-09` Build trace visualization UI with collapsible decision tree and alternative path forking
  - Owner hint: Frontend
  - Dependencies: `P1-MH-08`, `P1-MH-06`
  - Blocks: `P1-MH-11`, `P2-MH-01`
  - Feature refs: `F00-SH-02`
  - Acceptance criteria:
    - Execution detail view shows decision tree/DAG for completed tasks
    - Nodes display reasoning, confidence, alternative paths (collapsed initially)
    - Expand/collapse and filter by confidence threshold
    - Timeline scrubber allows rewinding to historical decision points
    - Fork alternative path and re-execute delta (backend support required but can stub for MVP)
    - Render traces with 1,000+ nodes in <2s
  - Est. effort: L

- [ ] `P1-MH-10` Implement cost and quality metrics collection and real-time display
  - Owner hint: Backend / Frontend
  - Dependencies: `P1-MH-01`, `P1-MH-07`
  - Blocks: `P2-MH-05`
  - Feature refs: `F00-CH-03`
  - Acceptance criteria:
    - Track metrics per agent: tokens used, estimated $ spent, success rate, error count
    - Aggregate metrics per project and across all projects
    - Dashboard displays top-level KPIs: total cost YTD, avg quality score, error rate, current agent count
    - Metrics update with agent heartbeat (real-time)
    - Support threshold-based alerts (e.g., cost spike >$X in 1 hour)
  - Est. effort: M

- [ ] `P1-MH-11` Create basic Orchestrator Hub control panel with rule editor and simulation preview
  - Owner hint: Frontend / Design
  - Dependencies: `P1-MH-05`, `P1-MH-09`
  - Blocks: `P2-MH-04`
  - Feature refs: `TBD (F04)`
  - Acceptance criteria:
    - GUI rule editor (simple: if-then-else + priority/dependency fields, not full DAG builder yet)
    - Simulation panel shows predicted agent assignment and task sequencing for given input
    - "What-if" slider: adjust priority/resource constraints and re-simulate
    - Display simulated swarm health metrics (latency, cost, success probability)
    - Can test rules against 2–3 real scenarios before MVP freeze
  - Est. effort: L

- [ ] `P1-MH-12` Add Replit Familiar Mode entry flow (chat-first -> auto-expand to canvas + dashboard)
  - Owner hint: Frontend / Design
  - Dependencies: `P1-MH-04`, `P1-MH-03`
  - Blocks: `P2-MH-03`
  - Feature refs: `F11-MH-01`, `F11-MH-06`, `F11-MH-07`, `F11-MH-02`
  - Acceptance criteria:
    - New project can start in a simple chat prompt box with minimal UI chrome
    - Chat input auto-converts into a visual canvas graph on demand or when complexity grows
    - Users can toggle between Familiar Mode and full AEI without losing context
    - First-run guidance explains the transition from prompt -> canvas -> swarm
  - Est. effort: M

- [ ] `P1-MH-13` Prototype Replit project import -> Prompt Canvas flow
  - Owner hint: Backend / AI
  - Dependencies: `P1-MH-04`, `P1-MH-05`
  - Blocks: `P2-MH-02`
  - Feature refs: `F11-MH-03`
  - Acceptance criteria:
    - Accepts a Replit project description or export and maps it to an initial canvas graph
    - Generates a starter task decomposition with agent assignments (preview only)
    - Import completes in <60s for small projects
    - Import output is editable and versioned like any other canvas
  - Est. effort: M

- [ ] `P1-MH-14` Add optional Code Peek panel for generated artifacts (read-only)
  - Owner hint: Frontend
  - Dependencies: `P1-MH-06`
  - Blocks: `P2-SH-03`
  - Feature refs: `F11-MH-04`
  - Acceptance criteria:
    - Toggleable panel shows generated artifacts (code, schema, config) in read-only mode
    - Panel updates when new artifacts are produced by the mock execution pipeline
    - Clear messaging that code editing is out-of-scope for AEI
    - Performance remains <500ms to open/close panel with 100+ agents active
  - Est. effort: S

- [ ] `P1-MH-15` Ship Replit-style onboarding tutorial flow (Prompt -> Preview -> Deploy mental model)
  - Owner hint: Product / Design
  - Dependencies: `P1-MH-12`, `P1-MH-06`
  - Blocks: `P2-MH-01`
  - Feature refs: `F11-MH-05`
  - Acceptance criteria:
    - Guided walkthrough builds a simple Todo/MVP app in <15 min
    - Tutorial highlights where Familiar Mode upgrades into multi-agent orchestration
    - Completion metrics logged (time to first output, drop-off step)
    - Tutorial can be re-run or skipped by experienced users
  - Est. effort: M

#### Phase 1 Dependency Summary
| Task ID | Task Title (short) | Depends On | Blocks |
|---------|-------------------|------------|--------|
| `P1-MH-01` | Heartbeat protocol | `none` | `P1-MH-02`, `P1-MH-05`, `P1-MH-06`, `P1-MH-10` |
| `P1-MH-02` | WebSocket transport | `P1-MH-01` | `P1-MH-03`, `P1-MH-06` |
| `P1-MH-03` | Agent Dashboard UI | `P1-MH-01`, `P1-MH-02` | `P1-MH-12`, `P1-SH-02` |
| `P1-MH-04` | Prompt Canvas scaffold | `none` | `P1-MH-05`, `P1-MH-06`, `P1-MH-12`, `P1-MH-13` |
| `P1-MH-05` | Orchestrator rule engine | `P1-MH-01`, `P1-MH-04` | `P1-MH-06`, `P1-MH-11`, `P1-MH-13` |
| `P1-MH-06` | Mock execution pipeline | `P1-MH-02`, `P1-MH-05` | `P1-MH-08`, `P1-MH-09`, `P1-MH-10`, `P1-SH-05`, `P1-MH-14`, `P1-MH-15` |
| `P1-MH-07` | Audit logging | `none` | `P1-SH-04` |
| `P1-MH-08` | Trace data model | `P1-MH-06` | `P1-MH-09` |
| `P1-MH-09` | Trace visualization UI | `P1-MH-08`, `P1-MH-06` | `P1-MH-11`, `P2-MH-01` |
| `P1-MH-10` | Cost & quality metrics | `P1-MH-01`, `P1-MH-07` | `P2-MH-05` |
| `P1-MH-11` | Orchestrator Hub panel | `P1-MH-05`, `P1-MH-09` | `P2-MH-04` |
| `P1-MH-12` | Replit Familiar Mode | `P1-MH-04`, `P1-MH-03` | `P2-MH-03` |
| `P1-MH-13` | Replit import prototype | `P1-MH-04`, `P1-MH-05` | `P2-MH-02` |
| `P1-MH-14` | Code Peek panel | `P1-MH-06` | `P2-SH-03` |
| `P1-MH-15` | Replit-style onboarding | `P1-MH-12`, `P1-MH-06` | `P2-MH-01` |

---

## Phase 2 – Multi-Agent Workflows & Advanced Control (Target: weeks 9–16)

### Must-Have Tier (blocker for beta / early user feedback)

- [ ] `P2-MH-01` Expand AI Trace Viewer with comparative path analysis and alternative outcome simulation
  - Owner hint: Frontend / Backend
  - Dependencies: `P1-MH-09`, `P1-MH-06`
  - Blocks: `P2-SH-03`, `P3-SH-05`
  - Feature refs: `TBD`
  - Acceptance criteria:
    - Side-by-side comparison of two decision paths (actual vs. alternative)
    - Simulate outcome if agent had chosen alternative (show predicted cost, quality, latency)
    - Quantify trade-offs: confidence delta, cost delta, latency delta
    - Support forking from any historical decision point and re-executing with real agents (not mock)
    - Render comparative traces in <3s for 1,000+ node decisions
  - Est. effort: L

- [ ] `P2-MH-02` Implement Output Simulator: lightweight artifact generation without full execution
  - Owner hint: Backend / AI
  - Dependencies: `P1-MH-06`, `P1-MH-05`
  - Blocks: `P2-SH-03`
  - Feature refs: `TBD`
  - Acceptance criteria:
    - Given partial specification (e.g., "build login form + backend"), generate skeleton artifacts in <5s
    - Artifacts are lightweight but structurally valid (real code syntax, real schema definitions)
    - Run static issue detectors: security linter, bias detector, performance estimator
    - Compare simulated output with actual eventual output (track drift %)
    - Detect 90%+ of drift issues before production (security warnings, perf regressions)
  - Est. effort: L

- [ ] `P2-MH-03` Build real-time co-editing for Prompt Canvas with conflict resolution
  - Owner hint: Frontend / Backend
  - Dependencies: `P1-MH-04`, `P1-MH-02`
  - Blocks: `P2-SH-01`
  - Feature refs: `TBD`
  - Acceptance criteria:
    - Two users can edit canvas simultaneously; see each other's cursors in real-time
    - Conflict detection: if both users modify same block, show conflict resolution UI
    - Merge strategies: auto-merge non-overlapping edits, user chooses on conflict
    - Version history shows who changed what (audit trail for canvas)
    - Support for 5+ concurrent editors on same canvas
  - Est. effort: L

- [ ] `P2-MH-04` Enhance Orchestrator Hub with visual DAG builder and dynamic agent allocation
  - Owner hint: Frontend / Backend
  - Dependencies: `P1-MH-11`, `P1-MH-03`
  - Blocks: `P3-MH-02`, `P3-MH-05`
  - Feature refs: `TBD`
  - Acceptance criteria:
    - Drag-drop DAG builder: create nodes (agent type, decision) and edges (data flow, precedence)
    - Visual rule editor: conditional branching, resource constraints, priority weights
    - Dynamic agent pool allocation: Orchestrator predicts needed agent count and auto-scales
    - Simulation shows impact on swarm health and total cost
    - Support up to 1,000 agents in coordination graph
  - Est. effort: XL

- [ ] `P2-MH-05` Develop advanced Analytics Pane with KPI dashboards and anomaly detection
  - Owner hint: Frontend / Backend
  - Dependencies: `P1-MH-10`, `P1-MH-06`
  - Blocks: `P2-SH-03`, `P3-SH-02`
  - Feature refs: `TBD`
  - Acceptance criteria:
    - Customizable KPI views: quality score, cost trend, latency percentiles, error rate
    - Time-series charts (cost, quality, throughput, success rate) with drill-down to agent level
    - Threshold-based alerts for KPI violations (configurable per metric)
    - Anomaly detection: highlight unusual patterns (cost spike, quality dip, latency jump)
    - Export reports as CSV, JSON, PDF with stakeholder-friendly formatting
    - All KPIs update real-time with <1s latency
  - Est. effort: L

- [ ] `P2-MH-06` Implement branching and merging for prompt workflows (Git-like version control)
  - Owner hint: Backend / Frontend
  - Dependencies: `P1-MH-04`, `P1-MH-07`
  - Blocks: `P3-SH-04`
  - Feature refs: `TBD`
  - Acceptance criteria:
    - Create branch from canvas (snapshot all config, rules, assignments)
    - Edit branch independently; merge back with 3-way conflict resolution
    - Merge strategy selector: auto-merge compatible changes, require manual approval on conflict
    - Branch history timeline: see full lineage and divergence points
    - Tag releases for deployment/dogfood iterations
  - Est. effort: M

- [ ] `P2-MH-07` Build Security & Compliance dashboard with audit log viewer and compliance checklist
  - Owner hint: Frontend / Backend
  - Dependencies: `P1-MH-07`, `P1-SH-04`
  - Blocks: `P3-MH-01`
  - Feature refs: `TBD`
  - Acceptance criteria:
    - Audit log viewer: searchable, filterable timeline (actor, action, timestamp, resource)
    - Compliance checklist: SOC2, GDPR, HIPAA items, auto-verify tech controls
    - Generate on-demand compliance reports (signed, dated)
    - Alert on suspicious patterns: unusual IP, bulk export, privilege escalation
    - Retention policy enforcement: auto-archive old logs, purge per GDPR/retention rules
  - Est. effort: M

- [ ] `P2-MH-08` Add cost proxy model and real-time billing integration
  - Owner hint: Backend / Infra
  - Dependencies: `P1-MH-10`, `ext:billing-api-providers`
  - Blocks: `P3-MH-05`
  - Feature refs: `TBD`
  - Acceptance criteria:
    - Proxy model estimates cost for each agent task (tokens, API calls, compute)
    - Real-time cost aggregation per agent, per project, per user, per day/week/month
    - Integration with actual billing APIs (OpenAI, Anthropic, cloud providers)
    - Budget enforcement: warn at 80%, block execution at 100%
    - Cost variance analysis: predicted vs. actual costs
  - Est. effort: M

- [ ] `P2-MH-09` Implement native integrations with CI/CD systems (GitHub Actions, GitLab CI)
  - Owner hint: Backend / Infra
  - Dependencies: `P1-MH-06`
  - Blocks: `P3-SH-04`
  - Feature refs: `TBD`
  - Acceptance criteria:
    - AEI can trigger CI/CD pipeline after artifact generation
    - Receive deployment status webhooks and update dashboard
    - Link executions to deployed commits/releases
    - Show deployment success/failure in analytics
    - Support GitHub Actions and GitLab CI (others: nice-to-have)
  - Est. effort: M

#### Phase 2 Dependency Summary
| Task ID | Task Title (short) | Depends On | Blocks |
|---------|-------------------|------------|--------|
| `P2-MH-01` | Comparative trace analysis | `P1-MH-09`, `P1-MH-06` | `P2-SH-03`, `P3-SH-05` |
| `P2-MH-02` | Output Simulator | `P1-MH-06`, `P1-MH-05` | `P2-SH-03` |
| `P2-MH-03` | Canvas co-editing | `P1-MH-04`, `P1-MH-02` | `P2-SH-01` |
| `P2-MH-04` | Orchestrator DAG builder | `P1-MH-11`, `P1-MH-03` | `P3-MH-02`, `P3-MH-05` |
| `P2-MH-05` | Advanced Analytics Pane | `P1-MH-10`, `P1-MH-06` | `P2-SH-03`, `P3-SH-02` |
| `P2-MH-06` | Prompt workflow branching | `P1-MH-04`, `P1-MH-07` | `P3-SH-04` |
| `P2-MH-07` | Compliance dashboard | `P1-MH-07`, `P1-SH-04` | `P3-MH-01` |
| `P2-MH-08` | Billing integration | `P1-MH-10`, `ext:billing-api-providers` | `P3-MH-05` |
| `P2-MH-09` | CI/CD integrations | `P1-MH-06` | `P3-SH-04` |

---

## Phase 3 – Scale & Polish (Target: weeks 17+)

### Must-Have Tier (blocker for GA and enterprise adoption)

- [ ] `P3-MH-01` Hardened Security & Compliance implementation (SOC2, GDPR, HIPAA compliance)
  - Owner hint: Backend / Security / Infra
  - Dependencies: `P2-MH-07`, `P1-SH-04`
  - Blocks: `P3-SH-03`
  - Feature refs: `TBD`
  - Acceptance criteria:
    - Third-party SOC2 audit completed and Type II certification achieved
    - GDPR: data residency, right-to-be-forgotten, consent management, DPA in place
    - HIPAA: encryption, access logs, business associate agreements
    - Penetration testing and security audit completed; critical/high vulnerabilities resolved
    - Regular security updates and vulnerability scanning automated
  - Est. effort: XL

- [ ] `P3-MH-02` Scale dashboard to handle 1,000+ agents with sub-500ms latency
  - Owner hint: Frontend / Backend / Infra
  - Dependencies: `P2-MH-04`, `P2-SH-02`
  - Blocks: `none`
  - Feature refs: `TBD`
  - Acceptance criteria:
    - Load test dashboard with 1,000 agents emitting heartbeats every 10s
    - Maintain <500ms p99 latency for UI interactions
    - Agent virtualization: render only visible agents, lazy-load details
    - Implement agent grouping and filtering (by type, project, status) to reduce visual clutter
    - Support agent search and bulk operations (pause all of type X)
  - Est. effort: L

- [ ] `P3-MH-03` Implement enterprise deployment and management tools
  - Owner hint: Backend / Infra
  - Dependencies: `P2-CH-03`, `P2-MH-04`
  - Blocks: `P3-SH-04`
  - Feature refs: `TBD`
  - Acceptance criteria:
    - Helm charts for Kubernetes deployment
    - Infrastructure-as-Code (Terraform) for AWS/GCP/Azure
    - Automated scaling based on agent count and metrics
    - Health checks and auto-recovery for infrastructure
    - Centralized logging and monitoring (Prometheus, ELK, Datadog integration)
    - Documentation and runbooks for ops teams
  - Est. effort: L

- [ ] `P3-MH-04` Complete Plugin Marketplace: discovery, reviews, revenue sharing
  - Owner hint: Frontend / Backend
  - Dependencies: `P2-SH-04`
  - Blocks: `none`
  - Feature refs: `TBD`
  - Acceptance criteria:
    - Plugin registry with metadata: name, description, version, ratings, install count
    - One-click plugin install/update/uninstall
    - Plugin reviews and ratings system
    - Revenue sharing: plugin creators earn % of AEI subscription fees
    - Plugin certification program (verified safe, performance tested)
  - Est. effort: M

- [ ] `P3-MH-05` Implement advanced scheduling and resource management
  - Owner hint: Backend
  - Dependencies: `P2-MH-04`, `P2-MH-08`, `P2-CH-02`
  - Blocks: `none`
  - Feature refs: `TBD`
  - Acceptance criteria:
    - Scheduler: cron-based canvas execution, resource reservations, priority queues
    - Resource pool management: define min/max agent count, cost limits, time windows
    - Auto-scaling rules based on queue depth and project SLAs
    - Preemption: pause low-priority tasks if high-priority arrives
    - Fair allocation: round-robin or weighted fair queuing across projects
  - Est. effort: L

### Should-Have Tier (Phase 3+ hardening)

- [ ] `P3-SH-01` Implement sandboxed plugin execution runtime with permission model
  - Owner hint: Backend / Infra / Security
  - Dependencies: `P3-MH-04`, `ext:plugin-sandbox-runtime`
  - Blocks: `none`
  - Feature refs: `F09-MH-02`
  - Acceptance criteria:
    - Plugin runs in sandbox (WASM or container) with explicit permissions (network, file, model access)
    - Resource limits enforced (CPU/time/memory)
    - All plugin executions emit audit log entries (start, end, denied permissions)
    - Sandbox failure does not impact core orchestrator or other plugins
  - Est. effort: XL

#### Phase 3 Dependency Summary
| Task ID | Task Title (short) | Depends On | Blocks |
|---------|-------------------|------------|--------|
| `P3-MH-01` | SOC2/GDPR/HIPAA compliance | `P2-MH-07`, `P1-SH-04` | `P3-SH-03` |
| `P3-MH-02` | 1,000+ agent scale | `P2-MH-04`, `P2-SH-02` | `none` |
| `P3-MH-03` | Enterprise deployment tools | `P2-CH-03`, `P2-MH-04` | `P3-SH-04` |
| `P3-MH-04` | Plugin Marketplace | `P2-SH-04` | `none` |
| `P3-MH-05` | Advanced scheduling | `P2-MH-04`, `P2-MH-08`, `P2-CH-02` | `none` |
| `P3-SH-01` | Plugin sandbox runtime | `P3-MH-04`, `ext:plugin-sandbox-runtime` | `none` |

---

## Cross-Phase Dependency Map

### Phase 1 → Phase 2 Handoffs
| P1 Task | P2 Task(s) it Blocks | Handoff Notes |
|---------|---------------------|---------------|
| `P1-MH-09` | `P2-MH-01` | Trace viz required before comparative analysis |
| `P1-MH-06` | `P2-MH-02` | Mock execution needed before output simulator |
| `P1-MH-10` | `P2-MH-05` | Basic metrics needed before advanced analytics |
| `P1-MH-03` | `P2-MH-03` | Dashboard + WebSocket needed for co-editing |
| `P1-MH-11` | `P2-MH-04` | Basic orchestrator needed before DAG builder |
| `P1-MH-07` | `P2-MH-07` | Audit logging needed before compliance dashboard |
| `P1-MH-10` | `P2-MH-08` | Metrics collection needed before billing integration |
| `P1-MH-06` | `P2-MH-09` | Execution pipeline needed before CI/CD integration |
| `P1-MH-12` | `P2-MH-03` | Familiar Mode required before co-editing entry flow | 
| `P1-MH-13` | `P2-MH-02` | Import flow provides inputs for Output Simulator | 
| `P1-MH-15` | `P2-MH-01` | Tutorial validates trace viewer experience |

### Phase 2 → Phase 3 Handoffs
| P2 Task | P3 Task(s) it Blocks | Handoff Notes |
|---------|---------------------|---------------|
| `P2-MH-07` | `P3-MH-01` | Compliance dashboard needed before SOC2/GDPR |
| `P2-MH-04` | `P3-MH-02` | Advanced orchestrator needed before 1000+ agent scale |
| `P2-SH-04` | `P3-MH-04` | Plugin architecture needed before marketplace |
| `P2-MH-04` | `P3-MH-05` | Orchestrator hub needed before advanced scheduling |
| `P3-MH-04` | `P3-SH-01` | Plugin marketplace required before sandbox runtime hardening |

### Critical Path (longest dependency chain)
`P1-MH-01` → `P1-MH-02` → `P1-MH-06` → `P1-MH-08` → `P1-MH-09` → `P2-MH-01` → `P2-MH-04` → `P3-MH-02`

---

**Roadmap Owner:** Product Team
**Generated:** February 10, 2026
**Last Review:** February 10, 2026









