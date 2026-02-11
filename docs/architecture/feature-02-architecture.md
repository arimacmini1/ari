# Feature 02 – Agent Dashboard Architecture & Design

---

## System Overview

The Agent Dashboard provides real-time visibility into agent swarms executing workflows from the Prompt Canvas. It shows a hierarchical tree of agents (Orchestrators → Workers), live status badges, inline sparkline metrics, and context menu actions (pause, terminate, inspect logs).

```
┌─────────────────────────────────────────────────────────────┐
│                    Agent Dashboard                           │
├──────────┬──────────────────────────────────────────────────┤
│ Agent    │  Hierarchical Agent Tree                         │
│ Tree     │  ┌─ Orchestrator-1 [processing] ██ ▄▂ ▃▅ ▂▁   │
│          │  │  ├─ Worker-1 [idle]          ▁▃ ▂▅ ▁▃ ▂▁   │
│          │  │  ├─ Worker-2 [processing]    ▅█ ▃▂ ▅▃ ▃▂   │
│          │  │  └─ Worker-3 [complete]      ▂▁ ▁▂ ▂▁ ▁▁   │
│          │  └─ Orchestrator-2 [idle]       ▁▂ ▁▃ ▁▂ ▁▁   │
│          │     └─ Worker-4 [waiting]       ▃▂ ▂▃ ▂▃ ▂▁   │
│ [✓]      │                                                  │
│ Select   │  Status: ● idle ● processing ● waiting           │
│          │          ● error ● complete                       │
│          │  Sparklines: CPU  Mem  Tok  Cost                 │
├──────────┴──────────────────────────────────────────────────┤
│ Right-click → [Reassign] [Pause] [Terminate] [Inspect Logs] │
└─────────────────────────────────────────────────────────────┘
         ↑ Real-time updates
┌─────────────────────────────────────────────────────────────┐
│  Mock WebSocket (dev) / Real WebSocket (production)          │
│  Sends agent_update every 2s: status, cpu, mem, tokens, cost │
└─────────────────────────────────────────────────────────────┘
```

### Key Architectural Patterns

- **Event-driven updates:** WebSocket pushes agent status/metrics; UI reacts
- **Ref-based stability:** Hook methods stored in refs to prevent React re-render cascades
- **Immutable state:** Agent tree updated via spread operators, never mutated
- **Mock-first development:** Mock WebSocket for dev, real WS via env var for production
- **Rolling window metrics:** In-memory sparkline data, max 300 points, 5-min eviction

---

## Component Architecture

### AgentPanel (Main Container)
**File:** `components/aei/agent-panel.tsx`

Orchestrates all sub-components and hooks. Manages agent state, WebSocket connection, metrics history, and orchestrator assignments.

**State:**
- `agents: Agent[]` — Full list of agents with status and metrics
- `selectedAgent: Agent | null` — Currently selected for detail/logs
- `logsModalOpen: boolean` — Logs modal visibility
- `isLoading: boolean` — Initial load state

**Hooks used:**
- `useAgentWebSocket()` — Real-time updates
- `useAgentMetricsHistory()` — Sparkline data
- `useOrchestratorAssignments()` — Parent-child assignments

**Critical pattern — ref-based hook access:**
```typescript
// Hook methods stored in refs to prevent infinite re-renders
const recordUpdateRef = useRef(metricsHistory.recordUpdate)
recordUpdateRef.current = metricsHistory.recordUpdate

// useEffect only depends on lastUpdate (primitive-ish), not hook objects
useEffect(() => {
  if (!lastUpdate) return
  setAgents(prev => {
    // Use ref.current instead of hook object directly
    recordUpdateRef.current(lastUpdate.agent_id, newMetrics)
    return applyAssignmentsRef.current(updated)
  })
}, [lastUpdate])  // NOT [lastUpdate, metricsHistory, orchestratorAssignments]
```

---

### AgentTree (Hierarchical Visualization)
**File:** `components/aei/agent-tree.tsx`

Renders agents as a nested tree with expand/collapse, checkboxes, status badges, sparklines, and context menus.

**Props:**
- `agents: Agent[]` — Full agent list
- `metricsHistory` — For sparkline rendering
- `onAgentSelect: (agent) => void` — Row click handler
- `onAgentAction: (agentId, action) => void` — Context menu action handler

**Features:**
- Tree structure built from `parentId` / `childIds` relationships
- Expand/collapse state persisted in localStorage
- Checkbox selection for multi-select
- Context menu: Reassign, Pause, Terminate, Inspect Logs
- Inline sparklines for CPU, memory, tokens, cost

---

### MetricSparkline (SVG Chart)
**File:** `components/aei/metric-sparkline.tsx`

Lightweight custom SVG sparkline. No external charting library.

**Props:**
- `data: number[]` — Array of data points
- `color: string` — Line/fill color
- `width: number` — Chart width (default 60px)
- `height: number` — Chart height (default 20px)

