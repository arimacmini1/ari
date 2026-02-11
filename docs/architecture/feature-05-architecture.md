# Feature 05 - AI Trace Viewer: Architecture Document

## Overview

The AI Trace Viewer is a modal-based interface for visualizing and exploring hierarchical decision traces from agent executions. It provides transparency into agent reasoning, confidence scoring, and decision context.

**Feature ID:** F05-MH-01
**Status:** Complete ✅
**Release:** MVP (Phase 1)

## System Architecture

### High-Level Flow

```
User clicks "View Trace" on execution card
         ↓
TraceViewerModal fetches data via API
         ↓
API returns TraceExecution with decision tree
         ↓
TraceTree renders root decisions
         ↓
TraceNode recursively renders tree (lazy-load)
         ↓
User clicks Expand → DecisionContextDialog shows full context
         ↓
User clicks Export JSON → Downloads file
```

## Components

### 1. Data Model (`lib/trace-model.ts`)

**Purpose:** TypeScript interfaces and type definitions

**Key Interfaces:**

```typescript
interface DecisionNode {
  node_id: string;
  label?: string;
  decision_context: string;
  confidence_score: number;      // 0-100
  timestamp: string;              // ISO 8601
  decision_outcome: string;
  alternatives_considered?: Alternative[];
  agent_id: string;
  cost?: number;
  duration?: number;
  children?: DecisionNode[];
}

interface TraceExecution {
  execution_id: string;
  agent_id: string;
  start_time: string;
  duration: number;               // seconds
  cost: number;                   // USD
  status: 'success' | 'warning' | 'failed' | 'pending';
  root_decisions: DecisionNode[];
}
```

**Helper Functions:**

| Function | Purpose |
|----------|---------|
| `getContextPreview(text, maxChars)` | Truncate context for display |
| `formatConfidence(score)` | Format as percentage string |
| `getConfidenceColor(score)` | Return Tailwind color class |
| `flattenDecisionTree(nodes)` | Convert tree to flat list |
| `countDecisionNodes(nodes)` | Count total nodes |
| `getTreeDepth(nodes)` | Calculate tree depth |

### 2. API Route (`app/api/traces/[executionId]/route.ts`)

**Endpoint:** `GET /api/traces/[executionId]`

**Request:**
```
GET /api/traces/exec-001
```

**Response:**
```json
{
  "trace": {
    "execution_id": "exec-001",
    "agent_id": "orchestrator-main",
    "start_time": "2026-02-09T10:00:00Z",
    "duration": 12.4,
    "cost": 0.42,
    "status": "success",
    "root_decisions": [
      { /* DecisionNode */ }
    ]
  }
}
```

**Error Response:**
```json
{
  "error": "Trace not found"
}
```
Status: 404

**Implementation Details:**

- Hardcoded mock data for `exec-001` and `exec-002`
- Generates dynamic mock traces for any other execution ID
- Next.js 16 compatible with `params: Promise<>`
- No database calls (MVP in-memory)

### 3. Modal Component (`components/aei/trace-viewer-modal.tsx`)

**Props:**
```typescript
interface TraceViewerModalProps {
  executionId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}
```

**Responsibilities:**

1. **Data Fetching**
   - Fetches trace when modal opens
   - Manages loading/error states
   - Handles API failures gracefully

2. **UI Layout**
   - Radix Dialog wrapper (max-w-6xl, h-[90vh])
   - Header with execution ID and status badge
   - Passes trace data to TraceTree

3. **State Management**
   - `trace`: TraceExecution data
   - `loading`: Boolean for loading state
   - `error`: Error message string

**Key Code:**
```typescript
useEffect(() => {
  if (!open || !executionId) return;

  setLoading(true);
  fetch(`/api/traces/${executionId}`)
    .then(res => res.json())
    .then(data => setTrace(data.trace))
    .catch(err => setError(err.message))
    .finally(() => setLoading(false));
}, [executionId, open]);
```

### 4. Tree Container (`components/aei/trace-tree.tsx`)

**Responsibilities:**

1. **Header Display**
   - Shows execution metadata (ID, agent, duration, cost)
   - Column headers for tree structure
   - Export JSON button

2. **Tree Rendering**
   - Maps `root_decisions` to TraceNode components
   - Handles empty state
   - Manages layout and spacing

3. **Event Handling**
   - Passes `onExpandContext` callback to nodes
   - Handles Export JSON click

**Key Code:**
```typescript
const handleExportJson = () => {
  const blob = new Blob([JSON.stringify(trace, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `trace_${trace.execution_id}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
```

### 5. Tree Node Component (`components/aei/trace-node.tsx`)

**Props:**
```typescript
interface TraceNodeProps {
  node: DecisionNode;
  depth?: number;
  onExpandContext?: (context: string, nodeId: string) => void;
}
```

**Responsibilities:**

1. **Node Rendering**
   - Displays decision with all fields
   - Shows confidence bar with color-coding
   - Shows status icon based on confidence

2. **Expand/Collapse**
   - Manages `isExpanded` state
   - Recursively renders children only when expanded
   - Rotates chevron 90° when open

3. **Interaction**
   - Click chevron to toggle expand
   - Click "Expand" to open context dialog

**Confidence Color Logic:**
```typescript
const color = value >= 90 ? 'bg-emerald-400'
            : value >= 80 ? 'bg-amber-400'
            : 'bg-destructive';
