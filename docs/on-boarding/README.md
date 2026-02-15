# Ari On-Boarding - Start Here

This is the canonical entrypoint for learning and using Ari end-to-end.

If you are new, follow the guided workflow below before opening feature-specific guides.

## 1. Canonical Journey

```text
Intent (Chat)
  -> Prompt Canvas (structure workflow)
  -> Orchestrator (rules/constraints)
  -> Simulation (plan + artifacts)
  -> Execute (commit run)
  -> Trace (review and improve)
```

This is the default mental model for Ari.

## 2. First 10 Minutes

1. Open main workspace and define your goal in chat.
2. Send/refine the goal in Prompt Canvas.
3. Open Orchestrator and select/create a rule.
4. Run Simulation and inspect plan, budget, and time.
5. Review artifacts in Output Simulator.
6. Execute workflow.
7. Open Trace Viewer and inspect top decisions.
8. Capture one improvement and rerun.

## 3. Mode Guidance

- Default path: `Workflow Mode` (guided, sequential).
- Advanced path: `Advanced Mode` (direct tab access).

Use Workflow Mode for onboarding, dogfooding, and repeatable delivery.
Use Advanced Mode for deep debugging or power-user tasks.

## 4. Project Context: Import + Edit Loop

Use this loop when you need Ari to work against a real codebase.

1. Import repository from GitHub.
2. Wait for repo status: `queued -> indexing -> ready`.
3. Open embedded code workspace (`code-server`) and inspect target files.
4. Define/adjust workflow in Ari using that same repository context.
5. Simulate, execute, and trace with repo-linked evidence.

If import/indexing is unavailable, use starter templates and label the run as template-only.

## 5. What to Read Next

### User Journey Guides
- Prompt Canvas: `docs/on-boarding/feature-01-onboarding.md`
- Orchestrator Hub: `docs/on-boarding/feature-03-onboarding.md`
- Output Simulator: `docs/on-boarding/feature-04-onboarding.md`
- AI Trace Viewer: `docs/on-boarding/feature-05-onboarding.md`

### Cross-Cutting Workflows
- Ground truth UX contract: `docs/on-boarding/ari-user-experience-ground-truth.md`
- Workflow Mode UI contract: `docs/on-boarding/ui-workflow-mode-spec.md`
- Dogfood process template: `docs/process/dogfood-workflow-template.md`
- UX progression loop template: `docs/process/ux-progression-workflow-template.md`
- UX progression log: `docs/tasks/ux-progression-log.md`

## 6. Mock vs Production Behavior

Some flows currently run in mock/deterministic mode.

When a guide includes mock behavior, it must state:
- what is mocked,
- what real production behavior will differ,
- what signals prove the flow is still valid for user training.

## 7. Quick-Win Starter Scenarios

1. Build a simple script
- Goal: turn a short natural-language request into a small generated artifact.
- Success signal: simulation + artifact preview + execution record + trace summary.

2. Debug a failing function
- Goal: model repro -> fix -> verify loop in one Ari workflow.
- Success signal: fork/compare trace and clear before/after outcome.

3. Migration dry run
- Goal: simulate scoped migration path with checkpoints and validation.
- Success signal: budget/time estimate, risk flags, and approval-ready runbook.

## 8. If Ari Feels Unusable

Capture these three items and attach them to the feature task file:
1. Where you got stuck in the canonical journey (stage + action).
2. What you expected vs what happened.
3. Trace/execution ID or screenshot evidence.

This keeps UX fixes concrete and repeatable.
