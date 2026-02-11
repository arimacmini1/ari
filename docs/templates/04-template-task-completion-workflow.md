# Task Completion & Documentation Workflow – AEI Product

## Overview

This workflow ensures that when a feature task is **completed**, automated documentation is created and the architecture folder is updated. This serves as the knowledge base for future development and onboarding.

---

## 🔴 CRITICAL RULES (READ FIRST)

### Trigger Condition

This workflow activates when:
- A feature task file (`/docs/tasks/feature-XX-*.md`) has all Must-Have tasks marked as `[x]` (completed)
- The task implementer signals "ready for documentation"
- The feature has passed basic functional testing

### Automatic Actions (Agent-Driven)

When triggered, the following actions MUST occur:

1. **Create On-Boarding Document** in `/docs/on-boarding/feature-XX-onboarding.md`
   - Based on the feature file's Definition of Done
   - Include quick start, feature overview, testing guide, and debugging tips
   - Cross-reference task IDs from the feature file

2. **Create Architecture Document** in `/docs/architecture/feature-XX-architecture.md`
   - Document system design decisions
   - Include data models, API contracts, component architecture
   - Reference implementation details from completed tasks

3. **Update AGENTS.md Files** in all relevant folders
   - Each folder with documentation gets an AGENTS.md that explains what agents work in that domain
   - Agent responsibilities are tracked for future work

4. **Append to Master Changelog** in `/docs/CHANGELOG.md`
   - Log the feature completion with date, feature ID, and summary
   - Link to on-boarding and architecture docs

---

## On-Boarding Document Structure

**File:** `/docs/on-boarding/feature-XX-onboarding.md`

```markdown
# Feature XX – On-Boarding Guide

## Quick Start
- [What this feature does](#)
- [How to test it](#)
- [Common workflows](#)

## Feature Overview
- Definition of Done (from task file)
- Key capabilities
- Known limitations

## Testing Guide
- Manual test checklist (from Must-Have acceptance criteria)
- Automated test locations
- How to verify expected behavior

## Quick Reference
- Component locations
- Key functions/methods
- Environment variables needed

## Debugging Guide
- Common issues and fixes (pulled from "Gotchas" in tasks)
- How to enable debug logging
- How to inspect internal state

## API Reference
- Public interfaces
- Input/output schemas
- Error codes and messages

## FAQ
- Most common questions
- Troubleshooting tips

## Architecture Diagrams
- Flow diagrams
- Component relationships
```

---

## Architecture Document Structure

**File:** `/docs/architecture/feature-XX-architecture.md`

```markdown
# Feature XX – Architecture & Design

## System Overview
- High-level system diagram
- Major components and their roles
- Key abstractions

## Data Models
- Core data structures
- Schema definitions
- Relationships between entities

## API Contracts
- Public API endpoints
- Request/response formats
- Error handling

## Component Architecture
- Component hierarchy
- Props/state flow
- Key dependencies

## Design Decisions
- Why we chose technology X over Y
- Trade-offs made
- Future considerations

## Performance Characteristics
- Expected latency/throughput
- Memory/CPU usage patterns
- Scalability notes

## Testing Strategy
- Unit test coverage areas
- Integration test scenarios
- End-to-end test flows

## Known Limitations & Future Work
- Current constraints
- Planned improvements
- Related features depending on this
```

---

## AGENTS.md Structure

**File:** `/docs/AGENTS.md` (root) and `/docs/[FOLDER]/AGENTS.md`

```markdown
# Agent Responsibilities & Task Routing

## Overview
This document describes which agents are responsible for different aspects of the project, what they work on, and how to route tasks to them.

## Agent Domains

### Architecture & Design Agents
- **Responsibility:** Design decisions, technical architecture, system design
- **Task Types:** Feature planning, architecture review, technology selection
- **Files:** `/docs/architecture/`, `/docs/prd/`
- **Related Skills:** Planning, design, dependency analysis

### Task Implementation Agents
- **Responsibility:** Implementing feature tasks, code changes, bug fixes
- **Task Types:** Feature coding, bug fixes, refactoring
- **Files:** `/docs/tasks/`, application code
- **Related Skills:** Code implementation, testing, debugging

### Documentation Agents
- **Responsibility:** Creating and updating documentation
- **Task Types:** On-boarding guides, API docs, architecture docs
- **Files:** `/docs/on-boarding/`, `/docs/architecture/`
- **Related Skills:** Technical writing, information architecture

### Quality Assurance Agents
- **Responsibility:** Testing, validation, bug discovery
- **Task Types:** Test planning, bug reporting, test automation
- **Files:** `/docs/tasks/`, test code
- **Related Skills:** Testing, bug tracking, validation

## Task Routing Decision Tree

```
Is this a feature task?
├─ YES → Architecture Planning Agent (starts in plan mode)
│  └─ Design complete? → Implementation Agent (codes the feature)
│     └─ Feature complete? → Documentation Agent (creates guides)
│        └─ Bugs found? → QA Agent (reports & tracks)
│           └─ Bug fix needed? → Implementation Agent (repeats)
│              └─ All fixed? → Documentation Agent (updates docs)
│                 └─ DONE → Archive & celebrate
│
└─ NO → Is this a bug fix?
   ├─ YES → QA Agent (verify and triage)
   │  └─ Root cause clear? → Implementation Agent (fix)
   │     └─ Fix verified? → Documentation Agent (update related docs)
   │
   └─ Is this documentation?
      └─ YES → Documentation Agent (write/update)
