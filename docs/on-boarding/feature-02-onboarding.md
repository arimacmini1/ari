# Feature 02 – Agent Dashboard On-Boarding Guide

Welcome! This guide covers the Agent Dashboard — your real-time mission control for monitoring and managing agent swarms.

---

## Quick Start

1. Open the AEI app and click the **Agents** tab
2. You'll see a **hierarchical tree** of agents (Orchestrators at top, workers nested underneath)
3. Watch **status badges** change in real-time (idle=gray, processing=blue, waiting=yellow, error=red, complete=green)
4. **Right-click** any agent → context menu with Pause, Terminate, Reassign, Inspect Logs
5. See **sparkline charts** for CPU, memory, tokens/min, and cost trending per agent

**Time to first use:** 30 seconds
**Learning curve:** 2–5 minutes

---

## Feature Overview

### Definition of Done

A real user can open the Agent Dashboard, see a live hierarchical tree of all active agents, watch status badges update in real-time, see sparklines for CPU/memory/tokens/cost trending, handle 100+ visible agents with <500ms dashboard latency, and take meaningful action: right-click any agent to reassign, pause, terminate, or inspect logs.

### Key Capabilities

- **Hierarchical Agent Tree:** Orchestrators at root, child agents nested and indented. Expand/collapse with arrow icons.
- **Real-Time Updates:** Mock WebSocket sends status + metrics updates every 2 seconds. Status badges change color immediately.
- **Context Menu Actions:** Right-click any agent → Pause/Resume, Terminate, Reassign (Phase 2 stub), Inspect Logs.
- **Sparkline Charts:** 4 inline SVG sparklines per agent row: CPU (blue), memory (orange), tokens/min (green), cost (red). 5-minute rolling window.
- **Agent Logs Modal:** Click "Inspect Logs" → modal with timestamped log lines, copy-to-clipboard, auto-scroll.
- **Orchestrator Assignments:** Parent-child relationships update live during execution. Multi-level hierarchies supported (3+ levels).
- **Checkbox Selection:** Select agents for future bulk actions. Multi-select supported.

### Known Limitations

- **Mock WebSocket only:** No real WS server yet. Mock simulates updates every 2s. Set `NEXT_PUBLIC_WS_URL` env var when a real WS server is available.
- **Reassign is stubbed:** Shows "Phase 2" alert. Needs orchestrator mid-flight reassignment support (Feature 04).
- **No filtering/search:** Status legend, filter panel, and search are Should-Have tasks (F02-SH-01, SH-03).
- **No agent detail panel:** Click-to-expand detail view is Should-Have (F02-SH-04).
- **No bulk actions:** Multi-select exists but batch pause/terminate is Should-Have (F02-SH-06).
- **No error alerting:** Anomaly detection and escalation is Should-Have (F02-SH-02).

---

## Testing Guide

### 1. Agent Tree Display

- [ ] **Tree loads with mock agents**
  - Open Agents tab
  - Expected: 25 mock agents in hierarchical tree (Orchestrators at top, workers nested)
  - Verify: Agent rows show ID, name, status badge, metrics

- [ ] **Expand/collapse works**
  - Click arrow icon on an Orchestrator node
  - Expected: Children collapse/expand
  - Verify: Expand state toggles correctly

- [ ] **Checkbox selection**
  - Click checkbox on an agent row
  - Expected: Row highlights, checkbox checked
  - Verify: Multiple selections work (click several)

### 2. Real-Time WebSocket Updates

- [ ] **Mock WebSocket connects (no errors)**
  - Open Agents tab, check browser console
  - Expected: `[WebSocket] Connected` and `[MockWebSocket] Subscribed to: subscribe:agents:all`
  - Verify: NO `WebSocket Error` in console

- [ ] **Status badges update every ~2s**
  - Watch agent rows for 10 seconds
  - Expected: Status badges change color (idle=gray, processing=blue, etc.)
  - Verify: Changes happen roughly every 2 seconds

- [ ] **Metrics update in real-time**
  - Watch CPU/memory/tokens/cost values on agent rows
  - Expected: Numbers change as mock updates arrive
  - Verify: Values are reasonable (CPU 0-100, memory 0-80, etc.)

### 3. Context Menu Actions

- [ ] **Right-click context menu appears**
  - Right-click any agent row
  - Expected: Menu with 4 options: Reassign, Pause, Terminate, Inspect Logs
  - Verify: Menu positioned near cursor

- [ ] **Pause/Resume agent**
  - Right-click agent → click "Pause"
  - Expected: Agent status changes to "paused" (grayed out)
  - Right-click again → click "Resume"
  - Expected: Agent status returns to previous state

