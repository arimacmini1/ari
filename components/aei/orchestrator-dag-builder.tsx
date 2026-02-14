"use client"

import { useMemo, useState } from "react"
import ReactFlow, {
  Background,
  Controls,
  MarkerType,
  addEdge,
  type Connection,
  type Edge,
  type Node,
  useEdgesState,
  useNodesState,
} from "reactflow"
import "reactflow/dist/style.css"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { criticalPathLength, estimateRecommendedAgents, type DagNodeKind } from "@/lib/orchestrator-dag"
import type { Rule } from "@/app/orchestrator/page"

const nodeStyles: Record<DagNodeKind, string> = {
  task: "bg-blue-900/30 border-blue-700 text-blue-100",
  decision: "bg-amber-900/30 border-amber-700 text-amber-100",
  agent: "bg-emerald-900/30 border-emerald-700 text-emerald-100",
}

function makeNode(kind: DagNodeKind, index: number): Node {
  const id = `${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
  return {
    id,
    type: "default",
    position: { x: 80 + (index % 4) * 180, y: 80 + Math.floor(index / 4) * 120 },
    data: { label: `${kind.toUpperCase()} ${index + 1}`, kind },
    className: `rounded-md border px-2 py-1 text-xs shadow-sm ${nodeStyles[kind]}`,
  }
}

interface OrchestratorDagBuilderProps {
  rule: Rule
}

export default function OrchestratorDagBuilder({ rule }: OrchestratorDagBuilderProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const [selectedKind, setSelectedKind] = useState<DagNodeKind>("task")

  const onConnect = (connection: Connection) => {
    setEdges((current) =>
      addEdge(
        {
          ...connection,
          animated: true,
          markerEnd: { type: MarkerType.ArrowClosed, color: "#64748b" },
          style: { stroke: "#64748b", strokeWidth: 1.5 },
        },
        current
      )
    )
  }

  const addNode = () => {
    setNodes((current) => [...current, makeNode(selectedKind, current.length)])
  }

  const clearGraph = () => {
    setNodes([])
    setEdges([])
  }

  const taskCount = useMemo(
    () => nodes.filter((node) => (node.data as { kind?: DagNodeKind } | undefined)?.kind === "task").length,
    [nodes]
  )
  const criticalPath = useMemo(() => criticalPathLength(nodes, edges), [nodes, edges])
  const recommendedAgents = useMemo(
    () =>
      estimateRecommendedAgents({
        taskCount,
        criticalPath,
        priority: rule.priority,
      }),
    [criticalPath, rule.priority, taskCount]
  )
  const maxAgents = rule.constraints.max_agents

  return (
    <div className="space-y-3 h-full flex flex-col">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {(["task", "decision", "agent"] as const).map((kind) => (
            <Button
              key={kind}
              type="button"
              size="sm"
              variant={selectedKind === kind ? "default" : "outline"}
              className="h-7 text-xs"
              onClick={() => setSelectedKind(kind)}
            >
              {kind}
            </Button>
          ))}
          <Button type="button" size="sm" className="h-7 text-xs" onClick={addNode}>
            Add node
          </Button>
          <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={clearGraph}>
            Clear
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">nodes {nodes.length}</Badge>
          <Badge variant="secondary">edges {edges.length}</Badge>
          <Badge variant="secondary">critical path {criticalPath}</Badge>
        </div>
      </div>

      <div className="rounded-md border border-slate-700 bg-slate-950/60 p-2 text-xs text-slate-300">
        <div className="flex flex-wrap items-center gap-2">
          <span>Dynamic allocation recommendation:</span>
          <Badge className="bg-emerald-900/40 text-emerald-200 border-emerald-700">
            {recommendedAgents} agents
          </Badge>
          {typeof maxAgents === "number" && (
            <>
              <span className="text-slate-400">rule max:</span>
              <Badge variant="secondary">{maxAgents}</Badge>
              {recommendedAgents > maxAgents && (
                <span className="text-amber-300">
                  recommended exceeds rule cap by {recommendedAgents - maxAgents}
                </span>
              )}
            </>
          )}
        </div>
      </div>

      <div className="min-h-[340px] flex-1 rounded-md border border-slate-700 overflow-hidden">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          fitView
          proOptions={{ hideAttribution: true }}
        >
          <Background />
          <Controls />
        </ReactFlow>
      </div>
    </div>
  )
}

