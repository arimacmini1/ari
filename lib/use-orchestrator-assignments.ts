/**
 * Orchestrator Assignment Hook
 * Watches for task assignments to agents during canvas execution
 * Updates agent status and parent-child relationships in real-time
 */

import { useEffect, useRef, useCallback, useState } from "react"
import { Agent } from "@/lib/agent-tree"

export interface TaskAssignment {
  assignment_id: string
  agent_id: string
  parent_agent_id?: string
  task_id: string
  task_type: string
  status: "assigned" | "started" | "in_progress" | "completed" | "failed"
  timestamp: number
  estimated_duration_ms?: number
}

export function useOrchestratorAssignments() {
  const [currentAssignments, setCurrentAssignments] = useState<Map<string, TaskAssignment>>(new Map())
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)

  /**
   * Simulate polling for assignment updates (in real implementation, would subscribe via WebSocket)
   */
  const startPolling = useCallback((executionId: string) => {
    // Mock polling: in real implementation, would call GET /api/executions/{executionId}/assignments
    console.log(`[Orchestrator] Started polling assignments for execution: ${executionId}`)

    // Clear previous polling
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
    }

    // Poll for updates every 1 second
    pollIntervalRef.current = setInterval(() => {
      // In real implementation, would fetch from server
      // For now, mock data is handled by execution simulation
    }, 1000)
  }, [])

  /**
   * Stop polling for assignments
   */
  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }
  }, [])

  /**
   * Record a new assignment (called by WebSocket listener or server response)
   */
  const recordAssignment = useCallback((assignment: TaskAssignment) => {
    setCurrentAssignments((prev) => {
      const next = new Map(prev)
      next.set(assignment.assignment_id, assignment)
      return next
    })
  }, [])

  /**
   * Update assignment status
   */
  const updateAssignmentStatus = useCallback(
    (assignmentId: string, status: TaskAssignment["status"]) => {
      setCurrentAssignments((prev) => {
        const next = new Map(prev)
        const assignment = next.get(assignmentId)
        if (assignment) {
          next.set(assignmentId, {
            ...assignment,
            status,
            timestamp: Date.now(),
          })
        }
        return next
      })
    },
    []
  )

  /**
   * Apply assignments to agents: update parent/child relationships and status
   */
  const applyAssignmentsToAgents = useCallback(
    (agents: Agent[]): Agent[] => {
      if (currentAssignments.size === 0) return agents

      const agentMap = new Map(agents.map((a) => [a.id, { ...a }]))

      currentAssignments.forEach((assignment) => {
        const agent = agentMap.get(assignment.agent_id)
        if (!agent) return

        // Update agent status based on assignment status
        const statusMap: Record<TaskAssignment["status"], Agent["status"]> = {
          assigned: "idle",
          started: "processing",
          in_progress: "processing",
          completed: "complete",
          failed: "error",
        }

        agent.status = statusMap[assignment.status] || "processing"

        // Set parent relationship if this is a sub-agent assignment
        if (assignment.parent_agent_id && assignment.parent_agent_id !== agent.id) {
          agent.parentId = assignment.parent_agent_id

          // Update parent's child list
          const parent = agentMap.get(assignment.parent_agent_id)
          if (parent && !parent.childIds.includes(agent.id)) {
            parent.childIds = [...parent.childIds, agent.id]
          }
        }
      })

      return Array.from(agentMap.values())
    },
    [currentAssignments]
  )

  /**
   * Get assignments for a specific agent
   */
  const getAgentAssignments = useCallback(
    (agentId: string): TaskAssignment[] => {
      return Array.from(currentAssignments.values()).filter((a) => a.agent_id === agentId)
    },
    [currentAssignments]
  )

  /**
   * Clear all assignments (e.g., when execution ends)
   */
  const clearAssignments = useCallback(() => {
    setCurrentAssignments(new Map())
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPolling()
    }
  }, [stopPolling])

  return {
    currentAssignments,
    startPolling,
    stopPolling,
    recordAssignment,
    updateAssignmentStatus,
    applyAssignmentsToAgents,
    getAgentAssignments,
    clearAssignments,
  }
}
