# Feature 03 – Orchestrator Hub Architecture

## Overview

The Orchestrator Hub is the coordination layer that transforms multi-agent workflows from "execute independently" to "execute with orchestrated control." It accepts task graphs from the Prompt Canvas (Feature 01), applies rule-based orchestration logic, decomposes nested goals into atomic tasks, assigns tasks to agents based on affinity and constraints, and dispatches the plan to agents via the Agent Dashboard (Feature 02).

**Core responsibility:** Take high-level instruction → decompose into concrete task assignments → simulate outcomes → execute with agent feedback

---

## System Architecture

### High-Level Flow

```
User creates workflow    Prompt Canvas         Instruction Graph
in Prompt Canvas    →   exports graph    →    (nested tasks, edges)
                                                      ↓
                                        Orchestrator Hub loads graph
                                                      ↓
User defines rules   Rule Editor (UI)        Rule set (priority, affinity,
in Orchestrator  →   saves to backend   →    constraints) stored
                                                      ↓
User clicks          Simulation Engine      Decompose → Assign → Estimate
"Simulate"      →    (OrchestratorEngine)   (non-destructive)
                                                      ↓
                                        Task Assignment Plan + Metrics
                                                      ↓
User adjusts         Constraint Adjuster    Sliders (max agents, cost)
constraints    →     re-simulates instantly    Re-simulate in <2s
                                                      ↓
User clicks          Execution Manager      Create execution record,
"Execute"       →    dispatches to agents     broadcast tasks via WebSocket
                                                      ↓
                                        Agent Dashboard updates live
                                                      ↓
User monitors        Execution History      View & replay past executions
progress       →     & Replay Viewer
```

---

## Component Architecture

### Frontend Components

#### `/app/orchestrator/page.tsx` – Main Hub Layout
- Two-pane layout: left sidebar (rules), right main area (simulation + visualization)
- State management for current rule set, loaded graph, simulation results
- Orchestrates sub-component data flow

**Props / State:**
```typescript
{
  rules: Rule[];
  currentGraph: InstructionGraph | null;
  simulationResult: SimulationResult | null;
  isSimulating: boolean;
  constraints: { maxAgents: number; maxCostBudget: number };
}
```

#### `components/orchestrator/rule-list.tsx` – Left Sidebar
- Displays list of all rules with name, priority badge, affinity summary
- Add/Edit/Delete buttons for rule management
- Currently selected rule highlighted

**Key behaviors:**
- Click rule → highlights and loads in editor
- Click add button → opens rule editor modal
- Click edit icon → populates modal with current rule values
- Click delete icon → confirmation, then deletes

#### `components/orchestrator/rule-editor.tsx` – Rule Form Modal
- Form fields: name (text), priority (slider 1–10), affinity (checkboxes), constraints (sliders)
- Validation: name required, priority 1–10, at least one affinity optional
- Save button → `POST /api/orchestrator/rules`
- Cancel button → closes modal

**Field details:**
- **Name:** Text input, max 100 chars, required
- **Priority:** Slider 1–10 (1=lowest, 10=highest), default 5
- **Affinity:** Checkboxes for agent types (code_gen, test, deploy, analysis, etc.), defaults to empty (any agent)
- **Max Agents:** Slider 1–1000, default 100
- **Max Cost Per Task:** Slider $0–$100, default $10

#### `components/orchestrator/simulation-panel.tsx` – Results Display
- Displays simulation result: task assignment table, critical path, metrics summary
- Constraint adjusters (sliders) for max agents, max cost budget
- "Simulate" and "Execute Plan" buttons
- Shows loading state during simulation

**Result display:**
```
┌─ Task Assignment Table
│  task_id | assigned_agent | estimated_cost | status
│  ...
├─ Critical Path (top 3 sequential chains)
│  Path 1: Task A → Task B → Task C (duration: 45s)
│  ...
└─ Metrics Summary
   Total Cost: $42.50 | Duration: 120s | Success: 95%
```

#### `components/orchestrator/rule-visualization.tsx` – Graph Visualization
- Visual representation of rule dependencies (simple node + edge diagram)
- Node = rule, edge = task dependency
- Shows affinity mapping (task type → agent type colors)

#### `/app/executions/page.tsx` – Execution History List
- Table of all past executions: execution_id, created_at, rule_set_id, num_agents, cost, duration, status
- Click row → navigate to execution detail page

#### `/app/executions/[executionId]/page.tsx` – Execution Detail
- Shows assignment plan, actual vs. estimated metrics, task completion timeline (Gantt chart)
- "Replay" button re-runs same graph + rules
- Timeline: Agent Y-axis, task duration X-axis, colors show task types

---

### Backend Components

#### `/lib/orchestrator-engine.ts` – Core Logic

