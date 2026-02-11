# Claude Code Hooks Configuration

This directory contains hook configurations that automate workflows in the AEI project.

## How Hooks Work

Hooks monitor file changes and automatically trigger prompts when conditions are met.

### Hook Configuration Structure

```
.claude/hooks/
├── feature-task-completion-hook.json    ← Hook definition
├── prompts/
│   └── task-completion-workflow.md       ← Prompt invoked by hook
└── README.md                              ← This file
```

---

## Available Hooks

### 1. Feature Task Completion Hook

**File:** `feature-task-completion-hook.json`

**What it does:**
- Monitors `/docs/tasks/feature-*.md` files
- Detects when Must-Have (`MH`) tasks are marked complete (`[x]`)
- Offers to generate on-boarding and architecture documentation

**How it triggers:**
- You modify a feature task file
- The hook detects `- [x] \`F\d+-MH-` pattern (completed Must-Have tasks)
- Claude Code prompts you to confirm and proceed with the workflow

**What happens next:**
- The hook invokes `/hooks/prompts/task-completion-workflow.md`
- This prompt guides you through creating documentation
- You can follow the steps manually or ask Claude to help generate the docs

---

## Using the Feature Task Completion Workflow

### Method 1: Automatic Hook Trigger (Recommended)

**When it happens:**
1. You're working on a feature task in `/docs/tasks/feature-XX-*.md`
2. You mark all Must-Have tasks as `[x]` (checked)
3. You save the file

**What you see:**
- Claude Code detects the change
- A notification appears: "Feature Task Completion Workflow triggered"
- You get prompted with the task-completion-workflow.md guide

**What you do:**
1. Read the prompt carefully
2. Follow the 7 steps to create on-boarding and architecture docs
3. The hook can invoke Claude to help you write the docs

### Method 2: Manual Trigger

If the hook doesn't trigger for any reason, you can manually invoke it:

1. Open `.claude/hooks/prompts/task-completion-workflow.md`
2. Copy the contents
3. Paste into Claude Code chat
4. Follow the steps in the prompt

### Method 3: Direct Claude Request

At any time, you can ask Claude directly:

```
I have a completed feature task at /docs/tasks/feature-01-prompt-canvas.md
with all Must-Have tasks marked complete.

Please:
1. Generate /docs/on-boarding/feature-01-onboarding.md
2. Generate /docs/architecture/feature-01-architecture.md
3. Create AGENTS.md files in relevant folders
```

Claude will ask for the feature file content and generate the docs automatically.

---

## Step-by-Step Guide: Completing a Feature

### Step 1: Complete Feature Development

```bash
# You're implementing Feature 01
# Mark tasks as [x] when they're done
# Update progress notes in the task file
# When all Must-Have tasks are [x], save the file
```

In `/docs/tasks/feature-01-prompt-canvas.md`:
```markdown
## Must-Have Tasks (vertical slice — get the loop working)

- [x] `F01-MH-01` Build canvas component scaffolding
  - Progress / Fixes / Updates:
    - 2026-02-08: Implemented basic Canvas component with React Flow

- [x] `F01-MH-02` Add drag-and-drop block support
  - Progress / Fixes / Updates:
    - 2026-02-08: Integrated react-flow-renderer, 5 block types working
```

### Step 2: Hook Triggers (Automatic)

When you save the file with all `[x]` marked, Claude Code detects it and offers the workflow.

### Step 3: Accept and Follow Workflow

You'll see something like:

```
🔔 Feature Task Completion Workflow Triggered

/docs/tasks/feature-01-prompt-canvas.md has all Must-Have tasks marked complete.

Follow the task completion workflow? [Yes] [No] [Show prompt]
```

Choose `[Yes]` → The workflow prompt appears

### Step 4: Generate Documentation

You can either:

**Option A: Follow manually**
- Read each step in the workflow prompt
- Write the on-boarding and architecture docs yourself
- Update AGENTS.md files as instructed

**Option B: Ask Claude to help**
- Share the feature task file content with Claude
- Ask: "Please create the on-boarding and architecture docs for this feature"
- Claude generates them based on the task file
- You review and refine

**Option C: Full automation**
- Claude reads your task file
- Claude generates all docs
- Claude creates AGENTS.md files
- You just review the results

### Step 5: Commit Changes

```bash
git add docs/on-boarding/feature-01-onboarding.md
git add docs/architecture/feature-01-architecture.md
git add docs/AGENTS.md
git commit -m "docs: Feature 01 complete - add on-boarding and architecture docs"
```

### Step 6: Testing Phase Begins

- QA agent tests using the on-boarding guide
- Bugs are reported
- Implementation agent fixes bugs
- **Important:** Update the on-boarding and architecture docs when bugs are fixed

---

## Updating Hooks

To modify a hook or add a new one:

1. Edit `.claude/hooks/[hook-name].json`
2. Modify the trigger conditions, paths, or actions
3. Create/update the prompt file in `.claude/hooks/prompts/`
4. Save and test by making a file change that triggers the hook

### Hook Configuration Reference

```json
{
  "name": "Hook display name",
  "description": "What this hook does",
  "version": "1.0",
  "trigger": {
    "type": "file_change",                    // Type of trigger
    "paths": ["path/to/files/*.md"],          // Glob patterns to watch
    "events": ["write"],                      // Events: write, delete, create
    "conditions": [                           // Optional conditions
      {
        "type": "content_pattern",
        "pattern": "regex pattern",           // Pattern to match in file
        "description": "What this detects"
      }
    ]
  },
  "actions": [                                // What to do when triggered
    {
      "type": "prompt",
      "file": ".claude/hooks/prompts/name.md" // Prompt to invoke
    }
  ],
  "metadata": {
    "auto_trigger": true,                     // Trigger automatically
    "user_confirmation_required": true,       // Ask user first
    "max_auto_triggers_per_day": 5,           // Limit triggers
    "cooldown_minutes": 30                    // Wait between triggers
  }
}
```

---

## Troubleshooting

### Hook isn't triggering

1. **Check the pattern:** Make sure you're marking tasks as `[x]` exactly
2. **Check the file path:** File must be in `/docs/tasks/` and match `feature-*.md`
3. **Check the event:** Make sure you're saving the file (write event)
4. **Manual fallback:** Paste the prompt manually into Claude Code

### Prompt appears but I don't want to run it

Click `[No]` or just close it. You can run it later by:
- Making another change to trigger it again, or
- Manually pasting the prompt from `/hooks/prompts/task-completion-workflow.md`

### Documentation generated doesn't look right

1. Delete the generated files
2. Ask Claude to regenerate them with more specific instructions
3. Or manually write them following the template structure in the prompt

---

## Next Steps

After using the feature task completion hook:

1. **Bug Fix Workflow:** When bugs arise, use the documentation update process (see `04-template-task-completion-workflow.md`)
2. **Agent Routing:** Check AGENTS.md files to understand who owns which domains
3. **Task Planning:** Use `03-template-feature-task-generator.md` to plan the next feature

---

## Questions?

Refer to:
- `/docs/templates/04-template-task-completion-workflow.md` - Detailed workflow
- `/docs/AGENTS.md` - Agent responsibilities
- `/docs/README.md` - Overall docs structure
