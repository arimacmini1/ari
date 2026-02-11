/**
 * Artifact Generator
 * Feature: F04-MH-03
 *
 * Generates mock artifacts for orchestrator tasks
 * Used during simulation to preview what will be generated
 */

import { ArtifactFactory, type ArtifactType, type Artifact } from './artifact-model'
import type { InstructionNode, TaskAssignment } from './orchestrator-engine'

/**
 * Mock artifact templates for common task types
 */
const ARTIFACT_TEMPLATES: Record<string, { type: ArtifactType; language?: string; template: string }[]> = {
  code_gen: [
    {
      type: 'code',
      language: 'python',
      template: `# Generated Python function
# Task: {{task_id}}
# Type: {{task_type}}

def process_data(input_data: dict) -> dict:
    """
    Auto-generated function.
    TODO: Implement business logic
    """
    result = {
        'status': 'ok',
        'data': input_data,
        'processed_at': '{{timestamp}}'
    }
    return result

# Testing
if __name__ == '__main__':
    test_input = {'key': 'value'}
    output = process_data(test_input)
    print(output)
    `,
    },
    {
      type: 'code',
      language: 'javascript',
      template: `// Generated JavaScript function
// Task: {{task_id}}
// Type: {{task_type}}

async function processData(inputData) {
  /**
   * Auto-generated function.
   * TODO: Implement business logic
   */
  const result = {
    status: 'ok',
    data: inputData,
    processedAt: new Date().toISOString(),
  };
  
  return result;
}

// Usage
(async () => {
  const testInput = { key: 'value' };
  const output = await processData(testInput);
  console.log(output);
})();
    `,
    },
  ],

  test_gen: [
    {
      type: 'test',
      language: 'python',
      template: `# Generated pytest test suite
# Task: {{task_id}}
# Type: {{task_type}}

import pytest

class TestGenerated:
    """Auto-generated test class."""
    
    def test_basic_functionality(self):
        """TODO: Test basic functionality."""
        assert True
    
    def test_error_handling(self):
        """TODO: Test error handling."""
        assert True
    
    def test_edge_cases(self):
        """TODO: Test edge cases."""
        assert True

if __name__ == '__main__':
    pytest.main([__file__, '-v'])
    `,
    },
  ],

  deploy_config: [
    {
      type: 'dockerfile',
      template: `# Generated Dockerfile
# Task: {{task_id}}
# Type: {{task_type}}

FROM python:3.11-slim

WORKDIR /app

# TODO: Copy source files
# COPY . .

# TODO: Install dependencies
# RUN pip install -r requirements.txt

# TODO: Set entrypoint
# ENTRYPOINT ["python", "main.py"]

EXPOSE 8000
    `,
    },
    {
      type: 'config',
      language: 'yaml',
      template: `# Generated docker-compose configuration
# Task: {{task_id}}
# Type: {{task_type}}

version: '3.8'

services:
  app:
    build: .
    ports:
      - "8000:8000"
    environment:
      - DEBUG=false
      - LOG_LEVEL=info
    # TODO: Add more configuration

volumes:
  data:
    driver: local
    `,
    },
  ],

  api_spec: [
    {
      type: 'json',
      template: `{
  "openapi": "3.0.0",
  "info": {
    "title": "Generated API Spec",
    "version": "1.0.0",
    "description": "Auto-generated OpenAPI specification for task {{task_id}}"
  },
  "paths": {
    "/api/endpoint": {
      "get": {
        "summary": "TODO: Add endpoint summary",
        "responses": {
          "200": {
            "description": "Success",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          }
        }
      }
    }
  }
}
    `,
    },
  ],

  sql_migration: [
    {
      type: 'sql',
      template: `-- Generated SQL migration
-- Task: {{task_id}}
-- Type: {{task_type}}

BEGIN;

-- TODO: Create tables, indexes, constraints
CREATE TABLE IF NOT EXISTS generated_table (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP DEFAULT NOW(),
    data JSONB,
    status VARCHAR(50) DEFAULT 'pending'
);

CREATE INDEX IF NOT EXISTS idx_status ON generated_table(status);

-- TODO: Add more migrations

COMMIT;
    `,
    },
  ],

  documentation: [
    {
      type: 'markdown',
      template: `# Generated Documentation
Generated for task: {{task_id}}
Type: {{task_type}}

## Overview
TODO: Describe what this generates.

## Usage
\`\`\`bash
# TODO: Add usage examples
\`\`\`

## Configuration
- **Setting 1**: TODO
- **Setting 2**: TODO

## Troubleshooting
- **Issue**: TODO
  **Solution**: TODO
    `,
    },
  ],

  html_gen: [
    {
      type: 'html',
      template: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Generated Component - {{task_id}}</title>
    <style>
        body {
            font-family: system-ui, sans-serif;
            margin: 0;
            padding: 20px;
            background: #f5f5f5;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        h1 {
            color: #333;
            margin-top: 0;
        }
        .placeholder {
            padding: 20px;
            background: #f0f0f0;
            border-radius: 4px;
            text-align: center;
            color: #666;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Generated Component</h1>
        <div class="placeholder">
            <p>TODO: Add component content here</p>
            <p>Task: {{task_id}}</p>
            <p>Type: {{task_type}}</p>
        </div>
    </div>
</body>
</html>
    `,
    },
  ],
}

export interface GeneratedArtifact extends Artifact {
  task_id: string
  task_type: string
}

/**
 * Generate mock artifacts for a task assignment
 */
export function generateArtifactsForTask(
  task: InstructionNode,
  assignment: TaskAssignment
): GeneratedArtifact[] {
  const taskType = task.type.toLowerCase()
  const templates = ARTIFACT_TEMPLATES[taskType] || ARTIFACT_TEMPLATES['code_gen']

  const timestamp = new Date().toISOString()

  return templates.map((tmpl) => {
    // Replace template variables
    let content = tmpl.template
      .replace(/\{\{task_id\}\}/g, task.id)
      .replace(/\{\{task_type\}\}/g, task.type)
      .replace(/\{\{timestamp\}\}/g, timestamp)

    // Create artifact
    const artifact = ArtifactFactory.create(tmpl.type, content, {
      language: tmpl.language as any,
      languageHint: tmpl.language,
    })

    return {
      ...artifact,
      task_id: task.id,
      task_type: task.type,
    }
  })
}

/**
 * Generate all artifacts for a simulation result
 * Used after assignment plan is computed
 */
export function generateAllArtifacts(
  tasks: InstructionNode[],
  assignments: TaskAssignment[]
): GeneratedArtifact[] {
  const assignmentMap = new Map(assignments.map((a) => [a.id, a]))
  const allArtifacts: GeneratedArtifact[] = []

  tasks.forEach((task) => {
    const assignment = assignmentMap.get(task.id)
    if (assignment) {
      const artifacts = generateArtifactsForTask(task, assignment)
      allArtifacts.push(...artifacts)
    }
  })

  return allArtifacts
}

/**
 * Generate a deterministic summary of artifacts for UI display
 */
export interface ArtifactSummary {
  count: number
  byType: Record<ArtifactType, number>
  totalSize: number
  generatedAt: string
}

export function summarizeArtifacts(artifacts: GeneratedArtifact[]): ArtifactSummary {
  const byType: Record<ArtifactType, number> = {
    code: 0,
    html: 0,
    json: 0,
    sql: 0,
    config: 0,
    test: 0,
    markdown: 0,
    svg: 0,
    dockerfile: 0,
    yaml: 0,
  }

  let totalSize = 0

  artifacts.forEach((artifact) => {
    byType[artifact.type]++
    totalSize += artifact.metadata.size
  })

  return {
    count: artifacts.length,
    byType,
    totalSize,
    generatedAt: new Date().toISOString(),
  }
}
