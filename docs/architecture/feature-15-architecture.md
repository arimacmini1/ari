# Feature 15 - Main Workspace Chat Adoption (Telemetry + Migration + Import UX): Architecture
**Feature task file:** `docs/tasks/feature-15-main-workspace-chat-adoption.md`  
**Related on-boarding:** `docs/on-boarding/feature-15-onboarding.md`  
**Status:** COMPLETE  
**Last updated:** 2026-02-13

## Overview
Feature 15 adds adoption telemetry for the main workspace chat, surfaces KPI views, and tightens migration guidance and import UX so conversion is measurable and reliable.

## System Design
```
Main Workspace Chat
  ├─ Telemetry Client (event emit)
  │   └─ /api/telemetry/events (ingest + validate)
  ├─ Migration Tips (contextual UI)
  └─ Import UX (preflight + retry)

Analytics Layer
  ├─ Event Store (idempotent writes)
  ├─ KPI Aggregations
  └─ Dashboard Widgets (filters + trends)
```

### Key Components
- **Telemetry Events API:** validates event schema, enforces idempotency, writes to event store.
- **KPI Aggregation:** derives usage split, time-to-first-output, completion rates by project.
- **Migration Tips UI:** contextual helper tips with dismiss + deep-link actions.
- **Import UX Preflight:** validates payloads and returns actionable error states with retry preservation.

### Data Flow
1. User interacts with main workspace chat.
2. Client emits telemetry event → API validates + stores event.
3. Aggregations roll up events into KPIs by project/time window.
4. Dashboard renders KPI widgets and trends.
5. Migration tips and import UX emit additional events.

## Architecture Decisions

### Decision: Telemetry event schema versioning
- **Chosen approach:** versioned event schema with strict validation on ingest.
- **Why:** prevents KPI drift and makes historical comparisons trustworthy.
- **Alternatives considered:** free-form event payloads.
- **Tradeoffs:** more upfront schema maintenance.

### Decision: Idempotent event writes
- **Chosen approach:** event_id uniqueness enforced in store.
- **Why:** avoids duplicate KPI inflation on retries.
- **Alternatives considered:** best-effort dedupe in aggregation.
- **Tradeoffs:** requires store-side uniqueness checks.

## Integration Points

### Upstream Dependencies
- Feature 11 – Main workspace chat entry flow (formerly Familiar Mode)
- Feature 06 – KPI schema pipeline + dashboard components
- Feature 14 – Project context model
- Feature 01 – Canvas parser contract (import mapping)

### Downstream Dependents
- Future GTM/adoption reporting features
- Predictive analytics and optimization (Phase 3)

## Known Issues & Constraints
- Current data stores are in-memory in several areas; persistence strategy must be confirmed.
- KPI definitions must be locked early to avoid re-aggregation churn.

## Future Improvements
- Cohort/funnel analytics once baseline telemetry stabilizes.
- Automated regression alerts on adoption metrics.

## References
- Task file: `docs/tasks/feature-15-main-workspace-chat-adoption.md`
- Related features: `docs/tasks/feature-11-familiar-mode-onboarding.md`, `docs/tasks/feature-06-analytics-pane.md`
