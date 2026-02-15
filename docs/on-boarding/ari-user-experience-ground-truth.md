# Ari User Experience Ground Truth

**Purpose:** Canonical reference for Ari's onboarding and day-to-day user workflow.
**Scope:** User flow, UX principles, documentation standards, onboarding file remediation plan, and code workspace integration.
**Status:** Active baseline
**Last updated:** 2026-02-15

## 1. Product UX North Star

Ari should feel like a guided build system, not a loose collection of feature tabs.

A successful user session means the user can:
1. State intent.
2. Convert intent into a structured workflow.
3. Simulate outcomes before committing.
4. Execute with confidence.
5. Inspect trace/results.
6. Iterate quickly and safely.

## 2. Ari Core User Journey (End-to-End)

### Stage A: Define Intent
- Entry points: main workspace chat, Familiar Mode, imported project context.
- User outcome: clear goal statement and acceptance criteria.
- Ari output: draft plan/canvas suggestion.

### Stage B: Shape Workflow in Prompt Canvas
- User creates or edits blocks, dependencies, and properties.
- Ari validates structure and surfaces obvious issues early.
- User outcome: an executable instruction graph.

### Stage C: Configure Execution in Orchestrator Hub
- User selects/creates rule set and constraints.
- User outcome: explicit execution policy (priority, cost, agent mix, constraints).

### Stage D: Simulate and Inspect Artifacts
- User runs simulation before execution.
- User reviews Gate Status (✓ Ready/⚠ Warnings/✗ Blocked) to understand simulation readiness.
- User checks cost vs budget with status badges (well within/approaching/exceeded).
- User sees duration estimates with plain-language context (typical/higher/lower for N tasks).
- User evaluates success probability with confidence labels (High/Medium/Low confidence).
- User receives actionable guidance when metrics fall outside acceptable ranges.
- User outcome: clear understanding of whether simulation results are acceptable, with confidence to proceed or iterate.

### Stage E: Execute and Monitor
- User approves and runs workflow.
- User monitors execution status, failures, and retries.
- User outcome: completed run with recorded history.

### Stage F: Trace, Review, and Improve
- User inspects trace tree, confidence, and path decisions.
- User compares runs, identifies regressions, and forks when needed.
- User outcome: actionable insight for the next iteration.

### Stage G: Operational Workflows
- Templates for product development, debugging, migrations, and compliance.
- User outcome: repeatable process rather than one-off heroics.

## 3. First 10 Minutes (Canonical Onboarding Path)

1. Open main workspace and state the goal in chat.
2. Send goal to Prompt Canvas and verify graph structure.
3. Open Orchestrator Hub and select/create a rule.
4. Run simulation and review assignment + budget/time.
5. Inspect Output Simulator artifacts (code/html/json/etc.).
6. Execute workflow.
7. Open Trace Viewer and inspect top decision nodes.
8. Capture one improvement and rerun.

If this path cannot be completed without reading engineering/debug steps, UX is failing.

## 4. UX Design Principles for Ari Onboarding

### User-Friendliness
- Every guide starts with a user outcome, not implementation details.
- Every action has a visible expected result.
- Avoid requiring DevTools/console for basic success path.

### Innovation
- Keep Ari's differentiator explicit: chat -> canvas -> orchestrator -> simulator -> trace loop.
- Highlight why Ari is better than ad hoc prompting: structured control, repeatability, observability.

### Systematic + Repeatable
- Standard lifecycle language across docs: define, compose, simulate, execute, review, iterate.
- Shared templates for common workflows (build, debug, migration, compliance).

### Understandability
- Keep one user story per section.
- Separate user operations from engineering runbooks.
- Mark mock/simulated behavior clearly and consistently.

## 5. Documentation Contract (Required for Onboarding Docs)

Every `docs/on-boarding/feature-XX-onboarding.md` should follow this split:

1. `User Guide` (default path)
- Who this is for.
- 5-10 minute quick start.
- Expected outcomes and limitations.
- Common use cases.

