"use client"

import React from "react"
import { AlertCircle, CheckCircle2, AlertTriangle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { Artifact } from "@/lib/artifact-model"
import { ArtifactValidator } from "@/lib/artifact-model"

interface ArtifactValidatorProps {
  artifact: Artifact
  compact?: boolean
}

/**
 * Validation badge and error display for artifacts
 */
export function ArtifactValidationBadge({ artifact, compact = false }: ArtifactValidatorProps) {
  const validation = React.useMemo(() => {
    return ArtifactValidator.validate(artifact)
  }, [artifact])

  if (validation.valid) {
    return (
      <Badge variant="default" className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 gap-1">
        <CheckCircle2 className="w-3 h-3" />
        Valid
      </Badge>
    )
  }

  if (validation.errors.length > 0) {
    return (
      <Badge variant="destructive" className="bg-red-500/20 text-red-700 dark:text-red-400 gap-1">
        <AlertCircle className="w-3 h-3" />
        {validation.errors.length} Error{validation.errors.length > 1 ? "s" : ""}
      </Badge>
    )
  }

  return (
    <Badge variant="secondary" className="bg-amber-500/20 text-amber-700 dark:text-amber-400 gap-1">
      <AlertTriangle className="w-3 h-3" />
      {validation.warnings.length} Warning{validation.warnings.length > 1 ? "s" : ""}
    </Badge>
  )
}

/**
 * Detailed validation error display
 */
export function ArtifactValidationDetails({ artifact }: ArtifactValidatorProps) {
  const validation = React.useMemo(() => {
    return ArtifactValidator.validate(artifact)
  }, [artifact])

  if (validation.valid && validation.warnings.length === 0) {
    return null
  }

  return (
    <div className="space-y-2 mt-2">
      {validation.errors.length > 0 && (
        <div className="text-xs bg-red-500/10 border border-red-500/30 rounded p-2 space-y-1">
          <div className="font-semibold text-red-700 dark:text-red-400 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            Errors
          </div>
          {validation.errors.map((error, i) => (
            <div key={i} className="text-red-600 dark:text-red-300 text-[11px] pl-4">
              • {error}
            </div>
          ))}
        </div>
      )}

      {validation.warnings.length > 0 && (
        <div className="text-xs bg-amber-500/10 border border-amber-500/30 rounded p-2 space-y-1">
          <div className="font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            Warnings
          </div>
          {validation.warnings.map((warning, i) => (
            <div key={i} className="text-amber-600 dark:text-amber-300 text-[11px] pl-4">
              • {warning}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Inline validation badges for code viewer
 */
interface ValidationInlineProps {
  artifact: Artifact
  lineNumber: number
  error: string
}

export function ValidationInlineComment({ artifact, lineNumber, error }: ValidationInlineProps) {
  return (
    <div className="text-[10px] text-red-400 italic ml-4 mt-1">
      // ⚠️ Line {lineNumber}: {error}
    </div>
  )
}
