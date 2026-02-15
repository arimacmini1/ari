"use client"

import React, { useMemo } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { Artifact } from "@/lib/artifact-model"
import { ArtifactValidator as Validator } from "@/lib/artifact-model"
import { ArtifactValidationDetails } from "./artifact-validator"

interface ArtifactViewerProps {
  artifact: Artifact
  compact?: boolean
  showValidation?: boolean
}

/**
 * Renders artifact content with syntax highlighting and type-specific formatting
 * Supports code, HTML, JSON, SQL, config files
 */
export function ArtifactViewer({ artifact, compact = false, showValidation = true }: ArtifactViewerProps) {
  const validation = useMemo(() => {
    if (!showValidation) return null
    return Validator.validate(artifact)
  }, [artifact, showValidation])

  const content = useMemo(() => {
    if (compact && artifact.content.length > 500) {
      return artifact.content.substring(0, 500) + "\n... (truncated)"
    }
    return artifact.content
  }, [artifact.content, compact])

  const lines = content.split("\n")
  const maxLines = compact ? 15 : undefined

  return (
    <div className="space-y-2">
      {/* Validation badge */}
      {showValidation && validation && (
        <div className="flex gap-1">
          {validation.valid ? (
            <Badge variant="default" className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-400">
              ✅ Valid
            </Badge>
          ) : validation.errors.length > 0 ? (
            <Badge variant="destructive" className="bg-red-500/20 text-red-700 dark:text-red-400">
              ❌ {validation.errors.length} error{validation.errors.length > 1 ? "s" : ""}
            </Badge>
          ) : (
            <Badge variant="secondary" className="bg-amber-500/20 text-amber-700 dark:text-amber-400">
              ⚠️ {validation.warnings.length} warning{validation.warnings.length > 1 ? "s" : ""}
            </Badge>
          )}
        </div>
      )}

      {/* Code viewer */}
      <Card className="bg-slate-950 dark:bg-slate-950 border-slate-800">
        <div className="font-mono text-xs overflow-x-auto">
          {artifact.type === "html" ? (
            <HtmlPreview html={artifact.content} />
          ) : artifact.type === "json" ? (
            <JsonViewer json={artifact.content} />
          ) : (
            <CodeViewer
              code={content}
              language={artifact.language}
              lineNumbers
              maxLines={maxLines}
            />
          )}
        </div>
      </Card>

      {/* Error/Warning details */}
      {showValidation && validation && (
        <ArtifactValidationDetails artifact={artifact} />
      )}
    </div>
  )
}

/**
 * Code viewer with line numbers and syntax highlighting
 */
