# AEI (ARI) Project Roadmap – Must-Have Tasks

**Generated from:** Master AEI PRD (v2.2 + Temporal integration decision)
**Date:** February 13, 2026
**Status:** Active – Temporal pivot for self-bootstrapping & Mendix migration

Goal: Achieve self-bootstrapping (Ari builds Ari) + Mendix → PostgreSQL data migration using Temporal workflows

> See also: [project-roadmap-should-haves.md] and [project-roadmap-could-haves.md]

---

## Phase 1 – Agent Mission Control MVP (Target: weeks 1–8, ~90% complete)

### Must-Have Tier (core UI & basic execution – mostly done)

- [x] `P1-MH-01` Design & implement agent heartbeat protocol and telemetry schema
- [x] `P1-MH-02` Implement real-time WebSocket transport and agent state subscription model
  **Note:** Will be simplified/deprecated after Temporal adoption
- [x] `P1-MH-03` Build core Agent Dashboard UI with live agent tree and status visualization
- [x] `P1-MH-04` Create Prompt Canvas basic scaffold with drag-drop block composition
- [x] `P1-MH-05` Implement basic Orchestrator rule engine and task decomposition
- [x] `P1-MH-07` Set up foundational audit logging infrastructure with immutable logs
- [x] `P1-MH-08` Design and implement trace data model for agent reasoning decisions
- [x] `P1-MH-09` Build trace visualization UI with collapsible decision tree and alternative path forking
- [x] `P1-MH-10` Implement cost and quality metrics collection and real-time display
- [x] `P1-MH-11` Create basic Orchestrator Hub control panel with rule editor and simulation preview
- [x] `P1-MH-12` Add Replit Familiar Mode entry flow (chat-first -> auto-expand to canvas + dashboard)
- [x] `P1-MH-13` Prototype Replit project import -> Prompt Canvas flow
- [x] `P1-MH-14` Add optional Code Peek panel for generated artifacts (read-only)
- [x] `P1-MH-15` Ship Replit-style onboarding tutorial flow (Prompt -> Preview -> Deploy mental model)
- [x] `P1-MH-16` Introduce basic Code Explorer tab for viewing & browsing generated codebases

---

## Phase 1.5 – Temporal Integration & Dogfood Bootstrap (Target: weeks 9–12)

**Purpose:** Replace custom execution with Temporal → enable reliable self-bootstrapping (Ari builds Ari)

### Must-Have Tier

- [x] `P1.5-MH-01` Install & configure Temporal dev + production-ready setup
  - Owner hint: Backend / Infra
  - Dependencies: none
  - Blocks: all later 1.5 tasks
  - Acceptance criteria:
    - Temporal dev server running locally
    - Helm chart or docker-compose for staging/prod
    - Basic metrics export to Prometheus/Grafana
    - Worker pool ready (Python or TypeScript SDK)
  - Est. effort: S–M

- [x] `P1.5-MH-02` Refactor mock execution pipeline to Temporal workflows
  - Owner hint: Backend / AI
  - Dependencies: `P1.5-MH-01`, `P1-MH-05`, `P1-MH-06`
  - Blocks: `P1.5-MH-03`, `P1.5-MH-04`
  - Acceptance criteria:
    - Canvas JSON → Temporal workflow input
    - Orchestrator rules → workflow logic (activities for agent calls)
    - Same artifacts produced as old mock pipeline
    - Dashboard shows workflow progress via Queries/Signals
    - Retries/timeouts/human approval stubs in place
  - Est. effort: L–XL

- [ ] `P1.5-MH-03` Port dogfood workflow (B1–B8) into Temporal workflow
  - Owner hint: Backend / AI
  - Dependencies: `P1.5-MH-02`
  - Blocks: `P1.5-MH-04`
  - Acceptance criteria:
    - Entire dogfood sequence runs as one Temporal workflow
    - Each block is an activity or child workflow
    - Workflow can pause for human approval (via Signal)
    - Execution history visible in Temporal UI & AEI Trace Viewer
    - First self-run: Ari uses itself to complete one small task
  - Est. effort: M–L

- [ ] `P1.5-MH-04` Enable Ari self-bootstrapping proof-of-concept
  - Owner hint: Product / Backend
  - Dependencies: `P1.5-MH-03`
  - Blocks: Phase 2+
  - Acceptance criteria:
    - Ari can run the dogfood workflow on itself
    - Human approves via UI → workflow resumes
    - Success logged in audit trail
    - Demo video / screenshot of self-modification
  - Est. effort: M

---

## Phase 2 – Multi-Agent Workflows & Self-Bootstrapping (Target: weeks 13–20)

### Must-Have Tier (blocker for beta + self-building)

- [ ] `P2-MH-01` Expand AI Trace Viewer with Temporal history integration
- [ ] `P2-MH-02` Implement Output Simulator using Temporal activities
- [x] `P2-MH-03` Real-time co-editing for Prompt Canvas
- [ ] `P2-MH-04` Enhance Orchestrator Hub – visual editor for Temporal workflows
- [ ] `P2-MH-10` Enable Ari to run dogfood workflow on itself continuously
  - Owner hint: Product / Backend
  - Dependencies: `P1.5-MH-04`
  - Acceptance criteria:
    - Ari can accept new roadmap tasks via chat/canvas
    - Triggers Temporal workflow to implement them
    - Human approval gate before merge/deploy
    - First real self-improvement committed

---

## Phase 3 – Scale, Polish & Mendix Migration (Target: weeks 21+)

### Must-Have Tier

- [ ] `P3-MH-06` Mendix → PostgreSQL data migration workflow
  - Owner hint: Backend / Data
  - Dependencies: `P2-MH-10`, `P3-MH-01`
  - Acceptance criteria:
    - Temporal workflow reads from Mendix (API or export)
    - Maps/transforms data to new PostgreSQL schema
    - Incremental migration with checkpoint/resume
    - Full audit trail of every record migrated
    - Dry-run + production mode with rollback
    - Validation: row counts match, sample records verified

- All other Phase 3 tasks remain (compliance, scale, marketplace, etc.)

### Critical Path (updated)

`P1-MH-05` → `P1.5-MH-02` (Temporal execution) → `P1.5-MH-03` (dogfood in Temporal) → `P1.5-MH-04` (self-bootstrapping) → `P2-MH-10` (continuous self-build) → `P3-MH-06` (Mendix migration)

---

**Roadmap Owner:** Drew (Product / Lead Engineer)  
**Last Review:** February 13, 2026  
**Next Review:** After `P1.5-MH-03` prototype is green
