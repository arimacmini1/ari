# Quick Start – Using the New Workflow System

Welcome! This document gets you up and running with the automated feature completion workflow.

---

## 🎯 What Just Changed?

You now have:

1. **Automated Hook System** - Detects when feature tasks are complete
2. **Task Completion Workflow** - Guides documentation creation automatically
3. **AGENTS.md Files** - Clear routing for who works where
4. **Documentation Templates** - Structured guides for all document types

---

## ⚡ 30-Second Overview

```
Your workflow used to be:
Code feature → Manually create docs → Test → Fix bugs → Manually update docs

Your workflow now is:
Code feature → Mark complete → Hook triggers → Docs auto-created → Test → Fix bugs → Docs auto-updated
```

The hook watches for when you mark tasks complete. When it detects all Must-Have tasks `[x]`, it automatically offers to create your on-boarding and architecture guides.

---

## 🚀 How to Use (Step by Step)

### 1️⃣ Start a Feature (Nothing Changed)

**What you do:**
- Ask Architecture Agent to create feature task file
- Or follow `/docs/templates/03-template-feature-task-generator.md`
- Output: `/docs/tasks/feature-XX-*.md`

**Same as before!** This step hasn't changed.

### 2️⃣ Implement Feature (Update Progress Log)

**What you do:**
- Code the feature as normal
- Update progress log in `/docs/tasks/feature-XX-*.md` daily
- Mark tasks `[x]` as you complete them
- Push changes

**What's new:** The hook watches for task completion markers.

### 3️⃣ Mark Feature Complete (NEW!)

**What you do:**
1. Mark all Must-Have tasks as `- [x]` (complete checkbox)
2. Save the file
3. **The hook automatically detects this!**

**What you see:**
```
🔔 Feature Task Completion Hook Triggered

/docs/tasks/feature-XX-prompt-canvas.md has all Must-Have tasks marked complete.

Follow the task completion workflow?
[Yes] [No] [Show prompt]
```

### 4️⃣ Generate Documentation (AUTOMATED!)

**Click `[Yes]` → See task-completion-workflow.md prompt**

The prompt guides you through:
1. ✅ Verify feature is actually done
2. 📋 Gather context from task file
3. 📝 Create on-boarding guide
4. 🏗️ Create architecture doc
5. 🤖 Update AGENTS.md files
6. 📊 Update progress log
7. 📋 Update changelog

**You can:**
- Follow the steps manually (write docs yourself)
- Ask Claude to help (it reads task file and generates docs)
- Ask Claude to do it all (full automation)

### 5️⃣ Test Feature (Same as Before)

- QA agent tests using on-boarding guide
- Finds bugs? Report them
- Implementation agent fixes them
- QA retests

### 6️⃣ Bug Fix Cycle (NEW: Docs Update Automatically)

**When a bug is fixed:**
1. Implementation Agent fixes code
2. **Implementation Agent also updates:**
   - `/docs/on-boarding/feature-XX-onboarding.md` (if behavior changed)
   - `/docs/architecture/feature-XX-architecture.md` (if design changed)
3. Updates task file progress log
4. QA Agent retests

**This is the key difference:** Documentation updates immediately when bugs are fixed, no manual "catch-up" needed later.

---

## 📁 New Files Created

### Hook Configuration
```
.claude/hooks/
├── README.md                           ← How to use hooks
├── feature-task-completion-hook.json   ← Hook definition
└── prompts/
    └── task-completion-workflow.md     ← Workflow guide (triggered by hook)
```

### Workflow Templates
```
docs/templates/
├── 04-template-task-completion-workflow.md  ← Detailed workflow (same as hook)
└── AGENTS.md                                ← Template ownership guide
```

### Agent Routing Guides
```
docs/
├── AGENTS.md                           ← Main: who works where
├── WORKFLOW-GUIDE.md                   ← Complete workflow walkthrough
├── QUICK-START.md                      ← This file!
├── tasks/AGENTS.md                     ← Task file ownership
├── on-boarding/AGENTS.md               ← Documentation ownership
├── architecture/AGENTS.md              ← Architecture ownership
├── prd/AGENTS.md                       ← PRD ownership
└── templates/AGENTS.md                 ← Template ownership
```

---

## 🔧 How the Hook Works (Technical)

### The Hook Configuration

**File:** `.claude/hooks/feature-task-completion-hook.json`

**What it does:**
- Watches: `/docs/tasks/feature-*.md` files
- Triggers when: File contains `- [x] \`F\d+-MH-` (completed Must-Have tasks)
- Invokes: `.claude/hooks/prompts/task-completion-workflow.md`
- Asks: "Follow the workflow? [Yes] [No] [Show]"

### Inside the Hook

