# ⚙️ AUTOMATIC TRIGGER: Feature Task Completion Workflow

## What Happened?

A feature task file in `/docs/tasks/` was modified and appears to have Must-Have tasks marked as complete (`[x]`).

This hook has automatically detected that a feature may be ready for documentation generation.

---

## Your Task

Follow these steps to complete the task-completion workflow:

### Step 1: Verify Feature Completion

Before proceeding, manually verify:

- [ ] Read the feature file that triggered this hook
- [ ] Confirm ALL Must-Have (`MH`) tasks are marked `[x]`
- [ ] Confirm the feature works end-to-end (at least basic manual testing done)
- [ ] Check that no critical bugs are blocking further development

**If any of the above is not ready, cancel this workflow and continue developing.**

### Step 2: Gather Feature Context

Read the completed feature file and extract:

1. **Feature metadata:**
   - Feature ID and name (e.g., `Feature 01 – Prompt Canvas`)
   - Feature number (XX) from the filename
   - Definition of Done

2. **Task information:**
   - All Must-Have task IDs and titles
   - Acceptance criteria from each task
   - Known gotchas/debug notes from each task
   - Progress notes already logged

3. **Key implementation details:**
   - Major components created
   - Key APIs or functions added
   - Data models introduced
   - Testing approach used

### Step 3: Create On-Boarding Document

Create `/docs/on-boarding/feature-XX-onboarding.md` with this structure:

```
# Feature XX – [Feature Name] On-Boarding Guide

## Quick Start
- 2-3 bullet points: what you can do in 2 minutes

## Feature Overview
- Copy "Definition of Done" from feature task file
- List key capabilities (extracted from Must-Have acceptance criteria)
- List known limitations (from gotchas/debug notes)

## Testing Guide
- Add a checklist of manual tests (from acceptance criteria)
- Include expected outcomes
- Include how to verify success

## Quick Reference
- Bullet list of main files/components
- Key functions/methods with 1-line descriptions
- Config options if any

## Debugging Guide
- Extract "Gotchas / debug notes" from feature file
- Add common failure modes and fixes
- Include how to enable debug output
- How to inspect internal state

## API Reference (if applicable)
- Public endpoints or methods
- Input/output formats
- Error codes

## FAQ
- 3-5 common questions developers might have
- Troubleshooting tips from gotchas

## File Structure
- Tree view of created/modified files
- Annotations explaining purpose of each file
```

### Step 4: Create Architecture Document

Create `/docs/architecture/feature-XX-architecture.md` with this structure:

```
# Feature XX – Architecture & Design

## System Overview
- Brief description of what was built
- Major components and their roles
- Key design patterns used

## Component Architecture
- High-level diagram (text-based or reference to visual)
- Component hierarchy
- Data flow between components

## Data Models
- Core data structures introduced
- Type definitions/interfaces
- Schema if using database

## Key Design Decisions
- Why we chose X technology/approach
- Trade-offs considered
- Alternative approaches rejected (and why)

## Implementation Details
- How tasks in the feature were split
- Integration points with existing code
- Dependencies on other features

## Testing Strategy
- Unit tests written and where
- Integration test scenarios
- Manual testing procedures

## Performance Characteristics
- Expected latency/throughput
- Memory or resource usage
- Scalability constraints

## Known Limitations & Future Work
- Current constraints
- Planned improvements
- Related features that depend on this
```

### Step 5: Update AGENTS.md Files

Update or create AGENTS.md files in the following folders:

**`/docs/AGENTS.md`** (root level)
- Add Feature XX to the list of completed features
- Note which agent types typically work on this feature
- Link to feature-specific on-boarding and architecture docs

**`/docs/tasks/AGENTS.md`** (if it doesn't exist)
- Explain that this is where feature task files are stored
- Describe the task completion workflow
- Link to the task completion template

**`/docs/on-boarding/AGENTS.md`** (if it doesn't exist)
- Explain that this folder contains feature guides
- Note which agents create these docs
- Describe how to use these guides

**`/docs/architecture/AGENTS.md`** (if it doesn't exist)
- Explain that this folder contains architecture documentation
- Note which agents create these docs
- Link to architecture decision records

### Step 6: Update Progress Log

Add a dated entry to the feature task file's "Progress / Fixes / Updates" section:

```
- YYYY-MM-DD: Feature complete. On-boarding guide created at /docs/on-boarding/feature-XX-onboarding.md. Architecture doc created at /docs/architecture/feature-XX-architecture.md.
```

### Step 7: Update Master Changelog

Add entry to `/docs/CHANGELOG.md` (create if it doesn't exist):

```
## [YYYY-MM-DD] Feature XX – [Feature Name] Completed

- On-boarding guide: `/docs/on-boarding/feature-XX-onboarding.md`
- Architecture doc: `/docs/architecture/feature-XX-architecture.md`
- Task file: `/docs/tasks/feature-XX-*.md`
- Implementation status: All Must-Have tasks complete, ready for testing
```

---

## ⚠️ Important Notes

- **This workflow is semi-automated:** This prompt guides you, but you do the actual writing
- **Quality matters:** Take time to write clear, useful documentation
- **Link everything:** Cross-reference task IDs, file paths, and related docs
- **Test your examples:** If you document a code example, verify it actually works
- **Update on bugs:** When bugs are found and fixed, come back to these docs and update them

---

## Next Steps After Completion

1. **Testing Phase:**
   - QA agent tests the feature using the on-boarding guide
   - If bugs found: bug report → implementation fix → documentation update

2. **For Implementation Agents:**
   - When bugs arise, update both the task file AND the on-boarding/architecture docs
   - Use the "Progress / Fixes / Updates" section to track all changes

3. **Feature Ready:**
   - Once all testing complete and bugs fixed
   - Archive feature file (or mark as "shipped")
   - Start next feature planning

---

## Reference Links

- **Task Completion Template:** `/docs/templates/04-template-task-completion-workflow.md`
- **Feature Task Template:** `/docs/templates/03-template-feature-task-generator.md`
- **Example On-Boarding:** `/docs/on-boarding/feature-00.5-onboarding.md`

---

**This is an AI-assisted workflow.** When you're done with steps 1-2, ask Claude to help you write the on-boarding and architecture docs. It will use the context you've gathered to generate them automatically.
