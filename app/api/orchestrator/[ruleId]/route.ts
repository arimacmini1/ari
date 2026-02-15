import { NextRequest, NextResponse } from 'next/server';
import { type Rule } from '@/lib/orchestrator-engine';
import { enforcePermission } from '@/lib/rbac/enforce';
import { getOrchestratorEngine } from '@/lib/orchestrator-store';

const ORCHESTRATOR = getOrchestratorEngine();

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ ruleId: string }> }
) {
  try {
    const { ruleId } = await params;
    const rule = ORCHESTRATOR.getRule(ruleId);
    if (!rule) {
      return NextResponse.json(
        { error: `Rule ${ruleId} not found` },
        { status: 404 }
      );
    }

    return NextResponse.json({ rule }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ ruleId: string }> }
) {
  try {
    const { ruleId } = await params;
    const body = await req.json();
    const { rule } = body;

    if (!rule) {
      return NextResponse.json({ error: 'Missing rule' }, { status: 400 });
    }

    const completeRule: Rule = {
      id: ruleId,
      name: rule.name || '',
      priority: rule.priority || 5,
      dependencies: rule.dependencies || [],
      agent_type_affinity: rule.agent_type_affinity || {},
      constraints: rule.constraints || {},
    };

    if (!ORCHESTRATOR.getRule(ruleId)) {
      return NextResponse.json(
        { error: `Rule ${ruleId} not found` },
        { status: 404 }
      );
    }

    ORCHESTRATOR.updateRule(completeRule);
    return NextResponse.json({ rule: completeRule }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ ruleId: string }> }
) {
  try {
    const { ruleId } = await params;
    const enforcement = await enforcePermission(req, {
      permission: 'delete',
      action: 'delete',
      resourceType: 'workflow',
      resourceId: ruleId,
    });

    if (!enforcement.allowed) {
      return enforcement.response!;
    }

    if (!ORCHESTRATOR.getRule(ruleId)) {
      return NextResponse.json(
        { error: `Rule ${ruleId} not found` },
        { status: 404 }
      );
    }

    ORCHESTRATOR.deleteRule(ruleId);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
