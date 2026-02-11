"use client"

import React, { useState, useMemo } from "react"
import { ChevronRight, Package, Copy, Download, GitCompare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import type { Artifact, ArtifactType } from "@/lib/artifact-model"
import { ArtifactViewer } from "./artifact-viewer"
import { ArtifactSearch, type SearchResult } from "./artifact-search"
import { ArtifactDiffViewer } from "./artifact-diff-viewer"

interface ArtifactPreviewPanelProps {
  artifacts: Artifact[]
  previousArtifacts?: Artifact[]
  isExpanded: boolean
  onToggle: (expanded: boolean) => void
}

type TabGroupKey = ArtifactType

/**
 * Main artifact preview panel for Orchestrator Hub
 * Right sidebar showing artifact tabs with syntax highlighting, search, and diff
 */
export function ArtifactPreviewPanel({
  artifacts,
  previousArtifacts = [],
  isExpanded,
  onToggle,
}: ArtifactPreviewPanelProps) {
  const [selectedTab, setSelectedTab] = useState<TabGroupKey | undefined>()
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [filteredArtifacts, setFilteredArtifacts] = useState<Artifact[] | null>(null)
  const [showDiff, setShowDiff] = useState(false)
  const [diffArtifactIndex, setDiffArtifactIndex] = useState<number | null>(null)

  const displayArtifacts = filteredArtifacts ?? artifacts

  // Group artifacts by type
  const groupedArtifacts = useMemo(() => {
    const groups: Partial<Record<TabGroupKey, Artifact[]>> = {}

    displayArtifacts.forEach((artifact) => {
      if (!groups[artifact.type]) {
        groups[artifact.type] = []
      }
      groups[artifact.type]!.push(artifact)
    })

    return groups
  }, [displayArtifacts])

  // Set initial tab if none selected
  React.useEffect(() => {
    const keys = Object.keys(groupedArtifacts)
    if ((!selectedTab || !groupedArtifacts[selectedTab]) && keys.length > 0) {
      setSelectedTab(keys[0] as TabGroupKey)
    }
  }, [groupedArtifacts, selectedTab])

  const handleCopyArtifact = (artifact: Artifact) => {
    navigator.clipboard.writeText(artifact.content)
    setCopiedId(artifact.metadata.version_id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleExportArtifact = (artifact: Artifact) => {
    const extension = getFileExtension(artifact.type, artifact.language)
    const filename = `artifact_${artifact.metadata.version_id.slice(0, 8)}.${extension}`

    const blob = new Blob([artifact.content], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleSearchResults = (results: SearchResult[]) => {
    if (results.length === artifacts.length) {
      setFilteredArtifacts(null)
    } else {
      setFilteredArtifacts(results.map((r) => r.artifact))
    }
  }

  // Find matching previous artifact for diff
  const findPreviousArtifact = (artifact: Artifact, index: number): Artifact | null => {
    if (!previousArtifacts.length) return null
    // Match by type and position within same-type group
    const sameType = previousArtifacts.filter((a) => a.type === artifact.type)
    const currentSameType = artifacts.filter((a) => a.type === artifact.type)
    const posInType = currentSameType.indexOf(artifact)
    return sameType[posInType] ?? null
  }

  if (!artifacts.length) {
    return (
      <div className="w-80 border-l border-slate-700 flex items-center justify-center text-center p-4 shrink-0">
        <div className="text-muted-foreground">
          <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-xs">No artifacts yet. Run simulation to generate.</p>
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "flex flex-col h-full bg-slate-900 border-l border-slate-700 shrink-0 overflow-hidden",
        !isExpanded && "hidden"
      )}
      style={{ width: "40%" }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-700 shrink-0">
        <Package className="w-4 h-4 text-blue-400" />
        <h3 className="text-sm font-semibold flex-1">Artifacts</h3>
        <Badge variant="secondary" className="text-xs">
          {artifacts.length}
        </Badge>
        {previousArtifacts.length > 0 && (
          <Button
            variant={showDiff ? "default" : "ghost"}
            size="sm"
            onClick={() => setShowDiff(!showDiff)}
            className="h-6 px-2 text-xs"
          >
            <GitCompare className="w-3 h-3 mr-1" />
            Diff
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onToggle(false)}
          className="h-6 w-6 p-0"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Search and filters */}
      <ArtifactSearch artifacts={artifacts} onResultsChange={handleSearchResults} />

      {/* Tabs */}
      <Tabs
        value={selectedTab}
        onValueChange={(value) => setSelectedTab(value as TabGroupKey)}
        className="flex flex-col flex-1 overflow-hidden"
      >
        <TabsList className="w-full justify-start rounded-none border-b border-slate-700 bg-transparent p-0 h-auto gap-0 shrink-0">
          {Object.entries(groupedArtifacts).map(([type, typeArtifacts]) => (
            <TabsTrigger
              key={type}
              value={type}
              className={cn(
                "rounded-none border-b-2 border-transparent px-3 py-2 text-xs font-medium",
                "data-[state=active]:border-blue-400 data-[state=active]:bg-transparent",
                "relative"
              )}
            >
              {type}
              {typeArtifacts!.length > 1 && (
                <Badge variant="outline" className="ml-1 text-[10px] px-1">
                  {typeArtifacts!.length}
                </Badge>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {Object.entries(groupedArtifacts).map(([type, typeArtifacts]) => (
            <TabsContent
              key={type}
              value={type}
              className="m-0 p-0 h-full overflow-y-auto"
            >
              <div className="divide-y divide-slate-700">
                {typeArtifacts!.map((artifact, idx) => {
                  const prevArtifact = findPreviousArtifact(artifact, idx)
                  const globalIdx = artifacts.indexOf(artifact)

                  return (
                    <div key={idx} className="p-3 hover:bg-slate-800/50 transition-colors">
                      {/* Artifact header with metadata */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px]">
                            {artifact.language || artifact.type}
                          </Badge>
                          <span className="text-[11px] text-slate-400">
                            {(artifact.metadata.size / 1024).toFixed(1)}KB · {artifact.metadata.lines} lines
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500">
                          v{artifact.metadata.version_id.slice(0, 8)}
                        </span>
                      </div>

                      {/* Action buttons */}
                      <div className="flex gap-1 mb-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => handleCopyArtifact(artifact)}
                        >
                          <Copy className="w-3 h-3 mr-1" />
                          {copiedId === artifact.metadata.version_id ? "Copied" : "Copy"}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => handleExportArtifact(artifact)}
                        >
                          <Download className="w-3 h-3 mr-1" />
                          Export
                        </Button>
                        {prevArtifact && (
                          <Button
                            variant={diffArtifactIndex === globalIdx ? "default" : "ghost"}
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() =>
                              setDiffArtifactIndex(
                                diffArtifactIndex === globalIdx ? null : globalIdx
                              )
                            }
                          >
                            <GitCompare className="w-3 h-3 mr-1" />
                            Diff
                          </Button>
                        )}
                      </div>

                      {/* Diff viewer */}
                      {showDiff && prevArtifact && diffArtifactIndex === globalIdx && (
                        <div className="mb-2">
                          <ArtifactDiffViewer
                            oldArtifact={prevArtifact}
                            newArtifact={artifact}
                          />
                        </div>
                      )}

                      {/* Artifact preview */}
                      <ArtifactViewer artifact={artifact} compact />
                    </div>
                  )
                })}
              </div>
            </TabsContent>
          ))}
        </div>
      </Tabs>
    </div>
  )
}

function getFileExtension(type: ArtifactType, language?: string): string {
  switch (type) {
    case "code":
      switch (language) {
        case "python":
          return "py"
        case "javascript":
          return "js"
        case "typescript":
          return "ts"
        default:
          return "txt"
      }
    case "html":
      return "html"
    case "json":
      return "json"
    case "sql":
      return "sql"
    case "config":
      return "yml"
    case "test":
      return "test.js"
    case "markdown":
      return "md"
    case "svg":
      return "svg"
    case "dockerfile":
      return "Dockerfile"
    case "yaml":
      return "yml"
    default:
      return "txt"
  }
}
