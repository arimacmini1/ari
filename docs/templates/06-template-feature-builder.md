# Ari Feature Builder Template

Use this template to build new features in Ari using Ari's own tools.

## When to Use
- Building new UI components
- Adding API endpoints
- Creating new functionality
- Extending existing features

## Workflow: B1-B8 (Dogfood)

### B1 - Intent
Define what you want to build.

```
Feature: [Name]
Description: [What it does]
Acceptance Criteria:
- [ ] Criterion 1
- [ ] Criterion 2
```

### B2 - Design
Design the solution.

```
- Component structure
- API endpoints needed
- Data models
- User flows
```

### B3 - Plan
Create implementation plan.

```
1. Create [component/file]
2. Add [functionality]
3. Update [related files]
```

### B4 - Implement
Write the code.

```
Files to create/modify:
- components/...
- lib/...
- app/api/...
```

### B5 - Verify
Test the implementation.

```
- [ ] Code compiles
- [ ] Feature works
- [ ] No regressions
```

### B6 - Integrate
Connect to existing features.

```
- Add to sidebar/navigation
- Update related components
- Connect APIs
```

### B7 - Document
Document the feature.

```
- Update feature task file
- Add to README if needed
- Document API endpoints
```

### B8 - Complete
Final review and mark complete.

```
- All acceptance criteria met
- Documentation complete
- Ready for use
```

## Quick Start

### Option 1: Use Dogfood Workflow
```bash
cd temporal_worker
source .venv/bin/activate
python run_dogfood.py start
```

### Option 2: Manual Build
1. Read the roadmap feature
2. Create component in `components/`
3. Add API routes in `app/api/`
4. Integrate into UI
5. Document in `docs/tasks/`

## Example: Building P2-MH-01 (Agent Blocks)

### B1 - Intent
```
Feature: Agent Blocks Framework
Description: 6 draggable agent blocks for canvas (Planner, Architect, Implementer, Tester, Docs, Lead)
Acceptance Criteria:
- 6 agent types as canvas blocks
- Each has input/output ports
- Blocks connect to form execution graph
```

### B4 - Implement
Created: `components/canvas/agent-blocks.tsx`
- AgentBlock component with handles
- AgentBlocksPalette for dragging
- 6 agent types with colors
- Status indicators
- Configure/Run buttons

### B7 - Document
Created: `docs/tasks/feature-p2-mh-01/README.md`

## Files Structure

```
docs/
├── templates/
│   └── 06-template-feature-builder.md  ← This file
└── tasks/
    └── feature-[id]/
        └── README.md  ← Each feature
```

## Tips
- Use existing components as reference
- Check component patterns in `components/ui/`
- Follow API patterns in `app/api/`
- Test with `curl` before UI integration
