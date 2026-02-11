# Complete Workflow Guide – Feature Task → Documentation

This guide walks you through the entire feature development workflow, from planning through completion and bug fixes.

---

## 🎯 The Complete Cycle

```
┌─────────────────────────────────────────────────────────────┐
│                    FEATURE DEVELOPMENT CYCLE                │
└─────────────────────────────────────────────────────────────┘

1. PLANNING PHASE
   └─ Architecture Agent creates feature task file
      └─ Uses: /docs/templates/03-template-feature-task-generator.md
      └─ Output: /docs/tasks/feature-XX-*.md
      └─ Hands to: Implementation Agent

2. IMPLEMENTATION PHASE
   └─ Implementation Agent codes feature
      └─ Updates: /docs/tasks/feature-XX-*.md progress log (daily)
      └─ Marks tasks [x] as complete
      └─ When all Must-Have [x]: hands to Documentation Agent
      └─ (Also handles bug fixes from QA Agent if found)

3. DOCUMENTATION PHASE ⚡ AUTOMATED
   └─ Hook detects all Must-Have tasks [x]
      └─ Invokes: /.claude/hooks/prompts/task-completion-workflow.md
      └─ Documentation Agent receives workflow prompt
      └─ Creates: /docs/on-boarding/feature-XX-onboarding.md
      └─ Creates: /docs/architecture/feature-XX-architecture.md
      └─ Updates: /docs/AGENTS.md files in relevant folders
      └─ Hands to: QA Agent

4. TESTING PHASE
   └─ QA Agent tests using on-boarding guide
      └─ Finds bugs? → Reports to Implementation Agent
         └─ Implementation Agent: fixes bug + updates docs
         └─ Back to: QA Agent for re-test
      └─ All clear? → Feature COMPLETE
      └─ Marks: COMPLETE in task file

5. PRODUCTION
   └─ Feature shipped
   └─ Added to CHANGELOG
   └─ Ready for next feature
```

---

## 📋 Step-by-Step: Planning a Feature

### Step 1: Read Requirements

- Read master PRD: `/docs/prd/master-prd-AEI.md`
- Read project roadmap: `/docs/tasks/project-roadmap.md`
- Identify which feature to plan next

### Step 2: Create Feature Task File

**Who:** Architecture Agent

**How:**
1. Open `/docs/templates/03-template-feature-task-generator.md`
2. Gather required inputs:
   - Project roadmap content
   - Master PRD content
   - All existing feature task files
3. Follow template instructions step-by-step
4. Generate feature task file in `/docs/tasks/feature-XX-*.md`

**Checklist before handing off:**
- [ ] All tasks have IDs: `FXX-TT-NN`
- [ ] Acceptance criteria are testable
- [ ] Dependencies are documented
- [ ] Blocks field updated for previous features
- [ ] Cross-feature dependency map complete
- [ ] Definition of Done is clear

### Step 3: Hand Off to Implementation

- Share feature task file with Implementation Agent
- Implementation Agent reads acceptance criteria
- Implementation Agent begins coding

---

## 💻 Step-by-Step: Implementing a Feature

### Step 1: Read Feature Task File

**Who:** Implementation Agent

**What to understand:**
- Definition of Done
- Must-Have acceptance criteria (what you MUST build)
- Should-Have acceptance criteria (nice to have)
- Could-Have (polish, defer if time runs short)
- Dependencies (what you need before starting)
- Gotchas and debug notes

### Step 2: Code the Feature

**What to do:**
- Implement according to acceptance criteria
- Code the Must-Have tasks first
- Test as you go
- Use git commits to track work

### Step 3: Update Progress Log

**When:** Daily or whenever you complete a task

**Where:** `/docs/tasks/feature-XX-*.md` → "Progress / Fixes / Updates" section

**What to add:**
```markdown
- YYYY-MM-DD: Brief description of what you completed
- YYYY-MM-DD: Bug found: [description]. Root cause: [cause]. Status: [investigating/fixing/fixed]
- YYYY-MM-DD: Fixed [issue]. Verified with [test method].
```

### Step 4: Mark Tasks Complete

**When:** Each task is fully done and tested

**How:**
- In task file, change `- [ ]` to `- [x]`
- Add progress note explaining what was done
- Push changes

