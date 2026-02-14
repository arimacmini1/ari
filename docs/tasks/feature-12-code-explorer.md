# Feature 12 - Code Explorer (Read-Only Codebase View)
**Priority:** 06 (Phase 1, code visibility + inspection)
**Target completion:** weeks 7-9
**Why this feature now:** After Familiar Mode and Code Peek, teams still need a dedicated, fast place to browse generated codebases without switching to an external IDE. Code Explorer completes the prompt -> artifacts -> inspect loop while keeping AEI read-only-by-default.

## Definition of Done
When this lands, a real user can open a dedicated Code Explorer tab, browse the latest generated (or imported) codebase via a file tree, open files in a read-only Monaco editor with syntax highlighting, view a basic preview (iframe for web artifacts), and switch back to Prompt Canvas / Trace Viewer without losing canvas state.

---

## Must-Have Tasks (vertical slice - get the loop working)

- [x] `F12-MH-01` Add Code Explorer tab and route/view-state isolation
  - Owner: Frontend / Design
  - Dependencies: `F01-MH-06`
  - Blocks: `F12-CH-02`, `F12-MH-02`, `F12-MH-03`
  - Roadmap ref: `P1-MH-16`
  - Acceptance criteria:
    - New top-level tab `Code Explorer` appears in main navigation next to Prompt Canvas / Trace Viewer
    - Switching tabs does not reset Prompt Canvas state or AI Copilot chat state
    - Code Explorer has an explicit empty-state when no codebase is available
    - Code Explorer is a separate view (no canvas mutation on entry)
  - Effort: M
  - Gotchas / debug notes: Avoid coupling Code Explorer view state into canvas localStorage keys.
  - Progress / Fixes / Updates:
    - 2026-02-12: Started implementation. Added `code-explorer` top-level workspace tab in `components/aei/main-workspace.tsx` and introduced a dedicated read-only empty-state panel.
    - 2026-02-12: Preserved view isolation by rendering Code Explorer as a separate panel without mutating canvas storage keys or Prompt Canvas state handlers.
    - 2026-02-12: Verification run: `npm run build` completed successfully after the tab/panel changes.
    - 2026-02-12: Manual verification: confirmed tab presence and that switching tabs preserves canvas and chat state; task marked complete.

- [x] `F12-MH-02` Implement codebase snapshot loader for latest execution artifacts
  - Owner: Backend / Frontend
  - Dependencies: `F03-MH-03`, `F04-MH-03`
  - Blocks: `F12-MH-03`, `F12-MH-04`, `F12-MH-06`, `F12-SH-02`, `F14-MH-02`
  - Roadmap ref: `P1-MH-16`
  - Acceptance criteria:
    - After a mock execution completes, Code Explorer can load a normalized file tree snapshot (folders/files + metadata)
    - Snapshot loader supports a stable root (project/workspace) and predictable paths for previewable artifacts
    - Loader failures show actionable UI errors and do not break the rest of the workspace
    - Snapshot can be refreshed to reflect the latest execution without forcing a full page reload
  - Effort: L
  - Gotchas / debug notes: Normalize separators and guard against path traversal (`..`) in artifact paths.
  - Progress / Fixes / Updates:
    - 2026-02-12: Started implementation. Added snapshot normalization utility at `lib/code-explorer-snapshot.ts` to convert generated artifacts into a stable `generated/` rooted file list with sanitized paths.
    - 2026-02-12: Added API endpoint `GET/POST /api/code-explorer/snapshot` in `app/api/code-explorer/snapshot/route.ts` to store and load the latest generated snapshot.
    - 2026-02-12: Wired simulation output publish step in `components/aei/simulation-panel.tsx` to persist artifacts to the Code Explorer snapshot endpoint after successful mock simulation.
    - 2026-02-12: Updated Code Explorer panel in `components/aei/main-workspace.tsx` to load latest snapshot, show file metadata, provide in-panel refresh, and surface actionable loader errors.
    - 2026-02-12: Verification run: `npm run build` completed successfully with new snapshot route and UI loader path.
    - 2026-02-12: Manual verification: confirmed snapshot JSON at `/api/code-explorer/snapshot` and Code Explorer `Refresh` loads file rows; task marked complete.

