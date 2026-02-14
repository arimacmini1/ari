param(
  [string]$Feature,
  [switch]$NoIndex,
  [switch]$NoBlocks,
  [switch]$NoStubs,
  [switch]$DryRun,
  [switch]$Prompt
)

$ErrorActionPreference = "Stop";
$RequiredImplementationModel = "gpt-5.3-codex"

$root = Resolve-Path (Join-Path $PSScriptRoot "..");
$taskDir = Join-Path $root "docs/tasks";
$onboardingDir = Join-Path $root "docs/on-boarding";
$architectureDir = Join-Path $root "docs/architecture";
$indexPath = Join-Path $taskDir "feature-task-index.md";
$statusPath = Join-Path $root "docs/process/feature-status.json";

$featureFiles = Get-ChildItem -Path $taskDir -Filter "feature-*.md" | Sort-Object Name;
if (-not $featureFiles) { throw "No feature files found in $taskDir" }

function Get-FeatureIdFromFile([string]$path) {
  $firstLine = (Get-Content $path -TotalCount 1);
  if ($firstLine -match '^# Feature\s+(\d+(?:\.5)?)\s+–\s+(.+)$') {
    return $Matches[1].Trim();
  }
  return ($path | Split-Path -LeafBase) -replace '^feature-','';
}

if ($Feature) {
  $featureFiles = $featureFiles | Where-Object { (Get-FeatureIdFromFile $_.FullName) -eq $Feature };
  if (-not $featureFiles) { throw "No feature files matched Feature ID '$Feature'" }
}

function Parse-List([string]$raw) {
  if (-not $raw) { return @() }
  $val = $raw.Trim();
  if ($val -eq "none" -or $val -eq "—" -or $val -eq "-" -or $val -eq "") { return @() }
  return ($val -split ",") | ForEach-Object {
    $_.Trim().Trim('`')
  } | Where-Object { $_ -and $_ -ne "none" -and $_ -ne "—" }
}

function Parse-Tasks([string]$path) {
  $lines = Get-Content $path;
  $tasks = @();
  for ($i = 0; $i -lt $lines.Count; $i++) {
    $line = $lines[$i];
    if ($line -match '^- \[[ xX]\] `([^`]+)`\s+(.*)$') {
      $taskId = $Matches[1].Trim();
      $title = $Matches[2].Trim();
      $deps = @();
      $blocks = @();
      $roadmap = "";
      $j = $i + 1;
      while ($j -lt $lines.Count -and ($lines[$j].StartsWith("  ") -or $lines[$j].Trim() -eq "")) {
        $lj = $lines[$j].Trim();
        if ($lj.ToLower().StartsWith("- dependencies:")) {
          $deps = Parse-List ($lj.Split(':',2)[1]);
        } elseif ($lj.ToLower().StartsWith("- blocks:")) {
          $blocks = Parse-List ($lj.Split(':',2)[1]);
        } elseif ($lj.ToLower().StartsWith("- roadmap ref:")) {
          $roadmap = $lj.Split(':',2)[1].Trim();
        }
        $j++;
      }
      $tasks += [pscustomobject]@{
        TaskId = $taskId;
        Title = $title;
        Dependencies = $deps;
        Blocks = $blocks;
        Roadmap = $roadmap;
        File = $path;
      };
      $i = $j - 1;
    }
  }
  return $tasks;
}

$allTasks = @();
foreach ($file in $featureFiles) {
  $allTasks += Parse-Tasks $file.FullName;
}

# Build desired Blocks from Dependencies
$desiredBlocks = @{};
foreach ($task in $allTasks) {
  foreach ($dep in $task.Dependencies) {
    if ($dep -match '^F\d{2}(\.5)?-[A-Z]{2}-\d{2}$') {
      if (-not $desiredBlocks.ContainsKey($dep)) { $desiredBlocks[$dep] = New-Object System.Collections.Generic.HashSet[string] }
      $null = $desiredBlocks[$dep].Add($task.TaskId);
    }
  }
}