### Step 5: Signal Feature Complete

**When:** All Must-Have tasks are marked `[x]`

**How:**
1. Save the file
2. **The hook will automatically detect this!**
3. Claude Code will prompt you with task-completion-workflow
4. Hand off to Documentation Agent

---

## 📖 Step-by-Step: Creating Documentation

### Automatic Trigger (The Hook)

**What happens:**
1. You mark all Must-Have tasks `[x]` in `/docs/tasks/feature-XX-*.md`
2. You save the file
3. `.claude/hooks/feature-task-completion-hook.json` detects the change
4. Hook invokes `/.claude/hooks/prompts/task-completion-workflow.md`
5. Claude Code prompts you with the workflow

**What you see:**
```
🔔 Feature Task Completion Workflow Triggered

/docs/tasks/feature-XX-prompt-canvas.md has all Must-Have tasks marked complete.

Follow the task completion workflow? [Yes] [No] [Show prompt]
```

### Option A: Follow Workflow Manually

Click `[Yes]` and follow the 7 steps in the workflow prompt:

1. ✅ Verify feature completion
2. 📋 Gather feature context from task file
3. 📝 Create on-boarding document: `/docs/on-boarding/feature-XX-onboarding.md`
4. 🏗️ Create architecture document: `/docs/architecture/feature-XX-architecture.md`
5. 🤖 Update AGENTS.md files
6. 📊 Update progress log in task file
7. 📋 Update CHANGELOG.md

### Option B: Ask Claude to Help

**Share the task file with Claude:**

```
I have a completed feature task. All Must-Have tasks are [x].

Task file: /docs/tasks/feature-01-prompt-canvas.md

Please:
1. Generate /docs/on-boarding/feature-01-onboarding.md
2. Generate /docs/architecture/feature-01-architecture.md
3. Update /docs/AGENTS.md files as needed
4. Update CHANGELOG.md

Read the task file first to extract:
- Definition of Done
- Acceptance criteria (for testing guide)
- Gotchas (for debugging guide)
- Implementation details (for architecture)
```

Claude will automatically generate all documentation based on the task file.

### What Gets Created

**1. On-Boarding Guide** (`/docs/on-boarding/feature-XX-onboarding.md`)
- Quick start (2-3 bullets)
- Feature overview
- Testing guide (step-by-step)
- Quick reference (components, functions)
- Debugging guide (gotchas and solutions)
- API reference (if applicable)
- FAQ section
- File structure

**2. Architecture Document** (`/docs/architecture/feature-XX-architecture.md`)
- System overview
- Component architecture
- Data models
- API contracts
- Design decisions (with trade-offs)
- Implementation details
- Testing strategy
- Performance characteristics
- Known limitations & future work

**3. Updated AGENTS.md Files**
- `/docs/AGENTS.md` - Add feature to routing
- `/docs/tasks/AGENTS.md` - Reference the task file
- `/docs/on-boarding/AGENTS.md` - Note new guide
- `/docs/architecture/AGENTS.md` - Note new architecture doc

**4. Updated CHANGELOG.md**
```markdown
## [2026-02-06] Feature 01 – Prompt Canvas Completed

- On-boarding guide: `/docs/on-boarding/feature-01-onboarding.md`
- Architecture doc: `/docs/architecture/feature-01-architecture.md`
- Task file: `/docs/tasks/feature-01-prompt-canvas.md`
- Implementation status: All Must-Have tasks complete, ready for testing
```

---

## 🧪 Step-by-Step: Testing a Feature

### Step 1: Receive On-Boarding Guide

**Who:** QA/Testing Agent

**From:** Documentation Agent

**What you have:** `/docs/on-boarding/feature-XX-onboarding.md`

### Step 2: Follow Testing Guide

**In the on-boarding guide, find the "Testing Guide" section**

It contains:
- Checklist of manual tests
- Expected outcomes
- How to verify success

**Run each test:**
```markdown
- [ ] Can drag a block from toolbar to canvas
  Expected: Block appears on canvas at cursor location
  ✓ Verified

- [ ] Can edit block properties
  Expected: Property panel opens, allows editing name and type
  ✓ Verified

- [ ] Can create edge between blocks
  Expected: Click on output port, drag to input port, edge appears
  ✓ Verified

- [ ] Undo works with 50+ changes
  Expected: Undo stack doesn't get corrupted
  ✓ Verified
```

