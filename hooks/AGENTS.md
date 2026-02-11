# Hooks Folder – Agent Routing & Responsibilities

## Overview

This folder contains custom React hooks for state management, data fetching, and side effects used across the application. Hooks encapsulate reusable logic that components depend on.

**Location:** `/hooks/`

**File pattern:** `use[HookName].ts`, `[feature-name]/use[HookName].ts`

**Primary agents:** Implementation Agents

**Who creates:** Implementation Agents (during feature implementation)

**Who updates:** Implementation Agents (refactoring, optimization)

---

## Folder Structure

```
hooks/
├── useLocalStorage.ts        (Reusable hooks)
├── useFetch.ts
├── useDebounce.ts
├── useWindowSize.ts
├── canvas/                   (Canvas feature hooks)
│  ├── useCanvas.ts
│  ├── useCanvasState.ts
│  ├── useBlockSelection.ts
│  └── useUndoRedo.ts
├── dashboard/                (Dashboard feature hooks)
│  ├── useDashboard.ts
│  └── useFeatureList.ts
└── AGENTS.md                 (this file)
```

---

## Who Works Here?

### 1. **Implementation Agents** (Write hooks)
- Create custom hooks for features
- Encapsulate component logic
- Manage state with hooks
- Handle data fetching
- Update progress in task file
- **Hands off to:** Documentation Agents (when feature complete)

### 2. **Architecture & Design Agents** (Hook design)
- Review hook organization
- Suggest refactoring opportunities
- Identify common patterns
- Ensure hooks are reusable
- **Hands off to:** Implementation Agents (with feedback)

---

## Hook Types

### Reusable Utility Hooks (`/hooks/`)
- Not feature-specific
- Used by multiple features
- Examples: useLocalStorage, useFetch, useDebounce
- Can be shared across the codebase

### Feature-Specific Hooks (`/hooks/[feature-name]/`)
- Encapsulate feature state logic
- Used only within that feature
- Examples: useCanvas, useCanvasState, useBlockSelection

---

## When Hooks are Created

**Created by Implementation Agent when:**
- Feature task file needs state management
- Logic needs to be reused by multiple components
- Side effects need to be isolated
- Custom hook logic is complex enough to warrant extraction

**Updated by Implementation Agent when:**
- Bug fix requires hook change
- Logic optimization needed
- Refactoring improves performance

---

## Key Rules

### Rule 1: Hooks Have Clear Purpose
Each hook should handle one concern:
- `useCanvas` – Canvas state management
- `useBlockSelection` – Block selection state
- `useUndoRedo` – Undo/redo functionality
- Don't mix unrelated logic in one hook

### Rule 2: Hooks are Strongly Typed
All hooks must have TypeScript types:
```typescript
interface UseCanvasState {
  blocks: Block[];
  addBlock: (block: Block) => void;
  removeBlock: (blockId: string) => void;
  updateBlock: (blockId: string, data: Partial<Block>) => void;
}

export function useCanvasState(): UseCanvasState {
  // Implementation
}
```

### Rule 3: Custom Hooks Follow Naming Convention
- Always start with `use` prefix (React convention)
- Describe what the hook does
- Examples: `useCanvas`, `useFetch`, `useLocalStorage`

```typescript
export function useCanvas() { }
export function useFetchBlocks(canvasId: string) { }
export function useLocalStorage(key: string) { }
```

### Rule 4: Comments Reference Task IDs
Include task ID when implementing hooks:
```typescript
// F01-MH-03: Canvas state management
// See: /docs/tasks/feature-01-*.md

export function useCanvasState() {
  // Implementation
}
```

### Rule 5: Hooks Don't Import Components
Hooks should NOT import from `/components/`:
- Keeps hooks framework-agnostic
- Hooks can be reused for other implementations
- Prevents circular dependencies

Hooks CAN import:
- Other hooks
- Utilities from `/lib/`
- React functions
- External libraries

---

## Hook Patterns

### Pattern 1: Reusable Utility Hook
```typescript
// hooks/useLocalStorage.ts
// Simple storage hook, reusable across features

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return initialValue;
    }
  });

  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error('Error writing to localStorage:', error);
    }
  }, [key, storedValue]);

  return [storedValue, setValue] as const;
}
```

### Pattern 2: Feature State Hook
```typescript
// hooks/canvas/useCanvasState.ts
// F01-MH-03: Canvas state management
// See: /docs/tasks/feature-01-*.md

interface UseCanvasReturn {
  blocks: Block[];
  addBlock: (block: Block) => void;
  removeBlock: (blockId: string) => void;
  updateBlock: (blockId: string, data: Partial<Block>) => void;
}

export function useCanvasState(): UseCanvasReturn {
  const [blocks, setBlocks] = useState<Block[]>([]);

  const addBlock = useCallback((block: Block) => {
    setBlocks(prev => [...prev, block]);
  }, []);

  const removeBlock = useCallback((blockId: string) => {
    setBlocks(prev => prev.filter(b => b.id !== blockId));
  }, []);

  const updateBlock = useCallback((blockId: string, data: Partial<Block>) => {
    setBlocks(prev =>
      prev.map(b => (b.id === blockId ? { ...b, ...data } : b))
    );
  }, []);

  return { blocks, addBlock, removeBlock, updateBlock };
}
```

