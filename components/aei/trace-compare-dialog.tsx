'use client'

import { useEffect, useMemo, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alternative, flattenDecisionTree } from '@/lib/trace-model'
import { TraceComparison } from '@/lib/trace-compare-model'

interface TraceCompareDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  executionId: string
  nodeId: string
  alternatives: Alternative[]
  onForkCreated?: (forkExecutionId: string) => void
  compareDisabled?: boolean
  forkDisabled?: boolean
}

function formatDelta(value: number, digits: number = 2): string {
  const rounded = Number.isFinite(value) ? value.toFixed(digits) : '0.00'
  return value >= 0 ? `+${rounded}` : rounded
}

function downloadText(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function formatComparisonMarkdown(comparison: TraceComparison): string {
  const m = comparison.tradeoff_metrics
  const lines = [
    '# Comparative Trace Summary',
    '',
    `- comparison_id: ${comparison.comparison_id}`,
    `- execution_id: ${comparison.execution_id}`,
    `- fork_node_id: ${comparison.fork_node_id}`,
    `- selected_alternative_outcome: ${comparison.selected_alternative_outcome}`,
    `- status: ${comparison.status}`,
    `- created_at: ${comparison.created_at}`,
    '',
    '## Rollup Deltas',
    '',
    `- confidence_delta: ${m.confidence_delta.toFixed(2)}`,
    `- cost_delta: ${m.cost_delta.toFixed(4)}`,
    `- latency_delta_s: ${m.latency_delta_s.toFixed(3)}`,
    '',
    '## Per-Decision Deltas',
    '',
    '| node_id | label | conf_delta | cost_delta | latency_delta_s | quality |',
    '|---|---|---:|---:|---:|---|',
  ]

  for (const delta of m.per_decision_deltas) {
    lines.push(
      `| ${delta.node_id} | ${(delta.label ?? '').replace(/\|/g, '/')} | ${delta.confidence_delta.toFixed(2)} | ${delta.cost_delta.toFixed(4)} | ${delta.latency_delta_s.toFixed(3)} | ${delta.data_quality} |`
    )
  }

  return lines.join('\n')
}

export function TraceCompareDialog({
  open,
  onOpenChange,
  executionId,
  nodeId,
  alternatives,
  onForkCreated,
  compareDisabled = false,
  forkDisabled = false,
}: TraceCompareDialogProps) {
  const [selectedOutcome, setSelectedOutcome] = useState<string>('')
  const [comparison, setComparison] = useState<TraceComparison | null>(null)
  const [loading, setLoading] = useState(false)
  const [forking, setForking] = useState(false)
  const [forkStatus, setForkStatus] = useState<string | null>(null)
  const [forkStatusNote, setForkStatusNote] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      setComparison(null)
      setLoading(false)
      setForking(false)
      setForkStatus(null)
      setForkStatusNote(null)
      setError(null)
      setSelectedNodeId(null)
      return
    }

    setSelectedOutcome((prev) => {
      if (prev && alternatives.some((alt) => alt.outcome === prev)) return prev
      return alternatives[0]?.outcome ?? ''
    })
  }, [alternatives, open])

  useEffect(() => {
    if (!open || !executionId || !nodeId || !selectedOutcome) return
    if (compareDisabled) return

    setLoading(true)
    setError(null)

    fetch('/api/traces/compare', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        execution_id: executionId,
        node_id: nodeId,
        alternative_outcome: selectedOutcome,
      }),
    })
      .then(async (res) => {
        const body = await res.json().catch(() => ({}))
        if (!res.ok) {
          throw new Error(body?.error || `Compare failed (${res.status})`)
        }
        return body as { comparison: TraceComparison }
      })
      .then((data) => {
        setComparison(data.comparison)
        setSelectedNodeId(data.comparison.fork_node_id)
      })
      .catch((compareError) => {
        setComparison(null)
        setSelectedNodeId(null)
        setError(compareError instanceof Error ? compareError.message : 'Compare failed.')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [compareDisabled, executionId, nodeId, open, selectedOutcome])

  const changedIds = useMemo(() => {
    const ids = comparison?.diff_summary?.changed_node_ids ?? []
    return new Set(ids)
  }, [comparison])

  const addedIds = useMemo(() => {
    const ids = comparison?.diff_summary?.added_node_ids ?? []
    return new Set(ids)
  }, [comparison])

  const removedIds = useMemo(() => {
    const ids = comparison?.diff_summary?.removed_node_ids ?? []
    return new Set(ids)
  }, [comparison])

  const baseList = useMemo(
    () => (comparison ? flattenDecisionTree([comparison.base_path]) : []),
    [comparison]
  )
  const altList = useMemo(
    () => (comparison ? flattenDecisionTree([comparison.alternative_path]) : []),
    [comparison]
  )

  const baseById = useMemo(() => new Set(baseList.map((node) => node.node_id)), [baseList])
  const altById = useMemo(() => new Set(altList.map((node) => node.node_id)), [altList])

  const matchedNodeSelected = useMemo(() => {
    if (!selectedNodeId) return true
    return baseById.has(selectedNodeId) && altById.has(selectedNodeId)
  }, [altById, baseById, selectedNodeId])

  const handleFork = async () => {
    if (!executionId || !nodeId || !selectedOutcome) return
    if (forkDisabled) return
    setForking(true)
    setForkStatus("queued")
    setForkStatusNote("Fork queued.")
    setError(null)
    try {
      const res = await fetch('/api/traces/fork', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          execution_id: executionId,
          node_id: nodeId,
          alternative_outcome: selectedOutcome,
        }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body?.error || `Fork failed (${res.status})`)
      const forkJobId = body?.fork?.fork_id as string | undefined
      if (!forkJobId) throw new Error('Fork queued but no job id was returned.')

      let completedForkExecutionId: string | null = null
      for (let attempt = 0; attempt < 40; attempt += 1) {
        const pollRes = await fetch(`/api/traces/fork/${encodeURIComponent(forkJobId)}`, {
          cache: 'no-store',
        })
        const pollBody = await pollRes.json().catch(() => ({}))
        if (!pollRes.ok) throw new Error(pollBody?.error || `Fork status failed (${pollRes.status})`)
        const status = pollBody?.fork?.status as string | undefined
        const note = pollBody?.fork?.note as string | undefined
        if (status) setForkStatus(status)
        setForkStatusNote(note ?? null)

        if (status === 'completed') {
          completedForkExecutionId = (pollBody?.fork?.fork_execution_id as string | undefined) ?? null
          break
        }
        if (status === 'failed') {
          throw new Error((pollBody?.fork?.error as string | undefined) || 'Fork failed.')
        }
        await new Promise((resolve) => setTimeout(resolve, 250))
      }

      if (!completedForkExecutionId) {
        throw new Error('Fork timed out while waiting for completion.')
      }
      onForkCreated?.(completedForkExecutionId)
    } catch (forkError) {
      setForkStatus("failed")
      setError(forkError instanceof Error ? forkError.message : 'Fork failed.')
    } finally {
      setForking(false)
    }
  }

  const handleExportJson = () => {
    if (!comparison) return
    downloadText(
      `comparison_${comparison.comparison_id}.json`,
      JSON.stringify(comparison, null, 2),
      'application/json'
    )
  }

  const handleExportMarkdown = () => {
    if (!comparison) return
    downloadText(
      `comparison_${comparison.comparison_id}.md`,
      formatComparisonMarkdown(comparison),
      'text/markdown'
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Compare Alternative Outcome</DialogTitle>
          <p className="text-xs text-muted-foreground mt-2">
            Execution: <span className="font-mono">{executionId}</span> • Node:{' '}
            <span className="font-mono">{nodeId}</span>
          </p>
        </DialogHeader>

        <div className="flex items-center gap-3 border-b border-border pb-3">
          <label className="text-xs text-muted-foreground">Alternative</label>
          <select
            value={selectedOutcome}
            onChange={(e) => setSelectedOutcome(e.target.value)}
            className="h-8 rounded-md border border-border bg-background px-2 text-xs"
            disabled={compareDisabled}
          >
            {alternatives.map((alt) => (
              <option key={alt.outcome} value={alt.outcome}>
                {alt.outcome}
              </option>
            ))}
          </select>
          <Button
            variant="outline"
            size="sm"
            onClick={handleFork}
            disabled={forkDisabled || forking || loading || !selectedOutcome}
          >
            {forkDisabled ? 'Fork Disabled' : forking ? 'Forking...' : 'Fork'}
          </Button>
          {forkStatus ? (
            <Badge variant={forkStatus === 'failed' ? 'destructive' : 'secondary'} className="text-xs">
              fork_status={forkStatus}
            </Badge>
          ) : null}
          <Button variant="outline" size="sm" onClick={handleExportJson} disabled={!comparison || loading}>
            Export JSON
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportMarkdown}
            disabled={!comparison || loading}
          >
            Export Markdown
          </Button>
          {comparison?.timings_ms?.diff_compute_ms != null && (
            <Badge variant="secondary" className="text-xs font-mono">
              diff_compute_ms={comparison.timings_ms.diff_compute_ms}
            </Badge>
          )}
          <div className="ml-auto">
            {forkStatusNote ? (
              <span className="text-[11px] text-muted-foreground mr-3">{forkStatusNote}</span>
            ) : null}
            {comparison?.note ? (
              <span className="text-[11px] text-muted-foreground">{comparison.note}</span>
            ) : null}
          </div>
        </div>

        {loading && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="inline-block w-8 h-8 border-2 border-muted-foreground border-t-primary rounded-full animate-spin mb-3" />
              <p className="text-sm text-muted-foreground">Building comparison...</p>
            </div>
          </div>
        )}

        {error && !loading && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <p className="text-sm text-destructive mb-2">Comparison error</p>
              <p className="text-xs text-muted-foreground font-mono">{error}</p>
            </div>
          </div>
        )}

        {compareDisabled && !loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">Comparison is disabled by configuration.</p>
            </div>
          </div>
        ) : null}

        {comparison && !loading && !compareDisabled && (
          <div className="flex-1 min-h-0 flex flex-col gap-3 pt-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-md border border-border bg-secondary/20 p-3">
                <div className="text-xs text-muted-foreground">Confidence (avg)</div>
                <div className="mt-1 text-sm font-mono">
                  {comparison.tradeoff_metrics.base_confidence_avg.toFixed(1)} →{' '}
                  {comparison.tradeoff_metrics.alt_confidence_avg.toFixed(1)} (
                  {formatDelta(comparison.tradeoff_metrics.confidence_delta, 1)})
                </div>
              </div>
              <div className="rounded-md border border-border bg-secondary/20 p-3">
                <div className="text-xs text-muted-foreground">Cost (subtree)</div>
                <div className="mt-1 text-sm font-mono">
                  ${comparison.tradeoff_metrics.base_cost_total.toFixed(3)} → $
                  {comparison.tradeoff_metrics.alt_cost_total.toFixed(3)} (
                  {formatDelta(comparison.tradeoff_metrics.cost_delta, 3)})
                </div>
              </div>
              <div className="rounded-md border border-border bg-secondary/20 p-3">
                <div className="text-xs text-muted-foreground">Latency (subtree)</div>
                <div className="mt-1 text-sm font-mono">
                  {comparison.tradeoff_metrics.base_latency_total_s.toFixed(2)}s →{' '}
                  {comparison.tradeoff_metrics.alt_latency_total_s.toFixed(2)}s (
                  {formatDelta(comparison.tradeoff_metrics.latency_delta_s, 2)}s)
                </div>
              </div>
            </div>

            <div className="rounded-md border border-border bg-secondary/10 p-3">
              <div className="flex flex-wrap items-center gap-2 text-[11px]">
                <Badge variant="secondary">changed</Badge>
                <Badge className="bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/20">added</Badge>
                <Badge className="bg-rose-500/20 text-rose-300 hover:bg-rose-500/20">removed</Badge>
                <span className="text-muted-foreground ml-2">
                  Per-decision deltas are shown below and currently marked as estimated.
                </span>
              </div>
            </div>

            {!matchedNodeSelected && selectedNodeId ? (
              <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                Selected node <span className="font-mono">{selectedNodeId}</span> has no corresponding match in one path.
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-3 flex-1 min-h-0">
              <div className="rounded-md border border-border overflow-hidden flex flex-col min-h-0">
                <div className="px-3 py-2 border-b border-border text-xs font-semibold">Original Path</div>
                <div className="flex-1 overflow-auto">
                  {baseList.map((node) => {
                    const isSelected = node.node_id === selectedNodeId
                    const removed = removedIds.has(node.node_id)
                    const changed = changedIds.has(node.node_id)
                    return (
                      <button
                        type="button"
                        key={node.node_id}
                        className={`w-full text-left px-3 py-2 border-b border-border/60 hover:bg-secondary/40 ${
                          isSelected ? 'bg-secondary/40 ring-1 ring-primary/40' : ''
                        }`}
                        onClick={() => setSelectedNodeId(node.node_id)}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-xs font-medium truncate">{node.label ?? node.node_id}</div>
                          <div className="flex items-center gap-2 shrink-0">
                            {removed ? (
                              <Badge className="text-[10px] bg-rose-500/20 text-rose-300 hover:bg-rose-500/20">removed</Badge>
                            ) : changed ? (
                              <Badge variant="secondary" className="text-[10px]">
                                changed
                              </Badge>
                            ) : null}
                            <div className="text-[11px] font-mono text-muted-foreground">
                              {node.confidence_score.toFixed(0)}%
                            </div>
                          </div>
                        </div>
                        <div className="mt-1 text-[11px] text-muted-foreground">
                          Outcome: <span className="font-mono">{node.decision_outcome}</span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="rounded-md border border-border overflow-hidden flex flex-col min-h-0">
                <div className="px-3 py-2 border-b border-border text-xs font-semibold">Alternative Path</div>
                <div className="flex-1 overflow-auto">
                  {altList.map((node) => {
                    const isSelected = node.node_id === selectedNodeId
                    const added = addedIds.has(node.node_id)
                    const changed = changedIds.has(node.node_id)
                    return (
                      <button
                        type="button"
                        key={node.node_id}
                        className={`w-full text-left px-3 py-2 border-b border-border/60 hover:bg-secondary/40 ${
                          isSelected ? 'bg-secondary/40 ring-1 ring-primary/40' : ''
                        }`}
                        onClick={() => setSelectedNodeId(node.node_id)}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-xs font-medium truncate">{node.label ?? node.node_id}</div>
                          <div className="flex items-center gap-2 shrink-0">
                            {added ? (
                              <Badge className="text-[10px] bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/20">added</Badge>
                            ) : changed ? (
                              <Badge variant="secondary" className="text-[10px]">
                                changed
                              </Badge>
                            ) : null}
                            <div className="text-[11px] font-mono text-muted-foreground">
                              {node.confidence_score.toFixed(0)}%
                            </div>
                          </div>
                        </div>
                        <div className="mt-1 text-[11px] text-muted-foreground">
                          Outcome: <span className="font-mono">{node.decision_outcome}</span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="rounded-md border border-border overflow-hidden min-h-0">
              <div className="px-3 py-2 border-b border-border text-xs font-semibold">
                Per-Decision Deltas ({comparison.tradeoff_metrics.per_decision_deltas.length})
              </div>
              <div className="max-h-40 overflow-auto">
                <table className="w-full text-xs">
                  <thead className="bg-secondary/20 text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Node</th>
                      <th className="px-3 py-2 text-right font-medium">Conf Δ</th>
                      <th className="px-3 py-2 text-right font-medium">Cost Δ</th>
                      <th className="px-3 py-2 text-right font-medium">Latency Δ</th>
                      <th className="px-3 py-2 text-left font-medium">Quality</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparison.tradeoff_metrics.per_decision_deltas.map((delta) => (
                      <tr key={delta.node_id} className="border-t border-border/60">
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            className="font-mono hover:text-primary"
                            onClick={() => setSelectedNodeId(delta.node_id)}
                          >
                            {delta.label ?? delta.node_id}
                          </button>
                        </td>
                        <td className="px-3 py-2 text-right font-mono">{formatDelta(delta.confidence_delta, 1)}</td>
                        <td className="px-3 py-2 text-right font-mono">{formatDelta(delta.cost_delta, 4)}</td>
                        <td className="px-3 py-2 text-right font-mono">
                          {formatDelta(delta.latency_delta_s, 3)}s
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">{delta.data_quality}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
