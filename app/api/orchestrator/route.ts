/**
 * POST /api/orchestrator/rules - Save rule set
 * GET /api/orchestrator/rules - List rule sets
 * PUT /api/orchestrator/rules/{rule_set_id} - Update rule
 * DELETE /api/orchestrator/rules/{rule_set_id} - Delete rule
 * POST /api/orchestrator/simulate - Run orchestrator simulation
 */

import { NextRequest, NextResponse } from 'next/server';
import { createOrchestratorEngine, Rule, InstructionNode } from '@/lib/orchestrator-engine';
import { enforcePermission } from '@/lib/rbac/enforce';

// In-memory storage for MVP (replace with database later)
const RULES_DB = new Map<string, Rule>();
const ORCHESTRATOR = createOrchestratorEngine();

/**
 * GET /api/orchestrator/rules
 * List all rule sets
 */
export async function GET(req: NextRequest) {
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
    RULES_DB.set(rule_set_id, complete_rule);

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
 * PUT /api/orchestrator/rules/{rule_set_id}
 * Update a rule set
 */
export async function PUT(req: NextRequest) {
  try {
    const { pathname } = new URL(req.url);
    const rule_set_id = pathname.split('/').pop();
    
    if (!rule_set_id) {
      return NextResponse.json(
        { error: 'Missing rule_set_id' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { rule } = body;

    if (!rule) {
      return NextResponse.json(
        { error: 'Missing rule' },
        { status: 400 }
      );
    }

    const complete_rule: Rule = {
      id: rule_set_id,
      name: rule.name || '',
      priority: rule.priority || 5,
      dependencies: rule.dependencies || [],
      agent_type_affinity: rule.agent_type_affinity || {},
      constraints: rule.constraints || {},
    };

    ORCHESTRATOR.updateRule(complete_rule);
    RULES_DB.set(rule_set_id, complete_rule);

    return NextResponse.json({ rule: complete_rule });
  } catch (error) {
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/orchestrator/rules/{rule_set_id}
 * Delete a rule set
 */
export async function DELETE(req: NextRequest) {
  try {
    const { pathname } = new URL(req.url);
    const rule_set_id = pathname.split('/').pop();
    
    if (!rule_set_id) {
      return NextResponse.json(
        { error: 'Missing rule_set_id' },
        { status: 400 }
      );
    }

    const enforcement = await enforcePermission(req, {
      permission: 'delete',
      action: 'delete',
      resourceType: 'workflow',
      resourceId: rule_set_id,
    });

    if (!enforcement.allowed) {
      return enforcement.response!;
    }

    ORCHESTRATOR.deleteRule(rule_set_id);
    RULES_DB.delete(rule_set_id);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}
