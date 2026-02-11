# PRD Folder – Agent Routing & Responsibilities

## Overview

This folder contains Product Requirement Documents (PRDs) that define features at a business and technical level before implementation begins.

**Location:** `/docs/prd/`

**File pattern:** `prd-*.md` or `master-prd-*.md`

**Primary agents:** Architecture & Design Agents

**Who creates:** Architecture & Design Agents (during planning phase)

**Who updates:** Architecture & Design Agents (PRD refinement)

---

## Folder At A Glance

```
docs/prd/
├── master-prd-core-system.md          (main system PRD)
├── prd-feature-00-foundations.md
├── prd-feature-00.5-prototype-polish.md
├── prd-feature-01-prompt-canvas.md
├── prd-feature-02-agent-dashboard.md
├── prd-feature-03-orchestrator-hub.md
├── prd-feature-04-output-simulator.md
├── prd-feature-05-ai-trace-viewer.md
└── AGENTS.md                          (this file)
```

---

## Who Works Here?

### 1. **Architecture & Design Agents** (Create & maintain PRDs)
- Define feature scope and business value
- Write acceptance criteria from user perspective
- Establish dependencies and risks
- Create technology recommendations
- Plan implementation strategy
- **Hands off to:** Implementation Agents (via feature task files)

---

## Document Structure

Each PRD follows this pattern:

```markdown
# PRD – [Feature Name]

**Date created:** YYYY-MM-DD
**Last updated:** YYYY-MM-DD
**Owner:** [Architecture Agent]
**Status:** [DRAFT / APPROVED / IN IMPLEMENTATION / COMPLETED]

## Executive Summary
[1-2 paragraph overview: what is this feature and why do we need it]

## Business Objectives
- Objective 1: [what business goal does this achieve]
- Objective 2: [what business goal does this achieve]

## User Problem
[What problem are users experiencing?]
[Why is it important to solve?]

## Proposed Solution
[High-level description of what we're building]
[How does it solve the user problem?]

## Success Metrics
- Metric 1: [how will we measure success]
- Metric 2: [how will we measure success]
- Metric 3: [how will we measure success]

## Scope

### Must Have (MVP)
- Feature element 1 [describe what this is]
- Feature element 2 [describe what this is]

### Should Have (v1 enhancement)
- Feature element 1 [describe what this is]

### Could Have (future)
- Feature element 1 [describe what this is]

### Out of Scope
- [What are we explicitly NOT doing]

## User Stories

### User Story 1: [User type] - [What they want to do]
```
As a [user type],
I want to [action],
So that [business value]

Acceptance criteria:
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3
```

### User Story 2: [User type] - [What they want to do]
[Same structure]

## Technical Requirements

### Architecture Approach
[High-level description of how we'll build this]

### Technology Stack
- [Technology 1]: [why we chose it]
- [Technology 2]: [why we chose it]

### Performance Requirements
- [Performance metric]: [target value]
- [Performance metric]: [target value]

### Security Requirements
- [Security requirement 1]
- [Security requirement 2]

## Dependencies

### Internal Dependencies
- Feature X: [why we depend on it]
- Feature Y: [why we depend on it]

### External Dependencies
- [External service]: [what we need]
- [3rd party API]: [what we need]

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| [Risk 1] | High/Med/Low | High/Med/Low | [How we'll handle it] |
| [Risk 2] | High/Med/Low | High/Med/Low | [How we'll handle it] |

## Implementation Plan

### Phase 1: [Phase name]
- Duration: X weeks
- Key deliverables: [List items]
- Success criteria: [What completion looks like]

### Phase 2: [Phase name]
[Same structure]

## Rollout Plan
[How will we release this to users?]
[Any phased rollout?]
[Communication plan?]

## Resources

### Team
- [Role]: [Estimated effort]
- [Role]: [Estimated effort]

### Budget
- [Budget item]: $[amount]
- [Budget item]: $[amount]

## References
- Related features: [Links to related PRDs]
- Stakeholder feedback: [Links to discussions]
- Market research: [Links to any research]

## Approval

- [ ] Product Manager approved
- [ ] Technical Lead approved
- [ ] Design Lead approved

**Approved by:** [Names]
**Approval date:** YYYY-MM-DD
```

---

## When PRDs are Created & Updated

**Created by Architecture Agent when:**
- Feature has been requested/planned
- Business objectives are clear
- We're ready to plan implementation

**Updated by Architecture Agent when:**
- Scope changes requested by stakeholders
- Technical approach changes discovered
- Dependencies change during implementation
- Feature needs refinement before handoff

---

## Key Rules

### Rule 1: PRD Comes Before Code
A PRD must be written and approved before Implementation Agent receives the feature task file. No exceptions.

### Rule 2: User Stories Drive Acceptance Criteria
User stories in the PRD become acceptance criteria in the task file. They must be testable and clear.

### Rule 3: Dependencies Must Be Explicit
Every PRD must clearly state:
- What other features it depends on
- What external services it needs
- What doesn't exist yet that might block us

### Rule 4: Success Metrics Are Required
Every PRD must include metrics for measuring success. This helps us know when we're done.

### Rule 5: Risks Must Be Addressed
Document potential risks and how we'll mitigate them. Don't ignore hard problems in the PRD.

---

## Common Patterns

### Pattern 1: Feature with Clear Business Value
```markdown
## Business Objectives
- Enable users to create complex workflows without coding
- Reduce time to set up automations from hours to minutes
- Increase user retention by 20%

## Success Metrics
- Users create 10+ blocks per workflow (avg)
- Feature adoption reaches 70% of active users within 3 months
- Customer support tickets about workflow setup decrease by 50%
```

### Pattern 2: Feature with Technical Complexity
```markdown
## Technical Requirements

### Architecture Approach
- Use React Flow for node-based editor
- Implement Zustand for state management
- WebSocket for real-time collaboration

### Technology Stack
- React Flow: Industry standard for node-based UIs, good community support
- Zustand: Lightweight state management, avoids Redux boilerplate
```

### Pattern 3: Risk Management
```markdown
## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| React Flow library doesn't support all block types we need | Medium | High | Spike in week 1 to validate all block types can be rendered |
| Real-time sync causes performance issues | Medium | High | Load testing with 1000+ concurrent users before launch |
| Users confused by block interface | High | Medium | Invest in tutorial and on-boarding guide |
```

---

## Relationship to Task Files

PRDs drive feature task files. When a PRD is approved:

1. **Architecture Agent** creates `/docs/tasks/feature-XX-*.md` with:
   - User stories from PRD become Must-Have tasks
   - Should-haves from PRD become Should-Have tasks
   - Could-haves from PRD become Could-Have tasks

2. **Implementation Agent** receives the task file and:
   - References the PRD for business context
   - Implements to the acceptance criteria
   - Updates task file progress, not the PRD

3. **Documentation Agent** reads both:
   - PRD for business context
   - Task file for what was actually implemented
   - Creates documentation that aligns with PRD intent

---

## Updating This Folder

- Add new PRDs as features are planned
- Update PRDs only during planning phase
- Archive completed PRDs if needed (move to `/docs/archive/`)
- Reference this AGENTS.md from main `/docs/AGENTS.md`

---

## Quick Links

- **Main Agent Routing:** `/docs/AGENTS.md`
- **Feature Task Files:** `/docs/tasks/`
- **Task File Template:** `/docs/templates/03-template-feature-task-generator.md`
