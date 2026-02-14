# AEI (ARI) Project Roadmap – Could-Have Tasks

**Generated from:** Master AEI PRD (v2.2 + Temporal integration decision)
**Date:** February 13, 2026
**Status:** Active – Aligned with main roadmap + Temporal pivot

Goal: Enhance MVP with polish features, enable self-bootstrapping via Temporal, support Mendix → PostgreSQL migration

> See also: project-roadmap.md (Must-Haves)

---

### Completed Work Summary (as of February 13, 2026)

**Phase 1 Could-Haves (now complete):**
- None yet marked complete in this file — all Replit-related polish (import UX, migration tips, chat telemetry) moved to main roadmap as must-haves.

Replit integration (Familiar Mode, import, onboarding) is fully complete in the main roadmap.

---

## Phase 1 – Agent Mission Control MVP (Target: weeks 1–8, polish only)

### Could-Have Tier (nice-to-have within phase, defer if needed)

- [ ] `P1-CH-01` Advanced trace analysis: bottleneck heatmap and recommendation engine
  - Owner hint: Backend / Frontend
  - Dependencies: `P1-MH-09`, `P1-MH-10`
  - Blocks: `P2-SH-03`
  - Feature refs: `TBD`
  - Acceptance criteria:
    - Heatmap overlay on decision tree highlights bottleneck nodes (slow decisions, low confidence)
    - Recommendation suggestions: "try higher confidence threshold," "parallelize branches," "route to faster agent type"
    - Export recommendations as structured feedback for iteration
  - Est. effort: L
  - Temporal Impact: Use Temporal history for richer bottleneck data

- [ ] `P1-CH-02` Add novice mode with progressive disclosure (hide 50% of dashboard by default)
  - Owner hint: Frontend / Design
  - Dependencies: `P1-MH-03`, `P1-MH-11`
  - Blocks: `P2-SH-05`
  - Feature refs: `TBD`
  - Acceptance criteria:
    - Toggle "novice mode" in settings; hides advanced metrics, simulation, trace tabs
    - Progressive disclosure: reveal more UI elements as user completes guided tours
    - "Learn more" links contextually surface help docs
    - Novice mode used by <50% of beta cohort → move to Should-Have
  - Est. effort: M
  - Temporal Impact: None (frontend-only)

- [ ] `P1-CH-03` Multi-region agent pool and deployment support
  - Owner hint: Backend / Infra
  - Dependencies: `P1-MH-01`
  - Blocks: `P2-CH-03`
  - Feature refs: `TBD`
  - Acceptance criteria:
    - Support agent pools in multiple regions (US-East, US-West, EU, APAC)
    - Task routing logic considers region latency and data residency
    - UI shows region health status (latency, availability)
    - Cost breakdown per region
  - Est. effort: M
  - Temporal Impact: Temporal workflows can be region-aware via worker pools

- [ ] `P1.5-CH-01` Temporal-powered voice command workflow (nice-to-have extension of P1-SH-01)
  - Owner hint: Backend / Frontend
  - Dependencies: `P1-SH-01`, `P1.5-MH-02`
  - Blocks: `P2-SH-06`
  - Feature refs: `TBD`
  - Acceptance criteria:
    - Voice commands trigger Temporal workflows (e.g. "execute canvas", "pause all", "show cost today")
    - Workflow pauses for confirmation if confidence low
    - Command history logged in Temporal events
  - Est. effort: M
  - Temporal Impact: Native workflow trigger from voice → high reliability

#### Phase 1 Could-Have Dependency Summary

| Task ID        | Task Title (short)                     | Depends On                  | Blocks                          | Status | Temporal Impact |
|----------------|----------------------------------------|-----------------------------|---------------------------------|--------|-----------------|
| `P1-CH-01`     | Advanced trace analysis                | `P1-MH-09`, `P1-MH-10`      | `P2-SH-03`                      | [ ]    | History         |
| `P1-CH-02`     | Novice mode                            | `P1-MH-03`, `P1-MH-11`      | `P2-SH-05`                      | [ ]    | None            |
| `P1-CH-03`     | Multi-region pools                     | `P1-MH-01`                  | `P2-CH-03`                      | [ ]    | Worker pools    |
| `P1.5-CH-01`   | Temporal voice command workflow        | `P1-SH-01`, `P1.5-MH-02`    | `P2-SH-06`                      | [ ]    | Workflow trigger|

---

## Phase 2 – Multi-Agent Workflows & Advanced Control (Target: weeks 9–16)

### Could-Have Tier (nice-to-have, defer if needed)

- [ ] `P2-CH-01` 3D swarm visualization and dashboard mode
  - Owner hint: Frontend / Design
  - Dependencies: `P1-MH-03`, `P2-MH-04`
  - Blocks: `P3-CH-02`
  - Feature refs: `TBD`
  - Acceptance criteria: [unchanged]
  - Est. effort: L
  - Temporal Impact: Visualize Temporal workflow history in 3D

