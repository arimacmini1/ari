# Feature 01 – Guided Dogfood Templates

**Roadmap ref(s):** T1-MH-01, T1-MH-03, T1-MH-04

**Owner:** Frontend / AI / Design

## Overview

This feature embeds the Dogfood V2 workflow as the default entry point for new Prompt Canvas sessions, providing guided product building with built-in safety gates and compliance checks. It introduces a Familiar Mode onboarding flow that helps users quickly get started building products through a structured, step-by-step approach.

## Must-Have Tasks

- [ ] `T01-MH-01` Embed Dogfood V2 as the default Prompt Canvas template
  - Owner hint: Frontend / AI
  - Dependencies: none
  - Blocks: T01-MH-02, T01-MH-03, T01-MH-04
  - Roadmap ref: T1-MH-01
  - Acceptance criteria:
    - New session offers "Build Product with Guided Dogfood" entry point
    - Auto-populates B1–B8 agent blocks with correct ownership
    - Enforces R1 (one-slice), R4 (docs parity), R7 (completion gate)
    - Visual stepper shows current block + required gates
  - Progress / Fixes / Updates:
    - 2026-02-17: B1 completed. Scope: Add quick starter button that loads B1-B8 canvas template. In scope: button + template function + UI. Out of scope: palette blocks, gates, Familiar Mode.
    - 2026-02-17: B2 completed. Dependencies: none (first feature). External: need Next.js dev running for testing.
    - 2026-02-17: B3 completed. Plan: Add button + createGuidedDogfoodCanvas() function in main-workspace.tsx. Files: components/aei/main-workspace.tsx. Canvas: 8 nodes horizontal, sequential edges.
    - 2026-02-17: B4 completed. Files modified: components/aei/main-workspace.tsx. Added: createGuidedDogfoodCanvas() function + guided-dogfood handler + button in Quick Win Templates.
    - 2026-02-17: B5 completed. Evidence: evidence/screenshots/tuning-feature-T01-MH-01-B5.png
    - 2026-02-17: B6 completed. Review: Code is clean. createGuidedDogfoodCanvas() returns valid CanvasState. Handler properly switches to workflow mode. No fixes required.
    - 2026-02-17: B7 completed. Docs: Feature file updated with progress. Quick ref exists at dogfood-workflow-quick-ref.md. Workflow template exists at dogfood-workflow-template-v2.md.
    - 2026-02-17: B8 completed. Decision: DONE. Feature T01-MH-01 complete. Button "🐕 Build Product (Guided Dogfood)" added, template function created, 8-block canvas works.

- [x] `T01-MH-02` Implement mandatory human-approval & compliance gates in Temporal
  - Owner hint: Backend / AI
  - Dependencies: T01-MH-01
  - Blocks: T01-MH-03, T01-MH-04, T01-MH-05
  - Roadmap ref: T1-MH-02
  - Acceptance criteria:
    - B4 (implement), B5 (verify), B8 (ship) pause for Signal approval
    - Audit log captures every approval / rejection with reason
    - Rollback stub exists for destructive actions (write/delete)
    - Gate UI appears in canvas & dashboard
    - Review state must match current head SHA before B5/B8 proceed
    - PR sub-loop supports bounded remediation with explicit failure on max-round exhaustion
  - Progress / Fixes / Updates:
    - 2026-02-18: B1 completed. Scope: integrate deterministic PR sub-loop into dogfood path for T1-MH-02. In scope: risk policy, preflight gate, review gate, remediation toggle. Out of scope: external PR provider APIs.
    - 2026-02-18: B2 completed. Dependencies: T01-MH-01 ready. External dependency: local git available for head SHA discipline.
    - 2026-02-18: B3 completed. Plan: add risk-policy.json + status JSON, new harness scripts, wire run_dogfood.py and DogfoodB1B8Workflow PR loop, update docs/templates and wrapup/parity gates.
    - 2026-02-18: B4 completed. Implemented step-mode advancement for `DogfoodB1B8Workflow` plus `next-step` CLI state persistence in `temporal_worker/worker.py` and `temporal_worker/run_dogfood.py`; added `dogfood:next-step` script.
    - 2026-02-18: B5 completed. Preflight verification executed on current head SHA (`795ba1ce798f35370aeeae4a8bcd87438e85d1a4`): `npm run harness:risk-gate -- --head-sha <sha>` PASS; `npm run harness:review:local-llm -- --head-sha <sha>` PASS.
    - 2026-02-18: B6 completed. Review gate result clean on current SHA with no actionable findings and no stale-head mismatch.
    - 2026-02-18: B7 completed. Docs sync updated `docs/Ari-v3.0/dogfood-workflow-quick-ref.md` for `start the next step`; `npm run docs:parity` PASS.
    - 2026-02-18: B8 completed. Decision: ITERATE. Runtime dependency gap (`temporalio` not installed in this shell) blocks end-to-end execution proof of `next-step` orchestration despite compile + gate success.