function Format-BlocksLine([string[]]$blocks) {
  if (-not $blocks -or $blocks.Count -eq 0) { return "  - Blocks: none" }
  $formatted = $blocks | ForEach-Object { "`$_`" };
  return "  - Blocks: " + ($formatted -join ", ");
}

$plannedBlockUpdates = New-Object System.Collections.Generic.List[pscustomobject];
if (-not $NoBlocks) {
  foreach ($file in (Get-ChildItem -Path $taskDir -Filter "feature-*.md")) {
    $lines = Get-Content $file.FullName;
    $currentTaskId = $null;
    for ($i = 0; $i -lt $lines.Count; $i++) {
      $line = $lines[$i];
      if ($line -match '^- \[[ xX]\] `([^`]+)`\s+') {
        $currentTaskId = $Matches[1].Trim();
        continue;
      }
      if ($currentTaskId -and $line -match '^\s+- Blocks:') {
        if ($desiredBlocks.ContainsKey($currentTaskId)) {
          $existing = Parse-List ($line.Split(':',2)[1]);
          $merged = New-Object System.Collections.Generic.HashSet[string];
          foreach ($b in $existing) { $null = $merged.Add($b) }
          foreach ($b in $desiredBlocks[$currentTaskId]) { $null = $merged.Add($b) }
          $newLine = Format-BlocksLine (($merged.ToArray() | Sort-Object));
          if ($newLine -ne $line) {
            $plannedBlockUpdates.Add([pscustomobject]@{
              File = $file.FullName
              TaskId = $currentTaskId
              Old = $line
              New = $newLine
              Line = $i + 1
            });
          }
        }
        $currentTaskId = $null;
      }
    }
  }
}

$plannedStubs = New-Object System.Collections.Generic.List[pscustomobject];
if (-not $NoStubs) {
  $today = (Get-Date -Format "yyyy-MM-dd");
  foreach ($file in $featureFiles) {
    $firstLine = (Get-Content $file.FullName -TotalCount 1);
    $featureId = $null;
    $featureName = $null;
    if ($firstLine -match '^# Feature\s+(\d+(?:\.5)?)\s+–\s+(.+)$') {
      $featureId = $Matches[1].Trim();
      $featureName = $Matches[2].Trim();
    } else {
      $featureId = ($file.BaseName -replace '^feature-','');
      $featureName = $file.BaseName;
    }

    $onboardingPath = Join-Path $onboardingDir ("feature-{0}-onboarding.md" -f $featureId);
    if (-not (Test-Path $onboardingPath)) {
      $plannedStubs.Add([pscustomobject]@{ Type = "onboarding"; Path = $onboardingPath; FeatureId = $featureId; FeatureName = $featureName });
    }

    $architecturePath = Join-Path $architectureDir ("feature-{0}-architecture.md" -f $featureId);
    if (-not (Test-Path $architecturePath)) {
      $plannedStubs.Add([pscustomobject]@{ Type = "architecture"; Path = $architecturePath; FeatureId = $featureId; FeatureName = $featureName });
    }
  }
}

$planSummary = New-Object System.Collections.Generic.List[string];
$planSummary.Add("Planned changes:");
$planSummary.Add("");
if (-not $NoBlocks) {
  if ($plannedBlockUpdates.Count -eq 0) {
    $planSummary.Add("- Blocks updates: none");
  } else {
    $planSummary.Add("- Blocks updates: $($plannedBlockUpdates.Count)");
  }
}
if (-not $NoIndex) {
  $planSummary.Add("- Regenerate index: $indexPath");
}
if (-not $NoStubs) {
  if ($plannedStubs.Count -eq 0) {
    $planSummary.Add("- Stub docs: none");
  } else {
    $planSummary.Add("- Stub docs: $($plannedStubs.Count) new files");
  }
}

$planSummary | ForEach-Object { Write-Host $_ };
Write-Host "";

