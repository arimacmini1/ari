# Feature Workflow Framework

This document is the single source of truth for how feature planning artifacts are generated and kept in sync.

## Pipeline Overview

1. **Roadmap input**
   - Source: `docs/tasks/project-roadmap.md`
   - Use this to identify the next `P*-*` scope and where it maps to a new `FXX-*` feature file.

2. **Feature task generation**
   - Template: `docs/templates/03-template-feature-task-generator.md`
   - Inputs:
     - `docs/tasks/project-roadmap.md`
     - `docs/prd/master-prd-AEI.md`
     - `docs/tasks/feature-task-index.md`
   - Output:
     - New `docs/tasks/feature-XX-*.md`

3. **Index refresh**
   - Regenerate `docs/tasks/feature-task-index.md` from all feature files.

4. **Blocks symmetry**
   - Ensure that any task listed as a `Dependency` in one feature appears in the `Blocks` list of the upstream feature task.

5. **On-boarding + Architecture stubs**
   - Create (if missing):
     - `docs/on-boarding/feature-XX-onboarding.md`
     - `docs/architecture/feature-XX-architecture.md`

6. **Roadmap refs**
   - Update `Feature refs:` in `project-roadmap.md` to map relevant `P*-*` tasks to `FXX-*` tasks.

7. **Testing window (manual sign-off)**
   - Schedule a testing window for newly built features.
   - Update `docs/process/feature-status.json` with `qa_needed` and the target `qa_window_days`.
   - After QA, set status to `complete` or `blocked` with notes.

8. **Start work**
   - Ensure implementation session model is `gpt-5.3-codex` for any `FXX-*` coding task.
   - Update the first `FXX-MH-*` task progress line with a dated entry when implementation begins.

## Automation Script (bash)

```
bash scripts/feature-pipeline.sh
```

### Next-step prompts

After the script runs, it prints a clear set of next-step prompts:
1. Start Feature implementation (e.g., F11-MH-01)
2. Generate onboarding + architecture content for the feature
3. Update roadmap refs or QA status

Pick one in chat and I will proceed.

### Implementation model requirement

- For all feature implementation tasks (`FXX-*`), use model `gpt-5.3-codex`.
- If current chat/session is on a different model, start a new Codex session with `gpt-5.3-codex` before editing code.

### Interactive / in-the-loop mode

```
bash scripts/feature-pipeline.sh -DryRun
bash scripts/feature-pipeline.sh -Prompt
```

- `-DryRun` prints planned changes without writing files.
- `-Prompt` asks for confirmation before applying changes.

### Scope to a single feature

```
bash scripts/feature-pipeline.sh -Feature 11
```

### Optional flags
- `-NoIndex`   Skip index regeneration
- `-NoBlocks`  Skip Blocks symmetry updates
- `-NoStubs`   Skip onboarding/architecture stubs

## Status & QA tracking

- Status map: `docs/process/feature-status.json`
- `feature_status`: `planned | in_progress | qa_needed | complete | blocked`
- `qa_windows.default_days`: default QA window for new features
- `qa_windows.features.{featureId}`: override per-feature

## When to run
- After creating a new feature file
- After editing any `Dependencies` field
- Before opening a PR that touches `docs/tasks/feature-*.md`

## Dogfooding AEI with AEI

- Template: `docs/process/dogfood-workflow-template.md`
- Use this to run one roadmap slice through Prompt Canvas with explicit agent roles, orchestrator rules, and DoD gates.

## UX Progression Loop (Stage-by-Stage Usability)

- Template: `docs/process/ux-progression-workflow-template.md`
- Run file template: `docs/templates/05-template-ux-progression-loop.md`
- Tracking log: `docs/tasks/ux-progression-log.md`

Use this loop when the goal is improving one user-journey stage (`A..G`) at a time with explicit baseline, hypothesis, validation, and promote/iterate/defer decision.

### Strict Compliance Mode (Required)

Every implementation slice across all features must follow strict dogfood compliance:

1. Execute blocks in order: `B1 -> B2 -> B3 -> B4 -> B5 -> B6 -> B7 -> B8`
2. Log explicit `B1..B8` entries in the feature task `Progress / Fixes / Updates` for the in-scope task.
3. Attach concrete evidence paths for verification/docs blocks:
   - `B5`: verification evidence (test/build output, workflow history, transcript, etc.)
   - `B7`: docs parity evidence and updated references
4. Run and pass docs parity before `B8`:
   - `npm run docs:parity`
5. Regenerate dogfood status when task/checklist state changes:
   - `node scripts/update-dogfood-status.mjs`

Hard gate: do not mark any task as done unless `B5` and `B7` are both explicitly recorded with evidence.
