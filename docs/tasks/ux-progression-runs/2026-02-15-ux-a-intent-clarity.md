# UX Progression Run

- Run ID: `UX-20260215-A-01`
- Date: 2026-02-15
- Stage: `A`
- Persona: solo builder (dogfood)
- Owner: Product/UX
- Status: `promote`

## U1 - Scope Lock

- Friction statement: users can enter a goal but lack a visible "scope complete" signal.
- In scope: define stage-A contract and completion signal in Workflow Mode spec.
- Out of scope: chat model quality improvements.
- Acceptance criteria:
  - [x] Stage A has explicit required output.
  - [x] Stage A has explicit exit condition.
  - [x] Start Here doc reflects canonical flow.

## U2 - Baseline Capture

- Current path walkthrough: user enters prompt, manually guesses next tab.
- Baseline time to complete: inconsistent; usually blocked at handoff to canvas.
- Failure points: unclear success signal after first prompt.
- Evidence:
  - `docs/on-boarding/ari-user-experience-ground-truth.md`

## U3 - Design Hypothesis

- Hypothesis: if Stage A requires a scope summary + explicit confirmation, handoff confusion drops.
- UX change proposed: add Stage A output/exit contract in Workflow Mode spec.
- Expected metric movement:
  - Time-to-first-success: down
  - Stage completion rate: up
  - Drop-off at Stage A->B: down

## U4 - Spec Update

- Spec files updated:
  - `docs/on-boarding/ui-workflow-mode-spec.md`
  - `docs/on-boarding/README.md`
- Summary of spec delta: added stage-by-stage behavior and first-session flow contract.

## U5 - Implement

- Files changed:
  - `docs/on-boarding/ui-workflow-mode-spec.md`
  - `docs/process/ux-progression-workflow-template.md`
  - `docs/templates/05-template-ux-progression-loop.md`
  - `docs/tasks/ux-progression-log.md`
- Notes: docs-first implementation to enforce loop before UI coding.

## U6 - Validate

- Checklist used: Stage A acceptance criteria.
- Results:
  - [x] Criterion 1
  - [x] Criterion 2
  - [x] Criterion 3
- Regressions found: none.

## U7 - Evidence + Parity

- Evidence links:
  - `docs/process/ux-progression-workflow-template.md`
  - `docs/templates/05-template-ux-progression-loop.md`
  - `docs/on-boarding/ui-workflow-mode-spec.md`
- Docs updated:
  - `docs/on-boarding/README.md`
  - `docs/on-boarding/ari-user-experience-ground-truth.md`
- Mock vs production note verified: `yes`

## U8 - Decision

- Decision: `promote`
- Rationale: workflow has enforceable stage contract, traceable run template, and evidence log.
- Next slice: `UX-B-01` Canvas validation visibility.
- Owner + target date: Product/UX, 2026-02-16.
