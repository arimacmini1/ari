# On-Boarding Folder – Agent Routing & Responsibilities

## Overview

This folder contains quick-start guides and testing procedures for completed features. These guides are the primary reference for QA agents testing features and for new users learning how to use the system.

**Location:** `/docs/on-boarding/`

**File pattern:** `feature-XX-onboarding.md`

**Primary agents:** Documentation Agents + QA Agents

**Who creates:** Documentation Agents (after feature implementation completes)

**Who updates:** Implementation Agents (when behavior changes), QA Agents (testing procedures)

---

## Folder At A Glance

```
docs/on-boarding/
├── feature-00-foundations-onboarding.md
├── feature-00.5-prototype-polish-onboarding.md
├── feature-01-prompt-canvas-onboarding.md
├── feature-02-agent-dashboard-onboarding.md
├── feature-03-orchestrator-hub-onboarding.md
├── feature-04-output-simulator-onboarding.md
├── feature-05-ai-trace-viewer-onboarding.md (created when feature is documented)
└── AGENTS.md                                 (this file)
```

---

## Who Works Here?

### 1. **Documentation Agents** (Create on-boarding guides)
- Read feature implementation from code
- Read feature task file for acceptance criteria
- Create step-by-step guides for using the feature
- Write common use cases and examples
- Document testing procedures
- **Hands off to:** QA Agents (for feature testing)

### 2. **QA/Testing Agents** (Test using guides)
- Read on-boarding guide completely
- Follow testing procedures
- Report bugs found in feature task file
- Verify fixes work as described in guide
- Suggest improvements to guide clarity
- **Hands off to:** Implementation Agents (bug reports)

### 3. **Implementation Agents** (Update when needed)
- Update on-boarding guide if behavior changes due to bug fix
- Ensure examples still work
- Notify Documentation Agents of major changes
- **Hands off to:** Documentation Agents (for comprehensive updates)

---

## Document Structure

Each feature on-boarding guide follows this pattern:

```markdown
# Feature XX – [Feature Name] On-Boarding Guide

**Feature task file:** `/docs/tasks/feature-XX-*.md`
**Related architecture:** `/docs/architecture/feature-XX-architecture.md`
**Status:** [COMPLETED / IN PROGRESS]

## Quick Start (5 minutes)

[Fastest way to get started. Minimal steps.]

### What You'll Need
[Prerequisites, open tabs, data setup]

### Step-by-Step
1. [Step 1]
2. [Step 2]
3. [Expected result]

---

## Common Use Cases (15 minutes)

### Use Case 1: [Typical user scenario]
[Step-by-step instructions]
[Screenshots or code examples if helpful]

### Use Case 2: [Another common scenario]
[Step-by-step instructions]

---

## Testing Procedures

### Manual Testing Checklist
- [ ] Test case 1 – [what to verify]
- [ ] Test case 2 – [what to verify]
- [ ] Test case 3 – [what to verify]

### Testing Steps
1. [Setup]
2. [Action to test]
3. [Expected behavior]
4. [Pass/Fail]

### Edge Cases to Test
- [Edge case 1 and how to trigger it]
- [Edge case 2 and how to trigger it]
- [What should happen in each case]

---

## Troubleshooting

### Issue 1: [Common problem]
**Symptoms:** [What user sees]
**Cause:** [Why it happens]
**Solution:** [How to fix it]

### Issue 2: [Another common problem]
[Same structure]

---

## Advanced Topics (optional)

### Advanced Technique 1: [For power users]
[Detailed explanation]
[Examples]

### Advanced Technique 2: [For power users]
[Detailed explanation]

---

## Related Features

- Feature XX – [relates to this feature because...]
- Feature YY – [integrates with this feature for...]

---

## FAQ

**Q: [Commonly asked question]**
A: [Clear answer]

**Q: [Another common question]**
A: [Clear answer]

---

## Reporting Issues

If you find bugs or issues:
1. Check the Troubleshooting section above
2. Check related feature guides
3. If still stuck, report to: `/docs/tasks/feature-XX-*.md` (Progress / Fixes / Updates section)

Include:
- Steps to reproduce
- Expected vs actual behavior
- Screenshots if relevant

---

## Resources

- **Feature task file:** `/docs/tasks/feature-XX-*.md`
- **Architecture details:** `/docs/architecture/feature-XX-architecture.md`
- **Related features:** [Links to other on-boarding guides]
```

---

## When On-Boarding Docs are Updated

**Created by Documentation Agent when:**
- Feature implementation is complete (all Must-Have tasks `[x]`)
- Code is merged and tested
- Before handing to QA Agent

**Updated by Implementation Agent when:**
- Bug fix changes how feature works
- New behavior discovered during implementation
- UI/UX changes

**Updated by QA Agent when:**
- Found ambiguity or unclear steps in guide
- Discovered edge case not covered
- Improved testing procedure clarity

---

## Key Rules

### Rule 1: Guides Must Be Testable
Every step in the on-boarding guide must be something a QA agent can actually execute and verify. No vague instructions.

### Rule 2: Testing Procedures Are Mandatory
Every guide must include:
- Clear testing checklist
- Steps to reproduce each test case
- Expected outcomes
- Edge cases to test

### Rule 3: Screenshots & Examples Help
Use:
- Code examples if relevant
- Step-by-step numbered lists
- Before/after comparisons
- Links to code for "how it works" depth

### Rule 4: Troubleshooting First
If users run into issues, the guide should help them solve it before they report a bug. Document:
- Common mistakes
- Common errors and how to fix them
- Prerequisites they might have missed

### Rule 5: Links to Architecture
Every on-boarding guide must link to the related architecture doc for users who need "why" and "how it works" details.

---

## Common Patterns

### Pattern 1: Simple 5-Minute Quick Start
```markdown
## Quick Start (5 minutes)

### What You'll Need
- Open the application
- You'll be on the Home page

### Step-by-Step
1. Click "Create Canvas" button
2. Canvas opens with blank workspace
3. You're ready to add blocks!

**Expected result:** Blank canvas, ready for input
```

### Pattern 2: Testing a Feature
```markdown
### Manual Testing Checklist
- [ ] Feature loads without errors
- [ ] All UI elements render correctly
- [ ] Clicking buttons triggers expected actions
- [ ] Data saves when expected
- [ ] Error messages appear for invalid input

### Testing Steps
1. **Setup:** Navigate to feature
2. **Action:** Perform main feature action
3. **Expected:** Feature works as described
4. **Pass/Fail:** ✓ Pass
```

### Pattern 3: Troubleshooting Section
```markdown
### Issue 1: Canvas won't load
**Symptoms:** Blank white screen, no canvas appears
**Cause:** Browser cache from old version
**Solution:** 
1. Clear browser cache (Ctrl+Shift+Delete)
2. Refresh page (Ctrl+F5)
3. Canvas should load
```

---

## Updating This Folder

- Add new feature on-boarding guides as features complete
- Update guides immediately when behavior changes
- Archive old guides if needed (move to `/docs/archive/`)
- Reference this AGENTS.md from main `/docs/AGENTS.md`

---

## Quick Links

- **Main Agent Routing:** `/docs/AGENTS.md`
- **Task Files:** `/docs/tasks/`
- **Architecture Docs:** `/docs/architecture/`
- **Feature Task Template:** `/docs/templates/03-template-feature-task-generator.md`
