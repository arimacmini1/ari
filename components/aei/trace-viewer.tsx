"use client"

import { useCallback, useEffect, useState } from "react"
import { GitBranch, RefreshCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { TraceTree } from "@/components/aei/trace-tree"
import { TraceExecution } from "@/lib/trace-model"

interface TraceFlags {
  compare_disabled: boolean
  fork_disabled: boolean
}

export function TraceViewer() {
  const [executionIdInput, setExecutionIdInput] = useState("exec-001")
  const [executionId, setExecutionId] = useState("exec-001")
  const [trace, setTrace] = useState<TraceExecution | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [flags, setFlags] = useState<TraceFlags>({
    compare_disabled: false,
    fork_disabled: false,
  })
  const [flagsLoading, setFlagsLoading] = useState(true)
  const [flagsSaving, setFlagsSaving] = useState(false)

  const compareDisabled = flags.compare_disabled
  const forkDisabled = flags.fork_disabled

  const loadFlags = useCallback(async () => {
    setFlagsLoading(true)
    try {
      const res = await fetch("/api/traces/flags", { cache: "no-store" })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body?.error || `Failed to fetch flags (${res.status})`)
      setFlags({
        compare_disabled: Boolean(body?.flags?.compare_disabled),
        fork_disabled: Boolean(body?.flags?.fork_disabled),
      })
    } catch {
      // Keep current UI state if flags endpoint fails.
    } finally {
      setFlagsLoading(false)
    }
  }, [])

  const loadTrace = useCallback(async (id: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/traces/${encodeURIComponent(id)}`, { cache: "no-store" })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body?.error || `Failed to fetch trace (${res.status})`)
      setTrace(body.trace ?? null)
    } catch (fetchError) {
      setTrace(null)
      setError(fetchError instanceof Error ? fetchError.message : "Failed to load trace.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadTrace(executionId)
  }, [executionId, loadTrace])

  useEffect(() => {
    loadFlags()
  }, [loadFlags])

  const setFlag = useCallback(
    async (patch: Partial<TraceFlags>) => {
      setFlagsSaving(true)
      const previous = flags
      const optimistic = { ...previous, ...patch }
      setFlags(optimistic)
      try {
        const res = await fetch("/api/traces/flags", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        })
        const body = await res.json().catch(() => ({}))
        if (!res.ok) {
          throw new Error(body?.error || `Failed to update flags (${res.status})`)
        }
        setFlags({
          compare_disabled: Boolean(body?.flags?.compare_disabled),
          fork_disabled: Boolean(body?.flags?.fork_disabled),
        })
      } catch {
        setFlags(previous)
      } finally {
        setFlagsSaving(false)
      }
    },
    [flags]
  )

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
        <div className="flex items-center gap-3">
          <GitBranch className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">AI Trace Viewer</h3>
          {compareDisabled ? (
            <span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] text-amber-300">
              Compare Disabled
            </span>
          ) : null}
          {forkDisabled ? (
            <span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] text-amber-300">
              Fork Disabled
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-3 border-r border-border pr-3 mr-1">
            <div className="flex items-center gap-2">
              <Switch
                checked={!compareDisabled}
                onCheckedChange={(checked) => setFlag({ compare_disabled: !checked })}
                disabled={flagsLoading || flagsSaving}
                aria-label="Toggle trace comparison"
              />
              <span className="text-xs text-muted-foreground">Compare</span>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={!forkDisabled}
                onCheckedChange={(checked) => setFlag({ fork_disabled: !checked })}
                disabled={flagsLoading || flagsSaving}
                aria-label="Toggle trace forking"
              />
              <span className="text-xs text-muted-foreground">Fork</span>
            </div>
          </div>
          <input
            value={executionIdInput}
            onChange={(e) => setExecutionIdInput(e.target.value)}
            className="h-8 w-48 rounded-md border border-border bg-background px-2 text-xs font-mono"
            placeholder="execution_id (e.g. exec-001)"
          />
          <Button
            size="sm"
            variant="outline"
            onClick={() => setExecutionId(executionIdInput.trim() || "exec-001")}
          >
            Load
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => loadTrace(executionId)}
            disabled={loading}
          >
            <RefreshCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block w-8 h-8 border-2 border-muted-foreground border-t-primary rounded-full animate-spin mb-3" />
            <p className="text-sm text-muted-foreground">Loading trace data...</p>
          </div>
        </div>
      ) : error ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-sm text-destructive mb-2">Error loading trace</p>
            <p className="text-xs text-muted-foreground font-mono">{error}</p>
          </div>
        </div>
      ) : trace ? (
        <div className="flex flex-col h-full">
          {/* Product Success Indicators */}
          <div className="flex items-center gap-4 px-4 py-2 border-b border-border bg-card/30 shrink-0">
            <span className="text-xs font-medium text-muted-foreground">Product Status:</span>
            {trace.status === "complete" ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-950/40 border border-emerald-700/50 px-2 py-0.5 text-[10px] text-emerald-300">
                ✅ Product Ready
              </span>
            ) : trace.status === "failed" ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-950/40 border border-red-700/50 px-2 py-0.5 text-[10px] text-red-300">
                ❌ Needs Iteration
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-950/40 border border-amber-700/50 px-2 py-0.5 text-[10px] text-amber-300">
                🔄 In Progress
              </span>
            )}
            {trace.metrics?.rowCountMatch !== undefined && (
              <span className="text-[10px] text-muted-foreground">
                Rows: {trace.metrics.rowCountMatch ? "✓ Match" : "✗ Mismatch"}
              </span>
            )}
            {trace.metrics?.uiFlowsPass !== undefined && (
              <span className="text-[10px] text-muted-foreground">
                UI Flows: {trace.metrics.uiFlowsPass ? "✓ Pass" : "✗ Fail"}
              </span>
            )}
            {trace.metrics?.testCoverage !== undefined && (
              <span className="text-[10px] text-muted-foreground">
                Coverage: {trace.metrics.testCoverage}%
              </span>
            )}
            {trace.evidence?.length ? (
              <span className="text-[10px] text-blue-400 cursor-pointer hover:underline">
                📎 {trace.evidence.length} evidence{trace.evidence.length > 1 ? "s" : ""}
              </span>
            ) : null}
          </div>
          
          <div className="flex-1 overflow-hidden">
            <TraceTree
            trace={trace}
            compareDisabled={compareDisabled}
            forkDisabled={forkDisabled}
            onForkCreated={(forkExecutionId) => {
              setExecutionIdInput(forkExecutionId)
              setExecutionId(forkExecutionId)
            }}
          />
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
          No trace loaded.
        </div>
      )}
    </div>
  )
}
