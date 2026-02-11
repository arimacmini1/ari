import { NextRequest, NextResponse } from 'next/server';
import { getComplianceSnapshot, updateManualControlStatus } from '@/lib/compliance/compliance-service';
import { enforcePermission } from '@/lib/rbac/enforce';

export async function GET() {
  try {
    const snapshot = await getComplianceSnapshot();
    return NextResponse.json(snapshot, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to load compliance data' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { control_id, status, notes } = body || {};

    if (!control_id || !status) {
      return NextResponse.json(
        { error: 'Missing control_id or status' },
        { status: 400 }
      );
    }

    if (!['implemented', 'in_progress', 'not_started'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status value' },
        { status: 400 }
      );
    }

    const enforcement = await enforcePermission(req, {
      permission: 'manage_compliance',
      action: 'update',
      resourceType: 'report',
      resourceId: String(control_id),
      context: { status, notes },
    });

    if (!enforcement.allowed) {
      return enforcement.response!;
    }

    await updateManualControlStatus(String(control_id), status, enforcement.userId, notes);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update compliance status' },
      { status: 500 }
    );
  }
}
