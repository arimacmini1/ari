# Ari Workflow Mode UI Spec

Purpose: Define the UI contract for the guided end-to-end user journey.

Source contracts:
- `docs/on-boarding/ari-user-experience-ground-truth.md`
- `docs/process/ux-progression-workflow-template.md`

## 1. Layout Contract

Workflow Mode is one progressive workspace with ordered stages.

Top-level structure:
- Header: project/workspace context + mode switch
- Left rail: stage navigator (`A..G`)
- Center: active stage workspace
- Right rail: context panel (validation, constraints, status)
- Bottom drawer: execution/trace feedback

Project context contract:
- Header includes `Project Context` selector:
  - `Starter Template`
  - `Imported Repository`
- For imported repository mode, show status badge:
  - `queued | indexing | ready | error`
- `Open Code Workspace` launches embedded local `code-server` editor in context.

Mode switch:
- `Workflow Mode` (default for new users)
- `Advanced Mode` (direct tab access)

## 2. Stage-by-Stage UI Behavior

### Stage A - Intent
- Primary action: submit goal in chat.
- Required output: goal + acceptance criteria summary.
- Exit condition: user confirms scope summary.

Stage A repository behavior:
- User can continue with `Starter Template` or attach `Imported Repository`.
- If repository mode is selected, Stage A is not `ready` until repo status is `ready`.
- `Continue to Canvas` stays disabled when status is `queued | indexing | error`.
- Block reason includes one best next action (retry import, switch template mode, or view diagnostics).

### Stage B - Prompt Canvas
- Primary action: create/edit workflow blocks.
- Required output: valid instruction graph.
- Exit condition: graph validation passes.

Stage B validation UI contract:
- Right rail shows a persistent `Graph Validation` card with:
  - status badge: `valid | warning | invalid`
  - node count, edge count, disconnected-node count
  - list of top blocking issues (max 5 visible, expandable)
  - one-click jump to first invalid node/edge
- Stage navigator marks B as:
  - `in_progress` while editing
  - `blocked` if invalid
  - `ready` when valid
- Primary CTA behavior:
  - `Continue to Orchestrator` disabled when status is `invalid`
  - hover/inline message explains exact unblock action
- Validation errors must be plain-language and actionable:
  - what failed
  - where it failed
  - next corrective action

### Stage C - Orchestrator
- Primary action: choose/create rule set and constraints.
- Required output: explicit execution policy.
- Exit condition: policy saved for current run.

Stage C confidence UI contract:
- Show a persistent `Rule Confidence` card in right rail with:
  - selected rule name and last updated timestamp
  - confidence badge: `high | medium | low`
  - rationale bullets (max 3): why this rule fits current graph
  - risk flags: cost-risk, latency-risk, capacity-risk
- Provide side-by-side `Rule Compare` for top 2 candidate rules:
  - estimated cost delta
  - estimated duration delta
  - assignment stability score
- `Continue to Simulation` behavior:
  - disabled when no rule is selected
  - enabled when a rule is selected and constraints are valid
  - inline explanation when blocked
- Add `Why this rule?` action:
  - opens plain-language explanation derived from graph + constraints
  - includes one-click `Try safer rule` fallback

### Stage D - Simulation
- Primary action: run simulation.
- Required output: assignment plan + cost/time + artifacts.
- Exit condition: simulation completed and reviewed.

Stage D comprehension UI contract:
- Show a persistent `Simulation Results` card with interpretive status, not just raw numbers.
- Display metrics with contextual meaning:
  - **Cost**: Show as `$X / $Y budget` with status badge (`✓ Well within budget` | `⚠ Approaching limit` | `✗ Over budget`)
    - ✓ Well within budget: cost ≤ 70% of max_cost_budget
    - ⚠ Approaching limit: cost > 70% and ≤ 100% of max_cost_budget
    - ✗ Over budget: cost > 100% of max_cost_budget
  - **Duration**: Show estimated completion time with plain-language context (`~X min | Typical for N tasks` or `~X min | Higher than typical`)
  - **Success Probability**: Show percentage with confidence level label:
    - High confidence: ≥ 85%
    - Medium confidence: 70-84%
    - Low confidence: < 70%
- Add `Gate Status` card showing overall simulation readiness:
  - `✓ Ready to Execute`: all gates pass
  - `⚠ Review Warnings`: some warnings but execution allowed
  - `✗ Blocked`: critical failures prevent execution
  - List gate checks with pass/fail status:
    - Cost check: within/approaching/exceeded budget
    - Success probability check: above/below acceptable threshold (80%)
    - Optional duration check: within/exceeded target if user-defined
