# Feature 15 - Main Workspace Chat Adoption (Telemetry + Migration + Import UX)
**Priority:** 09 (Phase 2 adoption quality + conversion)
**Target completion:** weeks 18-20
**Why this feature now:** The main workspace chat is now the primary entry point, but we lack reliable adoption telemetry, migration guidance, and import quality controls needed to scale usage confidently.

## Definition of Done
When this lands, a real user can start in the main workspace chat, follow in-product migration guidance into full workspace usage, and complete a validated import flow with recovery. Product/ops can monitor adoption KPIs (usage split, time-to-first-output, completion rates) by project and identify where users drop off.

---

## Must-Have Tasks (vertical slice - instrument, observe, and guide)

- [x] `F15-MH-01` Implement main workspace chat telemetry event contract and ingestion pipeline
  - Owner: Backend / Analytics
  - Dependencies: `F11-MH-01`, `F11-MH-05`, `F06-MH-01`
  - Blocks: `F15-MH-02`, `F15-MH-03`
  - Roadmap ref: `P1-SH-07`
  - Acceptance criteria:
    - Define and version telemetry events for key chat actions (`session_started`, `assistant_response`, `draft_generated`, `expanded_to_canvas`, `tutorial_completed`, `import_attempted`, `import_failed`)
    - Events include `project_id`, `user_id`, `session_id`, and timestamp with schema validation at ingestion
    - Ingestion path rejects malformed events and logs structured validation errors
    - Event writes are idempotent per `event_id` to avoid duplicate KPI inflation
  - Effort: M
  - Gotchas / debug notes: Keep event names stable; schema drift will corrupt historical KPI comparisons.
  - Progress / Fixes / Updates:
    - 2026-02-13: Started telemetry ingestion vertical slice.
      - Added telemetry event schema + normalization (`lib/telemetry-events.ts`).
      - Added in-memory telemetry store with idempotent writes (`lib/telemetry-store.ts`).
      - Added ingestion API `POST /api/telemetry/events` with project context enforcement.
      - Wired main workspace chat to emit `session_started`, `assistant_response`, and `draft_generated` events.
      - Wired copilot actions to emit `expanded_to_canvas`, `tutorial_completed`, `import_attempted`, and `import_failed` events.
    - 2026-02-13: Completed and verified via `scripts/verify-feature-15.sh` (telemetry ingestion + event coverage checks pass).

- [x] `F15-MH-02` Build main workspace chat adoption KPI dashboard and trend widgets
  - Owner: Frontend / Analytics
  - Dependencies: `F15-MH-01`, `F06-MH-02`, `F14-MH-01`
  - Blocks: none
  - Roadmap ref: `P1-SH-07`
  - Acceptance criteria:
    - Dashboard shows usage split (main workspace chat vs full AEI), time-to-first-output, tutorial completion, and drop-off step distribution
    - Metrics are filterable by project and time window (day/week)
    - KPI cards clearly label estimated vs observed values
    - Dashboard refreshes without page reload and remains responsive under 30-day query window
  - Effort: M
  - Gotchas / debug notes: Avoid ambiguous denominators (session-based vs user-based rates must be explicit).
  - Progress / Fixes / Updates:
    - 2026-02-13: Started adoption KPI dashboard slice.
      - Added adoption KPI computation from telemetry events (`lib/telemetry-adoption.ts`).
      - Added API `GET /api/analytics/adoption/summary` scoped by active project.
      - Added adoption summary hook + dashboard cards (`hooks/use-adoption-summary.ts`, `components/analytics/adoption-dashboard.tsx`).
      - Added adoption KPI section with time window controls to analytics page (`app/analytics/page.tsx`).
    - 2026-02-13: Completed and verified via `scripts/verify-feature-15.sh` (adoption summary response shape passes).

- [x] `F15-MH-03` Add in-product migration helper tips and guided handoff into full workspace
  - Owner: Frontend / Product / Content
  - Dependencies: `F11-MH-01`, `F11-MH-05`, `F15-MH-01`
  - Blocks: none
  - Roadmap ref: `P1-SH-08`
  - Acceptance criteria:
    - Contextual tips map main chat concepts to AEI features (chat -> canvas, preview -> simulator, run -> orchestrator)
    - Users can dismiss tips permanently per user/project
    - Tips include direct actions to open relevant workspace views without losing current chat context
    - Tip interactions (shown/dismissed/clicked) emit telemetry events
  - Effort: S
  - Gotchas / debug notes: Tips must be assistive, not blocking; never trap users in modal walkthrough loops.
  - Progress / Fixes / Updates:
    - 2026-02-13: Started migration tips in main workspace console tab.
      - Added per-project dismissible tips with deep-link actions to Canvas/Orchestrator/Analytics.
      - Added telemetry events `migration_tip_shown`, `migration_tip_clicked`, `migration_tip_dismissed`.
    - 2026-02-13: Completed and verified via `scripts/verify-feature-15.sh` (tip telemetry events pass).

