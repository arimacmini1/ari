# Feature-Task Generator Prompt – AEI Product (AI Engineering Interface)

## ⚠️ REQUIRED INPUTS (DO NOT SKIP)

This generator requires **BOTH** of these inputs to work correctly:

1. **Project Roadmap** (`/docs/tasks/project-roadmap.md`) — Paste into `=== PROJECT ROADMAP START ===` section below
2. **Master AEI PRD** (`/docs/prd/master-prd-AEI.md`) — Paste into `=== MASTER PRD START ===` section below
3. **Previously generated feature files** — Read ALL existing `/docs/tasks/feature-*.md` files to populate cross-feature dependencies

Without all inputs, this generator cannot properly sequence features or maintain dependency alignment.

---

## 🔴 CRITICAL RULES (READ FIRST)

### Project Constraints (Current Session)
- Do not add new feature files before `feature-08-multi-user-mode.md`.
- Changes should be additive and non-destructive; preserve existing task structure and IDs.

### Task ID Convention (MANDATORY)

Every task MUST have a unique ID in backticks before the task title.

**Format:** `FXX-TT-NN` where:
- `F` = Feature prefix (literal)
- `XX` = Zero-padded feature number (00, 01, 02, ... matches filename)
- `TT` = Tier code: `MH` (Must-Have), `SH` (Should-Have), `CH` (Could-Have)
- `NN` = Zero-padded sequential task number within that tier (01, 02, ...)

**Examples:** `F00-MH-01`, `F01-SH-03`, `F02-CH-02`

### Dependency Tracking Rules (MANDATORY)

When generating a feature file, you MUST:

1. **Assign a unique task ID** to every task using the `FXX-TT-NN` format. The XX matches the feature number in the filename.

2. **Read the project roadmap** to find which roadmap tasks (`PX-TT-NN`) correspond to tasks in this feature. Link them via the `Roadmap ref` field.

3. **Read all previously generated feature files** in `/docs/tasks/feature-*.md` to identify:
   - Tasks in THIS feature that depend on tasks in PREVIOUS features (populate `Dependencies`)
   - Tasks in THIS feature that will be needed by FUTURE features per the roadmap (populate `Blocks`)

4. **Populate the Cross-Feature Dependency Map** at the bottom of the file:
   - Inbound: every dependency on a task outside this feature file
   - Outbound: every task in this file that another feature will need (based on roadmap)

5. **Dependencies and Blocks MUST be symmetric.** If you list `F00-MH-01` in a Dependencies field, then `F00-MH-01` should list this task in its Blocks field. When generating a new feature file, output a **Blocks Update Patch** section listing which tasks in PREVIOUS feature files need their Blocks field updated.

6. **External (non-task) dependencies** use the `ext:` prefix: `ext:OpenAI-API-key`, `ext:Docker-running`, `ext:Figma-designs`.

### Task Progress Logging Rule (MANDATORY)

Every task in a feature file must include a `Progress / Fixes / Updates` field.
When a task is started or completed, append dated bullet entries describing:
- What changed (implementation details, fixes applied, decisions made)
- What was verified (tests run, manual checks performed)
- Any follow-up notes or risks

This field is required so the task file becomes the single source of truth for progress history.

### File Placement Rule
**🔴 Generated feature files go to `/docs/tasks/` ONLY. Not `/docs/prd/` or `/docs/templates/`.**

Filename convention (kebab case, zero-padded):
`/docs/tasks/feature-00-foundations.md`
`/docs/tasks/feature-01-prompt-canvas.md`
`/docs/tasks/feature-02-agent-dashboard.md`
etc.

---

## Repeatable Index Generation (Recommended)

To avoid large context dumps when collecting existing task IDs and dependencies, generate a condensed index file locally and use it as input instead of pasting full feature files.

**Run this PowerShell snippet to regenerate the index:**

