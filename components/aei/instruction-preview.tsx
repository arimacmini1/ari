"use client"

import React from "react"
import { X, Play, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import type { InstructionGraph, InstructionTask, InstructionDependency } from "@/lib/instruction-graph"

const TASK_TYPE_COLORS: Record<InstructionTask["task_type"], string> = {
  atomic: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  conditional: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  iteration: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  concurrent: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  input: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  output: "bg-rose-500/20 text-rose-400 border-rose-500/30",
}

const DELTA_BADGE: Record<string, string> = {
  add: "bg-green-500/20 text-green-400 border-green-500/30",
  update: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  remove: "bg-red-500/20 text-red-400 border-red-500/30",
}

interface InstructionPreviewProps {
  graph: InstructionGraph
  deltas?: Map<string, "add" | "update" | "remove">
  onExecute: () => void
  onClose: () => void
}

export function InstructionPreview({ graph, deltas, onExecute, onClose }: InstructionPreviewProps) {
  const costDollars = (graph.metadata.estimated_cost_cents / 100).toFixed(2)

  return (
    <div className="w-[400px] border-l border-border bg-card/50 flex flex-col shrink-0">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <h3 className="text-sm font-semibold text-foreground">Instruction Graph Preview</h3>
        <button
          onClick={onClose}
          className="p-1 hover:bg-secondary/50 rounded transition-colors"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border bg-card/30 shrink-0 text-[10px] text-muted-foreground flex-wrap">
        <span>{graph.metadata.total_tasks} tasks</span>
        <span>{graph.dependencies.length} dependencies</span>
        <span>~${costDollars} est. cost</span>
        <span>~{graph.metadata.estimated_duration_ms}ms</span>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-foreground">Tasks</h4>
            {graph.tasks.map((task) => {
              const delta = deltas?.get(task.source_node_id)
              return (
                <div
                  key={task.task_id}
                  className={cn(
                    "border border-border rounded-lg p-3 space-y-2 bg-secondary/20",
                    delta === "remove" && "opacity-50"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono text-muted-foreground truncate">
                      {task.task_id}
                    </span>
                    <div className="flex items-center gap-1">
                      {delta && (
                        <Badge
                          variant="outline"
                          className={cn("text-[9px] px-1.5 py-0 h-4 uppercase", DELTA_BADGE[delta])}
                        >
                          {delta === "add" ? "NEW" : delta === "update" ? "UPDATED" : "REMOVED"}
                        </Badge>
                      )}
                      <Badge
                        variant="outline"
                        className={cn("text-[9px] px-1.5 py-0 h-4", TASK_TYPE_COLORS[task.task_type])}
                      >
                        {task.task_type}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-xs text-foreground">{task.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">
                      agent: {task.agent_type_hint}
                    </span>
                    <div className="flex items-center gap-1">
                      <div
                        className="h-1.5 rounded-full bg-primary/60"
                        style={{ width: `${Math.max(task.priority * 0.4, 8)}px` }}
                      />
                      <span className="text-[9px] text-muted-foreground">{task.priority}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {graph.dependencies.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-foreground">Dependencies</h4>
                {graph.dependencies.map((dep, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 text-[10px] text-muted-foreground font-mono"
                  >
                    <span className="truncate">{dep.from_task_id}</span>
                    <ArrowRight className="w-3 h-3 shrink-0 text-primary/60" />
                    <span className="truncate">{dep.to_task_id}</span>
                    <Badge
                      variant="outline"
                      className="text-[9px] px-1.5 py-0 h-4 ml-auto shrink-0"
                    >
                      {dep.dependency_type}
                    </Badge>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </ScrollArea>

      <div className="flex gap-2 p-4 border-t border-border shrink-0">
        <Button
          size="sm"
          className="flex-1 h-8 text-xs gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
          onClick={onExecute}
        >
          <Play className="w-3 h-3" />
          Execute
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="flex-1 h-8 text-xs"
          onClick={onClose}
        >
          Cancel
        </Button>
      </div>
    </div>
  )
}
