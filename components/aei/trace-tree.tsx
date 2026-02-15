'use client'

import { useRef, useState } from 'react'
import { Download, GitBranch } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TraceNode } from './trace-node'
import { DecisionContextDialog } from './decision-context-dialog'
import { TraceCompareDialog } from './trace-compare-dialog'
import { Alternative, DecisionNode, TraceExecution } from '@/lib/trace-model'

interface TraceTreeProps {
  trace: TraceExecution
  onForkCreated?: (forkExecutionId: string) => void
  compareDisabled?: boolean
  forkDisabled?: boolean
}

export function TraceTree({
  trace,
  onForkCreated,
  compareDisabled = false,
  forkDisabled = false,
}: TraceTreeProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [contextDialogOpen, setContextDialogOpen] = useState(false)
  const [selectedContext, setSelectedContext] = useState('')
  const [selectedNodeId, setSelectedNodeId] = useState('')
  const [compareOpen, setCompareOpen] = useState(false)
  const [compareNodeId, setCompareNodeId] = useState<string | null>(null)
  const [compareAlternatives, setCompareAlternatives] = useState<Alternative[]>([])

  const handleExpandContext = (context: string, nodeId: string) => {
    setSelectedContext(context)
    setSelectedNodeId(nodeId)
    setContextDialogOpen(true)
  }

  const handleCompareAlternative = (node: DecisionNode) => {
    setCompareNodeId(node.node_id)
    setCompareAlternatives(node.alternatives_considered ?? [])
    setCompareOpen(true)
  }

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(trace, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `trace_${trace.execution_id}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <div className="flex flex-col h-full">
        {/* Header with metadata */}
        <div className="px-6 py-3 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Execution: </span>
              <span className="font-mono text-foreground">{trace.execution_id}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Agent: </span>
              <span className="font-mono text-foreground">{trace.agent_id}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Duration: </span>
              <span className="font-mono text-foreground">{trace.duration.toFixed(2)}s</span>
            </div>
            <div>
              <span className="text-muted-foreground">Cost: </span>
              <span className="font-mono text-foreground">${trace.cost.toFixed(3)}</span>
            </div>
            {trace.source_repo && (
              <div className="flex items-center gap-1.5">
                <GitBranch className="w-3 h-3 text-muted-foreground" />
                <span className="font-mono text-foreground">
                  {trace.source_repo.url.replace(/^https?:\/\/github\.com\//, '')}
                  @{trace.source_repo.branch}
                  {trace.source_repo.commit ? ` (${trace.source_repo.commit.slice(0, 7)})` : ''}
                </span>
              </div>
            )}
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
          <Button
            onClick={handleExportJson}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <Download className="w-3.5 h-3.5" />
            Export JSON
          </Button>
        </div>

        {/* Column headers */}
        <div className="flex items-center px-6 py-2 border-b border-border text-xs text-muted-foreground shrink-0">
          <span className="w-6" />
          <span className="w-5" />
          <span className="flex-1 ml-2">Decision Node</span>
          <span className="w-32 text-right ml-4">Agent</span>
          <span className="ml-4 w-28">Confidence</span>
          <span className="w-16 text-right ml-4">Time</span>
          <span className="w-12 text-right ml-2">Actions</span>
        </div>

        {/* Tree content */}
        <div
          ref={containerRef}
          className="flex-1 overflow-y-auto px-3 py-2"
        >
          {trace.root_decisions && trace.root_decisions.length > 0 ? (
            trace.root_decisions.map((node) => (
              <TraceNode
                key={node.node_id}
                node={node}
                onExpandContext={handleExpandContext}
                onCompareAlternative={handleCompareAlternative}
                compareDisabled={compareDisabled}
              />
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No decision nodes available
            </div>
          )}
        </div>
      </div>

      {/* Context dialog */}
      <DecisionContextDialog
        open={contextDialogOpen}
        onOpenChange={setContextDialogOpen}
        nodeId={selectedNodeId}
        context={selectedContext}
      />

      {compareNodeId && compareAlternatives && compareAlternatives.length > 0 ? (
        <TraceCompareDialog
          open={compareOpen}
          onOpenChange={setCompareOpen}
          executionId={trace.execution_id}
          nodeId={compareNodeId}
          alternatives={compareAlternatives}
          onForkCreated={onForkCreated}
          compareDisabled={compareDisabled}
          forkDisabled={forkDisabled}
        />
      ) : null}
    </>
  )
}
