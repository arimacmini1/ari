# Task Generator Prompt – AEI Product (AI Engineering Interface)

## 🔴 CRITICAL RULES (READ FIRST)

### Input Requirements
- **REQUIRED:** Master AEI PRD (`docs/prd/master-prd-UX-UI-ARI.md`)

<!-- - **REQUIRED:** Master AEI PRD (`/docs/prd/AEI-prd-master.md`) -->
- **REQUIRED:** Paste PRD content into `=== PRD CONTENT PASTE HERE ===` section below
- **OUTPUT:** Save generated roadmap to `/docs/tasks/ux-project-roadmap.md`

### Task ID Convention (MANDATORY)

Every task MUST have a unique ID in backticks before the task title.

**Format:** `PX-TT-NN` where:@master-prd-UX
- `P` = Phase prefix (literal)
- `X` = Phase number (1, 2, 3)
- `TT` = Tier code: `MH` (Must-Have), `SH` (Should-Have), `CH` (Could-Have)
- `NN` = Zero-padded sequential task number within that tier (01, 02, ...)

**Examples:** `P1-MH-01`, `P2-SH-03`, `P3-CH-02`

### Dependency Tracking Rules (MANDATORY)

1. The `Dependencies` field lists what THIS task needs before it can start. Use structured task IDs, not prose.
2. The `Blocks` field lists what DOWNSTREAM tasks cannot start until this one finishes.
3. **Dependencies and Blocks MUST be symmetric:** if task A lists B in Blocks, then B MUST list A in Dependencies.
4. Cross-phase references are required (e.g., a P2 task depending on P1-MH-05).
5. External dependencies use the `ext:` prefix (e.g., `ext:OpenAI-API-key`, `ext:Postgres-setup`).
6. `none` means genuinely no dependencies.
7. The `Feature refs` field links a roadmap task to its detailed counterpart(s) in feature files (e.g., `F00-MH-01`). Use `TBD` if the feature file hasn't been generated yet.

### Task Progress Logging Rule (MANDATORY)

When a roadmap task is completed, the corresponding feature task MUST capture progress
in its `Progress / Fixes / Updates` field (see feature task template).

### Core AEI Philosophy (Non-Negotiable)
- AEI is an AI mission control system — the #1 goal of every phase is to let a user feel they are directing and understanding a living swarm of agents, NOT just building another fancy form.
- Prioritize **observable agent behavior** and **closed feedback loops** (prompt → agents → visible progress + preview + trace + iteration) over UI completeness.
- Prefer **thin vertical slices** that deliver end-to-end observable agent behavior over horizontal feature completion.
- Always sequence foundational agent task execution loop before polish/UI sugar.
- Protect the prompt → agent → trace → preview → iterate cycle above all else.
- Every phase after Phase 1 must include basic cost/latency/queue-depth/swarm-health visibility — do NOT defer this.
- Design for dozens–hundreds of agents from day 1 (real-time telemetry, scaling signals, agent graph).

### Output Format (Strict — No Deviations)

```markdown
## Phase X – [Short Descriptive Name]  (Target: weeks 1–N)

### Must-Have Tier (blocker for any meaningful demo / internal dogfooding)
- [ ] `P1-MH-01` Task title – one clear verb + object
  - Owner hint: Frontend / Backend / AI / Design / Infra
  - Dependencies: none | comma-separated task IDs (e.g., P1-MH-01, P1-MH-03) | ext:external-blocker
  - Blocks: comma-separated task IDs that depend on this task completing
  - Feature refs: FXX-TT-NN (link to corresponding feature-file task) | TBD
  - Acceptance criteria: 2–5 concise, testable bullets
  - Est. effort: S / M / L / XL

### Should-Have Tier (critical for decent beta / early user feedback)
- [ ] `P1-SH-01` …

### Could-Have Tier (nice-to-have within phase, defer if needed)
- [ ] `P1-CH-01` …

#### Phase X Dependency Summary
| Task ID | Task Title (short) | Depends On | Blocks |
|---------|-------------------|------------|--------|
| P1-MH-01 | Heartbeat protocol | none | P1-MH-02, P1-MH-06 |
| P1-MH-02 | WebSocket transport | P1-MH-01 | P1-MH-03, P1-MH-06 |
| ... | ... | ... | ... |
```

### Phase Dependency Summary Requirement
At the END of each phase section, you MUST include a **Phase X Dependency Summary** table listing every task in that phase with its Dependencies and Blocks columns. This provides a scannable overview.

### Cross-Phase Dependency Map Requirement
After ALL phases, you MUST include a summary section:

```markdown
---
## Cross-Phase Dependency Map

### Phase 1 → Phase 2 Handoffs
| P1 Task | P2 Task(s) it Blocks | Handoff Notes |
|---------|---------------------|---------------|
| P1-MH-09 | P2-MH-01 | Trace viz needed before comparative analysis |

### Phase 2 → Phase 3 Handoffs
| P2 Task | P3 Task(s) it Blocks | Handoff Notes |
|---------|---------------------|---------------|
| ... | ... | ... |

### Critical Path (longest dependency chain)
P1-MH-01 → P1-MH-02 → P1-MH-06 → ... → P3-MH-XX
```

### Strict Rules You MUST Follow

1. **Ruthlessly prioritize by urgency × importance:**
   - Urgency = "if we don't do this soon, the product is useless / cannot be tested / cannot be demoed / cannot dogfood"
   - Importance = "this is core to the value proposition / differentiation / user love / defensibility"

2. **Phase scoping (non-negotiable):**
   - Phase 1: something demo-able (even if ugly) — end-to-end prompt → swarm → preview
   - Phase 2: something believable internally / early dogfooding
   - Phase 3: something people would actually want to use daily

3. **Task limits:** 6–12 real engineering-sized tasks per phase. Do NOT create 50 micro-tasks per phase.

4. **Task grouping:** Group related frontend/backend/AI-agent work together when it makes sense, but call out when parallel streams are possible.

5. **Foundational work:** Explicitly call out any foundational spikes, experiments, or architecture choices that must happen early (agent protocol, trace data model, real-time transport, cost proxy, etc.).

### Assumptions
- Web app (React or similar + Node/TS backend)
- LLM backends already exist (OpenAI / Anthropic / Grok / etc. via API)
- Agents are black-box callable functions for now
- Real-time needed (WebSockets / SSE)
- We care deeply about debuggability, cost visibility, and swarm observability from day 1

---

You are the best product-to-engineering breakdown specialist in the world — someone who has shipped multiple agent-native dev tools under tight deadlines with small teams.

Your job is to take this Product Requirements Document (PRD) and turn it into the **actual work breakdown structure** that a high-velocity engineering team (3–8 people) would use to build the MVP and follow-on phases.

Now read the following PRD carefully and produce the task breakdown.

=== PRD CONTENT PASTE HERE ===

[PASTE THE FULL LATEST AEI PRD HERE FROM /docs/prd/AEI-prd-master.md]

=== END OF PRD ===

Begin output immediately with the first heading. No introductory text. Do not explain your reasoning in the output — just the phased task list.
