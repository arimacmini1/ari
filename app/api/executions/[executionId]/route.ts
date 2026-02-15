/**
 * GET /api/executions/{execution_id} - Get execution detail
 * POST /api/executions/{execution_id}/replay - Re-run with current agent pool
 */

import { NextRequest, NextResponse } from 'next/server';
import { resolveProjectContext } from '@/lib/project-context';
import { EXECUTIONS_DB } from '@/lib/execution-store';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ executionId: string }> }
) {
  try {
    const projectContext = resolveProjectContext(req);
    if (!projectContext.ok) {
      return projectContext.response;
    }

    const { executionId } = await params;

    const execution = EXECUTIONS_DB.get(executionId);
    if (!execution) {
      return NextResponse.json(
        { error: `Execution ${executionId} not found` },
        { status: 404 }
      );
    }
    if (execution.project_id !== projectContext.projectId) {
      return NextResponse.json(
        { error: `Execution ${executionId} not found in active project ${projectContext.projectId}` },
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