```

**Recursive Rendering:**
```typescript
{isExpanded && hasChildren && (
  <div className="border-l-2 border-border ml-6">
    {node.children!.map((child) => (
      <TraceNode
        key={child.node_id}
        node={child}
        depth={depth + 1}
        onExpandContext={onExpandContext}
      />
    ))}
  </div>
)}
```

### 6. Context Dialog (`components/aei/decision-context-dialog.tsx`)

**Props:**
```typescript
interface DecisionContextDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nodeId: string;
  context: string;
}
```

**Features:**

- Radix Dialog with max-w-3xl, max-h-[60vh]
- Monospace font for technical context
- Scrollable if content exceeds max height
- Copy to Clipboard button with feedback
- Close button

## Data Flow

### Initial Load
```
executions/page.tsx
    ↓
[Click "View Trace" button]
    ↓
TraceViewerModal opens with executionId
    ↓
useEffect triggers fetch
    ↓
GET /api/traces/[executionId]
    ↓
API returns { trace: TraceExecution }
    ↓
TraceViewerModal renders TraceTree with data
```

### Expand Node
```
User clicks chevron on TraceNode
    ↓
setIsExpanded(!isExpanded)
    ↓
Component re-renders
    ↓
Children display if expanded=true
```

### View Context
```
User clicks "Expand" button
    ↓
onExpandContext(context, nodeId) callback
    ↓
TraceTree calls setSelectedContext
    ↓
DecisionContextDialog opens with context
```

## Design Patterns

### 1. Lazy Loading
Only expanded nodes render their children. This prevents rendering huge trees upfront.

```typescript
// Children only render if expanded
{isExpanded && hasChildren && (
  <div>
    {node.children.map(...)}
  </div>
)}
```

### 2. Recursive Component
TraceNode renders itself recursively for arbitrary tree depth.

```typescript
<TraceNode
  node={child}
  depth={depth + 1}
  onExpandContext={onExpandContext}
/>
```

### 3. Callback Pattern
Modal uses callbacks to communicate with children without prop drilling.

```typescript
// In TraceTree
onExpandContext={handleExpandContext}

// In TraceNode
onExpandContext?.(context, nodeId)
```

### 4. Responsive Layout
Uses Tailwind classes for responsive design:
- Column widths adjust to content
- Overflow handled with ellipsis
- Indentation via margin classes

## Integration Points

### With Executions Page
```typescript
// app/executions/page.tsx

// State for modal
const [traceModalOpen, setTraceModalOpen] = useState(false);
const [selectedExecutionId, setSelectedExecutionId] = useState(null);

// Button click
<Button onClick={() => {
  setSelectedExecutionId(execution.execution_id);
  setTraceModalOpen(true);
}}>
  View Trace
</Button>

// Modal component
<TraceViewerModal
  executionId={selectedExecutionId}
  open={traceModalOpen}
  onOpenChange={setTraceModalOpen}
/>
```

## Performance Considerations

### Current (MVP)
- **Lazy Loading:** Only renders expanded nodes
- **Time Complexity:** O(n) where n = visible nodes
- **Space Complexity:** O(1) per render (recursive depth-first)
- **Suitable for:** Trees up to 100-500 visible nodes

### Future Improvements (Phase 2)
- **Virtualization:** Use @tanstack/react-virtual for large lists
- **Memoization:** useMemo for expensive operations
- **Pagination:** Limit API response size
- **Caching:** Cache trace data in browser

## Testing

### Manual Tests
- ✅ Modal opens/closes correctly
- ✅ Data loads from API
- ✅ Tree expands/collapses
- ✅ Context dialog opens
- ✅ Copy to clipboard works
- ✅ Export JSON works
- ✅ No nested button errors
- ✅ Error handling (404, network errors)

### Build Tests
- ✅ TypeScript compilation
- ✅ Next.js build succeeds
- ✅ API route registered
- ✅ No ESLint warnings

## Files Summary

| File | Lines | Purpose |
|------|-------|---------|
| lib/trace-model.ts | 120 | Data model & helpers |
| app/api/traces/[executionId]/route.ts | 200+ | API endpoint |
| components/aei/trace-node.tsx | 130 | Tree node component |
| components/aei/trace-tree.tsx | 110 | Tree container |
| components/aei/decision-context-dialog.tsx | 60 | Context viewer |
| components/aei/trace-viewer-modal.tsx | 95 | Modal orchestrator |
| app/executions/page.tsx | +9 lines | Integration |

**Total New Code:** ~30 KB

## Deferred Features (Phase 2+)

1. **Keyboard Navigation**
   - Arrow keys to navigate tree
   - Enter to expand/collapse
   - Escape to close modal

2. **Search & Filter**
   - Search by decision text
   - Filter by confidence threshold
   - Filter by agent name

3. **Visualization Enhancements**
   - Alternative paths exploration
   - Decision comparison
   - Timeline scrubber

4. **Performance**
   - Virtual scrolling for large trees
   - Pagination for API responses
   - Browser caching

## References

- **Design Pattern:** Modal dialog + recursive tree (Radix UI)
- **Styling:** Tailwind CSS dark theme
- **Icons:** Lucide React
- **API Framework:** Next.js App Router
- **Data Format:** JSON with hierarchical structure
