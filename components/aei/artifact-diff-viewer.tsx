"use client"

import React, { useMemo } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { Artifact } from "@/lib/artifact-model"

interface ArtifactDiffViewerProps {
  oldArtifact: Artifact
  newArtifact: Artifact
}

interface DiffLine {
  type: "added" | "removed" | "unchanged"
  content: string
  lineNumber?: number
}

/**
 * Side-by-side diff viewer for artifact comparison
 * Shows changes when re-simulating with different parameters
 */
export function ArtifactDiffViewer({ oldArtifact, newArtifact }: ArtifactDiffViewerProps) {
  const diff = useMemo(() => {
    return computeDiff(oldArtifact.content, newArtifact.content)
  }, [oldArtifact.content, newArtifact.content])

  const stats = useMemo(() => {
    const added = diff.filter((d) => d.type === "added").length
    const removed = diff.filter((d) => d.type === "removed").length
    const unchanged = diff.filter((d) => d.type === "unchanged").length

    return { added, removed, unchanged, total: added + removed + unchanged }
  }, [diff])

  return (
    <div className="space-y-3">
      {/* Summary */}
      <div className="flex items-center gap-2 text-xs">
        <Badge variant="outline" className="bg-green-500/20 text-green-700 dark:text-green-400">
          +{stats.added}
        </Badge>
        <Badge variant="outline" className="bg-red-500/20 text-red-700 dark:text-red-400">
          -{stats.removed}
        </Badge>
        <Badge variant="outline" className="text-slate-600 dark:text-slate-400">
          ={stats.unchanged}
        </Badge>
        <span className="text-muted-foreground">
          {stats.total} lines total ({((stats.unchanged / stats.total) * 100).toFixed(0)}% unchanged)
        </span>
      </div>

      {/* Diff view */}
      <Card className="bg-slate-950 dark:bg-slate-950 border-slate-800 overflow-hidden">
        <div className="font-mono text-xs overflow-x-auto">
          <table className="w-full">
            <tbody>
              {diff.map((line, i) => (
                <tr
                  key={i}
                  className={cn(
                    "hover:bg-slate-900 transition-colors",
                    line.type === "added" && "bg-green-500/10",
                    line.type === "removed" && "bg-red-500/10",
                    line.type === "unchanged" && "hover:bg-slate-900"
                  )}
                >
                  <td className="select-none px-3 py-1 text-slate-500 border-r border-slate-700 text-right w-12 shrink-0">
                    <span className="text-[10px]">
                      {line.type === "added" ? "+" : line.type === "removed" ? "-" : " "}
                    </span>
                  </td>
                  <td
                    className={cn(
                      "px-4 py-1 whitespace-pre-wrap break-words font-mono text-[11px]",
                      line.type === "added" && "text-green-400",
                      line.type === "removed" && "text-red-400",
                      line.type === "unchanged" && "text-slate-300"
                    )}
                  >
                    {line.content}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Changes explanation */}
      {stats.added > 0 || stats.removed > 0 ? (
        <div className="text-xs text-muted-foreground p-2 bg-accent/30 rounded border border-border">
          {stats.added > 0 && <div>✨ {stats.added} new line{stats.added > 1 ? "s" : ""} added</div>}
          {stats.removed > 0 && <div>🗑️ {stats.removed} line{stats.removed > 1 ? "s" : ""} removed</div>}
          {stats.added > 0 && stats.removed > 0 && (
            <div>
              📊 {Math.round(((stats.added + stats.removed) / stats.total) * 100)}% of content changed
            </div>
          )}
        </div>
      ) : (
        <div className="text-xs text-muted-foreground p-2 bg-accent/30 rounded border border-border">
          ✅ No changes between artifacts
        </div>
      )}
    </div>
  )
}

/**
 * Simple line-based diff algorithm
 * Compares old and new content line by line
 */
function computeDiff(oldContent: string, newContent: string): DiffLine[] {
  const oldLines = oldContent.split("\n")
  const newLines = newContent.split("\n")

  const result: DiffLine[] = []
  const maxLines = Math.max(oldLines.length, newLines.length)

  // Simple line-by-line comparison
  // For MVP: use basic approach. Production should use diff-match-patch
  for (let i = 0; i < maxLines; i++) {
    const oldLine = oldLines[i]
    const newLine = newLines[i]

    if (oldLine === newLine) {
      if (oldLine !== undefined) {
        result.push({
          type: "unchanged",
          content: oldLine,
        })
      }
    } else {
      // Line changed
      if (oldLine !== undefined) {
        result.push({
          type: "removed",
          content: oldLine,
        })
      }
      if (newLine !== undefined) {
        result.push({
          type: "added",
          content: newLine,
        })
      }
    }
  }

  // If too many lines, truncate and show summary
  if (result.length > 100) {
    const preview = result.slice(0, 50)
    preview.push({
      type: "unchanged",
      content: `... (${result.length - 50} more lines)`,
    })
    return preview
  }

  return result
}

/**
 * Compact diff summary for artifact preview
 */
interface DiffSummaryProps {
  oldArtifact: Artifact
  newArtifact: Artifact
}

export function DiffSummary({ oldArtifact, newArtifact }: DiffSummaryProps) {
  const oldLines = oldArtifact.content.split("\n").length
  const newLines = newArtifact.content.split("\n").length
  const sizeDiff = newArtifact.metadata.size - oldArtifact.metadata.size

  return (
    <div className="flex items-center gap-3 text-xs">
      <div className="flex items-center gap-1">
        <span className="text-muted-foreground">Lines:</span>
        <span className={sizeDiff >= 0 ? "text-green-600" : "text-red-600"}>
          {oldLines} → {newLines}
        </span>
      </div>
      <div className="w-px h-4 bg-border" />
      <div className="flex items-center gap-1">
        <span className="text-muted-foreground">Size:</span>
        <span className={sizeDiff >= 0 ? "text-green-600" : "text-red-600"}>
          {(oldArtifact.metadata.size / 1024).toFixed(1)}KB → {(newArtifact.metadata.size / 1024).toFixed(1)}KB
        </span>
      </div>
      {sizeDiff !== 0 && (
        <>
          <div className="w-px h-4 bg-border" />
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground">Δ:</span>
            <span className={sizeDiff >= 0 ? "text-green-600" : "text-red-600"}>
              {sizeDiff >= 0 ? "+" : ""}{(sizeDiff / 1024).toFixed(1)}KB
            </span>
          </div>
        </>
      )}
    </div>
  )
}