2. `Operator Checklist` (repeatable validation)
- Manual checklist for release/dogfood verification.
- Evidence expectations.

3. `Engineering Runbook` (non-default)
- Debugging, API calls, local scripts, continuation instructions.
- Explicitly labeled: "For maintainers, not first-time users."

Rule: do not mix runbook tasks into the primary quick-start path.

## 6. Current Onboarding Audit (2026-02-15)

### High-Risk UX Friction
- `docs/on-boarding/feature-04-onboarding.md`: user quick start is mixed with continuation/debug implementation tasks; should be split into user guide + engineering runbook.
- `docs/on-boarding/feature-00.5-onboarding.md`: first-run flow depends on DevTools logs; should be optional diagnostics, not core onboarding.
- `docs/on-boarding/feature-00-onboarding.md` and `docs/on-boarding/feature-12-onboarding.md`: placeholder troubleshooting (`Issue: [describe]`) indicates incomplete onboarding quality.
- `docs/on-boarding/feature-05-onboarding.md`: approachable but missing testing/debug/reference sections used by other guides.

### Structural Inconsistency Signals
- Some files are in-progress but presented as complete user docs (`feature-11`, `feature-14`, `feature-16`).
- API-heavy guides exist without clear user/operator boundary (notably `feature-04`, `feature-07-audit-logs-usage`, `feature-09`, `feature-14`).
- Cross-feature "start here" path is missing at folder level.

## 7. Per-File Remediation Backlog

### Priority P0 (Fix now)
- `docs/on-boarding/feature-04-onboarding.md`
  - Split into `User Guide` + `Engineering Runbook` sections.
  - Remove bug-fix continuation steps from user quick start.
  - Add clear note of current deterministic/mock boundaries.
- `docs/on-boarding/feature-00.5-onboarding.md`
  - Keep quick start user-facing.
  - Move log-based diagnostics into runbook.
- `docs/on-boarding/README.md` (new)
  - Add "Start here" product-level journey across features.

### Priority P1
- `docs/on-boarding/feature-00-onboarding.md`
- `docs/on-boarding/feature-12-onboarding.md`
  - Replace placeholders, complete troubleshooting and expected outcomes.
- `docs/on-boarding/feature-05-onboarding.md`
  - Add testing checklist + known limitations + links to related feature workflow.

### Priority P2
- Normalize in-progress docs (`feature-11`, `feature-14`, `feature-16`) with explicit "what works today" vs "pending" sections.
- Add consistent "mock vs production behavior" block to all affected guides.

## 8. Product Adjustments to Consider (Pros / Cons)

### Option A: Keep current feature tabs, improve guidance only
Pros:
- Lowest engineering cost.
- Fastest UX gain via docs + in-app tooltips.
Cons:
- Structural complexity remains in UI.
- Users still rely on understanding tab order.

### Option B: Add in-app guided "Workflow Mode" (recommended)
Pros:
- Enforces canonical path: Intent -> Canvas -> Orchestrator -> Simulator -> Execute -> Trace.
- Better onboarding conversion and consistency.
- Easier to teach and support.
Cons:
- Requires product/UI work and maintenance.
- Must handle advanced users who want direct tab access.

### Option C: Merge surfaces into a single progressive workspace
Pros:
- Strongest usability and context retention.
- Minimal mode-switching and reduced cognitive load.
Cons:
- Highest implementation effort.
- Higher risk of regression during migration.

## 9. Recommended Path to "Usable" (Execution Plan)

This is the prioritized delivery plan to make the canonical journey guided and reliable, not just documented.

### Phase 1: Immediate quick wins (low-to-medium engineering effort, 1-2 weeks)

1. Workflow Mode entry point (Option B baseline)
- Add one primary CTA: `Start Building` / `New Workflow`.
- Open a progressive workspace with ordered stages:
  - intent/chat
  - canvas composition
  - orchestrator configuration
  - simulation preview
  - execute
  - trace review
- Default new users into this mode.
- Keep raw tabs available behind `Advanced Mode`.