```

## Domain Expertise

### For `/docs/architecture/`
- Who: Architecture & Design Agents
- What: System designs, component relationships, design decisions
- When: During feature planning and after feature completion

### For `/docs/tasks/`
- Who: Implementation Agents + QA Agents
- What: Task completion, progress logs, bug fixes
- When: Throughout feature development

### For `/docs/on-boarding/`
- Who: Documentation Agents
- What: Quick start guides, testing instructions
- When: After feature completion

### For `/docs/prd/`
- Who: Architecture & Design Agents
- What: Product requirements, feature definitions
- When: During planning phase

---

## Task Handoff Protocol

1. **Architecture Agent** creates feature task file
   - Hands off to Implementation Agent with clear acceptance criteria
   - Blocks on Architecture Agent until design review complete

2. **Implementation Agent** codes the feature
   - Updates task file's "Progress / Fixes / Updates" section
   - Hands off to Documentation Agent when feature complete

3. **Documentation Agent** creates on-boarding & architecture docs
   - Creates `/docs/on-boarding/feature-XX-onboarding.md`
   - Creates `/docs/architecture/feature-XX-architecture.md`
   - Updates `/docs/AGENTS.md` files as needed
   - Hands off to QA Agent for testing

4. **QA Agent** tests the feature
   - If bugs found: creates bug report, hands to Implementation Agent
   - If bugs fixed: confirmation, hands back to Documentation Agent for updates
   - If all clear: marks feature as "ready for production"

---

## Updating Documentation During Bug Fixes

When a bug is discovered and fixed:

1. **Update Task File** (`/docs/tasks/feature-XX-*.md`)
   - Add entry to "Progress / Fixes / Updates" section
   - Mark task status if changed
   - Update Dependencies/Blocks if relationships changed

2. **Update On-Boarding** (`/docs/on-boarding/feature-XX-onboarding.md`)
   - Add to "Known Issues" section if workaround needed
   - Update "Gotchas" if new failure mode discovered
   - Update test steps if behavior changed

3. **Update Architecture** (`/docs/architecture/feature-XX-architecture.md`)
   - If design changed: update diagrams and descriptions
   - If new constraints discovered: add to "Known Limitations"
   - If performance changed: update "Performance Characteristics"

---

## Example Workflow Sequence

```
Day 1: Feature Task Created
  └─ Architecture Agent creates `/docs/tasks/feature-01-prompt-canvas.md`
     └─ Assigns task IDs: F01-MH-01, F01-MH-02, etc.
     └─ Hands off to Implementation Agent

Day 2-5: Implementation
  └─ Implementation Agent codes feature
     └─ Updates progress log daily
     └─ Marks tasks complete as done
     └─ When all Must-Have tasks [x]: signals ready for docs

Day 6: Documentation Creation
  └─ Documentation Agent reads completed task file
     └─ Creates `/docs/on-boarding/feature-01-onboarding.md`
     └─ Creates `/docs/architecture/feature-01-architecture.md`
     └─ Updates `/docs/tasks/AGENTS.md` with task routing info
     └─ Updates `/docs/AGENTS.md` with feature domain info

Day 7: Testing & Bug Fixes
  └─ QA Agent tests feature
     └─ Finds bug: "Undo doesn't work with 50+ changes"
     └─ Creates issue report in `/docs/tasks/feature-01-*.md`
     └─ Hands to Implementation Agent

Day 8: Bug Fix
  └─ Implementation Agent fixes bug
     └─ Updates progress log: "YYYY-MM-DD: Fixed undo limit bug"
     └─ Updates `/docs/on-boarding/` with fix details
     └─ Updates `/docs/architecture/` if design changed
     └─ Hands back to QA Agent

Day 9: Final Testing
  └─ QA Agent re-tests and confirms all fixed
     └─ Feature marked "COMPLETE"
     └─ Added to changelog
     └─ Team celebrates 🎉
```

---

## Key Principles

1. **Documentation Automation**: When code is complete, docs are created automatically — not as an afterthought
2. **Living Docs**: Documentation files change as bugs are found and fixed
3. **Task-Centric**: All docs reference task IDs for traceability
4. **Agent Routing**: Each agent type knows its responsibility and where to find/write files
5. **Continuous Improvement**: Bug fixes feed back into documentation to help future developers

