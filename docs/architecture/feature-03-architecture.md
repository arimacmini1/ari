# Feature 03 – Orchestrator Hub Architecture

**Feature task file:** `docs/tasks/feature-03-orchestrator-hub.md`
**Related on-boarding:** `docs/on-boarding/feature-03-onboarding.md`
**Status:** COMPLETED (with known constraints and follow-on work)

## Overview

The Orchestrator Hub coordinates planning and execution for multi-agent workflows. It supports rule definition, simulation, execution dispatch, and execution history, with an additional constrained Temporal workflow editor introduced in the F03-MH-10 slice.

Core loop:
1. Define orchestration rules.
2. Simulate assignment and metrics.
3. Dispatch execution.
4. Track execution status and trace output.

## System Design

```text
Prompt Canvas graph (or mock graph in UI)
  -> Orchestrator Hub UI (/orchestrator)
     -> POST /api/orchestrator/simulate
        -> OrchestratorEngine (decompose -> assign -> metrics)
        -> simulation result + artifacts
     -> POST /api/executions
        -> ExecutionRecord persisted in in-memory store
        -> Temporal runner (preferred when enabled) OR legacy mock dispatcher
        -> status updates and trace data
  -> /executions for history
  -> /traces/[executionId] for trace visualization

Temporal workflow editor (safe subset):
  /orchestrator panel
  -> GET/POST /api/temporal/workflow-editor
  -> schema + allowlist validation in lib/temporal-workflow-editor-schema.ts
```

### Key Components

- `app/orchestrator/page.tsx`
- `components/aei/rule-list.tsx`
- `components/aei/rule-editor.tsx`
- `components/aei/rule-visualization.tsx`
- `components/aei/simulation-panel.tsx`
- `components/aei/orchestrator-dag-builder.tsx`
- `components/aei/temporal-workflow-editor.tsx`
- `components/aei/artifact-preview-panel.tsx`
- `lib/orchestrator-engine.ts`
- `app/api/orchestrator/route.ts`
- `app/api/orchestrator/simulate/route.ts`
- `app/api/executions/route.ts`
- `app/api/executions/[executionId]/route.ts`
- `lib/execution-store.ts`
- `lib/temporal-execution.ts`
- `lib/temporal-workflow-editor-schema.ts`
- `app/api/temporal/workflow-editor/route.ts`

## Data Flow

### Simulation Flow

1. User selects/creates a rule in `/orchestrator`.
2. UI triggers `POST /api/orchestrator/simulate` with:
   - `instruction_graph` (array of instruction nodes)
   - `rule_set_id`
   - optional `constraints_override`
   - optional `agent_pool`
3. API sets agent pool and ensures rule presence (creates default rule if missing).
4. `OrchestratorEngine.simulate()` runs:
   - graph validation and topological decomposition
   - greedy assignment based on affinity and fallback
   - metric estimation (`estimated_total_cost`, `estimated_total_duration`, `success_probability`)
5. API returns simulation payload plus generated artifacts for preview.

### Execution Flow

1. User clicks Execute in simulation panel.
2. UI sends `POST /api/executions` with `rule_set_id`, `assignment_plan`, and estimated metrics.
3. API resolves project context and RBAC, evaluates project budget, and creates an execution record in `EXECUTIONS_DB`.
4. Dispatch path:
   - Preferred: Temporal execution via `lib/temporal-execution.ts` if runner is enabled/available.
   - Fallback: legacy in-process mock dispatch.
5. Execution status transitions: `pending` -> `processing` -> `complete`/`failed`.
6. History is available at `GET /api/executions`; detail is available at `GET /api/executions/[executionId]`.

### Temporal Workflow Editor Validation Flow (F03-MH-10 Slice)

1. UI loads template with `GET /api/temporal/workflow-editor?template_id=self-bootstrap-v1`.
2. User edits safe fields in a constrained form.
3. UI submits proposed spec to `POST /api/temporal/workflow-editor`.
4. Server validates using strict schema and policy:
   - unknown keys rejected
   - blocked keys rejected (`command`, `shell`, `script`, `env`, `image`, etc.)
   - strict bounds for retry/timeout fields
   - fixed allowlist for template and activity IDs
5. API returns `{ valid, errors, sanitized_spec? }` with no workflow execution side effects.

## Architecture Decisions

### Decision 1: Keep simulation non-destructive
- **Chosen approach:** `POST /api/orchestrator/simulate` returns plan + metrics + artifacts only.
- **Why:** Enables fast iterative tuning without committing execution state.
- **Alternatives considered:** Persist simulation snapshots by default.
- **Tradeoffs:** Less historical visibility of simulation-only sessions.

### Decision 2: Use greedy assignment in MVP engine
- **Chosen approach:** Rule affinity preference with fallback to first available agent.
- **Why:** Simple and fast for current graph sizes.
- **Alternatives considered:** Global optimization (ILP/solver).
- **Tradeoffs:** Assignment quality may be suboptimal under complex constraints.

