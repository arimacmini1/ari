/**
 * Real-time Status Indicator Component
 * Feature: P1-MH-06 - Real-time Status Indicators
 * 
 * Shows live status for import, agent execution, and async operations
 */

"use client"

import { useState, useEffect } from "react"
import { RefreshCw, CheckCircle, AlertCircle, Clock, Loader2 } from "lucide-react"

export type StatusType = "idle" | "loading" | "success" | "error" | "pending"

export interface StatusIndicatorProps {
  status: StatusType
  label: string
  subStatus?: string
  progress?: number // 0-100
  showSpinner?: boolean
  className?: string
}

const statusConfig = {
  idle: {
    icon: Clock,
    color: "text-slate-400",
    bgColor: "bg-slate-100",
  },
  loading: {
    icon: Loader2,
    color: "text-blue-500",
    bgColor: "bg-blue-50",
    animate: true,
  },
  pending: {
    icon: Clock,
    color: "text-amber-500",
    bgColor: "bg-amber-50",
  },
  success: {
    icon: CheckCircle,
    color: "text-green-500",
    bgColor: "bg-green-50",
  },
  error: {
    icon: AlertCircle,
    color: "text-red-500",
    bgColor: "bg-red-50",
  },
}

export function StatusIndicator({
  status,
  label,
  subStatus,
  progress,
  showSpinner = true,
  className = "",
}: StatusIndicatorProps) {
  const config = statusConfig[status]
  const Icon = config.icon

  return (
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded-md ${config.bgColor} ${className}`}
    >
      {showSpinner && status === "loading" ? (
        <Loader2 className={`w-4 h-4 ${config.color} animate-spin`} />
      ) : (
        <Icon className={`w-4 h-4 ${config.color}`} />
      )}
      
      <div className="flex-1 min-w-0">
        <div className={`text-sm font-medium ${config.color}`}>
          {label}
        </div>
        {subStatus && (
          <div className="text-xs text-slate-500 truncate">
            {subStatus}
          </div>
        )}
        {progress !== undefined && status === "loading" && (
          <div className="mt-1 h-1 w-full bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Hook for polling status with real-time updates
 */
export function useStatusPoller(
  endpoint: string,
  intervalMs: number = 3000,
  enabled: boolean = true
) {
  const [status, setStatus] = useState<StatusType>("idle")
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled) return

    const fetchStatus = async () => {
      try {
        const res = await fetch(endpoint)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = await res.json()
        setData(json)
        setStatus("success")
        setError(null)
      } catch (err) {
        setError(String(err))
        setStatus("error")
      }
    }

    fetchStatus()
    const interval = setInterval(fetchStatus, intervalMs)
    return () => clearInterval(interval)
  }, [endpoint, intervalMs, enabled])

  return { status, data, error }
}

/**
 * Import Status Bar - Shows real-time import progress
 */
export interface ImportStatusBarProps {
  repoId: string
  className?: string
}

export function ImportStatusBar({ repoId, className = "" }: ImportStatusBarProps) {
  const { status, data } = useStatusPoller(
    `/api/repos/import?id=${repoId}`,
    2000,
    !!repoId
  )

  const repo = data?.repo
  const currentStatus = repo?.status || "pending"

  const statusLabels: Record<string, string> = {
    queued: "Queued",
    cloning: "Cloning repository...",
    indexing: "Indexing files...",
    ready: "Ready",
    failed: "Failed",
  }

  const progressMap: Record<string, number> = {
    queued: 10,
    cloning: 30,
    indexing: 70,
    ready: 100,
    failed: 0,
  }

  return (
    <StatusIndicator
      status={currentStatus === "ready" ? "success" : currentStatus === "failed" ? "error" : "loading"}
      label={statusLabels[currentStatus] || "Unknown"}
      subStatus={repo?.name}
      progress={progressMap[currentStatus]}
      className={className}
    />
  )
}
