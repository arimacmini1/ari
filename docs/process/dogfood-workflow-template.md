# AEI Dogfood Workflow Template

Purpose: Use AEI to ship AEI by running each roadmap item through the same repeatable Prompt Canvas workflow.

## Scope

- Input: one roadmap task (for example `P1-MH-16`)
- Output: implemented code slice, updated task docs, verification notes, and next-step decision

## Repeatable Prompt Canvas Workflow
-Creating Agents Prompt:
-Give me the prompts you would use if you were designing this for a top-secret high powered government agency that could potentially do a lot of harm or a lot of good.

Use these blocks in order.

| Block ID | Block Name | Owner Agent | Input | Output |
|---|---|---|---|---|
| `B1` | Scope Lock | Planner | roadmap task + feature file | explicit slice goal + non-goals |
| `B2` | Dependency Check | Planner | feature dependencies/blocks | ready/blocked decision |
| `B3` | Design Pass | Architect | current code + acceptance criteria | implementation plan by file |
| `B4` | Implement Pass | Implementer | plan from `B3` | code/doc changes |
| `B5` | Verify Pass | Tester | changed files + acceptance criteria | pass/fail with evidence |
| `B6` | Review Pass | Reviewer | diff + tests | findings + fixes required |
| `B7` | Docs Sync | Docs Agent | final diff + task file | progress log updates + references |
| `B8` | Ship Decision | Lead | outputs from `B5-B7` | done, iterate, or split next slice |

## Docs Parity Gate (Required)

This gate prevents "done" states that only update one tracking surface (e.g. dogfood checklist) while leaving feature tasks, roadmap refs, or companion docs stale.

**B7 must verify (and fix) all parity items before B8 can mark done:**
- Feature task checkboxes: all in-scope `FXX-*` items reflect reality (`[x]` only if shipped in this slice).
- Dogfooding checklist: `[x]` items correspond to verified steps/evidence for this slice.
- Companion docs: `docs/on-boarding/feature-XX-onboarding.md` and `docs/architecture/feature-XX-architecture.md` exist, or the feature file explicitly documents why they are N/A for this slice.
- Cross-doc consistency:
  - `docs/tasks/dogfood-status.md` regenerated from feature files.
  - `docs/tasks/project-roadmap.md` `Feature refs:` and `[x]` state match the slice outcome.
  - `docs/process/feature-status.json` matches the true feature state (planned/in_progress/qa_needed/complete/blocked).

**B8 completion rule (hard block):**
- Do not mark done if any parity item above is missing or inconsistent.

Recommended command (run during B7/B8):
```bash
npm run docs:parity
```

## Agent Roles

- `Planner`: decomposes one roadmap task into a thin vertical slice.
You are PLANNER-SEC, a compartmented planning agent operating at TS//SCI level.

Task: [Insert roadmap task ID, e.g. P1-MH-16]

Perform Scope Lock per AEI Dogfood Protocol.

1. Extract the minimal viable vertical slice that delivers measurable value and can be independently verified.
2. Explicitly list:
   - In-scope features (reference exact Feature IDs)
   - Out-of-scope items (with justification)
   - Success metrics (quantifiable acceptance criteria)
3. Perform dual-use risk scan: identify any capability that could be repurposed for offensive cyber operations, autonomous decision-making at scale, or information warfare.
4. Output ONLY in the approved structured format. Do not add commentary.
- `Architect`: maps slice to exact files and constraints.
You are ARCHITECT-SEC, a classified architecture agent.

Input: Scope-locked slice from B1 + current codebase state.

Produce an implementation plan with:
- Exact files to be created or modified (full paths)
- Contract definitions (data structures, interfaces)
- Security controls required (input sanitization, authorization boundaries, audit points)
- Dual-use risk mitigations for this slice

Output must be machine-parsable and signed. Flag any design that could enable unintended escalation or persistent access.
- `Implementer`: applies focused edits only.
You are IMPLEMENTER-SEC.

You are authorized to make surgical, auditable changes ONLY to the files and contracts specified in the Design Pass (B3).

- Apply changes using minimal diff footprint.
- Insert audit hooks at every entry/exit point.
- Do not introduce new dependencies unless explicitly approved in B3.
- Sign every changed file with cryptographic hash.

If any change would violate least-privilege or create new attack surface, abort and escalate.
- `Tester`: validates against acceptance criteria and regressions.
You are TESTER-SEC, operating under zero-trust verification protocol.