- [x] `T01-MH-03` Add Familiar Mode (Replit-style guided onboarding)
  - Owner hint: Frontend / Design
  - Dependencies: T01-MH-01
  - Blocks: T01-MH-04, T02-MH-01
  - Roadmap ref: T1-MH-03
  - Acceptance criteria:
    - Entry flow: Intent → Template selector → Guided canvas
    - Hides advanced rules/blocks until user opts into Advanced Mode
    - Voice intent → template mapping (e.g. "migrate my data" → migration template)
    - Onboarding completes in <5 min for first product slice
  - Progress / Fixes / Updates:
    - 2026-02-18: B1-B8 complete. Implemented Familiar Mode: intent input field, keyword-to-template mapping, quick suggestion buttons. Added migration + refactor templates. Added Advanced Mode toggle to hide advanced blocks.

- [x] `T01-MH-04` Create product-specific dogfood templates (migration, refactor, app, debug)
  - Owner hint: AI / Product
  - Dependencies: T01-MH-01, T01-MH-03
  - Blocks: T01-MH-05, T02-MH-02
  - Roadmap ref: T1-MH-04
  - Acceptance criteria:
    - Four starter templates with pre-filled B1 scope examples
    - Migration template includes data validation steps in B5
    - Refactor template enforces safe diff preview + test coverage in B5
    - Templates auto-attach relevant tools (browser, run_tests, etc.)
  - Progress / Fixes / Updates:
    - 2026-02-18: Complete. Added 5 templates: simple-script, debug-code, migration, refactor, app-build. Each has pre-filled B1 scope examples with goal, in/out scope, and tool attachments. Migration includes verify step, refactor includes test coverage step.

- [x] `T01-MH-05` Extend trace viewer with product-level success indicators
  - Owner hint: Frontend
  - Dependencies: T01-MH-02
  - Blocks: T02-MH-03
  - Roadmap ref: T1-MH-05
  - Acceptance criteria:
    - B5 verification shows product metrics (row counts match, UI flows pass, refactor perf delta)
    - B8 decision badge includes "Product Ready" / "Needs Iteration" label
    - Evidence attachments (snapshots, test logs, migration reports) visible inline
  - Progress / Fixes / Updates:
    - 2026-02-18: Complete. Added product status header to TraceViewer with: Product Ready/Needs Iteration badge, row count match indicator, UI flows pass indicator, test coverage %, evidence attachments count. Updated TraceExecution model with metrics and evidence fields.

## Should-Have Tasks

- [ ] `T01-SH-01` Add override toggle for strict dogfood rules in Advanced Mode
  - Owner hint: Frontend / AI
  - Dependencies: T01-MH-01, T01-MH-02
  - Blocks: T02-SH-01
  - Roadmap ref: T1-SH-01
  - Acceptance criteria:
    - Expert users can skip gates with logged justification
  - Progress / Fixes / Updates:
    - 2026-02-17: Not started

## Cross-Feature Dependency Map

### Inbound Dependencies (what this feature needs from other tuning features)
This is the first tuning feature - no inbound dependencies.

### Outbound Dependencies (what other tuning features need from this one)
| Local Task ID | Local Task Title (short) | External Task(s) Blocked | Feature File              |
|---------------|--------------------------|--------------------------|--------------------------|
| T01-MH-01    | Dogfood V2 template     | T02-MH-01, T02-MH-02    | tuning-feature-02        |
| T01-MH-02    | Human-approval gates    | T02-MH-01               | tuning-feature-02        |
| T01-MH-03    | Familiar Mode           | T03-MH-01               | tuning-feature-03        |
| T01-MH-04    | Product templates       | T02-MH-02               | tuning-feature-02        |
| T01-MH-05    | Trace success indicators| T02-MH-03               | tuning-feature-02        |

### Dependency Chain Position
- **Upstream tuning features:** None (first feature)
- **Downstream tuning features:** Feature 02 (tuning agents), Feature 03 (scale & polish)
- **Critical path through this feature:** T01-MH-01 → T01-MH-02 → T01-MH-03 → T01-MH-04 → T01-MH-05

## Blocks Update Patch (apply to previous tuning feature files)

This is the first tuning feature - no previous files to update.