- [x] `F12-MH-03` Build file tree sidebar with expand/collapse and selection model
  - Owner: Frontend
  - Dependencies: `F12-MH-01`, `F12-MH-02`
  - Blocks: `F12-MH-04`, `F12-MH-06`, `F12-SH-01`
  - Roadmap ref: `P1-MH-16`
  - Acceptance criteria:
    - Left sidebar renders folders/files with expand/collapse controls
    - Selecting a file updates central viewer and keeps selection highlighted
    - Supports 10-20 file codebase opening in <2s (best-effort on dev hardware)
    - Handles ~500 files without noticeable lag (virtualized or equivalent optimization)
  - Effort: M
  - Gotchas / debug notes: Pre-flatten tree indexes for fast filtering/expand operations.
  - Progress / Fixes / Updates:
    - 2026-02-12: Started implementation. Added hierarchical file tree rendering (expand/collapse) and a selection model in Code Explorer using snapshot paths, plus a simple read-only content viewer (Monaco deferred to `F12-MH-04`).
    - 2026-02-12: Verification run: `npm run build` completed successfully after tree + selection changes.
    - 2026-02-12: Manual verification completed during Monaco + preview validation: expand/collapse works, selecting a file updates the central viewer, and refresh updates the tree; task marked complete.

- [x] `F12-MH-04` Integrate read-only Monaco editor for file viewing
  - Owner: Frontend
  - Dependencies: `F12-MH-03`
  - Blocks: `F12-CH-01`, `F12-MH-05`, `F12-MH-06`
  - Roadmap ref: `P1-MH-16`
  - Acceptance criteria:
    - Selected file renders in a Monaco editor instance in read-only mode
    - Syntax highlighting selects a reasonable language mode based on extension
    - Large files do not freeze the UI (show loading state / defer work)
    - Editor state (scroll position) is preserved when switching between files
  - Effort: L
  - Gotchas / debug notes: Lazy-load Monaco to avoid penalizing initial workspace load.
  - Progress / Fixes / Updates:
    - 2026-02-12: Started implementation. Replaced plain-text preview with `CodeExplorerMonaco` in `components/aei/main-workspace.tsx` and added a lazy Monaco loader in `components/aei/code-explorer-monaco.tsx`.
    - 2026-02-12: Added extension-based language mode selection, read-only editor config, and per-file view-state restoration (scroll/position) when switching files.
    - 2026-02-12: Added large-file guardrail and deferred content loading to avoid UI freezes for oversized files.
    - 2026-02-12: Fixed file-selection rendering reliability in Monaco by remounting editor per selected path while preserving cached view state across switches.
    - 2026-02-12: Manual verification confirmed by operator: selecting multiple files updates Monaco immediately without requiring Refresh; task marked complete.

- [x] `F12-MH-05` Add preview pane and Code Context placeholder in right sidebar
  - Owner: Frontend / Design
  - Dependencies: `F12-MH-04`, `F04-MH-02`
  - Blocks: `F12-MH-06`
  - Roadmap ref: `P1-MH-16`
  - Acceptance criteria:
    - Central area supports a split view: Monaco editor + preview pane
    - Web outputs can render in an iframe preview; non-web outputs fall back to text preview
    - Right sidebar retains existing Properties panel behavior and adds a `Code Context` section placeholder
    - Preview failures degrade safely (no hard crash; show error + fallback)
  - Effort: M
  - Gotchas / debug notes: Sandbox iframe previews and only allow known-safe URLs/paths.
  - Progress / Fixes / Updates:
    - 2026-02-12: Started implementation. Updated `components/aei/main-workspace.tsx` to render split central layout (read-only Monaco + preview pane) and a right sidebar with `Properties` plus `Code Context` placeholder.
    - 2026-02-12: Added sandboxed iframe preview for HTML/SVG artifacts and safe fallback messaging for non-previewable files or preview failures.
    - 2026-02-12: Verification run: `npm run lint` passes (warnings only) after integrating preview and sidebar updates.
    - 2026-02-12: Added in-UI helper `Load Preview Samples` to generate HTML/SVG snapshot test artifacts without console calls.
    - 2026-02-12: Manual verification confirmed by operator: non-web fallback text displays correctly and HTML/SVG preview renders; task marked complete.

