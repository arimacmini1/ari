# AEI Quick Reference Card

**AI Engineering Interface** - Quick reference for common tasks

---

## Navigation

| Section | Purpose | Key Features |
|---------|---------|--------------|
| **Agents** | Monitor agent swarm | Real-time status, logs, control |
| **Orchestrator** | Coordinate workflows | Rules, simulation, execution |
| **Workflows** | Build task graphs | Visual canvas, blocks, connections |

---

## Agent Status Colors

| Color | Status | Action Needed |
|-------|--------|---------------|
| 🔵 Blue | Processing | ✅ Normal - working on task |
| ⚪ Gray | Idle | ✅ Normal - waiting for work |
| 🟡 Yellow | Waiting | ⚠️ Check dependencies |
| 🔴 Red | Error | ❌ Inspect logs immediately |
| 🟢 Green | Complete | ✅ Task finished |

---

## Common Tasks

### Monitor Agents
1. Click **Agents** in sidebar
2. Check status badges for red/yellow
3. Right-click agent → **Inspect Logs** if needed

### Create & Execute Task Plan
1. Click **Orchestrator**
2. Click **+ New Rule**
3. Fill form (name, priority, affinity, constraints)
4. Click **Save**
5. Select rule from list
6. Click **Simulate**
7. Review results
8. Click **Execute Plan**

### Build Visual Workflow
1. Click **Workflows**
2. Drag blocks to canvas
3. Connect blocks (drag output → input)
4. Configure block properties
5. Click **Save**
6. Click **Export to Orchestrator**

### Debug Failed Execution
1. Click **Executions**
2. Find failed execution
3. View details → identify failed task
4. Switch to **Agents**
5. Find agent → **Inspect Logs**
6. Fix issue based on error

---

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Close modal | `Esc` |
| Dev tools | `F12` |
| Select all agents | `Ctrl/Cmd + A` |
| Save canvas | `Ctrl/Cmd + S` |
| Undo | `Ctrl/Cmd + Z` |
| Delete block | `Delete` |

---

## Orchestrator Rules

### Priority Levels
- **10** - Critical (runs first)
- **7-9** - High priority
- **4-6** - Medium (default)
- **1-3** - Low (background)

### Agent Affinity Types
- `code_gen` - Code generation tasks
- `test` - Testing & validation
- `deploy` - Deployment tasks
- `analysis` - Data analysis
- Leave empty = any agent type

### Typical Constraints
- **Max Agents:** 10-100 (balance speed vs cost)
- **Max Cost/Task:** $0.50-$5.00 (depends on task complexity)

---

## Troubleshooting Quick Fixes

| Problem | Quick Fix |
|---------|-----------|
| No "New Rule" button | Click **Orchestrator** in sidebar |
| Agents not updating | Refresh page, check WebSocket in console |
| Simulation slow | Reduce graph size, restart dev server |
| Tasks queued | Increase max agents or budget |
| Execution failed | Check Agents tab for errors, inspect logs |
| Canvas blocks won't connect | Check valid connection types (Task→Task) |
| Blank page | Check URL, clear cache: `rm -rf .next` |

---

## Cost Estimates

| Task Type | Typical Cost | Duration |
|-----------|--------------|----------|
| Simple query | $0.05-$0.15 | 5-10s |
| Code gen | $0.15-$0.50 | 10-30s |
| Testing | $0.10-$0.30 | 15-45s |
| Deployment | $0.25-$1.00 | 30-90s |
| Analysis | $0.20-$0.75 | 20-60s |

---

## Valid Canvas Connections

✅ **Allowed:**
- Task → Task
- Task → Decision
- Decision → Task
- Parallel → Task
- Loop → Task

❌ **Not Allowed:**
- Decision → Decision
- Parallel → Parallel
- Output → Output
- Input → Input

---

## Best Practices

✅ **DO:**
- Monitor agent health regularly
- Simulate before executing
- Start with medium priority (5)
- Use affinity for task specialization
- Save canvas frequently
- Check logs when errors occur

❌ **DON'T:**
- Execute without simulating
- Ignore red status badges
- Set max agents too low
- Create circular dependencies
- Terminate agents without checking logs
- Make workflows >50 tasks

---

## Resources

- **Full Knowledge Base:** `/KNOWLEDGE-BASE.md`
- **On-Boarding Guides:** `/docs/on-boarding/`
- **Architecture Docs:** `/docs/architecture/`
- **Bug Fixes:** `/docs/BUG-FIXES.md`
- **Changelog:** `/docs/CHANGELOG.md`

---

**Need Help?**
1. Check browser console (F12)
2. Check server logs (terminal)
3. Read full KNOWLEDGE-BASE.md
4. Check /docs/ for detailed guides
