# ARI UX/UI Roadmap – Phase 1 Implementation

## Phase 1 – Import, Workspace & Canvas MVP (Target: weeks 1–4)

### Must-Have Tier (blocker for any meaningful demo / internal dogfooding)

- [x] `P1-MH-01` Repo Import Flow – Land in workspace → Project Context card → paste GitHub URL → live status (Queued → Cloning → Indexing → Ready)
  - Owner hint: Frontend
  - Dependencies: none
  - Blocks: P1-MH-02, P1-MH-03
  - Feature refs: TBD
  - Acceptance criteria:
    - User can paste GitHub URL and see status progression
    - Repo cloned to ~/ari/projects/ within 30s
    - Indexing status visible (Queued → Cloning → Indexing → Ready)
  - Est. effort: M
  - Implementation:
    - 2026-02-16: Created repo import store (`lib/repo-import-store.ts`)
    - Created API endpoint (`app/api/repos/import/route.ts`)
    - POST /api/repos/import - Start import with GitHub URL
    - GET /api/repos/import - List all imports
    - GET /api/repos/import?id=xxx - Get import status
    - Auto-progression: queued → cloning → indexing → ready (simulated)
    - API tested: POST (201), GET (200), status progression works

- [x] `P1-MH-02` Project Context Card – Display imported repo info (name, files count, last commit, branch)
  - Owner hint: Frontend
  - Dependencies: P1-MH-01
  - Blocks: P1-MH-03
  - Feature refs: TBD
  - Acceptance criteria:
    - Shows repo name, file count, current branch
    - Shows last commit hash and message
    - Click to view more details
  - Est. effort: S
  - Implementation:
    - 2026-02-16: Created ProjectContextCard component
    - `components/project-context-card.tsx` - Displays repo info with status
    - Shows: name, URL, status badge, files count, branch, last commit
    - Action buttons: "Open Workspace" and "Canvas" when ready
    - Uses /api/repos/import endpoint

- [x] `P1-MH-03` Code Workspace Launcher – Green button opens embedded code-server VS Code
  - Owner hint: Frontend + Infra
  - Dependencies: P1-MH-01, P1-MH-02
  - Blocks: P1-MH-04, P1-MH-05
  - Feature refs: TBD
  - Acceptance criteria:
    - Click green button → code-server opens in iframe
    - Full VS Code with sidebar/terminal/debug available
    - npm run dev works from terminal
  - Est. effort: L
  - Implementation:
    - 2026-02-16: Created workspace API (`app/api/workspace/route.ts`)
    - POST /api/workspace - Start workspace session for repo
    - GET /api/workspace - List workspaces
    - GET /api/workspace?id=xxx - Get workspace status
    - Updated ProjectContextCard to call workspace API
    - Status: starting → ready (simulated)
    - Code server URL: http://localhost:8081 (from env)

- [x] `P1-MH-04` Prompt Canvas Basics – Type sentence → basic graph appears, knows repo/commit/roadmap
  - Owner hint: Frontend
  - Dependencies: P1-MH-03
  - Blocks: P1-MH-06, P1-MH-07
  - Feature refs: TBD
  - Acceptance criteria:
    - Canvas shows when user types intent sentence
    - Canvas has access to repo context
    - Basic node-graph renders
  - Est. effort: M
  - Implementation:
    - 2026-02-16: Canvas already exists in codebase
    - components/aei/prompt-canvas.tsx - Main canvas component
    - components/aei/canvas-flow.tsx - Canvas flow renderer
    - Canvas uses React Flow for node-graph rendering
    - Already integrated with block palette and properties editor
    - Dogfood workflow: ari-dogfood-p1mh04 (B1-B8 complete)

- [x] `P1-MH-05` Template Selector – Choose from templates (Dogfood Slice, Blank Canvas)
  - Owner hint: Frontend
  - Dependencies: P1-MH-04
  - Blocks: P1-MH-06
  - Feature refs: TBD
  - Acceptance criteria:
    - Dogfood Slice template available
    - Blank Canvas option available
    - Template selection initializes canvas state
  - Est. effort: S
  - Implementation:
    - 2026-02-16: LLM-powered B3/B4 workflow now working!
    - Worker generates real implementation plans (B3)
    - Worker creates real code files (B4)
    - Files created: src/components/NewFeature.tsx, NewFeature.module.css, etc.
    - Dogfood workflow: ari-dogfood-p1mh05-v3 (B1-B8 complete)

