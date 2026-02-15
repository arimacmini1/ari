# Ari UX Progression Workflow Template (U1-U8)

Purpose: Improve Ari usability one progression stage at a time using a repeatable loop, similar to dogfood `B1-B8` but focused on user experience outcomes.

## Core Principle

One UX progression slice per run.

A slice is one bounded improvement to a stage in the canonical journey:
- Stage A: Intent
- Stage B: Canvas
- Stage C: Orchestrator
- Stage D: Simulation
- Stage E: Execute
- Stage F: Trace
- Stage G: Operational templates

Do not start a second slice until the first has evidence and a decision.

## Inputs and Outputs

Input:
- `docs/on-boarding/ari-user-experience-ground-truth.md`
- one target stage (`A..G`)
- one user persona
- one friction statement
- project context mode (`starter-template` or `imported-repository`)

Output:
- updated UX spec/docs and optionally UI
- validation evidence
- explicit `promote` / `iterate` / `defer` decision
- if `imported-repository`, evidence of import status and editor handoff

## UX Loop (U1-U8)

| ID | Block | Owner | Input | Output |
|---|---|---|---|---|
| `U1` | Scope Lock | Product/UX | stage + persona + friction | bounded slice goal + acceptance criteria |
| `U2` | Baseline Capture | QA/UX | current flow | baseline path/time/failure evidence |
| `U3` | Design Hypothesis | UX | baseline + goals | proposed UX change + expected metric shift |
| `U4` | Spec Update | UX/Docs | hypothesis | updated `ui-workflow-mode-spec` + impacted docs |
| `U5` | Implement | Eng | approved spec | UI/doc changes for slice |
| `U6` | Validate | QA/UX | changed flow | pass/fail against stage checklist |
| `U7` | Evidence + Parity | Docs | validation output | evidence links + doc parity updates |
| `U8` | Decision | Lead/Product | U6+U7 | promote/iterate/defer + next slice |

Repository-context checks (when applicable):
- `U2`: capture import journey timing (`queued -> indexing -> ready`).
- `U6`: verify user can open code workspace and return to Workflow Mode without context loss.
- `U7`: attach repo-linked run evidence (repo/branch/commit metadata in execution/trace).

## Required File Touch Map

| ID | Must update | Conditional update | Evidence |
|---|---|---|---|
| `U1` | `docs/tasks/ux-progression-log.md` | none | scope entry with stage/persona |
| `U2` | `docs/tasks/ux-progression-log.md` | `screehshots_evidence/**` | baseline walkthrough trace |
| `U3` | `docs/on-boarding/ui-workflow-mode-spec.md` | none | hypothesis and acceptance criteria |
| `U4` | `docs/on-boarding/ui-workflow-mode-spec.md`, `docs/on-boarding/README.md` | impacted `docs/on-boarding/feature-*.md` | updated stage contract |
| `U5` | implementation files and/or docs | feature task file when code changes | changed-file list |
| `U6` | `docs/tasks/ux-progression-log.md` | QA notes in feature task | checklist result |
| `U7` | `docs/on-boarding/ari-user-experience-ground-truth.md`, `docs/tasks/ux-progression-log.md` | `docs/tasks/project-roadmap.md` | parity + evidence links |
| `U8` | `docs/tasks/ux-progression-log.md` | roadmap/status docs if promoted | decision entry |

When `project context mode = imported-repository`, include:
- import state evidence
- editor handoff evidence
- repo metadata evidence in run/trace

## Acceptance Gate (Do Not Promote Without This)

A slice can be marked `promote` only if all are true:
- stage acceptance criteria pass
- first-10-min path is not regressed
- mock/production boundaries are clearly labeled
- evidence paths are attached
- next slice is explicitly named

## Why This Loop Makes Sense (Proof)

This loop is valid because each step has strict input/output coupling:
1. `U1` creates testable scope so work cannot sprawl.
2. `U2` creates baseline evidence, enabling measurable comparison.
3. `U3` ties changes to expected metric movement, not opinion.
4. `U4` forces spec-level clarity before implementation.
5. `U5` is constrained by `U4`, preventing random UI drift.
6. `U6` validates behavior using explicit stage criteria.
7. `U7` makes documentation and evidence auditable.
8. `U8` enforces a clear ship/iterate/defer decision.

Without any single block, the loop breaks:
- no `U2` => no proof of improvement
- no `U4` => no shared design contract
- no `U6` => no usability verification
- no `U8` => no prioritization discipline

## Run Prompt (Copy/Paste)

```text
Run Ari UX progression workflow for one slice.
Stage: <A..G>
Persona: <who>
Friction: <what feels unusable>
Apply U1-U8 in order.
Return: scope, baseline, UX spec delta, implemented changes, validation results, evidence links, and promote/iterate/defer decision.
```
