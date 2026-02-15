# Feature 03 – Orchestrator Hub On-Boarding Guide

Welcome! This guide covers the Orchestrator Hub — the command center for coordinating multi-agent workflows.

---

## Quick Start

1. Open the AEI app and click the **Orchestrator** tab
2. You'll see a **two-pane layout**: rule editor on the left, visualization + simulation on the right
3. Click **+ New Rule** to create a coordination rule (set priority, agent type affinity, constraints)
4. Load an instruction graph from the Prompt Canvas (or use a mock graph)
5. Click **Simulate** to see task assignments predicted by the orchestrator engine
6. Adjust constraints via sliders (max agents, max cost budget) → re-simulate instantly
7. Click **Execute Plan** to dispatch tasks to agents and start the execution
8. Monitor execution on the Agent Dashboard in real-time

**Time to first use:** 2–3 minutes
**Learning curve:** 5–10 minutes

---

## Feature Overview

### Definition of Done

A real user can open the Orchestrator Hub, define coordination rules (priority, dependencies, agent type affinity), ingest an instruction graph from the Prompt Canvas, trigger decomposition to atomic sub-tasks, review simulated task assignments, adjust constraints via sliders, re-simulate to see predicted outcomes, and execute the plan to dispatch tasks to real agents. The orchestrator handles swarms of 10–100 agents with <5s simulation time and correct task assignment based on rules.

### Key Capabilities

#### Rule Management
- **Create Rules:** Define coordination rules with name, priority (1–10), agent type affinity (code gen, test, deploy, etc.), and constraints (max agents, max cost/task).
- **Edit/Delete Rules:** Modify existing rules or remove them. Changes take effect immediately on next simulation.
- **Rule Persistence:** Rules stored in backend and retrieved on load.
- **Rule Visualization:** Graph showing rule dependencies and affinity mappings.