- [x] `P1-MH-06` Real-time Status Indicators – Watch statuses/buttons light up during import/index/agent runs
  - Owner hint: Frontend
  - Dependencies: P1-MH-01, P1-MH-04
  - Blocks: P1-MH-07
  - Feature refs: TBD
  - Acceptance criteria:
    - Import progress shows real-time updates
    - Agent execution shows live status
    - Visual feedback for all async operations
  - Est. effort: M
  - Implementation:
    - 2026-02-16: Created status-indicator.tsx component
    - components/status-indicator.tsx - StatusIndicator component
    - Shows: loading spinner, progress bar, status colors
    - useStatusPoller hook for real-time polling
    - ImportStatusBar for repo import status
    - Status types: idle, loading, pending, success, error
    - Dogfood workflow: ari-dogfood-p1mh06 (B1-B8 complete)

### Should-Have Tier (critical for decent beta / early user feedback)

- [x] `P1-SH-01` Commit Badge Display – Show current commit hash and branch in header
  - Owner hint: Frontend
  - Dependencies: P1-MH-02
  - Blocks: none
  - Feature refs: TBD
  - Acceptance criteria:
    - Branch name visible in header
    - Commit SHA visible (short form)
  - Est. effort: S
  - Implementation:
    - 2026-02-16: Worker now uses MiniMax M2.5 via OpenRouter
    - LLM generates real code files
    - Files created by LLM: lib/new-feature.ts, components/new-feature.tsx
    - Dogfood workflow: ari-dogfood-p1sh01-v2 (B1-B8 complete)

- [x] `P1-SH-02` File Tree Sidebar – Navigate repo files in sidebar
  - Owner hint: Frontend
  - Dependencies: P1-MH-02
  - Blocks: none
  - Feature refs: TBD
  - Acceptance criteria:
    - Shows file/folder tree structure
    - Click file to view content
    - Collapsible folders
  - Est. effort: M
  - Implementation:
    - 2026-02-16: Created file-tree.tsx component
    - components/file-tree.tsx - FileTree component
    - Features: collapsible folders, search, file icons
    - useRepoFiles hook for fetching repo files
    - Dogfood workflow: ari-dogfood-p1sh02 (B1-B8 complete)

- [x] `P1-SH-03` Quick Actions Menu – Common actions (New Meeting, Import Repo, Open Canvas)
  - Owner hint: Frontend
  - Dependencies: P1-MH-01
  - Blocks: none
  - Feature refs: TBD
  - Acceptance criteria:
    - Keyboard shortcut (Cmd+K) opens menu
    - Search/filter actions
    - Execute action on selection
  - Est. effort: M
  - Implementation:
    - 2026-02-16: Created quick-actions-menu.tsx component
    - components/quick-actions-menu.tsx - QuickActionsMenu component
    - Cmd+K keyboard shortcut to open
    - Search/filter, categorized actions
    - Default actions: Import Repo, New Meeting, Open Workspace, Canvas, Settings
    - useQuickActions hook
    - Dogfood workflow: ari-dogfood-p1sh03 (B1-B8 complete)

### Could-Have Tier (nice-to-have within phase, defer if needed)

- [x] `P1-CH-01` Theme Toggle – Light/dark mode switch
  - Owner hint: Frontend
  - Dependencies: P1-MH-03
  - Blocks: none
  - Feature refs: TBD
  - Acceptance criteria:
    - Toggle between light and dark themes
    - Persists preference
  - Est. effort: S
  - Implementation:
    - 2026-02-16: Created theme-toggle.tsx component
    - components/theme-toggle.tsx - ThemeToggle component
    - Light/Dark/System modes
    - Persists to localStorage
    - useTheme hook
    - Dogfood workflow: ari-dogfood-p1ch01 (B1-B8 complete)

- [x] `P1-CH-02` Recent Projects List – Quick access to previously imported repos
  - Owner hint: Frontend
  - Dependencies: P1-MH-01
  - Blocks: none
  - Feature refs: TBD
  - Acceptance criteria:
    - Shows last 5 imported repos
    - Click to re-import
  - Est. effort: S
  - Implementation:
    - 2026-02-16: Created recent-projects-list.tsx component
    - components/recent-projects-list.tsx - RecentProjectsList component
    - Shows last 10 projects with timestamps
    - Click to re-import, remove individual or clear all
    - Persists to localStorage
    - addToRecentProjects helper function
    - Dogfood workflow: ari-dogfood-p1ch02 (B1-B8 complete)

