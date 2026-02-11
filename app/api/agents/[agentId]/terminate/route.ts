import { NextRequest, NextResponse } from "next/server"
import { enforcePermission } from "@/lib/rbac/enforce"

export async function POST(
  request: NextRequest,
  { params }: { params: { agentId: string } }
) {
  const { agentId } = params

  try {
    // TODO: Integrate with actual agent runtime
    // For MVP, return mock response

    const enforcement = await enforcePermission(request, {
      permission: "delete",
      action: "delete",
      resourceType: "agent",
      resourceId: agentId,
    })

    if (!enforcement.allowed) {
      return enforcement.response!
    }
    
    return NextResponse.json(
      {
        success: true,
        agent_id: agentId,
        action: "terminated",
        timestamp: Date.now(),
        message: `Agent ${agentId} terminated gracefully with 5-second cleanup timeout.`,
      },
      { status: 200 }
    )
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: String(error),
      },
      { status: 500 }
    )
  }
}
