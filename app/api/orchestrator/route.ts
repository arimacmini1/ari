/**
 * POST /api/orchestrator/rules - Save rule set
 * GET /api/orchestrator/rules - List rule sets
 * PUT /api/orchestrator/rules/{rule_set_id} - Update rule
 * DELETE /api/orchestrator/rules/{rule_set_id} - Delete rule
 * POST /api/orchestrator/simulate - Run orchestrator simulation
 */

import { NextRequest, NextResponse } from 'next/server';
import { type Rule } from '@/lib/orchestrator-engine';
import { getOrchestratorEngine } from '@/lib/orchestrator-store';

const ORCHESTRATOR = getOrchestratorEngine();

/**
 * GET /api/orchestrator/rules
 * List all rule sets
 */
export async function GET(_req: NextRequest) {
  try {
    const rules = ORCHESTRATOR.getRules();
    return NextResponse.json({ rules });
  } catch (error) {
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}

/**
 * POST /api/orchestrator/rules
 * Create a new rule set
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { rule_set_id, rule } = body;

    if (!rule_set_id || !rule) {
      return NextResponse.json(
        { error: 'Missing rule_set_id or rule' },
        { status: 400 }
      );
    }

    // Validate rule structure
    if (!rule.name || typeof rule.priority !== 'number') {
      return NextResponse.json(
        { error: 'Invalid rule structure' },
        { status: 400 }
      );
    }

    const complete_rule: Rule = {
      id: rule_set_id,
      name: rule.name,
      priority: rule.priority,
      dependencies: rule.dependencies || [],
      agent_type_affinity: rule.agent_type_affinity || {},
      constraints: rule.constraints || {},
    };

    ORCHESTRATOR.addRule(complete_rule);

    return NextResponse.json(
      { rule: complete_rule },
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
 * PUT /api/orchestrator
 * Use /api/orchestrator/[ruleId] instead.
 */
export async function PUT(_req: NextRequest) {
  return NextResponse.json(
    { error: 'Use PUT /api/orchestrator/{ruleId}' },
    { status: 405 }
  );
}

/**
 * DELETE /api/orchestrator
 * Use /api/orchestrator/[ruleId] instead.
 */
export async function DELETE(_req: NextRequest) {
  return NextResponse.json(
    { error: 'Use DELETE /api/orchestrator/{ruleId}' },
    { status: 405 }
  );
}
