# Feature 04 – Output Simulator: Architecture Document

**Feature:** Output Simulator (Artifact Preview & Validation)  
**Version:** 1.0  
**Last Updated:** 2026-02-09  
**Status:** Complete and Tested

<!--
  Architecture Version History:
  - 1.0 (2026-02-09): Initial architecture documentation
-->

---

## Executive Summary

The Output Simulator feature provides a complete workflow for:
1. **Orchestrating rules** - Define task routing rules with priorities and agent affinities
2. **Simulating execution** - Run orchestrator against instruction graphs to generate assignment plans
3. **Previewing artifacts** - Display generated code/HTML/JSON/SQL artifacts with validation

The architecture is **modular, decoupled, and extensible**, with clear separation between:
- **UI Layer** - React components and state management
- **API Layer** - Next.js route handlers with validation
- **Engine Layer** - Core orchestration logic (decompose → assign → simulate)
- **Data Models** - Type-safe interfaces for rules, artifacts, and execution plans

---

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    ORCHESTRATOR HUB (Browser)                   │
│  ┌──────────────────┐  ┌───────────────────────────────────┐   │
│  │  Left Sidebar    │  │    Center Grid (2-column)        │   │
│  │  ┌────────────┐  │  │  ┌──────────────┬──────────────┐ │   │
│  │  │ Rule List  │  │  │  │ Rule Viz     │ Simulation   │ │   │
│  │  │ (clickable)│  │  │  │              │ Panel        │ │   │
│  │  └────────────┘  │  │  └──────────────┴──────────────┘ │   │
│  └──────────────────┘  └───────────────────────────────────┘   │
│                         ┌──────────────────────────────────┐   │
│                         │  Right Sidebar (collapsible)     │   │
│                         │  ┌────────────────────────────┐  │   │
│                         │  │ Artifact Preview Panel      │  │   │
│                         │  │ (tabs: Code|HTML|JSON|...)  │  │   │
│                         │  └────────────────────────────┘  │   │
│                         └──────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
         │                      │                        │
         │ setSelectedRule      │ onArtifactsGenerated   │ artifacts
         ▼                      ▼                        ▼
┌─────────────────────────────────────────────────────────────────┐
│          ORCHESTRATOR PAGE STATE (/app/orchestrator/page.tsx)   │
│  • rules: Rule[]                                                │
│  • selectedRule: Rule | null                                    │
│  • artifacts: Artifact[]                                        │
│  • previewPanelExpanded: boolean                                │
└─────────────────────────────────────────────────────────────────┘
         │                      │
         │ POST /api/orchestrator/simulate
         ▼
┌─────────────────────────────────────────────────────────────────┐
│              API LAYER (/app/api/orchestrator/simulate)         │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ 1. Parse instruction graph                                │ │
│  │ 2. Initialize Rule from rule_set_id                       │ │
│  │ 3. Call ORCHESTRATOR.simulate(graph, rule, constraints)   │ │
│  │ 4. Generate artifacts for each task                       │ │
│  │ 5. Return { simulation, artifacts }                       │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│       ORCHESTRATOR ENGINE (/lib/orchestrator-engine.ts)         │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────────┐        │
│  │ decompose() │→ │  assign()   │→ │ generate result  │        │
│  │             │  │             │  │                  │        │
│  │ • Flatten   │  │ • Match     │  │ • Artifact       │        │
│  │   graph     │  │   tasks     │  │   generation     │        │
│  │ • Extract   │  │   to agents │  │ • Validation     │        │
│  │   tasks     │  │ • Score by  │  │                  │        │
│  │             │  │   affinity  │  │                  │        │
│  └─────────────┘  └─────────────┘  └──────────────────┘        │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│         DATA MODELS & GENERATORS                                │
│  ┌──────────────────┐  ┌──────────────────┐                    │
│  │ artifact-model   │  │ artifact-        │                    │
│  │ • Artifact{}     │  │ generator        │                    │
│  │ • ArtifactType   │  │ • Mock code      │                    │
│  │ • Validation{}   │  │ • Mock HTML      │                    │
│  └──────────────────┘  └──────────────────┘                    │
│  ┌──────────────────┐  ┌──────────────────┐                    │
│  │ orchestrator-    │  │ canvas-state     │                    │
│  │ engine           │  │ • Rule{}         │                    │
│  │ • Rule{}         │  │ • Constraints{}  │                    │
│  │ • Assignment{}   │  └──────────────────┘                    │
│  └──────────────────┘                                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## Component Structure