- [x] `F15-MH-04` Polish Replit import UX with validation preview and error recovery flow
  - Owner: Full-stack
  - Dependencies: `F11-MH-03`, `F01-MH-04`
  - Blocks: none
  - Roadmap ref: `P1-SH-09`
  - Acceptance criteria:
    - Import flow validates payload before execution and shows clear preflight results
    - Unsupported formats return actionable error states with retry path that preserves user input
    - Import summary includes detected project metadata and generated canvas block count
    - Import outcomes (success/failure/retry) are tracked in telemetry for quality reporting
  - Effort: M
  - Gotchas / debug notes: Preserve user input across retries; avoid requiring users to re-paste large exports.
  - Progress / Fixes / Updates:
    - 2026-02-13: Started import UX preflight + retry flow.
      - Added import preflight response to `/api/familiar/import` and validation errors.
      - Added import dialog with preflight preview and retry-safe input persistence.
    - 2026-02-13: Completed and verified via `scripts/verify-feature-15.sh` (preflight fail/success + import execute checks pass).

## Required Spikes / Decisions (do these first or in parallel)

- Decision: Canonical conversion funnel steps and exact KPI definitions (session vs user basis)
- Spike: Event ingestion storage strategy (reuse analytics tables vs dedicated events table)
- Decision: Tip rendering pattern (inline cards vs toast + side panel)
- Experiment: Import preflight validator quality on 20+ sample project exports

## Dogfooding Checklist (must be runnable by end of Must-Have)

- [x] Run main workspace chat sessions across two projects and verify KPI isolation by `project_id`
- [x] Confirm usage split and time-to-first-output KPIs populate from live events
- [x] Complete migration helper flow and verify dismiss/restore behavior
- [x] Run import with valid and invalid payloads; confirm retry path preserves input
- [x] Validate telemetry coverage for key user actions and import outcomes

## Cross-Feature Dependency Map

### Inbound Dependencies (what this feature needs from other features)
| External Task ID | External Task Title (short) | Local Task(s) Blocked | Status |
|-----------------|-----------------------------|-----------------------|--------|
| `F11-MH-01` | Main workspace chat entry flow (formerly Familiar Mode) | `F15-MH-01`, `F15-MH-03` | pending / done |
| `F11-MH-03` | Replit import baseline | `F15-MH-04` | pending / done |
| `F11-MH-05` | Tutorial + onboarding baseline | `F15-MH-01`, `F15-MH-03` | pending / done |
| `F06-MH-01` | KPI schema pipeline | `F15-MH-01` | pending / done |
| `F06-MH-02` | KPI dashboard components | `F15-MH-02` | pending / done |
| `F14-MH-01` | Project context model | `F15-MH-02` | pending / done |
| `F01-MH-04` | Canvas parser contract | `F15-MH-04` | pending / done |

### Outbound Dependencies (what other features need from this one)
| Local Task ID | Local Task Title (short) | External Task(s) Blocked | Feature File |
|--------------|---------------------------|--------------------------|-------------|
| `F15-MH-01` | Chat telemetry contract | `P3-SH-02` (predictive quality/cost analytics) | future feature files |
| `F15-MH-02` | Adoption KPI dashboard | future GTM/adoption reporting tasks | future feature files |

### Dependency Chain Position
- **Upstream features:** feature-01 (parser), feature-06 (analytics), feature-11 (main workspace chat), feature-14 (project scope)
- **Downstream features:** advanced product analytics, onboarding optimization, conversion/regression monitoring
- **Critical path through this feature:** `F15-MH-01` -> `F15-MH-02` -> `F15-MH-03` + `F15-MH-04`

## Blocks Update Patch (apply to previous feature files)

The following tasks in previously generated feature files need their `Blocks` field
updated to include references to tasks in THIS file.

| File | Task ID | Add to Blocks field |
|------|---------|---------------------|
| feature-11-familiar-mode-onboarding.md | `F11-MH-01` | `F15-MH-01`, `F15-MH-03` |
| feature-11-familiar-mode-onboarding.md | `F11-MH-03` | `F15-MH-04` |
| feature-11-familiar-mode-onboarding.md | `F11-MH-05` | `F15-MH-01`, `F15-MH-03` |
| feature-06-analytics-pane.md | `F06-MH-01` | `F15-MH-01` |
| feature-06-analytics-pane.md | `F06-MH-02` | `F15-MH-02` |
| feature-14-projects-workspaces.md | `F14-MH-01` | `F15-MH-02` |
