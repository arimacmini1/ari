# UX Progression Run

- Run ID: `UX-20260215-G-01`
- Date: 2026-02-15
- Stage: `G`
- Persona: first-time builder (dogfood)
- Owner: Product/UX
- Status: `promote`

## U1 - Scope Lock

- Friction statement: new users enter workspace without guided onboarding and struggle to start a usable workflow.
- In scope: add first-session checklist overlay, quick-win templates, and recovery action entrypoint.
- Out of scope: deep trace UI redesign.
- Acceptance criteria:
  - [x] Workflow Mode includes first-session checklist with stage jump actions.
  - [x] Quick-win templates pre-populate Prompt Canvas.
  - [x] Users can hide/show checklist without losing progress.

## U2 - Baseline Capture

- Current path walkthrough: user lands in tabs and must guess order of operations.
- Baseline time to complete: high variance due to mode switching.
- Failure points: no progression scaffold, no starter template acceleration.
- Evidence:
  - `docs/on-boarding/ui-workflow-mode-spec.md`
  - `components/aei/main-workspace.tsx` (pre-change)

## U3 - Design Hypothesis

- Hypothesis: checklist + templates + explicit recovery action improve first-run completion and reduce confusion.
- UX change proposed: add persistent guided checklist panel and prebuilt canvas templates.
- Expected metric movement:
  - Time-to-first-success: down
  - Stage completion rate: up
  - Drop-off in first session: down

## U4 - Spec Update

- Spec files updated:
  - `docs/on-boarding/ui-workflow-mode-spec.md` (contract already aligned)
- Summary of spec delta: implementation now matches first-session guidance and quick-win template intent.

## U5 - Implement

- Files changed:
  - `components/aei/main-workspace.tsx`
  - `docs/tasks/ux-progression-runs/2026-02-15-ux-g-first-session-scaffolding.md`
  - `docs/tasks/ux-progression-log.md`
- Notes: Workflow Mode now has actionable onboarding scaffolding with state persistence.

## U6 - Validate

- Checklist used: U1 acceptance criteria.
- Results:
  - [x] Criterion 1
  - [x] Criterion 2
  - [x] Criterion 3
- Regressions found: none; Advanced Mode tab workflow remains available.

## U7 - Evidence + Parity

- Evidence links:
  - `components/aei/main-workspace.tsx`
  - `docs/on-boarding/ui-workflow-mode-spec.md`
- Docs updated:
  - `docs/tasks/ux-progression-log.md`
- Mock vs production note verified: `yes`

## U8 - Decision

- Decision: `promote`
- Rationale: users now have guided first-session flow and immediate starter templates in UI.
- Next slice: `UX-D-01` Simulation result comprehension.
- Owner + target date: Product/UX, 2026-02-16.
