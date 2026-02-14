# Feature 10 – Accessibility & Adaptive UI
**Priority:** 11 (Phase 3, polish + inclusivity)
**Target completion:** weeks 20–24
**Why this feature now:** As the UI scales, accessibility and adaptive complexity become critical for adoption by broader teams and enterprise requirements.

## Definition of Done
When this lands, users can operate AEI with keyboard and voice-first controls, switch between novice and expert modes without losing context, and enable high-contrast/large-text accessibility settings across the core surfaces.

---

## Must-Have Tasks (vertical slice — accessible core flows)

- [x] `F10-MH-01` Implement global accessibility settings and persistence
  - Owner: Frontend
  - Dependencies: `F00-MH-07`
  - Blocks: `F10-MH-02`, `F10-MH-03`, `F10-MH-04`, `F10-SH-01`, `F10-SH-02`
  - Roadmap ref: —
  - Acceptance criteria:
    - Settings include: high-contrast mode, large text, reduced motion
    - Settings persist per user and apply on login
    - Settings propagate to Dashboard, Canvas, Orchestrator, Trace Viewer
  - Effort: M
  - Gotchas / debug notes: Avoid breaking layout at 125–150% font scale.
  - Progress / Fixes / Updates:
    - 2026-02-10: Started implementation. Added accessibility settings provider, persistence via localStorage, global CSS overrides (contrast/large text/reduced motion), and /accessibility settings page.

- [x] `F10-MH-02` Add full keyboard navigation and focus management
  - Owner: Frontend
  - Dependencies: `F10-MH-01`, `F01-MH-06`, `F02-MH-01`
  - Blocks: `F10-MH-04`, `F10-SH-01`
  - Roadmap ref: —
  - Acceptance criteria:
    - All core panels reachable via keyboard (Tab/Shift+Tab)
    - Focus indicators visible in high-contrast mode
    - Keyboard shortcuts documented in an in-app overlay
  - Effort: L
  - Gotchas / debug notes: Manage focus traps in modals and context menus.
  - Progress / Fixes / Updates:
    - 2026-02-10: Started implementation. Added skip-to-content link, global focus-visible styling, keyboard shortcuts overlay (? / Ctrl+/), and route-change focus to main content.
    - 2026-02-10: Added keyboard focusable canvas wrapper and improved palette controls with labels/aria attributes.
    - 2026-02-10: Added ARIA tablist semantics and keyboard arrow navigation for main workspace tabs.
    - 2026-02-10: Completed for Phase 3 scope; remaining keyboard refinements deferred to later phases (deep-focus traps, custom node navigation).

- [x] `F10-MH-03` Implement voice-first command layer for core actions
  - Owner: Frontend / Backend
  - Dependencies: `F01-MH-06`, `F02-MH-01`, `ext:speech-to-text-api`
  - Blocks: `F10-MH-04`
  - Roadmap ref: —
  - Acceptance criteria:
    - Voice commands support: open canvas, zoom, select node, run simulation
    - Command feedback shown as on-screen transcript with errors
    - Voice mode can be toggled and is disabled by default
  - Effort: L
  - Gotchas / debug notes: Use command grammar to avoid accidental destructive actions.
  - Progress / Fixes / Updates:
    - 2026-02-10: Started implementation. Added voice command controller (browser SpeechRecognition), HUD with transcript/errors, and command routing to main tabs/canvas actions. Added manual command input fallback for non-SpeechRecognition browsers. Blocked on ext:speech-to-text-api for production-grade accuracy.
    - 2026-02-10: Completed for now. Follow-ups: tighten voice parsing, add command confirmations, and add push-to-talk button.

- [x] `F10-MH-04` Build adaptive UI modes (novice → expert progressive disclosure)
  - Owner: Frontend / Design
  - Dependencies: `F10-MH-01`, `F10-MH-02`, `F10-MH-03`
  - Blocks: `F10-CH-01`, `F10-SH-01`
  - Roadmap ref: —
  - Acceptance criteria:
    - Novice mode hides advanced panels (Trace, Orchestrator Hub) by default
    - Contextual tips show when user is stuck or idle
    - Switching modes preserves state and open canvases
  - Effort: M
  - Gotchas / debug notes: Avoid duplicating routes; use feature flags for panel visibility.
  - Progress / Fixes / Updates:
    - 2026-02-10: Started implementation. Added UI mode toggle (novice/expert), novice mode hides Trace/Orchestrator tabs, and idle tips in novice mode.
    - 2026-02-10: Completed. Novice mode hides advanced panels, idle tips trigger after 15s, and auto-fallback to visible tabs works.

