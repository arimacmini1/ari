# Agent Responsibilities & Task Routing

This document describes which agents work on different aspects of the project, where they operate, and how to route tasks to them.

---

## 📋 Directory Structure & Agent Ownership

```
docs/
├── architecture/     ← Owned by: Architecture & Design Agents
├── on-boarding/      ← Owned by: Documentation Agents
├── prd/              ← Owned by: Architecture & Design Agents
├── task/             ← (Legacy directory)
├── tasks/            ← Owned by: Implementation + QA Agents
├── templates/        ← Owned by: Architecture & Design Agents
└── AGENTS.md         ← Central routing guide (this file)
```

---

## 🤖 Agent Types & Responsibilities

## Model Policy (Feature Implementation)

- Any implementation task with ID pattern `FXX-*` (for example `F14-MH-01`) must be executed in a Codex session configured to use model `gpt-5.3-codex`.
- Planning, documentation drafting, and parity/index generation may run on other models, but code implementation must switch before edits begin.
- This policy applies to all feature files under `docs/tasks/feature-*.md`.

### 1. Architecture & Design Agents

**What they do:**
- Design systems and features
- Create product requirement documents (PRDs)
- Plan feature tasks and dependencies
- Make technology decisions
- Review architectural decisions

**Where they work:**
- `/docs/prd/` - Product requirements
- `/docs/architecture/` - System design & decisions
- `/docs/templates/` - Create task/workflow templates
- `/docs/tasks/` - Create feature task files (initial planning)

**Task types:**
- `Feature planning` - Create `/docs/tasks/feature-XX-*.md` files
- `Architecture review` - Design system components
- `Technology selection` - Evaluate libraries and approaches
- `PRD creation` - Write product requirements

**Skills/Tools used:**
- Plan mode (design implementation strategy)
- Codebase exploration
- Cross-feature dependency analysis
- Template generation

**Handoff protocol:**
- Creates feature task file → hands to Implementation Agent
- Updates AGENTS.md with new feature domains → notifies relevant agents

---

### 2. Implementation Agents

**What they do:**
- Write code to implement features
- Fix bugs and issues
- Update progress logs in task files
- Integrate with existing systems

**Where they work:**
- Application code (`/app`, `/components`, `/lib`, etc.)
- `/docs/tasks/` - Update progress in feature files
- Codebase modifications for feature/bug implementation

**Task types:**
- `Feature implementation` - Code the feature from task file
- `Bug fixes` - Fix issues discovered in testing
- `Code refactoring` - Clean up and optimize
- `Integration` - Connect components together

**Skills/Tools used:**
- Code implementation
- Testing (unit/integration)
- Debugging
- Git/version control

**Handoff protocol:**
- Receives from Architecture Agent (feature task file)
- Updates task file's "Progress / Fixes / Updates" section regularly
- When all Must-Have tasks `[x]`: hands to Documentation Agent
- When bugs found: receives from QA Agent, fixes, hands back to QA Agent

**Important:** Update documentation immediately when:
- Feature is complete
- A bug is discovered and fixed
- Implementation approach changes

---

### 3. Documentation Agents

**What they do:**
- Create on-boarding guides
- Write architecture documentation
- Update guides when bugs are fixed
- Maintain documentation quality

**Where they work:**
- `/docs/on-boarding/` - Feature quick-start guides
- `/docs/architecture/` - System design documentation
- `/docs/AGENTS.md` - Keep agent routing updated
- `/docs/tasks/` - Read task files for context

**Task types:**
- `On-boarding creation` - Create feature guides after implementation
- `Architecture documentation` - Document system design decisions
- `API documentation` - Document public interfaces
- `Debugging guides` - Document common issues and fixes
- `Documentation updates` - Update docs when bugs are fixed

**Skills/Tools used:**
- Technical writing
- Information architecture
- Markdown formatting
- Cross-referencing and linking

**Handoff protocol:**
- Receives from Implementation Agent (feature complete)
- Creates `/docs/on-boarding/feature-XX-onboarding.md`
- Creates `/docs/architecture/feature-XX-architecture.md`
- Updates AGENTS.md files as needed
- Hands back to QA Agent for testing

**Critical rule:** When bugs are fixed, documentation is updated immediately. No "technical debt" on docs.

---

### 4. QA & Testing Agents

**What they do:**
- Test completed features
- Find and report bugs
- Verify bug fixes
- Update test procedures

**Where they work:**
- Test code and test configurations
- `/docs/tasks/` - Report issues in feature files
- `/docs/on-boarding/` - Verify testing procedures work

