# App Folder – Agent Routing & Responsibilities

## Overview

This folder contains Next.js application routes, layouts, and API endpoints. It implements the feature functionality defined in the task files.

**Location:** `/app/`

**File pattern:** `[feature-name]/page.tsx`, `[feature-name]/layout.tsx`, `api/[endpoint]/route.ts`

**Primary agents:** Implementation Agents

**Who creates:** Implementation Agents (during feature implementation)

**Who updates:** Implementation Agents (bug fixes, feature changes)

---

## Folder Structure

```
app/
├── layout.tsx              (Root layout)
├── page.tsx                (Home page)
├── api/                    (API endpoints)
│  ├── auth/
│  ├── canvas/
│  └── ...
├── (canvas)/               (Canvas feature pages)
│  ├── layout.tsx
│  └── page.tsx
├── (dashboard)/            (Dashboard feature pages)
│  ├── layout.tsx
│  └── page.tsx
└── AGENTS.md               (this file)
```

---

## Who Works Here?

### 1. **Implementation Agents** (Write application code)
- Read feature task file for acceptance criteria
- Implement pages, API routes, and layouts
- Update progress log in task file
- Fix bugs discovered in testing
- Keep code clean and maintainable
- **Hands off to:** Documentation Agents (when feature complete)

### 2. **Architecture & Design Agents** (Code review & architecture)
- Review implementation architecture
- Suggest improvements to code structure
- Ensure features follow established patterns
- Identify code that needs refactoring
- **Hands off to:** Implementation Agents (with feedback)

---

## Key Files

### `/app/layout.tsx`
- Root layout component
- Global providers (theme, auth, etc.)
- Main navigation
- Should remain stable during feature implementation

### `/app/page.tsx`
- Home/landing page
- Updated by Implementation Agent when home experience changes
- Links to all available features

### `/app/api/`
- Backend API routes
- One folder per feature API
- Implements business logic for features

### Feature-Specific Pages
- Each feature gets its own route folder
- `/app/(canvas)/` for canvas feature
- `/app/(dashboard)/` for dashboard feature
- etc.

---

## When Code is Implemented

**Created by Implementation Agent when:**
- Feature task file is ready (all acceptance criteria defined)
- Architecture plan is in place
- No blockers on dependencies

**Updated by Implementation Agent when:**
- Bug is discovered and fixed
- Feature behavior changes
- Refactoring needed for code quality

**Reviewed by Architecture Agent when:**
- Code is ready for review
- Architecture questions arise
- Performance or scalability concerns

---

## Key Rules

### Rule 1: Code Implements Task Acceptance Criteria
Every line of code written should trace back to acceptance criteria in the task file. No random features added without task file documentation.

### Rule 2: Update Task Progress Daily
Implement Agents must update the task file's "Progress / Fixes / Updates" section with:
- What code was written/completed
- What was tested
- Any issues discovered
- Any blockers

### Rule 3: Reference Task IDs in Code
Include task ID in commit messages when implementing features:
```
[F01-MH-02] Implement block drag-and-drop
```

### Rule 4: Follow Established Patterns
Look at previous features (feature-00, feature-01, etc.) and follow the same patterns for:
- Component structure
- API route structure
- State management approach
- File organization

### Rule 5: Keep Code Clean
- Remove unused code
- Follow TypeScript/React best practices
- Add comments for complex logic
- Refactor when code becomes hard to maintain

---

## Common Patterns

### Pattern 1: Feature Page Structure
```
/app/(feature-name)/
├── layout.tsx           (Feature-specific layout)
├── page.tsx             (Feature page)
├── components/          (Feature-specific components)
│  ├── FeatureHeader.tsx
│  ├── FeatureContent.tsx
│  └── FeatureFooter.tsx
└── hooks/               (Feature-specific hooks)
   └── useFeatureState.ts
```

### Pattern 2: API Route Structure
```
/app/api/feature-name/
├── route.ts             (Main endpoint)
├── [id]/
│  └── route.ts          (ID-specific endpoint)
└── validate.ts          (Validation helpers)
```

### Pattern 3: Commit Message Format
```
[F01-MH-02] Implement block drag-and-drop

- Added Canvas component with React Flow
- Implemented drag-and-drop handler
- Added unit tests for block movement
- Tested with 100+ blocks

See task: /docs/tasks/feature-01-*.md
```

---

## Implementation Workflow

1. **Read task file** – Understand acceptance criteria
2. **Review architecture** – Understand how to build it
3. **Implement code** – Write pages, components, API routes
4. **Test locally** – Verify acceptance criteria work
5. **Update task file** – Log progress daily
6. **Git commit** – Use task ID in commit message
7. **Open for review** – Architecture Agent reviews
8. **Merge when ready** – All tests passing, code clean
9. **Signal completion** – When all Must-Have tasks `[x]`

---

## Code Quality Standards

### TypeScript
- Strict mode enabled
- No `any` types without comment explaining why
- Proper type definitions for props and state

### React
- Functional components only
- Hooks for state management
- Proper dependency arrays in useEffect/useMemo/useCallback
- No prop drilling (use context if needed)

### Testing
- Unit tests for components
- Integration tests for features
- Test coverage >80% for new code

### Performance
- Lazy load features when possible
- Optimize renders (useMemo, useCallback)
- Bundle size aware

---

## Updating This Folder

- Add new feature pages as features are implemented
- Maintain consistent structure across features
- Keep API routes organized by feature
- Remove dead code after features complete
- Reference this AGENTS.md from main `/docs/AGENTS.md`

---

## Quick Links

- **Main Agent Routing:** `/docs/AGENTS.md`
- **Feature Task Files:** `/docs/tasks/`
- **Architecture Docs:** `/docs/architecture/`
- **On-Boarding Guides:** `/docs/on-boarding/`
- **Feature Task Template:** `/docs/templates/03-template-feature-task-generator.md`
