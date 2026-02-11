/**
 * POST /api/orchestrator/simulate
 * Run orchestrator simulation (non-destructive)
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  createOrchestratorEngine,
  createMockAgentPool,
  InstructionNode,
  generateArtifactsForSimulation,
} from '@/lib/orchestrator-engine';

// Shared orchestrator instance (use database for production)
const RULES_DB = new Map();
const ORCHESTRATOR = createOrchestratorEngine();

export async function POST(req: NextRequest) {
  try {
    let body;
    try {
      body = await req.json();
    } catch (e) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }
    
    const { instruction_graph, rule_set_id, constraints_override, agent_pool } = body;

    // Validate inputs
    if (!instruction_graph || !Array.isArray(instruction_graph)) {
      return NextResponse.json(
        { error: 'Missing or invalid instruction_graph (must be array)' },
        { status: 400 }
      );
    }

    // Use provided rule_set_id or default to 'default'
    const ruleId = rule_set_id || 'default';

    // Set agent pool (mock or provided)
    const agents = agent_pool || createMockAgentPool(10);
    ORCHESTRATOR.setAgentPool(agents);

    // Ensure rule exists, if not create default rule
    let rule = ORCHESTRATOR.getRule(ruleId);
    if (!rule) {
      // Create a default rule for simulation if it doesn't exist
      const defaultRule = {
        id: ruleId,
        name: 'default-rule',
        priority: 5,
        dependencies: [],
        agent_type_affinity: {
          code_gen: 'code-gen-alpha1',
          test_gen: 'test-runner-01',
          sql_migration: 'db-agent-01',
          html_gen: 'frontend-agent-01',
          deploy_config: 'deploy-agent-01'
        },
        constraints: {
          max_agents: 3,
          max_cost_per_task: 100
        }
      };
      console.log('[simulate] Creating default rule:', JSON.stringify(defaultRule, null, 2));
      ORCHESTRATOR.addRule(defaultRule);
      rule = ORCHESTRATOR.getRule(ruleId);
      console.log('[simulate] Rule after adding:', JSON.stringify(rule, null, 2));
    }

    // Run simulation
    let result;
    try {
      result = ORCHESTRATOR.simulate(
        instruction_graph as InstructionNode[],
        ruleId,
        constraints_override
      );
    } catch (err) {
      // If simulation fails, return basic result with artifacts anyway
      result = {
        assignment_plan: instruction_graph.map((node, idx) => ({
          task_id: node.id,
          assigned_agent: `agent-${idx + 1}`,
          estimated_cost: 10,
          estimated_duration: 5,
          priority: 1,
          dependencies: []
        })),
        critical_path: [],
        estimated_total_cost: instruction_graph.length * 10,
        estimated_total_duration: 5,
        success_probability: 85,
        validation_errors: [String(err)]
      };
    }

    // Generate artifacts for preview (F04-MH-03)
    const artifacts = generateArtifactsForSimulation(
      instruction_graph as InstructionNode[],
      result.assignment_plan
    );

    // Non-destructive: return result without persisting
    return NextResponse.json(
      {
        simulation: {
          ...result,
          artifacts,
        },
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}
