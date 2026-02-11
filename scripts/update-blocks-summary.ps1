param(
  [string]$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
)

$tasksDir = Join-Path $Root "docs/tasks"
$summaryMd = Join-Path $tasksDir "blocks-update-summary.md"
$summaryJson = Join-Path $tasksDir "blocks-update-summary.json"

$featureFiles = Get-ChildItem -Path $tasksDir -Filter "feature-*.md" | Sort-Object Name

$entries = New-Object System.Collections.Generic.List[object]

foreach ($file in $featureFiles) {
  $lines = Get-Content -Path $file.FullName
  $startIdx = -1
  for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i].Trim() -eq "## Blocks Update Patch (apply to previous feature files)") {
      $startIdx = $i + 1
      break
    }
  }
  if ($startIdx -lt 0) { continue }

  for ($j = $startIdx; $j -lt $lines.Count; $j++) {
    $line = $lines[$j].Trim()
    if ($line.StartsWith("## ")) { break }
    if (-not $line.StartsWith("|")) { continue }
    if ($line -match "^\|\s*-") { continue }
    if ($line -match "^\|\s*File\s*\|") { continue }

    $cols = $line.Trim("|").Split("|") | ForEach-Object { $_.Trim() }
    if ($cols.Count -lt 3) { continue }

    $targetFile = $cols[0]
    $taskId = $cols[1].Trim('`').Trim()
    $addBlocksRaw = $cols[2]

    if ([string]::IsNullOrWhiteSpace($targetFile) -or [string]::IsNullOrWhiteSpace($taskId)) { continue }

    $entries.Add([pscustomobject]@{
      sourceFeature = $file.Name
      targetFile = $targetFile
      taskId = $taskId
      addBlocks = $addBlocksRaw
    })
  }
}

$today = Get-Date -Format "yyyy-MM-dd"
$md = New-Object System.Collections.Generic.List[string]
$md.Add("# Blocks Update Summary")
$md.Add("")
$md.Add("Generated: $today")
$md.Add("Source: Blocks Update Patch tables in /docs/tasks/feature-*.md")
$md.Add("")
$md.Add("| Source Feature | Target File | Target Task ID | Add to Blocks |")
$md.Add("|----------------|-------------|----------------|---------------|")
foreach ($e in $entries) {
  $md.Add(('| {0} | {1} | `{2}` | {3} |' -f $e.sourceFeature, $e.targetFile, $e.taskId, $e.addBlocks))
}
$md.Add("")
$md.Add("Notes:")
$md.Add("- This file is generated. Do not edit manually.")
$md.Add('- Run `scripts/update-blocks-summary.ps1` after creating a new feature task file.')

$md | Set-Content -Path $summaryMd -Encoding UTF8

$entries | ConvertTo-Json -Depth 4 | Set-Content -Path $summaryJson -Encoding UTF8

Write-Output $summaryMd