#### Orchestration Engine
- **Task Decomposition:** Takes instruction graph from Prompt Canvas and decomposes nested goals into atomic leaf tasks using topological sort (Kahn's algorithm).
- **Dependency Tracking:** Respects task dependencies — task A must complete before B starts.
- **Agent Assignment:** Routes tasks to agent types based on task semantics and rule affinity hints (code gen tasks → code_gen_agent, testing tasks → test_agent, etc.).
- **Circular Dependency Detection:** Detects and errors on circular task dependencies.
- **Fast Simulation:** Decomposes and assigns 50-task graphs in <2 seconds.

#### Simulation & Constraints
- **Non-Destructive Simulation:** Predict task assignments, costs, and duration without committing state.
- **Simulation Results:** Shows task assignment table, critical path, estimated metrics (cost, duration, success probability).
- **Constraint Adjustment:** Use sliders to adjust max agents, max cost budget, priority thresholds.
- **Real-Time Re-Simulation:** Re-simulate with new constraints in <2s, see delta in assignments.
- **Metrics Estimation:** Predicts total cost, total duration, critical path (longest sequential task chain), and success probability (0–100%).

#### Task Dispatch & Execution
- **Execute Plan:** Click "Execute" to commit simulation → creates execution record and broadcasts task assignments to agents.
- **Execution Tracking:** Each execution gets unique ID, stores rule set, assigned agents, and metadata for history/replay.
- **Agent Communication:** Tasks dispatched to agents via WebSocket with assignment spec (task_id, agent_id, task_spec).
- **Execution History:** View all past executions with cost, duration, status (complete/failed/cancelled).
- **Replay Viewer:** Re-run same instruction graph against current agent pool, compare assignment deltas.

### Known Limitations

- **Mock Agent Pool:** Simulation uses mock agents with unlimited capacity. Phase 2 adds real resource constraints and actual agent capability matching.
- **No Multi-Graph Versioning:** Can't compare outcomes across different instruction graphs yet (Phase 2 feature).
- **No Mid-Flight Reassignment:** Can't pause and reassign tasks after execution starts (Phase 2 feature).
- **No Cost/Duration Tuning:** Simulation uses default metrics. Phase 2 allows custom cost/duration per task type.
- **Limited Affinity Rules:** Agent type affinity is heuristic (hints, not hard locks). Phase 2 adds hard constraints and capability-based routing.
- **No Anomaly Escalation:** Failed tasks don't escalate to human operators (Phase 2 feature).

---

## Workflow Guide

### Creating Your First Rule

1. **Open Orchestrator Hub** → `/orchestrator` route
2. **Click "+ New Rule"** on the left sidebar
3. **Fill in rule details:**
   - **Name:** e.g., "High-Priority Code Generation"
   - **Priority:** Slider 1–10 (1=lowest, 10=highest). Tasks with higher priority get agent resources first.
   - **Agent Type Affinity:** Check boxes for agent types that should handle tasks from this rule (code_gen, test, deploy, etc.). Leave empty to allow any agent type.
   - **Max Agents:** Limit how many agents can work on tasks from this rule (e.g., max 5 agents).
   - **Max Cost Per Task:** Budget limit per atomic task (e.g., $0.50 max).
4. **Click "Save"** → rule stored in backend
5. **Verify:** Rule appears in left sidebar list

### Loading an Instruction Graph

1. **Compose a workflow** in the Prompt Canvas (Feature 01)
   - Build a visual graph of tasks, decisions, loops, and parallels
   - Example: "Search for X" → "Analyze results" → "Generate report"
2. **Click "Export to Orchestrator"** on the canvas
3. **Orchestrator Hub receives** the instruction graph automatically
4. **Graph preview** shows in the right pane with task count and structure summary

### Running a Simulation

1. **With instruction graph loaded and rules defined:**
2. **Click "Simulate"** button on the right pane
3. **System decomposes** the graph into atomic tasks and applies rules
4. **Simulation result displays:**
   - **Task Assignment Table:** Shows each task, assigned agent/pool, estimated cost, status
   - **Critical Path:** Top 3 longest sequential task chains (determines total duration)
   - **Metrics Summary:** Total estimated cost, duration, success probability
5. **Verify assignments** look reasonable:
   - Code gen tasks assigned to code_gen agents? ✓
   - High-priority tasks get resources first? ✓
   - Total cost within budget? ✓

### Adjusting Constraints & Re-Simulating

1. **In the Constraints Adjuster panel:**
   - **Max Agents Slider:** Reduce from 100 to 10. What happens to cost/duration?
   - **Max Cost Budget Slider:** Reduce from $1000 to $100. Tasks dropped or throttled?
   - **Priority Threshold Slider:** Increase from 5 to 8. Only high-priority tasks assigned?
2. **Click "Re-Simulate"** for each adjustment
3. **Observe deltas:**
   - Assignment table updates
   - Cost changes
   - Duration adjusts based on agent availability
   - Success probability may decrease if constraints too tight
4. **Find balance** between cost, speed, and reliability

### Executing the Plan

1. **Satisfied with simulation results?**
2. **Click "Execute Plan"** button
3. **Confirmation dialog appears** with final metrics summary
4. **Click "Confirm"** → execution record created, execution_id returned
5. **Tasks broadcast to agents** via WebSocket
6. **Agent Dashboard updates** in real-time:
   - Agents show new task assignments
   - Status badges change to "processing"
   - Sparklines update with live metrics
7. **Execution completes** when all agents report task completion

### Viewing Execution History

1. **Click "Executions" tab** to view all past runs
2. **List shows:** execution_id, created_at, rule_set_id, num_agents, cost, duration, status
3. **Click an execution** → detail view:
   - Original assignment plan
   - Actual vs. estimated metrics
   - Task completion timeline (Gantt chart)
4. **Click "Replay"** → re-runs same graph + rules against current agents, shows assignment deltas

---

## Testing Guide

### 1. Rule Management

- [ ] **Create new rule**
  - Click "+ New Rule" on sidebar
  - Expected: Modal opens with form fields (name, priority slider, affinity checkboxes, constraint sliders)
  - Fill in details and click "Save"
  - Expected: Rule appears in sidebar list

- [ ] **Edit rule**
  - Click edit icon on a rule in the sidebar
  - Expected: Modal opens with current values populated
  - Change priority to 8, add code_gen affinity, click "Save"
  - Expected: Rule updates in list and on canvas

- [ ] **Delete rule**
  - Click delete icon on a rule
  - Expected: Confirmation dialog appears
  - Click OK
  - Expected: Rule removed from list

- [ ] **Multiple rules coexist**
  - Create 3 different rules (different priorities, affinities)
  - Expected: All 3 visible in sidebar without conflicts
  - Verify: Each rule retains its own settings

### 2. Instruction Graph Loading

- [ ] **Mock graph loads on startup**
  - Open Orchestrator Hub
  - Expected: Default mock instruction graph displayed (e.g., 10-task workflow)
  - Graph preview shows task count and structure

- [ ] **Graph structure displays correctly**
  - Look at the graph preview
  - Expected: Shows root task, nested subtasks, dependencies as edges
  - Verify: No orphaned tasks or missing edges

### 3. Simulation Pipeline

- [ ] **Simulate with default rules**
  - Load graph and rules
  - Click "Simulate"
  - Expected: Simulation completes in <2s
  - Result panel shows task assignment table, critical path, metrics summary

- [ ] **Task assignments respect affinity**
  - Simulate with a rule: priority=10, affinity=code_gen only
  - Check assignment table
  - Expected: Code gen tasks assigned to code_gen agents, other tasks assigned to fallback agents
  - Verify: No violations of affinity rule

- [ ] **Dependency ordering respected**
  - Check critical path in results
  - Expected: Task A (dependency of B) appears before B in execution order
  - Verify: No circular dependencies detected

- [ ] **Metrics are reasonable**
  - Review estimated cost, duration, success probability
  - Expected: Cost > 0, duration > 0, success probability 50–100%
  - Verify: Numbers sensible for task graph size

### 4. Constraint Adjustment & Re-Simulation

- [ ] **Max Agents slider affects assignments**
  - Set max agents to 100, simulate → note cost/duration
  - Set max agents to 5, re-simulate → expected: cost/duration increase (fewer parallel agents)
  - Verify: Task count same, but sequential vs. parallel changes

- [ ] **Max Cost Budget affects priority**
  - Set budget to $1000, simulate → all tasks assigned
  - Set budget to $10, re-simulate → expected: only high-priority tasks assigned
  - Verify: Low-priority tasks queued or dropped

- [ ] **Re-Simulation completes instantly**
  - Adjust slider, click re-simulate
  - Expected: Results update in <1s (not waiting for computation)
  - Verify: No loading spinners or long delays

### 5. Execution Dispatch

- [ ] **Execute Plan creates execution record**
  - Click "Execute Plan"
  - Expected: Confirmation dialog shows final metrics
  - Click "Confirm"
  - Expected: Execution ID returned (e.g., `exec-12345-abcd`)

- [ ] **Tasks broadcast to agents**
  - With Agent Dashboard open in another tab, click "Execute"
  - Expected: Agent Dashboard updates in real-time
  - Status badges change to "processing"
  - Agent task assignments visible in dashboard

- [ ] **Execution metadata stored**
  - After execution completes, click "Executions" tab
  - Expected: New execution appears in history list
  - Click it → shows rule_set_id, created_at, assigned agents, status=complete

### 6. Execution History & Replay

- [ ] **Execution list displays**
  - Click "Executions" tab
  - Expected: List of all past executions (created_at, cost, duration, status)
  - Verify: Latest execution at top

- [ ] **Execution detail view**
  - Click an execution in the list
  - Expected: Detail page shows original assignment plan, actual metrics, Gantt timeline
  - Verify: Numbers match execution record

- [ ] **Replay functionality**
  - On execution detail page, click "Replay"
  - Expected: Same instruction graph + rule set run against current agents
  - Result shows: original assignments vs. new assignments (delta highlighting)
  - Verify: Helpful for understanding agent pool changes

### 7. Error Handling

- [ ] **Circular dependency detection**
  - Create a mock graph with cycle: Task A → B → C → A
  - Simulate
  - Expected: Error message "Circular dependency detected: A → B → C → A"
  - Verify: Graceful failure (no crash)

- [ ] **Missing agent type fallback**
  - Create rule with affinity for agent type that doesn't exist (e.g., "quantum_computer")
  - Simulate
  - Expected: Tasks assigned to nearest matching agent type or general pool (no error, graceful degradation)
  - Verify: Execution still possible

- [ ] **No console errors on load**
  - Open Orchestrator Hub, check browser console
  - Expected: Clean console (no red errors)
  - Verify: Only info logs from simulation and rule engine

### 8. Performance

- [ ] **50-task graph simulates in <2s**
  - Use a large mock graph (50+ tasks)
  - Click "Simulate"
  - Expected: Results returned in <2s
  - Verify: Responsive UI (no freezing)

- [ ] **100 agents rendered without lag**
  - If you execute with many agents assigned, Agent Dashboard should remain responsive
  - Expected: Dashboard handles 100+ agents at <500ms render time
  - Verify: Smooth scrolling, no jank

- [ ] **Multiple rule sets don't degrade performance**
  - Create 10 rules
  - Simulate with each
  - Expected: Each simulation completes in <2s consistently
  - Verify: No accumulating slowdown

---

## Common Tasks

### Task: Prioritize Urgent Work

**Scenario:** You have 100 pending tasks, but budget only covers 20. How do you ensure the most important ones execute first?

**Solution:**
1. Create a rule with **priority=10** and **max cost budget=$500**
2. Add affinity for your fastest/cheapest agent types
3. Simulate
4. Execute
5. Orchestrator assigns only high-priority tasks within budget
6. Check Agent Dashboard to monitor progress

### Task: Balance Speed vs. Cost

**Scenario:** You can execute all 50 tasks in 2 hours (100 agents, $1000 cost) or 8 hours (10 agents, $200 cost). Which is better?

**Solution:**
1. Create rule: priority=5, max agents=100, max cost=unlimited
2. Simulate → note time and cost
3. Adjust max agents to 10
4. Re-simulate → note new time and cost
5. Compare critical paths and budget impact
6. Execute the plan that balances your constraints

### Task: Debug Task Assignment Failures

**Scenario:** A critical task isn't being assigned to any agent. Why?

**Solution:**
1. Check the simulation result → task assignment table
2. Look for the task in the "Unassigned" or "Queued" section
3. Reason typically: affinity mismatch, budget exceeded, or circular dependency
4. Adjust rule: loosen affinity, increase budget, or split the task
5. Re-simulate to verify

### Task: Replay After Agent Failure

**Scenario:** One of your agents crashed. You want to know which tasks it was handling and rerun them.

**Solution:**
1. Go to Executions history
2. Click the execution that included the failed agent
3. Click "Replay"
4. Orchestrator re-assigns tasks to available agents (excluding crashed agent)
5. See delta: which tasks moved, which agent took over
6. Execute new plan to rerun orphaned tasks

---

## Architecture & Implementation Notes

### Orchestrator Engine (`/lib/orchestrator-engine.ts`)

The core logic that decomposes graphs and assigns tasks:

- **OrchestratorEngine class:** Accepts rule set, instruction graph, constraints
- **Task decomposition:** Flattens nested goals into atomic tasks using topological sort (Kahn's algorithm)
- **Rule evaluation:** Applies priority ordering, dependency constraints, affinity matching
- **Agent assignment:** Routes tasks to agent types via greedy best-fit heuristic (not NP-hard optimization)
- **Simulation:** Estimates cost, duration, critical path, success probability
- **Circular detection:** Catches circular dependencies before simulation

### API Endpoints

- **`POST /api/orchestrator/rules`** – Create or update a rule
- **`GET /api/orchestrator/rules`** – List all rules
- **`DELETE /api/orchestrator/rules/:id`** – Delete a rule
- **`POST /api/orchestrator/simulate`** – Run non-destructive simulation (returns assignment plan)
- **`POST /api/executions`** – Execute a plan (creates execution record, broadcasts tasks to agents)
- **`GET /api/executions`** – List all executions
- **`GET /api/executions/:id`** – Get execution detail

### Data Models

**Rule:**
```typescript
{
  id: string;
  name: string;
  priority: 1–10;
  agent_type_affinity: { task_type: string; agent_type: string }[];
  constraints: { max_agents: number; max_cost_per_task: number };
}
```

**SimulationResult:**
```typescript
{
  assignment_plan: TaskAssignment[];
  critical_path: string[]; // task_ids in order
  estimated_cost: number;
  estimated_duration: number; // in seconds
  success_probability: 0–100; // %
}
```

**TaskAssignment:**
```typescript
{
  task_id: string;
  assigned_agent_id: string | null; // null if unassigned/queued
  estimated_cost: number;
  estimated_duration: number;
  status: "assigned" | "queued" | "unassigned";
}
```

---

## Next Steps (Phase 2 / Should-Have Features)

- Real agent pool with actual capacity constraints
- Hard affinity constraints (not heuristic hints)
- Cost/duration tuning per task type
- Mid-flight reassignment (pause, move tasks, resume)
- Multi-graph comparison (execute same graph with different rules, see deltas)
- Anomaly escalation (failed tasks bubble to human operators)
- Advanced Gantt visualization with drag-to-reschedule

---

## Support & Troubleshooting

**Q: Simulation takes >2 seconds. What's wrong?**
A: Graph might be very large (200+ tasks) or engine has a performance regression. Try a simpler graph. If persistent, check `/api/orchestrator/simulate` logs.

**Q: Tasks assigned to wrong agent type. Why?**
A: Affinity is heuristic; if requested agent type unavailable, system falls back to any available. Tighten constraints or increase max agents to see if it helps.

**Q: Can't execute because of circular dependency error.**
A: Your instruction graph has a cycle (e.g., Task A depends on B, B depends on A). Fix the canvas: break the cycle or remove redundant dependency.

**Q: Execution didn't start. No broadcast to agents.**
A: Check Agent Dashboard — agents must be online and subscribed to WebSocket channel. Verify `NEXT_PUBLIC_WS_URL` env var is set correctly.

For more help, check `/docs/architecture/feature-03-architecture.md` or open an issue.

## Automated Slice Sync Log

- 2026-02-14 | task: F03-MH-09 | workflow: ari-self-bootstrap-df7b023d74 | task_file: docs/tasks/feature-03-orchestrator-hub.md
- 2026-02-14 | task: F03-MH-11 | workflow: ari-self-bootstrap-f03-mh-11-workflow-2026-02-14T20:51:50Z | task_file: docs/tasks/feature-03-orchestrator-hub.md
