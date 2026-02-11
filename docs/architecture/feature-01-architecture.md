# Feature 01 – Prompt Canvas Architecture & Design

This document describes the system design, components, data models, and key architectural decisions for the production-grade Prompt Canvas (Feature 01).

---

## System Overview

### What Was Built

Feature 01 transforms the prototype canvas (Feature 00.5) into a production-grade, semantically-aware visual composition tool. Users drag blocks (task, decision, loop, parallel, text) onto a canvas, connect them with validated edges, and the system converts the visual structure into a structured instruction graph that the orchestrator can decompose and execute.

**Key innovation:** Canvas structure is not just visual sugar — it has **semantic meaning**. A task block → atomic agent task. A decision block → conditional branch. A parallel block → concurrent execution. The parser converts this visual meaning into an instruction graph.

### Major Components

```
┌─────────────────────────────────────────────────────────┐
│         Prompt Canvas User Interface                     │
├─────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌────────────────────────────────┐  │
│  │ Block        │  │  Canvas (React Flow)           │  │
│  │ Palette      │  │  ┌──────────┐  ┌──────────┐   │  │
│  │ (sidebar)    │  │  │  Task 1  │→│ Task 2  │   │  │
│  └──────────────┘  │  └──────────┘  └──────────┘   │  │
│  ┌──────────────┐  │  ┌──────────┐                  │  │
│  │ Version      │  │  │Decision  │                  │  │
│  │ History      │  │  └──────────┘                  │  │
│  │ (sidebar)    │  └────────────────────────────────┘  │
│  └──────────────┘  ┌────────────────────────────────┐  │
│                    │ Instruction Graph Preview      │  │
│                    │ (collapsible panel)            │  │
│                    └────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
         ↓ Parse
┌─────────────────────────────────────────────────────────┐
│    Instruction Graph Parser (Backend)                    │
│  lib/instruction-graph.ts                              │
│  - Type mapping: block → task                          │
│  - Dependency resolution: edges → dependencies         │
│  - Topological sort: priority assignment               │
│  - Cycle detection: prevent infinite loops             │
│  - Cost/duration estimation                            │
└─────────────────────────────────────────────────────────┘
         ↓ Execute
┌─────────────────────────────────────────────────────────┐
│         Orchestrator (Feature 04)                        │
│  Receives instruction graph → assigns agents            │
└─────────────────────────────────────────────────────────┘
```

### Key Architectural Patterns

**Vertical slice:** Canvas creation → validation → parsing → execution. Users see closed feedback loop.

**Semantic composability:** Canvas is not arbitrary graphics. Block types map 1:1 to orchestration concepts (task, decision, loop, parallel).

**Immutable versioning:** Every save creates immutable snapshot. No destructive updates. History is traceable.

**Delta processing:** On edit, system computes only changed nodes (not full re-parse) for <200ms response.

**Separation of concerns:**
- Frontend: UI, state management, interaction
- Backend: Parsing, validation, versioning, orchestrator integration
- Orchestrator: Execution (Feature 04)

---

## Component Architecture

### Frontend Components (React)

#### PromptCanvas (Main Container)
**File:** `components/aei/prompt-canvas.tsx`

**Responsibility:** Orchestrates all canvas sub-components, manages global state (canvas, selection, execution).

**State:**
```typescript
{
  canvas: {
    nodes: BlockNode[],
    edges: BlockEdge[],
    metadata: { createdAt, updatedAt, canvasId }
  },
  selectedNodeId: string | null,
  currentInstructionGraph: InstructionGraph | null,
  versionHistory: CanvasVersion[],
  undoStack: CanvasState[],
  redoStack: CanvasState[],
  loading: boolean,
  error: string | null
}
```

**Key methods:**
- `handleAddNode(type)` - Instantiate block from palette
- `handleDeleteNode(id)` - Remove block and attached edges
- `handleSave()` - Create version snapshot
- `handleParse()` - Convert canvas to instruction graph
- `handleExecute()` - Send graph to orchestrator
- `handleUndo()` / `handleRedo()` - Traverse undo/redo stacks

---

#### CanvasFlow (React Flow Wrapper)
**File:** `components/aei/canvas-flow.tsx`

**Responsibility:** Render canvas with React Flow, handle drag/drop, edge creation, viewport pan/zoom.

**Props:**
```typescript
{
  nodes: Node[],
  edges: Edge[],
  onNodesChange: (changes: NodeChange[]) => void,
  onEdgesChange: (changes: EdgeChange[]) => void,
  isValidConnection: (connection: Connection) => boolean,
  onDrop: (event: DragEvent) => void,
  onDragOver: (event: DragEvent) => void
}
```