function CodeViewer({
  code,
  language = "plain",
  lineNumbers = true,
  maxLines,
}: {
  code: string
  language?: string
  lineNumbers?: boolean
  maxLines?: number
}) {
  const lines = code.split("\n")
  const displayLines = maxLines ? lines.slice(0, maxLines) : lines
  const showTruncation = maxLines && lines.length > maxLines

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <tbody>
          {displayLines.map((line, i) => (
            <tr key={i} className="hover:bg-slate-900">
              {lineNumbers && (
                <td className="select-none pr-4 py-1 text-slate-500 border-r border-slate-700 text-right sticky left-0">
                  <span className="inline-block w-12">{i + 1}</span>
                </td>
              )}
              <td className="pl-4 py-1 text-slate-300 whitespace-pre-wrap break-words">
                <SyntaxHighlightedLine line={line} language={language} />
              </td>
            </tr>
          ))}
          {showTruncation && (
            <tr className="hover:bg-slate-900">
              <td colSpan={lineNumbers ? 2 : 1} className="pl-4 py-1 text-slate-500 italic text-xs">
                ... {lines.length - displayLines.length} more lines
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

/**
 * Simple syntax highlighting for common patterns
 */
function SyntaxHighlightedLine({ line, language }: { line: string; language?: string }) {
  if (!language || language === "unknown" || language === "plain") {
    return <span>{line}</span>
  }

  // Render tokens as React nodes to avoid HTML-string replacement corruption.
  const tokenPattern =
    /(#.*$|\/\/.*$|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`|\b(?:def|function|const|let|var|class|if|else|for|while|return|import|from|as|async|await)\b|\b\d+\b)/g
  const parts = line.split(tokenPattern)

  return (
    <span>
      {parts.map((part, idx) => {
        if (!part) return null
        if (part.startsWith("#") || part.startsWith("//")) {
          return (
            <span key={idx} className="text-slate-500">
              {part}
            </span>
          )
        }
        if (
          (part.startsWith('"') && part.endsWith('"')) ||
          (part.startsWith("'") && part.endsWith("'")) ||
          (part.startsWith("`") && part.endsWith("`"))
        ) {
          return (
            <span key={idx} className="text-green-400">
              {part}
            </span>
          )
        }
        if (/^\d+$/.test(part)) {
          return (
            <span key={idx} className="text-yellow-400">
              {part}
            </span>
          )
        }
        if (/^(def|function|const|let|var|class|if|else|for|while|return|import|from|as|async|await)$/.test(part)) {
          return (
            <span key={idx} className="text-blue-400">
              {part}
            </span>
          )
        }
        return <span key={idx}>{part}</span>
      })}
    </span>
  )
}

/**
 * HTML preview with iframe rendering
 */
function HtmlPreview({ html }: { html: string }) {
  const iframeRef = React.useRef<HTMLIFrameElement>(null)

  React.useEffect(() => {
    if (iframeRef.current) {
      iframeRef.current.srcdoc = html
    }
  }, [html])

  return (
    <div className="space-y-2">
      <div className="text-xs text-slate-400 px-4 py-2">Preview:</div>
      <iframe
        ref={iframeRef}
        className="w-full h-48 border border-slate-700 rounded bg-white"
        sandbox="allow-scripts"
        title="HTML Preview"
      />
    </div>
  )
}

/**
 * JSON tree viewer with expand/collapse nodes
 */
function JsonViewer({ json: jsonStr }: { json: string }) {
  let parsed: unknown

  try {
    parsed = JSON.parse(jsonStr)
  } catch (e) {
    return (
      <div className="text-red-400 p-4">
        Invalid JSON: {e instanceof Error ? e.message : "Parse error"}
      </div>
    )
  }

  return (
    <div className="p-2">
      <JsonNode value={parsed} depth={0} />
    </div>
  )
}

function JsonNode({ value, depth }: { value: unknown; depth: number }) {
  const [expanded, setExpanded] = React.useState(depth < 2)

  if (value === null) {
    return <span className="text-yellow-400">null</span>
  }

  if (typeof value === "boolean") {
    return <span className="text-blue-400">{value.toString()}</span>
  }

  if (typeof value === "number") {
    return <span className="text-yellow-400">{value}</span>
  }

  if (typeof value === "string") {
    return <span className="text-green-400">"{value}"</span>
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <span className="text-slate-300">[]</span>
    }

    return (
      <div>
        <button
          className="text-slate-300 hover:text-slate-100 cursor-pointer"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? "▼" : "▶"} [
        </button>
        {expanded && (
          <div className="pl-4 space-y-1">
            {value.map((item, i) => (
              <div key={i}>
                <JsonNode value={item} depth={depth + 1} />
                {i < value.length - 1 && <span className="text-slate-300">,</span>}
              </div>
            ))}
          </div>
        )}
        <span className="text-slate-300">]</span>
      </div>
    )
  }

  if (typeof value === "object" && value !== null) {
    const entries = Object.entries(value)
    if (entries.length === 0) {
      return <span className="text-slate-300">{"{}"}</span>
    }

    return (
      <div>
        <button
          className="text-slate-300 hover:text-slate-100 cursor-pointer"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? "▼" : "▶"} {"{"}
        </button>
        {expanded && (
          <div className="pl-4 space-y-1">
            {entries.map(([key, val], i) => (
              <div key={i}>
                <span className="text-blue-400">"{key}"</span>
                <span className="text-slate-300">: </span>
                <JsonNode value={val} depth={depth + 1} />
                {i < entries.length - 1 && <span className="text-slate-300">,</span>}
              </div>
            ))}
          </div>
        )}
        <span className="text-slate-300">{"}"}</span>
      </div>
    )
  }

  return <span className="text-slate-300">{String(value)}</span>
}
