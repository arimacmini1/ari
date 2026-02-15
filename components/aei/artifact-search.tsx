"use client"

import React, { useState, useMemo, useEffect } from "react"
import { Search, X, Filter } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { Artifact, ArtifactType } from "@/lib/artifact-model"
import { ArtifactValidator } from "@/lib/artifact-model"

interface ArtifactSearchProps {
  artifacts: Artifact[]
  onResultsChange?: (filtered: SearchResult[]) => void
}

export interface SearchResult {
  artifact: Artifact
  matchIndices: number[] // Line numbers where matches occur
  highlights: { start: number; end: number }[]
}

const ARTIFACT_TYPE_LABELS: Record<ArtifactType, string> = {
  code: "Code",
  html: "HTML",
  json: "JSON",
  sql: "SQL",
  config: "Config",
  test: "Test",
  markdown: "Markdown",
  svg: "SVG",
  dockerfile: "Dockerfile",
  yaml: "YAML",
}

/**
 * Search and filter controls for artifact preview panel
 */
export function ArtifactSearch({ artifacts, onResultsChange }: ArtifactSearchProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedTypes, setSelectedTypes] = useState<Set<ArtifactType>>(
    new Set(artifacts.map((a) => a.type))
  )
  const [validationFilter, setValidationFilter] = useState<"all" | "valid" | "errors">("all")
  const [showFilters, setShowFilters] = useState(false)

  const results = useMemo(() => {
    let filteredArtifacts = artifacts

    // Filter by type
    filteredArtifacts = filteredArtifacts.filter((a) => selectedTypes.has(a.type))

    // Filter by validation status
    if (validationFilter !== "all") {
      const withValidation = filteredArtifacts.map((a) => ({
        artifact: a,
        validation: ArtifactValidator.validate(a),
      }))

      if (validationFilter === "valid") {
        filteredArtifacts = withValidation
          .filter((item) => item.validation.valid)
          .map((item) => item.artifact)
      } else if (validationFilter === "errors") {
        filteredArtifacts = withValidation
          .filter((item) => item.validation.errors.length > 0)
          .map((item) => item.artifact)
      }
    }

    // Search by keyword
    const searchResults: SearchResult[] = []

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase()

      filteredArtifacts.forEach((artifact) => {
        const matchIndices: number[] = []
        const highlights: { start: number; end: number }[] = []

        const lines = artifact.content.split("\n")
        lines.forEach((line, lineNum) => {
          const lowerLine = line.toLowerCase()
          let searchIndex = 0

          while ((searchIndex = lowerLine.indexOf(term, searchIndex)) !== -1) {
            matchIndices.push(lineNum)
            highlights.push({
              start: searchIndex,
              end: searchIndex + term.length,
            })
            searchIndex += term.length
          }
        })

        if (matchIndices.length > 0) {
          searchResults.push({
            artifact,
            matchIndices: [...new Set(matchIndices)],
            highlights,
          })
        }
      })
    } else {
      // No search term: return all filtered artifacts
      searchResults.push(
        ...filteredArtifacts.map((a) => ({
          artifact: a,
          matchIndices: [],
          highlights: [],
        }))
      )
    }

    return searchResults
  }, [searchTerm, selectedTypes, validationFilter, artifacts])

  useEffect(() => {
    onResultsChange?.(results)
  }, [results, onResultsChange])

  const handleToggleType = (type: ArtifactType) => {
    const newTypes = new Set(selectedTypes)
    if (newTypes.has(type)) {
      newTypes.delete(type)
    } else {
      newTypes.add(type)
    }
    setSelectedTypes(newTypes)
  }

  const clearSearch = () => {
    setSearchTerm("")
    setSelectedTypes(new Set(artifacts.map((a) => a.type)))
    setValidationFilter("all")
  }

  const hasActiveFilters =
    searchTerm.trim() !== "" ||
    selectedTypes.size !== artifacts.length ||
    validationFilter !== "all"

  return (
    <div className="space-y-3 p-3 border-b border-border">
      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search artifacts..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-8 h-8 text-xs"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm("")}
            className="absolute right-2 top-2.5 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Filter toggle */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {results.length} result{results.length !== 1 ? "s" : ""}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className={cn("h-6 text-xs", showFilters && "bg-accent")}
        >
          <Filter className="w-3 h-3 mr-1" />
          Filters
        </Button>
      </div>

      {/* Filters panel */}
      {showFilters && (
        <div className="space-y-3 pt-2 border-t border-border">
          {/* Type filters */}
          <div>
            <div className="text-[11px] font-semibold text-muted-foreground mb-2">Type</div>
            <div className="flex flex-wrap gap-1">
              {Array.from(
                new Set(artifacts.map((a) => a.type))
              ).map((type) => (
                <Button
                  key={type}
                  variant={selectedTypes.has(type) ? "default" : "outline"}
                  size="sm"
                  className="h-6 text-[10px] px-2"
                  onClick={() => handleToggleType(type)}
                >
                  {ARTIFACT_TYPE_LABELS[type as ArtifactType]}
                </Button>
              ))}
            </div>
          </div>

          {/* Validation filter */}
          <div>
            <div className="text-[11px] font-semibold text-muted-foreground mb-2">Status</div>
            <div className="flex gap-1">
              {(["all", "valid", "errors"] as const).map((status) => (
                <Button
                  key={status}
                  variant={validationFilter === status ? "default" : "outline"}
                  size="sm"
                  className="h-6 text-[10px] px-2"
                  onClick={() => setValidationFilter(status)}
                >
                  {status === "all" && "All"}
                  {status === "valid" && "✅ Valid"}
                  {status === "errors" && "❌ Errors"}
                </Button>
              ))}
            </div>
          </div>

          {/* Clear filters */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSearch}
              className="w-full h-6 text-[10px] text-muted-foreground"
            >
              Clear all filters
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Highlighted search result display
 */
interface SearchResultDisplayProps {
  result: SearchResult
  onJump?: () => void
}

export function SearchResultDisplay({ result, onJump }: SearchResultDisplayProps) {
  const lines = result.artifact.content.split("\n")
  const preview = result.matchIndices.length > 0 ? lines[result.matchIndices[0]] : ""

  return (
    <button
      onClick={onJump}
      className="w-full text-left p-2 hover:bg-accent rounded transition-colors"
    >
      <div className="flex items-center justify-between mb-1">
        <Badge variant="outline" className="text-[10px]">
          {result.artifact.type}
        </Badge>
        <span className="text-[10px] text-muted-foreground">
          {result.matchIndices.length} match{result.matchIndices.length !== 1 ? "es" : ""}
        </span>
      </div>
      {preview && (
        <div className="text-[11px] text-muted-foreground font-mono truncate bg-slate-900/30 px-2 py-1 rounded">
          {highlightText(preview, result.highlights)}
        </div>
      )}
    </button>
  )
}

/**
 * Highlight matching text in preview
 */
function highlightText(
  text: string,
  highlights: { start: number; end: number }[]
): React.ReactNode {
  if (highlights.length === 0) return text

  const parts: React.ReactNode[] = []
  let lastEnd = 0

  const sortedHighlights = [...highlights].sort((a, b) => a.start - b.start)

  sortedHighlights.forEach(({ start, end }) => {
    if (start > lastEnd) {
      parts.push(text.slice(lastEnd, start))
    }
    parts.push(
      <span key={`${start}-${end}`} className="bg-yellow-500/40 text-yellow-100">
        {text.slice(start, end)}
      </span>
    )
    lastEnd = end
  })

  if (lastEnd < text.length) {
    parts.push(text.slice(lastEnd))
  }

  return parts
}