### Frontend Components (React)

#### 1. **Orchestrator Page** (`/app/orchestrator/page.tsx`)
**Role:** Root container for entire orchestrator feature

**State:**
```typescript
rules: Rule[]                           // All saved rules
selectedRule: Rule | null               // Currently selected rule
editingRule: Rule | null                // Rule being edited in modal
showEditor: boolean                     // Rule editor modal visibility
artifacts: Artifact[]                   // Generated artifacts from simulation
previewPanelExpanded: boolean          // Right sidebar collapsed/expanded
loading: boolean                        // API loading state
```

**Layout:**
- **Left (w-80):** RuleList sidebar
- **Center (flex-1):** Grid container with 2 columns (h-96)
  - Left: RuleVisualization card
  - Right: SimulationPanel card
- **Bottom:** ArtifactPreviewPanel (right sidebar, collapsible)
- **Modal:** RuleEditor (when editing)

**Key Functions:**
- `loadRules()` - Fetch rules from API
- `handleCreateRule()` - Initialize new rule editor
- `handleSaveRule()` - POST rule to API
- `handleEditRule()` - Open editor modal
- `handleDeleteRule()` - DELETE rule from API

---

#### 2. **Rule List** (`/components/aei/rule-list.tsx`)
**Role:** Display clickable rule cards with selection state

**Props:**
```typescript
rules: Rule[]
selectedRule: Rule | null
onSelectRule: (rule: Rule) => void
onEditRule: (rule: Rule) => void
onDeleteRule: (ruleId: string) => void
```

**Features:**
- Rule card with name, priority badge, affinity/constraints summary
- Blue highlight on selection
- Edit/Delete buttons (with event propagation stop)
- Empty state message when no rules

**Key Fix (2026-02-09):**
- Moved onClick from inner Card to outer div
- Added `pointer-events-none` to Card to prevent blocking clicks
- Cards now properly trigger rule selection

---

#### 3. **Rule Visualization** (`/components/aei/rule-visualization.tsx`)
**Role:** Display selected rule details (read-only)

**Props:**
```typescript
rule: Rule
```

**Displays:**
- Rule ID (monospace, blue)
- Priority level (1-10)
- Dependencies (list of rule IDs)
- Agent Type Affinity (task type → agent type mappings)
- Constraints (max agents, max cost per task)

---

#### 4. **Simulation Panel** (`/components/aei/simulation-panel.tsx`)
**Role:** Interactive controls for running simulations

**Props:**
```typescript
rule: Rule
onArtifactsGenerated?: (artifacts: Artifact[]) => void
```

**State:**
```typescript
simulating: boolean                     // Loading during simulation
executing: boolean                      // Loading during execution
result: SimulationResult | null         // Simulation output
executionId: string | null              // When execution dispatched
constraints: {
  max_agents: number
  max_cost_budget: number
}
```

**Features:**
- Max Agents slider (1-100, step 1)
- Cost Budget slider ($10-$5000, step $50)
- **Run Simulation** button (blue, triggers `/api/orchestrator/simulate`)
- **Execute Plan** button (emerald, appears after simulation)
- Results display:
  - Estimated metrics (cost, duration, success probability)
  - Critical path (ordered task IDs)
  - Task assignments with agent routing
  - Validation errors (if any)

**Key Function:**
```typescript
handleSimulate() → POST /api/orchestrator/simulate
  • Sends: instruction_graph, rule_set_id, constraints
  • Receives: simulation result + artifacts
  • Calls: onArtifactsGenerated(artifacts)
```

---

#### 5. **Artifact Preview Panel** (`/components/aei/artifact-preview-panel.tsx`)
**Role:** Display generated artifacts in tabbed interface

**Props:**
```typescript
artifacts: Artifact[]
isExpanded: boolean
onToggle: (expanded: boolean) => void
```

