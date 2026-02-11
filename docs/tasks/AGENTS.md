# Tasks Folder – Agent Routing & Responsibilities

## Overview

This folder contains feature task files that track feature development from planning through completion and testing.

**Location:** `/docs/tasks/`

**File pattern:** `feature-XX-[kebab-case-name].md`

**Primary agents:** Implementation Agents + QA Agents

**Who creates:** Architecture Agents (during planning)

**Who updates:** Implementation Agents (daily progress) + QA Agents (testing notes)

---

## Folder At A Glance

```
docs/tasks/
├── feature-00-foundations.md           ✅ COMPLETED
├── feature-00.5-prototype-polish.md    ✅ COMPLETED
├── feature-01-prompt-canvas.md         ✅ COMPLETED
├── feature-02-agent-dashboard.md       ✅ COMPLETED
├── feature-03-orchestrator-hub.md      ✅ COMPLETED
├── feature-04-output-simulator.md      ✅ COMPLETED
├── feature-05-ai-trace-viewer.md       📋 IN PLANNING
├── project-roadmap.md                  (master roadmap)
└── AGENTS.md                           (this file)
```

---

## Who Works Here?

### 1. **Architecture Agents** (Create initial task files)
- Create feature task files during planning phase: `/docs/tasks/feature-XX-*.md`
- Define Must-Have, Should-Have, Could-Have tasks
- Set acceptance criteria and dependencies
- Establish cross-feature linking
- Include "Blocks Update Patch" section to notify other agents
- **Hands off to:** Implementation Agent

### 2. **Implementation Agents** (Execute & update progress)
- Read task file acceptance criteria
- Implement feature in codebase
- Mark tasks `[x]` as complete (in task file)
- **Update "Progress / Fixes / Updates" section DAILY** (MANDATORY)
- When all Must-Have tasks `[x]`: signal Documentation Agent
- If bugs found by QA: receive, fix, update progress, hand back to QA
- **Hands off to:** Documentation Agent (when all Must-Have `[x]`)

### 3. **QA/Testing Agents** (Test & report bugs)
- Test completed feature using on-boarding guide
- Report bugs by adding entries to "Progress / Fixes / Updates"
- Verify bug fixes
- Mark feature as final when all bugs fixed
- **Hands off to:** Implementation Agent (when bugs found)

---

## Task File Structure

Every feature task file follows this strict format:

```markdown
# Feature XX – [Full Feature Name]

**Priority:** [01 = highest → 11 = lowest]
**Target completion:** [timeline]
**Why this feature now:** [1–2 punchy sentences]

## Definition of Done
[One paragraph: what a real user can do when feature ships]

## Must-Have Tasks
- [x] `FXX-MH-01` Task title
  - Owner: [Agent type]
  - Dependencies: [other task IDs or none]
  - Blocks: [tasks that depend on this]
  - Roadmap ref: [PX-TT-NN]
  - Acceptance criteria:
    - Testable item 1
    - Testable item 2
    - Testable item 3
  - Effort: S / M / L / XL
  - Gotchas / debug notes: [common failures]
  - Progress / Fixes / Updates:
    - YYYY-MM-DD: Notes on progress, fixes, validation

## Should-Have Tasks
[Same structure as Must-Have]

## Could-Have Tasks
[Same structure as Must-Have]

## Cross-Feature Dependency Map
[Shows dependencies on other features]

## Blocks Update Patch
[Lists tasks in previous features that need updated Blocks field]
```

---

## Progress Logging Rule (MANDATORY)

Every task must have a `Progress / Fixes / Updates` section.

**When to add entries:**
- When starting the task
- When completing the task
- When a bug is discovered
- When a bug is fixed
- When acceptance criteria change
- When dependency discovered

**Format:**
```markdown
- Progress / Fixes / Updates:
  - 2026-02-08: Started implementation. Building React component for block interface.
  - 2026-02-09: Basic rendering working. Block types: Task, Decision, Loop, Parallel, Text.
  - 2026-02-10: Drag-and-drop integrated using react-flow. Undo/redo working.
  - 2026-02-10 (bug): Undo breaks with 50+ changes. Root cause: state array growing unbounded.
  - 2026-02-11: Fixed undo limit. Now caps at 50 changes. Verified with 100-change test.
```

**What to include:**
- What was done
- What was verified/tested
- Any blockers or issues
- Decisions made
- Links to related PRs or commits

---

## Workflow Checkpoints

### ✅ Task Created by Architecture Agent
- Feature task file in `/docs/tasks/feature-XX-*.md`
- All tasks have IDs: `FXX-TT-NN`
- Dependencies and Blocks populated
- Acceptance criteria clear and testable
- Blocks Update Patch section included
- **Next:** Hands to Implementation Agent

---

## Blocks Update Automation (Recommended)

To avoid opening multiple feature files just to apply Blocks updates, use the generated
summary + scripts below.

**Summary files (generated):**
- `/docs/tasks/blocks-update-summary.md` (human-readable)
- `/docs/tasks/blocks-update-summary.json` (machine-readable)

