#!/usr/bin/env bash
set -euo pipefail

FEATURE=""
NO_INDEX=0
NO_BLOCKS=0
NO_STUBS=0
DRY_RUN=0
PROMPT=0
YES=0
REQUIRED_IMPLEMENTATION_MODEL="gpt-5.3-codex"

while [[ $# -gt 0 ]]; do
  case "$1" in
    -Feature)
      FEATURE="$2"
      shift 2
      ;;
    -NoIndex)
      NO_INDEX=1
      shift
      ;;
    -NoBlocks)
      NO_BLOCKS=1
      shift
      ;;
    -NoStubs)
      NO_STUBS=1
      shift
      ;;
    -DryRun)
      DRY_RUN=1
      shift
      ;;
    -Prompt)
      PROMPT=1
      shift
      ;;
    -Yes)
      YES=1
      shift
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 1
      ;;
  esac
 done

export FEATURE NO_INDEX NO_BLOCKS NO_STUBS DRY_RUN PROMPT YES REQUIRED_IMPLEMENTATION_MODEL

python3 - <<"PY"
import os
import re
from datetime import datetime
from pathlib import Path

feature_filter = os.environ.get("FEATURE") or None
no_index = os.environ.get("NO_INDEX") == "1"
no_blocks = os.environ.get("NO_BLOCKS") == "1"
no_stubs = os.environ.get("NO_STUBS") == "1"
dry_run = os.environ.get("DRY_RUN") == "1"
prompt = os.environ.get("PROMPT") == "1"
yes = os.environ.get("YES") == "1"
required_model = os.environ.get("REQUIRED_IMPLEMENTATION_MODEL") or "gpt-5.3-codex"

root = Path(os.getcwd()).resolve()
task_dir = root / "docs" / "tasks"
onboarding_dir = root / "docs" / "on-boarding"
architecture_dir = root / "docs" / "architecture"
index_path = task_dir / "feature-task-index.md"

feature_files = sorted(p for p in task_dir.glob("feature-*.md") if p.name != "feature-task-index.md")
if not feature_files:
    raise SystemExit(f"No feature files found in {task_dir}")

feature_header_re = re.compile(r"^# Feature\s+(\d+(?:\.5)?)\s+[\u2013-]\s+(.+)$")


def get_feature_id(path: Path) -> str:
    first_line = path.read_text(encoding="utf-8").splitlines()[0] if path.exists() else ""
    m = feature_header_re.match(first_line)
    if m:
        return m.group(1).strip()
    m2 = re.match(r"^feature-(\d+(?:\.5)?)", path.stem)
    if m2:
        return m2.group(1)
    return path.stem.replace("feature-", "")


selected_feature_files = feature_files
if feature_filter:
    selected_feature_files = [p for p in feature_files if get_feature_id(p) == feature_filter]
    if not selected_feature_files:
        raise SystemExit(f"No feature files matched Feature ID '{feature_filter}'")


def parse_list(raw: str):
    if not raw:
        return []
    val = raw.strip()
    if val in ("none", "\u2014", "-", ""):
        return []
    items = [x.strip().strip("`") for x in val.split(",")]
    return [x for x in items if x and x not in ("none", "\u2014")]


def parse_tasks(path: Path):
    lines = path.read_text(encoding="utf-8").splitlines()
    tasks = []
    i = 0
    while i < len(lines):
        line = lines[i]
        m = re.match(r"^- \[[ xX]\] `([^`]+)`\s+(.*)$", line)
        if m:
            task_id = m.group(1).strip()
            title = m.group(2).strip()
            deps = []
            blocks = []
            roadmap = ""
            j = i + 1
            while j < len(lines) and (lines[j].startswith("  ") or lines[j].strip() == ""):
                lj = lines[j].strip()
                if lj.lower().startswith("- dependencies:"):
                    deps = parse_list(lj.split(":", 1)[1])
                elif lj.lower().startswith("- blocks:"):
                    blocks = parse_list(lj.split(":", 1)[1])
                elif lj.lower().startswith("- roadmap ref:"):
                    roadmap = lj.split(":", 1)[1].strip()
                j += 1
            tasks.append({
                "task_id": task_id,
                "title": title,
                "dependencies": deps,
                "blocks": blocks,
                "roadmap": roadmap,
                "file": str(path),
            })
            i = j - 1
        i += 1
    return tasks