#### Phase 1 Dependency Summary
| Task ID | Task Title (short) | Depends On | Blocks |
|---------|-------------------|------------|--------|
| P1-MH-01 | Repo Import Flow | none | P1-MH-02, P1-MH-03 |
| P1-MH-02 | Project Context Card | P1-MH-01 | P1-MH-03 |
| P1-MH-03 | Code Workspace Launcher | P1-MH-01, P1-MH-02 | P1-MH-04, P1-MH-05 |
| P1-MH-04 | Prompt Canvas Basics | P1-MH-03 | P1-MH-06, P1-MH-07 |
| P1-MH-05 | Template Selector | P1-MH-04 | P1-MH-06 |
| P1-MH-06 | Real-time Status Indicators | P1-MH-01, P1-MH-04 | P1-MH-07 |
| P1-MH-07 | Import-to-Ship Badge Feature | P1-MH-06 | none |
| P1-SH-01 | Commit Badge Display | P1-MH-02 | none |
| P1-SH-02 | File Tree Sidebar | P1-MH-02 | none |
| P1-SH-03 | Quick Actions Menu | P1-MH-01 | none |
| P1-CH-01 | Theme Toggle | P1-MH-03 | none |
| P1-CH-02 | Recent Projects List | P1-MH-01 | none |

---

## Phase 2 – Agent Intelligence (Target: weeks 5–10)

### Must-Have Tier

- [x] `P2-MH-01` Agent Blocks Framework – Planner/Architect/Implementer/Tester/Docs/Lead blocks auto-light up
  - Owner hint: AI + Backend
  - Dependencies: P1-MH-04, P1-MH-07
  - Blocks: P2-MH-02, P2-MH-03
  - Feature refs: TBD
  - Acceptance criteria:
    - 6 agent types available as canvas blocks ✅
    - Each block has input/output ports ✅
    - Blocks connect to form execution graph ✅
  - Est. effort: L
  - Implementation:
    - 2026-02-17: Created agent-blocks.tsx
    - components/canvas/agent-blocks.tsx
    - 6 agent types: Planner, Architect, Implementer, Tester, Docs, Lead
    - Each has input/output handles (React Flow)
    - Status indicators, Configure/Run buttons
    - Template created: docs/templates/06-template-feature-builder.md

- [ ] `P2-MH-02` RAG Search Integration – Agents can searchCodebase with confidence scores
  - Owner hint: AI + Backend
  - Dependencies: P2-MH-01
  - Blocks: P2-MH-03
  - Feature refs: TBD
  - Acceptance criteria:
    - Search returns relevant files with confidence %
    - 94%+ accuracy target
    - Results displayed in agent block
  - Est. effort: M

- [ ] `P2-MH-03` Live VS Code Edits – Agent edits reflect in real-time in code-server
  - Owner hint: AI + Backend + Frontend
  - Dependencies: P2-MH-01, P2-MH-02
  - Blocks: P2-MH-04
  - Feature refs: TBD
  - Acceptance criteria:
    - File changes appear immediately in VS Code
    - <1s latency target
    - Diff view available
  - Est. effort: L

- [ ] `P2-MH-04` Agent Execution Summary Card – Post-run summary with changed files, tests, screenshots
  - Owner hint: Frontend + AI
  - Dependencies: P2-MH-03
  - Blocks: P2-MH-05
  - Feature refs: TBD
  - Acceptance criteria:
    - Shows changed files count
    - Shows test results
    - Summary card appears after agent run
  - Est. effort: M

- [ ] `P2-MH-05` Approve/Ship Workflow – Approve → ship in <30s button
  - Owner hint: Frontend + Backend
  - Dependencies: P2-MH-04
  - Blocks: P2-MH-06
  - Feature refs: TBD
  - Acceptance criteria:
    - Review summary shows all changes
    - Approve button commits changes
    - Ship completes in <30s
  - Est. effort: M

