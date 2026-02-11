# Styles Folder – Agent Routing & Responsibilities

## Overview

This folder contains global styles, Tailwind configuration, and CSS utilities used across the application. Styles support the visual implementation of features.

**Location:** `/styles/`

**File pattern:** `globals.css`, `[feature-name].css`

**Primary agents:** Implementation Agents

**Who creates:** Implementation Agents (during feature implementation)

**Who updates:** Implementation Agents (styling changes, bug fixes)

---

## Folder Structure

```
styles/
├── globals.css             (Global styles & Tailwind directives)
├── layout.css              (Layout-related styles)
├── components.css          (Component-specific styles)
├── canvas.css              (Canvas feature styles)
├── dashboard.css           (Dashboard feature styles)
└── AGENTS.md               (this file)
```

---

## Who Works Here?

### 1. **Implementation Agents** (Write styles)
- Implement feature styles
- Add global styles when needed
- Maintain Tailwind configuration
- Update progress in task file
- Keep styles organized and reusable
- **Hands off to:** Documentation Agents (when feature complete)

### 2. **Architecture & Design Agents** (Style architecture)
- Review style organization
- Suggest consistent patterns
- Ensure design system compliance
- Identify opportunities to consolidate styles
- **Hands off to:** Implementation Agents (with feedback)

---

## When Styles are Created

**Created by Implementation Agent when:**
- Feature task file needs visual styling
- Global styles need to be added
- New design patterns needed

**Updated by Implementation Agent when:**
- Bug fix requires style change
- Visual refinement needed
- Responsive design adjustments

---

## Key Rules

### Rule 1: Prefer Tailwind Classes
Use Tailwind utility classes in components before adding custom CSS:
```typescript
// Good – Use Tailwind classes
export function Button() {
  return (
    <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
      Click me
    </button>
  );
}

// Avoid – Custom CSS for simple styles
// styles/button.css
.btn { /* Don't do this */ }
```

### Rule 2: Global Styles in globals.css
Only add to `globals.css` when:
- Styling applies to entire app
- Setting up Tailwind directives
- Resetting default HTML styles

```css
/* styles/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

html {
  scroll-behavior: smooth;
}

body {
  @apply bg-white dark:bg-slate-950 text-slate-900 dark:text-white;
}
```

### Rule 3: Feature Styles in Feature Files
Put feature-specific styles in feature CSS files:
```css
/* styles/canvas.css */
.canvas-container {
  @apply relative w-full h-screen overflow-hidden;
}

.canvas-block {
  @apply absolute p-4 bg-white border border-gray-200 rounded shadow;
}
```

### Rule 4: Comments Reference Task IDs
Include task ID when implementing styles:
```css
/* F01-MH-02: Block styling */
/* See: /docs/tasks/feature-01-*.md */

.block-node {
  @apply p-4 border-2 border-gray-300 rounded;
}
```

### Rule 5: Responsive Design First
Use Tailwind's responsive breakpoints:
```typescript
// Good – Mobile-first responsive
<div className="p-4 md:p-6 lg:p-8">
  <h1 className="text-2xl md:text-3xl lg:text-4xl">Title</h1>
</div>

// Avoid – Hardcoded sizes
<div style="padding: 16px">
  <h1 style="font-size: 24px">Title</h1>
</div>
```

---

## CSS Organization

### Pattern 1: Component-Scoped Styles
Use CSS classes scoped to components:
```typescript
// components/canvas/Canvas.tsx
import styles from '@/styles/canvas.css';

export function Canvas() {
  return (
    <div className="canvas-container">
      {/* Content */}
    </div>
  );
}
```

```css
/* styles/canvas.css */
.canvas-container {
  @apply w-full h-screen overflow-hidden;
}

.canvas-block {
  @apply p-4 bg-white border border-gray-200;
}
```

### Pattern 2: Tailwind Configuration
```javascript
// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        'canvas-bg': '#f5f5f5',
        'block-border': '#e0e0e0',
      },
      spacing: {
        'block-padding': '16px',
      },
    },
  },
};
```

### Pattern 3: Dark Mode Support
```typescript
// Support dark mode with Tailwind
<div className="bg-white dark:bg-slate-950">
  <h1 className="text-slate-900 dark:text-white">Title</h1>
</div>
```

---

## Style Best Practices

### Performance
- Use Tailwind classes (compiled away)
- Minimize custom CSS
- Don't inline styles in components
- Lazy load feature-specific CSS if large

### Maintainability
- Keep related styles together
- Use consistent naming conventions
- Document complex CSS patterns
- Avoid deeply nested selectors

### Accessibility
```css
/* Good – Accessible focus states */
.button:focus-visible {
  @apply outline-2 outline-offset-2 outline-blue-600;
}

/* Don't remove focus indicators */
.button:focus {
  outline: none; /* Never do this */
}
```

### Organization by Feature
```
styles/
├── globals.css           (Global resets, Tailwind setup)
├── layout.css            (Header, sidebar, footer)
├── canvas.css            (Canvas feature styles)
└── dashboard.css         (Dashboard feature styles)
```

---

## Tailwind Best Practices

### Use Utility Classes
```typescript
// Good
<div className="flex items-center justify-between p-4 bg-gray-100 rounded">

// Avoid
<div style={{ display: 'flex', alignItems: 'center', ... }}>
```

### Create Reusable Components for Complex Styles
```typescript
// Instead of repeating className
function Card({ children }) {
  return (
    <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-md">
      {children}
    </div>
  );
}

// Use it everywhere
<Card>Content</Card>
```

### Extend Tailwind When Needed
```javascript
// tailwind.config.ts
theme: {
  extend: {
    colors: {
      'primary': '#3b82f6',
      'secondary': '#8b5cf6',
    },
    spacing: {
      'gutter': '24px',
    },
  },
}
```

---

## Updating This Folder

- Add feature styles as features are implemented
- Keep global styles minimal
- Remove unused CSS
- Update Tailwind config when new patterns emerge
- Reference this AGENTS.md from main `/docs/AGENTS.md`

---

## Quick Links

- **Main Agent Routing:** `/docs/AGENTS.md`
- **Feature Task Files:** `/docs/tasks/`
- **Components Folder:** `/components/`
- **Tailwind Documentation:** https://tailwindcss.com/
- **Tailwind Config:** `tailwind.config.ts`