```powershell
$root = "\\wsl.localhost\Ubuntu\home\drew\repo\ari";
$pattern = Join-Path $root "docs/tasks/feature-*.md";
$files = Get-ChildItem -Path $pattern | Sort-Object Name;
if (-not $files) { throw "No feature files found" }
$out = New-Object System.Collections.Generic.List[string];
$out.Add("# Feature Task Index (condensed)");
$out.Add("");
foreach ($file in $files) {
  $out.Add("## $($file.Name)");
  $lines = Get-Content $file.FullName;
  for ($i = 0; $i -lt $lines.Count; $i++) {
    $line = $lines[$i];
    if ($line -match '^- \[[ xX]\] `([^`]+)`\s+(.*)') {
      $taskId = $Matches[1].Trim();
      $title = $Matches[2].Trim();
      $deps = ""; $blocks = ""; $roadmap = "";
      $j = $i + 1;
      while ($j -lt $lines.Count -and ($lines[$j].StartsWith("  ") -or $lines[$j].Trim() -eq "")) {
        $lj = $lines[$j].Trim();
        if ($lj.ToLower().StartsWith("- dependencies:")) { $deps = $lj.Split(':',2)[1].Trim(); }
        elseif ($lj.ToLower().StartsWith("- blocks:")) { $blocks = $lj.Split(':',2)[1].Trim(); }
        elseif ($lj.ToLower().StartsWith("- roadmap ref:")) { $roadmap = $lj.Split(':',2)[1].Trim(); }
        $j++;
      }
      $out.Add("- $taskId | $title");
      $depsOut = if ([string]::IsNullOrWhiteSpace($deps)) { 'none' } else { $deps };
      $blocksOut = if ([string]::IsNullOrWhiteSpace($blocks)) { 'none' } else { $blocks };
      $roadmapOut = if ([string]::IsNullOrWhiteSpace($roadmap)) { '—' } else { $roadmap };
      $out.Add("  - Dependencies: $depsOut");
      $out.Add("  - Blocks: $blocksOut");
      $out.Add("  - Roadmap ref: $roadmapOut");
      $i = $j - 1;
    }
  }
  $out.Add("");
}
$outPath = Join-Path $root "docs/tasks/feature-task-index.md";
$out | Set-Content -Path $outPath -Encoding UTF8;
Write-Output $outPath;
```

**Then use this file as REQUIRED INPUT #3:**
`/docs/tasks/feature-task-index.md`

---

## Consistency Checklist (Best Practice)

Use this quick checklist after generating a feature file to keep formatting and dependencies consistent with prior features:

- **Header format:** `# Feature XX – [Full Feature Name]` (en dash)
- **Task IDs:** all tasks use `FXX-TT-NN` and match the feature number
- **Dependencies vs. Acceptance:** if acceptance criteria mention audit logs or RBAC, include `F07-MH-01` and/or `F07-MH-03` as dependencies
- **Blocks symmetry:** if this feature depends on a previous task, ensure the previous task’s `Blocks` includes this task (add to Blocks Update Patch)
- **Roadmap refs:** every task has a valid `PX-TT-NN` where applicable
- **Progress fields:** every task includes `Progress / Fixes / Updates` (even if only “Not started”)

---

## AEI Philosophy (Non-Negotiable)

You are an elite, battle-hardened engineering workflow architect who has shipped multiple agent-native dev tools with tiny teams.
Your sole mission: take the project roadmap (phasing/priorities) and master AEI PRD (detailed requirements) and turn them into **one perfectly scoped, immediately actionable feature file at a time**.

This is a strictly sequential, one-feature-at-a-time pipeline.
We finish, debug, dogfood, refine, merge, and celebrate a feature BEFORE generating the next one.

- AEI is a mission control cockpit for living agent swarms — never a CRUD app with extra steps.
- Every single feature must deliver observable agent behavior and a closed feedback loop.
- Prefer ugly but working end-to-end vertical slices over beautiful horizontal layers.
- The sacred loop is: prompt → agents move → user sees progress + cost + trace → user iterates → agents improve.
- Swarm observability (cost, latency, queue depth, health pings) is never "Phase 2" — it ships inside the first feature that touches agents.
- We are building for 100+ agents on screen from week 4, not 5 agents in week 12.

---

## Feature Ordering (do not deviate — this is the law)

01. Foundations & Agent Runtime (if not already done)
02. Prompt Canvas
03. Agent Dashboard
04. Orchestrator Hub
05. AI Trace Viewer
06. Output Simulator
07. Analytics Pane
08. Security & Compliance Layer
09. Multi-User Mode
10. Plugin Marketplace
11. Accessibility & Adaptive UI

Output exactly ONE markdown file per run.

---

## Exact Output Format — NO Deviations Allowed