**Task types:**
- `Feature testing` - Test feature using on-boarding guide
- `Bug reporting` - Create detailed bug reports
- `Regression testing` - Test that fixes don't break other features
- `Test automation` - Write automated tests

**Skills/Tools used:**
- Manual testing
- Test case creation
- Bug report writing
- Automated testing

**Handoff protocol:**
- Receives from Documentation Agent (on-boarding complete)
- If bugs found: creates bug report → hands to Implementation Agent
- If Implementation Agent fixes bug: receives fix → re-tests
- When all tests pass: signals "ready for production"
- Marks feature as `COMPLETED`

---

## 🎯 Task Routing Decision Tree

Use this tree to route new tasks to the correct agent:

```
START: New task arrives

│
├─ Is this a FEATURE TASK?
│  │
│  ├─ YES: ARCHITECTURE AGENT
│  │  ├─ Create feature task file: /docs/tasks/feature-XX-*.md
│  │  ├─ Define acceptance criteria
│  │  ├─ Establish dependencies
│  │  └─ Hands off to IMPLEMENTATION AGENT ───────────────┐
│  │                                                        │
│  │  IMPLEMENTATION AGENT receives feature task file      │
│  │  ├─ Reads acceptance criteria                         │
│  │  ├─ Implements feature                                │
│  │  ├─ Updates progress log daily                        │
│  │  ├─ Marks tasks [x] when complete                     │
│  │  └─ When all Must-Have [x]: hands to DOCUMENTATION ──────┐
│  │                                                            │
│  │  DOCUMENTATION AGENT receives completed feature       │
│  │  ├─ Reads task file                                   │
│  │  ├─ Creates on-boarding guide                         │
│  │  ├─ Creates architecture doc                          │
│  │  ├─ Updates AGENTS.md files                           │
│  │  └─ Hands to QA AGENT ─────────────────────────┐      │
│  │                                                  │      │
│  │  QA AGENT tests the feature                     │      │
│  │  ├─ Uses on-boarding guide                      │      │
│  │  ├─ If bugs found:                              │      │
│  │  │  ├─ Reports bug                              │      │
│  │  │  └─ Hands to IMPLEMENTATION AGENT ───┐       │      │
│  │  │     │                                 │       │      │
│  │  │     IMPLEMENTATION AGENT fixes bug   │       │      │
│  │  │     ├─ Updates progress log          │       │      │
│  │  │     ├─ Updates on-boarding if needed ├──────────┐   │
│  │  │     ├─ Updates architecture if needed│       │  │   │
│  │  │     └─ Hands back to QA AGENT ──┐    │       │  │   │
│  │  │                                  │    │       │  │   │
│  │  │  If all tests pass:             │    │       │  │   │
│  │  │     └─ Mark feature COMPLETE ───────────────────┘   │
│  │  │                                 │    │       │      │
│  │  └─ Loop continues until all fixed │    │       │      │
│  │                                    └────┘       │      │
│  └────────────────────────────────────────────────┘      │
│                                                           │
├─ Is this a BUG FIX?                                      │
│  │                                                        │
│  ├─ YES: QA AGENT                                        │
│  │  ├─ Triage and verify bug                            │
│  │  └─ Hands to IMPLEMENTATION AGENT ──────────┐       │
│  │     │                                        │       │
│  │     IMPLEMENTATION AGENT fixes bug          │       │
│  │     ├─ Updates progress log                 │       │
│  │     ├─ Updates related on-boarding          │       │
│  │     ├─ Updates architecture doc             │       │
│  │     └─ Hands back to QA AGENT ──────┐       │       │
│  │        │                            │       │       │
│  │        └─ QA verifies fix passes ───┘       │       │
│  │                                       │       │       │
│  └───────────────────────────────────────┘       │       │
│                                                   │       │
├─ Is this DOCUMENTATION?                          │       │
│  │                                                │       │
│  └─ YES: DOCUMENTATION AGENT ────────────────────┘       │
│     ├─ Write/update documentation                       │
│     ├─ Update AGENTS.md if structure changed            │
│     └─ Link to related feature/task files               │
│                                                           │
└─ Is this PLANNING or ARCHITECTURE REVIEW?               │
   │                                                        │
   └─ YES: ARCHITECTURE AGENT                             │
      ├─ Review design                                     │
      ├─ Create PRD if needed                             │
      └─ Create task file for next feature               │
```

---

## 📍 Domain Expertise by Folder

### `/docs/architecture/`
- **Primary agents:** Architecture & Design Agents
- **What gets stored:** System designs, component relationships, design decisions
- **Who creates:** Created by Documentation Agents after feature implementation
- **Who updates:** Implementation Agents (when design changes due to bugs/constraints)
- **Naming:** `feature-XX-architecture.md`

