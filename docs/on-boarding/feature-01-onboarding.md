# Feature 01 – Prompt Canvas On-Boarding Guide

Welcome! This guide helps you understand, test, and debug the production-grade Prompt Canvas (Feature 01).

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Feature Overview](#feature-overview)
3. [Testing Guide](#testing-guide)
4. [Quick Reference](#quick-reference)
5. [Debugging Guide](#debugging-guide)
6. [API Reference](#api-reference)
7. [Component Architecture](#component-architecture)
8. [FAQ](#faq)

---

## Quick Start

**Get the Prompt Canvas running in 2 minutes:**

1. Open the Prompt Canvas page in AEI
2. You'll see a blank canvas with a **left sidebar palette** containing block types
3. **Drag a "Task" block** from the palette onto the canvas
4. **Drag a second "Task" block** onto the canvas
5. **Click on the output handle** (small circle) of the first task, **drag to the input handle** of the second task
6. See the **green checkmark** on the connection (valid) vs. **red X** (invalid)
7. Click the **Save** button (top toolbar) → see version appear in history
8. Click **Parse** → see the instruction graph preview with tasks and dependencies
9. Click **Execute** → orchestrator receives the graph and assigns agents

**Time to first use:** 2 minutes
**Learning curve:** 5–10 minutes to master all block types

---

## Feature Overview

### Definition of Done

By week 5, a real user can:
- Open the Prompt Canvas
- Compose multi-step agent workflows using drag-drop blocks (task, decision, loop, parallel, text)
- Validated connections with type-specific properties
- Save/load versioned canvas states
- Use voice input to generate blocks from speech
- Trigger execution producing a structured instruction graph the orchestrator can decompose
- Handle 50+ blocks with no UI jank
- Support undo/redo across all mutations
- Round-trip through JSON export/import without data loss

### Key Capabilities

✅ **Block Types (7 total)**
- **Task:** Represents an atomic work unit for an agent
- **Decision:** Conditional branching (yes/no, if/else)
- **Loop:** Iteration over a collection or condition
- **Parallel:** Fan-out multiple tasks, fan-in their results
- **Text:** Free-form text or instruction input
- **Artifact:** Output from an agent (results)
- **Preview:** Display/visualization of intermediate results

✅ **Connection Validation**
- Rules per block type pair (task→task valid, text→text invalid, etc.)
- Visual feedback: **orange glow** (valid), **red X** (invalid)
- Circular dependency detection prevents infinite loops
- Snap-back animation on rejected connections

✅ **Canvas Versioning**
- Every "Save" creates immutable snapshot with timestamp
- Full version history with revert capability
- Diff viewer showing added/removed/modified nodes
- Auto-save every 60 seconds

✅ **Instruction Graph Parsing**
- Converts canvas blocks → atomic tasks
- Resolves dependencies from edge connections
- Estimates agents needed, cost, and duration
- Returns structured JSON for orchestrator

✅ **Delta Re-Execution**
- Edit canvas → system detects only changed nodes
- Re-parse in <200ms (vs. full 500ms parse)
- Dashboard shows which agents need reassignment

✅ **Performance**
- Smooth drag/drop with <100ms latency
- Render 50+ blocks without jank
- Round-trip JSON export/import

### Known Limitations

❌ **Not yet:**
- Voice input for block generation (Feature 01-SH-01)
- Canvas templates (Feature 01-SH-02)
- Natural language prompt-to-canvas (Feature 01-SH-04)
- Multi-user collaboration or real-time sync
- Mobile support (desktop only)

---

## Testing Guide

### Manual Test Checklist

Run these tests in order. ✓ = pass, ✗ = fail.

#### 1. Basic Block Operations

- [ ] **Drag block from palette**
  - Steps: Click and drag "Task" block from left sidebar onto canvas
  - Expected: Task block appears at cursor position with default name "Task 1"
  - Verify: Block has input/output handles (small circles)

- [ ] **Create multiple blocks**
  - Steps: Drag 5 different block types (task, decision, loop, parallel, text) onto canvas
  - Expected: All blocks appear with unique IDs and names
  - Verify: Each block type has correct icon and color

- [ ] **Edit block properties**
  - Steps: Click a task block → properties panel opens on right
  - Expected: Can edit "Name", "Description", "Agent Type Hint"
  - Verify: Changes reflected in block label immediately

- [ ] **Delete block**
  - Steps: Right-click on block → select "Delete" (or press Delete key)
  - Expected: Block removed, any connected edges also removed
  - Verify: No orphaned edges remain

#### 2. Connection Validation

- [ ] **Valid connection (task→task)**
  - Steps: Drag from output handle of Task A to input handle of Task B
  - Expected: Edge appears in green, connection succeeds
  - Verify: Edge visible, blocks connected

- [ ] **Valid connection (task→decision)**
  - Steps: Drag from Task output to Decision input
  - Expected: Edge appears in green
  - Verify: Connection succeeds

- [ ] **Invalid connection (text→text)**
  - Steps: Drag from Text A output to Text B input
  - Expected: Target handle glows **RED**, connection rejected
  - Verify: Handles snap back to start position, tooltip shows "Text blocks cannot connect to Text"

- [ ] **Circular dependency rejection**
  - Steps: Create Task A → Task B → Task C
  - Then: Try to connect Task C back to Task A
  - Expected: Connection rejected with red glow, visual warning appears
  - Verify: Snap-back animation, error message shown

- [ ] **Parallel fan-out/fan-in validation**
  - Steps: Connect Parallel block to 2 Task blocks (fan-out), then both to same target (fan-in)
  - Expected: All connections succeed (valid pattern)
  - Verify: Parallel pattern renders correctly

#### 3. Canvas Versioning

- [ ] **Save canvas**
  - Steps: Add 3 blocks and some connections, click "Save" button (top toolbar)
  - Expected: Save succeeds, version appears in history panel
  - Verify: Version shows timestamp, diff badge (e.g., "3 nodes added")

- [ ] **View version history**
  - Steps: Click "Versions" button → version history panel opens
  - Expected: List of all saved versions with timestamps
  - Verify: Can see diff summaries (nodes added/removed/modified)

- [ ] **Revert to previous version**
  - Steps: Add more blocks, save. Then click an older version in history → click "Revert"
  - Expected: Canvas restores to that version, new version created in history
  - Verify: Canvas shows old state, history has new "revert" entry with timestamp

- [ ] **Auto-save works**
  - Steps: Add a block, wait 60+ seconds without clicking Save
  - Expected: Canvas automatically saves (check version history)
  - Verify: New version appears without manual Save click

#### 4. Instruction Graph Parsing

- [ ] **Parse simple workflow**
  - Steps: Create 3-block linear workflow (Task1 → Task2 → Task3), click "Parse"
  - Expected: Instruction preview appears showing tasks and dependencies
  - Verify: Shows correct number of tasks, dependency arrows visible

- [ ] **Parse branching workflow**
  - Steps: Task1 → Decision → Task2 (yes path) and Task3 (no path)
  - Click "Parse"
  - Expected: Preview shows decision node with 2 conditional branches
  - Verify: Dependency graph matches canvas structure

- [ ] **Parse parallel workflow**
  - Steps: Task1 → Parallel → Task2, Task3, Task4 → merge Task
  - Click "Parse"
  - Expected: Preview shows Parallel block with 3 concurrent tasks
  - Verify: Cost/agent estimates realistic (e.g., 4 agents needed)

- [ ] **Parse with estimated cost**
  - Steps: Parse any workflow
  - Expected: Instruction preview shows estimated cost and duration
  - Verify: Numbers are reasonable (not 0 or negative)

#### 5. Delta Re-Execution

- [ ] **Full parse on first click**
  - Steps: Create 10-block canvas, click "Parse"
  - Expected: Full parse completes in <500ms
  - Verify: Instruction preview appears

- [ ] **Delta parse on subsequent edits**
  - Steps: Modify 1 block (change name), click "Parse" again
  - Expected: Parse completes in <200ms (faster than full)
  - Verify: Only modified block shown with "UPDATED" badge

- [ ] **Delta shows NEW/REMOVED/UPDATED**
  - Steps: Add new block, delete existing block, modify one block, click "Parse"
  - Expected: Preview shows badges: green "NEW", red "REMOVED", yellow "UPDATED"
  - Verify: Correct annotation for each change

#### 6. Execution Lifecycle

- [ ] **Execute workflow**
  - Steps: Create simple 2-block workflow, click "Parse", then click "Execute"
  - Expected: Orchestrator receives instruction graph, agents assigned
  - Verify: Dashboard updates with task assignments

- [ ] **Execution with real agents**
  - Steps: Execute a workflow with 3+ blocks
  - Expected: Agents appear in dashboard, tasks execute
  - Verify: Can see task completion and output artifacts

#### 7. Undo/Redo

- [ ] **Undo block creation**
  - Steps: Add a block, press Ctrl+Z
  - Expected: Block disappears, undo works
  - Verify: Block is gone

- [ ] **Redo block creation**
  - Steps: After undo, press Ctrl+Y
  - Expected: Block reappears
  - Verify: Block restored

- [ ] **Undo with 50+ changes**
  - Steps: Make 60 edits (add/delete/move blocks), undo repeatedly
  - Expected: Undo stack doesn't overflow, all changes reversible
  - Verify: Can undo all 60 changes without error

#### 8. JSON Export/Import

- [ ] **Export canvas as JSON**
  - Steps: Create 5-block workflow, click "Export" → download JSON file
  - Expected: JSON file contains nodes, edges, metadata
  - Verify: File is valid JSON, readable in text editor

- [ ] **Import JSON on fresh canvas**
  - Steps: Open new canvas, click "Import" → select exported JSON
  - Expected: Canvas restored exactly as saved
  - Verify: All blocks, edges, properties match original

- [ ] **Round-trip JSON without data loss**
  - Steps: Export → Import → Export again → compare JSONs
  - Expected: First and second exports are identical
  - Verify: No data lost in round-trip

#### 9. Performance at Scale

- [ ] **Render 50-block canvas smoothly**
  - Steps: Programmatically create 50-block canvas (or manually add many)
  - Expected: Drag/drop remains smooth, <100ms latency
  - Verify: No frame drops, no lag

- [ ] **Parse 50-node canvas in <500ms**
  - Steps: 50-block canvas, click "Parse"
  - Expected: Completes in <500ms
  - Verify: Timer shows <500ms

#### 10. Search/Filter in Palette

- [ ] **Search block types**
  - Steps: Type "task" in palette search box
  - Expected: Only "Task" block type appears
  - Verify: Filter works, can clear and see all again

- [ ] **Collapse palette**
  - Steps: Click collapse button (or toggle icon)
  - Expected: Palette shrinks to icon-only mode (width ~60px)
  - Verify: Icons still visible, canvas gets more space

---

## Quick Reference

### File Structure

```
components/aei/
├── prompt-canvas.tsx           ← Main canvas component
├── canvas-flow.tsx             ← React Flow wrapper
├── block-node.tsx              ← Block node rendering
├── block-palette.tsx           ← Sidebar block palette
├── version-history.tsx         ← Version history panel
└── instruction-preview.tsx     ← Parse preview panel

lib/
├── canvas-state.ts             ← Canvas data structure (nodes, edges)
├── connection-rules.ts         ← Validation rules, wouldCreateCycle()
├── instruction-graph.ts        ← parseCanvasToInstructionGraph()
├── canvas-versions.ts          ← Version storage, diff computation
└── canvas-utils.ts             ← Helper utilities

app/api/canvases/
├── parse/route.ts              ← POST /api/canvases/{id}/parse
├── parse/delta/route.ts        ← Delta parse
└── versions/route.ts           ← Version history CRUD
```

### Key Functions

**`lib/connection-rules.ts`**
- `isValidConnection(source, target)` → boolean
- `wouldCreateCycle(from, to, graph)` → boolean
- `CONNECTION_RULES` → 5×5 matrix of valid pairs

**`lib/instruction-graph.ts`**
- `parseCanvasToInstructionGraph(nodes, edges)` → InstructionGraph
- Returns: `{ tasks: [...], dependencies: [...], metadata: { estimated_agents, cost, duration } }`

**`lib/canvas-versions.ts`**
- `CanvasVersionStore.save(canvas)` → CanvasVersion
- `CanvasVersionStore.getHistory(limit)` → CanvasVersion[]
- `computeDiffSummary(v1, v2)` → `{ added, removed, modified }`

**`components/aei/prompt-canvas.tsx`**
- Main export
- Props: `canvasId`, `onExecute`, `readOnly`
- State: canvas, selectedNode, currentInstructionGraph

### Component Hierarchy

```
<PromptCanvas>
  <Toolbar>
    <SaveButton /> <ParseButton /> <ExecuteButton /> <VersionsButton />
  </Toolbar>
  <div className="flex">
    <BlockPalette />
    <CanvasFlow>
      <BlockNode /> (repeated for each block)
      <CustomEdge /> (repeated for each edge)
    </CanvasFlow>
    <VersionHistory /> (collapsible, appears on demand)
    <InstructionPreview /> (appears after parse)
  </div>
</PromptCanvas>
```

### Configuration

**Auto-save interval:** 60 seconds (configurable in prompt-canvas.tsx)
**Undo stack limit:** 50 entries (configurable in canvas-state.ts)
**Parse timeout:** 500ms for full parse, 200ms for delta
**Max nodes:** Tested at 50 nodes (smooth), 100+ nodes (may lag)

---

## Debugging Guide

### Common Issues & Solutions

#### Issue: Connection validation doesn't work (all connections allowed)

**Root cause:** `isValidConnection` callback not passed to React Flow, or CONNECTION_RULES not loaded.

**Fix:**
1. Check `canvas-flow.tsx` has prop: `isValidConnection={isValidConnection}`
2. Check `connection-rules.ts` is imported and CONNECTION_RULES matrix is populated
3. Verify `isValidConnection()` is called during drag (add console.log)

**Debug:**
```javascript
// In canvas-flow.tsx
console.log('Validating connection:', source, target, isValidConnection(source, target));
```

---

#### Issue: Circular dependency detection not working (can create cycles)

**Root cause:** `wouldCreateCycle()` BFS might have bug, or cycle detection not enabled.

**Fix:**
1. Check `wouldCreateCycle()` is called in `isValidConnection()`
2. Verify edge list is correctly populated (nodes should have `edges` property)
3. Test BFS manually: create 3-node line, try to connect last → first, should reject

**Debug:**
```javascript
// In connection-rules.ts
if (wouldCreateCycle(source, target, edges)) {
  console.log('CYCLE DETECTED:', source, '->', target);
  return false;
}
```

---

#### Issue: Undo/redo doesn't work

**Root cause:** Undo/redo state not connected to canvas state, or stack overflow.

**Fix:**
1. Check undo/redo buttons call `handleUndo()` / `handleRedo()`
2. Verify canvas state has `undoStack` and `redoStack` arrays
3. Check that every state change pushes to `undoStack`

**Debug:**
```javascript
// In canvas-state.ts
console.log('Undo stack size:', undoStack.length);
console.log('Can undo?', undoStack.length > 0);
```

---

#### Issue: Version history not saving

**Root cause:** Save button not calling API, or API endpoint not working.

**Fix:**
1. Check "Save" button calls `handleSave()`
2. Verify API endpoint `POST /api/canvases/{id}/versions` exists
3. Check network tab for failed requests

**Debug:**
```javascript
// In prompt-canvas.tsx
async function handleSave() {
  console.log('Saving canvas version...');
  const response = await fetch(`/api/canvases/${canvasId}/versions`, {
    method: 'POST',
    body: JSON.stringify(canvas),
  });
  console.log('Save response:', response.status);
}
```

---

#### Issue: Parse returns empty instruction graph

**Root cause:** `parseCanvasToInstructionGraph()` not processing nodes correctly.

**Fix:**
1. Check nodes and edges are passed to parse function
2. Verify task type mapping (task block → task in graph)
3. Check topological sort is correct (no reversed dependencies)

**Debug:**
```javascript
// In instruction-graph.ts
console.log('Parsing canvas with', nodes.length, 'nodes,', edges.length, 'edges');
const graph = parseCanvasToInstructionGraph(nodes, edges);
console.log('Result:', graph.tasks.length, 'tasks,', graph.dependencies.length, 'deps');
```

---

#### Issue: Performance lag with 50+ blocks

**Root cause:** Full re-render on every drag, or inefficient connection validation.

**Fix:**
1. Check React Flow `useCallback()` is used for drag handlers
2. Verify `isValidConnection()` doesn't do full graph traversal (should use BFS cache)
3. Use React DevTools Profiler to identify slow components

**Debug:**
```javascript
// In canvas-flow.tsx
console.time('dragEnd');
// ... handle drag ...
console.timeEnd('dragEnd');  // Should be <100ms
```

---

### Enable Debug Logging

Add this to `prompt-canvas.tsx`:

```javascript
const DEBUG = true;  // Set to false in production

function log(...args) {
  if (DEBUG) console.log('[Canvas]', ...args);
}

// Then use: log('Canvas initialized', canvas);
```

---

### Inspect Internal State

In browser console:

```javascript
// Access canvas state (if stored globally)
window.__CANVAS_STATE__  // If exported for debugging

// Check React Flow instance
window.__REACT_FLOW__

// Inspect undo stack size
console.log(canvasState.undoStack.length);
```

---

## API Reference

### `POST /api/canvases/{canvas_id}/parse`

Parse canvas into instruction graph.

**Request:**
```json
{
  "nodes": [
    { "id": "1", "type": "task", "data": { "label": "Task 1" }, ... },
    { "id": "2", "type": "decision", "data": { "label": "Check status" }, ... }
  ],
  "edges": [
    { "id": "e1-2", "source": "1", "target": "2" }
  ]
}
```

**Response:**
```json
{
  "tasks": [
    { "task_id": "task-1", "task_type": "task", "description": "Task 1", "priority": 1 },
    { "task_id": "task-2", "task_type": "decision", "description": "Check status", "priority": 2 }
  ],
  "dependencies": [
    { "from": "task-1", "to": "task-2", "type": "sequential" }
  ],
  "metadata": {
    "estimated_agents": 2,
    "estimated_cost": 0.05,
    "estimated_duration": "5m"
  }
}
```

---

### `POST /api/canvases/{canvas_id}/parse?mode=delta`

Parse only changed nodes (faster).

**Request:**
```json
{
  "nodes": [...],
  "edges": [...],
  "previous_graph_id": "graph-123"
}
```

**Response:**
```json
{
  "tasks": [
    { "task_id": "task-1", "action": "update", ...},
    { "task_id": "task-3", "action": "add", ...}
  ],
  "metadata": { ... }
}
```

---

### `POST /api/canvases/{canvas_id}/versions`

Save canvas version.

**Request:**
```json
{
  "canvas_json": { "nodes": [...], "edges": [...] },
  "user_id": "user-123"
}
```

**Response:**
```json
{
  "version_id": "v-456",
  "timestamp": "2026-02-08T10:30:00Z",
  "diff_summary": { "added": 3, "removed": 0, "modified": 1 }
}
```

---

### `GET /api/canvases/{canvas_id}/versions?limit=20&offset=0`

Get version history with pagination.

**Response:**
```json
{
  "versions": [
    { "version_id": "v-456", "timestamp": "...", "diff_summary": {...} },
    { "version_id": "v-455", "timestamp": "...", "diff_summary": {...} }
  ],
  "total": 42,
  "limit": 20,
  "offset": 0
}
```

---

## Component Architecture

### PromptCanvas (Main Container)

**Props:**
- `canvasId: string` - Canvas to edit
- `onExecute: (graph) => void` - Callback when Execute clicked
- `readOnly?: boolean` - Read-only mode

**State:**
- `canvas: CanvasState` - Nodes, edges, metadata
- `selectedNode: string | null` - Currently selected block
- `currentInstructionGraph: InstructionGraph | null` - Last parsed graph
- `versionHistory: CanvasVersion[]` - Saved versions
- `undoStack: CanvasState[]` - Undo history

**Methods:**
- `handleAddNode(type)` - Add new block
- `handleSave()` - Save version
- `handleParse()` - Parse to instruction graph
- `handleExecute()` - Send to orchestrator
- `handleUndo()` / `handleRedo()` - Undo/redo

---

### BlockNode (Individual Block)

**Props:**
- `data: BlockData` - Block metadata (label, type, properties)
- `selected: boolean` - Is this block selected?
- `onSelect: () => void` - Selection handler

**Renders:**
- Block icon (Lucide)
- Block label
- Input/output handles (React Flow)
- Connection validation visual feedback

---

### CanvasFlow (React Flow Wrapper)

**Features:**
- Drag/drop nodes
- Connection validation (`isValidConnection`)
- Pan/zoom
- Multi-select

**Props:**
- `nodes: Node[]`
- `edges: Edge[]`
- `onNodesChange: (changes) => void`
- `onEdgesChange: (changes) => void`
- `isValidConnection: (conn) => boolean`

---

## FAQ

**Q: How many blocks can I add?**
A: Tested and smooth up to 50 blocks. Beyond 100 may lag. For very large workflows, consider breaking into sub-workflows.

**Q: Can I undo all 50 changes?**
A: Yes! Undo stack supports up to 50 entries. Each action (add, delete, edit) is one entry.

**Q: What happens if I create a cycle?**
A: Connection is rejected with visual warning. Cycles break topological execution.

**Q: Can I export and re-import a canvas?**
A: Yes! Click "Export" to download JSON, then "Import" on a new canvas. Data is lossless.

**Q: How fast is the Parse?**
A: Full parse: ~500ms for 50 nodes. Delta parse (after edits): ~200ms.

**Q: What block types are available?**
A: Task, Decision, Loop, Parallel, Text, Artifact, Preview.

**Q: Can I collaborate with others in real-time?**
A: Not yet. Collaboration is coming in Feature 09 (Multi-User Mode).

**Q: Does it work on mobile?**
A: Not yet. Canvas is desktop-only for now.

---

## Links

- **Task file:** `/docs/tasks/feature-01-prompt-canvas.md`
- **Architecture:** `/docs/architecture/feature-01-architecture.md`
- **PRD:** `/docs/prd/master-prd-AEI.md#feature-01`
