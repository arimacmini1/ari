"use client"

import { useState, useMemo, useCallback, useEffect } from "react"
import {
  ChevronRight,
  ChevronDown,
  Bot,
  Cpu,
  Zap,
  DollarSign,
  Clock,
  MoreVertical,
  AlertCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Agent,
  AgentTreeNode,
  buildAgentTree,
  flattenTree,
  toggleNodeExpanded,
  toggleNodeSelection,
  getSelectedAgents,
  aggregateChildMetrics,
  FlattenedNode,
} from "@/lib/agent-tree"
import { MetricSparkline } from "@/components/aei/metric-sparkline"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"

interface MetricsHistoryAPI {
  getMetricTrend: (agentId: string, metric: "cpu" | "memory" | "tokensPerMin" | "cost") => number[]
}

interface AgentTreeProps {
  agents: Agent[]
  metricsHistory?: MetricsHistoryAPI
  onAgentSelect?: (agent: Agent) => void
  onAgentAction?: (agentId: string, action: string) => void
}

function StatusBadge({ status }: { status: Agent["status"] }) {
  const statusConfig = {
    idle: { bg: "bg-slate-500/10", text: "text-slate-400", label: "Idle" },
    processing: { bg: "bg-blue-500/10", text: "text-blue-400", label: "Processing" },
    waiting: { bg: "bg-amber-500/10", text: "text-amber-400", label: "Waiting" },
    error: { bg: "bg-red-500/10", text: "text-red-400", label: "Error" },
    complete: { bg: "bg-green-500/10", text: "text-green-400", label: "Complete" },
    paused: { bg: "bg-orange-500/10", text: "text-orange-400", label: "Paused" },
    terminated: { bg: "bg-slate-500/10", text: "text-slate-500", label: "Terminated" },
  }

  const config = statusConfig[status]
  return (
    <span className={cn("text-xs font-medium px-2 py-1 rounded-full", config.bg, config.text)}>
      {config.label}
    </span>
  )
}

function AgentTypeIcon({ type }: { type: Agent["type"] }) {
  return (
    <div className="w-6 h-6 rounded flex items-center justify-center bg-primary/10 text-primary">
      <Bot className="w-3.5 h-3.5" />
    </div>
  )
}

interface AgentRowProps {
  node: AgentTreeNode
  depth: number
  onToggleExpand: (node: AgentTreeNode) => void
  onToggleSelect: (node: AgentTreeNode) => void
  onAction?: (agentId: string, action: string) => void
  onSelectAgent?: (agent: Agent) => void
  metricsHistory?: MetricsHistoryAPI
}

function AgentRow({
  node,
  depth,
  onToggleExpand,
  onToggleSelect,
  onAction,
  onSelectAgent,
  metricsHistory,
}: AgentRowProps) {
  const agent = node.agent
  const hasChildren = node.children.length > 0
  const displayMetrics = aggregateChildMetrics(node)
  const isParent = agent.type === "orchestrator"

  // Get sparkline data if metrics history available
  const cpuTrend = metricsHistory?.getMetricTrend(agent.id, "cpu") || []
  const memoryTrend = metricsHistory?.getMetricTrend(agent.id, "memory") || []
  const tokensTrend = metricsHistory?.getMetricTrend(agent.id, "tokensPerMin") || []
  const costTrend = metricsHistory?.getMetricTrend(agent.id, "cost") || []

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-4 py-3 border-b border-border/50 hover:bg-secondary/30 transition-colors group",
        agent.status === "terminated" && "opacity-50",
        node.isSelected && "bg-primary/5"
      )}
      style={{ paddingLeft: `${depth * 20 + 16}px` }}
    >
      {/* Expand button */}
      {hasChildren ? (
        <button
          onClick={() => onToggleExpand(node)}
          className="flex-shrink-0 p-0 hover:bg-secondary rounded"
        >
          {node.isExpanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>
      ) : (
        <div className="w-4 flex-shrink-0" />
      )}

      {/* Checkbox */}
      <Checkbox
        checked={node.isSelected}
        onCheckedChange={() => onToggleSelect(node)}
        className="flex-shrink-0"
      />

      {/* Agent icon and name */}
      <div
        className="flex items-center gap-2 min-w-0 flex-1 cursor-pointer"
        onClick={() => onSelectAgent?.(agent)}
      >
        <AgentTypeIcon type={agent.type} />
        <div className="min-w-0 flex-1">
          <div className="font-mono text-sm font-medium text-foreground truncate">
            {agent.name}
          </div>
          {agent.project && (
            <div className="text-xs text-muted-foreground">{agent.project}</div>
          )}
        </div>
      </div>

      {/* Status badge */}
      <StatusBadge status={agent.status} />

      {/* Metrics sparkline row */}
      <div className="flex items-center gap-3 flex-shrink-0">
        {/* CPU Sparkline */}
        <div className="flex items-center gap-1">
          <Cpu className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
          <MetricSparkline
            data={cpuTrend}
            min={0}
            max={100}
            color="#60a5fa"
            width={48}
            height={18}
            title={`CPU: ${Math.round(displayMetrics.cpu)}%`}
          />
          <span className="text-xs font-mono text-muted-foreground w-7 text-right flex-shrink-0">
            {Math.round(displayMetrics.cpu)}%
          </span>
        </div>

        {/* Memory Sparkline */}
        <div className="flex items-center gap-1">
          <Zap className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
          <MetricSparkline
            data={memoryTrend}
            min={0}
            max={100}
            color="#fbbf24"
            width={48}
            height={18}
            title={`Memory: ${Math.round(displayMetrics.memory)}%`}
          />
          <span className="text-xs font-mono text-muted-foreground w-7 text-right flex-shrink-0">
            {Math.round(displayMetrics.memory)}%
          </span>
        </div>

        {/* Cost */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-xs font-mono text-muted-foreground w-12 text-right">
            ${displayMetrics.cost.toFixed(2)}
          </span>
        </div>

        {/* Last heartbeat */}
        <div className="flex items-center gap-1 flex-shrink-0 hidden md:flex">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-xs text-muted-foreground w-16">
            {getTimeAgo(agent.lastHeartbeat)}
          </span>
        </div>
      </div>

      {/* Context menu */}
      {!isParent && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex-shrink-0 p-1.5 rounded hover:bg-secondary opacity-0 group-hover:opacity-100 transition-opacity">
              <MoreVertical className="w-4 h-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onAction?.(agent.id, "reassign")}>
              Reassign
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAction?.(agent.id, "pause")}>
              {agent.status === "paused" ? "Resume" : "Pause"}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onAction?.(agent.id, "terminate")}
              className="text-destructive"
            >
              Terminate
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onAction?.(agent.id, "inspect")}>
              Inspect Logs
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Error indicator */}
      {agent.status === "error" && (
        <div className="flex-shrink-0">
          <AlertCircle className="w-4 h-4 text-red-400" />
        </div>
      )}
    </div>
  )
}