**Implementation:**
- SVG `<polyline>` for the line
- SVG `<polygon>` for fill area below line
- Auto-scales Y-axis to data range
- Tooltip via `<title>` element on hover

---

### AgentLogsModal
**File:** `components/aei/agent-logs-modal.tsx`

Modal dialog showing agent log lines with timestamps.

**Props:**
- `agentId: string` — Agent to fetch logs for
- `agentName: string` — Display name
- `isOpen: boolean` — Modal visibility
- `onClose: () => void` — Close handler

**Features:**
- Fetches from `GET /api/agents/{agentId}/logs`
- Timestamped log lines
- Copy-to-clipboard button
- Auto-scroll to latest entry

---

## Data Flow

```
Mock WebSocket (every 2s)
  │
  ├─ Sends: { type: "agent_update", agent_id, status, metrics, timestamp }
  │
  ▼
useAgentWebSocket hook
  │
  ├─ Parses message
  ├─ Updates lastUpdate state
  │
  ▼
AgentPanel useEffect (triggered by lastUpdate change)
  │
  ├─ Updates matching agent in agents array (immutable spread)
  ├─ Records metrics in history (via ref)
  ├─ Applies orchestrator assignments (via ref)
  ├─ Calls setAgents() with new array
  │
  ▼
AgentTree re-renders affected rows
  │
  ├─ Status badge color changes
  ├─ Metrics numbers update
  ├─ Sparklines extend with new data point
  │
  ▼
User sees real-time dashboard
```

---

## Data Models

### Agent
```typescript
interface Agent {
  id: string
  name: string
  type: "orchestrator" | "codegen" | "reviewer" | "tester" | "deployer"
  status: "idle" | "processing" | "waiting" | "error" | "complete" | "paused" | "terminated"
  parentId?: string
  childIds: string[]
  metrics: {
    cpu: number        // 0-100%
    memory: number     // 0-100%
    tokensPerMin: number
    cost: number       // cumulative $
  }
  lastHeartbeat: number  // timestamp
}
```

### AgentUpdate (WebSocket message)
```typescript
interface AgentUpdate {
  agent_id: string
  status?: Agent["status"]
  metrics?: Partial<Agent["metrics"]>
  timestamp: number
}
```

### MetricsSnapshot (sparkline history)
```typescript
interface MetricsSnapshot {
  timestamp: number
  cpu: number
  memory: number
  tokensPerMin: number
  cost: number
}
```

### TaskAssignment (orchestrator)
```typescript
interface TaskAssignment {
  assignment_id: string
  agent_id: string
  parent_agent_id?: string
  task_id: string
  task_type: string
  status: "assigned" | "started" | "in_progress" | "completed" | "failed"
  timestamp: number
}
```

---

## Key Design Decisions

### Decision 1: Mock WebSocket by Default

**Choice:** Always use mock WebSocket unless `NEXT_PUBLIC_WS_URL` env var is set.

**Why:**
- Next.js serverless cannot handle WebSocket upgrades
- Mock provides realistic development experience (updates every 2s)
- Single env var flips to real WS when server is deployed
- No runtime errors in development

**Alternative:** Try real WS first, fall back to mock on error.
**Rejected because:** Creates console errors, reconnection loops, poor DX.

---

### Decision 2: Ref-Based Hook Access in Effects

**Choice:** Store hook methods in refs, access via `ref.current` in useEffect.

**Why:**
- Custom hooks return new object references each render
- Putting hook objects in useEffect deps causes infinite re-render loops
- Refs provide stable access without triggering effects
- Only `lastUpdate` (the actual trigger) is in the dependency array

**Alternative:** Memoize hook return values with useMemo.
**Rejected because:** Still requires careful dependency management; refs are simpler and more reliable.

**Lesson learned:** Never put custom hook return objects directly in useEffect dependency arrays. Always use refs or destructure stable callbacks.

---

### Decision 3: Custom SVG Sparklines (No Library)

**Choice:** Hand-rolled SVG `<polyline>` sparklines.

**Why:**
- Lightweight (no external dependency)
- Renders 100+ sparklines (4 per agent × 25 agents) without perf issues
- Full control over styling and animation
- Bundle size stays small

**Alternative:** recharts, visx, or nivo.
**Rejected because:** recharts adds ~300KB. visx is lighter but still overkill for tiny inline charts. Custom SVG is <50 lines of code.

---

### Decision 4: In-Memory Metrics History

**Choice:** Store sparkline data in browser memory (useRef with Map), not in React state.

**Why:**
- Metrics history changes rapidly (every 2 seconds per agent)
- Storing in React state would cause re-renders on every data point addition
- Ref storage is invisible to React — only re-renders when agents state changes
- Rolling window with eviction prevents unbounded growth

**Constraints:**
- Max 300 data points per agent
- 5-minute window (older data evicted)
- Lost on page refresh (acceptable for real-time dashboard)