```json
{
  "name": "Feature Task Completion Workflow",
  "trigger": {
    "type": "file_change",
    "paths": ["docs/tasks/feature-*.md"],
    "conditions": [
      {
        "pattern": "- \\[x\\] `F\\d+-MH-"
      }
    ]
  },
  "actions": [
    {
      "type": "prompt",
      "file": ".claude/hooks/prompts/task-completion-workflow.md"
    }
  ]
}
```

### Manual Trigger (if hook doesn't fire)

If the hook doesn't trigger automatically:

1. Open: `.claude/hooks/prompts/task-completion-workflow.md`
2. Copy all content
3. Paste into Claude Code chat
4. Claude will guide you through workflow

---

## 📋 Real Example: Feature 01 – Prompt Canvas

### Day 1: Feature Planning
```
Architecture Agent creates: /docs/tasks/feature-01-prompt-canvas.md
- F01-MH-01: Build canvas component scaffolding
- F01-MH-02: Add drag-and-drop support
- F01-SH-01: Add undo/redo
- (etc.)
```

### Days 2-5: Implementation
```
Implementation Agent codes feature
- Daily: updates progress log
- When task complete: marks with [x]
- Day 5: All Must-Have tasks marked [x]
```

### Day 5 Evening: Hook Triggers!
```
Implementation Agent saves file with all [x]
Hook detects: "All Must-Have tasks complete!"
Prompt appears: "Follow workflow? [Yes] [No]"
Implementation Agent: clicks [Yes]
```

### Day 6: Documentation Created
```
Documentation Agent receives workflow prompt
Reads: /docs/tasks/feature-01-prompt-canvas.md
Creates: /docs/on-boarding/feature-01-onboarding.md
Creates: /docs/architecture/feature-01-architecture.md
Updates: /docs/AGENTS.md files
Updates: progress log
Hands to: QA Agent
```

### Day 7: Testing
```
QA Agent reads: /docs/on-boarding/feature-01-onboarding.md
Tests feature according to guide
Tests pass → Feature COMPLETE 🎉
```

### Day 8: Bug Found
```
QA Agent: "Found bug: Undo breaks with 50+ changes"
Reports: In task file progress log
Implementation Agent: fixes bug
Implementation Agent: updates on-boarding guide
Implementation Agent: updates architecture doc
QA Agent: retests and confirms fixed
```

---

## 📚 Documentation to Read

### Must-Read
1. **[`/docs/AGENTS.md`](#)** - Start here! Understand who does what
2. **[`/docs/WORKFLOW-GUIDE.md`](#)** - Complete workflow walkthrough
3. **[`/.claude/hooks/README.md`](#)** - How the hook system works

### Reference (Read as Needed)
- **[`/.claude/hooks/prompts/task-completion-workflow.md`](#)** - Triggered by hook, guides doc creation
- **[`/docs/templates/04-template-task-completion-workflow.md`](#)** - Detailed workflow rules
- **[`/docs/tasks/AGENTS.md`](#)** - Understanding task files
- **[`/docs/on-boarding/AGENTS.md`](#)** - Creating on-boarding guides
- **[`/docs/architecture/AGENTS.md`](#)** - Creating architecture docs

### Templates (Use When Creating Documents)
- **[`/docs/templates/03-template-feature-task-generator.md`](#)** - Creating feature task files
- **[`/docs/templates/01-template-prd-AEI.md`](#)** - Creating PRDs
- **[`/docs/templates/02-template-project-task-generator.md`](#)** - Creating roadmaps

---

## 🎯 Three Ways to Use the System

### Option 1: Automatic (Easiest)

```
1. Mark all Must-Have tasks [x]
2. Save file
3. Hook prompts: "Follow workflow?"
4. Click [Yes]
5. Follow the steps to create docs
```

**Best for:** When you want guided workflow

### Option 2: Ask Claude (Recommended)

```
1. Mark all Must-Have tasks [x]
2. Ask Claude:
   "Please create on-boarding and architecture
    docs for /docs/tasks/feature-01-*.md"
3. Claude reads task file and generates all docs
4. You review and commit
```

**Best for:** Getting docs created quickly and accurately

### Option 3: Manual (Most Control)

```
1. Follow workflow steps in /docs/templates/04-template-task-completion-workflow.md
2. Manually write on-boarding guide
3. Manually write architecture doc
4. Update AGENTS.md files
5. Update changelog
```

**Best for:** When you want full control over wording/structure

---

## ✅ Checklist: Your First Feature Complete

When completing your first feature with the new system:

- [ ] All Must-Have tasks marked `[x]`
- [ ] Feature has been manually tested
- [ ] No critical bugs blocking
- [ ] Task file progress log updated
- [ ] Feature file saved
- [ ] Hook detects completion (see prompt)
- [ ] Create docs using one of three methods above
- [ ] On-boarding guide created
- [ ] Architecture doc created
- [ ] AGENTS.md files updated
- [ ] Progress log has completion note
- [ ] Changelog updated
- [ ] Docs committed and pushed
- [ ] QA tests using on-boarding guide
- [ ] Any bugs found and fixed
- [ ] Feature marked COMPLETE

---

## 🚀 Quick Commands

### Check Hook Status
```bash
# View hook configuration
cat .claude/hooks/feature-task-completion-hook.json