### Decision 3: Prefer Temporal for execution, keep fallback path
- **Chosen approach:** `app/api/executions/route.ts` tries Temporal when enabled, otherwise uses legacy mock dispatch.
- **Why:** Enables realistic orchestration while preserving local/dev operability.
- **Alternatives considered:** Hard-cut to Temporal only.
- **Tradeoffs:** Dual-path complexity and potential behavior drift between engines.

### Decision 4: Default-deny constrained Temporal workflow editing
- **Chosen approach:** Strict schema + blocked key scan + activity/template allowlists.
- **Why:** Prevent arbitrary code/execution knob exposure from UI edits.
- **Alternatives considered:** Broad JSON editing with best-effort validation.
- **Tradeoffs:** Reduced flexibility for advanced workflow tuning.

### Decision 5: In-memory stores for rules and executions
- **Chosen approach:** Runtime maps for MVP speed.
- **Why:** Minimal setup and fast iteration.
- **Alternatives considered:** Immediate DB-backed persistence.
- **Tradeoffs:** Data loss on restart; limited audit durability.

## Integration Points

### Upstream Dependencies
- `docs/architecture/feature-01-architecture.md`: workflow/instruction graph producer.
- `docs/architecture/feature-00-architecture.md`: heartbeat/real-time communication baseline.
- Project context and RBAC modules (`lib/project-context.ts`, `lib/project-rbac.ts`).

### Downstream Dependents
- `docs/architecture/feature-02-architecture.md`: agent dashboard consumes execution/task status.
- `docs/architecture/feature-04-architecture.md`: artifact preview uses simulation artifacts.
- Trace viewer surface (`app/traces/[executionId]/page.tsx`) depends on execution trace writes.

## Known Issues & Constraints

1. Rule update/delete routing is inconsistent.
- Current frontend calls `/api/orchestrator/${ruleId}`, but only `app/api/orchestrator/route.ts` exists.
- PUT/DELETE handlers in that file parse `pathname`, which does not create a real dynamic API route.

2. Execution detail page route is referenced by UI but not present.
- `app/executions/page.tsx` links to `/executions/${execution_id}`.
- No `app/executions/[executionId]/page.tsx` currently exists.

3. Simulation panel currently uses a local mock graph.
- `components/aei/simulation-panel.tsx` constructs a fixed graph client-side rather than ingesting a live Prompt Canvas graph.

4. In-memory persistence remains a hard limit.
- Rule and execution state are process-memory scoped and reset on restart.

## Testing Strategy

### Unit Tests
- `lib/orchestrator-engine.ts`
  - decomposition and cycle detection
  - assignment affinity and fallback behavior
  - metrics calculation
- `lib/temporal-workflow-editor-schema.ts`
  - blocked key rejection
  - bounds validation
  - allowlist enforcement

### Integration Tests
- `POST /api/orchestrator/simulate`
  - valid graph + rule returns simulation payload
  - invalid graph returns validation errors
- `POST /api/executions`
  - validates project context, RBAC, budget constraints
  - returns engine mode (`temporal` or `legacy-mock`)
- `GET /api/executions` and `GET /api/executions/[executionId]`
  - scope by project and return expected record shape
- `GET/POST /api/temporal/workflow-editor`
  - allowed mutation accepted
  - unsafe mutation rejected with explicit errors

### E2E Scenarios
1. Create/edit rule -> simulate -> execute -> confirm history row appears.
2. Toggle constraints and verify metric deltas on re-simulation.
3. Validate Temporal workflow editor safe mutation and blocked mutation behavior.
4. Open trace view from execution history and verify decision tree load.

## Future Improvements

1. Add real dynamic orchestrator rule routes (`/api/orchestrator/[ruleId]`) and align frontend usage.
2. Implement `app/executions/[executionId]/page.tsx` to close the current navigation gap.
3. Replace mock graph input path with direct Prompt Canvas graph ingestion.
4. Persist rules/executions to database for durability and queryability.
5. Add deterministic replay endpoint semantics and UI flow.
6. Introduce richer assignment optimization for larger or constrained agent pools.

## References

- Task source: `docs/tasks/feature-03-orchestrator-hub.md`
- On-boarding guide: `docs/on-boarding/feature-03-onboarding.md`
- Core engine: `lib/orchestrator-engine.ts`
- Orchestrator APIs: `app/api/orchestrator/route.ts`, `app/api/orchestrator/simulate/route.ts`
- Execution APIs: `app/api/executions/route.ts`, `app/api/executions/[executionId]/route.ts`
- Temporal adapter: `lib/temporal-execution.ts`
- Temporal editor schema/API: `lib/temporal-workflow-editor-schema.ts`, `app/api/temporal/workflow-editor/route.ts`

## Automated Slice Sync Log

- 2026-02-14 | task: F03-MH-09 | workflow: ari-self-bootstrap-df7b023d74 | task_file: docs/tasks/feature-03-orchestrator-hub.md
- 2026-02-14 | task: F03-MH-11 | workflow: ari-self-bootstrap-f03-mh-11-workflow-2026-02-14T20:51:50Z | task_file: docs/tasks/feature-03-orchestrator-hub.md
