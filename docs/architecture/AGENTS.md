# Architecture Folder – Agent Routing & Responsibilities

## Overview

This folder contains system architecture documentation, design decisions, and technical specifications for completed features.

**Location:** `/docs/architecture/`

**File pattern:** `feature-XX-architecture.md`

**Primary agents:** Documentation Agents + Architecture & Design Agents

**Who creates:** Documentation Agents (after feature implementation completes)

**Who updates:** Implementation Agents (when bugs require design changes) + Architecture Agents (design reviews)

---

## Folder At A Glance

```
docs/architecture/
├── feature-00-foundations-architecture.md
├── feature-00.5-prototype-polish-architecture.md
├── feature-01-prompt-canvas-architecture.md
├── feature-02-agent-dashboard-architecture.md
├── feature-03-orchestrator-hub-architecture.md
├── feature-04-output-simulator-architecture.md
├── feature-05-ai-trace-viewer-architecture.md (created when feature is documented)
├── system-design.md                           (overall system architecture)
└── AGENTS.md                                  (this file)
```

---

## Who Works Here?

### 1. **Documentation Agents** (Create architecture docs)
- Read feature task files from `/docs/tasks/`
- Understand implementation details from code review
- Document system design decisions
- Create architecture diagrams and explanations
- Link to related feature task IDs
- **Hands off to:** Architecture Agents (for review), Implementation Agents (if bugs found)

### 2. **Architecture & Design Agents** (Review & maintain)
- Review architecture documentation for clarity
- Identify design patterns and consistency issues
- Update system-wide design docs
- Maintain relationships between components
- Create/update system design overview
- **Hands off to:** Implementation Agents (design decisions for bugs)

### 3. **Implementation Agents** (Update when needed)
- Update architecture doc if bug fix changes design
- Document workarounds or constraints discovered
- Notify Architecture Agents of design issues
- **Hands off to:** Documentation Agents (for comprehensive updates)

---

## Document Structure

Each feature architecture document follows this pattern:

```markdown
# Feature XX – [Feature Name] Architecture

**Feature task file:** `/docs/tasks/feature-XX-*.md`
**Related on-boarding:** `/docs/on-boarding/feature-XX-onboarding.md`
**Status:** [COMPLETED / IN PROGRESS]

## Overview
[High-level description of what the feature does and why]

## System Design
[Diagram or description of component structure]

### Key Components
- **Component 1:** Purpose and responsibilities
- **Component 2:** Purpose and responsibilities

### Data Flow
[How data moves through the system]

## Architecture Decisions

### Decision 1: [Decision Title]
- **Chosen approach:** [What was chosen]
- **Why:** [Rationale]
- **Alternatives considered:** [What else was evaluated]
- **Tradeoffs:** [What was sacrificed for this choice]

### Decision 2: [Decision Title]
[Same structure]

## Integration Points
[How this feature connects to other features]

### Upstream Dependencies
- Feature XX – [dependency reason]
- Feature YY – [dependency reason]

### Downstream Dependents
- Feature AA – [depends on this feature for...]
- Feature BB – [depends on this feature for...]

## Known Issues & Constraints
[Document any design constraints, workarounds, or known issues]

## Future Improvements
[Areas for potential enhancement or refactoring]

## References
- Task ID: [Link to feature task file]
- Related features: [Links to other architecture docs]
- Code locations: [Key file paths]
```

---

## When Architecture Docs are Updated

**Created by Documentation Agent when:**
- Feature implementation is complete (all Must-Have tasks `[x]`)
- Code is merged and working
- On-boarding guide is complete

**Updated by Implementation Agent when:**
- Bug fix changes core design
- Workaround or constraint discovered
- New integration point added

**Updated by Architecture Agent when:**
- Design pattern consistency issues found
- System-wide design changes needed
- Need to refactor for clarity

---

## Key Rules

### Rule 1: Architecture Docs Reference Task Files
Every architecture doc must include:
- Link to the original feature task file
- Links to all task IDs mentioned in design
- Why each design decision was made

### Rule 2: Design Decisions Must Be Documented
If a design decision was made, document:
- What was chosen
- Why it was chosen
- What alternatives were considered
- What tradeoffs were made

### Rule 3: Integration Points Are Critical
Document:
- All upstream dependencies
- All downstream dependents
- How data flows between features
- Any shared state or resources

### Rule 4: Known Issues Are Honest
Document:
- Design constraints discovered during implementation
- Workarounds implemented for edge cases
- Technical debt created by the feature
- Suggested improvements for future work

### Rule 5: Clarity Over Perfection
- Use diagrams to explain complex flows
- Use plain language, not jargon
- Link to code locations for details
- Update immediately when changes occur

---

## Common Patterns

### Pattern 1: Component Diagram
```markdown
## System Design

```
Canvas (React Flow)
    ├─ Block Types Manager
    │  ├─ Task Block Renderer
    │  ├─ Decision Block Renderer
    │  └─ Loop Block Renderer
    ├─ Drag & Drop Handler
    ├─ Undo/Redo System
    └─ State Manager (Zustand)
```
```

### Pattern 2: Data Flow Documentation
```markdown
## Data Flow

1. User creates block in canvas
2. Block event triggers Block Manager
3. Block Manager updates state
4. State update triggers UI re-render
5. New block appears in canvas
```

### Pattern 3: Architecture Decision
```markdown
### Decision: Why React Flow for canvas?

- **Chosen approach:** React Flow for node-based editing
- **Why:** Mature library with drag-drop, zoom, pan built-in
- **Alternatives:** D3.js (more flexible, steeper learning curve), custom implementation (too much work)
- **Tradeoffs:** Limited customization, vendor lock-in for node-based UI, but saves 2-3 weeks of implementation
```

---

## Updating This Folder

- Add new feature architecture docs as features complete
- Keep system design overview updated
- Archive old docs if needed (move to `/docs/archive/`)
- Reference this AGENTS.md from main `/docs/AGENTS.md`

---

## Quick Links

- **Main Agent Routing:** `/docs/AGENTS.md`
- **Task Files:** `/docs/tasks/`
- **On-Boarding Guides:** `/docs/on-boarding/`
- **Feature Task Template:** `/docs/templates/03-template-feature-task-generator.md`
