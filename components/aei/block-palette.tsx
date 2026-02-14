"use client"

import React, { useState, useMemo } from "react"
import {
  Zap,
  GitBranch,
  Repeat,
  GitMerge,
  MessageSquare,
  FileOutput,
  Eye,
  Search,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import type { BlockType } from "@/lib/canvas-state"

interface BlockTemplate {
  type: BlockType
  label: string
  description: string
  icon: React.ElementType
  color: string
  iconColor: string
}

interface BlockCategory {
  name: string
  blocks: BlockTemplate[]
}

const blockCategories: BlockCategory[] = [
  {
    name: "Control Flow",
    blocks: [
      {
        type: "task",
        label: "Task",
        description: "Process or action step",
        icon: Zap,
        color: "bg-blue-500/10 border-blue-500/40",
        iconColor: "text-blue-400",
      },
      {
        type: "decision",
        label: "Decision",
        description: "Conditional branch point",
        icon: GitBranch,
        color: "bg-orange-500/10 border-orange-500/40",
        iconColor: "text-orange-400",
      },
      {
        type: "loop",
        label: "Loop",
        description: "Iterative repetition block",
        icon: Repeat,
        color: "bg-green-500/10 border-green-500/40",
        iconColor: "text-green-400",
      },
      {
        type: "parallel",
        label: "Parallel",
        description: "Concurrent execution paths",
        icon: GitMerge,
        color: "bg-purple-500/10 border-purple-500/40",
        iconColor: "text-purple-400",
      },
    ],
  },
  {
    name: "Input",
    blocks: [
      {
        type: "text",
        label: "Text Input",
        description: "User text input field",
        icon: MessageSquare,
        color: "bg-slate-500/10 border-slate-500/40",
        iconColor: "text-slate-400",
      },
    ],
  },
  {
    name: "Output",
    blocks: [
      {
        type: "artifact",
        label: "Artifact",
        description: "Generated output artifact",
        icon: FileOutput,
        color: "bg-emerald-500/10 border-emerald-500/40",
        iconColor: "text-emerald-400",
      },
      {
        type: "preview",
        label: "Preview",
        description: "Live output preview pane",
        icon: Eye,
        color: "bg-cyan-500/10 border-cyan-500/40",
        iconColor: "text-cyan-400",
      },
    ],
  },
]

interface BlockPaletteProps {
  onAddBlock: (blockType: BlockType) => void
}

export function BlockPalette({ onAddBlock }: BlockPaletteProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [search, setSearch] = useState("")
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>(
    () => Object.fromEntries(blockCategories.map((c) => [c.name, true]))
  )

  const filteredCategories = useMemo(() => {
    if (!search.trim()) return blockCategories
    const q = search.toLowerCase()
    return blockCategories
      .map((cat) => ({
        ...cat,
        blocks: cat.blocks.filter(
          (b) =>
            b.label.toLowerCase().includes(q) ||
            b.description.toLowerCase().includes(q) ||
            b.type.toLowerCase().includes(q)
        ),
      }))
      .filter((cat) => cat.blocks.length > 0)
  }, [search])

  const handleDragStart = (e: React.DragEvent, block: BlockTemplate) => {
    e.dataTransfer.setData("application/aei-block-type", block.type)
    e.dataTransfer.setData("application/aei-block-label", block.label)
    e.dataTransfer.setData("application/aei-block-description", block.description)
    e.dataTransfer.effectAllowed = "move"
  }

  const toggleCategory = (name: string) => {
    setOpenCategories((prev) => ({ ...prev, [name]: !prev[name] }))
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div
        className={cn(
          "flex flex-col border-r border-border bg-card/50 shrink-0 transition-all duration-200",
          collapsed ? "w-12" : "w-40"
        )}
      >
        <div className="flex items-center justify-between px-2 py-2 border-b border-border shrink-0">
          {!collapsed && (
            <span className="text-xs font-semibold text-muted-foreground pl-1">Blocks</span>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className={cn("h-7 w-7 p-0", collapsed && "mx-auto")}
                  onClick={() => setCollapsed((prev) => !prev)}
                  aria-label={collapsed ? "Expand block palette" : "Collapse block palette"}
                >
                {collapsed ? (
                  <PanelLeftOpen className="w-3.5 h-3.5" />
                ) : (
                  <PanelLeftClose className="w-3.5 h-3.5" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              {collapsed ? "Expand palette" : "Collapse palette"}
            </TooltipContent>
          </Tooltip>
        </div>

        {!collapsed && (
          <div className="px-2 py-2 border-b border-border shrink-0">
            <div className="relative">
              <Label htmlFor="block-filter" className="sr-only">
                Filter blocks
              </Label>
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
              <Input
                id="block-filter"
                placeholder="Filter blocks..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-7 text-xs pl-7 bg-background/50"
              />
            </div>
          </div>
        )}

        <ScrollArea className="flex-1">
          <div className={cn("py-1", collapsed ? "px-1" : "px-2")}>
            {filteredCategories.map((category) => (
              <div key={category.name} className="mb-1">
                {!collapsed && (
                  <button
                    onClick={() => toggleCategory(category.name)}
                    className="flex items-center gap-1 w-full px-1 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <span
                      className={cn(
                        "transition-transform text-[8px]",
                        openCategories[category.name] ? "rotate-90" : ""
                      )}
                    >
                      ▶
                    </span>
                    {category.name}
                    <Badge variant="secondary" className="ml-auto h-4 text-[9px] px-1">
                      {category.blocks.length}
                    </Badge>
                  </button>
                )}

                {(collapsed || openCategories[category.name]) && (
                  <div className={cn("flex flex-col gap-0.5", !collapsed && "ml-1")}>
                    {category.blocks.map((block) => {
                      const Icon = block.icon
                      return (
                        <Tooltip key={block.type}>
                          <TooltipTrigger asChild>
                            <button
                              draggable
                              onDragStart={(e) => handleDragStart(e, block)}
                              onClick={() => onAddBlock(block.type)}
                              className={cn(
                                "flex items-center gap-2 rounded-md border transition-colors cursor-grab active:cursor-grabbing",
                                "hover:bg-accent/50",
                                block.color,
                                collapsed
                                  ? "w-8 h-8 justify-center p-0 mx-auto"
                                  : "px-2 py-1.5 w-full"
                              )}
                            >
                              <Icon className={cn("w-3.5 h-3.5 shrink-0", block.iconColor)} />
                              {!collapsed && (
                                <span className="text-xs text-foreground truncate">
                                  {block.label}
                                </span>
                              )}
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="right" className="text-xs">
                            <p className="font-medium">{block.label}</p>
                            <p className="text-muted-foreground">{block.description}</p>
                          </TooltipContent>
                        </Tooltip>
                      )
                    })}
                  </div>
                )}
              </div>
            ))}

            {filteredCategories.length === 0 && !collapsed && (
              <p className="text-xs text-muted-foreground text-center py-4">No blocks found</p>
            )}
          </div>
        </ScrollArea>
      </div>
    </TooltipProvider>
  )
}