function getTimeAgo(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)

  if (seconds < 60) return `${seconds}s ago`
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  return "1d+ ago"
}

export function AgentTree({ agents, metricsHistory, onAgentSelect, onAgentAction }: AgentTreeProps) {
  const [roots, setRoots] = useState<AgentTreeNode[]>([])

  // Build tree on mount and when agents change
  useEffect(() => {
    setRoots(buildAgentTree(agents))
  }, [agents])

  const handleToggleExpand = useCallback((node: AgentTreeNode) => {
    toggleNodeExpanded(node)
    // Trigger re-render by creating new reference
    setRoots([...roots])
  }, [roots])

  const handleToggleSelect = useCallback((node: AgentTreeNode) => {
    toggleNodeSelection(node)
    setRoots([...roots])
  }, [roots])

  const flattened = useMemo(() => flattenTree(roots), [roots])

  const summary = useMemo(() => {
    return {
      total: agents.length,
      active: agents.filter(a => a.status === "processing").length,
      idle: agents.filter(a => a.status === "idle").length,
      error: agents.filter(a => a.status === "error").length,
      totalCost: agents.reduce((sum, a) => sum + a.metrics.cost, 0),
    }
  }, [agents])

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header with summary */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Agent Dashboard</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {summary.active} processing / {summary.total} total
            {summary.error > 0 && ` • ${summary.error} errors`}
          </p>
        </div>
        <div className="text-right">
          <div className="text-sm font-semibold text-foreground">${summary.totalCost.toFixed(2)}</div>
          <div className="text-xs text-muted-foreground">Total Cost</div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-2 px-4 py-3 bg-card/50 border-b border-border">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Active</span>
          <span className="text-lg font-semibold text-emerald-400">{summary.active}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Idle</span>
          <span className="text-lg font-semibold text-slate-400">{summary.idle}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Errors</span>
          <span className="text-lg font-semibold text-red-400">{summary.error}</span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Total</span>
          <span className="text-lg font-semibold text-foreground">{summary.total}</span>
        </div>
      </div>

      {/* Agent tree (scrollable) */}
      <div className="flex-1 overflow-y-auto">
        {flattened.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            No agents connected
          </div>
        ) : (
          flattened.map((flatNode) => (
            <AgentRow
              key={flatNode.node.agent.id}
              node={flatNode.node}
              depth={flatNode.depth}
              onToggleExpand={handleToggleExpand}
              onToggleSelect={handleToggleSelect}
              onAction={onAgentAction}
              onSelectAgent={onAgentSelect}
              metricsHistory={metricsHistory}
            />
          ))
        )}
      </div>
    </div>
  )
}
