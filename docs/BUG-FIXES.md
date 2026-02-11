# Bug Fixes & Hotfixes

Documentation of critical bug fixes and hotfixes applied to the AEI project.

---

## [2026-02-08] Canvas Block Movement Infinite Loop (CRITICAL HOTFIX)

**Severity:** Critical
**Status:** ✅ Fixed
**Impact:** Canvas unusable - moving blocks causes React crash

### Problem

Moving any block in the Prompt Canvas triggered an infinite state update loop, causing React to crash with:
```
Maximum update depth exceeded. This can happen when a component
repeatedly calls setState inside componentWillUpdate or componentDidUpdate.
React limits the number of nested updates to prevent infinite loops.
```

### Root Cause

**Circular state dependency** between parent and child components:

**The Loop:**
1. User moves block → `onNodesChange` in ReactFlow → `nodes` state updates in CanvasFlow child
2. Child's useEffect (line 74) calls `onStateChange(state)` → notifies parent
3. Parent's `handleStateChange` updates its `state` → passes back as `initialState` prop
4. Child's useEffect (line 59) sees `initialState.nodes` changed → calls `setNodes()`
5. **Back to step 2 → infinite loop!**

**Code causing the issue** (`components/aei/canvas-flow.tsx`):

```typescript
// BEFORE (BAD):
useEffect(() => {
  if (initialState?.nodes) {
    setNodes(initialState.nodes)  // ❌ Syncs on every prop change
  }
}, [initialState?.nodes, setNodes])  // ❌ Runs when parent updates

useEffect(() => {
  const state = { nodes, edges, viewport: {...} }
  localStorage.setItem("canvas-state", JSON.stringify(state))
  onStateChange?.(state)  // Notifies parent
}, [nodes, edges, onStateChange])
```

This created a controlled/uncontrolled component hybrid that couldn't decide who owned the state.

### Solution

**Make CanvasFlow fully uncontrolled** - only initialize from `initialState` on mount, then manage its own state:

**Fixed code:**
```typescript
// AFTER (GOOD):
useEffect(() => {
  if (initialState?.nodes) {
    setNodes(initialState.nodes)  // ✅ Only on mount
  }
  if (initialState?.edges) {
    setEdges(initialState.edges)  // ✅ Only on mount
  }
}, [])  // ✅ Empty deps = runs once on mount only

useEffect(() => {
  const state = { nodes, edges, viewport: {...} }
  onStateChange?.(state)  // ✅ Notify parent (parent saves to localStorage)
}, [nodes, edges, onStateChange])
```

**Additional cleanup:**
- Removed redundant `localStorage.setItem` from child (parent already handles it)
- Combined node/edge initialization into single useEffect

### Files Changed

- `components/aei/canvas-flow.tsx`
  - Lines 59-71: Changed deps from `[initialState?.nodes]` to `[]` (mount only)
  - Line 81: Removed redundant localStorage save

### Verification

After the fix:
- ✅ Blocks can be moved without errors
- ✅ State updates propagate correctly to parent
- ✅ localStorage persists changes
- ✅ No infinite loop warnings in console
- ✅ Canvas remains responsive

### Prevention

**Rule:** When a child component notifies parent of state changes, and parent passes state back as props:
- **Either:** Only sync from props on mount (uncontrolled with sync-up)
- **Or:** Don't maintain child state at all (fully controlled)
- **Never:** Sync from props on every prop change while also updating parent

**Pattern to avoid:**
```typescript
// ❌ BAD - Creates infinite loop
useEffect(() => {
  setLocalState(propsState)
}, [propsState])  // Runs every time parent updates

useEffect(() => {
  onUpdate(localState)  // Tells parent about changes
}, [localState])  // Parent updates, triggers first effect again
```

**Correct patterns:**
```typescript
// ✅ GOOD - Uncontrolled with initial sync
useEffect(() => {
  setLocalState(propsState)
}, [])  // Only on mount

useEffect(() => {
  onUpdate(localState)
}, [localState])

// ✅ GOOD - Fully controlled
// No local state, use propsState directly
// Call onUpdate with new state, don't maintain copy
```

---

## [2026-02-08] Executions API Route Mismatch (CRITICAL HOTFIX)

**Severity:** Critical
**Status:** ✅ Fixed
**Impact:** Page load failures, 400/500 errors on all requests

### Problem

The dynamic route directory for the Executions API was named with literal backslash escape sequences: `\[executionId\]` instead of `[executionId]`. This prevented Next.js from recognizing the dynamic route segment, causing:

- "Requested and resolved page mismatch" errors in dev console
- 400/500 errors on all page loads
- Executions API endpoint inaccessible
- Routes manifest not registering the dynamic route

### Root Cause

Directory was created with escaped brackets (`\[` and `\]`) instead of unescaped brackets (`[` and `]`). Next.js dynamic routes require the segment name to be unescaped.

### Solution

1. **Renamed directory:** `app/api/executions/\[executionId\]/` → `app/api/executions/[executionId]/`
2. **Cleared build cache:** Removed `.next/` directory to force fresh routes manifest generation
3. **Verified:** Confirmed directory shows `[executionId]` with `ls app/api/executions/`

### Files Changed

- `app/api/executions/[executionId]/` (directory rename only)
- `app/api/executions/[executionId]/route.ts` (no code changes)

### Verification

After the fix:
- ✅ Directory structure shows `[executionId]` without backslashes
- ✅ Dev server starts without "page mismatch" errors
- ✅ `GET /` returns 200 (no 400/500)
- ✅ Executions API endpoints accessible

### Prevention

When creating dynamic routes in Next.js:
- Use square brackets unescaped: `[id]` not `\[id\]`
- Test that the directory name appears correctly when listing: `ls app/api/executions/`
- Clear `.next/` cache after route structure changes
- Verify dev server console shows no "mismatch" warnings
