import { NextRequest, NextResponse } from "next/server"

interface LogEntry {
  timestamp: number
  level: "info" | "warn" | "error" | "debug"
  message: string
  context?: string
}

function generateMockLogs(agentId: string, count: number = 50): LogEntry[] {
  const levels: LogEntry["level"][] = ["info", "warn", "error", "debug"]
  const messages = [
    "Task started",
    "Processing input",
    "Calling LLM API",
    "Validating output",
    "Task completed",
    "Error in validation",
    "Retrying request",
    "Cache hit",
    "Resource constraint",
    "Status update sent",
  ]

  const logs: LogEntry[] = []
  const now = Date.now()

  for (let i = 0; i < count; i++) {
    logs.push({
      timestamp: now - (count - i) * 1000,
      level: levels[Math.floor(Math.random() * levels.length)],
      message: messages[Math.floor(Math.random() * messages.length)],
      context: `task-${Math.floor(Math.random() * 10)}`,
    })
  }

  return logs.sort((a, b) => a.timestamp - b.timestamp)
}

export async function GET(
  request: NextRequest,
  { params }: { params: { agentId: string } }
) {
  const { agentId } = params
  const limit = request.nextUrl.searchParams.get("limit") || "50"

  try {
    // TODO: Fetch real logs from agent heartbeat history / execution logs
    // For MVP, return mock logs
    
    const logs = generateMockLogs(agentId, Math.min(parseInt(limit), 100))

    return NextResponse.json(
      {
        agent_id: agentId,
        logs,
        total_count: logs.length,
        timestamp: Date.now(),
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
