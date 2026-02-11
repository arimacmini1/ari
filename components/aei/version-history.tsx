"use client"

import React from "react"
import { X } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { CanvasVersion } from "@/lib/canvas-versions"

interface VersionHistoryProps {
  versions: CanvasVersion[]
  currentVersionId: string | null
  onRevert: (versionId: string) => void
  onClose: () => void
}

export function VersionHistory({
  versions,
  currentVersionId,
  onRevert,
  onClose,
}: VersionHistoryProps) {
  const sorted = [...versions].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )

  return (
    <div className="w-[280px] border-l border-border bg-card/50 flex flex-col shrink-0">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <h3 className="text-sm font-semibold text-foreground">Version History</h3>
        <button
          onClick={onClose}
          className="p-1 hover:bg-secondary/50 rounded transition-colors"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          {sorted.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">
              No versions saved yet
            </p>
          )}
          {sorted.map((version) => {
            const isCurrent = version.version_id === currentVersionId
            const { diff_summary: diff } = version
            return (
              <div
                key={version.version_id}
                className={`rounded-md border p-3 space-y-2 ${
                  isCurrent
                    ? "border-primary ring-1 ring-primary"
                    : "border-border"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(version.timestamp), {
                      addSuffix: true,
                    })}
                  </span>
                  {isCurrent && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      Current
                    </Badge>
                  )}
                </div>

                <div className="flex flex-wrap gap-1">
                  {diff.nodes_added > 0 && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-green-500 border-green-500/30">
                      +{diff.nodes_added} node{diff.nodes_added !== 1 ? "s" : ""}
                    </Badge>
                  )}
                  {diff.nodes_removed > 0 && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-red-500 border-red-500/30">
                      -{diff.nodes_removed} node{diff.nodes_removed !== 1 ? "s" : ""}
                    </Badge>
                  )}
                  {diff.nodes_modified > 0 && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-yellow-500 border-yellow-500/30">
                      ~{diff.nodes_modified} modified
                    </Badge>
                  )}
                  {diff.edges_added > 0 && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-green-500 border-green-500/30">
                      +{diff.edges_added} edge{diff.edges_added !== 1 ? "s" : ""}
                    </Badge>
                  )}
                  {diff.edges_removed > 0 && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-red-500 border-red-500/30">
                      -{diff.edges_removed} edge{diff.edges_removed !== 1 ? "s" : ""}
                    </Badge>
                  )}
                </div>

                {!isCurrent && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full h-6 text-[10px]"
                    onClick={() => onRevert(version.version_id)}
                  >
                    Revert
                  </Button>
                )}
              </div>
            )
          })}
        </div>
      </ScrollArea>
    </div>
  )
}