### Pattern 3: Data Fetching Hook
```typescript
// hooks/useFetch.ts
// Generic fetch hook, reusable across features

interface UseFetchState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

export function useFetch<T>(url: string, options?: RequestInit): UseFetchState<T> {
  const [state, setState] = useState<UseFetchState<T>>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    fetch(url, options)
      .then(res => res.json())
      .then(data => {
        if (!cancelled) setState({ data, loading: false, error: null });
      })
      .catch(error => {
        if (!cancelled) setState({ data: null, loading: false, error });
      });

    return () => { cancelled = true; };
  }, [url, options]);

  return state;
}
```

### Pattern 4: Context Hook
```typescript
// hooks/canvas/useCanvas.ts
// Access canvas context, feature-specific

interface CanvasContextType {
  blocks: Block[];
  selectedBlockId?: string;
  addBlock: (block: Block) => void;
}

const CanvasContext = createContext<CanvasContextType | null>(null);

export function useCanvas() {
  const context = useContext(CanvasContext);
  if (!context) {
    throw new Error('useCanvas must be used within CanvasProvider');
  }
  return context;
}

export function CanvasProvider({ children }: { children: React.ReactNode }) {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [selectedBlockId, setSelectedBlockId] = useState<string | undefined>();

  const addBlock = useCallback((block: Block) => {
    setBlocks(prev => [...prev, block]);
  }, []);

  return (
    <CanvasContext.Provider value={{ blocks, selectedBlockId, addBlock }}>
      {children}
    </CanvasContext.Provider>
  );
}
```

### Pattern 5: Undo/Redo Hook
```typescript
// hooks/canvas/useUndoRedo.ts
// F01-MH-05: Undo/redo functionality
// See: /docs/tasks/feature-01-*.md

interface UseUndoRedoReturn<T> {
  state: T;
  setState: (state: T) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export function useUndoRedo<T>(initialState: T, maxHistory = 50): UseUndoRedoReturn<T> {
  const [history, setHistory] = useState<T[]>([initialState]);
  const [index, setIndex] = useState(0);

  const state = history[index];

  const setState = useCallback((newState: T) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, index + 1);
      newHistory.push(newState);
      return newHistory.length > maxHistory
        ? newHistory.slice(newHistory.length - maxHistory)
        : newHistory;
    });
    setIndex(prev => prev + 1);
  }, [index, maxHistory]);

  const undo = useCallback(() => {
    setIndex(prev => Math.max(0, prev - 1));
  }, []);

  const redo = useCallback(() => {
    setIndex(prev => Math.min(history.length - 1, prev + 1));
  }, [history.length]);

  return {
    state,
    setState,
    undo,
    redo,
    canUndo: index > 0,
    canRedo: index < history.length - 1,
  };
}
```

---

## Best Practices

### Dependencies
- Include all dependencies in dependency arrays
- Use ESLint to catch missing dependencies
- Prefer custom hooks over deeply nested useEffect

### Performance
- Memoize callbacks with useCallback
- Memoize values with useMemo
- Avoid creating new objects/arrays on every render
- Consider using useReducer for complex state

### Error Handling
```typescript
export function useFetch<T>(url: string) {
  const [state, setState] = useState<{ data: T | null; error: Error | null }>({
    data: null,
    error: null,
  });

  useEffect(() => {
    fetch(url)
      .then(res => res.json())
      .then(data => setState({ data, error: null }))
      .catch(error => setState({ data: null, error }));
  }, [url]);

  return state;
}
```

### Documentation
```typescript
/**
 * Hook for managing canvas state
 * 
 * @returns Object containing blocks and update functions
 * 
 * @example
 * const { blocks, addBlock } = useCanvasState();
 * 
 * // F01-MH-03: Canvas state management
 * // See: /docs/tasks/feature-01-*.md
 */
export function useCanvasState() {
  // Implementation
}
```

---

## Updating This Folder

- Add new hooks as features are implemented
- Refactor hooks for better reusability
- Move duplicate logic into hooks
- Delete hooks when no longer used
- Reference this AGENTS.md from main `/docs/AGENTS.md`

---

## Quick Links

- **Main Agent Routing:** `/docs/AGENTS.md`
- **Feature Task Files:** `/docs/tasks/`
- **Components Folder:** `/components/`
- **Lib Folder:** `/lib/`
- **App Folder:** `/app/`
