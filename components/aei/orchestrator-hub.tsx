"use client"

import { Network, ArrowRight, Zap } from "lucide-react"
import { cn } from "@/lib/utils"

interface OrchestratorNode {
  id: string
  label: string
  type: "orchestrator" | "agent" | "output"
  status: "active" | "idle" | "processing"
  connections: string[]
}

const nodes: OrchestratorNode[] = [
  {
    id: "orch-main",
    label: "Orchestrator",
    type: "orchestrator",
    status: "active",
    connections: ["code-gen", "test-run", "sec-scan"],
  },
  {
    id: "code-gen",
    label: "code-gen-alpha",
    type: "agent",
    status: "processing",
    connections: ["output-1"],
  },
  {
    id: "test-run",
    label: "test-runner-01",
    type: "agent",
    status: "active",
    connections: ["output-1"],
  },
  {
    id: "sec-scan",
    label: "security-scan",
    type: "agent",
    status: "idle",
    connections: ["output-1"],
  },
  {
    id: "output-1",
    label: "Artifact Output",
    type: "output",
    status: "idle",
    connections: [],
  },
]

function NodeBubble({ node }: { node: OrchestratorNode }) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-lg border transition-all",
        node.type === "orchestrator" && "border-primary/40 bg-primary/5",
        node.type === "agent" && node.status === "processing" && "border-primary/30 bg-primary/5",
        node.type === "agent" && node.status !== "processing" && "border-border bg-card",
        node.type === "output" && "border-dashed border-border bg-secondary/30"
      )}
    >
      <div
        className={cn(
          "w-2 h-2 rounded-full shrink-0",
          node.status === "active" && "bg-emerald-400",
          node.status === "processing" && "bg-primary animate-pulse",
          node.status === "idle" && "bg-muted-foreground/40"
        )}
      />
      <div className="min-w-0">
        <p
          className={cn(
            "text-[11px] font-medium truncate",
            node.type === "orchestrator" ? "text-primary" : "text-foreground"
          )}
        >
          {node.label}
        </p>
        <p className="text-[9px] text-muted-foreground capitalize">{node.type}</p>
      </div>
    </div>
  )
}

export function OrchestratorHub() {
  const orchestrator = nodes.find((n) => n.type === "orchestrator")!
  const agentNodes = nodes.filter((n) => n.type === "agent")
  const outputNode = nodes.find((n) => n.type === "output")!

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-6 py-3 border-b border-border shrink-0">
        <Network className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Orchestrator Hub</h3>
        <span className="text-xs font-mono text-muted-foreground ml-auto">
          3 agents connected
        </span>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="flex items-center gap-6">
          <NodeBubble node={orchestrator} />

          <div className="flex flex-col items-center">
            <ArrowRight className="w-5 h-5 text-primary/50" />
          </div>

          <div className="flex flex-col gap-3">
            {agentNodes.map((agent) => (
              <div key={agent.id} className="flex items-center gap-4">
                <NodeBubble node={agent} />
                <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
              </div>
            ))}
          </div>

          <NodeBubble node={outputNode} />
        </div>

        <div className="mt-6 flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
          <Zap className="w-4 h-4 text-primary shrink-0" />
          <p className="text-sm text-primary">
            Auto-scaling: Orchestrator may spawn additional agents based on workload demand.
          </p>
        </div>
      </div>
    </div>
  )
}
