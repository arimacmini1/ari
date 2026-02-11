# Test Artifact Workflow Script (PowerShell)
# For Windows/WSL environments

$BaseURL = "http://localhost:3000"
$CanvasFile = "public/sample-canvas.json"

Write-Host "🎯 Feature-04 Artifact Workflow Test" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Load canvas
Write-Host "📋 Step 1: Loading Prompt Canvas..." -ForegroundColor Yellow
if (-not (Test-Path $CanvasFile)) {
  Write-Host "❌ Canvas file not found: $CanvasFile" -ForegroundColor Red
  exit 1
}
$Canvas = Get-Content $CanvasFile -Raw
Write-Host "✅ Canvas loaded" -ForegroundColor Green
Write-Host ""

# Step 2: Build instruction graph
Write-Host "📊 Step 2: Building instruction graph from canvas..." -ForegroundColor Yellow
$InstructionGraph = @(
  @{
    id = "task-1"
    type = "code_gen"
    label = "Generate Product API"
    metadata = @{ language = "python"; framework = "FastAPI" }
  },
  @{
    id = "task-2"
    type = "test_gen"
    label = "Write Unit Tests"
    metadata = @{ language = "python"; framework = "pytest" }
  },
  @{
    id = "task-3"
    type = "sql_migration"
    label = "Design Database Schema"
    metadata = @{ database = "postgresql" }
  },
  @{
    id = "task-4"
    type = "html_gen"
    label = "Build Web Dashboard"
    metadata = @{ framework = "React" }
  },
  @{
    id = "task-5"
    type = "deploy_config"
    label = "Docker Deployment"
    metadata = @{ platform = "Docker" }
  }
) | ConvertTo-Json -Depth 10

Write-Host "✅ Instruction graph built with 5 tasks" -ForegroundColor Green
Write-Host ""

# Step 3: Run orchestrator simulation
Write-Host "🚀 Step 3: Running orchestrator simulation..." -ForegroundColor Yellow

$Body = @{
  instruction_graph = ($InstructionGraph | ConvertFrom-Json)
  rule_set_id = "default"
  constraints = @{
    max_agents = 3
    timeout_ms = 5000
  }
} | ConvertTo-Json -Depth 10

try {
  $Response = Invoke-WebRequest -Uri "$BaseURL/api/orchestrator/simulate" `
    -Method POST `
    -Headers @{"Content-Type" = "application/json"} `
    -Body $Body `
    -ErrorAction Stop

  $ResponseJson = $Response.Content | ConvertFrom-Json
  Write-Host "✅ Response received" -ForegroundColor Green
  Write-Host ""

  # Step 4: Extract and validate artifacts
  Write-Host "📦 Step 4: Validating artifacts..." -ForegroundColor Yellow
  
  if ($null -ne $ResponseJson.simulation.artifacts) {
    $ArtifactCount = $ResponseJson.simulation.artifacts.Count
    Write-Host "✅ Found $ArtifactCount artifacts" -ForegroundColor Green
  } else {
    Write-Host "⚠️  No artifacts found in response" -ForegroundColor Yellow
    $ArtifactCount = 0
  }
  Write-Host ""

  # Display summary
  if ($ArtifactCount -gt 0) {
    Write-Host "📋 Artifact Summary:" -ForegroundColor Cyan
    $ResponseJson.simulation.artifacts | ForEach-Object {
      Write-Host "  Type: $($_.type), Language: $($_.language // 'N/A'), Size: $($_.content.Length) bytes" -ForegroundColor Gray
    }
    Write-Host ""
  }

  # Display metrics
  Write-Host "📊 Simulation Metrics:" -ForegroundColor Cyan
  Write-Host "  Total Cost: $($ResponseJson.simulation.estimated_total_cost)" -ForegroundColor Gray
  Write-Host "  Total Duration: $($ResponseJson.simulation.estimated_total_duration)s" -ForegroundColor Gray
  Write-Host "  Success Probability: $($ResponseJson.simulation.success_probability)%" -ForegroundColor Gray
  Write-Host ""

  Write-Host "✅ Workflow test complete!" -ForegroundColor Green
  Write-Host ""
  Write-Host "Next steps:" -ForegroundColor Cyan
  Write-Host "1. Verify artifacts generated successfully" -ForegroundColor Gray
  Write-Host "2. Test UI integration at http://localhost:3000/orchestrator" -ForegroundColor Gray
  Write-Host "3. Use copy/export buttons to save artifacts" -ForegroundColor Gray
} catch {
  Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor Red
  exit 1
}
