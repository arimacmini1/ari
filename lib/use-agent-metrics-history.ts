/**
 * Agent Metrics History Hook
 * Maintains rolling window of metrics for sparkline visualization
 * Tracks CPU, memory, tokens/min, cost over last 5 minutes
 */

import { useRef, useCallback } from "react"
import { Agent } from "@/lib/agent-tree"

export interface MetricsSnapshot {
  timestamp: number
  cpu: number
  memory: number
  tokensPerMin: number
  cost: number
}

const MAX_HISTORY_POINTS = 300 // 5 minutes at 1s intervals
const HISTORY_WINDOW_MS = 5 * 60 * 1000 // 5 minutes

export function useAgentMetricsHistory() {
  // Map: agentId -> array of metric snapshots
  const historyRef = useRef<Map<string, MetricsSnapshot[]>>(new Map())

  /**
   * Record a metric update for an agent
   */
  const recordUpdate = useCallback((agentId: string, metrics: Agent["metrics"]) => {
    const history = historyRef.current.get(agentId) || []

    // Add new snapshot
    history.push({
      timestamp: Date.now(),
      cpu: metrics.cpu,
      memory: metrics.memory,
      tokensPerMin: metrics.tokensPerMin,
      cost: metrics.cost,
    })

    // Trim old data (beyond 5 minutes)
    const cutoff = Date.now() - HISTORY_WINDOW_MS
    const trimmed = history.filter((s) => s.timestamp > cutoff)

    // Keep max points to prevent unbounded growth
    if (trimmed.length > MAX_HISTORY_POINTS) {
      trimmed.shift()
    }

    historyRef.current.set(agentId, trimmed)
  }, [])

  /**
   * Get trend data for a metric (for sparkline rendering)
   */
  const getMetricTrend = useCallback(
    (agentId: string, metric: "cpu" | "memory" | "tokensPerMin" | "cost"): number[] => {
      const history = historyRef.current.get(agentId) || []
      return history.map((s) => s[metric])
    },
    []
  )

  /**
   * Get min/max for a metric in history (for Y-axis scaling)
   */
  const getMetricRange = useCallback(
    (agentId: string, metric: "cpu" | "memory" | "tokensPerMin" | "cost"): [number, number] => {
      const history = historyRef.current.get(agentId) || []
      if (history.length === 0) return [0, 100]

      const values = history.map((s) => s[metric])
      const min = Math.min(...values)
      const max = Math.max(...values)

      // For CPU/memory, max is 100
      if (metric === "cpu" || metric === "memory") {
        return [Math.max(0, min - 5), Math.min(100, max + 5)]
      }

      // For tokens/cost, add 10% padding
      return [Math.max(0, min - max * 0.1), max + max * 0.1]
    },
    []
  )

  /**
   * Get latest value for a metric
   */
  const getLatestValue = useCallback(
    (agentId: string, metric: "cpu" | "memory" | "tokensPerMin" | "cost"): number | null => {
      const history = historyRef.current.get(agentId)
      if (!history || history.length === 0) return null
      return history[history.length - 1][metric]
    },
    []
  )

  /**
   * Get all historical data for an agent
   */
  const getHistory = useCallback((agentId: string): MetricsSnapshot[] => {
    return historyRef.current.get(agentId) || []
  }, [])

  /**
   * Clear history for an agent (e.g., on agent termination)
   */
  const clearHistory = useCallback((agentId: string) => {
    historyRef.current.delete(agentId)
  }, [])

  /**
   * Clear all history
   */
  const clearAll = useCallback(() => {
    historyRef.current.clear()
  }, [])

  return {
    recordUpdate,
    getMetricTrend,
    getMetricRange,
    getLatestValue,
    getHistory,
    clearHistory,
    clearAll,
  }
}
