/**
 * WebSocket Handler for Agent Real-Time Updates
 * Handles agent status, metrics, and assignment subscriptions
 * 
 * Protocol:
 * - Client subscribes: { type: "subscribe", pattern: "subscribe:agents:all|subscribe:assignments:all", lastSequenceId: number }
 * - Server sends updates: { type: "agent_update|assignment_update", agent_id: string, status: string, metrics: {...}, timestamp: number, sequenceId: number }
 */

import { NextRequest } from "next/server"

// Simple in-memory store for WebSocket connections and subscriptions
const clients = new Map<
  WebSocket,
  {
    subscriptions: Set<string>
    lastSequenceId: number
  }
>()

let messageSequence = 0

// Mock agent data for demo
const mockAgents: Record<
  string,
  {
    id: string
    status: "idle" | "processing" | "waiting" | "error" | "complete" | "paused" | "terminated"
    metrics: {
      cpu: number
      memory: number
      tokensPerMin: number
      cost: number
    }
    timestamp: number
  }
> = {}

// Initialize mock agents
function initializeMockAgents() {
  const statuses = ["idle", "processing", "waiting", "complete"] as const
  const agentTypes = ["orchestrator", "task", "decision", "codegen"]

  for (let i = 0; i < 10; i++) {
    const agentId = `agent-${i + 1}`
    mockAgents[agentId] = {
      id: agentId,
      status: statuses[Math.floor(Math.random() * statuses.length)],
      metrics: {
        cpu: Math.random() * 100,
        memory: Math.random() * 100,
        tokensPerMin: Math.random() * 500,
        cost: Math.random() * 50,
      },
      timestamp: Date.now(),
    }
  }
}

initializeMockAgents()

// Broadcast message to all subscribed clients
function broadcastUpdate(update: {
  type: string
  agent_id: string
  status?: string
  metrics?: {
    cpu: number
    memory: number
    tokensPerMin: number
    cost: number
  }
  timestamp: number
  sequenceId: number
}) {
  clients.forEach((clientData, ws) => {
    // Check if client is subscribed to this update type
    const isSubscribed = Array.from(clientData.subscriptions).some((pattern) => {
      if (pattern === "subscribe:agents:all") return update.type === "agent_update"
      if (pattern === "subscribe:assignments:all") return update.type === "assignment_update"
      return false
    })

    if (isSubscribed && ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(update))
      } catch (e) {
        console.error("Failed to send message:", e)
      }
    }
  })
}

// Simulate agent updates
function simulateAgentUpdates() {
  setInterval(() => {
    const agentIds = Object.keys(mockAgents)
    if (agentIds.length === 0) return

    const randomAgentId = agentIds[Math.floor(Math.random() * agentIds.length)]
    const agent = mockAgents[randomAgentId]

    // Update metrics
    agent.metrics = {
      cpu: Math.random() * 100,
      memory: Math.random() * 100,
      tokensPerMin: Math.random() * 500,
      cost: agent.metrics.cost + Math.random() * 5,
    }
    agent.timestamp = Date.now()

    // Randomly change status
    if (Math.random() > 0.7) {
      const statuses = ["idle", "processing", "waiting", "complete"]
      agent.status = statuses[Math.floor(Math.random() * statuses.length)] as any
    }

    messageSequence++

    broadcastUpdate({
      type: "agent_update",
      agent_id: randomAgentId,
      status: agent.status,
      metrics: agent.metrics,
      timestamp: agent.timestamp,
      sequenceId: messageSequence,
    })
  }, 2000) // Update every 2 seconds
}

// Start simulating updates
simulateAgentUpdates()

/**
 * WebSocket API Route Handler
 * Next.js WebSocket support via Node.js http upgrade
 */
export async function GET(request: NextRequest) {
  // Next.js doesn't support WebSocket directly in the API route handler
  // This is a limitation of Next.js serverless environment
  // For production, use a separate WebSocket server or upgrade handler
  
  return new Response("WebSocket endpoint not available in serverless environment", {
    status: 400,
  })
}

/**
 * NOTE: For proper WebSocket support in production:
 * 1. Use a dedicated WebSocket server (e.g., ws package)
 * 2. Run it on a separate port (e.g., :3001)
 * 3. Update frontend useAgentWebSocket hook to connect to ws://localhost:3001
 * 4. Or use a hosted WebSocket service (e.g., Pusher, Socket.io)
 * 
 * For development, consider:
 * - Using Socket.io with Next.js adapter
 * - Running a separate Node.js WebSocket server
 * - Using a third-party WebSocket service
 */
