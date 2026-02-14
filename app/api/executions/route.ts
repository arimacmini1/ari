/**
 * POST /api/executions - Create and dispatch execution
 * GET /api/executions - List execution history
 */

import { NextRequest, NextResponse } from 'next/server';
import { upsertTraceExecution } from '@/lib/mock-trace-store';
import { DecisionNode, TraceExecution } from '@/lib/trace-model';
import { resolveProjectContext } from '@/lib/project-context';
import { EXECUTIONS_DB, type ExecutionRecord } from '@/lib/execution-store';
import { getProject } from '@/lib/project-store';
import { estimateExecutionCost, evaluateProjectBudget } from '@/lib/project-budget';
import { enforceProjectPermission } from '@/lib/project-rbac';
import { normalizeExecutionMetricEvent, recordExecutionMetricEvent } from '@/lib/analytics-metric-store';
import {
  canRunTemporalExecution,
  runTemporalExecutionWorkflow,
  type TemporalExecutionResult,
} from '@/lib/temporal-execution';

/**
 * GET /api/executions
 * List all execution history
 */
export async function GET(req: NextRequest) {
  try {
    const projectContext = resolveProjectContext(req);
    if (!projectContext.ok) {
      return projectContext.response;
    }

    const executions = Array.from(EXECUTIONS_DB.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    const scopedExecutions = executions.filter((execution) => execution.project_id === projectContext.projectId);

    return NextResponse.json(
      { executions: scopedExecutions, total_count: scopedExecutions.length, project_id: projectContext.projectId },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}

/**
 * POST /api/executions
 * Create and dispatch execution
 */
export async function POST(req: NextRequest) {
  try {
    const projectContext = resolveProjectContext(req);
    if (!projectContext.ok) {
      return projectContext.response;
    }

    const body = await req.json();
    const {
      rule_set_id,
      assignment_plan,
      estimated_cost,
      estimated_duration,
      success_probability,
    } = body;

    if (!rule_set_id || !assignment_plan) {
      return NextResponse.json(
        { error: 'Missing rule_set_id or assignment_plan' },
        { status: 400 }
      );
    }
    if (!Array.isArray(assignment_plan)) {
      return NextResponse.json({ error: 'assignment_plan must be an array.' }, { status: 400 });
    }

    const enforcement = await enforceProjectPermission(req, {
      projectId: projectContext.projectId,
      permission: 'execute',
      action: 'execute',
      resourceType: 'workflow',
      resourceId: rule_set_id,
      context: { assigned_agents: assignment_plan?.length || 0 },
    });

    if (!enforcement.allowed) {
      return enforcement.response!;
    }

    const project = getProject(projectContext.projectId);
    if (!project) {
      return NextResponse.json(
        { error: `Invalid project context: ${projectContext.projectId}` },
        { status: 404 }
      );
    }

    const incomingEstimatedCost = estimateExecutionCost(estimated_cost, assignment_plan);
    const budget = evaluateProjectBudget({
      project,
      executions: EXECUTIONS_DB.values(),
      incomingEstimatedCost,
    });

    if (budget.hard_cap_reached) {
      return NextResponse.json(
        {
          error: `Execution blocked: project budget hard cap reached for ${project.name}.`,
          code: 'PROJECT_BUDGET_HARD_CAP_REACHED',
          project_id: project.project_id,
          budget,
        },
        { status: 402 }
      );
    }

    // Generate execution ID
    const execution_id = `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const normalizedAssignmentPlan = assignment_plan.map((assignment: any, index: number) => ({
      id: String(assignment?.id ?? `task-${index + 1}`),
      assigned_agent_id_or_pool: String(assignment?.assigned_agent_id_or_pool ?? 'unassigned'),
      estimated_cost:
        typeof assignment?.estimated_cost === 'number' && Number.isFinite(assignment.estimated_cost) && assignment.estimated_cost >= 0
          ? assignment.estimated_cost
          : 0,
      estimated_duration:
        typeof assignment?.estimated_duration === 'number' &&
        Number.isFinite(assignment.estimated_duration) &&
        assignment.estimated_duration >= 0
          ? assignment.estimated_duration
          : 0,
      status: 'queued',
    }));

    // Extract assigned agents from assignment plan
    const assigned_agents = Array.from(
      new Set(normalizedAssignmentPlan.map((assignment) => assignment.assigned_agent_id_or_pool))
    );

    // Create execution record
    const execution: ExecutionRecord = {
      execution_id,
      project_id: projectContext.projectId,
      rule_set_id,
      created_at: new Date().toISOString(),
      assignment_plan: normalizedAssignmentPlan,
      assigned_agents,
      estimated_cost: incomingEstimatedCost,
      estimated_duration: estimated_duration || 0,
      success_probability: success_probability || 0,
      status: 'pending',
    };

    // Store execution
    EXECUTIONS_DB.set(execution_id, execution);

    // Create a trace for this execution so "View Trace" is backed by a real action.
    const now = new Date();
    const mkIso = (offsetSeconds: number) => new Date(now.getTime() + offsetSeconds * 1000).toISOString();
    const baseAgent = assigned_agents[0] || 'orchestrator-main';

    const nodes: DecisionNode[] = normalizedAssignmentPlan.map((assignment: any, idx: number) => {
      const nodeId = `task-${assignment.id || idx + 1}`;
      const estCost = typeof assignment.estimated_cost === 'number' ? assignment.estimated_cost : 0.01;
      const estDur = typeof assignment.estimated_duration === 'number' ? assignment.estimated_duration : 1;
      const confidence = Math.max(55, Math.min(98, 85 - idx * 2));

      return {
        node_id: nodeId,
        label: `Dispatch task: ${assignment.id || `task-${idx + 1}`}`,
        decision_context:
          `Created task assignment for ${assignment.id || `task-${idx + 1}`}. Selected agent/pool "${assignment.assigned_agent_id_or_pool}". Estimated cost ${estCost.toFixed(3)}, estimated duration ${estDur.toFixed(2)}s.`,
        confidence_score: confidence,
        timestamp: mkIso(idx),
        decision_outcome: `Assigned to ${assignment.assigned_agent_id_or_pool}`,
        agent_id: baseAgent,
        cost: estCost,
        duration: estDur,
        alternatives_considered: idx === 0 ? [
          { outcome: 'Assign to cheapest available pool', rejection_reason: 'May increase latency risk for critical tasks' },
          { outcome: 'Assign to highest-confidence agent', rejection_reason: 'Not available in current pool selection' },
        ] : undefined,
      };
    });

    const trace: TraceExecution = {
      execution_id,
      project_id: projectContext.projectId,
      agent_id: baseAgent,
      start_time: now.toISOString(),
      duration: typeof estimated_duration === 'number' ? estimated_duration : 0,
      cost: incomingEstimatedCost,
      status: 'pending',
      root_decisions: [
        {
          node_id: 'decision-dispatch',
          label: 'Dispatch execution tasks',
          decision_context:
          `Execution created from rule set "${rule_set_id}" with ${normalizedAssignmentPlan.length} task assignments. Trace nodes represent dispatch decisions (mock execution, real user action).`,
          confidence_score: 90,
          timestamp: now.toISOString(),
          decision_outcome: 'Dispatch initiated',
          agent_id: baseAgent,
          cost: 0,
          duration: 0,
          children: nodes,
        },
      ],
    };

    upsertTraceExecution(trace, projectContext.projectId);

    // Update execution status to processing
    execution.status = 'processing';
    EXECUTIONS_DB.set(execution_id, execution);

    recordExecutionMetricEvent(
      normalizeExecutionMetricEvent({
        event_id: `${execution_id}:rollup:processing`,
        event_type: 'execution_rollup',
        project_id: projectContext.projectId,
        execution_id,
        status: 'processing',
        tokens: estimateTokensFromPlan(normalizedAssignmentPlan),
        estimated_cost: incomingEstimatedCost,
        latency_ms: 0,
        error_count: 0,
        success_count: 0,
        quality_score: 0,
      })
    );

    const temporalEnabled = canRunTemporalExecution();
    if (temporalEnabled) {
      void runTemporalExecutionWorkflow({
        execution_id,
        rule_set_id,
        assignment_plan: normalizedAssignmentPlan,
      })
        .then(({ result }) => {
          applyTemporalExecutionResult({
            execution_id,
            project_id: projectContext.projectId,
            result,
          });
        })
        .catch((error) => {
          console.error('[Temporal Execution Failed]', error);
          markExecutionFailed(execution_id, projectContext.projectId, String(error));
        });
    } else {
      // Legacy fallback for environments without Temporal worker/runtime.
      broadcastToAgents(execution_id, projectContext.projectId, normalizedAssignmentPlan);
    }

    return NextResponse.json(
      {
        execution_id,
        project_id: projectContext.projectId,
        status: 'dispatched',
        execution_engine: temporalEnabled ? 'temporal' : 'legacy-mock',
        assigned_agents,
        task_count: normalizedAssignmentPlan.length,
        budget_warning: budget.warning_threshold_crossed
          ? {
              code: 'PROJECT_BUDGET_WARNING_THRESHOLD',
              project_id: project.project_id,
              budget,
            }
          : null,
        message: `Execution dispatched to ${assigned_agents.length} agents`,
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}

/**
 * Broadcast task assignments to agents
 * In MVP: simulate agent task reception
 * In production: use WebSocket or event bus
 */
function broadcastToAgents(
  execution_id: string,
  project_id: string,
  assignment_plan: Array<{
    id: string;
    assigned_agent_id_or_pool: string;
    estimated_cost: number;
    estimated_duration: number;
    status: string;
  }>
) {
  // TODO: Connect to WebSocket transport from F00-MH-02
  // For MVP, we mock agent task reception with deterministic timing

  assignment_plan.forEach((assignment) => {
    assignment.status = 'processing';

    recordExecutionMetricEvent(
      normalizeExecutionMetricEvent({
        event_id: `${execution_id}:agent:${assignment.assigned_agent_id_or_pool}:${assignment.id}:processing`,
        event_type: 'agent_delta',
        project_id,
        execution_id,
        agent_id: assignment.assigned_agent_id_or_pool,
        status: 'processing',
        tokens: estimateTokensFromCost(assignment.estimated_cost),
        estimated_cost: assignment.estimated_cost,
        latency_ms: Math.round(assignment.estimated_duration * 1000),
        error_count: 0,
        success_count: 0,
        quality_score: 0,
      })
    );

    const task_message = {
      type: 'task_assignment',
      execution_id,
      task_id: assignment.id,
      assigned_agent_id: assignment.assigned_agent_id_or_pool,
      task_spec: {
        id: assignment.id,
        estimated_cost: assignment.estimated_cost,
        estimated_duration: assignment.estimated_duration,
      },
      timestamp: new Date().toISOString(),
    };

    // Log message (in production, send via WebSocket)
    console.log('[Task Assignment]', JSON.stringify(task_message, null, 2));

    // Mock agent status update after simulated duration
    const completion_delay = assignment.estimated_duration * 1000; // Convert to ms
    setTimeout(() => {
      const completion_message = {
        type: 'task_completion',
        execution_id,
        task_id: assignment.id,
        agent_id: assignment.assigned_agent_id_or_pool,
        status: 'complete',
        timestamp: new Date().toISOString(),
      };

      console.log('[Task Completion]', JSON.stringify(completion_message, null, 2));

      // Update execution record
      const execution = EXECUTIONS_DB.get(execution_id);
      if (execution) {
        const target = execution.assignment_plan.find((task) => task.id === assignment.id);
        if (target) {
          target.status = 'complete';
        }

        recordExecutionMetricEvent(
          normalizeExecutionMetricEvent({
            event_id: `${execution_id}:agent:${assignment.assigned_agent_id_or_pool}:${assignment.id}:success`,
            event_type: 'agent_delta',
            project_id,
            execution_id,
            agent_id: assignment.assigned_agent_id_or_pool,
            status: 'success',
            tokens: estimateTokensFromCost(assignment.estimated_cost),
            estimated_cost: assignment.estimated_cost,
            actual_cost: assignment.estimated_cost,
            latency_ms: Math.round(assignment.estimated_duration * 1000),
            error_count: 0,
            success_count: 1,
            quality_score: 92,
          })
        );

        const all_complete = execution.assignment_plan.every((a) => a.status === 'complete');
        if (all_complete && execution.status !== 'complete') {
          execution.status = 'complete';
          execution.actual_cost = execution.estimated_cost; // Mock: actual = estimated
          execution.actual_duration = execution.estimated_duration;

          recordExecutionMetricEvent(
            normalizeExecutionMetricEvent({
              event_id: `${execution_id}:rollup:complete`,
              event_type: 'execution_rollup',
              project_id,
              execution_id,
              status: 'success',
              tokens: estimateTokensFromPlan(execution.assignment_plan),
              estimated_cost: execution.estimated_cost,
              actual_cost: execution.actual_cost,
              latency_ms: Math.round((execution.actual_duration || 0) * 1000),
              error_count: 0,
              success_count: execution.assignment_plan.length,
              quality_score: 92,
            })
          );
        }
        EXECUTIONS_DB.set(execution_id, execution);
      }
    }, completion_delay);
  });
}

function estimateTokensFromCost(costUsd: number): number {
  return Math.max(0, Math.round(costUsd * 5000));
}

function estimateTokensFromPlan(
  assignmentPlan: Array<{ estimated_cost: number }>
): number {
  return assignmentPlan.reduce((sum, assignment) => sum + estimateTokensFromCost(assignment.estimated_cost), 0);
}

function applyTemporalExecutionResult(options: {
  execution_id: string;
  project_id: string;
  result: TemporalExecutionResult;
}) {
  const { execution_id, project_id, result } = options;
  const execution = EXECUTIONS_DB.get(execution_id);
  if (!execution) return;

  const byId = new Map(result.tasks.map((task) => [task.id, task]));

  execution.assignment_plan = execution.assignment_plan.map((assignment) => {
    const task = byId.get(assignment.id);
    if (!task) return assignment;
    return {
      ...assignment,
      status: task.status,
      estimated_cost: task.estimated_cost,
      estimated_duration: task.estimated_duration,
    };
  });

  execution.actual_cost = typeof result.actual_cost === 'number' ? result.actual_cost : execution.estimated_cost;
  execution.actual_duration =
    typeof result.actual_duration === 'number' ? result.actual_duration : execution.estimated_duration;
  execution.status = result.status === 'complete' ? 'complete' : 'failed';

  EXECUTIONS_DB.set(execution_id, execution);

  for (const task of result.tasks) {
    recordExecutionMetricEvent(
      normalizeExecutionMetricEvent({
        event_id: `${execution_id}:temporal:${task.assigned_agent_id_or_pool}:${task.id}:${task.status}`,
        event_type: 'agent_delta',
        project_id,
        execution_id,
        agent_id: task.assigned_agent_id_or_pool,
        status: task.status === 'complete' ? 'success' : 'error',
        tokens: estimateTokensFromCost(task.actual_cost),
        estimated_cost: task.estimated_cost,
        actual_cost: task.actual_cost,
        latency_ms: Math.round(task.actual_duration * 1000),
        error_count: task.status === 'complete' ? 0 : 1,
        success_count: task.status === 'complete' ? 1 : 0,
        quality_score: task.status === 'complete' ? 92 : 0,
      })
    );
  }

  recordExecutionMetricEvent(
    normalizeExecutionMetricEvent({
      event_id: `${execution_id}:rollup:${execution.status}:temporal`,
      event_type: 'execution_rollup',
      project_id,
      execution_id,
      status: execution.status === 'complete' ? 'success' : 'error',
      tokens: estimateTokensFromPlan(execution.assignment_plan),
      estimated_cost: execution.estimated_cost,
      actual_cost: execution.actual_cost,
      latency_ms: Math.round((execution.actual_duration || 0) * 1000),
      error_count: execution.status === 'complete' ? 0 : 1,
      success_count: execution.status === 'complete' ? execution.assignment_plan.length : 0,
      quality_score: execution.status === 'complete' ? 92 : 0,
    })
  );
}

function markExecutionFailed(execution_id: string, project_id: string, reason: string) {
  const execution = EXECUTIONS_DB.get(execution_id);
  if (!execution) return;

  execution.status = 'failed';
  EXECUTIONS_DB.set(execution_id, execution);

  recordExecutionMetricEvent(
    normalizeExecutionMetricEvent({
      event_id: `${execution_id}:rollup:failed:temporal`,
      event_type: 'execution_rollup',
      project_id,
      execution_id,
      status: 'error',
      tokens: estimateTokensFromPlan(execution.assignment_plan),
      estimated_cost: execution.estimated_cost,
      latency_ms: 0,
      error_count: 1,
      success_count: 0,
      quality_score: 0,
    })
  );
}