- Provide actionable guidance for each warning/failure:
  - Cost warning: "Consider reducing max agents or simplifying workflow"
  - Duration warning: "Critical path has N sequential tasks. Parallel execution may help."
  - Low confidence: "Review task complexity or add fallback steps"
- `Continue to Execute` behavior:
  - disabled when gate status is `✗ Blocked`
  - enabled with confirmation prompt when `⚠ Review Warnings`
  - enabled without prompt when `✓ Ready to Execute`
  - hover/inline message explains current gate status

### Stage E - Execute
- Primary action: execute approved plan.
- Required output: execution id + status stream.
- Exit condition: run started successfully.

Stage E execution gate UI contract:
- Show pre-execution confirmation dialog before starting execution.
- Display execution summary with clear consequence messaging:
  - **Risk Indicator**: Badge showing risk level based on Stage D gate status
    - Low risk (green): previous gate status was ✓ Ready to Execute
    - Medium risk (amber): previous gate status was ⚠ Review Warnings
    - High risk should not occur (✗ Blocked prevents reaching execute)
  - **Resource Summary**: Cost estimate, duration estimate, success probability
  - **Consequences**: "This will start workflow execution and consume resources. Execution cannot be undone once started."
- Provide escape hatch: "Review Simulation" returns user to Stage D
- Require explicit confirmation: "Start Execution" button to proceed
- For medium-risk executions (warnings), require acknowledgment checkbox: "I understand the warnings and want to proceed"
- Show mock execution behavior banner when applicable
- After confirmation, provide brief inline status before dispatching
- Display execution ID and agent count in success feedback

### Stage F - Trace
- Primary action: review top decisions and confidence.
- Required output: at least one actionable insight.
- Exit condition: insight captured (fork/compare optional).

### Stage G - Operational
- Primary action: pick template (build/debug/migration/compliance).
- Required output: reusable runbook/checklist for next iteration.
- Exit condition: template selected/applied.

## 3. Guardrails

- Simulation is required before Execute.
- Execute button remains disabled until Stage D exit condition passes.
- High-risk actions show explicit confirmation.
- Mock/deterministic behavior must display a visible banner.
- Repository-linked runs must surface source repo/branch/commit in execution metadata.

## 4. First-Session Guidance

- Show checklist overlay/panel on first run.
- Checklist mirrors canonical first 10 minutes.
- Each stage shows success/failure states and next best action.
- Provide one-click `Explain failure` linking to trace or diagnostics.
- Include quick-win template actions:
  - Build a simple script
  - Debug my code
- Checklist progress and visibility state should persist across reloads.

## 5. Success and Failure States

Each stage must define:
- Success signal (what the user sees when done)
- Failure signal (clear error state)
- Recovery action (single best next step)

### Stage B explicit states (required)

Success signal:
- `Graph Validation` badge shows `valid`.
- `Continue to Orchestrator` is enabled.
- Stage B marker in left rail switches to `ready`.

Failure signal:
- `Graph Validation` badge shows `invalid`.
- Blocking issue list is visible and non-empty.
- `Continue to Orchestrator` remains disabled.

Recovery action:
- User clicks `Jump to issue` from validation card.
- UI focuses invalid block/edge and highlights required edit.
- Re-validation runs immediately after change.

### Stage C explicit states (required)

Success signal:
- `Rule Confidence` card shows selected rule with `high` or `medium`.
- `Continue to Simulation` is enabled.
- Stage C marker in left rail switches to `ready`.

Failure signal:
- No selected rule, or confidence is `low` with unresolved risk flags.
- `Continue to Simulation` remains disabled.
- Block reason text is visible.

Recovery action:
- User opens `Why this rule?` and applies suggested corrective action.
- User switches rule or adjusts constraints.
- Confidence/risk indicators refresh immediately.

### Stage D explicit states (required)

Success signal:
- `Gate Status` card shows `✓ Ready to Execute`.
- All metric status badges show ✓ or acceptable ⚠.
- `Execute Plan` button is enabled.
- Stage D marker in left rail switches to `ready`.

Warning signal:
- `Gate Status` card shows `⚠ Review Warnings`.
- One or more metrics show ⚠ (approaching limits but not blocked).
- Warning guidance is visible with actionable next steps.
- `Execute Plan` button is enabled with confirmation prompt on click.

Failure signal:
- `Gate Status` card shows `✗ Blocked`.
- One or more metrics show ✗ (exceeded hard limits).
- Blocking issue list is visible and non-empty.
- `Execute Plan` button remains disabled.