- [ ] **Terminate agent**
  - Right-click agent → click "Terminate"
  - Expected: Confirmation dialog appears
  - Click OK → agent status changes to "terminated"
  - Verify: Terminated agents remain visible but grayed out

- [ ] **Inspect Logs**
  - Right-click agent → click "Inspect Logs"
  - Expected: Modal opens with timestamped log lines
  - Verify: Logs auto-scroll to bottom, copy-to-clipboard works

- [ ] **Reassign (stubbed)**
  - Right-click agent → click "Reassign"
  - Expected: Alert says "Phase 2"
  - Verify: No crash, graceful handling

### 4. Sparkline Charts

- [ ] **Sparklines render per agent**
  - Look at agent rows after ~10 seconds of updates
  - Expected: 4 tiny line charts per row (CPU, memory, tokens, cost)
  - Verify: Charts show trending data, not flat lines

- [ ] **Sparklines update with new data**
  - Watch sparklines over 30 seconds
  - Expected: Lines extend as new data points arrive
  - Verify: No jank or flicker during updates

### 5. Orchestrator Relationships

- [ ] **Parent-child tree structure**
  - Look at the agent tree
  - Expected: Orchestrator agents have child agents nested underneath
  - Verify: Indentation shows parent-child hierarchy

- [ ] **Multi-level nesting**
  - Look for Orchestrator → Sub-orchestrator → Worker patterns
  - Expected: 3+ levels of nesting render correctly
  - Verify: Expand/collapse works at each level

### 6. Error Handling

- [ ] **No console errors on load**
  - Open Agents tab fresh, check console
  - Expected: Clean console (no red errors)
  - Verify: Only `[WebSocket] Connected` and `[MockWebSocket] Subscribed` messages

- [ ] **No infinite re-render loops**
  - Open Agents tab, wait 30 seconds
  - Expected: Page remains responsive, no freezing
  - Verify: React DevTools shows stable render count (not climbing rapidly)

### 7. Performance

- [ ] **25 agents render without lag**
  - Open Agents tab
  - Expected: Tree renders instantly, interactions smooth
  - Verify: No frame drops during scroll or expand/collapse

---

## Quick Reference

### File Structure

```
components/aei/
├── agent-panel.tsx         ← Main panel (orchestrates tree, hooks, modals)
├── agent-tree.tsx          ← Hierarchical tree component
├── agent-logs-modal.tsx    ← Log inspection modal
└── metric-sparkline.tsx    ← SVG sparkline component

lib/
├── agent-tree.ts                    ← Agent types, tree building, mock data
├── use-agent-websocket.ts           ← WebSocket hook (mock + real)
├── use-agent-metrics-history.ts     ← Metrics rolling window for sparklines
└── use-orchestrator-assignments.ts  ← Task assignment tracking

app/api/agents/[agentId]/
├── pause/route.ts          ← POST pause/resume
├── terminate/route.ts      ← POST terminate
├── reassign/route.ts       ← POST reassign (stubbed)
└── logs/route.ts           ← GET agent logs
```

### Key Types

```typescript
// lib/agent-tree.ts
interface Agent {
  id: string
  name: string
  type: "orchestrator" | "codegen" | "reviewer" | "tester" | "deployer"
  status: "idle" | "processing" | "waiting" | "error" | "complete" | "paused" | "terminated"
  parentId?: string
  childIds: string[]
  metrics: { cpu: number, memory: number, tokensPerMin: number, cost: number }
  lastHeartbeat: number
}
```

### Key Hooks

- **`useAgentWebSocket()`** — Connects to mock WS, receives agent updates, handles reconnection
- **`useAgentMetricsHistory()`** — Rolling window of metrics (300 points, 5 min) for sparklines
- **`useOrchestratorAssignments()`** — Tracks task assignments and parent-child relationships

### Environment Variables

- **`NEXT_PUBLIC_WS_URL`** — Set to real WebSocket URL when WS server available. When unset, mock is used.

---

## Debugging Guide

### Issue: WebSocket connection error in console

**Root cause:** No real WebSocket server exists. Mock should be used.

**Fix (already applied):** The hook uses mock WebSocket by default. If you still see errors, verify `NEXT_PUBLIC_WS_URL` is NOT set in `.env.local` — if set to a non-existent server, real WebSocket will be attempted and fail.

**Debug:**
```javascript
// In use-agent-websocket.ts, the connect function should log:
console.log("[WebSocket] Connected")           // Mock connected
console.log("[MockWebSocket] Subscribed to:")  // Subscribed to updates
```

