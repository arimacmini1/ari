# Feature 05 - AI Trace Viewer: Onboarding Guide

## Overview

The **AI Trace Viewer** is a tool that lets you see how AI agents made decisions while executing tasks. Think of it as a "decision replay" that shows you the thinking process behind every action.

## Where to Find It

**Location:** Executions Page (`/executions`)

1. Go to the **Execution History** page
2. Find an execution you want to inspect
3. Click the **"View Trace"** button (Eye icon)

## What You'll See

### The Modal Window

When you click "View Trace," a large window opens showing:

```
┌─────────────────────────────────────────────────────────────┐
│ Trace Viewer                                            [X]  │
│ Execution: exec-001                                         │
│                                                             │
│ Execution: exec-001 | Agent: orchestrator-main              │
│ Duration: 12.40s | Cost: $0.420                             │
│                         [Export JSON]                        │
│─────────────────────────────────────────────────────────────│
│ Decision Node | Agent | Confidence | Time | Actions         │
│─────────────────────────────────────────────────────────────│
│                                                             │
│ ▶ Parse requirements          orchestrator-main  97%  10:00 │
│   ▶ Extract entities         nlp-parser          94%  10:01 │
│   ▼ Validate schema          schema-validator    99%  10:02 │
│     • Generate report        schema-validator    98%  10:03 │
│                                                             │
│ ▶ Generate architecture      code-gen-alpha      89%  10:04 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## How to Use It

### 1. Expand/Collapse Decisions

**Click the chevron (▶) next to a decision** to see its sub-decisions:

- **▶ Collapsed** - Shows just this decision
- **▼ Expanded** - Shows this decision AND all its sub-decisions underneath

Sub-decisions are indented with a line on the left showing they're connected.

### 2. Read the Decision Context

**Click the blue "Expand" button** to read the full reasoning behind a decision.

This opens a dialog box with the complete explanation of:
- What the agent was thinking
- Why it chose this option
- What alternatives it considered

### 3. Copy the Reasoning

In the context dialog, click **"Copy to Clipboard"** to copy the full text (useful for sharing or documenting).

### 4. Check Confidence Scores

Each decision shows a **confidence bar** and percentage:

- 🟢 **Green (90-100%)** = The agent is very confident this was the right choice
- 🟡 **Yellow (80-90%)** = The agent is fairly confident
- 🔴 **Red (<80%)** = The agent wasn't very confident about this choice

### 5. Export the Entire Trace

Click **"Export JSON"** at the top to download a file containing:
- The entire decision tree
- All confidence scores
- All reasoning context
- Metadata (duration, cost, agent info)

This is useful for:
- Sharing with team members
- Storing as a record
- Analyzing offline

## Understanding the Tree

### Example Decision Tree

```
Root Decision (what the execution did)
├─ First Step
│  ├─ Sub-step 1
│  └─ Sub-step 2
├─ Second Step
│  └─ Sub-step
└─ Third Step
```

Each level shows:
- **Decision Name** - What decision was made
- **Agent** - Which AI agent made it
- **Confidence** - How sure the agent was (%)
- **Time** - When it happened

## Common Questions

**Q: Why is a decision red (low confidence)?**
A: The agent wasn't sure, but still had to make a choice. Check the reasoning by clicking "Expand" to see why.

**Q: Can I change what happened in the trace?**
A: No, the trace is a record of what already happened. It's like a video replay - you can watch and learn, but not edit it.

**Q: Why do some decisions have sub-decisions?**
A: Because that decision was complex and required smaller steps to complete. It's like breaking down a big task into smaller tasks.

**Q: What should I do with this information?**
A: Use it to:
- Understand how your AI agents work
- Check if decisions were made correctly
- Find where problems occurred
- Learn about the reasoning process

## Tips

✅ **DO:**
- Click "Expand" on decisions you don't understand
- Look at confidence scores to identify uncertain decisions
- Export JSON files for important executions
- Use it to audit and verify AI decision-making

❌ **DON'T:**
- Think low confidence = wrong decision (it's just less certain)
- Get overwhelmed by large trees (expand only what you need)
- Ignore the reasoning - that's the most valuable part!

## Next Steps

1. Go to `/executions`
2. Click "View Trace" on an execution
3. Click the chevron (▶) to explore the decision tree
4. Click "Expand" on any decision to see the full reasoning
5. Try exporting JSON to see the complete data structure

That's it! You're now using the AI Trace Viewer! 🎉