Recovery action:
- User reviews warning/failure guidance in Gate Status card.
- User adjusts constraints (cost budget, max agents) and re-runs simulation.
- User returns to Stage B to simplify workflow graph if needed.
- User proceeds with warnings if acceptable after review.

## 6. Metrics Instrumentation

Track at minimum:
- time-to-first-successful-workflow
- completion rate per stage
- stage-to-stage drop-off
- rerun rate after trace review
- repository import success rate
- time from import start to `ready`
- percent of runs executed with linked repository context

## 7. Open Implementation Questions

- Which existing tabs become hidden in Workflow Mode by default?
- Should Stage F open inline or modal by default?
- Which starter templates ship in v1 (build/debug only or all four)?

## 8. Stage A Implementation Packet (UX-A-02 Repository Context)

This section defines implementation-ready copy and behavior for the first repository-context slice.

### 8.1 Primary UI Copy

Stage A title:
- `Define Intent and Project Context`

Project context selector label:
- `Project Context`

Selector options:
- `Starter Template (fastest)`
- `Import from GitHub`

Repository input labels:
- `Repository URL`
- `Branch (optional)`

Primary actions:
- `Import Repository`
- `Open Code Workspace`
- `Continue to Canvas`

Status messages:
- `Queued: import request received.`
- `Indexing: preparing files for Ari context.`
- `Ready: repository context is available.`
- `Import failed: check URL/auth and retry.`

Blocking help text:
- `Continue to Canvas is disabled until repository status is Ready.`

Fallback help text:
- `Need to proceed now? Switch to Starter Template and continue without repository import.`

### 8.2 Interaction Rules

- If `Starter Template` is selected:
  - `Continue to Canvas` is enabled when goal + acceptance criteria summary is present.
- If `Import from GitHub` is selected:
  - `Continue to Canvas` remains disabled until import status is `ready`.
  - `Open Code Workspace` remains disabled until import status is `ready`.
  - On `error`, show recovery actions:
    - `Retry Import`
    - `View Diagnostics`
    - `Switch to Starter Template`
- After status becomes `ready`:
  - auto-enable `Open Code Workspace`
  - show repository badge: `<owner/repo>@<branch>`
  - preserve goal text and acceptance criteria state

### 8.3 Acceptance Checklist (U6)

- [ ] New user can complete Stage A with `Starter Template` and reach Stage B in under 2 minutes.
- [ ] New user can import a GitHub repository and see state transitions `queued -> indexing -> ready`.
- [ ] `Continue to Canvas` behavior matches selected mode and status rules.
- [ ] User can open `code-server` and return to Workflow Mode without losing Stage A inputs.
- [ ] Execution metadata contains repo/branch/commit for repo-linked runs.
- [ ] Import error path is actionable (invalid URL/auth/network) with visible recovery actions (`Retry Import`, `View Diagnostics`, `Switch to Starter Template`).
- [ ] Stage A remains usable on smaller screens without hiding critical actions.

### 8.5 Workspace Target Strategy

Short-term default:
- `Open Code Workspace` targets in-app `Code Explorer`.

Feature-flag transition path:
- If `NEXT_PUBLIC_USE_CODE_SERVER=true` and `NEXT_PUBLIC_CODE_SERVER_URL` is set:
  - `Open Code Workspace` launches `code-server`.
  - Ari passes `repo` and `branch` query params when available.
- If flag/env is missing, fallback remains `Code Explorer`.

### 8.4 Telemetry Events (Minimum)

- `workflow.stage_a.context_mode_selected`
- `workflow.stage_a.repo_import_started`
- `workflow.stage_a.repo_import_status_changed`
- `workflow.stage_a.repo_import_failed`
- `workflow.stage_a.open_code_workspace_clicked`
- `workflow.stage_a.continue_clicked`

## 9. Stage D Implementation Packet (UX-D-01 Simulation Result Comprehension)

This section defines implementation-ready copy and behavior for simulation result comprehension.

### 9.1 Primary UI Copy

Stage D title:
- `Simulate and Review Results`

Metrics card labels:
- `Simulation Results`
- `Gate Status`

Cost status badges:
- `✓ Well within budget` (cost ≤ 70% of max_cost_budget)
- `⚠ Approaching limit` (cost > 70% and ≤ 100%)
- `✗ Over budget` (cost > 100%)

Duration context labels:
- `~X min | Typical for N tasks`
- `~X min | Higher than typical`
- `~X min | Lower than typical`

Success probability labels:
- `High confidence` (≥ 85%)
- `Medium confidence` (70-84%)
- `Low confidence` (< 70%)

