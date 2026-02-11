"use client"

import React from "react"
import { Handle, Position } from "reactflow"
import { cn } from "@/lib/utils"
import {
  MessageSquare,
  Database,
  ShieldCheck,
  GitBranch,
  Zap,
  FileOutput,
  Eye,
} from "lucide-react"
import type { CanvasNode, BlockType } from "@/lib/canvas-state"
import { CONNECTION_RULES } from "@/lib/connection-rules"

const blockColors: Record<string, { bg: string; border: string; icon: string }> = {
  task: {
    bg: "bg-blue-500/10",
    border: "border-blue-500/40",
    icon: "text-blue-400",
  },
  decision: {
    bg: "bg-orange-500/10",
    border: "border-orange-500/40",
    icon: "text-orange-400",
  },
  loop: {
    bg: "bg-green-500/10",
    border: "border-green-500/40",
    icon: "text-green-400",
  },
  parallel: {
    bg: "bg-purple-500/10",
    border: "border-purple-500/40",
    icon: "text-purple-400",
  },
  text: {
    bg: "bg-slate-500/10",
    border: "border-slate-500/40",
    icon: "text-slate-400",
  },
  artifact: {
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/40",
    icon: "text-emerald-400",
  },
  preview: {
    bg: "bg-cyan-500/10",
    border: "border-cyan-500/40",
    icon: "text-cyan-400",
  },
}

const blockIcons: Record<string, React.ElementType> = {
  task: Zap,
  decision: GitBranch,
  loop: MessageSquare,
  parallel: Database,
  text: MessageSquare,
  artifact: FileOutput,
  preview: Eye,
}

const handleBaseStyle: React.CSSProperties = {
  width: 8,
  height: 8,
  border: "2px solid",
  transition: "all 150ms ease",
}

export default function BlockNode({ data, selected, isConnecting }: { data: CanvasNode["data"]; selected: boolean; isConnecting?: boolean }) {
  const blockType = (data.blockType || "task") as BlockType
  const colors = blockColors[blockType]
  const Icon = blockIcons[blockType]

  const canBeSource = blockType in CONNECTION_RULES && CONNECTION_RULES[blockType as BlockType].length > 0
  const canBeTarget = Object.values(CONNECTION_RULES).some((targets) =>
    targets.includes(blockType as BlockType)
  )

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
  }

  return (
    <div
      onClick={handleClick}
      className={cn(
        "px-4 py-3 rounded-lg border-2 min-w-[180px] bg-card transition-all cursor-pointer hover:opacity-80",
        colors.bg,
        colors.border,
        selected && "ring-2 ring-primary",
        isConnecting && "opacity-50"
      )}
    >
      <Handle
        type="target"
        position={Position.Top}
        isConnectable={canBeTarget}
        style={{
          ...handleBaseStyle,
          borderColor: canBeTarget ? "#22c55e" : "#ef4444",
          background: canBeTarget ? "#166534" : "#7f1d1d",
        }}
      />
      <div className="flex items-start gap-2">
        <Icon className={cn("w-4 h-4 mt-0.5 shrink-0", colors.icon)} />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-foreground truncate">{data.label}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
            {data.description}
          </p>
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable={canBeSource}
        style={{
          ...handleBaseStyle,
          borderColor: canBeSource ? "#22c55e" : "#ef4444",
          background: canBeSource ? "#166534" : "#7f1d1d",
        }}
      />
    </div>
  )
}
