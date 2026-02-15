# UX Progression Log

Purpose: Track UX slices executed with the `U1-U8` loop.

## Active Backlog (by stage)

- [x] `UX-A-01` Stage A intent clarity for first-time users
- [x] `UX-A-02` Stage A project context import and code workspace handoff
- [x] `UX-B-01` Canvas validation visibility in Workflow Mode
- [x] `UX-C-01` Rule-selection confidence cues
- [x] `UX-D-01` Simulation result comprehension (budget/time/confidence)
- [ ] `UX-E-01` Execute gate clarity and risk confirmation
- [ ] `UX-F-01` Trace first-view simplification
- [x] `UX-G-01` Operational template selection and reuse

## Run History

### 2026-02-15 - `UX-20260215-A-01` (sample proof run)
- Stage: `A` Intent
- Persona: solo builder (dogfood)
- Friction: user submits a goal but does not know what "good scope" looks like.
- Decision: `promote`
- Why this passed:
  - Defined explicit stage contract in `docs/on-boarding/ui-workflow-mode-spec.md`
  - Added process loop + run template for repeatability
  - Added Start Here entrypoint for canonical path
- Evidence:
  - `docs/process/ux-progression-workflow-template.md`
  - `docs/templates/05-template-ux-progression-loop.md`
  - `docs/on-boarding/ui-workflow-mode-spec.md`
  - `docs/on-boarding/README.md`

### 2026-02-15 - `UX-20260215-B-01` (canvas validation visibility)
- Stage: `B` Prompt Canvas
- Persona: first-time builder (dogfood)
- Friction: users cannot tell if their graph is valid or what to fix next.
- Decision: `promote`
- Why this passed:
  - Stage B now has a persistent `Graph Validation` contract.
  - Blocked/ready stage transitions are explicit.
  - Success/failure/recovery states are defined for Stage B.
- Evidence:
  - `docs/on-boarding/ui-workflow-mode-spec.md`
  - `docs/tasks/ux-progression-runs/2026-02-15-ux-b-canvas-validation-visibility.md`

### 2026-02-15 - `UX-20260215-C-01` (rule-selection confidence cues)
- Stage: `C` Orchestrator
- Persona: first-time builder (dogfood)
- Friction: users select rules without confidence or safety context.
- Decision: `promote`
- Why this passed:
  - Stage C now has a persistent `Rule Confidence` card contract.
  - Continue/block behavior is explicit and actionable.
  - Success/failure/recovery states are defined for Stage C.
- Evidence:
  - `docs/on-boarding/ui-workflow-mode-spec.md`
  - `docs/tasks/ux-progression-runs/2026-02-15-ux-c-rule-selection-confidence.md`

### 2026-02-15 - `UX-20260215-G-01` (first-session scaffolding + quick-win templates)
- Stage: `G` Operational
- Persona: first-time builder (dogfood)
- Friction: no guided onboarding scaffold in actual UI caused early drop-off.
- Decision: `promote`
- Why this passed:
  - Workflow Mode now includes checklist overlay with stage jump actions.
  - Quick-win templates pre-populate canvas for fast starts.
  - Checklist visibility/progress persists and can be restored.
- Evidence:
  - `components/aei/main-workspace.tsx`
  - `docs/tasks/ux-progression-runs/2026-02-15-ux-g-first-session-scaffolding.md`

### 2026-02-15 - `UX-20260215-A-02` (repository import + code workspace handoff)
- Stage: `A` Intent
- Persona: first-time builder with real GitHub project
- Friction: users cannot tell how to attach a real codebase and when they can proceed.
- Decision: `promote`
- Why this passed:
  - Stage A now has explicit template vs repository mode selector with status lifecycle (`queued -> indexing -> ready | error`).
  - `Continue to Canvas` gating enforces readiness rules per mode.
  - `Open Code Workspace` handoff supports code-server via feature flag with fallback to Code Explorer.
  - Repo metadata (`source_repo { url, branch, commit }`) propagates end-to-end from import through execution/trace to the trace viewer badge.
  - Type check and build pass cleanly; all new fields are optional and backward-compatible.
- Evidence:
  - `docs/on-boarding/ui-workflow-mode-spec.md`
  - `docs/tasks/ux-progression-runs/2026-02-15-ux-a-repository-context-import.md`
  - `components/aei/main-workspace.tsx`
  - `lib/execution-store.ts` (SourceRepo interface)
  - `components/aei/trace-viewer-modal.tsx` (repo badge)

### 2026-02-15 - `UX-20260215-D-01` (simulation result comprehension)
- Stage: `D` Simulation
- Persona: first-time builder (dogfood)
- Friction: users see raw simulation metrics but cannot tell if results are acceptable or concerning.
- Decision: `promote`
- Why this passed:
  - Stage D now has Gate Status card with overall readiness indicator (✓ Ready/⚠ Warnings/✗ Blocked).
  - Cost shows as `$X / $Y budget` with status badge (✓ Well within budget / ⚠ Approaching limit / ✗ Over budget).
  - Duration includes plain-language context (Typical/Higher/Lower for N tasks).
  - Success probability shows confidence label (High/Medium/Low confidence).
  - Actionable guidance appears for warnings and failures.
  - Execute button behavior matches gate status (disabled when blocked, confirmation when warnings).
  - Mock simulation behavior clearly labeled with banner.
  - All 12 acceptance criteria pass; type check clean; no regressions.
- Evidence:
  - `docs/on-boarding/ui-workflow-mode-spec.md` (new section 9: Stage D Implementation Packet)
  - `docs/tasks/ux-progression-runs/2026-02-15-ux-d-simulation-result-comprehension.md`
  - `components/aei/simulation-panel.tsx` (11 new helper functions + redesigned results UI)
  - `/tmp/ux-d-01-simulation-panel-diff.patch` (363 lines)

## How to Run Next Slice

1. Copy `docs/templates/05-template-ux-progression-loop.md`
2. Save under `docs/tasks/ux-progression-runs/`
3. Execute `U1-U8` using `docs/process/ux-progression-workflow-template.md`
4. Append final decision to this log