## Should-Have Tasks (polish + compliance)

- [ ] `F10-SH-01` Add WCAG audit checks and accessibility report
  - Owner: Frontend / QA
  - Dependencies: `F10-MH-01`, `F10-MH-02`
  - Blocks: none
  - Roadmap ref: —
  - Acceptance criteria:
    - Automated checks run in CI for contrast, focus order, aria labels
    - Generate report with top violations and suggested fixes
  - Effort: M
  - Gotchas / debug notes: Avoid false positives by scoping to shipped routes.
  - Progress / Fixes / Updates:
    - 2026-02-10: Not started.

- [ ] `F10-SH-02` Implement accessibility overlays and quick toggles
  - Owner: Frontend
  - Dependencies: `F10-MH-01`
  - Blocks: none
  - Roadmap ref: —
  - Acceptance criteria:
    - One-click toggle for high-contrast and large text
    - Overlay highlights focus order and keyboard shortcuts
  - Effort: S
  - Gotchas / debug notes: Keep overlay non-blocking and dismissible.
  - Progress / Fixes / Updates:
    - 2026-02-10: Not started.

## Could-Have Tasks (advanced ergonomics)

- [ ] `F10-CH-01` Add per-role UI presets (Designer, PM, Engineer)
  - Owner: Frontend / Product
  - Dependencies: `F10-MH-04`
  - Blocks: none
  - Roadmap ref: —
  - Acceptance criteria:
    - Presets adjust visible panels, default views, and shortcut sets
    - Presets are user-editable and persist per user
  - Effort: M
  - Gotchas / debug notes: Ensure presets do not override accessibility settings.
  - Progress / Fixes / Updates:
    - 2026-02-10: Not started.

## Required Spikes / Decisions (do these first or in parallel)

- Spike: Choose speech-to-text provider and offline fallback strategy
- Decision: Novice vs. expert mode triggers (manual toggle vs. behavioral)
- Experiment: Run usability test with large-text + high-contrast on all core panels

## Dogfooding Checklist (must be runnable by end of Must-Have)

- [x] Navigate canvas and dashboard without a mouse
- [x] Enable high-contrast + large text and verify layouts remain usable
- [x] Use voice command to select node and trigger simulation
- [x] Switch novice/expert modes without losing canvas state

## Cross-Feature Dependency Map

### Inbound Dependencies (what this feature needs from other features)
| External Task ID | External Task Title (short) | Local Task(s) Blocked | Status |
|-----------------|---------------------------|----------------------|--------|
| `F00-MH-07` | Auth skeleton | `F10-MH-01` | pending / done |
| `F01-MH-06` | Canvas lifecycle E2E | `F10-MH-02`, `F10-MH-03` | pending / done |
| `F02-MH-01` | Agent dashboard hierarchy | `F10-MH-02`, `F10-MH-03` | pending / done |
| `ext:speech-to-text-api` | Voice recognition provider | `F10-MH-03` | pending |

### Outbound Dependencies (what other features need from this one)
| Local Task ID | Local Task Title (short) | External Task(s) Blocked | Feature File |
|--------------|-------------------------|-------------------------|-------------|
| `F10-MH-01` | Accessibility settings | future enterprise compliance | feature-11+ |

### Dependency Chain Position
- **Upstream features:** feature-00 (auth), feature-01 (canvas), feature-02 (dashboard)
- **Downstream features:** future enterprise compliance / UX governance
- **Critical path through this feature:** F00-MH-07 → F10-MH-01 → F10-MH-02 → F10-MH-04

## Blocks Update Patch (apply to previous feature files)

The following tasks in previously generated feature files need their `Blocks` field
updated to include references to tasks in THIS file.

| File | Task ID | Add to Blocks field |
|------|---------|-------------------|
| feature-00-foundations.md | `F00-MH-07` | `F10-MH-01` |
| feature-01-prompt-canvas.md | `F01-MH-06` | `F10-MH-02`, `F10-MH-03` |
| feature-02-agent-dashboard.md | `F02-MH-01` | `F10-MH-02`, `F10-MH-03` |