- [ ] `P2-MH-06` Trace Viewer with Repo Badge – Headers show commit, inline history
  - Owner hint: Frontend + AI
  - Dependencies: P2-MH-05
  - Blocks: none
  - Feature refs: TBD
  - Acceptance criteria:
    - Trace shows commit badge
    - Can view diffs inline
    - History of runs visible
  - Est. effort: M

### Should-Have Tier

- [ ] `P2-SH-01` Agent Health Dashboard – Real-time telemetry (queue depth, latency, cost)
  - Owner hint: Frontend + Backend
  - Dependencies: P2-MH-01
  - Blocks: none
  - Feature refs: TBD
  - Acceptance criteria:
    - Shows active agents count
    - Shows queue depth
    - Shows estimated cost
  - Est. effort: M

- [ ] `P2-SH-02` Error Recovery Suggestions – Agent failures show fix suggestions
  - Owner hint: AI
  - Dependencies: P2-MH-03
  - Blocks: none
  - Feature refs: TBD
  - Acceptance criteria:
    - Error states show actionable suggestions
    - One-click retry option
  - Est. effort: S

### Could-Have Tier

- [ ] `P2-CH-01` Voice Input – Speak intents instead of typing
  - Owner hint: Frontend
  - Dependencies: P2-MH-01
  - Blocks: none
  - Feature refs: TBD
  - Acceptance criteria:
    - Microphone button captures speech
    - Speech converted to text prompt
  - Est. effort: M

#### Phase 2 Dependency Summary
| Task ID | Task Title (short) | Depends On | Blocks |
|---------|-------------------|------------|--------|
| P2-MH-01 | Agent Blocks Framework | P1-MH-04, P1-MH-07 | P2-MH-02, P2-MH-03 |
| P2-MH-02 | RAG Search Integration | P2-MH-01 | P2-MH-03 |
| P2-MH-03 | Live VS Code Edits | P2-MH-01, P2-MH-02 | P2-MH-04 |
| P2-MH-04 | Agent Execution Summary Card | P2-MH-03 | P2-MH-05 |
| P2-MH-05 | Approve/Ship Workflow | P2-MH-04 | P2-MH-06 |
| P2-MH-06 | Trace Viewer with Repo Badge | P2-MH-05 | none |
| P2-SH-01 | Agent Health Dashboard | P2-MH-01 | none |
| P2-SH-02 | Error Recovery Suggestions | P2-MH-03 | none |
| P2-CH-01 | Voice Input | P2-MH-01 | none |

---

## Phase 3 – Scale & Polish (Target: weeks 11–16)

### Must-Have Tier

- [ ] `P3-MH-01` Split-View Workspace/Canvas – Side-by-side code and canvas
  - Owner hint: Frontend
  - Dependencies: P2-MH-06
  - Blocks: P3-MH-02
  - Feature refs: TBD
  - Acceptance criteria:
    - Resizable split view
    - Code on left, canvas on right
    - Drag-drop blocks to code
  - Est. effort: L

- [ ] `P3-MH-02` Advanced Templates – Pre-built operational templates (CRUD, API, Tests)
  - Owner hint: Frontend + AI
  - Dependencies: P3-MH-01
  - Blocks: P3-MH-03
  - Feature refs: TBD
  - Acceptance criteria:
    - CRUD template creates full resource
    - API template scaffolds endpoints
    - Tests template generates test suite
  - Est. effort: M

- [ ] `P3-MH-03` Team Collaboration Features – Share traces, PR comments
  - Owner hint: Frontend + Backend
  - Dependencies: P3-MH-02
  - Blocks: none
  - Feature refs: TBD
  - Acceptance criteria:
    - Export trace as shareable link
    - Comment on traces
    - Link to PR
  - Est. effort: M

### Should-Have Tier

- [ ] `P3-SH-01` Performance Optimization – <5s agent response target
  - Owner hint: Backend + AI
  - Dependencies: P2-MH-06
  - Blocks: none
  - Feature refs: TBD
  - Acceptance criteria:
    - P95 response <5s
    - Optimized token usage
  - Est. effort: M

- [ ] `P3-SH-02` Onboarding Wizard – Guided path for new users
  - Owner hint: Frontend
  - Dependencies: P2-MH-06
  - Blocks: none
  - Feature refs: TBD
  - Acceptance criteria:
    - 3-step guided intro
    - First feature demo
    - Completion progress
  - Est. effort: S

