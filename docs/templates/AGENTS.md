# Templates Folder – Agent Routing & Responsibilities

## Overview

This folder contains templates and generators for creating standardized documents across the project. Templates ensure consistency and save time when creating feature task files, PRDs, workflows, and other documentation.

**Location:** `/docs/templates/`

**File pattern:** `NN-template-[purpose].md`

**Primary agents:** Architecture & Design Agents

**Who creates:** Architecture & Design Agents (during process refinement)

**Who updates:** Architecture & Design Agents (when process improves)

---

## Folder At A Glance

```
docs/templates/
├── 01-template-prd-generator.md              (PRD template)
├── 02-template-feature-onboarding.md         (On-boarding guide template)
├── 03-template-feature-task-generator.md     (Feature task file template)
├── 04-template-task-completion-workflow.md   (Completion workflow)
├── 05-template-architecture-documentation.md (Architecture doc template)
├── 06-template-bug-report.md                 (Bug report template)
├── README.md                                 (Overview of all templates)
└── AGENTS.md                                 (this file)
```

---

## Who Works Here?

### 1. **Architecture & Design Agents** (Create & maintain templates)
- Create templates that other agents use
- Test templates to ensure they work
- Update templates when process improves
- Add new templates for new document types
- Maintain consistency across all templates
- **Hands off to:** All other agents (for usage)

---

## Template Structure

Each template file includes:

1. **Purpose section** – What this template is for
2. **When to use** – When agents should use this template
3. **Required sections** – What must be included
4. **Optional sections** – What can be included
5. **Example** – Filled-in example showing proper usage
6. **Tips** – Common mistakes and best practices

---

## Current Templates

### Template 01: PRD Generator
**Purpose:** Create Product Requirement Documents
**Used by:** Architecture & Design Agents
**When to use:** Before starting a new feature
**Output:** `/docs/prd/prd-*.md`

### Template 02: Feature On-Boarding
**Purpose:** Create feature quick-start guides
**Used by:** Documentation Agents
**When to use:** After feature implementation is complete
**Output:** `/docs/on-boarding/feature-XX-onboarding.md`

### Template 03: Feature Task Generator
**Purpose:** Create feature task files with acceptance criteria
**Used by:** Architecture & Design Agents
**When to use:** After PRD is approved, before implementation
**Output:** `/docs/tasks/feature-XX-*.md`

### Template 04: Task Completion Workflow
**Purpose:** Workflow prompt for when feature is complete
**Used by:** Hook triggers
**When to use:** Automatically triggered when all Must-Have tasks marked `[x]`
**Output:** Prompts Documentation Agent workflow

### Template 05: Architecture Documentation
**Purpose:** Create system design documentation
**Used by:** Documentation Agents
**When to use:** After feature implementation is complete
**Output:** `/docs/architecture/feature-XX-architecture.md`

### Template 06: Bug Report
**Purpose:** Create consistent bug reports
**Used by:** QA Agents
**When to use:** When bug is discovered
**Output:** Added to task file "Progress / Fixes / Updates"

---

## When Templates are Updated

**Updated by Architecture Agent when:**
- Current template is unclear or hard to follow
- New required sections needed
- Process improves and requires new information
- Agents provide feedback that template is missing something

**Never updated by:**
- Implementation Agents
- Documentation Agents
- QA Agents

(These agents use templates but shouldn't modify them. If they find issues, they report them to Architecture Agent)

---

## Key Rules

### Rule 1: Use Templates, Always
Every feature document must be created from a template. No exceptions. This ensures consistency across the project.

### Rule 2: Templates Are Living Documents
Templates evolve as we learn what works. If a template isn't working, report it to Architecture Agent for improvement.

### Rule 3: Required Sections Are Non-Negotiable
Templates have sections marked "Required" – these must be included in every document. No shortcuts.

### Rule 4: Templates Include Examples
Every template includes an example showing proper usage. If you're unsure how to fill in a section, look at the example.

### Rule 5: Consistency Matters
Templates exist to make documents consistent and easy to find information. Sticking to templates saves everyone time.

---

## Template File Naming

Templates follow this pattern: `NN-template-[purpose].md`

Where:
- `NN` = two-digit number (01, 02, 03, etc.) for ordering
- `template-` = identifies it as a template
- `[purpose]` = what the template is for (kebab-case)

Examples:
- `01-template-prd-generator.md` – First template (PRD)
- `03-template-feature-task-generator.md` – Third template (Feature tasks)

---

## How to Use This Folder

### If you're an Architecture Agent:
- Create new templates when needed
- Maintain templates in this folder
- Test templates before distributing
- Document usage in README.md

### If you're any other agent:
- Copy the appropriate template
- Fill in all Required sections
- Optional sections can be skipped if not needed
- Follow the example format shown in the template

---

## Common Template Patterns

### Pattern 1: Section with Example
```markdown
## Section Name

**Required:** Yes/No
**When to include:** [When is this section needed]

### What to include
[Guidance on what should go here]

### Example
[Filled-in example showing proper usage]
```

### Pattern 2: Checklist Section
```markdown
### Implementation Checklist

Must-Have:
- [ ] Item 1
- [ ] Item 2
- [ ] Item 3

Should-Have:
- [ ] Item 4
- [ ] Item 5

Could-Have:
- [ ] Item 6
```

### Pattern 3: Decision Table
```markdown
## Technology Decisions

| Technology | Why | Alternatives | Tradeoffs |
|-----------|-----|--------------|-----------|
| React Flow | [Reason] | [What else] | [Cost] |
| Zustand | [Reason] | [What else] | [Cost] |
```

---

## README.md in Templates Folder

The `README.md` in this folder should:
- List all templates with brief descriptions
- Show which template to use when
- Provide links to each template
- Note any templates that are deprecated
- Include instructions on how to request new templates

---

## Requesting New Templates

If you need a template that doesn't exist:

1. Report the need to Architecture Agent
2. Include: what you're documenting, when you'd use it, what sections you need
3. Architecture Agent will create and test the template
4. Template gets added to this folder
5. README.md gets updated with new template

---

## Updating This Folder

- Add new templates as new document types are needed
- Update templates when process improves
- Archive old templates if deprecating them
- Keep README.md current with all available templates
- Reference this AGENTS.md from main `/docs/AGENTS.md`

---

## Quick Links

- **Main Agent Routing:** `/docs/AGENTS.md`
- **PRD Folder:** `/docs/prd/`
- **Feature Task Folder:** `/docs/tasks/`
- **On-Boarding Folder:** `/docs/on-boarding/`
- **Architecture Folder:** `/docs/architecture/`