**Key features:**
- React Flow's `<ReactFlow>` component with custom node/edge types
- `isValidConnection` callback intercepts edge creation, validates per CONNECTION_RULES
- `onDrop` handler creates node from palette drag event
- Multi-select, undo/redo integration

---

#### BlockNode (Custom React Flow Node)
**File:** `components/aei/block-node.tsx`

**Responsibility:** Render individual block with icon, label, handles.

**Props:**
```typescript
{
  data: BlockData,  // { label, type, properties }
  selected: boolean,
  onSelect: () => void
}
```

**Features:**
- Input/output handles (React Flow's `<Handle>`)
- Handle color feedback: green (valid), red (invalid) during drag
- Block icon from Lucide (Task icon, Decision icon, etc.)
- Properties display (truncated)
- Validation errors shown as red border

---

#### BlockPalette (Sidebar)
**File:** `components/aei/block-palette.tsx`

**Responsibility:** Sidebar with available block types, search filter, drag-to-canvas.

**Props:**
```typescript
{
  onAddNode: (type) => void
}
```

**Features:**
- Groups: Control Flow (task, decision, loop, parallel), Input (text), Output (artifact, preview)
- Drag-from-external: HTML5 drag API, `dataTransfer.setData()` passes block type
- Search filter: type "task" → show only Task blocks
- Collapse button: shrink to icon-only mode (w-12 instead of w-56)

---

#### VersionHistory (Sidebar Panel)
**File:** `components/aei/version-history.tsx`

**Responsibility:** Display saved versions with timestamp, diff summary, revert button.

**Features:**
- List of CanvasVersion objects sorted by timestamp (newest first)
- Each version shows: timestamp, diff badge (e.g., "3 added, 1 removed")
- Revert button: restore to that version (creates new snapshot)
- Pagination: load 20 per page (lazy load)

---

#### InstructionPreview (Panel)
**File:** `components/aei/instruction-preview.tsx`

**Responsibility:** Show parsed instruction graph with tasks, dependencies, execute button.

**Features:**
- Task list (one per parsed task)
- Dependency graph (visual or text)
- Summary: "X tasks, Y agents, $Z cost, ~Dm duration"
- Delta annotations: green "NEW", red "REMOVED", yellow "UPDATED"
- Execute button: send graph to orchestrator

---

### Backend Components (Node.js)

#### Instruction Graph Parser
**File:** `lib/instruction-graph.ts`

**Responsibility:** Convert canvas (nodes, edges) → instruction graph (tasks, dependencies, metadata).

**Main function:**
```typescript
function parseCanvasToInstructionGraph(
  nodes: BlockNode[],
  edges: BlockEdge[]
): InstructionGraph {
  // 1. Map block types to task types
  const tasks = nodes.map(node => ({
    task_id: `${node.type}-${node.id}`,
    task_type: mapBlockTypeToTaskType(node.type),
    description: node.data.label,
    agent_type_hint: inferAgentType(node.data),
    priority: 0  // Will be set by topological sort
  }));

  // 2. Extract dependencies from edges
  const dependencies = edges.map(edge => ({
    from: `${nodes.find(n => n.id === edge.source).type}-${edge.source}`,
    to: `${nodes.find(n => n.id === edge.target).type}-${edge.target}`,
    type: 'sequential'
  }));

  // 3. Topological sort → assign priorities
  const sorted = topologicalSort(tasks, dependencies);
  tasks.forEach((task, idx) => {
    task.priority = idx + 1;
  });

  // 4. Detect cycles (should not happen due to canvas validation, but safety check)
  if (hasCycle(dependencies)) {
    throw new Error('Instruction graph contains cycle');
  }

  // 5. Estimate cost/duration
  const metadata = {
    estimated_agents: estimateAgentCount(tasks),
    estimated_cost: estimateCost(tasks),
    estimated_duration: estimateDuration(tasks)
  };

  return { tasks, dependencies, metadata };
}
```

**Type mapping:**
- `task` block → `task` type
- `decision` block → `conditional` type (with branches)
- `loop` block → `iteration` type
- `parallel` block → `concurrent` type
- `text` block → `input` type
- `artifact` block → `output` type
- `preview` block → `visualization` type

**Cycle detection:** Depth-first search (DFS), O(V+E).

**Priority assignment:** Topological sort gives execution order.

---

#### Connection Validation Rules
**File:** `lib/connection-rules.ts`

**Responsibility:** Define which block type pairs can connect.

**Connection matrix:**
```
        Task  Decision  Loop  Parallel  Text
Task     ✓       ✓       ✓       ✓       ✗
Decision ✓       ✓       ✓       ✓       ✗
Loop     ✓       ✓       ✗       ✓       ✗
Parallel ✓       ✓       ✓       ✗       ✗
Text     ✗       ✗       ✗       ✗       ✗
```

**Key rules:**
- Text blocks cannot connect to anything (inputs only)
- Artifact/preview blocks are outputs (no outgoing edges)
- Loops cannot nest (prevent loop-in-loop)
- Parallel blocks require balanced fan-in/fan-out

**Cycle detection:**
```typescript
function wouldCreateCycle(
  from: string,
  to: string,
  edges: BlockEdge[]
): boolean {
  // BFS from `to` node: can we reach `from`?
  // If yes, connecting from→to would create cycle
  const queue = [to];
  const visited = new Set();

  while (queue.length > 0) {
    const node = queue.shift();
    if (node === from) return true;  // Cycle!
    if (visited.has(node)) continue;
    visited.add(node);

    // Add all children of `node` to queue
    edges
      .filter(e => e.source === node)
      .forEach(e => queue.push(e.target));
  }

  return false;  // No cycle
}
```

---

#### Canvas Versioning
**File:** `lib/canvas-versions.ts`

**Responsibility:** Create, store, retrieve, compare canvas versions.

**Data structure:**
```typescript
interface CanvasVersion {
  version_id: string,          // Unique ID
  canvas_id: string,           // Which canvas
  user_id: string,             // Who saved it
  timestamp: ISO8601,          // When saved
  parent_version_id: string,   // Previous version (for history chain)
  canvas_json: {               // Full canvas state
    nodes: BlockNode[],
    edges: BlockEdge[]
  },
  diff_summary: {              // Diff from previous version
    added: number,
    removed: number,
    modified: number
  }
}
```

**Key methods:**
- `save(canvas, userId)` → CanvasVersion
- `getHistory(limit, offset)` → CanvasVersion[]
- `revert(versionId)` → creates new version pointing to old state
- `computeDiff(v1, v2)` → DiffSummary

**Diff computation:**
```typescript
function computeDiff(v1: CanvasVersion, v2: CanvasVersion): DiffSummary {
  const nodes1 = new Set(v1.canvas_json.nodes.map(n => n.id));
  const nodes2 = new Set(v2.canvas_json.nodes.map(n => n.id));

  return {
    added: nodes2.size - nodes1.size,
    removed: nodes1.size - nodes2.size,
    modified: countModifiedNodes(v1, v2)
  };
}
```

---

#### API Endpoints

**POST /api/canvases/{canvas_id}/parse**
- Accept canvas JSON
- Call parseCanvasToInstructionGraph()
- Return instruction graph

**POST /api/canvases/{canvas_id}/parse?mode=delta**
- Accept canvas + previous graph ID
- Compute which nodes changed (hash-based)
- Re-parse only changed nodes
- Return delta with action annotations (ADD, REMOVE, UPDATE)

**POST /api/canvases/{canvas_id}/versions**
- Accept canvas JSON
- Save version via CanvasVersionStore
- Return CanvasVersion with diff summary

**GET /api/canvases/{canvas_id}/versions?limit=20&offset=0**
- Retrieve version history (paginated)
- Return array of CanvasVersion objects

---

## Data Models

### BlockNode
```typescript
interface BlockNode {
  id: string,                  // Unique ID within canvas
  type: 'task' | 'decision' | 'loop' | 'parallel' | 'text' | 'artifact' | 'preview',
  position: { x: number, y: number },
  data: {
    label: string,
    properties: Record<string, any>,  // Type-specific properties
    agentTypeHint?: string            // Inferred or manual agent type
  }
}
```

### BlockEdge
```typescript
interface BlockEdge {
  id: string,                  // Unique ID
  source: string,              // Source node ID
  target: string,              // Target node ID
  sourceHandle: string,        // Output port
  targetHandle: string,        // Input port
  animated: boolean            // Visual feedback
}
```

### CanvasState
```typescript
interface CanvasState {
  canvasId: string,
  nodes: BlockNode[],
  edges: BlockEdge[],
  metadata: {
    createdAt: ISO8601,
    updatedAt: ISO8601,
    title: string,
    description: string
  }
}
```

### InstructionGraph
```typescript
interface InstructionGraph {
  tasks: Array<{
    task_id: string,
    task_type: 'task' | 'conditional' | 'iteration' | 'concurrent' | 'input' | 'output' | 'visualization',
    description: string,
    agent_type_hint: string,
    priority: number,
    properties: Record<string, any>
  }>,
  dependencies: Array<{
    from: string,
    to: string,
    type: 'sequential' | 'conditional' | 'iterative'
  }>,
  metadata: {
    estimated_agents: number,
    estimated_cost: number,
    estimated_duration: string
  }
}
```

---

## Key Design Decisions

### Decision 1: React Flow for Canvas

**Choice:** Use React Flow library (not custom Canvas API).

**Why:**
- Battle-tested with 10,000+ GitHub stars
- Excellent performance on large graphs (100+ nodes smooth)
- Built-in undo/redo, multi-select, pan/zoom
- Custom node/edge rendering (full control over visuals)
- Active maintenance and community

**Alternatives:**
- Custom HTML5 Canvas: More control, but 2-3 weeks to ship stable
- Vis.js: Less maintained, poorer mobile support
- Cytoscape.js: Overkill for this use case

**Trade-offs:**
- Dependency on external library (bundle +300KB)
- Learning curve for React Flow API
- Some features (minimap, copy/paste) need custom implementation

**If we get it wrong:** Could extract nodes/edges and move to Cytoscape in 2-3 weeks.

---

### Decision 2: Semantic Block Mapping (Not Visual Decorators)

**Choice:** Block type maps directly to task type, not just cosmetic.

**Why:**
- Canvas structure has semantic meaning
- Parser can automatically infer agent types, priorities, cost estimates
- Orchestrator receives structured intent, not arbitrary graphics
- Future features (templates, automation) benefit from semantic structure

**Alternatives:**
- Canvas is just visual doodle, user must manually configure tasks
- Pro: More flexible, fewer constraints
- Con: Disconnected from execution, lots of manual work

**Trade-off:** Slightly more rigid (can't connect arbitrary block pairs), but much smarter downstream.

---

### Decision 3: Immutable Versioning (Not Destructive Updates)

**Choice:** Every save creates immutable snapshot, revert creates new snapshot (no history destruction).

**Why:**
- Full audit trail of all changes
- Can revert to any point without data loss
- Enables "what if" exploration (branch from old version)
- Supports multi-user workflows (Feature 09) without merge conflicts initially

**Alternatives:**
- Single mutable canvas state (simpler, less storage)
- Pro: Smaller footprint
- Con: No history, no rollback, risky for complex workflows

**Trade-off:** ~10-20% more storage for typical workflows (acceptable).

---

### Decision 4: Delta Re-Execution (Not Full Re-Parse)

**Choice:** On edit, compute only changed nodes and re-parse delta.

**Why:**
- Full 500ms parse acceptable for first time
- But 500ms latency on every edit is annoying
- Delta parse in ~200ms enables real-time-ish feedback
- Users don't realize parsing is happening (seamless experience)

**Implementation:**
- Hash each node: `hash = sha256(type + label + properties + connections)`
- On edit, compare old/new hashes
- Only nodes with different hashes are re-parsed
- Backend returns delta with ADD/REMOVE/UPDATE annotations

**Trade-off:** Extra hashing overhead (~10ms), but worth it for user experience.

---

### Decision 5: Backend Parsing (Not Frontend)

**Choice:** Canvas → Instruction graph conversion happens on backend.

**Why:**
- Single source of truth (backend owns the schema)
- Orchestrator (Feature 04) has same version of parser
- Easier to update parsing rules without frontend redeploy
- Can validate complex logic (cycle detection, cost estimation) consistently

**Alternatives:**
- Frontend parsing (faster, less latency)
- Pro: Instant feedback, no network round-trip
- Con: Duplicated logic, harder to sync

**Trade-off:** ~100-200ms latency per parse (acceptable given delta optimization).

---

## Integration with Upstream Features

### Feature 00.5 (Prototype Canvas)
- Uses React Flow (`F00.5-MH-01`) for underlying canvas engine
- Extends undo/redo (`F00.5-MH-02`) with versioning
- Builds on properties editor (`F00.5-MH-03`)
- Leverages canvas JSON serialization (`F00.5-MH-04`)
- Integrates with execution pipeline (`F00.5-MH-05`)

### Feature 00 (Foundations)
- Heartbeat protocol (`F00-MH-01`) used by execution
- WebSocket transport (`F00-MH-02`) for live agent updates

---

## Integration with Downstream Features

### Feature 02 (Agent Dashboard)
- Receives instruction graph from canvas parse
- Shows task assignments and real-time progress
- Visualizes which agents are working on which tasks

### Feature 04 (Orchestrator Hub)
- Primary consumer of instruction graph
- Decomposes tasks into atomic agent work
- Returns execution results to preview panel

---

## Performance Characteristics

**Measured on:** MacBook Pro (M1), Chrome 120, 50-block canvas

| Operation | Latency | Notes |
|-----------|---------|-------|
| Drag block | <16ms | React Flow optimized |
| Create edge | <8ms | Instant visual feedback |
| Edit properties | <50ms | Field validation + state update |
| Full parse (50 nodes) | ~400-500ms | Topological sort + estimation |
| Delta parse (1-5 changes) | ~150-200ms | Hash comparison + partial parse |
| Save version | ~50ms | In-memory (localStorage or local DB) |
| Revert to old version | ~100ms | Replace canvas state |
| Undo/redo | <16ms | Array operations only |

**Scalability:**
- Smooth at 50 nodes
- Acceptable at 100 nodes (some lag on drag)
- Laggy at 200+ nodes (needs further optimization)

**Optimization opportunities (Future):**
- Virtual scrolling for large node lists
- Incremental re-render (only affected nodes)
- Web Worker for parsing (offload to background thread)
- Memoization of expensive computations

---

## Known Limitations & Future Work

### Current Constraints

❌ **Desktop-only**
- React Flow not optimized for touch
- Handles too small for mobile
- Fix: Implement touch-friendly handle sizing and pan controls (Feature 02 stretch)

❌ **Single-user only**
- No real-time collaboration
- No multi-user awareness
- Fix: Add WebSocket-based sync and conflict resolution (Feature 09)

❌ **No copy/paste**
- Cannot duplicate blocks or sub-graphs
- Fix: Implement clipboard support (Feature 01-CH-02)

❌ **No templates**
- Every workflow starts from scratch
- Fix: Pre-built workflow patterns (Feature 01-SH-02)

❌ **No voice input**
- Cannot dictate workflow from speech
- Fix: Web Speech API integration (Feature 01-SH-01)

---

### Planned Improvements

🔄 **Minimap (Feature 01-CH-01)**
- Bottom-right viewport indicator
- Click to pan to different area
- Uses React Flow built-in MiniMap component

🔄 **Copy/Paste (Feature 01-CH-02)**
- Multi-select blocks
- Ctrl+C/V to duplicate with new IDs
- Preserve internal edges, drop external

🔄 **Annotations (Feature 01-CH-03)**
- Sticky notes on canvas
- Non-functional (visual documentation only)
- Excluded from instruction graph

🔄 **Natural Language to Canvas (Feature 01-SH-04)**
- "Build a Todo app workflow" → suggest canvas structure
- Uses LLM prompt engineering
- User reviews and accepts suggestions

---

### Related Features Depending on This

**Feature 02 (Agent Dashboard):**
- Reads instruction graph
- Shows task assignments
- Real-time progress updates

**Feature 04 (Orchestrator Hub):**
- Primary consumer of graphs
- Decomposes into agent work
- Must maintain schema compatibility

**Feature 09 (Multi-User Mode):**
- Extends versioning to collaborative editing
- Builds on immutable history model

---

## Testing Strategy

### Unit Tests
- Connection validation rules (all 25 pairs)
- Cycle detection (happy path + edge cases)
- Topological sort correctness
- Diff computation accuracy
- Hash-based node change detection

### Integration Tests
- Full canvas → parse → execute flow
- Version save/revert/history
- Delta parse correctness (partial vs. full)
- Undo/redo with 50+ changes
- JSON export/import round-trip

### Performance Tests
- 50-node canvas drag latency (<100ms)
- Parse latency (<500ms full, <200ms delta)
- Save latency (<50ms)

### End-to-End Tests
- Create workflow via UI
- Save multiple versions
- Revert to old version
- Edit and delta parse
- Execute and see results in dashboard

---

## References

- **Task file:** `/docs/tasks/feature-01-prompt-canvas.md` (task breakdown, progress notes)
- **On-boarding guide:** `/docs/on-boarding/feature-01-onboarding.md` (user guide, testing procedures)
- **React Flow docs:** https://reactflow.dev
- **Instruction graph consumer:** `/docs/architecture/feature-04-architecture.md` (orchestrator)
