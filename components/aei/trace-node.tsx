'use client'

import { useState } from 'react'
import {
  ChevronRight,
  ArrowDownRight,
  CheckCircle2,
  AlertTriangle,
  Clock,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { DecisionNode, getContextPreview, getConfidenceColor } from '@/lib/trace-model'

interface TraceNodeProps {
  node: DecisionNode;
  depth?: number;
  onExpandContext?: (context: string, nodeId: string) => void;
  onCompareAlternative?: (node: DecisionNode) => void;
  compareDisabled?: boolean;
}

function ConfidenceBar({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-1.5 rounded-full bg-secondary overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all',
            value >= 90 ? 'bg-emerald-400' : value >= 80 ? 'bg-amber-400' : 'bg-destructive'
          )}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="text-xs font-mono text-muted-foreground w-8">{value.toFixed(0)}%</span>
    </div>
  )
}

export function TraceNode({
  node,
  depth = 0,
  onExpandContext,
  onCompareAlternative,
  compareDisabled = false,
}: TraceNodeProps) {
  const [isExpanded, setIsExpanded] = useState(depth === 0)
  const hasChildren = node.children && node.children.length > 0

  const formatTime = (isoString: string): string => {
    try {
      const date = new Date(isoString)
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    } catch {
      return '-'
    }
  }

  const getStatusIcon = () => {
    const status = node.confidence_score >= 80 ? 'success' : node.confidence_score >= 60 ? 'warning' : 'pending'

    if (status === 'success') {
      return <CheckCircle2 className="w-4 h-4 text-emerald-400" />
    } else if (status === 'warning') {
      return <AlertTriangle className="w-4 h-4 text-amber-400" />
    } else {
      return <div className="w-4 h-4 rounded-full border-2 border-muted-foreground border-t-transparent animate-spin" />
    }
  }

  return (
    <div>
      <button
        onClick={() => {
          if (hasChildren) {
            setIsExpanded(!isExpanded)
          }
        }}
        className={cn(
          'flex items-center w-full px-3 py-2.5 text-left rounded-lg hover:bg-secondary/50 transition-colors group',
          depth > 0 && 'ml-6'
        )}
      >
        {/* Chevron or arrow */}
        <div className="flex items-center gap-2.5 shrink-0 w-6">
          {hasChildren ? (
            <ChevronRight
              className={cn('w-4 h-4 text-muted-foreground transition-transform', isExpanded && 'rotate-90')}
            />
          ) : (
            <ArrowDownRight className="w-4 h-4 text-muted-foreground" />
          )}
        </div>

        {/* Status icon */}
        <div className="flex items-center gap-2 shrink-0 w-5">
          {getStatusIcon()}
        </div>

        {/* Node label/context preview */}
        <span className="text-sm font-medium text-foreground truncate flex-1 ml-2">
          {node.label || getContextPreview(node.decision_context, 80)}
        </span>

        {/* Agent ID */}
        <span className="text-xs font-mono text-muted-foreground shrink-0 ml-4 w-32 text-right">
          {node.agent_id}
        </span>

        {/* Confidence bar */}
        <div className="shrink-0 ml-4">
          <ConfidenceBar value={node.confidence_score} />
        </div>

        {/* Time */}
        <span className="text-xs font-mono text-muted-foreground shrink-0 ml-4 w-16 text-right flex items-center justify-end gap-1">
          <Clock className="w-3 h-3" />
          {formatTime(node.timestamp)}
        </span>

        {/* Expand context button */}
        {node.decision_context && (
          <span
            onClick={(e) => {
              e.stopPropagation()
              onExpandContext?.(node.decision_context, node.node_id)
            }}
            className="text-xs text-blue-400 hover:text-blue-300 ml-2 px-2 py-1 rounded hover:bg-secondary/50 transition-colors shrink-0 cursor-pointer"
          >
            Expand
          </span>
        )}

        {node.alternatives_considered && node.alternatives_considered.length > 0 ? (
          compareDisabled ? (
            <span
              title="Compare disabled by configuration"
              className="text-xs text-muted-foreground ml-1 px-2 py-1 rounded bg-secondary/30 transition-colors shrink-0 cursor-not-allowed"
            >
              Compare
            </span>
          ) : (
            <span
              onClick={(e) => {
                e.stopPropagation()
                onCompareAlternative?.(node)
              }}
              className="text-xs text-emerald-400 hover:text-emerald-300 ml-1 px-2 py-1 rounded hover:bg-secondary/50 transition-colors shrink-0 cursor-pointer"
            >
              Compare
            </span>
          )
        ) : null}
      </button>

      {/* Children */}
      {isExpanded && hasChildren && (
        <div className="border-l-2 border-border ml-6">
          {node.children!.map((child) => (
            <TraceNode
              key={child.node_id}
              node={child}
              depth={depth + 1}
              onExpandContext={onExpandContext}
              onCompareAlternative={onCompareAlternative}
              compareDisabled={compareDisabled}
            />
          ))}
        </div>
      )}
    </div>
  )
}
