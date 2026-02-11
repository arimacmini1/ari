import { NextRequest, NextResponse } from "next/server"
import { enforcePermission } from "@/lib/rbac/enforce"

export async function POST(
  request: NextRequest,
  { params }: { params: { agentId: string } }
) {
  const { agentId } = params

  try {
    const body = await request.json()
    const { target_agent_pool, target_project } = body

    // TODO: Implement real task handover via orchestrator
    // For MVP, return queued response

    const enforcement = await enforcePermission(request, {
      permission: "assign",
      action: "assign",
      resourceType: "agent",
      resourceId: agentId,
      context: { target_agent_pool, target_project },
    })

    if (!enforcement.allowed) {
      return enforcement.response!
    }
    
    return NextResponse.json(
      {
        success: true,
        agent_id: agentId,
        action: "reassign_queued",
        target_pool: target_agent_pool,
        target_project: target_project,
        timestamp: Date.now(),
        message: `Agent ${agentId} reassignment queued. Handover in progress.`,
      },
      { status: 200 }
    )
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: String(error),
      },
      { status: 400 }
    )
  }
}