all_tasks = []
for f in selected_feature_files:
    all_tasks.extend(parse_tasks(f))

# Build desired blocks from dependencies (only selected features)
desired_blocks = {}
for task in all_tasks:
    for dep in task["dependencies"]:
        if re.match(r"^F\d{2}(\.5)?-[A-Z]{2}-\d{2}$", dep):
            desired_blocks.setdefault(dep, set()).add(task["task_id"])


def format_blocks_line(blocks):
    if not blocks:
        return "  - Blocks: none"
    formatted = ", ".join(f"`{b}`" for b in sorted(blocks))
    return f"  - Blocks: {formatted}"


planned_block_updates = []
if not no_blocks:
    for f in feature_files:
        lines = f.read_text(encoding="utf-8").splitlines()
        current_task_id = None
        for idx, line in enumerate(lines):
            m = re.match(r"^- \[[ xX]\] `([^`]+)`\s+", line)
            if m:
                current_task_id = m.group(1).strip()
                continue
            if current_task_id and re.match(r"^\s+- Blocks:", line):
                if current_task_id in desired_blocks:
                    existing = parse_list(line.split(":", 1)[1])
                    merged = set(existing)
                    merged.update(desired_blocks[current_task_id])
                    new_line = format_blocks_line(merged)
                    if new_line != line:
                        planned_block_updates.append({
                            "file": str(f),
                            "task_id": current_task_id,
                            "old": line,
                            "new": new_line,
                            "line": idx + 1,
                        })
                current_task_id = None


planned_stubs = []
if not no_stubs:
    today = datetime.now().strftime("%Y-%m-%d")
    for f in selected_feature_files:
        first_line = f.read_text(encoding="utf-8").splitlines()[0]
        m = feature_header_re.match(first_line)
        if m:
            feature_id = m.group(1).strip()
            feature_name = m.group(2).strip()
        else:
            feature_id = get_feature_id(f)
            feature_name = f.stem

        onboarding_path = onboarding_dir / f"feature-{feature_id}-onboarding.md"
        if not onboarding_path.exists():
            planned_stubs.append({"type": "onboarding", "path": str(onboarding_path), "feature_id": feature_id, "feature_name": feature_name})

        architecture_path = architecture_dir / f"feature-{feature_id}-architecture.md"
        if not architecture_path.exists():
            planned_stubs.append({"type": "architecture", "path": str(architecture_path), "feature_id": feature_id, "feature_name": feature_name})


print("Planned changes:\n")
if not no_blocks:
    print(f"- Blocks updates: {len(planned_block_updates)}" if planned_block_updates else "- Blocks updates: none")
if not no_index:
    print(f"- Regenerate index: {index_path}")
if not no_stubs:
    print(f"- Stub docs: {len(planned_stubs)} new files" if planned_stubs else "- Stub docs: none")
print("")

if dry_run:
    if planned_block_updates:
        print("Blocks updates preview:")
        for item in planned_block_updates[:20]:
            print(f"- {item['file']} [{item['task_id']}] line {item['line']}")
            print(f"  {item['old']}")
            print(f"  {item['new']}")
        if len(planned_block_updates) > 20:
            print("  ... (truncated)")
    if planned_stubs:
        print("Stub files to create:")
        for s in planned_stubs:
            print(f"- {s['type']}: {s['path']}")
    print("Dry run complete. No files changed.")
    raise SystemExit(0)

if prompt and not yes:
    resp = input("Apply changes? (y/N) ").strip().lower()
    if resp not in ("y", "yes"):
        print("Aborted by user.")
        raise SystemExit(0)

# Apply blocks updates
if not no_blocks:
    for f in feature_files:
        lines = f.read_text(encoding="utf-8").splitlines()
        changed = False
        current_task_id = None
        for idx, line in enumerate(lines):
            m = re.match(r"^- \[[ xX]\] `([^`]+)`\s+", line)
            if m:
                current_task_id = m.group(1).strip()
                continue
            if current_task_id and re.match(r"^\s+- Blocks:", line):
                if current_task_id in desired_blocks:
                    existing = parse_list(line.split(":", 1)[1])
                    merged = set(existing)
                    merged.update(desired_blocks[current_task_id])
                    new_line = format_blocks_line(merged)
                    if new_line != line:
                        lines[idx] = new_line
                        changed = True
                current_task_id = None
        if changed:
            f.write_text("\n".join(lines) + "\n", encoding="utf-8")

