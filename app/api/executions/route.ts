/**
 * POST /api/executions - Create and dispatch execution
 * GET /api/executions - List execution history
 */

import { NextRequest, NextResponse } from 'next/server';
import { enforcePermission } from '@/lib/rbac/enforce';

export interface ExecutionRecord {
  execution_id: string;
  rule_set_id: string;
  created_at: string;
  assignment_plan: Array<{
    id: string;
    assigned_agent_id_or_pool: string;
    estimated_cost: number;
    estimated_duration: number;
    status: string;
  }>;
  assigned_agents: string[];
  estimated_cost: number;
  estimated_duration: number;
  success_probability: number;
  status: 'pending' | 'processing' | 'complete' | 'failed';
  actual_cost?: number;
  actual_duration?: number;
}

// In-memory storage for MVP
const EXECUTIONS_DB = new Map<string, ExecutionRecord>();

/**
 * GET /api/executions
 * List all execution history
 */
export async function GET(req: NextRequest) {
  try {
    const executions = Array.from(EXECUTIONS_DB.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return NextResponse.json(
      { executions, total_count: executions.length },
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

    const enforcement = await enforcePermission(req, {
      permission: 'execute',
      action: 'execute',
      resourceType: 'workflow',
      resourceId: rule_set_id,
      context: { assigned_agents: assignment_plan?.length || 0 },
    });

    if (!enforcement.allowed) {
      return enforcement.response!;
    }

    // Generate execution ID
    const execution_id = `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Extract assigned agents from assignment plan
    const assigned_agents = Array.from(
      new Set(assignment_plan.map((a: any) => a.assigned_agent_id_or_pool))
    );

    // Create execution record
    const execution: ExecutionRecord = {
      execution_id,
      rule_set_id,
      created_at: new Date().toISOString(),
      assignment_plan,
      assigned_agents,
      estimated_cost: estimated_cost || 0,
      estimated_duration: estimated_duration || 0,
      success_probability: success_probability || 0,
      status: 'pending',
    };

    // Store execution
    EXECUTIONS_DB.set(execution_id, execution);

    // Broadcast task assignments to agents via WebSocket
    // (This would connect to F00-MH-02 WebSocket transport)
    broadcastToAgents(execution_id, assignment_plan);

    // Update execution status to processing
    execution.status = 'processing';
    EXECUTIONS_DB.set(execution_id, execution);

    return NextResponse.json(
      {
        execution_id,
        status: 'dispatched',
        assigned_agents,
        task_count: assignment_plan.length,
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
  assignment_plan: Array<{
    id: string;
    assigned_agent_id_or_pool: string;
    estimated_cost: number;
    estimated_duration: number;
  }>
) {
  // TODO: Connect to WebSocket transport from F00-MH-02
  // For MVP, we mock agent task reception with deterministic timing

  assignment_plan.forEach((assignment) => {
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
        const all_complete = execution.assignment_plan.every((a) => a.status === 'complete');
        if (all_complete) {
          execution.status = 'complete';
          execution.actual_cost = execution.estimated_cost; // Mock: actual = estimated
          execution.actual_duration = execution.estimated_duration;
        }
        EXECUTIONS_DB.set(execution_id, execution);
      }
    }, completion_delay);
  });
}