**Features:**
- Grouped by artifact type (tabs: Code, HTML, JSON, SQL, Config, Test, etc.)
- Per-artifact metadata:
  - Language badge
  - File size / line count
  - Version ID
- Action buttons:
  - **Copy** (copies to clipboard)
  - **Export** (downloads as typed file)
- Collapsible header with chevron and count badge

**Artifact Viewer** - For each artifact:
- Syntax highlighting (code/SQL/YAML)
- HTML preview in iframe (sandboxed)
- JSON tree view with expand/collapse
- Validation badge (✅ Valid / ⚠️ Warning / ❌ Error)
- Truncation for large files (shows "... N more lines")

---

### API Routes

#### **POST /api/orchestrator/simulate**

**Request Body:**
```typescript
{
  instruction_graph: {
    nodes: Array<{
      id: string
      type: string
      label: string
      metadata: Record<string, any>
    }>
    edges: Array<{
      source: string
      target: string
    }>
  }
  rule_set_id: string           // e.g., "default" or rule.id
  rule_set?: {                  // Optional explicit rule
    agent_selection: "auto" | "manual"
    task_grouping: boolean
  }
  constraints_override?: {      // Optional override
    max_agents?: number
    max_cost_budget?: number
  }
}
```

**Response:**
```typescript
{
  simulation: {
    assignment_plan: Array<{
      id: string
      assigned_agent_id_or_pool: string
      estimated_cost: number
      estimated_duration: number
      status: string
    }>
    critical_path: string[]
    estimated_total_cost: number
    estimated_total_duration: number
    success_probability: number
    validation_errors: string[]
  }
  artifacts: Artifact[]
}
```

**Process:**
1. Parse instruction graph
2. Fetch or initialize Rule from rule_set_id
3. Call ORCHESTRATOR.simulate()
4. Generate artifacts for each task type
5. Return results + artifacts

**Error Handling:**
- 400: Invalid graph structure
- 404: Rule not found
- 500: Engine error (with detailed message)

---

### Engine Layer

#### **Orchestrator Engine** (`/lib/orchestrator-engine.ts`)

**Core Algorithm: SIMULATE(graph, rule, constraints)**

```
1. decompose(graph)
   └─ Extract tasks from nodes
   └─ Build dependency graph
   └─ Return flat task list

2. assign(tasks, rule, constraints)
   └─ For each task:
      └─ Match to agent type via rule.agent_type_affinity
      └─ Estimate cost/duration
      └─ Check constraints (max agents, max cost)
      └─ Return assignment plan
   └─ Calculate critical path (longest dependency chain)
   └─ Calculate success probability

3. Generate artifacts
   └─ For each task type: create mock artifact
   └─ Validate artifact format
   └─ Return artifact list

4. Return SimulationResult
```

**Key Data Structures:**

```typescript
interface Rule {
  id: string
  name: string
  priority: number                           // 1-10
  dependencies: string[]                     // Other rule IDs
  agent_type_affinity: Record<string, string> // task_type → agent_type
  constraints: {
    max_agents?: number
    max_cost_per_task?: number
  }
}

interface Assignment {
  id: string                                 // Task ID
  assigned_agent_id_or_pool: string
  estimated_cost: number
  estimated_duration: number
  status: string
}

interface SimulationResult {
  assignment_plan: Assignment[]
  critical_path: string[]
  estimated_total_cost: number
  estimated_total_duration: number
  success_probability: number
  validation_errors: string[]
}
```

**Null Safety (Fixed 2026-02-09):**
- All `rule_set` accesses use optional chaining (`?.`)
- Defensive checks before accessing nested properties
- Proper error messages when data is missing

---

#### **Artifact Generation** (`/lib/artifact-generator.ts`)

**Process:**
For each task, generate appropriate artifact based on task type:

| Task Type | Artifact Type | Content |
|-----------|---------------|---------|
| `code_gen` | code | Python function skeleton |
| `test_gen` | test | Pytest test cases |
| `html_gen` | html | HTML page mockup |
| `sql_migration` | sql | CREATE TABLE statement |
| `deploy_config` | config | Docker compose snippet |
| `api_design` | json | OpenAPI schema mockup |

