# Feature 13 – Comparative Trace Analysis Architecture

**Feature task file:** `docs/tasks/feature-13-comparative-trace-analysis.md`
**Related on-boarding:** `docs/on-boarding/feature-13-onboarding.md`
**Status:** COMPLETED (mock/simulated re-execution)

## Overview
Feature 13 adds side-by-side trace comparison and a fork workflow for “what if this decision had chosen a different outcome?”. The current implementation focuses on a fast, deterministic, in-memory experience suitable for dogfooding and UI iteration.

## System Design

### Key Components
- **Compare contract + metrics**
  - `lib/trace-compare-model.ts`
  - `lib/trace-compare.ts`
- **Trace store (in-memory)**
  - `lib/mock-trace-store.ts`
- **Compare API**
  - `POST /api/traces/compare` in `app/api/traces/compare/route.ts`
- **Fork API (async job lifecycle)**
  - `POST /api/traces/fork` in `app/api/traces/fork/route.ts` returns `202` + `fork_id`
  - `GET /api/traces/fork/[forkId]` in `app/api/traces/fork/[forkId]/route.ts` returns job status
  - Fork job store: `lib/trace-fork-job-store.ts`
- **Runtime feature flags (toggle compare/fork)**
  - `GET/PATCH /api/traces/flags` in `app/api/traces/flags/route.ts`
  - Flag store: `lib/trace-feature-flags.ts`
- **UI surfaces**
  - Trace Viewer: `components/aei/trace-viewer.tsx`
  - Trace Tree + per-node Compare: `components/aei/trace-tree.tsx`, `components/aei/trace-node.tsx`
  - Compare dialog: `components/aei/trace-compare-dialog.tsx`

### Data Flow
1. User opens Trace Viewer and selects a node with alternatives.
2. UI requests comparison:
   - `POST /api/traces/compare` with `{ execution_id, node_id, alternative_outcome }`
3. Server builds a `TraceComparison`:
   - `buildTraceComparison()` clones the fork node subtree and applies deterministic perturbations to simulate an alternative.
   - Produces `diff_summary` and `tradeoff_metrics` (including per-decision deltas).
4. User requests a fork:
   - `POST /api/traces/fork` returns a `fork_id` immediately (`queued`).
   - A short async job transitions `queued` -> `running` -> `completed/failed`.
   - On completion, a forked `TraceExecution` is written into `lib/mock-trace-store.ts`.
5. UI polls `GET /api/traces/fork/[forkId]` until completion, then loads the forked trace in Trace Viewer.

## Architecture Decisions

### Decision: In-memory stores for dogfood velocity
- **Chosen approach:** Use module-scoped/global stores (`mock-trace-store`, fork job store, feature flags store).
- **Why:** Simple, fast, no DB requirements, easy to reset in dev.
- **Tradeoffs:** No persistence across restarts, no multi-instance correctness.

### Decision: Deterministic perturbation instead of full re-execution
- **Chosen approach:** Create “alternative” subtree by cloning + applying deterministic jitter to confidence/cost/duration.
- **Why:** Enables UX validation and metric display without orchestrator replay dependencies.
- **Tradeoffs:** Not real telemetry; values are marked estimated.

### Decision: Runtime toggles over env-only kill switches
- **Chosen approach:** `GET/PATCH /api/traces/flags` controls compare/fork enablement.
- **Why:** Dogfooding/testing needs live enable/disable without restarts.
- **Tradeoffs:** In-memory only; restarts reset to env defaults.

## Integration Points

### Upstream Dependencies
- Feature 05 Trace Viewer base trace model/UI (`lib/trace-model.ts`, viewer components).

### Downstream Dependents
- Debugging/time-travel UX layers that require fork/compare primitives.

## Known Issues & Constraints
- Fork jobs and feature flags are in-memory and reset on server restart.
- Compare/fork simulate outcomes; they are not replaying real agents.
- Large-trace performance constraints depend on JS rendering and dev hardware; current implementation focuses on keeping diff compute small and bounded.

## Future Improvements
- Persist fork jobs and flags (DB-backed).
- Replace perturbation with orchestrator-backed scoped replay.
- Add streaming updates instead of polling for fork status.

## References
- `docs/tasks/feature-13-comparative-trace-analysis.md`
- `docs/on-boarding/feature-13-onboarding.md`