### `/docs/on-boarding/`
- **Primary agents:** Documentation Agents
- **What gets stored:** Quick-start guides, testing procedures, debugging tips
- **Who creates:** Created by Documentation Agents after feature implementation
- **Who updates:** Implementation Agents (when behavior changes from bugs/fixes)
- **Naming:** `feature-XX-onboarding.md`

### `/docs/tasks/`
- **Primary agents:** Implementation Agents + QA Agents
- **What gets stored:** Feature task files, progress logs, bug reports
- **Who creates:** Created by Architecture Agents during planning
- **Who updates:** Implementation Agents (daily progress), QA Agents (testing notes)
- **Naming:** `feature-XX-[kebab-case-name].md`

### `/docs/prd/`
- **Primary agents:** Architecture & Design Agents
- **What gets stored:** Product requirement documents
- **Who creates:** Architecture Agents during planning
- **Who updates:** Architecture Agents (PRD refinement)
- **Naming:** `master-prd-*.md` or `prd-*.md`

### `/docs/templates/`
- **Primary agents:** Architecture & Design Agents
- **What gets stored:** Templates for tasks, PRDs, workflows
- **Who creates:** Architecture Agents
- **Who updates:** Architecture Agents (when process improves)
- **Naming:** `NN-template-[purpose].md`

---

## 🔄 Communication & Handoffs

### Task Handoff Checklist

When handing off a task from one agent to another:

**Handing off FROM Implementation TO Documentation:**
- [ ] All Must-Have tasks marked `[x]`
- [ ] Feature tested manually
- [ ] Progress log fully updated
- [ ] No critical bugs blocking feature

**Handing off FROM Documentation TO QA:**
- [ ] On-boarding guide created
- [ ] Architecture doc created
- [ ] Links to relevant task IDs included
- [ ] Formatting and clarity reviewed

**Handing off FROM QA TO Implementation (for bug fix):**
- [ ] Bug clearly described
- [ ] Steps to reproduce included
- [ ] Related task ID identified
- [ ] Severity level noted

**Handing off FROM Implementation (bug fix) TO Documentation:**
- [ ] Fix verified working
- [ ] Progress log updated with fix details
- [ ] Ready for documentation update

---

## 🎯 Feature Completion Workflow

**Day 1:** Architecture Agent creates `/docs/tasks/feature-XX-*.md`
**Day 2-5:** Implementation Agent codes feature, updates progress log
**Day 6:** Implementation Agent signals "ready for docs" (all Must-Have `[x]`)
**Day 6:** **HOOK TRIGGERS** → Documentation Agent receives workflow prompt
**Day 6-7:** Documentation Agent creates on-boarding & architecture docs
**Day 7:** QA Agent tests using on-boarding guide
**Day 8+:** If bugs found: Implementation Agent fixes → Documentation Agent updates → QA Agent re-tests
**Final:** Feature marked COMPLETE, added to CHANGELOG

---

## 📞 When to Use Each Agent Type

| Situation | Agent | Action |
|-----------|-------|--------|
| Planning new feature | Architecture | Create task file in `/docs/tasks/` |
| Implementing feature | Implementation | Code feature, update task file progress |
| Feature done, needs docs | Documentation | Create guides in `/docs/on-boarding/` & `/docs/architecture/` |
| Testing completed feature | QA | Use on-boarding guide, find bugs |
| Bug found in feature | QA | Report bug in task file progress section |
| Fixing reported bug | Implementation | Fix code, update task file & docs |
| Docs need updating | Documentation | Update on-boarding/architecture guides |
| System design questions | Architecture | Create PRD or design doc |
| Need workflow guidance | Architecture | Check templates, create/update prompts |

---

## ⚡ Quick Reference Links

- **Feature Task Template:** `/docs/templates/03-template-feature-task-generator.md`
- **Task Completion Workflow:** `/docs/templates/04-template-task-completion-workflow.md`
- **Hook Configuration:** `/.claude/hooks/README.md`
- **Hook Trigger Prompt:** `/.claude/hooks/prompts/task-completion-workflow.md`
- **Example On-Boarding:** `/docs/on-boarding/feature-00.5-onboarding.md`

---

## 🔧 Updating This Document

When adding new features or changing the workflow:
1. Update this file to reflect new agent responsibilities
2. Update subfolder AGENTS.md files if ownership changes
3. Update hook configurations if new triggers needed
4. Update templates if new types of tasks introduced