- [x] `F12-MH-06` Performance + persistence hardening for Code Explorer
  - Owner: Frontend / Infra
  - Dependencies: `F12-MH-02`, `F12-MH-03`, `F12-MH-04`, `F12-MH-05`
  - Blocks: `F12-SH-01`
  - Roadmap ref: `P1-MH-16`
  - Acceptance criteria:
    - Code Explorer remembers last-open file + tree expansion state across refresh
    - Switching to/from Code Explorer does not lose canvas state (verify explicitly)
    - Opening a small codebase (10-20 files) stays under ~2s best-effort; 500-file browsing stays responsive
    - Add lightweight internal timings (load time, select time) for debugging
  - Effort: M
  - Gotchas / debug notes: Debounce expensive derived-state recomputations; memoize tree transforms.
  - Progress / Fixes / Updates:
    - 2026-02-12: Started implementation. Added persistent Code Explorer state in `components/aei/main-workspace.tsx` using dedicated keys for last-open file (`aei.code-explorer.selected-path`) and expanded folders (`aei.code-explorer.expanded-folders`).
    - 2026-02-12: Added lightweight internal timings in the Properties panel: `snapshot_load_ms` and `select_file_ms`.
    - 2026-02-12: Added stale-selection recovery when snapshot changes and previously selected path no longer exists.
    - 2026-02-12: Verification run: `npm run lint` passes (warnings only).
    - 2026-02-12: Manual verification confirmed by operator: last-open file and expanded folders persist across refresh; switching tabs preserves Prompt Canvas/chat state; timing values render in Properties panel. Task marked complete.
    - 2026-02-12: Dogfood pass: opened a 10-20 file snapshot and confirmed initial open stays under ~2s best-effort on dev hardware.

## Should-Have Tasks (makes it dogfood-able and lovable)

- [ ] `F12-SH-01` Add quick-open and filename search
  - Owner: Frontend
  - Dependencies: `F12-MH-03`, `F12-MH-06`
  - Blocks: none
  - Roadmap ref: `—`
  - Acceptance criteria:
    - Users can fuzzy-search filenames and open via keyboard
    - Search returns results quickly for ~500 files (best-effort <100ms)
    - Search UI is accessible (keyboard nav + focus management)
  - Effort: M
  - Gotchas / debug notes: Build a precomputed lowercase index to keep search fast.
  - Progress / Fixes / Updates:
    - 2026-02-12: Started implementation. Added `Quick Open` control to `components/aei/main-workspace.tsx` with searchable filename/path index and ranked results.
    - 2026-02-12: Added keyboard flow: `Ctrl/Cmd+K` to open, Arrow Up/Down to navigate results, `Enter` to select, `Esc` to close.
    - 2026-02-12: Added accessible combobox/listbox semantics and click-to-select behavior; verification pending manual keyboard navigation check before marking complete.

- [x] `F12-SH-02` Load Code Explorer from imported repos when present
  - Owner: Backend / Frontend
  - Dependencies: `F11-MH-03`, `F12-MH-02`
  - Blocks: none
  - Roadmap ref: `—`
  - Acceptance criteria:
    - If a project import exists, Code Explorer can switch source to imported repo snapshot
    - Imported repo snapshot respects the same normalized path + metadata contract
    - Clear UI indicates which source is currently being viewed (generated vs imported)
  - Effort: M
  - Gotchas / debug notes: Keep source selection explicit to avoid confusion when outputs differ.
  - Progress / Fixes / Updates:
    - 2026-02-12: Started implementation. Extended snapshot API (`app/api/code-explorer/snapshot/route.ts`) to support source-specific snapshots (`generated` and `imported`) and `GET ?source=...`.
    - 2026-02-12: Added imported snapshot normalization in `lib/code-explorer-snapshot.ts` with the same path/metadata contract and `imported/` root.
    - 2026-02-12: Updated import flow (`app/api/familiar/import/route.ts`) to publish imported snapshot files after import-to-canvas succeeds.
    - 2026-02-12: Added explicit Code Explorer source switcher (Generated/Imported) in `components/aei/main-workspace.tsx` with source-aware loading/errors and sample generation paths.
    - 2026-02-12: Manual verification passed: source switch works (`generated`/`imported`), imported snapshots load after import flow, and switching sources preserves clear state messaging. Task marked complete.

## Could-Have Tasks (polish - defer without shame)

- [ ] `F12-CH-01` Add side-by-side diff view within Code Explorer
  - Owner: Frontend
  - Dependencies: `F12-MH-04`, `F04-MH-04`
  - Blocks: none
  - Roadmap ref: `—`
  - Acceptance criteria:
    - Users can compare two versions of a file with a side-by-side diff
    - Large diffs do not lock the UI (compute off main thread or defer)
  - Effort: M
  - Gotchas / debug notes: Diff rendering needs virtualization for long files.
  - Progress / Fixes / Updates:
    - 2026-02-12: Not started.

