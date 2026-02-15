# AEI Dogfood Workflow Template V2

Purpose: Use AEI to ship AEI by running one roadmap slice at a time through a repeatable Prompt Canvas workflow.

## Core Principle

One runnable slice per execution. Finish one must-have slice completely before starting another.

## Scope Per Execution

- Input: one roadmap task (for example `P1-MH-16`) + in-scope feature task(s)
- Output:
  - implemented code/doc slice
  - updated task documentation
  - verification evidence
  - clear `done` / `iterate` / `next slice` decision

## Repeatable Workflow (B1-B8)

Execute in strict sequence.

| Block ID | Block Name | Owner Agent | Input | Output |
|---|---|---|---|---|
| `B1` | Scope Lock | Planner | roadmap task + feature file | explicit slice goal + in-scope/out-of-scope + success criteria |
| `B2` | Dependency Check | Planner | dependencies/blocks | ready/blocked decision |
| `B3` | Design Pass | Architect | current code + acceptance criteria | file-by-file implementation plan + contracts |
| `B4` | Implement Pass | Implementer | plan from `B3` | focused code/doc changes |
| `B5` | Verify Pass | Tester | changed files + acceptance criteria | pass/fail + evidence |
| `B6` | Review Pass | Reviewer | diff + tests | findings + required fixes |
| `B7` | Docs Sync | Docs Agent | final diff + task file | progress log updates + parity updates |
| `B8` | Ship Decision | Lead | outputs from `B5-B7` | done, iterate, or split next slice |

## Per-Block File Touch Map (Required)

Use this as the default file update contract for every slice.

| Block ID | Must Touch / Update | Conditional Touch / Update | Evidence / Command |
|---|---|---|---|
| `B1` | `docs/tasks/feature-XX-*.md` (add `B1` log entry in `Progress / Fixes / Updates`) | none | include slice goal + in-scope/out-of-scope + acceptance criteria |
| `B2` | `docs/tasks/feature-XX-*.md` (add `B2` dependency status entry) | `docs/tasks/project-roadmap.md` only if dependency status/unblock state changed | note blockers explicitly (`ready` or `blocked`) |
| `B3` | `docs/tasks/feature-XX-*.md` (add `B3` design plan summary + intended file list) | none | include exact file paths/contracts planned |
| `B4` | `docs/tasks/feature-XX-*.md` (add `B4` implementation summary + changed files) | source files from B3 plan | include changed file list for review traceability |
| `B5` | `docs/tasks/feature-XX-*.md` (add `B5` verification result + evidence paths) | `screenshots_evidence/**`, test output artifacts, transcripts/history exports | run slice verification + attach concrete evidence paths |
| `B6` | `docs/tasks/feature-XX-*.md` (add `B6` review findings or approval) | source/doc files if fixes are required from review | if findings exist, route back to `B4` and log fix loop |
| `B7` | `docs/tasks/feature-XX-*.md`, `docs/on-boarding/feature-XX-onboarding.md`, `docs/architecture/feature-XX-architecture.md`, `docs/tasks/project-roadmap.md`, `docs/process/feature-status.json` | `docs/tasks/dogfood-status.md` when task/checklist state changes | `node scripts/update-dogfood-status.mjs`, `npm run docs:parity` |
| `B8` | `docs/tasks/feature-XX-*.md` (final `B8` decision entry: done/iterate/split) | `docs/tasks/project-roadmap.md`, `docs/process/feature-status.json` if status changed at ship decision | hard gate: do not mark done unless `B5` + `B7` evidence/parity are complete |

### Minimum files expected by end of a completed slice

- `docs/tasks/feature-XX-*.md` (must contain `B1..B8` entries)
- `docs/on-boarding/feature-XX-onboarding.md` (or explicit N/A rationale in feature task)
- `docs/architecture/feature-XX-architecture.md` (or explicit N/A rationale in feature task)
- `docs/tasks/project-roadmap.md` (status/ref parity)
- `docs/process/feature-status.json` (state parity)
- `docs/tasks/dogfood-status.md` (when regenerated)

## Docs Parity Gate (Required)

`B7` must verify and fix parity before `B8` can mark done.

- Feature task checkboxes: all in-scope `FXX-*` reflect shipped reality.
- Dogfooding checklist: checked items have evidence for this slice.
- Companion docs: onboarding + architecture docs are updated, or explicit N/A rationale is logged.
- Cross-doc consistency:
  - `docs/tasks/dogfood-status.md` regenerated from feature files
  - `docs/tasks/project-roadmap.md` checkbox state reconciled against mapped feature task completion before done
  - `docs/tasks/project-roadmap.md` `Feature refs:` and `[x]` state match slice outcome
  - `docs/process/feature-status.json` matches true state (`planned`, `in_progress`, `qa_needed`, `complete`, `blocked`)