if ($DryRun) {
  if ($plannedBlockUpdates.Count -gt 0) {
    Write-Host "Blocks updates preview:";
    $plannedBlockUpdates | Select-Object -First 20 | ForEach-Object {
      Write-Host "- $($_.File) [$($_.TaskId)] line $($_.Line)";
      Write-Host "  $($_.Old)";
      Write-Host "  $($_.New)";
    };
    if ($plannedBlockUpdates.Count -gt 20) { Write-Host "  ... (truncated)" }
  }
  if ($plannedStubs.Count -gt 0) {
    Write-Host "Stub files to create:";
    $plannedStubs | ForEach-Object { Write-Host "- $($_.Type): $($_.Path)" };
  }
  Write-Host "Dry run complete. No files changed.";
  return;
}

if ($Prompt) {
  $response = Read-Host "Apply changes? (y/N)";
  if ($response -notin @("y","Y","yes","YES")) {
    Write-Host "Aborted by user.";
    return;
  }
}

if (-not $NoBlocks) {
  foreach ($file in (Get-ChildItem -Path $taskDir -Filter "feature-*.md")) {
    $lines = Get-Content $file.FullName;
    $changed = $false;
    $currentTaskId = $null;
    for ($i = 0; $i -lt $lines.Count; $i++) {
      $line = $lines[$i];
      if ($line -match '^- \[[ xX]\] `([^`]+)`\s+') {
        $currentTaskId = $Matches[1].Trim();
        continue;
      }
      if ($currentTaskId -and $line -match '^\s+- Blocks:') {
        if ($desiredBlocks.ContainsKey($currentTaskId)) {
          $existing = Parse-List ($line.Split(':',2)[1]);
          $merged = New-Object System.Collections.Generic.HashSet[string];
          foreach ($b in $existing) { $null = $merged.Add($b) }
          foreach ($b in $desiredBlocks[$currentTaskId]) { $null = $merged.Add($b) }
          $newLine = Format-BlocksLine (($merged.ToArray() | Sort-Object));
          if ($newLine -ne $line) {
            $lines[$i] = $newLine;
            $changed = $true;
          }
        }
        $currentTaskId = $null;
      }
    }
    if ($changed) {
      Set-Content -Path $file.FullName -Value $lines -Encoding UTF8;
    }
  }
}

if (-not $NoIndex) {
  $out = New-Object System.Collections.Generic.List[string];
  $out.Add("# Feature Task Index (condensed)");
  $out.Add("");
  foreach ($file in $featureFiles) {
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
  $out | Set-Content -Path $indexPath -Encoding UTF8;
}

if (-not $NoStubs) {
  $today = (Get-Date -Format "yyyy-MM-dd");
  foreach ($stub in $plannedStubs) {
    if ($stub.Type -eq "onboarding") {
      @"
<!--
  Feature $($stub.FeatureId) On-Boarding Guide
  Version: 1.0 ($today, auto-generated)
  Status: Draft
-->

# Feature $($stub.FeatureId) – $($stub.FeatureName): On-Boarding Guide

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
- [ ] F$($stub.FeatureId)-MH-01: …

---

## Key Files
- `docs/tasks/feature-$($stub.FeatureId)-*.md`

---

## Debugging Guide

### Issue: [describe]
**Check:**
1. …
2. …

---

## Related Docs
- `/docs/tasks/feature-$($stub.FeatureId)-*.md`
- `/docs/architecture/feature-$($stub.FeatureId)-architecture.md`
"@ | Set-Content -Path $stub.Path -Encoding UTF8;
    }

    if ($stub.Type -eq "architecture") {
      @"
# Feature $($stub.FeatureId) – $($stub.FeatureName): Architecture
**Status:** Draft
**Last updated:** $today

## Summary
Describe the high-level architecture for Feature $($stub.FeatureId).

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
"@ | Set-Content -Path $stub.Path -Encoding UTF8;
    }
  }
}

Write-Host "Feature pipeline complete.";
Write-Host "";
Write-Host "Next steps (choose one):";
Write-Host "1) Start Feature implementation with model $RequiredImplementationModel (e.g., F11-MH-01)";
Write-Host "2) Generate onboarding + architecture content for the feature";
Write-Host "3) Update roadmap refs or QA status";
