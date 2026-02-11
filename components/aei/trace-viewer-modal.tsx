'use client'

import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { TraceTree } from './trace-tree'
import { TraceExecution } from '@/lib/trace-model'

interface TraceViewerModalProps {
  executionId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TraceViewerModal({
  executionId,
  open,
  onOpenChange,
}: TraceViewerModalProps) {
  const [trace, setTrace] = useState<TraceExecution | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !executionId) {
      setTrace(null)
      setLoading(true)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)

    fetch(`/api/traces/${executionId}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to fetch trace: ${res.status}`)
        }
        return res.json()
      })
      .then((data) => {
        setTrace(data.trace)
        setLoading(false)
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Unknown error occurred')
        setLoading(false)
      })
  }, [executionId, open])

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-emerald-600 text-emerald-100'
      case 'warning':
        return 'bg-amber-600 text-amber-100'
      case 'failed':
        return 'bg-red-600 text-red-100'
      case 'pending':
        return 'bg-slate-600 text-slate-100'
      default:
        return 'bg-slate-600 text-slate-100'
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle>Trace Viewer</DialogTitle>
              <p className="text-xs text-muted-foreground mt-2">
                Execution: <span className="font-mono">{executionId}</span>
              </p>
            </div>
            {trace && (
              <Badge className={`${getStatusBadgeColor(trace.status)} text-xs`}>
                {trace.status.toUpperCase()}
              </Badge>
            )}
          </div>
        </DialogHeader>

        {loading && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="inline-block w-8 h-8 border-2 border-muted-foreground border-t-primary rounded-full animate-spin mb-3" />
              <p className="text-sm text-muted-foreground">Loading trace data...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <p className="text-sm text-destructive mb-2">Error loading trace</p>
              <p className="text-xs text-muted-foreground font-mono">{error}</p>
            </div>
          </div>
        )}

        {trace && !loading && (
          <div className="flex-1 overflow-hidden">
            <TraceTree trace={trace} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
