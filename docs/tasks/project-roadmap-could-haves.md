# AEI Project Roadmap – Could-Have Tasks

**Generated from:** Master AEI PRD (v2.0)
**Date:** February 8, 2026
**Status:** Ready for Engineering

---

## Phase 1 – Agent Mission Control MVP (Target: weeks 1–8)

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

---

## Phase 2 – Multi-Agent Workflows & Advanced Control (Target: weeks 9–16)

### Could-Have Tier (nice-to-have, defer if needed)

- [ ] `P2-CH-01` 3D swarm visualization and dashboard mode
  - Owner hint: Frontend / Design
  - Dependencies: `P1-MH-03`, `P2-MH-04`
  - Blocks: `P3-CH-02`
  - Feature refs: `TBD`
  - Acceptance criteria:
    - 3D visualization of agent swarm (each agent as a node, edges show communication)
    - Animate task execution flow across agents
    - Zoom/pan/rotate controls; click node to inspect agent
    - Performance: render 1,000+ agents with 60fps (WebGL)
    - Toggle between 2D tree view and 3D swarm view
  - Est. effort: L

- [ ] `P2-CH-02` Batch execution mode and bulk canvas submission
  - Owner hint: Backend / Frontend
  - Dependencies: `P1-MH-06`
  - Blocks: `P3-MH-05`
  - Feature refs: `TBD`
  - Acceptance criteria:
    - Upload CSV or JSON with 100+ task variations
    - Template canvas with placeholders (e.g., {{input_name}}, {{config}})
    - Batch submit: execute canvas for each row, parallelize execution
    - Progress view: show completion % and ETA
    - Results export: aggregate artifacts + metrics per batch item
  - Est. effort: L

- [ ] `P2-CH-03` Multi-region and enterprise deployment infrastructure
  - Owner hint: Backend / Infra
  - Dependencies: `P1-SH-06`, `P1-CH-03`
  - Blocks: `P3-MH-03`, `P3-SH-03`
  - Feature refs: `TBD`
  - Acceptance criteria:
    - Deploy AEI to private VPC/cloud with Kubernetes
    - Data residency: agents and data remain in customer region
    - Replication: optional multi-region failover
    - Integration with customer's existing auth (SAML, LDAP)
  - Est. effort: L

---

## Phase 3 – Scale & Polish (Target: weeks 17+)

### Could-Have Tier (nice-to-have, defer if needed)

- [ ] `P3-CH-01` Build mobile companion app (iOS/Android) for monitoring and basic control
  - Owner hint: Mobile / Frontend
  - Dependencies: `P2-MH-05`, `P1-MH-03`
  - Blocks: `none`
  - Feature refs: `TBD`
  - Acceptance criteria:
    - Real-time agent status and metrics on mobile
    - Alert notifications and quick actions (pause, terminate)
    - Read-only canvas viewing and trace inspection
    - Offline mode with sync on reconnect
  - Est. effort: L

- [ ] `P3-CH-02` Implement advanced visualization: AR/VR agent swarm visualization
  - Owner hint: Frontend / Design
  - Dependencies: `P2-CH-01`, `P3-SH-02`
  - Blocks: `none`
  - Feature refs: `TBD`
  - Acceptance criteria:
    - VR mode: immersive agent swarm visualization in 3D space
    - AR overlay: view agent status and metrics in physical space
    - Gesture controls for VR interaction
  - Est. effort: XL (experimental; defer unless strategic)

- [ ] `P3-CH-03` Build AI copilot assistant for proactive feature discovery and optimization suggestions
  - Owner hint: Frontend / Backend / AI
  - Dependencies: `P3-SH-02`, `P2-MH-05`
  - Blocks: `none`
  - Feature refs: `TBD`
  - Acceptance criteria:
    - Contextual copilot suggestions: "You could parallelize this task," "Consider using agent type X for better quality"
    - Natural language interface: ask copilot questions about swarm health, costs, recommendations
    - Learning: improve suggestions based on user feedback
  - Est. effort: L

- [ ] `P3-CH-04` Implement GraphQL API and third-party integrations (Zapier, IFTTT)
  - Owner hint: Backend
  - Dependencies: `P1-MH-06`, `P2-MH-09`
  - Blocks: `none`
  - Feature refs: `TBD`
  - Acceptance criteria:
    - GraphQL API with subscriptions for real-time data
    - Zapier integration: trigger AEI workflows from other apps
    - IFTTT integration for simple automations
  - Est. effort: M

---

## Phase 1, 2 & 3 Dependency Summary

#### Phase 1 Could-Haves
| Task ID | Task Title (short) | Depends On | Blocks |
|---------|-------------------|------------|--------|
| `P1-CH-01` | Advanced trace analysis | `P1-MH-09`, `P1-MH-10` | `P2-SH-03` |
| `P1-CH-02` | Novice mode | `P1-MH-03`, `P1-MH-11` | `P2-SH-05` |
| `P1-CH-03` | Multi-region pools | `P1-MH-01` | `P2-CH-03` |

#### Phase 2 Could-Haves
| Task ID | Task Title (short) | Depends On | Blocks |
|---------|-------------------|------------|--------|
| `P2-CH-01` | 3D swarm visualization | `P1-MH-03`, `P2-MH-04` | `P3-CH-02` |
| `P2-CH-02` | Batch execution mode | `P1-MH-06` | `P3-MH-05` |
| `P2-CH-03` | Multi-region / multi-tenant | `P1-SH-06`, `P1-CH-03` | `P3-MH-03`, `P3-SH-03` |

#### Phase 3 Could-Haves
| Task ID | Task Title (short) | Depends On | Blocks |
|---------|-------------------|------------|--------|
| `P3-CH-01` | Mobile companion app | `P2-MH-05`, `P1-MH-03` | `none` |
| `P3-CH-02` | AR/VR visualization | `P2-CH-01`, `P3-SH-02` | `none` |
| `P3-CH-03` | AI copilot assistant | `P3-SH-02`, `P2-MH-05` | `none` |
| `P3-CH-04` | GraphQL API & integrations | `P1-MH-06`, `P2-MH-09` | `none` |

---

**Roadmap Owner:** Product Team
**Generated:** February 8, 2026
**Last Review:** February 8, 2026
