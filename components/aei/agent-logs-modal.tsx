"use client"

import { useEffect, useState } from "react"
import { X, Copy, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface LogEntry {
  timestamp: number
  level: "info" | "warn" | "error" | "debug"
  message: string
  context?: string
}

interface AgentLogsModalProps {
  agentId: string
  agentName: string
  isOpen: boolean
  onClose: () => void
}

const levelColors = {
  info: "text-blue-400",
  warn: "text-amber-400",
  error: "text-red-400",
  debug: "text-slate-400",
}

export function AgentLogsModal({ agentId, agentName, isOpen, onClose }: AgentLogsModalProps) {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  // Fetch logs when modal opens
  useEffect(() => {
    if (!isOpen) return

    setIsLoading(true)
    fetch(`/api/agents/${agentId}/logs?limit=100`)
      .then((res) => res.json())
      .then((data) => {
        setLogs(data.logs || [])
      })
      .catch((err) => {
        console.error("Failed to fetch logs:", err)
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [isOpen, agentId])

  const handleCopyLogs = () => {
    const text = logs
      .map(
        (log) =>
          `[${new Date(log.timestamp).toISOString()}] [${log.level.toUpperCase()}] ${log.message}${log.context ? ` (${log.context})` : ""}`
      )
      .join("\n")

    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
      <div className="bg-card border border-border rounded-lg shadow-lg max-w-2xl w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div>
            <h2 className="font-semibold text-foreground">Agent Logs</h2>
            <p className="text-xs text-muted-foreground">{agentName}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleCopyLogs}
              disabled={logs.length === 0}
              className="gap-1.5"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  Copy All
                </>
              )}
            </Button>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-secondary rounded transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Logs content */}
        <div className="flex-1 overflow-y-auto bg-slate-950 font-mono text-sm p-4 space-y-1">
          {isLoading ? (
            <div className="text-muted-foreground">Loading logs...</div>
          ) : logs.length === 0 ? (
            <div className="text-muted-foreground">No logs available</div>
          ) : (
            logs.map((log, idx) => (
              <div key={idx} className="flex gap-3 text-xs">
                <span className="text-slate-500 flex-shrink-0">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
                <span className={cn("font-semibold w-8 flex-shrink-0", levelColors[log.level])}>
                  {log.level.slice(0, 3).toUpperCase()}
                </span>
                <span className="text-slate-300 flex-1">{log.message}</span>
                {log.context && <span className="text-slate-600 flex-shrink-0">({log.context})</span>}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-secondary/20">
          <span className="text-xs text-muted-foreground">{logs.length} log entries</span>
          <Button size="sm" variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  )
}