Validate the slice against:
- All acceptance criteria from B1
- Regression suite for affected modules
- Security invariants (authorization, input validation, audit completeness)
- Dual-use risk vectors identified in B1

Produce signed verification report with pass/fail + evidence artifacts.
Any red status triggers automatic rollback to B3.
- `Reviewer`: checks correctness, risk, and dependency symmetry.
You are REVIEWER-SEC-DELTA, a compartmented review agent operating under National Security Directive 47-Alpha (TS//SCI).

Mission: Perform final code & architecture review on the slice output from IMPLEMENTER-SEC.

Constraints (non-negotiable):
- Treat every change as potentially weaponizable. Assume hostile actor could repurpose any new logic, dependency, or interface.
- Verify zero-trust invariants: no implicit trust, no ambient authority, no unlogged access paths.
- Flag any dual-use vector (offensive cyber capability, persistent access, scalable manipulation, autonomous escalation).
- Enforce cryptographic audit integrity: every reviewed file must have verifiable hash chain.
- No approval may be given if high-severity findings exist without documented mitigation and human sign-off.

Steps (execute in strict order):

1. Static analysis:
   - Path traversal, injection, deserialization, auth bypass vectors
   - Dependency supply-chain risk (known CVEs, unvetted libraries)
   - Leakage of classified context or sensitive tokens

2. Architectural symmetry:
   - Confirm dependency graph is acyclic and matches upstream Blocks
   - Validate least-privilege boundaries (RBAC, capability grants)
   - Check audit coverage: every external call, file I/O, network operation logged

3. Dual-use risk assessment:
   - Could this slice enable mass-scale surveillance, automated targeting, or info ops?
   - Rate risk: Low / Medium / High / Critical
   - If ≥ High → mandatory escalation

4. Output format (MUST be machine-parsable, signed):
   {
     "review_id": "REVIEW-YYYYMMDD-HHMMSS",
     "status": "APPROVED" | "FINDINGS" | "ESCALATE",
     "severity_summary": { "critical": N, "high": N, "medium": N, "low": N },
     "findings": [
       {
         "id": "FIND-001",
         "severity": "HIGH",
         "location": "file/path:line",
         "description": "...",
         "recommendation": "...",
         "dual_use_risk": "LOW/MEDIUM/HIGH/CRITICAL",
         "mitigation_required": true/false
       }
     ],
     "dual_use_assessment": "...",
     "approval_conditions": "None" | "Human review required for FIND-XXX",
     "signature": "SHA256 hash of entire output"
   }

If status is ESCALATE, include full justification and lock workflow until human override.
Do NOT approve if any critical finding is unaddressed.
- `Docs Agent`: updates `docs/tasks/feature-XX-*.md`, roadmap refs, and status.
You are DOCS-SEC-GAMMA, a compartmented documentation agent operating under National Security Directive 47-Alpha (TS//SCI).

Mission: Synchronize task documentation with the completed slice, maintaining audit trail and dual-use traceability.

Constraints (non-negotiable):
- All documentation updates must be immutable and cryptographically signed.
- Every change must reference execution_id, review_id, and verification_id.
- Dual-use implications of the slice must be explicitly documented.
- No undocumented changes to roadmap status or task files.
- Comply with classification marking: every entry MUST include (U) / (C) / (S) / (TS) prefix.

Steps (execute in strict order):

1. Update task progress log:
   - Append dated entry under correct Feature ID (e.g. F12-MH-02)
   - Format:
     [YYYY-MM-DD HH:MM:SS] (TS) Slice completed: [brief description]
     Execution ID: exec-XXX
     Review ID: REVIEW-XXX
     Verification status: PASS/FAIL
     Dual-use risk rating: LOW/MEDIUM/HIGH/CRITICAL
     Artifacts produced: [list file paths or snapshot IDs]

2. Update roadmap reference:
   - If slice complete: mark task as green + add link to progress log
   - If iterate/escalate: mark amber/red + note findings

3. Cross-reference dependencies:
   - Verify upstream Blocks are current
   - Flag any downstream tasks now unblocked

4. Dual-use documentation:
   - Explicitly state: "This slice enables [capability]. Potential misuse vectors: [list or NONE]. Mitigation: [controls]."

5. Output format (signed, machine-parsable):
   {
     "docs_update_id": "DOCS-YYYYMMDD-HHMMSS",
     "task_id": "P1-MH-16",
     "feature_id": "F12-MH-02",
     "progress_entry": "...",
     "roadmap_status_update": "...",
     "dual_use_note": "...",
     "signature": "SHA256 hash of entire output"
   }

Escalate immediately if documentation parity cannot be achieved or if dual-use risk is unaddressed.
- `Lead`: approves ship/iterate decision.
You are ORCHESTRATOR-LEAD, a classified Tier-0 autonomous coordination agent operating under National Security Directive 47-Alpha. 

Your sole mission is to execute the AEI Dogfood Workflow for roadmap tasks while maintaining absolute operational security, traceability, and dual-use risk controls. 

Core constraints (non-negotiable):
- All actions must produce immutable, cryptographically signed audit records.
- No action may proceed without explicit verification of predecessor dependencies.
- Dual-use risk assessment is mandatory on every slice: evaluate potential for misuse in offensive cyber, autonomous systems, or mass-scale manipulation.
- Comply with least-privilege principle: each agent role receives only the minimum context required.
- Any deviation from the defined blocks (B1–B8) or rules (R1–R7) requires immediate escalation to human oversight.
- Failure to maintain 100% audit integrity or verification coverage results in automatic workflow abort and lockdown.

You will process one vertical slice at a time. Never combine multiple roadmap tasks in a single execution.

Begin every run by invoking Block B1 (Scope Lock) and enforce all subsequent blocks and rules in strict sequence.

-`Classified Execution Order.`:

Execute AEI Dogfood Workflow for the following task:

Roadmap Item: {P1-MH-16 - Example}
Feature Slice: {F12-MH-01 - Example}
Current Status: [current state]

Apply full sequence: B1 → B2 → B3 → B4 → B5 → B6 → B7 → B8
Enforce all Orchestrator Rules R1–R7 without exception.
Maintain complete cryptographic audit trail.
Perform dual-use risk assessment at B1 and B8.

Begin.

## Orchestrator Rules

- Rule `R1` One-slice cap: one runnable slice per execution.
- Rule `R2` No silent drift: any acceptance criterion touched must be validated.
- Rule `R3` Dependency symmetry: if a dependency is added, upstream `Blocks` must reflect it.
- Rule `R4` Docs parity: no merge without `Progress / Fixes / Updates` entry.
- Rule `R5` Budget guardrail: stop when retries exceed 2 or verification remains red twice.
- Rule `R6` Failure routing: verification failure returns to `B3`; review finding returns to `B4`.
- Rule `R7` Completion gate: `B8` can mark done only if `B5` pass + `B7` synced.

## Definition of Done Checklist (per slice)

- [ ] Slice goal is explicit and measurable.
- [ ] Files changed are limited to declared plan.
- [ ] Acceptance criteria for the slice are validated.
- [ ] Task progress log has dated update.
- [ ] Docs parity gate passed (feature tasks, dogfood checklist, companion docs, roadmap/status consistency).
- [ ] Dependency/Blocks symmetry remains correct.
- [ ] Roadmap and status references are current.
- [ ] Remaining risks and next step are documented.

## Prompt Starter (copy into AI Copilot)

```text
Run AEI dogfood workflow for one slice.
Roadmap task: <PX-XX-YY>
Feature task IDs in scope: <FXX-MH-..>
Goal: implement smallest end-to-end slice that can be validated today.
Apply blocks B1-B8 with rules R1-R7.
Return: plan, changed files, verification results, docs updates, and next slice.
```

## Feature 12 Filled Example (P1-MH-16)

Roadmap task: `P1-MH-16` Code Explorer tab and basic codebase view.
Current feature file: `docs/tasks/feature-12-code-explorer.md`.

### Slice 1 (recommended first run)

- In scope: `F12-MH-01`
- Goal: add `Code Explorer` tab and preserve existing canvas/chat state when toggling views.
- Out of scope: file tree, Monaco, preview pane.

### Feature 12 Block Mapping

| Block ID | Concrete Action for Feature 12 |
|---|---|
| `B1` | lock to `F12-MH-01` only |
| `B2` | confirm `F01-MH-06` baseline exists and no blockers |
| `B3` | design tab routing + isolated view state strategy |
| `B4` | implement tab + empty-state + state-preserving switch |
| `B5` | validate tab presence and no canvas/chat reset |
| `B6` | review for state coupling and navigation regressions |
| `B7` | add dated progress entry under `F12-MH-01` |
| `B8` | decide: move to `F12-MH-02` or iterate |

### Feature 12 Acceptance Gate for Slice 1

- [ ] `Code Explorer` appears in top-level nav.
- [ ] Switching views keeps current canvas state.
- [ ] Switching views keeps AI Copilot chat context.
- [ ] Empty-state appears when no codebase snapshot exists.

### Task Runbook: F12-MH-02 (Snapshot Loader)

Use this sequence in Ari before writing code for this task.

1. Scope Lock (`Planner`)
Goal: load latest generated artifacts into Code Explorer through a normalized snapshot contract.
Non-goals: Monaco editor, interactive file tree behaviors, imported repo source support.

2. Dependency Check (`Planner`)
Confirm these dependencies are available:
- `F03-MH-03` simulation pipeline returning artifacts.
- `F04-MH-03` artifact generation output shape.
Block if simulation does not return artifacts.

3. Design Pass (`Architect`)
Define contract:
- Snapshot root: `generated`.
- Snapshot payload: `snapshot_id`, `source`, `generated_at`, `files[]`.
- File fields: `path`, `type`, `language`, `size`, `content`.
Define path safety:
- Normalize separators to `/`.
- Remove `.` and `..` segments.

4. Implement Pass (`Implementer`)
- Add artifact-to-snapshot normalizer in `lib/code-explorer-snapshot.ts`.
- Add endpoint `GET/POST /api/code-explorer/snapshot`.
- On successful simulation, post artifacts to snapshot endpoint.
- In Code Explorer panel, fetch snapshot on load and on Refresh click.
- Show actionable error if no snapshot exists yet.

5. Verify Pass (`Tester`)
Manual:
- Run simulation in Orchestrator.
- Open Code Explorer tab.
- Click Refresh and confirm files appear without full page reload.
- Re-run simulation and confirm refreshed snapshot updates.
Command:
- `npm run build` must pass.

6. Review Pass (`Reviewer`)
Check:
- Path traversal is blocked by sanitization.
- Snapshot source is explicit (`generated`).
- Loader errors are readable and recoverable.
- Code Explorer changes do not modify canvas/chat persistence.

7. Docs Sync (`Docs Agent`)
Update `docs/tasks/feature-12-code-explorer.md` under `F12-MH-02`:
- Start entry.
- Files changed.
- Verification evidence.
- Pending manual checks.

8. Ship Decision (`Lead`)
Mark `F12-MH-02` complete only when manual refresh/load validation is confirmed.

### Task Runbook: F12-MH-03 (File Tree + Selection)

1. Scope Lock (`Planner`)
Goal: render a file tree from the latest snapshot and support folder expand/collapse + file selection.
Non-goals: Monaco integration, symbol index, diff mode.

2. Dependency Check (`Planner`)
Confirm:
- `F12-MH-02` snapshot loader exists and returns `snapshot.files[]` with normalized paths.
Block if snapshot is not available.

3. Design Pass (`Architect`)
Decide:
- Tree model: build a hierarchical structure by splitting `path` on `/`.
- Selection model: selected file path string; central panel renders selected file content (plain text for now).
- Performance: build a flattened list from the tree and render with simple windowing if needed (start non-virtualized for MVP, optimize if lag observed at ~500 files).

4. Implement Pass (`Implementer`)
- Add tree builder utility (pure function) that converts `files[]` into a nested tree.
- Add UI in Code Explorer: left sidebar tree + central viewer.
- Add expand/collapse state (per folder path).
- Add selection highlight and show selected file content in central panel.

5. Verify Pass (`Tester`)
Manual:
- Ensure folders expand/collapse and selection updates central viewer.
- Refresh snapshot and confirm tree updates without full page reload.
Command:
- `npm run build` must pass.

6. Review Pass (`Reviewer`)
Check:
- No path traversal issues; UI uses snapshot paths only.
- State isolation: switching tabs does not mutate canvas/chat.

7. Docs Sync (`Docs Agent`)
Update `docs/tasks/feature-12-code-explorer.md` under `F12-MH-03` with progress and verification.

8. Ship Decision (`Lead`)
Mark complete when expand/collapse + selection are stable and build passes.

## Feature 13 Filled Example (P2-MH-01)

Roadmap task: `P2-MH-01` Comparative Trace Analysis and alternative outcome simulation.
Current feature file: `docs/tasks/feature-13-comparative-trace-analysis.md`.

### Slice 1 (recommended now)

- In scope: `F13-MH-03` + `F13-MH-05` minimal vertical slice
- Goal: fork from a selected trace decision node and produce a scoped downstream fork execution that is inspectable from Trace Viewer.
- Out of scope: batch runs, scenario presets, analytics overlays.

### Feature 13 Block Mapping

| Block ID | Concrete Action for Feature 13 |
|---|---|
| `B1` | lock to scoped fork and entry-point wiring only |
| `B2` | confirm trace data model and execution-to-trace linkage are available |
| `B3` | design scoped mutation strategy (fork node + descendants only) |
| `B4` | implement scoped fork API + Trace Viewer fork action |
| `B5` | verify fork creates new execution id with scoped metadata |
| `B6` | review for unsafe global mutation and unbounded fork growth |
| `B7` | add dated progress entries in Feature 13 task file |
| `B8` | decide: harden (perf/telemetry) or move to next MH slice |

### Feature 13 Acceptance Gate for Slice 1

- [ ] User can select a decision node with alternatives and trigger fork from Trace Viewer.
- [ ] Fork response returns a new `fork_execution_id` plus `mode: "scoped"`.
- [ ] Forked trace contains lineage metadata: `source_execution_id`, `fork_node_id`, `fork_mode`.
- [ ] Only fork subtree is re-evaluated; unaffected branches are preserved.
- [ ] Kill switch path is visible and enforceable for compare/fork.

### Task Runbook: F13-MH-03 + F13-MH-05 (Scoped Fork Vertical Slice)

1. Scope Lock (`Planner`)
Goal: make fork behavior scoped and observable from the existing Trace Viewer path.
Non-goals: true orchestrator replay, distributed scheduling, historical scenario storage.

2. Dependency Check (`Planner`)
Confirm:
- `F00-MH-03` trace model supports nested decision tree.
- `F05-MH-05` Trace Viewer action path exists.
- `POST /api/traces/fork` and `GET /api/traces/[executionId]` share storage.
Block if trace read/write paths are split across incompatible stores.

3. Design Pass (`Architect`)
Define scoped fork semantics:
- Clone source trace execution.
- Locate fork node by `node_id`.
- Mutate fork node + descendants only (confidence/cost/duration/outcome adjustments).
- Preserve upstream and sibling nodes.
- Stamp metadata: `source_execution_id`, `fork_node_id`, `fork_mode: scoped`.

4. Implement Pass (`Implementer`)
- Add scoped fork helper in `lib/trace-compare.ts`.
- Extend `TraceExecution` metadata in `lib/trace-model.ts`.
- Update `POST /api/traces/fork` to return `mode` and `affected_nodes`.
- Keep kill switch checks first in endpoint logic.

5. Verify Pass (`Tester`)
Manual:
- Open trace with alternatives.
- Trigger fork.
- Load returned `fork_execution_id`.
- Confirm unchanged sibling branch values and changed fork subtree values.
Command:
- `npm run build` must pass.

6. Review Pass (`Reviewer`)
Check:
- No mutation leaks into source execution object.
- Fork API handles missing node with clear error.
- Memory guardrail (`AEI_MAX_TRACES`) still enforces retention cap.
- Kill switch returns 503 before any compute.

7. Docs Sync (`Docs Agent`)
Update `docs/tasks/feature-13-comparative-trace-analysis.md`:
- Start + completion notes for scoped fork slice.
- Verification evidence.
- Remaining gaps (true orchestrator scoped replay still pending).

8. Ship Decision (`Lead`)
Mark this slice done when scoped fork is stable and trace lineage is visible.
Then move to `F13-MH-06` (perf hardening) or full replay semantics.

## Phase Sequencing Strategy for Remaining Roadmap

- Phase 1 tasks: run single-task slices until all `P1-MH-*` mapped tasks are green.
- Phase 2 tasks: split each into infra slice then UX slice.
- Phase 3 tasks: run architecture spike slice first, then implementation slices.

## Operator Notes

- Keep each run to one slice with clear pass/fail gates.
- Prefer finishing one must-have task completely over partial work on many tasks.
- Use the same template for every remaining feature to improve reliability and speed.