2. P0 onboarding docs cleanup
- Split mixed guides into:
  - user guide
  - operator checklist
  - engineering runbook
- Apply first to:
  - `docs/on-boarding/feature-04-onboarding.md`
  - `docs/on-boarding/feature-00.5-onboarding.md`
- Add explicit banners where behavior is mocked/deterministic and describe expected differences from production behavior.

3. Product-level onboarding entry
- Create and maintain `docs/on-boarding/README.md` as the single \"Start Here\" doc.
- Include canonical journey diagram and links to stage-specific guides.

4. In-app first-session scaffolding
- Add a first-login guided checklist overlay aligned to Section 3.
- Add quick-win starter templates:
  - build a simple script
  - debug a failing function
- Add explicit success/failure states and one-click \"Explain failure\" -> trace.

### Phase 2: Medium-term redesign (3-6 weeks)

1. Single progressive workspace (Option C lite)
- Merge canvas, orchestrator, and simulator into one dynamic workspace with contextual side panels.
- Reduce hard context switching between top-level tabs.

2. Stronger simulation gate
- Require simulation before execute.
- Show budget/time/confidence and clearly label reversible vs risky actions.

3. Better trace UX
- Show top decisions summary first.
- Keep deep tree collapsible.
- Add side-by-side fork/compare affordance.

4. Guardrails and control loop
- Visible pause/resume controls.
- Human-approval signal visibility.
- Undo/revert where feasible.

### UX Success Metrics (to validate this plan)

- Time-to-first-successful-workflow.
- % of sessions completing chat -> canvas -> simulation -> execute -> trace.
- Drop-off by stage.
- Re-run/iteration rate after first trace review.
- # of support/debug interventions needed for first-time users.

## 10. Repeatable Templates to Build Next

1. Product development template
- Goal definition, canvas composition, simulation gate, execution gate, trace review.

2. Debug template
- Repro, trace capture, fork/compare, fix verification, regression checklist.

3. Migration template
- Scope, mapping rules, dry-run simulation, checkpointed execution, validation/rollback.

4. Compliance template
- Audit log query/export, evidence capture, approval checkpoints, archival.

Implemented templates/process:
- UX progression loop process: `docs/process/ux-progression-workflow-template.md`
- UX progression run template: `docs/templates/05-template-ux-progression-loop.md`
- Workflow Mode UI contract: `docs/on-boarding/ui-workflow-mode-spec.md`
- UX progression log: `docs/tasks/ux-progression-log.md`
- Sample run: `docs/tasks/ux-progression-runs/2026-02-15-ux-a-intent-clarity.md`

## 11. Code Workspace Integration (GitHub Import + Local code-server)

To make Ari usable for real bug-fix and product workflows, users must be able to bring full repository context into the same guided loop.

Baseline decision:
- Use local `code-server` integration as the primary code editing surface in Ari.
- Treat this as a first-class Workflow Mode capability, not a side utility.

Required user outcomes:
1. Import a repository from GitHub into Ari workspace context.
2. Browse/edit files in embedded code workspace.
3. Pass edited project context into Canvas/Orchestrator/Simulation without manual copy-paste loops.
4. Execute and review trace against that same repository context.

UX contract:
- Stage A includes explicit `Project Context` (template-only or imported repo).
- Embedded editor launch is available in one click from Workflow Mode.
- Repo status is visible (`queued | indexing | ready | error`) with recovery guidance.
- If code workspace is unavailable, Ari shows a clear fallback path and limitations.

Operational constraints:
- Authentication and repository access must be explicit and auditable.
- Mock vs production behavior for repo import/indexing must be labeled in UI and docs.
- First 10 minutes remains completable with starter templates if repo import is skipped.

Docs that must stay aligned:
- `docs/on-boarding/README.md`
- `docs/on-boarding/ui-workflow-mode-spec.md`
- `docs/process/ux-progression-workflow-template.md`

## 12. Governance for This File

This file is the onboarding source of truth.

Update process:
1. Any onboarding/doc/process change that affects user workflow updates this file first.
2. Feature onboarding docs must align with this contract.
3. Roadmap/task status and onboarding claims should be reconciled in the same update cycle.