---

### Issue: Infinite re-render / page freezes

**Root cause (already fixed):** Hook objects in useEffect dependency arrays caused infinite loops. Fixed by using refs for hook methods.

**If it happens again:**
1. Check `agent-panel.tsx` useEffect dependency arrays
2. Ensure no object references (from hooks) are in deps — only primitive values like `lastUpdate`
3. Use React DevTools Profiler to identify which component is re-rendering

---

### Issue: Sparklines not showing data

**Root cause:** Sparklines need several updates before data is visible (needs 2+ data points to draw a line).

**Fix:** Wait 10+ seconds for mock updates to accumulate. Each update adds a data point.

**Debug:**
```javascript
// Check if metrics history is recording
const history = metricsHistory.getHistory("agent-1")
console.log("History points:", history.length)  // Should grow over time
```

---

### Issue: Context menu doesn't appear

**Root cause:** Right-click handler not attached to agent row.

**Debug:**
1. Check `agent-tree.tsx` for `onContextMenu` handler on each row
2. Verify event handler calls `onAgentAction(agentId, action)`
3. Check browser console for errors during right-click

---

### Issue: Agent logs modal is empty

**Root cause:** Mock API returns empty or error.

**Debug:**
1. Check network tab: `GET /api/agents/{agentId}/logs` should return 200
2. Verify the API route file exists: `app/api/agents/[agentId]/logs/route.ts`
3. Check console for fetch errors

---

## API Reference

### POST /api/agents/{agentId}/pause

Pause or resume an agent.

**Request:** `{ "pause": true }` or `{ "pause": false }`

**Response:** `{ "success": true, "agent_id": "...", "status": "paused" | "idle" }`

### POST /api/agents/{agentId}/terminate

Gracefully terminate an agent.

**Request:** (empty body)

**Response:** `{ "success": true, "agent_id": "...", "status": "terminated" }`

### POST /api/agents/{agentId}/reassign

Reassign agent to different task (stubbed for Phase 2).

**Request:** `{ "target_pool": "..." }`

**Response:** `{ "success": true, "message": "Queued for reassign" }`

### GET /api/agents/{agentId}/logs

Fetch last 50 log lines.

**Response:**
```json
{
  "agent_id": "agent-1",
  "logs": [
    { "timestamp": "2026-02-08T10:30:00Z", "level": "info", "message": "Agent started" },
    { "timestamp": "2026-02-08T10:30:01Z", "level": "info", "message": "Processing task-123" }
  ]
}
```

---

## FAQ

**Q: Why are agent updates simulated?**
A: Next.js serverless doesn't support WebSocket upgrades. A mock WebSocket simulates updates every 2 seconds. Set `NEXT_PUBLIC_WS_URL` when a real WS server is deployed.

**Q: How many agents can the dashboard handle?**
A: Tested with 25 mock agents. Designed for 100+ with virtualization-ready data structures. Beyond 200 may need react-window integration.

**Q: Can I pause/terminate real agents?**
A: The API routes exist but return mock responses. Real agent control requires the orchestrator (Feature 04) to be integrated.

**Q: Why doesn't Reassign work?**
A: Reassign needs mid-flight task handover from the orchestrator. Stubbed as "Phase 2" until Feature 04 is built.

**Q: How do sparklines work?**
A: Custom SVG components. Each agent has a rolling 5-minute window (max 300 data points) stored in browser memory. Data evicted after 5 minutes.

---

## Bug Fixes Applied

| Date | Bug | Root Cause | Fix |
|------|-----|-----------|-----|
| 2026-02-09 | WebSocket mock never activated | Conditional logic always routed to real WS on localhost | Use mock by default, real WS only when `NEXT_PUBLIC_WS_URL` set |
| 2026-02-09 | `Cannot set readyState` TypeError | `Object.create(WebSocket.prototype)` has read-only getter | Plain object with own getter backed by mutable variable |
| 2026-02-09 | Infinite re-render loop (WebSocket hook) | `isConnected` in `connect` dependency array | Use `isConnectedRef`, removed from deps |
| 2026-02-09 | Infinite re-render loop (AgentPanel) | Hook objects in useEffect deps create new refs each render | Use refs for hook methods, deps only contains `lastUpdate` |

---

## Links

- **Task file:** `/docs/tasks/feature-02-agent-dashboard.md`
- **Architecture:** `/docs/architecture/feature-02-architecture.md`
- **Feature 01 (Prompt Canvas):** `/docs/on-boarding/feature-01-onboarding.md`