### Step 3: Found a Bug?

**What to do:**

1. **Document the bug** in the task file's "Progress / Fixes / Updates":
   ```markdown
   - 2026-02-07 (bug): Undo doesn't work with >50 changes
     Steps to reproduce:
     1. Create 60 blocks on canvas
     2. Make 60 edits
     3. Try to undo
     Expected: Undo works
     Actual: Error: state array overflow
   ```

2. **Hand off to Implementation Agent**
   - Send them the bug report
   - Implementation Agent reads bug description
   - Implementation Agent fixes bug

3. **Implementation Agent**:
   - Fixes bug in code
   - Updates task file progress: "Fixed undo limit bug"
   - **Updates on-boarding guide** if behavior changed
   - **Updates architecture doc** if design changed
   - Hands back to QA Agent

4. **You re-test**:
   - Run the same test again
   - Verify bug is fixed
   - Mark test as passed

### Step 4: All Tests Pass?

**Mark feature as COMPLETE:**

In task file, add to progress log:
```markdown
- 2026-02-08: All testing complete. Feature ready for production. Added to CHANGELOG.
```

**Feature is shipped!** 🎉

---

## 🐛 Step-by-Step: Handling Bugs

### Bug Found (Any Phase)

**Scenario:** During implementation or testing, a bug is discovered

**Who:** Whoever found it (QA or Implementation Agent)

**Step 1: Document the Bug**
- **Where:** `/docs/tasks/feature-XX-*.md` → "Progress / Fixes / Updates"
- **What to include:**
  ```markdown
  - 2026-02-10 (bug): [Clear bug title]
    Reproducer: [Steps to reproduce]
    Root cause: [What's actually wrong]
    Status: [investigating/fixing/fixed]
  ```

**Step 2: Hand to Implementation Agent**
- If QA found it: notify Implementation Agent
- Implementation Agent reads bug description

**Step 3: Implementation Agent Fixes It**
1. Fixes the bug in code
2. Tests the fix locally
3. Updates task file progress:
   ```markdown
   - 2026-02-11: Fixed [bug name]. Root cause was [cause].
     Fixed by [solution]. Tested with [test method].
   ```

**Step 4: Update Documentation**
- **Update On-Boarding Guide** if behavior changed
  ```markdown
  - 2026-02-11 (bug fix): Undo now works with 50+ changes.
    Previously had a limit at 50 items, now unlimited.
  ```
- **Update Architecture Doc** if design changed
  ```markdown
  - 2026-02-11: Changed state management from array to ring buffer
    to support unlimited undo history.
  ```

**Step 5: Hand Back to QA Agent**
- QA Agent re-tests the fix
- Verifies bug is solved
- If verified: feature stays COMPLETE
- If new issue: back to Implementation Agent

---

## 🔄 Quick Reference: Who Does What

| Task | Agent Type | Triggers | Output |
|------|-----------|----------|--------|
| Plan feature | Architecture | PRD + Roadmap | `/docs/tasks/feature-XX-*.md` |
| Implement feature | Implementation | Feature task file | Code + progress updates |
| Create docs | Documentation | All Must-Have `[x]` | On-boarding + architecture docs |
| Test feature | QA | On-boarding guide | Bug reports or "COMPLETE" |
| Fix bugs | Implementation | Bug report | Fixed code + doc updates |
| Review design | Architecture | Request | Design feedback |

---

## ⚡ Using the Hook System

### The Hook Watches For

**File:** `/docs/tasks/feature-*.md`

**Trigger:** When file is saved with Must-Have tasks marked `[x]`

**Pattern detected:** `- [x] \`F\d+-MH-`

### What Happens Next

1. Hook recognizes pattern
2. Prompts you with task-completion-workflow
3. You can:
   - Click `[Yes]` - start workflow
   - Click `[No]` - skip for now
   - Click `[Show prompt]` - see the full workflow guide

### Manually Triggering the Workflow

If the hook doesn't trigger (or you want to start it manually):

1. Open `.claude/hooks/prompts/task-completion-workflow.md`
2. Copy the entire content
3. Paste into Claude Code chat
4. Follow the steps

---