Change log:
- 2026-02-15: Initial baseline created from full `docs/on-boarding` audit.
- 2026-02-15: Added prioritized \"Recommended Path to Usable\" execution plan.
- 2026-02-15: UX progression slices `UX-A-01` and `UX-B-01` executed and promoted via `U1-U8`.
- 2026-02-15: UX progression slice `UX-C-01` executed and promoted via `U1-U8`.
- 2026-02-15: UX progression slice `UX-G-01` executed and promoted with in-app checklist + quick-win templates.
- 2026-02-15: Added code workspace integration baseline (`GitHub import + local code-server`) to canonical UX contract.
- 2026-02-15: UX progression slice `UX-D-01` executed and promoted via `U1-U8`. Stage D now includes simulation result comprehension with Gate Status, cost/duration/confidence interpretation, and actionable guidance.

## 13. File-by-File UX Classification

Use this table to track each onboarding file against the documentation contract.

| File | Current State | Primary Gap | Next Action |
|---|---|---|---|
| `docs/on-boarding/feature-00-onboarding.md` | Draft template | Placeholder content and generic troubleshooting | Replace with real quick start, outcomes, and issues |
| `docs/on-boarding/feature-00.5-onboarding.md` | Detailed but mixed | Core path depends on DevTools/console | Move diagnostics to runbook section |
| `docs/on-boarding/feature-01-onboarding.md` | Strong coverage | Heavy technical detail in onboarding path | Keep quick start short; move deep API to runbook |
| `docs/on-boarding/feature-02-onboarding.md` | Strong coverage | Mock behavior not separated from production expectations | Add explicit mock vs production block |
| `docs/on-boarding/feature-03-onboarding.md` | Strong workflow guide | Mostly operator-centric for early users | Add clearer first-time user path |
| `docs/on-boarding/feature-04-onboarding.md` | High-friction mixed doc | User guide mixed with continuation/debug implementation tasks | Split into user guide + engineering runbook (P0) |
| `docs/on-boarding/feature-05-onboarding.md` | User-friendly narrative | Missing testing/checklist/troubleshooting standards | Expand to contract structure |
| `docs/on-boarding/feature-06-onboarding.md` | Detailed coverage | Mock analytics behavior can be misread as live | Add explicit readiness banner |
| `docs/on-boarding/feature-07-onboarding.md` | Good concise guide | Needs tighter cross-link to audit-logs usage doc | Add \"when to use which doc\" note |
| `docs/on-boarding/feature-07-audit-logs-usage.md` | API/operator guide | Not clearly separated from onboarding intent | Label as operator runbook |
| `docs/on-boarding/feature-08-onboarding.md` | Good concise guide | Limited product-level context | Add where it sits in end-to-end flow |
| `docs/on-boarding/feature-09-onboarding.md` | API-heavy | First-time user path buried by API detail | Add user quick path before endpoint details |
| `docs/on-boarding/feature-10-onboarding.md` | Good concise guide | Voice fallback constraints could be clearer | Add support matrix (browser/device) |
| `docs/on-boarding/feature-11-onboarding.md` | In progress | In-progress status mixed with onboarding expectations | Add \"what works now\" + \"pending\" split |
| `docs/on-boarding/feature-12-onboarding.md` | Draft template | Placeholder content and generic troubleshooting | Replace with real user and operator sections |
| `docs/on-boarding/feature-13-onboarding.md` | Well structured | Mock/scoped behavior caveats can be clearer | Add explicit boundaries and expected delays |
| `docs/on-boarding/feature-14-onboarding.md` | In progress, API-heavy | User flow overshadowed by API validation scripts | Split user flow from API runbook |
| `docs/on-boarding/feature-15-onboarding.md` | Good concise guide | Could better map to canonical Ari journey | Add stage mapping references |
| `docs/on-boarding/feature-16-onboarding.md` | In progress | Scope and completion level not obvious to new users | Add stable vs experimental behavior summary |
