# Feature 00.5 On-Boarding & Testing Guide

Welcome! This is the consolidated guide for understanding, testing, debugging, and using the Prompt Canvas (Feature 00.5).

---

## Table of Contents

1. [Feature Overview](#feature-overview)
2. [Quick Start](#quick-start)
3. [Feature Tests](#feature-tests)
4. [Quick Reference](#quick-reference)
5. [Manual Test Trace (Code Flow)](#manual-test-trace-code-flow)
6. [Debugging Guide](#debugging-guide)
7. [Bug Fix Details](#bug-fix-details)
8. [Fix Status & Summary](#fix-status--summary)
9. [File Structure Reference](#file-structure-reference)
10. [API Reference](#api-reference)
11. [FAQ](#faq)
12. [Reporting Issues](#reporting-issues)

---

## Feature Overview

### Goal

Feature 00.5 delivers a production-ready visual canvas ("Prompt Canvas") for building multi-step workflows. Users drag and drop blocks (Task, Decision, Loop, Parallel, Text Input), connect them with edges, edit block properties, and execute the workflow against a mock orchestrator — with undo/redo, JSON export/import, and localStorage persistence.

### Capabilities

**What can you do?**
- Add 5 block types (Task, Decision, Loop, Parallel, Text)
- Drag/drop blocks and create edges
- Edit block properties with validation
- Undo/Redo up to 50 changes
- Export/Import canvas as JSON
- Execute canvas (mock orchestration)
- View execution artifacts & logs
- Persist state across page reloads

**What's not ready yet?**
- Connection validation (coming soon)
- Copy/paste blocks (coming soon)
- Real artifact generation (currently mocked)
- Mobile support (desktop only)

**Time to first use:** 30 seconds
**Learning curve:** ~5 minutes

---

## Quick Start

### Step 1: Start Dev Server
```bash
npm run dev
```
Wait for: `Ready in XXXms`

### Step 2: Open Browser
Navigate to **http://localhost:3000** (or 3001 if 3000 is busy).

### Step 3: Navigate to Canvas
Click the **"Prompt Canvas"** tab in the top navigation. You should see a blank canvas with a toolbar.

### Step 4: Open DevTools
Press **F12** and select the **Console** tab.

### Step 5: Add Your First Block
Click the **"Task"** button in the block toolbar. A **blue block** should appear on the canvas.

### Step 6: Watch Console
You should see 4 logs:
```
[PromptCanvas] Adding block: task
[PromptCanvas] New state: { nodes: 1, edges: 0 }
[CanvasFlow] Syncing nodes from parent: 1 nodes
[Canvas] State updated: { nodeCount: 1, edgeCount: 0 }
```

### Step 7: Verify
- If you see the blue block → **Working!**
- If you don't see it → Press **Home** key (zoom to fit), then see [Debugging Guide](#debugging-guide)

---

## Feature Tests

### Test 1: Dragging Blocks & Creating Edges
1. Click "Task" → blue block appears
2. Click "Decision" → orange block appears
3. Drag blocks from their center
4. Drag an edge from the bottom circle of one block to the top circle of another

**Expected:**
- Blocks move smoothly without lag
- Edges draw and curve smoothly between blocks
- No console errors (F12)

### Test 2: Properties Editor
1. Click on a block (it highlights)
2. Properties panel appears on the right
3. Change the Label, add a Description, set Agent Type
4. Click **Save**

**Expected:**
- Properties panel appears on select
- Fields are editable
- Block label updates on canvas after save

**Validation test:**
1. Add a Loop block (green)
2. Change Loop Count to 0
3. Try to Save → error "Loop count must be > 0"
4. Change back to 1 and save

### Test 3: Undo/Redo
1. Add a block (click "Task")
2. Click **Undo** button → block disappears
3. Click **Redo** button → block reappears
4. Use keyboard: `Ctrl+Z` (undo), `Ctrl+Y` (redo)

**History depth test:**
1. Add 5 blocks
2. Undo 5 times → all gone
3. Redo 5 times → all back

### Test 4: Export Canvas to JSON
1. Create a canvas with 2 Task blocks and 1 Decision block, connected with edges
2. Click **Export**
3. File `canvas-{timestamp}.json` downloads
4. Open in text editor

**Expected JSON structure:**
```json
{
  "version": "1",
  "nodes": [
    {
      "id": "node-123456",
      "data": { "label": "Task", "description": "...", "blockType": "task" },
      "position": { "x": 100, "y": 50 },
      "type": "block"
    }
  ],
  "edges": [
    { "source": "node-123456", "target": "node-234567", "id": "edge-xxx" }
  ],
  "viewport": { "x": 0, "y": 0, "zoom": 1 },
  "metadata": { "created": "...", "modified": "..." }
}
```

### Test 5: Import Canvas from JSON
1. Reload the page (F5) to clear the canvas
2. Click **Import**
3. Select a previously exported JSON file
4. Canvas recreates with the same blocks and edges

**Round-trip test:**
1. Export → `canvas-1.json`
2. Import `canvas-1.json`
3. Export again → `canvas-2.json`
4. Both files should be identical (except metadata timestamp)

### Test 6: Delete Node
1. Add 3 Task blocks
2. Click one to select it
3. Press **Delete** key

**Expected:**
- Selected block is deleted
- Connected edges also deleted
- Other blocks remain
- Action is undoable

### Test 7: Execute Canvas
1. Create a canvas with 3-5 blocks
2. Click **Execute** (blue button)
3. Artifact panel appears on the right

**Expected:**
- Artifact panel with execution ID
- Status badge shows "running"
- After ~3 seconds, status changes to "complete"
- Three tabs: **Output** (HTML preview, code, JSON schema), **Logs** (execution timeline), **Trace** (link to trace viewer)

### Test 8: Persistence (localStorage)
1. Create a canvas with blocks and edges
2. Close the browser tab
3. Reopen http://localhost:3000
4. Click "Prompt Canvas" tab

**Expected:**
- Blocks are still there
- Edges preserved
- Properties saved

---

## Quick Reference

### Colors & Block Types

| Color | Block Type | Use Case |
|-------|-----------|----------|
| Blue | Task | Do work, call an agent |
| Orange | Decision | Branch: if/else condition |
| Green | Loop | Repeat block N times |
| Purple | Parallel | Run blocks concurrently |
| Gray | Text Input | Collect user input |

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Ctrl+Z` / `Cmd+Z` | Undo |
| `Ctrl+Y` / `Cmd+Y` | Redo |
| `Delete` | Remove selected block |
| `Ctrl+Click` | Multi-select blocks |
| `Scroll wheel` | Zoom in/out |
| `Drag` (empty space) | Pan canvas |

### Core Actions

| Action | How |
|--------|-----|
| Add block | Click "Task" / "Decision" / "Loop" / "Parallel" / "Text Input" |
| Edit block | Click block → Properties panel → edit → Save |
| Connect blocks | Drag from bottom circle of source to top circle of target |
| Delete block | Select block → press Delete |
| Export | Click Export → downloads `canvas-{timestamp}.json` |
| Import | Click Import → select JSON file |
| Execute | Click Execute → artifact panel appears |

---

## Manual Test Trace (Code Flow)

This traces exactly what happens when you click the "Task" button.

### 1. Button Click
```typescript
// components/aei/prompt-canvas.tsx
onClick={() => addBlock("task")}
```

### 2. addBlock() in PromptCanvas
```typescript
// components/aei/prompt-canvas.tsx
const addBlock = useCallback((blockType: BlockType) => {
  const id = `node-${Date.now()}`
  const template = blockTemplates.find((t) => t.type === blockType)!
  const newNode: CanvasNode = {
    id,
    data: {
      label: template.label,
      description: template.description,
      blockType,
    },
    position: { x: Math.random() * 400, y: Math.random() * 400 },
    type: "block",
  }
  const newState = { ...state, nodes: [...state.nodes, newNode] }
  handleStateChange(newState)
  setHistory((prev) => canvasActions.pushHistory({ ...prev, present: newState }))
})
```
**Console:** `[PromptCanvas] Adding block: task` and `[PromptCanvas] New state: { nodes: 1, edges: 0 }`

### 3. handleStateChange()
```typescript
const handleStateChange = useCallback((newState: CanvasState) => {
  setState(newState)
  localStorage.setItem("canvas-state", JSON.stringify(newState))
}, [])
```
Updates parent state and persists to localStorage.

### 4. PromptCanvas Re-renders
React sees `state` changed → re-renders → passes `<CanvasFlow initialState={state} />`.

### 5. CanvasFlow Receives initialState
```typescript
export function CanvasFlow({ initialState, onStateChange, ... }: CanvasFlowProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialState?.nodes || [])
}
```

### 6. useEffect Syncs to React Flow
```typescript
useEffect(() => {
  if (initialState?.nodes) {
    setNodes(initialState.nodes)
  }
}, [initialState?.nodes, setNodes])
```
**Console:** `[CanvasFlow] Syncing nodes from parent: 1 nodes`

### 7. BlockNode Renders
```typescript
export default function BlockNode({ data, selected }) {
  const blockType = data.blockType  // "task"
  const colors = blockColors[blockType]  // blue
  return (
    <div className={cn("...", colors.bg, colors.border, ...)}>
      <Handle type="target" position={Position.Top} />
      <p>Task</p>
      <p>Process or action</p>
      <Handle type="source" position={Position.Bottom} />
    </div>
  )
}
```
Blue block appears on canvas.

### 8. Persistence Effect
```typescript
useEffect(() => {
  const state = { nodes, edges, viewport: { x: 0, y: 0, zoom: 1 } }
  localStorage.setItem("canvas-state", JSON.stringify(state))
  onStateChange?.(state)
}, [nodes, edges, onStateChange])
```
**Console:** `[Canvas] State updated: { nodeCount: 1, edgeCount: 0 }`

### Scenario Troubleshooting

| Scenario | Likely Cause | Fix |
|----------|-------------|-----|
| No logs at all | Button click not triggering `addBlock()` | Hard refresh `Ctrl+Shift+R` |
| Only first log | `handleStateChange()` not calling setState | Check function definition |
| All logs, no visible block | Viewport/zoom issue | Press Home key or scroll wheel |

---

## Debugging Guide

### Check 1: Browser Console for Errors
1. Press **F12** → **Console** tab
2. Look for red errors
3. Common errors:
   - `React Flow: Seems like you have not used zustand provider as an ancestor`
   - `Cannot read property 'nodes' of undefined`
   - `CSS file failed to load`

### Check 2: Debug Logs
Click "Task" button and check console for:
```
[PromptCanvas] Adding block: task
[PromptCanvas] New state: { nodes: 1, edges: 0 }
[CanvasFlow] Syncing nodes from parent: 1 nodes
[Canvas] State updated: { nodeCount: 1, edgeCount: 0 }
```
- If logs appear → block is created, likely viewport/zoom issue
- If no logs → button click not triggering

### Check 3: Verify Block in DOM
1. DevTools → **Elements** tab
2. `Ctrl+F` → search `react-flow__node`
3. If found → block exists but not visible (zoom issue, press Home key)
4. If not found → React Flow not rendering

### Check 4: Verify localStorage
In Console, paste:
```javascript
JSON.stringify(JSON.parse(localStorage.getItem("canvas-state")), null, 2)
```
- If `nodes` array has items → state saved correctly
- If `nodes` is empty → state not persisting

### Common Fixes

| Fix | When | How |
|-----|------|-----|
| Zoom/Viewport | Logs appear but no visible block | Press **Home** key to fit-to-view |
| React Flow CSS | Blocks appear as unstyled boxes | Hard refresh: **Ctrl+Shift+R** |
| Stale Cache | Code changes don't appear | DevTools → Settings → "Disable cache (while DevTools open)" → Reload |
| localStorage Full | "QuotaExceededError" | Run `localStorage.clear()` in console, then reload |
| Restart Dev Server | Was working, now broken | `Ctrl+C` in terminal, wait 2 seconds, `npm run dev` again |

### Full Debugging Checklist

- [ ] Dev server started: `npm run dev`
- [ ] Browser shows "Prompt Canvas" tab
- [ ] Click "Task" button
- [ ] Open DevTools (F12)
- [ ] Check Console for red errors
- [ ] Check Console for `[PromptCanvas]` debug logs
- [ ] Check Elements for `<div class="react-flow__nodes">`
- [ ] Check localStorage (paste command from Check 4)
- [ ] Press **Home** key to zoom-fit canvas
- [ ] Try hard refresh **Ctrl+Shift+R**

---

## Bug Fix Details

### Problem
Clicking block buttons was not creating visible blocks on the canvas.

### Root Cause
Parent (`PromptCanvas`) and child (`CanvasFlow`) maintained **separate, unsynced state**:
1. Parent had `state: CanvasState`
2. Child had its own `nodes`/`edges` from React Flow's `useNodesState`/`useEdgesState`
3. `addBlock()` updated parent state, but child's React Flow state was never updated
4. Result: block added to parent state but not rendered

### Solution
Implemented proper **controlled component** pattern:

1. **Fixed state initialization** — Parent loads from localStorage on mount
2. **Added `handleStateChange()` callback** — Syncs state + localStorage
3. **Updated `addBlock()`** — Uses handler to properly update state
4. **Pass `initialState` to CanvasFlow** — Child receives state via props
5. **Added sync effects in CanvasFlow** — `useEffect` hooks sync parent changes to React Flow

**Before (Broken):**
```
Button Click → addBlock() → Parent state updated ✅
            → Child (CanvasFlow) doesn't get update ❌
            → React Flow still empty ❌
            → Block not rendered ❌
```

**After (Fixed):**
```
Button Click → addBlock() → Parent state updated ✅
            → Parent re-renders with new initialState prop ✅
            → CanvasFlow receives initialState ✅
            → useEffect syncs to React Flow ✅
            → Block rendered ✅
```

Parent state is now the single source of truth. Child is a controlled component that receives state via props and reports changes via callback.

---

## Fix Status & Summary

| Metric | Status |
|--------|--------|
| Feature 00.5 | 6/6 Must-Have tasks complete |
| Block Creation Bug | Fixed (state sync) |
| Build (`npm run build`) | Passes |
| TypeScript | No errors |
| Dependencies | All resolved |
| Breaking Changes | None |
| New Dependencies | None |
| Ready for | Testing and dogfooding |

### Files Changed

1. **`components/aei/prompt-canvas.tsx`** (~80 lines)
   - Fixed state initialization with localStorage
   - Added `handleStateChange()` callback
   - Updated `addBlock()` to use handler
   - Fixed `importCanvas()` to use handler
   - Passed `initialState` and `onStateChange` to CanvasFlow

2. **`components/aei/canvas-flow.tsx`** (~30 lines)
   - Added `initialState` prop
   - Initialize React Flow with parent's nodes/edges
   - Added sync effect hooks
   - Added debug logging

---

## File Structure Reference

```
components/aei/
├── prompt-canvas.tsx       ← Main canvas UI (toolbar + panels)
├── canvas-flow.tsx         ← React Flow integration (drag/drop)
├── block-node.tsx          ← Block styling (5 types, colors)
├── properties-editor.tsx   ← Right sidebar (edit properties)
└── artifact-preview.tsx    ← Right sidebar (execution results)

lib/
├── canvas-state.ts         ← State management (undo/redo with Immer)
└── canvas-serialization.ts ← JSON export/import + validation

app/api/
└── executions/route.ts     ← Mock orchestrator (POST /api/executions)
```

### UI Layout

```
On Canvas:
├─ Toolbar (top): Add Block, Undo, Redo, Export, Import, Execute
├─ Block Templates (below toolbar): Task, Decision, Loop, Parallel, Text
├─ Canvas (center): Your blocks and edges
├─ Properties Panel (right, when selected): Edit block properties
└─ Artifact Panel (right, after execute): See execution results
```

---

## API Reference

### POST /api/executions
Send canvas to execute:
```bash
curl -X POST http://localhost:3000/api/executions \
  -H "Content-Type: application/json" \
  -d '{ "nodes": [...], "edges": [...] }'
```

Response:
```json
{
  "execution_id": "exec-1707395000123-abc1234",
  "status": "queued",
  "assignment_plan": {
    "agents": [
      {
        "agent_id": "agent-1",
        "agent_name": "code-gen-alpha",
        "assigned_nodes": ["node-123", "node-456"],
        "estimated_duration_ms": 6000,
        "estimated_cost": 75
      }
    ],
    "total_estimated_duration_ms": 6000,
    "total_estimated_cost": 225
  },
  "created_at": "2025-02-08T16:00:00Z"
}
```

### GET /api/executions?id={execution_id}
Check execution status:
```bash
curl http://localhost:3000/api/executions?id=exec-1707395000123-abc1234
```

---

## FAQ

**Q: Can I use the canvas on mobile?**
A: Not yet; desktop only. Mobile support planned for Phase 2.

**Q: What happens when I click Execute?**
A: Canvas JSON is sent to a mock orchestrator. Returns a fake assignment plan (which agent does what, estimated time/cost). No real code is generated yet (Phase 2).

**Q: Can I share my canvas with others?**
A: Export to JSON, send the file. They import JSON → same canvas. Git-friendly.

**Q: What if I mess up?**
A: Ctrl+Z undo (up to 50 changes back). Or clear localStorage and start fresh.

**Q: Can I copy/paste blocks?**
A: Not yet; deferred to Feature 00.5-SH-02. Add new blocks and copy properties manually for now.

---

## Reporting Issues

If something doesn't work, collect the following and report:

1. **Exact steps taken** (e.g., "Clicked Task button, nothing happened")
2. **Console output** — Any red errors? Which `[PromptCanvas]` logs appeared?
3. **localStorage state** — Paste output of `JSON.parse(localStorage.getItem("canvas-state"))`
4. **DOM check** — Search Elements for `react-flow__node` (found or not?)
5. **Browser & OS** — e.g., Chrome 120, Ubuntu 22.04

---

## Testing Checklist

Run through before reporting complete:

- [ ] Dev server running: `npm run dev`
- [ ] Browser shows app at http://localhost:3000
- [ ] Clicked "Prompt Canvas" tab
- [ ] Opened DevTools (F12)
- [ ] Clicked "Task" → blue block appears
- [ ] Clicked "Decision" → orange block appears
- [ ] Clicked block → properties panel opened
- [ ] Edited label and saved
- [ ] Created edge between two blocks
- [ ] Pressed Ctrl+Z → undo worked
- [ ] Pressed Ctrl+Y → redo worked
- [ ] Clicked Export → JSON downloaded
- [ ] Clicked Import → canvas recreated
- [ ] Delete key removed selected block
- [ ] Clicked Execute → artifact panel appeared
- [ ] Reloaded page (F5) → blocks persisted
- [ ] No lag during dragging

**All checked?** Feature 00.5 is ready.

---

**Version:** Feature 00.5 MVP
**Last Updated:** 2025-02-08
**Status:** Ready for Testing