# View hook documentation
cat .claude/hooks/README.md

# View workflow that gets triggered
cat .claude/hooks/prompts/task-completion-workflow.md
```

### View AGENTS Files
```bash
# Main routing guide
cat docs/AGENTS.md

# Task ownership
cat docs/tasks/AGENTS.md

# Documentation ownership
cat docs/on-boarding/AGENTS.md

# Architecture ownership
cat docs/architecture/AGENTS.md
```

### View Workflow Guides
```bash
# This file
cat docs/QUICK-START.md

# Complete workflow walkthrough
cat docs/WORKFLOW-GUIDE.md

# Detailed workflow rules
cat docs/templates/04-template-task-completion-workflow.md
```

---

## ❓ Common Questions

### Q: What if the hook doesn't trigger?

A: The hook requires both:
1. File in `/docs/tasks/feature-*.md`
2. Pattern: `- [x] \`F\d+-MH-` (completed Must-Have task)

If it doesn't trigger:
1. Make sure you marked `- [x]` (checked box)
2. Make sure filename matches `feature-*.md`
3. Manually trigger by pasting `.claude/hooks/prompts/task-completion-workflow.md` into Claude Code

### Q: Can I skip documentation?

A: No! Documentation is now part of feature completion. But it's automated:
1. You provide task file with context
2. Claude generates docs automatically
3. You review (not write from scratch)

### Q: What if the generated docs aren't perfect?

A: That's normal!
1. Review the generated docs
2. Ask Claude to improve specific sections
3. Or manually edit them
4. Docs are living documents - update them as you discover issues

### Q: When do I update docs after a bug fix?

A: Immediately when the bug is fixed:
1. Implementation Agent fixes code
2. Implementation Agent updates on-boarding (if behavior changed)
3. Implementation Agent updates architecture (if design changed)
4. Implementation Agent pushes changes
5. QA Agent retests

Don't defer documentation updates!

### Q: Do I need to read all the AGENTS.md files?

A: No! Read these first:
1. `/docs/AGENTS.md` - Understand roles
2. `/docs/WORKFLOW-GUIDE.md` - Understand workflow
3. `/.claude/hooks/README.md` - Understand hook system

Then reference others as needed.

### Q: What about existing features without documentation?

A: If you have in-progress features:
1. Finish the feature (mark all Must-Have `[x]`)
2. Hook triggers automatically
3. Create docs at that time

Retroactively creating docs for old features is optional - focus on new features going forward.

---

## 📞 Need Help?

1. **Check AGENTS.md files** - Usually explains what you need
2. **Read WORKFLOW-GUIDE.md** - Step-by-step walkthrough
3. **Ask Claude** - "I'm stuck at [step], what should I do?"
4. **Check templates** - Use `/docs/templates/` to see examples

---

## 🎉 You're Ready!

You now have:
- ✅ Automatic hook system (detects feature completion)
- ✅ Workflow prompts (guides documentation creation)
- ✅ Clear agent roles (knows who does what)
- ✅ Templates (creates consistent documentation)
- ✅ Living documentation (updates with code)

**Your next feature will be much smoother.**

Start here:
1. Plan feature using template 03
2. Implement the feature
3. Mark tasks complete `[x]`
4. Let the hook trigger
5. Generate docs (automatic or with Claude help)
6. Test feature
7. Fix any bugs (docs update automatically)
8. Done! 🚀

---

## 📖 Table of Contents for All Docs

```
docs/
├── QUICK-START.md                     ← You are here!
├── AGENTS.md                          ← Read this next
├── WORKFLOW-GUIDE.md                  ← Then this
├── CHANGELOG.md                       ← Feature completions log
│
├── .claude/hooks/
│   ├── README.md                      ← Hook system guide
│   └── prompts/task-completion-workflow.md
│
├── templates/
│   ├── 03-template-feature-task-generator.md
│   ├── 04-template-task-completion-workflow.md
│   └── AGENTS.md
│
├── tasks/
│   ├── project-roadmap.md
│   ├── feature-XX-*.md
│   └── AGENTS.md
│
├── on-boarding/
│   ├── feature-XX-onboarding.md
│   └── AGENTS.md
│
└── architecture/
    ├── feature-XX-architecture.md
    └── AGENTS.md
```

---

**Welcome to the new workflow! Questions? Read the docs or ask Claude. You've got this! 🚀**