**Mock Data Strategy:**
- Deterministic (same task type always generates similar content)
- Realistic (valid Python, HTML, SQL, etc.)
- Validated (passes validation checks)

**Validation:**
- Syntax check (is it valid code?)
- Schema check (does JSON parse?)
- Count check (expected line count?)

---

### Data Models

#### **Artifact Model** (`/lib/artifact-model.ts`)

```typescript
type ArtifactType = 
  | 'code' 
  | 'html' 
  | 'json' 
  | 'sql' 
  | 'config' 
  | 'test' 
  | 'markdown' 
  | 'svg' 
  | 'dockerfile' 
  | 'yaml'

interface Artifact {
  type: ArtifactType
  language?: string              // 'python' | 'javascript' | etc.
  content: string                // Full artifact content
  metadata: {
    version_id: string           // UUID of artifact version
    size: number                 // Bytes
    lines: number                // Line count
  }
}

interface ArtifactValidation {
  valid: boolean
  errors: string[]
  warnings: string[]
}
```

---

## Data Flow

### Complete Flow: Rule → Simulation → Artifacts

```
1. USER CREATES RULE
   ├─ Click "New Rule" button
   ├─ Fill form: name, priority, affinity, constraints
   ├─ Click "Save"
   └─ POST /api/orchestrator → rule.id

2. USER SELECTS RULE
   ├─ Click rule card in sidebar
   ├─ setSelectedRule(rule)
   ├─ Rule Visualization panel appears
   └─ Simulation panel appears

3. USER ADJUSTS CONSTRAINTS
   ├─ Drag Max Agents slider
   ├─ Drag Cost Budget slider
   └─ (no API call yet)

4. USER RUNS SIMULATION
   ├─ Click "Run Simulation" button
   ├─ POST /api/orchestrator/simulate
   │  ├─ instruction_graph: mock 5-task graph
   │  ├─ rule_set_id: rule.id
   │  └─ constraints_override: {max_agents, max_cost_budget}
   ├─ Engine: decompose → assign → generate
   └─ Response: {simulation, artifacts}

5. ARTIFACTS GENERATED & DISPLAYED
   ├─ onArtifactsGenerated(artifacts) callback
   ├─ setArtifacts(artifacts) in orchestrator page
   ├─ ArtifactPreviewPanel appears with tabs
   └─ User can view, copy, export each artifact

6. USER EXPORTS ARTIFACT
   ├─ Click "Export" on code artifact
   ├─ Browser downloads: artifact_[version].py
   └─ File contains full artifact content
```

---

## Integration Points

### 1. Rule Storage
**Current:** In-memory (backend state, not persisted)
**Future:** Database (PostgreSQL, MongoDB, etc.)
**API:** `/api/orchestrator` (POST, GET, DELETE)

### 2. Instruction Graphs
**Source:** Prompt Canvas
**Current:** Hardcoded mock graph in SimulationPanel
**Future:** Load from canvas via `/api/canvases/parse`
**Format:** Nodes + Edges (DAG structure)

### 3. Agent Pool
**Current:** Mocked as string IDs ("agent-1", "agent-2")
**Future:** Real agent fleet management
**Integration:** Agent service API

### 4. Cost Calculation
**Current:** Estimated (fixed cost per task)
**Future:** Real cost tracking from execution logs
**Integration:** Execution service API

---

## Design Decisions

### 1. **Modular Component Structure**
- Each component owns its state (no global Redux)
- Props-based communication via callbacks
- Clear parent-child hierarchy

**Rationale:** 
- Easier to test individual components
- Easier to refactor or move components
- Clear data flow (top-down)

### 2. **Explicit Height Constraint (h-96)**
Added fixed height to grid container because:
- Flex layout without explicit height collapses children
- `flex-1` without container height doesn't work
- `min-h-0` needs container height to calculate

**Future:** Use viewport height query to make responsive

### 3. **Mock Artifacts over Real Execution**
- Don't actually execute tasks
- Generate realistic-looking mock artifacts
- Reduces dependency on external services

**Rationale:**
- Faster iteration
- No external dependencies
- Easier testing
- Safer (no side effects)