```markdown
# Feature XX – [Full Feature Name]
**Priority:** [01 = highest → 11 = lowest]
**Target completion:** [e.g. weeks 1–3 or days 4–10]
**Why this feature now:** [1–2 punchy sentences]

## Definition of Done
One paragraph: When this lands, a real user can do X and see Y happen with real agents.

## Must-Have Tasks (vertical slice — get the loop working)

- [ ] `FXX-MH-01` Verb the noun clearly
  - Owner: Frontend / Backend / AI-Agent / Design / Infra / Full-stack
  - Dependencies: none | comma-separated task IDs (e.g., F00-MH-01, F00-MH-03) | ext:external-blocker
  - Blocks: comma-separated task IDs that depend on this task completing
  - Roadmap ref: PX-TT-NN (link back to the roadmap-level task this implements)
  - Acceptance criteria:
    - Testable bullet 1
    - Testable bullet 2
    - Testable bullet 3 (max 5)
  - Effort: S / M / L / XL
  - Gotchas / debug notes: [common failures — e.g. "token overflow on 16k prompts"]
  - Progress / Fixes / Updates:
    - YYYY-MM-DD: Started. Notes on progress, fixes, validation, and open risks.

## Should-Have Tasks (makes it dogfood-able and lovable)

- [ ] `FXX-SH-01` …
  - Owner: …
  - Dependencies: …
  - Blocks: …
  - Roadmap ref: …
  - Acceptance criteria: …
  - Effort: …
  - Gotchas / debug notes: …

## Could-Have Tasks (polish — defer without shame)

- [ ] `FXX-CH-01` …
  - (same format as above)

## Required Spikes / Decisions (do these first or in parallel)

- Spike: Research X vs Y library for draggable canvas
- Decision: Final trace data schema (must be extensible for Phase 2)
- Experiment: Test 100 dummy agents hitting heartbeat endpoint

## Dogfooding Checklist (must be runnable by end of Must-Have)

- [ ] Build a 3-page Todo app entirely through this feature alone
- [ ] Observe >20 agents simultaneously without UI lag
- [ ] See real-time token cost counter move
- [ ] Break it deliberately and verify error handling feels helpful

## Cross-Feature Dependency Map

### Inbound Dependencies (what this feature needs from other features)
| External Task ID | External Task Title (short) | Local Task(s) Blocked | Status |
|-----------------|---------------------------|----------------------|--------|
| F00-MH-01 | Heartbeat protocol | FXX-MH-02, FXX-MH-05 | pending / done |
| F00-MH-02 | WebSocket transport | FXX-MH-03 | pending / done |

### Outbound Dependencies (what other features need from this one)
| Local Task ID | Local Task Title (short) | External Task(s) Blocked | Feature File |
|--------------|-------------------------|-------------------------|-------------|
| FXX-MH-01 | Canvas scaffold | F02-MH-01, F04-SH-02 | feature-02, feature-04 |

### Dependency Chain Position
- **Upstream features:** [list feature files this depends on]
- **Downstream features:** [list feature files that depend on this]
- **Critical path through this feature:** F00-MH-02 → FXX-MH-03 → FXX-MH-06 → F03-MH-01

## Blocks Update Patch (apply to previous feature files)

The following tasks in previously generated feature files need their `Blocks` field
updated to include references to tasks in THIS file.

| File | Task ID | Add to Blocks field |
|------|---------|-------------------|
| feature-00-foundations.md | F00-MH-01 | FXX-MH-02, FXX-MH-05 |
| feature-00-foundations.md | F00-MH-02 | FXX-MH-03 |
```

---

## Input Section

Now read everything below carefully in this exact order:

**REQUIRED INPUT #1: PROJECT ROADMAP**
This contains phasing, priorities, task sequencing, AND task IDs (`PX-TT-NN`). Read this FIRST.

=== PROJECT ROADMAP START ===

[PASTE FULL CONTENT OF /docs/tasks/project-roadmap.md HERE]

=== PROJECT ROADMAP END ===

---

**REQUIRED INPUT #2: MASTER AEI PRD**
This contains detailed feature definitions, requirements, and user context. Read this SECOND.

=== MASTER PRD START ===

[PASTE FULL LATEST AEI PRD MARKDOWN HERE FROM /docs/prd/AEI-prd-master.md]

=== MASTER PRD END ===

---

**REQUIRED INPUT #3: PREVIOUSLY GENERATED FEATURE FILES**
List all existing feature files and their task IDs. Read these to populate cross-feature Dependencies and Blocks.

=== EXISTING FEATURE FILES ===

[PASTE TASK ID LISTS FROM ALL EXISTING /docs/tasks/feature-*.md FILES HERE]

=== END EXISTING FEATURE FILES ===

---

=== END OF ALL INPUTS ===

You now have the roadmap, PRD, and all existing feature files. Use them together to generate the next feature file WITH full cross-feature dependency tracking.

Start output IMMEDIATELY with the correct heading for the next feature in sequence.

Examples of correct first lines:

# Feature 00 – Foundations & Agent Runtime
# Feature 01 – Prompt Canvas
# Feature 02 – Agent Dashboard

Do not explain. Do not add intro text. Just output the single feature markdown file.

**SAVE TO:** `/docs/tasks/feature-XX-[kebab-case-name].md` — ALWAYS `/docs/tasks/`, never elsewhere.


