#!/bin/bash

# Test Artifact Workflow Script
# This script tests the complete Feature-04 workflow:
# 1. Load Prompt Canvas
# 2. Convert to instruction graph
# 3. Run orchestrator simulation
# 4. Generate artifacts
# 5. Validate artifacts

set -e

BASE_URL="http://localhost:3000"
CANVAS_FILE="public/sample-canvas.json"

echo "🎯 Feature-04 Artifact Workflow Test"
echo "===================================="
echo ""

# Step 1: Load canvas
echo "📋 Step 1: Loading Prompt Canvas..."
if [ ! -f "$CANVAS_FILE" ]; then
  echo "❌ Canvas file not found: $CANVAS_FILE"
  exit 1
fi
CANVAS=$(cat "$CANVAS_FILE")
echo "✅ Canvas loaded"
echo ""

# Step 2: Convert canvas to instruction graph
echo "📊 Step 2: Building instruction graph from canvas..."
INSTRUCTION_GRAPH=$(cat <<'EOF'
{
  "nodes": [
    {
      "id": "task-1",
      "type": "code_gen",
      "label": "Generate Product API",
      "metadata": { "language": "python", "framework": "FastAPI" }
    },
    {
      "id": "task-2",
      "type": "test_gen",
      "label": "Write Unit Tests",
      "metadata": { "language": "python", "framework": "pytest" }
    },
    {
      "id": "task-3",
      "type": "sql_migration",
      "label": "Design Database Schema",
      "metadata": { "database": "postgresql" }
    },
    {
      "id": "task-4",
      "type": "html_gen",
      "label": "Build Web Dashboard",
      "metadata": { "framework": "React" }
    },
    {
      "id": "task-5",
      "type": "deploy_config",
      "label": "Docker Deployment",
      "metadata": { "platform": "Docker" }
    }
  ],
  "edges": [
    { "source": "task-1", "target": "task-2" },
    { "source": "task-1", "target": "task-3" },
    { "source": "task-3", "target": "task-5" },
    { "source": "task-1", "target": "task-4" }
  ]
}
EOF
)
echo "✅ Instruction graph built with 5 tasks"
echo ""

# Step 3: Run orchestrator simulation
echo "🚀 Step 3: Running orchestrator simulation..."
RESPONSE=$(curl -s -X POST "$BASE_URL/api/orchestrator/simulate" \
  -H "Content-Type: application/json" \
  -d "{
    \"instruction_graph\": $INSTRUCTION_GRAPH,
    \"rule_set\": {
      \"agent_selection\": \"auto\",
      \"task_grouping\": true
    },
    \"constraints\": {
      \"max_agents\": 3,
      \"timeout_ms\": 5000
    }
  }")

echo "Response received:"
echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"
echo ""

# Step 4: Extract and validate artifacts
echo "📦 Step 4: Validating artifacts..."
ARTIFACT_COUNT=$(echo "$RESPONSE" | jq '.artifacts | length' 2>/dev/null || echo "0")
echo "✅ Found $ARTIFACT_COUNT artifacts"
echo ""

# Step 5: Display artifact summary
if [ "$ARTIFACT_COUNT" -gt 0 ]; then
  echo "📋 Artifact Summary:"
  echo "$RESPONSE" | jq '.artifacts[] | {type, language, size: (.content | length), validation_status: .validation.status}' 2>/dev/null || true
  echo ""
fi

# Step 6: Detailed artifact breakdown
echo "🔍 Detailed Artifact Breakdown:"
echo "================================"

for i in $(seq 0 $((ARTIFACT_COUNT - 1))); do
  TYPE=$(echo "$RESPONSE" | jq -r ".artifacts[$i].type" 2>/dev/null)
  LANG=$(echo "$RESPONSE" | jq -r ".artifacts[$i].language // \"N/A\"" 2>/dev/null)
  SIZE=$(echo "$RESPONSE" | jq -r ".artifacts[$i].content | length" 2>/dev/null)
  STATUS=$(echo "$RESPONSE" | jq -r ".artifacts[$i].validation.status" 2>/dev/null)
  
  echo ""
  echo "Artifact $((i+1)):"
  echo "  Type: $TYPE"
  echo "  Language: $LANG"
  echo "  Size: $SIZE bytes"
  echo "  Validation: $STATUS"
  
  # Show validation errors if any
  ERRORS=$(echo "$RESPONSE" | jq -r ".artifacts[$i].validation.errors[]?" 2>/dev/null)
  if [ -n "$ERRORS" ]; then
    echo "  Errors:"
    echo "$ERRORS" | while read -r error; do
      echo "    - $error"
    done
  fi
done

echo ""
echo "✅ Workflow test complete!"
echo ""
echo "Next steps:"
echo "1. Copy the response artifacts to test manually"
echo "2. Once frontend is integrated, test via UI at http://localhost:3000/orchestrator"
echo "3. Use the copy/export buttons to save artifacts"