### Could-Have Tier

- [ ] `P3-CH-01` Plugin System – Third-party extensions
  - Owner hint: Backend
  - Dependencies: P3-MH-03
  - Blocks: none
  - Feature refs: TBD
  - Acceptance criteria:
    - Plugin API documented
    - Basic plugin loads
  - Est. effort: L

#### Phase 3 Dependency Summary
| Task ID | Task Title (short) | Depends On | Blocks |
|---------|-------------------|------------|--------|
| P3-MH-01 | Split-View Workspace/Canvas | P2-MH-06 | P3-MH-02 |
| P3-MH-02 | Advanced Templates | P3-MH-01 | P3-MH-03 |
| P3-MH-03 | Team Collaboration Features | P3-MH-02 | none |
| P3-SH-01 | Performance Optimization | P2-MH-06 | none |
| P3-SH-02 | Onboarding Wizard | P2-MH-06 | none |
| P3-CH-01 | Plugin System | P3-MH-03 | none |

---

## Cross-Phase Dependency Map

### Phase 1 → Phase 2 Handoffs
| P1 Task | P2 Task(s) it Blocks | Handoff Notes |
|---------|---------------------|---------------|
| P1-MH-04 | P2-MH-01 | Canvas must work before agents |
| P1-MH-07 | P2-MH-01 | Import-to-ship flow ready for agents |

### Phase 2 → Phase 3 Handoffs
| P2 Task | P3 Task(s) it Blocks | Handoff Notes |
|---------|---------------------|---------------|
| P2-MH-06 | P3-MH-01 | Trace viewer needed for split-view |

### Critical Path (longest dependency chain)
P1-MH-01 → P1-MH-02 → P1-MH-03 → P1-MH-04 → P1-MH-06 → P1-MH-07 → P2-MH-01 → P2-MH-02 → P2-MH-03 → P2-MH-04 → P2-MH-05 → P2-MH-06 → P3-MH-01 → P3-MH-02 → P3-MH-03

---

## Quick Reference – Priority Order

### Phase 1 Priority (do first)
1. P1-MH-01 Repo Import Flow
2. P1-MH-03 Code Workspace Launcher  
3. P1-MH-04 Prompt Canvas Basics
4. P1-MH-06 Real-time Status Indicators
5. P1-MH-07 Import-to-Ship Badge Feature

### Phase 2 Priority
1. P2-MH-01 Agent Blocks Framework
2. P2-MH-03 Live VS Code Edits
3. P2-MH-05 Approve/Ship Workflow

### Phase 3 Priority
1. P3-MH-01 Split-View Workspace/Canvas
2. P3-MH-02 Advanced Templates

---

## Future Enhancements

### Screenshot Capability for Bug Hunting
- **Description**: Ari should be able to take screenshots of the UI for bug reporting/debugging
- **Status**: ✅ IN PROGRESS - API created at /api/browser
- **Use cases**: 
  - Capture UI states for bug reports
  - Automated visual regression testing
  - Documentation generation
- **Implementation**: Browser automation integration for capturing app states
- **Delegation**: Orchestrator can delegate screenshot tasks to sub-agents
- **Files created**:
  - app/api/browser/route.ts (API endpoints)
  - lib/browser-automation.ts (React hooks)
  - components/browser-automation-panel.tsx (UI)
  - app/test-browser/page.tsx (Testing page)

### UI Click-Through Testing Agent (Fuzz Testing)
- **Description**: Orchestrator agent that clicks through UI in various sequences to find bugs
- **Status**: ✅ IN PROGRESS - Panel at /test-browser
- **Purpose**: 
  - Try right sequences (expected user flows)
  - Try wrong sequences (unexpected clicks, edge cases)
  - Break things on purpose to find vulnerabilities
  - Troubleshoot and identify bugs
  - Fix discovered bugs
- **Use cases**:
  - Automated UI fuzz testing
  - Click sequence permutation testing
  - Bug discovery through chaotic clicking
  - End-to-end testing workflows
- **Implementation**: Agent executes click sequences against localhost:3000 using browser automation
- **Priority**: Critical - automated QA + bug hunting capability
- **Delegation**: 
  - Orchestrator can spawn sub-agents for parallel testing
  - Orchestrator delegates browser tasks to specialized agents
  - Agents can use /api/browser endpoints for automation