---

### Decision 5: Immutable Agent State Updates

**Choice:** Spread operators for all agent state mutations. Never mutate agents directly.

**Why:**
- React relies on reference equality for re-render decisions
- Immutable updates ensure correct component updates
- Easier to debug (can log prev and next state)
- Prevents subtle bugs from shared references

**Implementation:**
```typescript
setAgents(prev => prev.map(agent =>
  agent.id === updateId
    ? { ...agent, status: newStatus, metrics: { ...agent.metrics, ...newMetrics } }
    : agent
))
```

---

## Integration Points

### Upstream: Feature 01 (Prompt Canvas)
- Canvas produces instruction graphs via Parse
- Execute sends graphs to orchestrator
- Dashboard shows which agents are assigned to which tasks from the graph

### Upstream: Feature 00 (Foundations)
- Heartbeat protocol (F00-MH-01) provides agent liveness signals
- WebSocket transport (F00-MH-02) carries real-time updates
- Agent SDK (F00-MH-05) defines agent communication protocol

### Downstream: Feature 04 (Orchestrator Hub)
- Orchestrator assigns tasks to agents
- Dashboard displays assignment status
- Parent-child relationships reflect orchestrator hierarchy

### Downstream: Feature 03 (Orchestrator Hub UI)
- Depends on hierarchical tree (F02-MH-01)
- Depends on WebSocket updates (F02-MH-02)
- Depends on orchestrator integration (F02-MH-05)

---

## Performance Characteristics

| Operation | Latency | Notes |
|-----------|---------|-------|
| Initial tree render (25 agents) | <50ms | Instant |
| WebSocket update → row re-render | <16ms | Single row update |
| Sparkline data point addition | <1ms | Ref mutation, no re-render |
| Context menu open | <8ms | DOM event handler |
| Logs modal fetch | ~100ms | Mock API response |
| Pause/Terminate API call | ~50ms | Mock response |

**Scalability:**
- 25 agents: smooth
- 100 agents: should be smooth (virtualization-ready data structures)
- 200+ agents: may need react-window virtualization for scroll performance

---

## Known Limitations & Future Work

### Current Limitations

- **Mock-only WebSocket** — No real WS server; flip via `NEXT_PUBLIC_WS_URL`
- **Mock API responses** — Pause/terminate/logs return fake data
- **No virtualization** — Tree renders all rows; needs react-window at 200+ agents
- **No persistence** — Metrics history lost on refresh
- **Single-user** — No collaboration or shared dashboard state

### Planned Improvements (Should-Have)

- **F02-SH-01:** Status legend + filter panel (by type, project, status)
- **F02-SH-02:** Error detection and escalation alerts
- **F02-SH-03:** Agent search/quick filter
- **F02-SH-04:** Agent detail panel (expandable side view)
- **F02-SH-05:** Agent grouping by type/project
- **F02-SH-06:** Bulk actions (select multiple → batch pause/terminate)

### Planned Improvements (Could-Have)

- **F02-CH-01:** Capacity planning view
- **F02-CH-02:** Performance benchmarks
- **F02-CH-03:** 3D network visualization

---

## Testing Strategy

### Unit Tests
- Agent tree building from flat list to hierarchy
- Mock WebSocket message parsing
- Metrics history rolling window and eviction
- Sparkline SVG coordinate calculation

### Integration Tests
- WebSocket → AgentPanel → AgentTree render cycle
- Context menu action → API call → optimistic update
- Orchestrator assignment → tree restructure

### Manual Tests
- 25-agent dashboard loads without errors
- Real-time updates visible every 2 seconds
- Context menu all 4 actions work
- Sparklines show trending data
- Logs modal opens with content
- No infinite loops or freezes

---

## Bug Fix Log

| Date | Bug | Root Cause | Fix | File |
|------|-----|-----------|-----|------|
| 2026-02-09 | Mock WS never activated | Conditional always chose real WS | Use mock by default, env var for real | `use-agent-websocket.ts` |
| 2026-02-09 | `readyState` TypeError | `Object.create(WebSocket.prototype)` read-only getter | Plain object with own getter | `use-agent-websocket.ts` |
| 2026-02-09 | Infinite loop (WS hook) | `isConnected` in `connect` deps | `isConnectedRef`, removed from deps | `use-agent-websocket.ts` |
| 2026-02-09 | Infinite loop (AgentPanel) | Hook objects in useEffect deps | Refs for methods, deps only `lastUpdate` | `agent-panel.tsx` |

---

## References

- **Task file:** `/docs/tasks/feature-02-agent-dashboard.md`
- **On-boarding guide:** `/docs/on-boarding/feature-02-onboarding.md`
- **Feature 01 architecture:** `/docs/architecture/feature-01-architecture.md`
- **WebSocket hook:** `/lib/use-agent-websocket.ts`