### 4. **Validation Badges**
- Show validation status for each artifact
- ✅ Valid, ⚠️ Warning, ❌ Error
- Helps catch problems early

**Rationale:**
- User feedback
- Catches malformed artifacts
- Documents artifact health

---

## File Structure

```
/app/orchestrator/
├── page.tsx                    # Main orchestrator page
│   └── Layout: sidebar + grid + preview panel

/components/aei/
├── rule-list.tsx               # Rule selection sidebar
├── rule-visualization.tsx       # Rule details display
├── simulation-panel.tsx         # Simulation controls
├── artifact-preview-panel.tsx   # Artifact tabs + viewer
├── artifact-viewer.tsx          # Single artifact display
├── artifact-validator.tsx       # Validation logic UI
├── rule-editor.tsx             # Rule creation/edit modal
└── [other orchestrator components]

/lib/
├── orchestrator-engine.ts       # Core simulation logic
├── artifact-model.ts           # Data structures
├── artifact-generator.ts       # Mock artifact creation
├── artifact-validator.ts       # Validation logic
├── canvas-state.ts             # Instruction graph types
└── connection-rules.ts         # Valid node connections

/app/api/orchestrator/
├── route.ts                    # GET/POST/DELETE rules
└── simulate/
    └── route.ts                # POST simulate, return artifacts
```

---

## Testing Strategy

### Manual Testing (5 min)
1. Create rule → verify stored
2. Select rule → verify panels appear
3. Run simulation → verify artifacts appear
4. Copy artifact → verify clipboard
5. Export artifact → verify file download

### API Testing (curl/Postman)
```bash
# Run simulation directly
curl -X POST http://localhost:3000/api/orchestrator/simulate \
  -H "Content-Type: application/json" \
  -d '{
    "instruction_graph": {...},
    "rule_set_id": "default",
    "constraints_override": {"max_agents": 5}
  }'
```

### Browser DevTools
- Check Network tab for `/api/orchestrator/simulate` → 200 OK
- Check Console for errors (should be none)
- Check Elements tab for DOM structure

---

## Known Limitations

1. **No Graph Import from Canvas**
   - Simulation uses hardcoded mock graph
   - Future: Load from Prompt Canvas via API

2. **No Execution**
   - Artifacts are mocked, not real
   - No actual task execution
   - Future: Real orchestration engine

3. **No Persistence**
   - Rules stored in memory only
   - Lost on server restart
   - Future: Database integration

4. **Limited Responsiveness**
   - Grid has fixed `h-96` height
   - Not responsive to viewport changes
   - Future: Use viewport-based sizing

5. **No Real Cost Calculation**
   - Cost estimates are fixed
   - No real metering or billing
   - Future: Cost service integration

---

## Performance Considerations

### Current
- Simulation completes in ~2-3 seconds (async/await with delay)
- Artifact generation is instant
- UI updates smooth (React 18 concurrent rendering)

### Future Optimizations
- Cache simulation results by rule ID + constraints
- Memoize artifact grouping
- Lazy-load artifact content on tab click
- Virtualize long artifact lists

---

## Security Considerations

### Current
- No authentication (dev environment)
- No input validation (accepts any instruction graph)
- No rate limiting

### Future
- Add JWT auth for rule access
- Validate instruction graph schema
- Add rate limiting on API endpoints
- Sanitize artifact content before display

---

## Related Documents

- **On-Boarding Guide:** `/docs/on-boarding/feature-04-onboarding.md`
- **Task Definition:** `/docs/tasks/feature-04-orchestrator-simulator.md`
- **Product Requirements:** `/docs/prd/master-prd-AEI.md#orchestrator`

---

## Appendix: Component Props Summary

| Component | Key Props | Key Callbacks |
|-----------|-----------|---------------|
| RuleList | `rules`, `selectedRule` | `onSelectRule`, `onEditRule`, `onDeleteRule` |
| RuleVisualization | `rule` | — |
| SimulationPanel | `rule` | `onArtifactsGenerated` |
| ArtifactPreviewPanel | `artifacts`, `isExpanded` | `onToggle` |
| ArtifactViewer | `artifact` | — |
| RuleEditor | `rule` | `onSave`, `onCancel` |

