/**
 * POST /api/orchestrator/simulate
 * Run orchestrator simulation (non-destructive)
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  createMockAgentPool,
  InstructionNode,
  SimulationResult,
  generateArtifactsForSimulation,
} from '@/lib/orchestrator-engine';
import { getOrchestratorEngine } from '@/lib/orchestrator-store';
import type { Artifact, ArtifactType } from '@/lib/artifact-model';
import {
  getTemporalSimulationPreflight,
  runTemporalSimulationWorkflow,
} from '@/lib/temporal-simulation';

const ORCHESTRATOR = getOrchestratorEngine();
const ARTIFACT_TYPES: ArtifactType[] = [
  'code',
  'html',
  'json',
  'sql',
  'config',
  'test',
  'markdown',
  'svg',
  'dockerfile',
  'yaml',
];

function normalizeTemporalArtifacts(rawArtifacts: unknown[]): Artifact[] {
  return rawArtifacts.flatMap((raw, index) => {
    if (!raw || typeof raw !== 'object') return [];
    const candidate = raw as Record<string, unknown>;
    const type = String(candidate.type || '');
    const normalizedType = ARTIFACT_TYPES.includes(type as ArtifactType)
      ? (type as ArtifactType)
      : 'code';
    const content = String(candidate.content || '');
    const metadataCandidate =
      candidate.metadata && typeof candidate.metadata === 'object'
        ? (candidate.metadata as Record<string, unknown>)
        : {};
    const language = candidate.language ? String(candidate.language) : undefined;
    const size =
      typeof metadataCandidate.size === 'number'
        ? metadataCandidate.size
        : new TextEncoder().encode(content).length;
    const lines =
      typeof metadataCandidate.lines === 'number'
        ? metadataCandidate.lines
        : content.split(/\r?\n/).length;
    const createdAt =
      typeof metadataCandidate.created_at === 'string'
        ? metadataCandidate.created_at
        : new Date().toISOString();
    const versionId =
      typeof metadataCandidate.version_id === 'string'
        ? metadataCandidate.version_id
        : `temporal-artifact-${index}-${Date.now()}`;

    return [
      {
        type: normalizedType,
        language: language as Artifact['language'],
        content,
        metadata: {
          size,
          lines,
          created_at: createdAt,
          version_id: versionId,
          language: language as Artifact['language'],
        },
      },
    ];
  });
}

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
    let result: SimulationResult;
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
          id: String(node.id),
          assigned_agent_id_or_pool: `agent-${idx + 1}`,
          estimated_cost: 10,
          estimated_duration: 5,
          status: 'pending',
        })),
        critical_path: [],
        estimated_total_cost: instruction_graph.length * 10,
        estimated_total_duration: 5,
        success_probability: 85,
        validation_errors: [String(err)]
      };
    }

    let artifacts = generateArtifactsForSimulation(
      instruction_graph as InstructionNode[],
      result.assignment_plan
    );
    let simulationEngine: 'temporal' | 'legacy-mock' = 'legacy-mock';
    let temporalWorkflowId: string | null = null;

    const temporalPreflight = await getTemporalSimulationPreflight();
    if (temporalPreflight.ok) {
      try {
        const simulationId = `sim-${Date.now()}`;
        const temporal = await runTemporalSimulationWorkflow({
          simulation_id: simulationId,
          rule_set_id: ruleId,
          instruction_graph: instruction_graph as InstructionNode[],
          assignment_plan: result.assignment_plan,
          artifact_candidates: artifacts,
        });
        temporalWorkflowId = temporal.workflowId;
        const temporalArtifacts = normalizeTemporalArtifacts(
          Array.isArray(temporal.result.artifacts) ? temporal.result.artifacts : []
        );
        if (temporalArtifacts.length > 0) {
          artifacts = temporalArtifacts;
          simulationEngine = 'temporal';
        } else {
          result.validation_errors.push(
            'Temporal simulation returned no artifacts; using legacy simulator output.'
          );
        }
      } catch (error) {
        result.validation_errors.push(
          `Temporal simulation unavailable; fallback to legacy simulator (${String(error)})`
        );
      }
    } else {
      result.validation_errors.push(
        `Temporal simulation unavailable; fallback to legacy simulator (${temporalPreflight.reason})`
      );
    }

    // Non-destructive: return result without persisting
    return NextResponse.json(
      {
        simulation: {
          ...result,
          artifacts,
          simulation_engine: simulationEngine,
          temporal_workflow_id: temporalWorkflowId,
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
