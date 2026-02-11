"use client"

import { useState } from "react"
import {
  GitBranch,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowDownRight,
  Maximize2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface TraceNode {
  id: string
  label: string
  agent: string
  confidence: number
  duration: string
  status: "success" | "warning" | "pending"
  children?: TraceNode[]
}

const traceData: TraceNode[] = [
  {
    id: "1",
    label: "Parse User Requirements",
    agent: "orchestrator-main",
    confidence: 0.97,
    duration: "1.2s",
    status: "success",
    children: [
      {
        id: "1.1",
        label: "Extract entities & constraints",
        agent: "nlp-parser",
        confidence: 0.94,
        duration: "0.8s",
        status: "success",
      },
      {
        id: "1.2",
        label: "Validate against schema",
        agent: "schema-validator",
        confidence: 0.99,
        duration: "0.3s",
        status: "success",
      },
    ],
  },
  {
    id: "2",
    label: "Generate Architecture Plan",
    agent: "code-gen-alpha",
    confidence: 0.89,
    duration: "3.4s",
    status: "success",
    children: [
      {
        id: "2.1",
        label: "Evaluate design patterns",
        agent: "code-gen-alpha",
        confidence: 0.85,
        duration: "2.1s",
        status: "warning",
      },
      {
        id: "2.2",
        label: "Dependency resolution",
        agent: "code-gen-alpha",
        confidence: 0.92,
        duration: "1.1s",
        status: "success",
      },
    ],
  },
  {
    id: "3",
    label: "Run Test Suite",
    agent: "test-runner-01",
    confidence: 0.91,
    duration: "8.7s",
    status: "success",
  },
  {
    id: "4",
    label: "Security Compliance Check",
    agent: "security-scan",
    confidence: 0.76,
    duration: "-",
    status: "pending",
  },
]

function ConfidenceBar({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-1.5 rounded-full bg-secondary overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            value >= 0.9 ? "bg-emerald-400" : value >= 0.8 ? "bg-amber-400" : "bg-destructive"
          )}
          style={{ width: `${value * 100}%` }}
        />
      </div>
      <span className="text-xs font-mono text-muted-foreground w-8">{(value * 100).toFixed(0)}%</span>
    </div>
  )
}

function TraceNodeItem({ node, depth = 0 }: { node: TraceNode; depth?: number }) {
  const [open, setOpen] = useState(depth === 0)

  return (
    <div>
      <button
        onClick={() => node.children && setOpen(!open)}
        className={cn(
          "flex items-center w-full px-3 py-2.5 text-left rounded-lg hover:bg-secondary/50 transition-colors group",
          depth > 0 && "ml-6"
        )}
      >
        <div className="flex items-center gap-2.5 shrink-0 w-6">
          {node.children ? (
            <ChevronRight
              className={cn("w-4 h-4 text-muted-foreground transition-transform", open && "rotate-90")}
            />
          ) : (
            <ArrowDownRight className="w-4 h-4 text-muted-foreground" />
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0 w-5">
          {node.status === "success" && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
          {node.status === "warning" && <AlertTriangle className="w-4 h-4 text-amber-400" />}
          {node.status === "pending" && (
            <div className="w-4 h-4 rounded-full border-2 border-muted-foreground border-t-transparent animate-spin" />
          )}
        </div>

        <span className="text-sm font-medium text-foreground truncate flex-1 ml-2">
          {node.label}
        </span>

        <span className="text-xs font-mono text-muted-foreground shrink-0 ml-4 w-32 text-right">
          {node.agent}
        </span>

        <div className="shrink-0 ml-4">
          <ConfidenceBar value={node.confidence} />
        </div>

        <span className="text-xs font-mono text-muted-foreground shrink-0 ml-4 w-12 text-right flex items-center justify-end gap-1">
          <Clock className="w-3 h-3" />
          {node.duration}
        </span>
      </button>

      {open && node.children && (
        <div className="border-l-2 border-border ml-6">
          {node.children.map((child) => (
            <TraceNodeItem key={child.id} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  )
}

export function TraceViewer() {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
        <div className="flex items-center gap-3">
          <GitBranch className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">AI Trace Viewer</h3>
          <span className="text-xs font-mono text-muted-foreground px-2 py-0.5 rounded bg-secondary">
            workflow-2027-001
          </span>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7">
          <Maximize2 className="w-3.5 h-3.5 text-muted-foreground" />
        </Button>
      </div>

      {/* Column headers */}
      <div className="flex items-center px-6 py-2 border-b border-border text-xs text-muted-foreground shrink-0">
        <span className="w-6" />
        <span className="w-5" />
        <span className="flex-1 ml-2">Decision Node</span>
        <span className="w-32 text-right ml-4">Agent</span>
        <span className="ml-4 w-28">Confidence</span>
        <span className="w-12 text-right ml-4">Time</span>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2">
        {traceData.map((node) => (
          <TraceNodeItem key={node.id} node={node} />
        ))}
      </div>
    </div>
  )
}