**OrchestratorEngine class:**

```typescript
class OrchestratorEngine {
  constructor(rules: Rule[], constraints: Constraints) { ... }

  // Main simulation method
  simulate(graph: InstructionGraph): SimulationResult { ... }

  // Internal helper methods
  private decomposeGraph(graph: InstructionGraph): Task[] { ... }
  private topologicalSort(tasks: Task[]): Task[] { ... }
  private assignTasksToAgents(tasks: Task[]): TaskAssignment[] { ... }
  private estimateMetrics(assignments: TaskAssignment[]): Metrics { ... }
  private detectCircularDependencies(graph: InstructionGraph): void { ... }
}
```

**Key algorithms:**

1. **Graph Decomposition (Kahn's Algorithm)**
   - Flattens nested instruction graph into atomic leaf tasks
   - Input: hierarchical task graph (nodes, edges)
   - Output: flat list of atomic tasks with dependency ordering
   - Complexity: O(V + E) where V = tasks, E = dependencies

2. **Topological Sort (Kahn's Algorithm)**
   - Orders tasks respecting dependencies (A must finish before B starts)
   - Input: tasks with dependency edges
   - Output: task order ensuring all dependencies satisfied
   - Detects cycles and errors if found

3. **Task-to-Agent Assignment (Greedy Best-Fit)**
   - Routes each task to best-matching agent based on affinity and availability
   - For each task:
     - Check affinity rule: if task type matches rule's preferred agent type, assign there first
     - Otherwise: assign to any available agent of matching capability
     - If no agent available: queue task (Phase 2 adds wait logic)
   - Complexity: O(T × A) where T = tasks, A = agents (linear scan)
   - **Note:** Not NP-hard optimal assignment (Phase 2 can add optimization layer)

4. **Metrics Estimation**
   - **Cost:** Sum of cost estimates for all tasks (Task.estimatedCost)
   - **Duration:** Length of critical path (longest sequential chain of tasks)
   - **Critical Path:** Topological order of tasks that determines total time
   - **Success Probability:** Aggregate of individual task success rates (default 95% per task)

**Input & Output:**

```typescript
// Input to simulate()
interface InstructionGraph {
  id: string;
  nodes: { id: string; type: string; spec: object }[];
  edges: { from: string; to: string }[];
}

interface Rule {
  id: string;
  name: string;
  priority: number; // 1–10
  agent_type_affinity: { task_type: string; agent_type: string }[];
  constraints: { max_agents: number; max_cost_per_task: number };
}

interface Constraints {
  maxAgents: number;
  maxCostBudget: number;
}

// Output from simulate()
interface SimulationResult {
  assignment_plan: TaskAssignment[];
  critical_path: string[]; // task_ids in dependency order
  estimated_cost: number;
  estimated_duration: number; // seconds
  success_probability: number; // 0–100
}

interface TaskAssignment {
  task_id: string;
  assigned_agent_id: string | null;
  estimated_cost: number;
  estimated_duration: number;
  status: "assigned" | "queued" | "unassigned";
}
```

#### `/app/api/orchestrator/rules/route.ts` – Rule CRUD

```typescript
// POST /api/orchestrator/rules – Create or update rule
// Body: { id?, name, priority, agent_type_affinity, constraints }
// Returns: { id, ...rule }

// GET /api/orchestrator/rules – List all rules
// Returns: { rules: Rule[] }

// DELETE /api/orchestrator/rules/:id – Delete rule
// Returns: { success: true }
```

**Storage:** In-memory map (Phase 2: persist to database)

#### `/app/api/orchestrator/simulate/route.ts` – Simulation Endpoint

```typescript
// POST /api/orchestrator/simulate
// Body: {
//   instruction_graph: InstructionGraph,
//   rule_set_id: string,
//   constraints_override?: { maxAgents?, maxCostBudget? }
// }
// Returns: SimulationResult
```

**Flow:**
1. Parse request → validate graph and rule set
2. Instantiate OrchestratorEngine with rules + constraints (apply overrides)
3. Call engine.simulate(graph)
4. Return result (non-destructive — no side effects)
5. **Latency target:** <2s for 50-task graph

#### `/app/api/executions/route.ts` – Execution Dispatch

```typescript
// POST /api/executions
// Body: {
//   assignment_plan: TaskAssignment[],
//   rule_set_id: string,
//   instruction_graph_id: string
// }
// Returns: { execution_id, created_at, status }
```

**Flow:**
1. Create execution record with metadata (execution_id, timestamp, rule set, agents)
2. Store in in-memory execution store (Phase 2: database)
3. For each task assignment:
   - Create task spec
   - Broadcast to agent via WebSocket: `{ execution_id, task_id, agent_id, task_spec }`
4. Return execution_id to frontend
5. Frontend polls `/api/executions/:id` for status updates (or receives via WebSocket)

#### `/app/api/executions/:id/route.ts` – Execution Detail

```typescript
// GET /api/executions/:id
// Returns: {
//   execution_id: string,
//   created_at: timestamp,
//   rule_set_id: string,
//   assignment_plan: TaskAssignment[],
//   agent_assignments: { agent_id: string, task_count: number }[],
//   status: "pending" | "processing" | "complete" | "failed",
//   actual_cost?: number,
//   actual_duration?: number,
//   completion_timeline: { task_id, agent_id, start_time, end_time }[]
// }
```

---

## Data Flow

### Simulation Flow

```
User loads graph    Frontend has InstructionGraph
                             ↓
User clicks Simulate         Frontend calls POST /api/orchestrator/simulate
                             ↓
Backend: POST /orchestrator/simulate
  ├─ Parse graph + rules
  ├─ Create OrchestratorEngine(rules, constraints)
  ├─ engine.simulate(graph):
  │   ├─ Decompose graph → atomic tasks
  │   ├─ Topological sort
  │   ├─ Assign tasks to agents (affinity matching)
  │   ├─ Estimate metrics
  │   └─ Return TaskAssignment[] + metrics
  └─ Return SimulationResult JSON
                             ↓
Frontend receives SimulationResult
  ├─ Store in state
  ├─ Render SimulationPanel
  ├─ Show task assignment table, critical path, metrics
  └─ Enable Constraint Adjuster sliders
                             ↓
User adjusts sliders (maxAgents, maxCostBudget)
  ├─ Frontend calls POST /orchestrator/simulate with new constraints
  └─ Repeat simulation loop (target <2s per re-simulation)
```

### Execution Flow

```
User clicks "Execute Plan"   Frontend has SimulationResult
                                      ↓
Confirmation dialog shown           Show metrics summary
  ├─ Total cost, duration, success probability
  └─ User clicks "Confirm"
                                      ↓
Frontend POST /api/executions
  ├─ Body: { assignment_plan, rule_set_id, graph_id }
  └─ Receives { execution_id, status: "pending" }
                                      ↓
Backend: POST /api/executions
  ├─ Create execution record
  ├─ Store metadata
  ├─ For each TaskAssignment:
  │   ├─ Create task spec
  │   ├─ Find agent by assigned_agent_id
  │   └─ Broadcast via WebSocket: { execution_id, task_id, agent_id, task_spec }
  └─ Return execution_id
                                      ↓
Agents receive tasks via WebSocket
  ├─ Update local task queue
  ├─ Change status to "processing"
  └─ Broadcast status update to Agent Dashboard
                                      ↓
Agent Dashboard receives updates
  ├─ Show task assignments per agent
  ├─ Update status badges (idle → processing)
  ├─ Update sparklines with live metrics
  └─ User monitors in real-time
                                      ↓
Agents complete tasks
  ├─ Report completion via heartbeat/WebSocket
  ├─ Status changes to "complete"
  └─ Agent Dashboard reflects completion
                                      ↓
All agents done              Execution status = "complete"
  ├─ Store actual metrics (actual_cost, actual_duration)
  ├─ Store completion timeline
  └─ Available for history & replay
```

---

## Key Design Decisions

### 1. Non-Destructive Simulation
- Simulation creates no side effects — no execution record, no task dispatch
- User can safely explore what-if scenarios with different constraints
- Only clicking "Execute" commits to task dispatch

### 2. Greedy Task Assignment (Not Optimal)
- Uses greedy best-fit heuristic instead of NP-hard optimization
- Justification: Good enough for MVP, fast (<2s for 50 tasks), easy to reason about
- Phase 2 can add optimization layer (constraint solver, branch-and-bound, etc.)

### 3. Heuristic Affinity (Not Hard Constraints)
- Agent type affinity is a preference hint, not a strict lock
- If preferred agent unavailable, system falls back to any agent of matching capability
- Justification: Real systems need flexibility; hard constraints cause unmet demand
- Phase 2 can add hard constraint support

### 4. In-Memory Storage
- Rules and execution records stored in memory (no database yet)
- Justification: MVP simplicity, fast iteration, no DB setup required
- Phase 2: migrate to PostgreSQL for persistence, audit trail, replay

### 5. Topological Sort for Task Ordering
- Uses Kahn's algorithm for dependency ordering
- Detects circular dependencies upfront (error instead of infinite loop)
- Justification: Correct handling of DAGs, fast O(V + E) algorithm, industry standard

### 6. WebSocket for Task Dispatch
- Reuses WebSocket transport from Feature 00 (Heartbeat)
- Agents already subscribed to WebSocket channel
- Tasks broadcast as JSON messages: `{ execution_id, task_id, agent_id, task_spec }`
- Justification: Low-latency, real-time, agents already connected

---

## Performance Considerations

### Simulation Latency Target: <2s per simulation

**Breakdown for 50-task graph:**
- Graph decomposition (topological sort): ~10ms
- Task-to-agent assignment (greedy): ~20ms
- Metrics estimation (aggregation): ~5ms
- JSON serialization + network: ~100ms
- **Total: ~135ms** (well under 2s target)

**Scaling:**
- 100-task graph: ~200ms
- 200-task graph: ~400ms
- 1000-task graph: ~2000ms (approaching limit)

**Optimizations (if needed):**
- Cache topological sort results (reuse if graph unchanged)
- Batch constraint adjustments (don't re-simulate on every slider change)
- Move to worker thread for large graphs (Phase 2)

### Execution History Growth

- Each execution stores: metadata, assignment plan (array of TaskAssignment objects)
- Size per execution: ~10KB–100KB depending on task count
- 1000 executions: ~100MB (in-memory limit)
- Phase 2: database storage, archival, pagination

---

## Error Handling

### Circular Dependency Detection
```typescript
// Example: Task A depends on B, B depends on A
// detectCircularDependencies() throws:
throw new Error("Circular dependency detected in graph: A → B → A");
```
- Checked upfront during decomposition
- Returns error in simulation response (user must fix canvas)

### Missing Agent Type
```typescript
// Example: Rule affinity specifies "quantum_computer" agent type
// But no such agents available
// Fallback: assignTasksToAgents() assigns to any available agent type
// Returns task assignment with warning in logs
```

### Budget Overrun
```typescript
// Example: maxCostBudget=$100, but 50 tasks cost $150 total
// assignTasksToAgents() drops low-priority tasks
// Returns partially-assigned plan with "queued" status for unassigned tasks
```

### Constraint Conflicts
```typescript
// Example: maxAgents=1, graph requires parallel execution
// Engine assigns serially (one agent, longer duration)
// Returns degraded metrics (longer duration, same cost)
// User can adjust constraint and re-simulate
```

---

## Testing Strategy

### Unit Tests: OrchestratorEngine

- **Test decomposition:** Mock graph → verify atomic task list is correct
- **Test topological sort:** Verify task order respects dependencies
- **Test affinity matching:** Mock rule with affinity → verify task routed to correct agent type
- **Test circular detection:** Graph with cycle → verify error thrown
- **Test metrics:** Mock tasks → verify cost/duration/success probability calculated correctly

### Integration Tests: API Routes

- **Test simulate endpoint:** POST with graph + rules → verify 200 response, valid result
- **Test execute endpoint:** POST simulation result → verify execution record created, WebSocket broadcast sent
- **Test CRUD rules:** Create, read, update, delete rules → verify persistence

### E2E Tests: User Workflows

- **Workflow 1:** Create rule → load graph → simulate → adjust constraints → re-simulate → execute
- **Workflow 2:** Create multiple rules → simulate with different priorities → verify ordering
- **Workflow 3:** Simulate with tight constraints → verify graceful degradation (queued tasks)

### Performance Tests

- **Benchmark decomposition:** 50-task graph, verify <2s simulation
- **Benchmark assignment:** 100 tasks × 100 agents, verify <500ms assignment
- **Load test:** 1000 concurrent simulations, verify <5s latency per request

---

## Future Enhancements (Phase 2+)

1. **Real Agent Pool:** Replace mock agents with real capability inventory (actual resource constraints)
2. **Constraint Solver:** Upgrade from greedy to optimal task assignment (ILP solver, genetic algorithm)
3. **Hard Constraints:** Support must-have affinity rules (not just hints)
4. **Cost/Duration Tuning:** Per-task-type cost/duration models from historical data
5. **Mid-Flight Reassignment:** Pause execution, move tasks between agents, resume
6. **Multi-Graph Comparison:** Execute same graph with different rules, visualize deltas
7. **Anomaly Escalation:** Failed tasks escalate to human operators (human-in-the-loop)
8. **Advanced Visualization:** Drag-to-reschedule Gantt, task dependency graph, cost breakdown by agent type
9. **Persistent Storage:** Rules and executions stored in PostgreSQL for audit trail and replay
10. **API Versioning:** Support v1/v2 endpoints for backward compatibility as system evolves

---

## References

- Feature 01 (Prompt Canvas): Produces instruction graphs consumed by orchestrator
- Feature 02 (Agent Dashboard): Receives task assignments from orchestrator, updates in real-time
- Feature 00 (Heartbeat): Provides WebSocket transport for task dispatch and agent communication
- Kahn's algorithm: https://en.wikipedia.org/wiki/Topological_sorting
- Greedy algorithms: https://en.wikipedia.org/wiki/Greedy_algorithm
