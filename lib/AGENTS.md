# Lib Folder – Agent Routing & Responsibilities

## Overview

This folder contains utility functions, helpers, type definitions, and business logic used across the application. The lib folder is for code that's not a component or hook.

**Location:** `/lib/`

**File pattern:** `[feature-name]/[utils].ts`, `[utils].ts`

**Primary agents:** Implementation Agents

**Who creates:** Implementation Agents (during feature implementation)

**Who updates:** Implementation Agents (refactoring, bug fixes)

---

## Folder Structure

```
lib/
├── types.ts                (Shared TypeScript types)
├── constants.ts            (Application constants)
├── utils.ts                (General utilities)
├── canvas/                 (Canvas feature utilities)
│  ├── types.ts
│  ├── block-utils.ts
│  ├── validation.ts
│  └── serialization.ts
├── dashboard/              (Dashboard feature utilities)
│  ├── types.ts
│  └── dashboard-utils.ts
├── api/                    (API client utilities)
│  ├── client.ts
│  ├── endpoints.ts
│  └── types.ts
└── AGENTS.md               (this file)
```

---

## Who Works Here?

### 1. **Implementation Agents** (Write utilities)
- Create utility functions for features
- Define TypeScript types and interfaces
- Implement business logic
- Extract reusable logic from components
- Update progress in task file
- **Hands off to:** Documentation Agents (when feature complete)

### 2. **Architecture & Design Agents** (Utility design)
- Review utility organization
- Suggest refactoring opportunities
- Ensure utilities are truly reusable
- Identify code duplication
- **Hands off to:** Implementation Agents (with feedback)

---

## Utility Types

### Type Definitions (`types.ts`)
- TypeScript interfaces
- Type aliases
- Enums
- Shared data structures
- Should be in root `/lib/types.ts` or feature-specific `/lib/[feature]/types.ts`

### Constants (`constants.ts`)
- Application-wide constants
- Feature-specific constants
- Configuration values
- Should be organized by feature if many

### Business Logic Utilities
- Data transformation
- Validation functions
- Serialization/deserialization
- Feature-specific logic
- API client functions

### Helper Functions
- String manipulation
- Array/object utilities
- Date/time utilities
- Format conversion
- General purpose helpers

---

## When Utilities are Created

**Created by Implementation Agent when:**
- Feature task file needs business logic
- Code is extracted from components
- Reusable logic identified
- Type definitions needed

**Updated by Implementation Agent when:**
- Bug fix requires utility change
- Logic needs optimization
- Refactoring improves code quality

---

## Key Rules

### Rule 1: Utilities Have One Job
Each utility function/file should do one thing well:
- Validation functions in `validation.ts`
- Type definitions in `types.ts`
- API calls in `api/client.ts`
- Helpers in `utils.ts`

### Rule 2: Functions are Strongly Typed
All utility functions must have TypeScript types:
```typescript
export function validateBlock(block: unknown): block is Block {
  // Type guard function
  if (typeof block !== 'object' || block === null) return false;
  return 'id' in block && 'type' in block;
}

export function formatBlockName(name: string, maxLength: number = 50): string {
  return name.length > maxLength ? `${name.slice(0, maxLength)}...` : name;
}
```

### Rule 3: Comments Reference Task IDs
Include task ID when implementing utilities:
```typescript
// F01-MH-02: Block type validation
// See: /docs/tasks/feature-01-*.md

export function isValidBlockType(type: unknown): type is BlockType {
  return ['task', 'decision', 'loop'].includes(type as string);
}
```

### Rule 4: Utilities Don't Import Components
Utilities should NOT import from `/components/`:
- Keeps utilities framework-agnostic
- Utilities can be reused outside React
- Prevents circular dependencies

### Rule 5: Keep Functions Pure
Utility functions should be pure when possible:
- Same input → same output
- No side effects
- No external state dependency
- Easier to test

---

## Organization Patterns

### Pattern 1: Feature-Specific Utilities
```
lib/
├── canvas/
│  ├── types.ts           (Block, Canvas types)
│  ├── block-utils.ts     (Block operations)
│  ├── validation.ts      (Block validation)
│  ├── serialization.ts   (Block saving/loading)
│  └── constants.ts       (Canvas constants)
```

### Pattern 2: Shared Type Definitions
```typescript
// lib/types.ts

export type BlockType = 'task' | 'decision' | 'loop' | 'parallel';

export interface Block {
  id: string;
  type: BlockType;
  title: string;
  description?: string;
  position: { x: number; y: number };
}

export interface Canvas {
  id: string;
  name: string;
  blocks: Block[];
}
```

### Pattern 3: Validation Utilities
```typescript
// lib/canvas/validation.ts

export function validateBlockTitle(title: unknown): title is string {
  return typeof title === 'string' && title.trim().length > 0 && title.length <= 100;
}

export function validateBlock(data: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!isBlock(data)) {
    errors.push('Invalid block structure');
  }
  
  if (!validateBlockTitle(data?.title)) {
    errors.push('Title must be 1-100 characters');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}
```

### Pattern 4: Transformation Utilities
```typescript
// lib/canvas/serialization.ts

export function serializeBlock(block: Block): BlockJSON {
  return {
    id: block.id,
    type: block.type,
    title: block.title,
    description: block.description || '',
    x: block.position.x,
    y: block.position.y,
  };
}

export function deserializeBlock(json: BlockJSON): Block {
  return {
    id: json.id,
    type: json.type as BlockType,
    title: json.title,
    description: json.description || undefined,
    position: { x: json.x, y: json.y },
  };
}
```

### Pattern 5: API Client Utilities
```typescript
// lib/api/client.ts

export const api = {
  async getBlocks(canvasId: string): Promise<Block[]> {
    const response = await fetch(`/api/canvas/${canvasId}/blocks`);
    if (!response.ok) throw new Error('Failed to fetch blocks');
    return response.json();
  },

  async updateBlock(canvasId: string, blockId: string, data: Partial<Block>): Promise<Block> {
    const response = await fetch(`/api/canvas/${canvasId}/blocks/${blockId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error('Failed to update block');
    return response.json();
  },
};
```

---

## Best Practices

### Testing Utilities
- Each utility function should be testable
- Pure functions are easiest to test
- Include test cases for edge cases
- Document assumptions in comments

### Documentation
- Comment non-obvious logic
- Include examples for complex functions
- Document error conditions
- Reference task IDs

### Performance
- Avoid expensive operations in utilities
- Cache expensive computations
- Use appropriate data structures
- Consider bundle size impact

### Error Handling
```typescript
export function parseJSON<T>(json: string): T {
  try {
    return JSON.parse(json) as T;
  } catch (error) {
    console.error('Failed to parse JSON:', json);
    throw new Error(`Invalid JSON: ${error instanceof Error ? error.message : 'unknown error'}`);
  }
}
```

---

## Updating This Folder

- Add new utilities as features are implemented
- Refactor utilities for better reusability
- Move duplicate code into utilities
- Delete utilities when no longer used
- Reference this AGENTS.md from main `/docs/AGENTS.md`

---

## Quick Links

- **Main Agent Routing:** `/docs/AGENTS.md`
- **Feature Task Files:** `/docs/tasks/`
- **Components Folder:** `/components/`
- **Hooks Folder:** `/hooks/`
- **App Folder:** `/app/`