## 📁 File Organization

```
docs/
├── AGENTS.md                          ← Main routing guide (READ THIS FIRST)
├── WORKFLOW-GUIDE.md                  ← This file
├── CHANGELOG.md                       ← Feature completion log
│
├── templates/                         ← Templates for creating docs
│   ├── AGENTS.md                      ← Template ownership & usage
│   ├── 01-template-prd-AEI.md
│   ├── 02-template-project-task-generator.md
│   ├── 03-template-feature-task-generator.md
│   └── 04-template-task-completion-workflow.md
│
├── tasks/                             ← Feature task files (in progress & completed)
│   ├── AGENTS.md                      ← Task tracking responsibilities
│   ├── project-roadmap.md             ← High-level feature sequencing
│   ├── feature-00-foundations.md      ← Example: completed feature
│   ├── feature-00.5-prototype-polish.md
│   └── feature-01-prompt-canvas.md    ← Example: in-progress feature
│
├── on-boarding/                       ← Feature guides created after completion
│   ├── AGENTS.md                      ← Documentation ownership
│   ├── feature-00.5-onboarding.md     ← Example: completed feature guide
│   └── feature-01-onboarding.md       ← Created after Feature 01 done
│
├── architecture/                      ← Architecture docs created after completion
│   ├── AGENTS.md                      ← Architecture doc ownership
│   ├── README.md
│   └── feature-01-architecture.md     ← Created after Feature 01 done
│
├── prd/                               ← Product requirements
│   ├── AGENTS.md                      ← PRD ownership
│   └── master-prd-AEI.md              ← Main product requirements
│
└── .claude/
    └── hooks/                         ← Hook configurations
        ├── README.md                  ← Hook system guide (READ THIS)
        ├── feature-task-completion-hook.json
        └── prompts/
            └── task-completion-workflow.md ← Workflow triggered by hook
```

---

## 🎯 Key Rules to Remember

1. **Task IDs are permanent**
   - Once created: `F00-MH-01` stays forever
   - Other features reference these IDs
   - Never delete or rename

2. **Progress log is single source of truth**
   - All changes logged in task file
   - Dated entries with what changed
   - Bugs reported here, fixes logged here

3. **Dependencies are symmetric**
   - If A depends on B, then B blocks A
   - Both must list each other
   - "Blocks Update Patch" in new features updates old ones

4. **Documentation updates with code**
   - When feature complete: docs created immediately
   - When bug fixed: docs updated immediately
   - No "technical debt" on documentation

5. **Hooks automate, don't force**
   - Hook detects completion and offers workflow
   - You can accept or skip
   - You can always trigger manually

---

## 🚀 Getting Started

**First time?** Read these in order:

1. `/docs/AGENTS.md` - Understand who does what
2. `/docs/WORKFLOW-GUIDE.md` - This file! Overview of flow
3. `/.claude/hooks/README.md` - Understand the hook system
4. `/docs/templates/AGENTS.md` - Understand available templates

**Ready to start a feature?**
1. Read `/docs/templates/03-template-feature-task-generator.md`
2. Gather inputs (roadmap + PRD)
3. Create feature task file

**Completing a feature?**
1. Mark all Must-Have tasks `[x]`
2. Wait for hook (or trigger manually)
3. Follow task-completion-workflow

**Found a bug?**
1. Document in task file
2. Hand to Implementation Agent
3. Implementation Agent fixes
4. Documentation Agent updates docs
5. QA re-tests

---

## 📞 Questions?

Refer to these guides:
- **Agent responsibilities:** `/docs/AGENTS.md`
- **Specific folder:** `/docs/[FOLDER]/AGENTS.md`
- **Hook system:** `/.claude/hooks/README.md`
- **Creating templates:** `/docs/templates/AGENTS.md`

**Still stuck?** Ask Claude:
```
I'm confused about [workflow step].
Can you explain what should happen next?

Context: I just [what I did], now I need to [what I want to do].
```

---

## 🎉 You're Ready!

You now have:
- ✅ Clear agent roles and responsibilities
- ✅ Automated hook system for documentation
- ✅ Comprehensive workflow from planning → implementation → testing
- ✅ Documentation that updates with code
- ✅ AGENTS.md files explaining each domain

**Start your next feature with confidence!**