- [ ] `P2-CH-02` Batch execution mode and bulk canvas submission
  - Owner hint: Backend / Frontend
  - Dependencies: `P1-MH-06`
  - Blocks: `P3-MH-05`
  - Feature refs: `TBD`
  - Acceptance criteria: [unchanged]
  - Est. effort: L
  - Temporal Impact: Batch as parallel child workflows

- [ ] `P2-CH-03` Multi-region and enterprise deployment infrastructure
  - Owner hint: Backend / Infra
  - Dependencies: `P1-SH-06`, `P1-CH-03`
  - Blocks: `P3-MH-03`, `P3-SH-03`
  - Feature refs: `TBD`
  - Acceptance criteria: [unchanged]
  - Est. effort: L
  - Temporal Impact: Multi-region worker pools & namespaces

---

## Phase 3 – Scale & Polish (Target: weeks 17+)

### Could-Have Tier (nice-to-have, defer if needed)

- [ ] `P3-CH-01` Build mobile companion app (iOS/Android) for monitoring and basic control
  - Owner hint: Mobile / Frontend
  - Dependencies: `P2-MH-05`, `P1-MH-03`
  - Blocks: `none`
  - Feature refs: `TBD`
  - Acceptance criteria: [unchanged]
  - Est. effort: L
  - Temporal Impact: Mobile queries Temporal workflows

- [ ] `P3-CH-02` Implement advanced visualization: AR/VR agent swarm visualization
  - Owner hint: Frontend / Design
  - Dependencies: `P2-CH-01`, `P3-SH-02`
  - Blocks: `none`
  - Feature refs: `TBD`
  - Acceptance criteria: [unchanged]
  - Est. effort: XL (experimental; defer unless strategic)
  - Temporal Impact: Visualize Temporal execution graph in AR/VR

- [ ] `P3-CH-03` Build AI copilot assistant for proactive feature discovery and optimization suggestions
  - Owner hint: Frontend / Backend / AI
  - Dependencies: `P3-SH-02`, `P2-MH-05`
  - Blocks: `none`
  - Feature refs: `TBD`
  - Acceptance criteria: [unchanged]
  - Est. effort: L
  - Temporal Impact: Copilot queries Temporal history

- [ ] `P3-CH-04` Implement GraphQL API and third-party integrations (Zapier, IFTTT)
  - Owner hint: Backend
  - Dependencies: `P1-MH-06`, `P2-MH-09`
  - Blocks: `none`
  - Feature refs: `TBD`
  - Acceptance criteria: [unchanged]
  - Est. effort: M
  - Temporal Impact: GraphQL subscriptions for workflow events

- [ ] `P3-CH-05` Mendix → PostgreSQL migration dashboard & monitoring
  - Owner hint: Frontend / Backend / Data
  - Dependencies: `P3-MH-06`, `P2-MH-10`
  - Blocks: `none`
  - Feature refs: `TBD`
  - Acceptance criteria:
    - Dashboard shows migration progress, errors, throughput
    - Pause/resume controls tied to Temporal workflow
    - Real-time row count validation
    - Audit trail viewer for migrated records
    - Export migration report (CSV/JSON)
  - Est. effort: M
  - Temporal Impact: Monitoring built on Temporal visibility API

#### Phase 2 & 3 Could-Have Dependency Summary

| Task ID     | Task Title (short)                     | Depends On                  | Blocks                          | Temporal Impact |
|-------------|----------------------------------------|-----------------------------|---------------------------------|-----------------|
| `P2-CH-01`  | 3D swarm visualization                 | `P1-MH-03`, `P2-MH-04`      | `P3-CH-02`                      | History         |
| `P2-CH-02`  | Batch execution mode                   | `P1-MH-06`                  | `P3-MH-05`                      | Child workflows |
| `P2-CH-03`  | Multi-region / multi-tenant            | `P1-SH-06`, `P1-CH-03`      | `P3-MH-03`, `P3-SH-03`          | Namespaces      |
| `P3-CH-01`  | Mobile companion app                   | `P2-MH-05`, `P1-MH-03`      | `none`                          | Queries         |
| `P3-CH-02`  | AR/VR visualization                    | `P2-CH-01`, `P3-SH-02`      | `none`                          | Execution graph |
| `P3-CH-03`  | AI copilot assistant                   | `P3-SH-02`, `P2-MH-05`      | `none`                          | History queries |
| `P3-CH-04`  | GraphQL API & integrations             | `P1-MH-06`, `P2-MH-09`      | `none`                          | Subscriptions   |
| `P3-CH-05`  | Migration dashboard & monitoring       | `P3-MH-06`, `P2-MH-10`      | `none`                          | Visibility API  |

---

**Roadmap Owner:** Drew (Product / Lead Engineer)  
**Last Review:** February 13, 2026  
**Next Review:** After Temporal prototype (`P1.5-MH-02`) is green