/**
 * GET /api/executions/{execution_id} - Get execution detail
 * POST /api/executions/{execution_id}/replay - Re-run with current agent pool
 */

import { NextRequest, NextResponse } from 'next/server';

// In-memory storage (would be database in production)
const EXECUTIONS_DB = new Map();

export async function GET(
  req: NextRequest,
  { params }: { params: { executionId: string } }
) {
  try {
    const { executionId } = params;

    const execution = EXECUTIONS_DB.get(executionId);
    if (!execution) {
      return NextResponse.json(
        { error: `Execution ${executionId} not found` },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { execution },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
}