Gate status badges:
- `✓ Ready to Execute` (all checks pass)
- `⚠ Review Warnings` (warnings present but execution allowed)
- `✗ Blocked` (critical failures prevent execution)

Gate check labels:
- `✓ Cost within budget ($X / $Y)`
- `⚠ Cost approaching limit ($X / $Y)`
- `✗ Cost exceeds budget ($X / $Y)`
- `✓ Success probability acceptable (X% ≥ 80%)`
- `⚠ Success probability marginal (X% ≥ 70% but < 80%)`
- `✗ Success probability too low (X% < 70%)`

Primary actions:
- `Run Simulation`
- `Execute Plan`
- `Adjust Constraints`

Guidance messages:
- Cost warning: `Consider reducing max agents or simplifying workflow`
- Duration warning: `Critical path has N sequential tasks. Parallel execution may reduce duration.`
- Low confidence warning: `Review task complexity or add fallback steps`
- Budget exceeded: `Increase cost budget or simplify workflow to proceed`
- Low probability blocked: `Success probability too low. Review workflow structure.`

### 9.2 Interaction Rules

- After simulation completes:
  - Show `Simulation Results` card with all metrics and status badges
  - Show `Gate Status` card with overall status and individual gate checks
  - Enable/disable `Execute Plan` based on gate status
- Gate status logic:
  - `✓ Ready to Execute`: cost ≤ 100% budget AND success_probability ≥ 80%
  - `⚠ Review Warnings`: (cost > 70% AND ≤ 100%) OR (success_probability ≥ 70% AND < 80%)
  - `✗ Blocked`: cost > 100% budget OR success_probability < 70%
- Execute button behavior:
  - `✓ Ready to Execute`: button enabled, click proceeds directly to execution
  - `⚠ Review Warnings`: button enabled, click shows confirmation dialog with warning summary
  - `✗ Blocked`: button disabled, hover shows blocking reason and recovery action
- Constraint adjustment flow:
  - User adjusts constraints (max agents, cost budget)
  - User clicks `Run Simulation` again
  - Results update with new status badges and gate checks

### 9.3 Acceptance Checklist (U6)

- [ ] Simulation results show cost as `$X / $Y budget` with status badge (✓/⚠/✗)
- [ ] Duration shows plain-language context (typical/higher/lower for N tasks)
- [ ] Success probability shows confidence level label (High/Medium/Low)
- [ ] Gate Status card displays overall status (✓ Ready/⚠ Warnings/✗ Blocked)
- [ ] Each gate check shows individual pass/warning/fail status
- [ ] Warning and failure states include actionable guidance text
- [ ] Execute Plan button is disabled when gate status is ✗ Blocked
- [ ] Execute Plan shows confirmation prompt when gate status is ⚠ Review Warnings
- [ ] Execute Plan proceeds directly when gate status is ✓ Ready to Execute
- [ ] User can identify at-a-glance whether simulation passed all gates
- [ ] Adjusting constraints and re-running simulation updates all status indicators
- [ ] Mock/deterministic simulation behavior is clearly labeled in UI

### 9.4 Visual Design Specifications

Color coding:
- ✓ Success/Pass: `text-emerald-400`, `bg-emerald-900/20`, `border-emerald-700`
- ⚠ Warning: `text-amber-400`, `bg-amber-900/20`, `border-amber-700`
- ✗ Failure/Blocked: `text-red-400`, `bg-red-900/20`, `border-red-700`
- Neutral/Info: `text-blue-400`, `bg-blue-900/20`, `border-blue-700`

Status badge format:
- Icon + text (e.g., `✓ Well within budget`)
- Small, inline, color-coded
- Consistent placement next to corresponding metric

Gate Status card layout:
- Header: Overall status badge (large, prominent)
- Body: List of individual gate checks with status icons
- Footer: Guidance text for warnings/failures (only when needed)

Metrics card layout:
- Cost: `$X / $Y budget` with status badge on same line
- Duration: Time estimate with context label below
- Success probability: Percentage with confidence label and horizontal bar visualization

### 9.5 Telemetry Events (Minimum)

- `workflow.stage_d.simulation_started`
- `workflow.stage_d.simulation_completed`
- `workflow.stage_d.simulation_gate_status` (with status: ready/warnings/blocked)
- `workflow.stage_d.cost_status` (with status: within/approaching/exceeded)
- `workflow.stage_d.confidence_status` (with level: high/medium/low)
- `workflow.stage_d.execute_clicked` (with gate_status context)
- `workflow.stage_d.execute_warning_acknowledged` (when user confirms despite warnings)
- `workflow.stage_d.constraints_adjusted`