# Regenerate index (always full index for consistency)
if not no_index:
    out = []
    out.append("# Feature Task Index (condensed)")
    out.append("")
    for f in feature_files:
        out.append(f"## {f.name}")
        lines = f.read_text(encoding="utf-8").splitlines()
        i = 0
        while i < len(lines):
            line = lines[i]
            m = re.match(r"^- \[[ xX]\] `([^`]+)`\s+(.*)", line)
            if m:
                task_id = m.group(1).strip()
                title = m.group(2).strip()
                deps = ""; blocks = ""; roadmap = ""
                j = i + 1
                while j < len(lines) and (lines[j].startswith("  ") or lines[j].strip() == ""):
                    lj = lines[j].strip()
                    if lj.lower().startswith("- dependencies:"):
                        deps = lj.split(":", 1)[1].strip()
                    elif lj.lower().startswith("- blocks:"):
                        blocks = lj.split(":", 1)[1].strip()
                    elif lj.lower().startswith("- roadmap ref:"):
                        roadmap = lj.split(":", 1)[1].strip()
                    j += 1
                out.append(f"- {task_id} | {title}")
                deps_out = deps if deps.strip() else "none"
                blocks_out = blocks if blocks.strip() else "none"
                roadmap_out = roadmap if roadmap.strip() else "—"
                out.append(f"  - Dependencies: {deps_out}")
                out.append(f"  - Blocks: {blocks_out}")
                out.append(f"  - Roadmap ref: {roadmap_out}")
                i = j - 1
            i += 1
        out.append("")
    index_path.write_text("\n".join(out) + "\n", encoding="utf-8")

# Create stubs
if not no_stubs:
    today = datetime.now().strftime("%Y-%m-%d")
    for s in planned_stubs:
        path = Path(s["path"])
        if s["type"] == "onboarding":
            content = f"""<!--
  Feature {s['feature_id']} On-Boarding Guide
  Version: 1.0 ({today}, auto-generated)
  Status: Draft
-->

# Feature {s['feature_id']} – {s['feature_name']}: On-Boarding Guide

## Quick Start

### 1) Open the feature surface
1. Navigate to the primary route for this feature
2. Verify the core panel(s) render

### 2) Run the core flow
1. Complete the first Must-Have task path end-to-end
2. Confirm expected UI + data changes

---

## Feature Overview

### What You Get
- Core capability summary (fill in)
- Key user impact (fill in)

---

## Testing Guide

### Must-Have Tasks
- [ ] F{s['feature_id']}-MH-01: …

---

## Key Files
- `docs/tasks/feature-{s['feature_id']}-*.md`

---

## Debugging Guide

### Issue: [describe]
**Check:**
1. …
2. …

---

## Related Docs
- `/docs/tasks/feature-{s['feature_id']}-*.md`
- `/docs/architecture/feature-{s['feature_id']}-architecture.md`
"""
            path.write_text(content, encoding="utf-8")
        elif s["type"] == "architecture":
            content = f"""# Feature {s['feature_id']} – {s['feature_name']}: Architecture
**Status:** Draft
**Last updated:** {today}

## Summary
Describe the high-level architecture for Feature {s['feature_id']}.

## Components
- UI components:
- Backend services:
- Data stores:

## Data Flow
1. …
2. …

## APIs
- `GET /api/...`
- `POST /api/...`

## Dependencies
- Upstream features:
- External services:

## Risks
- Risk 1:
- Risk 2:
"""
            path.write_text(content, encoding="utf-8")

print("Feature pipeline complete.")
print("")
print("Next steps (choose one):")
print(f"1) Start Feature implementation with model {required_model} (e.g., F11-MH-01)")
print("2) Generate onboarding + architecture content for the feature")
print("3) Update roadmap refs or QA status")
PY