**Scripts:**
- `scripts/update-blocks-summary.ps1` — scans all `feature-*.md` files and rebuilds the summary
- `scripts/apply-blocks-updates.ps1` — applies the Blocks updates to target files using the summary

**Workflow:**
1. After creating a new feature file, run `scripts/update-blocks-summary.ps1`
2. Then run `scripts/apply-blocks-updates.ps1` to update prior feature files

### ✅ Implementation In Progress
- Implementation Agent updates progress log daily
- Each completed task marked `[x]`
- Any blockers logged in progress section
- All bugs and issues tracked in progress
- **Next:** When all Must-Have tasks `[x]`, signals Documentation Agent

### ✅ Hook Triggers (All Must-Have tasks `[x]`)
- Hook detects `- [x] \`F\d+-MH-` pattern
- Prompts with task-completion-workflow
- **Next:** Documentation Agent creates guides

### ✅ On-Boarding & Architecture Docs Created
- `/docs/on-boarding/feature-XX-onboarding.md` created
- `/docs/architecture/feature-XX-architecture.md` created
- Links to task IDs included in docs
- **Next:** Hands to QA Agent for testing

### ✅ Testing Phase Begins
- QA Agent tests using on-boarding guide
- If bugs found: reported in task file progress section
- **Next:** If bugs: hand to Implementation Agent for fix. If clear: mark COMPLETE

### ✅ Bug Fix Cycle (if needed)
- Implementation Agent fixes bug
- Updates progress log with fix details
- Ensures on-boarding & architecture docs updated
- **Next:** Hands back to QA Agent for re-test

### ✅ Feature Complete
- All bugs fixed and verified
- Documentation updated with all fixes
- Feature marked `COMPLETE`
- Added to `/docs/CHANGELOG.md`
- **Status:** Ready for production

---

## Key Rules

### Rule 1: Task IDs are Immutable
Once a task is created with ID `F00-MH-01`, it keeps that ID forever, even if:
- The task is split into sub-tasks
- The task is deleted
- The feature is shipped

**Why:** Other features reference these IDs in Dependencies/Blocks fields.

### Rule 2: Progress Log is Single Source of Truth
The `Progress / Fixes / Updates` section is the complete history of what happened to this task.
- No separate issue tracker
- No separate wiki
- All updates go here with dates

### Rule 3: Dependencies Must Be Symmetric
If task A lists task B in `Dependencies`, then task B must list task A in `Blocks`.

**When creating a new feature file:**
- Include a "Blocks Update Patch" section
- Lists which tasks in previous features need their Blocks field updated

### Rule 4: External Dependencies Noted
Non-task blockers use `ext:` prefix:
- `ext:OpenAI-API-key` - Need API key to proceed
- `ext:Docker-running` - Need Docker service running
- `ext:Figma-designs` - Waiting on design artifacts

### Rule 5: Effort Estimation
Tasks are estimated as:
- `S` = Small (< 4 hours)
- `M` = Medium (4-8 hours)
- `L` = Large (1-2 days)
- `XL` = Extra Large (3+ days or multi-day)

---

## Common Patterns

### Pattern 1: Feature Blocked by External API
```markdown
- [ ] `F01-MH-03` Integrate OpenAI API for prompt execution
  - Dependencies: ext:OpenAI-API-key, F00-MH-05 (auth system)
  - Progress / Fixes / Updates:
    - 2026-02-08: Waiting on API key. Environment var not set yet.
    - 2026-02-09: API key received. Beginning integration.
```

### Pattern 2: Bug Discovered During Testing
```markdown
- [x] `F00-MH-02` Build canvas component
  - Progress / Fixes / Updates:
    - 2026-02-10: Feature complete and merged.
    - 2026-02-12 (bug): Undo doesn't work with >50 changes. Breaking QA tests.
    - 2026-02-13: Bug root caused. State array not capped. Fix applied.
    - 2026-02-13: Fix verified. All tests passing.
```

### Pattern 3: Cross-Feature Dependency
```markdown
- [ ] `F02-MH-01` Build agent dashboard
  - Dependencies: F01-MH-02 (canvas done), F00-MH-05 (auth system)
  - Blocks: F03-MH-01 (orchestrator needs dashboard)
```

---

## When to Create Sub-Tasks

Create a new task (with new ID) when:
- Work can be done in parallel with other tasks
- Different person/agent will own it
- Acceptance criteria are clearly independent
- Estimated effort is >1 day

Do NOT split a task if:
- It's already small (<1 day effort)
- Work is strictly sequential
- Requires same person to understand context

---

## Updating This Folder

- Add new feature files as features are planned
- Archive completed features (optional: move to `/docs/archive/` if folder grows)
- Keep CHANGELOG.md updated with feature completions
- Reference this AGENTS.md from main `/docs/AGENTS.md`

---

## Quick Links

- **Feature Task Template:** `/docs/templates/03-template-feature-task-generator.md`
- **Task Completion Workflow:** `/docs/templates/04-template-task-completion-workflow.md`
- **Hook Configuration:** `/.claude/hooks/README.md`
- **Main Agent Routing:** `/docs/AGENTS.md`
