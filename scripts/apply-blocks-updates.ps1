param(
  [string]$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
  [string]$SummaryJson = ""
)

$tasksDir = Join-Path $Root "docs/tasks"
if ([string]::IsNullOrWhiteSpace($SummaryJson)) {
  $SummaryJson = Join-Path $tasksDir "blocks-update-summary.json"
}

if (-not (Test-Path $SummaryJson)) {
  Write-Error "Summary JSON not found at $SummaryJson. Run scripts/update-blocks-summary.ps1 first."
  exit 1
}

$raw = Get-Content -Path $SummaryJson -Raw | ConvertFrom-Json
if (-not $raw) {
  Write-Error "Summary JSON is empty."
  exit 1
}

$updates = @{}
foreach ($e in $raw) {
  $targetFile = $e.targetFile
  $taskId = $e.taskId
  $addBlocksRaw = $e.addBlocks
  if ([string]::IsNullOrWhiteSpace($targetFile) -or [string]::IsNullOrWhiteSpace($taskId)) { continue }

  $addBlocks = @()
  $addBlocksRaw -split "," | ForEach-Object {
    $v = $_.Trim().Trim('`')
    if (-not [string]::IsNullOrWhiteSpace($v)) { $addBlocks += $v }
  }
  if ($addBlocks.Count -eq 0) { continue }

  $key = "$targetFile|$taskId"
  if (-not $updates.ContainsKey($key)) {
    $updates[$key] = New-Object System.Collections.Generic.List[string]
  }
  foreach ($b in $addBlocks) {
    if (-not $updates[$key].Contains($b)) { $updates[$key].Add($b) }
  }
}

foreach ($key in $updates.Keys) {
  $parts = $key.Split("|")
  $targetFile = $parts[0]
  $taskId = $parts[1]

  $targetPath = Join-Path $tasksDir $targetFile
  if (-not (Test-Path $targetPath)) {
    Write-Warning "Missing target file: $targetPath"
    continue
  }

  $lines = Get-Content -Path $targetPath
  $taskLineIdx = -1
  for ($i = 0; $i -lt $lines.Count; $i++) {
    $pattern = '^\- \[[ xX]\]\s+`{0}`' -f [regex]::Escape($taskId)
    if ($lines[$i] -match $pattern) {
      $taskLineIdx = $i
      break
    }
  }
  if ($taskLineIdx -lt 0) {
    Write-Warning "Task $taskId not found in $targetFile"
    continue
  }

  $blocksIdx = -1
  for ($j = $taskLineIdx + 1; $j -lt [Math]::Min($lines.Count, $taskLineIdx + 20); $j++) {
    if ($lines[$j] -match "^\s*- Blocks:") {
      $blocksIdx = $j
      break
    }
    if ($lines[$j] -match "^\- \[[ xX]\]") { break }
  }
  if ($blocksIdx -lt 0) {
    Write-Warning "Blocks field not found for $taskId in $targetFile"
    continue
  }

  $existing = $lines[$blocksIdx].Split(":", 2)[1].Trim()
  $existingBlocks = @()
  if (-not [string]::IsNullOrWhiteSpace($existing) -and $existing -ne "none") {
    $existing -split "," | ForEach-Object {
      $v = $_.Trim().Trim('`')
      if (-not [string]::IsNullOrWhiteSpace($v)) { $existingBlocks += $v }
    }
  }

  foreach ($b in $updates[$key]) {
    if (-not ($existingBlocks -contains $b)) { $existingBlocks += $b }
  }

  if ($existingBlocks.Count -eq 0) {
    $lines[$blocksIdx] = "  - Blocks: none"
  } else {
    $formatted = ($existingBlocks | ForEach-Object { ('`{0}`' -f $_) }) -join ", "
    $lines[$blocksIdx] = "  - Blocks: $formatted"
  }

  $lines | Set-Content -Path $targetPath -Encoding UTF8
}

Write-Output "Blocks updates applied."
