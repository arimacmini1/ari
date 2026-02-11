# Components Folder – Agent Routing & Responsibilities

## Overview

This folder contains reusable React components used across the application. Components are organized by feature and type (UI components, layout components, feature components).

**Location:** `/components/`

**File pattern:** `[ComponentName].tsx`, `[feature-name]/[ComponentName].tsx`

**Primary agents:** Implementation Agents

**Who creates:** Implementation Agents (during feature implementation)

**Who updates:** Implementation Agents (bug fixes, refactoring)

---

## Folder Structure

```
components/
├── ui/                     (Reusable UI components)
│  ├── Button.tsx
│  ├── Card.tsx
│  ├── Dialog.tsx
│  └── ...
├── layout/                 (Layout components)
│  ├── Header.tsx
│  ├── Sidebar.tsx
│  ├── Footer.tsx
│  └── ...
├── canvas/                 (Canvas feature components)
│  ├── Canvas.tsx
│  ├── BlockNode.tsx
│  ├── BlockTypeSelector.tsx
│  └── ...
├── dashboard/              (Dashboard feature components)
│  ├── Dashboard.tsx
│  ├── FeatureCard.tsx
│  └── ...
└── AGENTS.md               (this file)
```

---

## Who Works Here?

### 1. **Implementation Agents** (Write components)
- Create reusable UI components
- Create feature-specific components
- Implement component logic
- Update component progress in task file
- Keep components clean and well-typed
- **Hands off to:** Documentation Agents (when feature complete)

### 2. **Architecture & Design Agents** (Component architecture)
- Define component interfaces
- Suggest component structure improvements
- Review component reusability
- Identify opportunities to consolidate components
- **Hands off to:** Implementation Agents (with feedback)

---

## Component Types

### UI Components (`/components/ui/`)
- Basic, reusable components
- No business logic
- Composable and flexible
- Used by feature components
- Examples: Button, Card, Dialog, Input, Select, etc.

### Layout Components (`/components/layout/`)
- Page structure components
- Navigation elements
- Header, footer, sidebar
- Used by page layouts

### Feature Components (`/components/[feature-name]/`)
- Business logic components
- Feature-specific functionality
- Use UI components as building blocks
- Implement task acceptance criteria

---

## When Components are Created

**Created by Implementation Agent when:**
- Feature task file needs UI components
- Acceptance criteria require new components
- New reusable UI pattern needed

**Updated by Implementation Agent when:**
- Bug fix requires component change
- Behavior needs to change
- Refactoring improves code quality

---

## Key Rules

### Rule 1: UI Components are Reusable
`/components/ui/` components should be:
- Used by multiple features
- Have no business logic
- Fully typed with TypeScript
- Well-documented with props

### Rule 2: Feature Components Implement Tasks
Feature components in `/components/[feature-name]/` should:
- Implement acceptance criteria from task file
- Reference task ID in code comments
- Use UI components as building blocks
- Keep business logic separate from UI

### Rule 3: Props are Strongly Typed
All components must have TypeScript types:
```typescript
interface ButtonProps {
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  children: React.ReactNode;
}

export function Button({ variant = 'primary', ...props }: ButtonProps) {
  // Implementation
}
```

### Rule 4: Component Naming Follows Convention
- PascalCase for component files and exports
- Descriptive names that indicate purpose
- Feature components include feature name

Examples:
- `Button.tsx` → `Button` component
- `CanvasBlockNode.tsx` → `CanvasBlockNode` component
- `DashboardFeatureCard.tsx` → `DashboardFeatureCard` component

### Rule 5: Comments Reference Task IDs
Include task ID when implementing components:
```typescript
// F01-MH-02: Drag-and-drop block support
// See: /docs/tasks/feature-01-*.md

export function BlockNode({ block, onDrag }: BlockNodeProps) {
  // Implementation
}
```

---

## Component Best Practices

### Organization
- One component per file
- Keep components focused on single responsibility
- Group related utilities in same folder

### Props Interface
```typescript
interface [ComponentName]Props {
  // Required props first
  requiredProp: string;
  
  // Optional props with defaults
  optionalProp?: boolean;
  
  // Event handlers
  onChange?: (value: string) => void;
  onClick?: (e: React.MouseEvent) => void;
  
  // Content
  children?: React.ReactNode;
}
```

### State Management
- Use hooks for local state
- Use context for shared state
- Keep state as low as possible
- Lift state only when needed

### Performance
- Memoize components that receive object/array props
- Use useCallback for event handlers
- Use useMemo for expensive computations
- Lazy load heavy components

---

## Common Patterns

### Pattern 1: Basic UI Component
```typescript
interface ButtonProps {
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

export function Button({
  variant = 'primary',
  size = 'md',
  disabled = false,
  children,
  onClick,
}: ButtonProps) {
  return (
    <button
      className={cn(
        'button',
        `button--${variant}`,
        `button--${size}`
      )}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
```

### Pattern 2: Feature Component with Business Logic
```typescript
// F01-MH-02: Block drag-and-drop
// See: /docs/tasks/feature-01-*.md

interface CanvasBlockNodeProps {
  block: Block;
  selected?: boolean;
  onSelect?: (blockId: string) => void;
  onUpdate?: (blockId: string, data: Partial<Block>) => void;
}

export function CanvasBlockNode({
  block,
  selected,
  onSelect,
  onUpdate,
}: CanvasBlockNodeProps) {
  const [isDragging, setIsDragging] = useState(false);
  
  const handleDragStart = useCallback((e: React.DragEvent) => {
    setIsDragging(true);
  }, []);
  
  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onClick={() => onSelect?.(block.id)}
    >
      {/* Component content */}
    </div>
  );
}
```

### Pattern 3: Component with Context
```typescript
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
  
  return (
    <CanvasContext.Provider value={{ blocks, addBlock: ... }}>
      {children}
    </CanvasContext.Provider>
  );
}
```

---

## Updating This Folder

- Add new UI components as patterns emerge
- Add feature components as features are implemented
- Refactor components for better reusability
- Remove components when they're no longer used
- Reference this AGENTS.md from main `/docs/AGENTS.md`

---

## Quick Links

- **Main Agent Routing:** `/docs/AGENTS.md`
- **Feature Task Files:** `/docs/tasks/`
- **App Folder:** `/app/`
- **Hooks Folder:** `/hooks/`
- **Library Folder:** `/lib/`