Hard block:

- Do not mark done if any parity item is missing or inconsistent.

Recommended command during B7/B8:

```bash
npm run docs:parity
```

## Execution Logging Contract (Required)

Every in-scope feature task must log explicit block entries in `Progress / Fixes / Updates`.

- Required entries: `B1`, `B2`, `B3`, `B4`, `B5`, `B6`, `B7`, `B8`
- Each entry includes:
  - Date (`YYYY-MM-DD`)
  - Outcome (`completed`, `blocked`, `iterating`)
  - Evidence path(s) for `B5` and `B7`

`B8` may mark `DONE` only if:

- `B5` evidence is present
- `B7` docs sync is present
- `npm run docs:parity` passes

Minimum B7 docs sync checks:

- Feature task file has full `B1..B8` log
- Companion docs synced:
  - `docs/on-boarding/feature-XX-onboarding.md`
  - `docs/architecture/feature-XX-architecture.md`
- Roadmap/status parity updated
- Dogfood status regenerated when checklist/task states changed:

```bash
node scripts/update-dogfood-status.mjs
```

Optional evidence hygiene:

```bash
npm run evidence:cleanup
```

Recommended strict wrap-up:

```bash
npm run dogfood:wrapup -- --task-id <FXX-*> --workflow-id <workflow_id>
```

## Role Responsibilities (Concise)

- Planner: scope lock + dependency readiness.
- Architect: exact file/contract plan with constraints.
- Implementer: minimal changes only to B3 file plan.
- Tester: acceptance criteria + regressions + evidence.
- Reviewer: correctness/risk/regression review; route back on findings.
- Docs Agent: task docs + companion docs + roadmap/status parity.
- Lead: final `done`/`iterate`/`next slice` decision under gates.

## Orchestrator Rules (R1-R7)

- `R1` One-slice cap: one runnable slice per execution.
- `R2` No silent drift: any touched acceptance criterion is verified.
- `R3` Dependency symmetry: dependency changes reflected upstream/downstream.
- `R4` Docs parity: no ship without progress log + parity sync.
- `R5` Budget guardrail: stop when retries exceed policy.
- `R6` Failure routing: verify fail -> `B3`, review findings -> `B4`.
- `R7` Completion gate: `B8` done requires `B5` pass + `B7` sync.

## Definition of Done (Per Slice)

- [ ] Slice goal is explicit and measurable
- [ ] Changes are confined to B3 plan
- [ ] Acceptance criteria verified with evidence
- [ ] Dated progress entry added
- [ ] Docs parity gate passed
- [ ] Dependency/status references are current
- [ ] Remaining risks + next step documented

## Quick-Start Prompt (LLM / Copilot)

```text
Run AEI dogfood workflow for one slice.
Roadmap task: <PX-XX-YY>
Feature task IDs in scope: <FXX-MH-..>
Goal: implement smallest end-to-end slice that can be validated today.
Apply blocks B1-B8 with rules R1-R7.
Return: plan, changed files, verification results, docs updates, and next slice.
```

## Example Slice Structures

### Feature 12 - Code Explorer

- Roadmap task: `P1-MH-16`
- Feature file: `docs/tasks/feature-12-code-explorer.md`
- Slice 1 (`F12-MH-01`) goal: add tab and preserve canvas/chat state
- Out of scope: file tree, Monaco, preview pane
- Acceptance:
  - `Code Explorer` appears in top nav
  - switching views keeps canvas state
  - switching views keeps chat context
  - empty state appears with no snapshot

### Feature 13 - Comparative Trace Analysis

- Roadmap task: `P2-MH-01`
- Feature file: `docs/tasks/feature-13-comparative-trace-analysis.md`
- Slice goal: scoped fork from selected decision node, inspectable in Trace Viewer
- Acceptance:
  - fork returns new execution id + `mode: "scoped"`
  - only fork subtree is re-evaluated
  - lineage metadata is visible (`source_execution_id`, `fork_node_id`, `fork_mode`)

## Recommended Phase Sequencing

- Phase 1: single-task slices until all `P1-MH-*` are green
- Phase 2: infra slice, then UX slice
- Phase 3: architecture spike first, then implementation slices

Last updated: 2026-02-15 (AEI-aligned V2)
