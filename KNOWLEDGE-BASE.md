# AEI Knowledge Base

**AI Engineering Interface (AEI)** - Your post-IDE control center for AI agent orchestration and management.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Dashboard Overview](#dashboard-overview)
3. [Feature Guide](#feature-guide)
   - [Agents Dashboard](#agents-dashboard)
   - [Orchestrator Hub](#orchestrator-hub)
   - [Prompt Canvas](#prompt-canvas)
4. [Common Workflows](#common-workflows)
5. [Troubleshooting](#troubleshooting)
6. [Keyboard Shortcuts](#keyboard-shortcuts)

---

## Getting Started

### First Steps

1. **Start the application:**
   ```bash
   npm run dev
   ```
   The app will be available at `http://localhost:3000`

2. **Navigate the interface:**
   - Use the **left sidebar** to switch between features
   - Click on any navigation item to load that section
   - Active section is highlighted in blue

3. **Key sections:**
   - **Overview** - Dashboard home (landing page)
   - **Agents** - Real-time agent monitoring and control
   - **Orchestrator** - Workflow coordination and task assignment
   - **Workflows** - Visual workflow builder (Prompt Canvas)

---

## Dashboard Overview

### Main Interface Layout

```
┌─────────────────────────────────────────────────┐
│              Header (Top Bar)                    │
├──────────┬──────────────────────────────────────┤
│          │                                       │
│ Sidebar  │      Main Content Area               │
│          │                                       │
│ - Over-  │   (Feature-specific content loads    │
│   view   │    here based on navigation)         │
│ - Agents │                                       │
│ - Orch.  │                                       │
│ - Trace  │                                       │
│ - Work.  │                                       │
│          │                                       │
└──────────┴──────────────────────────────────────┘
```

### Navigation Sidebar

**Location:** Left side of the screen (56px wide)

**Features:**
- **Overview** - Home dashboard with system status
- **Agents** (badge shows count) - Agent monitoring dashboard
  - Expandable to show individual agents
  - Status indicators (green=active, gray=idle, red=error)
- **Orchestrator** (badge shows active rules) - Coordination control center
- **Trace Viewer** - Execution trace analysis
- **Workflows** (badge shows count) - Visual workflow builder
- **Compliance** - Policy and compliance monitoring
- **Plugins** - Extension management
- **Console** - System console and logs

**System Health Widget** (bottom of sidebar):
- Shows overall system status
- Green dot = all agents nominal
- Yellow/Red = alerts or errors

---

## Feature Guide

### Agents Dashboard

**Purpose:** Real-time monitoring and management of your AI agent swarm.

**Access:** Click **Agents** in the left sidebar

#### What You'll See

**Hierarchical Agent Tree:**
- Orchestrator agents at the top level (parent agents)
- Worker agents nested underneath (child agents)
- Expand/collapse with arrow icons

**Agent Information (per row):**
- **ID & Name** - Unique identifier and friendly name
- **Status Badge** - Current state with color coding:
  - 🔵 Blue = Processing (actively working on a task)
  - ⚪ Gray = Idle (waiting for work)
  - 🟡 Yellow = Waiting (blocked by dependencies)
  - 🔴 Red = Error (failed or crashed)
  - 🟢 Green = Complete (task finished successfully)
- **Metrics** - Real-time performance data
- **Sparkline Charts** - 4 mini graphs showing trends:
  - **CPU** (blue) - Processor usage %
  - **Memory** (orange) - RAM usage %
  - **Tokens/min** (green) - LLM token throughput
  - **Cost** (red) - Running cost in dollars

#### How to Use

**1. Monitor Agents:**
- Watch status badges update every ~2 seconds
- Check sparklines for performance trends
- Expand orchestrators to see their worker agents

**2. Select Agents:**
- Click checkbox on any agent row to select
- Multi-select supported (select multiple agents)
- Selected agents highlighted

**3. Control Agents (Right-click Context Menu):**
- **Right-click** any agent to open actions menu
- **Pause/Resume** - Temporarily stop/restart an agent
- **Terminate** - Permanently stop an agent (requires confirmation)
- **Reassign** - Move tasks to different agent (coming in Phase 2)
- **Inspect Logs** - View detailed agent logs in modal

**4. View Agent Logs:**
- Right-click agent → "Inspect Logs"
- Modal opens with timestamped log entries
- Auto-scrolls to most recent logs
- Click "Copy" to copy logs to clipboard
- Close modal with X button or click outside

#### Agent Dashboard Tips

✅ **Best Practices:**
- Keep an eye on error status (red) - investigate immediately
- Watch CPU/Memory sparklines - high sustained usage may indicate issues
- Use pause instead of terminate to debug issues (preserves state)

❌ **Common Mistakes:**
- Don't terminate agents without checking logs first
- Don't ignore yellow "waiting" status for extended periods
- Don't forget to resume paused agents

---

### Orchestrator Hub

**Purpose:** Coordinate multi-agent workflows with rule-based task assignment and simulation.

**Access:** Click **Orchestrator** in the left sidebar

#### What You'll See

**Two-Pane Layout:**

**Left Sidebar (Rule Management):**
- "Orchestration Rules" header
- **+ New Rule** button (blue)
- List of existing rules with edit/delete icons
- Selected rule highlighted

**Right Main Area (Split into 2 panels):**
- **Rule Visualization** - Visual representation of selected rule
- **Simulation** - Task assignment preview and execution

#### How to Use

**1. Create a Coordination Rule:**

Click **+ New Rule** button → Modal opens

**Rule Editor Form:**
- **Name** - Give your rule a descriptive name
  - Example: "High-Priority Code Generation"

- **Priority** (Slider: 1-10)
  - 1 = Lowest priority (runs last)
  - 10 = Highest priority (runs first)
  - Default: 5 (medium)
  - Higher priority tasks get agent resources first

- **Agent Type Affinity** (Checkboxes)
  - Select which agent types should handle tasks from this rule
  - Options: code_gen, test, deploy, analysis, etc.
  - Leave empty to allow ANY agent type
  - Example: Check "code_gen" for coding tasks

- **Constraints:**
  - **Max Agents** (Slider: 1-1000)
    - Limit how many agents can work on this rule's tasks
    - Default: 100
    - Lower = slower but cheaper
    - Higher = faster but more resources

  - **Max Cost Per Task** (Slider: $0-$100)
    - Budget cap per individual task
    - Default: $10
    - Tasks exceeding this may be queued or dropped

Click **Save** → Rule stored and appears in left sidebar

**2. Select and Visualize a Rule:**

- Click any rule in the left sidebar
- Right panel shows rule details:
  - Affinity mapping (which tasks go to which agents)
  - Constraints summary
  - Dependency graph (if applicable)

**3. Load an Instruction Graph:**

Two options:

**Option A:** Create in Prompt Canvas (Feature 01)
- Build visual workflow in Canvas
- Click "Export to Orchestrator"
- Graph automatically loaded in Orchestrator Hub

**Option B:** Use mock graph (testing)
- Mock graph loads automatically on page load
- 10-task sample workflow for testing

**4. Run a Simulation:**

With rule selected and graph loaded:

- Click **Simulate** button
- System processes in <2 seconds:
  - Decomposes graph into atomic tasks
  - Applies your rules (priority, affinity, constraints)
  - Assigns tasks to agents
  - Estimates metrics

**Simulation Results Display:**

**Task Assignment Table:**
```
task_id          | assigned_agent    | est_cost | status
----------------|-------------------|----------|----------
parse-input     | code_gen_agent_1  | $0.15    | assigned
run-tests       | test_agent_2      | $0.25    | assigned
deploy-service  | deploy_agent_1    | $0.50    | queued
```

**Critical Path:**
- Top 3 longest sequential task chains
- Determines total execution time
- Example: "Task A → Task B → Task C (duration: 45s)"

**Metrics Summary:**
- **Total Cost** - Sum of all task costs
- **Duration** - Length of critical path in seconds
- **Success Probability** - Estimated completion likelihood (0-100%)

**5. Adjust Constraints & Re-Simulate:**

Use sliders in Simulation Panel:

- **Max Agents Slider:**
  - Increase → More parallelism, higher cost, faster completion
  - Decrease → Less parallelism, lower cost, slower completion
  - Move slider → Click "Re-Simulate"
  - See updated assignments and metrics instantly

- **Max Cost Budget Slider:**
  - Set overall budget cap
  - Tasks exceeding budget marked as "queued" or dropped
  - Low-priority tasks dropped first

**Why Re-Simulate?**
- Test different constraint scenarios (what-if analysis)
- Balance speed vs. cost
- Find optimal configuration before executing

**6. Execute the Plan:**

Satisfied with simulation?

- Click **Execute Plan** button
- Confirmation dialog shows final metrics
- Click **Confirm**

**What Happens:**
1. Execution record created (unique execution ID)
2. Tasks broadcast to agents via WebSocket
3. Agents receive assignments and begin work
4. Agent Dashboard updates in real-time (switch to Agents tab to watch)
5. Execution metadata stored for history

**7. View Execution History:**

- Click **Executions** tab (or navigation link)
- See list of all past executions:
  - Execution ID
  - Created timestamp
  - Rule set used
  - Number of agents assigned
  - Total cost
  - Duration
  - Status (pending/processing/complete/failed)

**Click an execution** → Detail view:
- Original assignment plan
- Actual vs. estimated metrics
- Task completion timeline (Gantt chart)
- Agent utilization breakdown

**Replay Button:**
- Re-runs same instruction graph + rule set
- Shows delta (what changed with current agent pool)
- Useful for debugging or comparing strategies

#### Orchestrator Hub Tips

✅ **Best Practices:**
- Start with medium priority (5) and adjust based on results
- Use affinity for task specialization (code tasks → code agents)
- Simulate multiple times with different constraints before executing
- Check critical path to identify bottlenecks
- Review execution history to learn from past runs

❌ **Common Mistakes:**
- Don't execute without simulating first (you might waste resources)
- Don't set max agents too low if you need fast completion
- Don't ignore "queued" tasks in simulation results
- Don't forget to check Agent Dashboard after execution

**Error Handling:**

**Circular Dependency Error:**
- Symptom: "Circular dependency detected: A → B → C → A"
- Cause: Your instruction graph has a loop (task depends on itself indirectly)
- Fix: Edit the Prompt Canvas to break the cycle

**No Agent Available:**
- Symptom: Tasks marked "unassigned"
- Cause: Affinity rule too strict, no matching agent types available
- Fix: Loosen affinity constraints or add agents of required type

**Budget Overrun:**
- Symptom: Many tasks marked "queued"
- Cause: Max Cost Budget too low for all tasks
- Fix: Increase budget or reduce task count

---

### Prompt Canvas

**Purpose:** Visual workflow builder for composing multi-agent instruction graphs.

**Access:** Click **Workflows** in the left sidebar

#### What You'll See

**Canvas Interface:**
- Large workspace area (center)
- Block palette (left sidebar)
- Properties editor (right sidebar when block selected)
- Top toolbar with save/export buttons

**Block Types:**
- **Task Block** - Single action to execute
- **Decision Block** - Conditional branching (if/else)
- **Loop Block** - Repeat actions (for/while)
- **Parallel Block** - Execute multiple tasks simultaneously
- **Text Block** - Documentation or notes

#### How to Use

**1. Create a Workflow:**

**Add Blocks:**
- Drag block from palette to canvas
- Drop in desired location
- Block appears with default settings

**Configure Blocks:**
- Click block to select
- Properties editor opens on right
- Set block name, description, parameters
- Click outside to deselect

**2. Connect Blocks:**

- Hover over block → connection handles appear
- Drag from one block's output to another's input
- Line appears connecting blocks
- Connection validated (green=valid, orange=warning, red=error)

**Connection Rules:**
- Task → Task: Sequential execution
- Task → Decision: Branch based on task result
- Parallel → Multiple Tasks: Simultaneous execution
- Loop → Task: Repeated execution

**3. Validate Your Canvas:**

- System auto-validates as you build
- Visual feedback on connections:
  - **Green** - Valid connection
  - **Orange** - Warning (may work but check logic)
  - **Red** - Invalid (must fix before executing)

**4. Save Canvas:**

- Click "Save" in toolbar
- Canvas versioned automatically
- Full history maintained
- Can revert to previous versions

**5. Export to Orchestrator:**

- Click "Export to Orchestrator" button
- Instruction graph sent to Orchestrator Hub
- Switch to Orchestrator tab
- Graph automatically loaded for simulation

**6. Preview Instruction Graph:**

- Click "Preview" button
- See JSON representation of your visual workflow
- Shows task decomposition structure
- Useful for debugging complex workflows

#### Prompt Canvas Tips

✅ **Best Practices:**
- Start simple - build small workflows first
- Name blocks clearly (you'll thank yourself later)
- Use parallel blocks for independent tasks (faster execution)
- Test small sections before building large workflows
- Save frequently (auto-save coming in Phase 2)

❌ **Common Mistakes:**
- Don't create circular connections (A → B → A)
- Don't connect incompatible block types
- Don't forget to configure block properties
- Don't make workflows too complex (50+ blocks hard to debug)

---

## Common Workflows

### Workflow 1: Monitor Agent Health

**Goal:** Check on your agent swarm and identify issues.

**Steps:**
1. Click **Agents** in sidebar
2. Scan status badges - look for red (error) or yellow (waiting)
3. If error found:
   - Right-click agent → "Inspect Logs"
   - Read error message in logs
   - Copy logs if needed for debugging
   - Decide: Pause (debug) or Terminate (restart)
4. Check sparklines for performance issues:
   - CPU/Memory consistently high → May need optimization
   - Tokens/min dropping → LLM may be throttling
   - Cost spiking → Check for runaway tasks

**Time Required:** 30 seconds - 2 minutes

---

### Workflow 2: Create and Execute a Simple Task Plan

**Goal:** Set up a rule, simulate a task plan, and execute it.

**Steps:**
1. Click **Orchestrator** in sidebar
2. Click **+ New Rule**
3. Fill in rule form:
   - Name: "Test Execution"
   - Priority: 5 (medium)
   - Affinity: Leave empty (any agent)
   - Max Agents: 10
   - Max Cost: $5
   - Click Save
4. Select your new rule from list (left sidebar)
5. Mock graph auto-loads (or import from Canvas)
6. Click **Simulate** button
7. Review results:
   - Check task assignments
   - Verify estimated cost is acceptable
   - Note estimated duration
8. Adjust constraints if needed:
   - Move "Max Agents" slider
   - Click "Re-Simulate"
   - Compare results
9. Click **Execute Plan**
10. Confirm in dialog
11. Switch to **Agents** tab to watch execution
12. Monitor until status changes to "Complete"

**Time Required:** 3-5 minutes

---

### Workflow 3: Build a Visual Workflow

**Goal:** Create a multi-step workflow in Prompt Canvas and export to Orchestrator.

**Steps:**
1. Click **Workflows** in sidebar
2. Drag "Task" block to canvas → Name it "Fetch Data"
3. Drag another "Task" block → Name it "Process Data"
4. Connect them: Drag from "Fetch Data" output to "Process Data" input
5. Drag "Decision" block → Name it "Check Quality"
6. Connect "Process Data" → "Check Quality"
7. Drag two more "Task" blocks for yes/no paths
8. Connect decision outputs to appropriate tasks
9. Click "Save" to version your canvas
10. Click "Export to Orchestrator"
11. Switch to **Orchestrator** tab
12. Your graph is loaded and ready to simulate

**Time Required:** 5-10 minutes

---

### Workflow 4: Debug a Failed Execution

**Goal:** Investigate why an execution failed and fix it.

**Steps:**
1. Click **Executions** tab (or link in Orchestrator)
2. Find failed execution (status = "failed")
3. Click to view details
4. Review completion timeline - identify which task failed
5. Note the agent that was assigned to failed task
6. Switch to **Agents** tab
7. Find the agent by ID
8. Right-click → "Inspect Logs"
9. Read error logs to understand failure cause
10. Common fixes:
    - **Timeout** → Increase task duration limit in rule constraints
    - **Out of Memory** → Reduce task complexity or add more memory
    - **API Error** → Check external service availability
    - **Dependency Missing** → Fix task sequence in Canvas
11. Update rule or canvas based on findings
12. Re-run execution with corrected configuration

**Time Required:** 5-15 minutes depending on complexity

---

### Workflow 5: Optimize Cost vs. Speed

**Goal:** Find the best balance between execution cost and speed.

**Steps:**
1. Go to **Orchestrator** tab
2. Load instruction graph (from Canvas or use mock)
3. Create baseline simulation:
   - Set Max Agents = 100 (high parallelism)
   - Click "Simulate"
   - Note: Cost = $X, Duration = Y seconds
4. Test lower agent count:
   - Set Max Agents = 50
   - Click "Re-Simulate"
   - Note: Cost = $X', Duration = Y' seconds
5. Continue reducing:
   - Set Max Agents = 20
   - Re-Simulate
   - Note metrics
6. Compare scenarios:
   ```
   100 agents: $50 cost, 30 sec duration
   50 agents:  $40 cost, 45 sec duration
   20 agents:  $30 cost, 90 sec duration
   ```
7. Choose based on priority:
   - **Need speed?** → Use 100 agents (accept higher cost)
   - **Need budget?** → Use 20 agents (accept longer duration)
   - **Balanced?** → Use 50 agents
8. Execute with chosen configuration

**Time Required:** 5-10 minutes

---

## Troubleshooting

### "I don't see the New Rule button"

**Problem:** Orchestrator Hub is loaded but no "New Rule" button visible.

**Solution:**
1. Ensure you're on the correct page: `/orchestrator` route
2. Check left sidebar - should say "Orchestration Rules" at top
3. Click **Orchestrator** in navigation sidebar
4. If page is blank, check browser console for errors (F12)
5. Clear browser cache and refresh (Ctrl+Shift+R / Cmd+Shift+R)

---

### "Agents not updating in real-time"

**Problem:** Status badges and metrics frozen or not changing.

**Solution:**
1. Check WebSocket connection status in browser console (F12)
2. Look for "[WebSocket] Connected" message
3. If not connected:
   - Check if dev server is running
   - Restart dev server: `npm run dev`
   - Refresh browser
4. Verify mock WebSocket is enabled (default in dev mode)
5. Check for errors in console - may indicate JS error blocking updates

---

### "Simulation taking too long (>2s)"

**Problem:** Clicking "Simulate" button but results take >2 seconds.

**Possible Causes:**
1. **Very large graph** (200+ tasks)
   - Solution: Break into smaller workflows

2. **Server overloaded**
   - Solution: Restart dev server

3. **Browser busy**
   - Solution: Close other tabs, check CPU usage

4. **Circular dependency** (stuck in loop detection)
   - Solution: Check instruction graph for cycles

**Debug Steps:**
1. Open browser console (F12)
2. Check Network tab for `/api/orchestrator/simulate` request
3. Look at request timing
4. If >2s, check server logs
5. Simplify graph and try again

---

### "Tasks stuck in 'Queued' status"

**Problem:** Simulation shows many tasks as "queued" instead of "assigned".

**Cause:** Constraints too tight - not enough resources or budget.

**Solutions:**
1. **Increase Max Agents:**
   - Raise slider from 10 → 50
   - Re-simulate

2. **Increase Max Cost Budget:**
   - Raise budget slider
   - Re-simulate

3. **Lower priority threshold:**
   - Reduce minimum priority for task assignment

4. **Check agent availability:**
   - Go to Agents tab
   - Verify agents are online and idle
   - If all busy, wait or add more agents

---

### "Execution failed immediately"

**Problem:** Click "Execute Plan" but status goes to "failed" in <1 second.

**Possible Causes:**
1. **No agents available**
   - Check Agents tab - agents must be online

2. **WebSocket not connected**
   - Tasks can't be broadcast to agents
   - Restart dev server

3. **Invalid task spec**
   - Task configuration malformed
   - Check simulation results for errors

**Debug Steps:**
1. Check browser console for errors
2. Go to Agents tab - verify agents are visible and idle
3. Check execution detail page - look for error message
4. Try simulating first - errors appear earlier
5. Simplify instruction graph to minimal test case

---

### "Canvas blocks won't connect"

**Problem:** Dragging connection from one block to another but line turns red.

**Cause:** Invalid connection type.

**Valid Connections:**
- Task → Task ✅
- Task → Decision ✅
- Decision → Task ✅
- Parallel → Task ✅
- Loop → Task ✅

**Invalid Connections:**
- Decision → Decision ❌
- Parallel → Parallel ❌
- Output → Output ❌
- Input → Input ❌

**Solution:**
1. Check block types - ensure connection is allowed
2. Verify you're dragging from output (right) to input (left)
3. Look for orange/red validation message
4. If stuck, delete connection and try again

---

### "Page is completely blank"

**Problem:** Clicking a navigation item but page doesn't load.

**Solutions:**
1. **Check URL:**
   - Should show route like `/orchestrator` or `/agents`
   - If still at `/`, navigation not working

2. **Check browser console:**
   - F12 → Console tab
   - Look for red errors
   - Common: "Cannot read property of undefined" → JS error

3. **Restart dev server:**
   ```bash
   # Stop server (Ctrl+C)
   npm run dev
   ```

4. **Clear Next.js cache:**
   ```bash
   rm -rf .next
   npm run dev
   ```

5. **Check if route exists:**
   - `/` - Overview (home)
   - `/agents` - Agents Dashboard
   - `/orchestrator` - Orchestrator Hub
   - Other routes may not be implemented yet

---

## Keyboard Shortcuts

### Global Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + K` | Open command palette (coming soon) |
| `Ctrl/Cmd + /` | Toggle sidebar |
| `Esc` | Close modal/dialog |
| `F12` | Open browser dev tools |

### Agents Dashboard

| Shortcut | Action |
|----------|--------|
| `Space` | Select/deselect agent (when focused) |
| `↑/↓` | Navigate agent list |
| `Enter` | Open agent logs (when focused) |
| `Ctrl/Cmd + A` | Select all agents |

### Orchestrator Hub

| Shortcut | Action |
|----------|--------|
| `N` | New rule (when focused on rule list) |
| `S` | Simulate (when rule selected) |
| `E` | Execute plan (when simulation complete) |
| `Delete` | Delete selected rule |

### Prompt Canvas

| Shortcut | Action |
|----------|--------|
| `Delete` | Delete selected block |
| `Ctrl/Cmd + Z` | Undo last action |
| `Ctrl/Cmd + Y` | Redo |
| `Ctrl/Cmd + S` | Save canvas |
| `Ctrl/Cmd + D` | Duplicate selected block |

---

## Quick Reference

### Agent Status Colors

| Color | Status | Meaning |
|-------|--------|---------|
| 🔵 Blue | Processing | Agent actively working on task |
| ⚪ Gray | Idle | Agent waiting for work assignment |
| 🟡 Yellow | Waiting | Blocked by dependencies or constraints |
| 🔴 Red | Error | Agent failed or crashed |
| 🟢 Green | Complete | Task finished successfully |

### Rule Priority Guide

| Priority | When to Use | Effect |
|----------|-------------|--------|
| 10 (Highest) | Critical tasks that must run first | Gets agent resources immediately |
| 7-9 (High) | Important but not urgent | Runs before medium priority |
| 4-6 (Medium) | Standard tasks | Default, balanced execution |
| 1-3 (Low) | Background tasks, cleanup | Runs when resources available |

### Cost Estimation

| Task Type | Typical Cost | Duration |
|-----------|--------------|----------|
| Simple query | $0.05 - $0.15 | 5-10 sec |
| Code generation | $0.15 - $0.50 | 10-30 sec |
| Testing | $0.10 - $0.30 | 15-45 sec |
| Deployment | $0.25 - $1.00 | 30-90 sec |
| Analysis | $0.20 - $0.75 | 20-60 sec |

---

## Additional Resources

### Documentation

- **On-Boarding Guides:** `/docs/on-boarding/`
  - Feature 01: Prompt Canvas
  - Feature 02: Agent Dashboard
  - Feature 03: Orchestrator Hub

- **Architecture Docs:** `/docs/architecture/`
  - System design and technical details
  - API references
  - Data models

- **Bug Fixes:** `/docs/BUG-FIXES.md`
  - Known issues and solutions
  - Hotfix history

- **Changelog:** `/docs/CHANGELOG.md`
  - Feature release history
  - Version notes

### Support

- **Issues:** Report bugs or request features
- **Console Logs:** Check browser console (F12) for errors
- **Server Logs:** Check terminal running `npm run dev` for backend errors

---

## FAQ

**Q: How many agents can the dashboard handle?**
A: The Agent Dashboard is tested with 100+ agents and maintains <500ms render time. Performance may degrade with 200+ agents.

**Q: Can I save my orchestrator rules?**
A: Yes, rules are saved to the backend. Currently in-memory (lost on server restart). Database persistence coming in Phase 2.

**Q: What happens if an agent crashes during execution?**
A: The task is marked as failed. You can view details in the Execution History and replay with a different agent.

**Q: Can I edit a workflow after it's been executed?**
A: Yes, go to Prompt Canvas, modify your workflow, save, and export again. Previous executions remain in history.

**Q: How do I share workflows with my team?**
A: Currently workflows are local. Export/import functionality and team sharing coming in Phase 2.

**Q: What's the maximum workflow size?**
A: Tested with 50-task workflows. Larger workflows (100+ tasks) may work but simulation may take longer.

**Q: Can I cancel an execution mid-flight?**
A: Not yet. Mid-flight cancellation and reassignment coming in Phase 2 (Feature 04).

---

**Last Updated:** 2026-02-08
**Version:** 1.0