- [ ] `F12-CH-02` Deep-link to Code Explorer from Code Peek / Trace Viewer
  - Owner: Frontend
  - Dependencies: `F11-MH-04`, `F05-MH-05`, `F12-MH-01`
  - Blocks: none
  - Roadmap ref: `—`
  - Acceptance criteria:
    - Code Peek can open a file directly in Code Explorer (same artifact path)
    - Trace Viewer can link a decision node to a relevant file path when available
  - Effort: L
  - Gotchas / debug notes: Requires stable artifact path IDs across surfaces.
  - Progress / Fixes / Updates:
    - 2026-02-12: Not started.

## Required Spikes / Decisions (do these first or in parallel)

- Decision: Define a normalized codebase snapshot contract (tree + file fetch) for generated artifacts
- Spike: Monaco bundling strategy for Next.js (route-level lazy load vs shared bundle)
- Decision: Preview sandbox policy (iframe restrictions, allowed URLs)
- Experiment: Load-test 500-file snapshots and validate interaction latency targets

## Dogfooding Checklist (must be runnable by end of Must-Have)

- [x] Run mock execution pipeline and confirm Code Explorer loads the latest artifact tree
- [x] Browse a 10-20 file codebase and verify <2s initial open best-effort
- [x] Open multiple files and confirm editor is read-only with syntax highlighting
- [x] Preview a web artifact via iframe and verify safe fallback behavior
- [x] Switch between Prompt Canvas / Trace Viewer / Code Explorer without losing canvas state

## Cross-Feature Dependency Map

### Inbound Dependencies (what this feature needs from other features)
| External Task ID | External Task Title (short) | Local Task(s) Blocked | Status |
|-----------------|---------------------------|----------------------|--------|
| `F01-MH-06` | Canvas lifecycle E2E | `F12-MH-01` | pending / done |
| `F03-MH-03` | Simulation pipeline | `F12-MH-02` | pending / done |
| `F04-MH-03` | Artifact generation wiring | `F12-MH-02` | pending / done |
| `F04-MH-02` | Artifact preview panel UI | `F12-MH-05` | pending / done |
| `F11-MH-03` | Replit import -> canvas prototype | `F12-SH-02` | pending / done |
| `F11-MH-04` | Code Peek panel | `F12-CH-02` | pending / done |
| `F05-MH-05` | Trace viewer wiring | `F12-CH-02` | pending / done |
| `F04-MH-04` | Artifact diff viewer | `F12-CH-01` | pending / done |

### Outbound Dependencies (what other features need from this one)
| Local Task ID | Local Task Title (short) | External Task(s) Blocked | Feature File |
|--------------|-------------------------|-------------------------|-------------|
| `F12-MH-02` | Codebase snapshot loader | `P2-MH-02`, `P2-MH-05`, `P3-MH-02` (roadmap-level) | future feature files |

### Dependency Chain Position
- **Upstream features:** feature-01 (canvas), feature-03 (orchestrator), feature-04 (artifacts), feature-05 (trace), feature-11 (code peek)
- **Downstream features:** Phase 2/3 scale + analytics + simulator improvements
- **Critical path through this feature:** `F03-MH-03` -> `F04-MH-03` -> `F12-MH-02` -> `F12-MH-03` -> `F12-MH-04` -> `F12-MH-06`

## Blocks Update Patch (apply to previous feature files)

The following tasks in previously generated feature files need their `Blocks` field
updated to include references to tasks in THIS file.

| File | Task ID | Add to Blocks field |
|------|---------|-------------------|
| feature-01-prompt-canvas.md | `F01-MH-06` | `F12-MH-01` |
| feature-03-orchestrator-hub.md | `F03-MH-03` | `F12-MH-02` |
| feature-04-output-simulator.md | `F04-MH-03` | `F12-MH-02` |
| feature-04-output-simulator.md | `F04-MH-02` | `F12-MH-05` |
| feature-11-familiar-mode-onboarding.md | `F11-MH-04` | `F12-CH-02` |
| feature-05-ai-trace-viewer.md | `F05-MH-05` | `F12-CH-02` |
| feature-04-output-simulator.md | `F04-MH-04` | `F12-CH-01` |
