"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { AgentTree } from "@/components/aei/agent-tree"
import { AgentLogsModal } from "@/components/aei/agent-logs-modal"
import { Agent, generateMockAgents } from "@/lib/agent-tree"
import { useAgentWebSocket, AgentUpdate } from "@/lib/use-agent-websocket"
import { useAgentMetricsHistory } from "@/lib/use-agent-metrics-history"
import { useOrchestratorAssignments } from "@/lib/use-orchestrator-assignments"

export function AgentPanel() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [logsModalOpen, setLogsModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // WebSocket connection for real-time updates
  const { isConnected, lastUpdate, error, subscribe } = useAgentWebSocket({
    autoConnect: true,
  })

  // Metrics history for sparklines
  const metricsHistory = useAgentMetricsHistory()

  // Orchestrator task assignments (parent-child relationships during execution)
  const orchestratorAssignments = useOrchestratorAssignments()

  // Initialize with mock agents
  useEffect(() => {
    const mockAgents = generateMockAgents(25)
    setAgents(mockAgents)
    setIsLoading(false)

    // Subscribe to all agent updates
    subscribe("subscribe:agents:all")
  }, [subscribe])

  // Stable refs for hook methods so they don't trigger re-renders
  const recordUpdateRef = useRef(metricsHistory.recordUpdate)
  recordUpdateRef.current = metricsHistory.recordUpdate
  const applyAssignmentsRef = useRef(orchestratorAssignments.applyAssignmentsToAgents)
  applyAssignmentsRef.current = orchestratorAssignments.applyAssignmentsToAgents

  // Apply real-time updates from WebSocket and orchestrator assignments
  useEffect(() => {
    if (!lastUpdate) return

    setAgents((prevAgents) => {
      let updated = prevAgents.map((agent) => {
        if (agent.id === lastUpdate.agent_id) {
          const newMetrics = {
            ...agent.metrics,
            ...lastUpdate.metrics,
          }

          // Record metrics in history for sparklines
          recordUpdateRef.current(lastUpdate.agent_id, newMetrics)

          return {
            ...agent,
            status: lastUpdate.status ?? agent.status,
            metrics: newMetrics,
            lastHeartbeat: lastUpdate.timestamp,
          }
        }
        return agent
      })

      // Apply orchestrator assignments (parent-child relationships)
      updated = applyAssignmentsRef.current(updated)

      return updated
    })
  }, [lastUpdate])

  const handleAgentAction = useCallback(
    (agentId: string, action: string) => {
      const agent = agents.find((a) => a.id === agentId)
      if (!agent) return

      console.log(`Agent action: ${agentId} -> ${action}`)

      switch (action) {
        case "pause": {
          const isPaused = agent.status === "paused"
          fetch(`/api/agents/${agentId}/pause`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pause: !isPaused }),
          })
            .then((res) => res.json())
            .then((data) => {
              console.log("Pause response:", data)
              // Update agent status optimistically
              setAgents((prev) =>
                prev.map((a) =>
                  a.id === agentId
                    ? { ...a, status: isPaused ? "idle" : "paused" }
                    : a
                )
              )
            })
            .catch((err) => console.error("Pause failed:", err))
          break
        }

        case "terminate": {
          if (!confirm(`Terminate ${agent.name}? This action is irreversible.`)) return

          fetch(`/api/agents/${agentId}/terminate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
          })
            .then((res) => res.json())
            .then((data) => {
              console.log("Terminate response:", data)
              // Update agent status to terminated
              setAgents((prev) =>
                prev.map((a) => (a.id === agentId ? { ...a, status: "terminated" } : a))
              )
            })
            .catch((err) => console.error("Terminate failed:", err))
          break
        }

        case "reassign": {
          // TODO: Show reassign dialog (Phase 2)
          console.log("Reassign requested for agent:", agent.name)
          alert(`Reassign ${agent.name} - Feature coming in Phase 2`)
          break
        }

        case "inspect": {
          setSelectedAgent(agent)
          setLogsModalOpen(true)
          break
        }

        default:
          console.warn("Unknown action:", action)
      }
    },
    [agents]
  )

  const handleAgentSelect = useCallback((agent: Agent) => {
    setSelectedAgent(agent)
    console.log("Selected agent:", agent)
    // TODO: Open agent detail panel (F02-SH-04)
  }, [])

  if (isLoading) {
    return <div className="flex items-center justify-center h-full text-muted-foreground">Loading agents...</div>
  }

  return (
    <>
      {error && (
        <div className="absolute top-4 right-4 bg-destructive/10 text-destructive px-3 py-2 rounded text-sm border border-destructive/20">
          {error}
        </div>
      )}
      <AgentTree
        agents={agents}
        metricsHistory={metricsHistory}
        onAgentSelect={handleAgentSelect}
        onAgentAction={handleAgentAction}
      />

      {/* Logs modal */}
      {selectedAgent && (
        <AgentLogsModal
          agentId={selectedAgent.id}
          agentName={selectedAgent.name}
          isOpen={logsModalOpen}
          onClose={() => {
            setLogsModalOpen(false)
          }}
        />
      )}
    </>
  )
}
