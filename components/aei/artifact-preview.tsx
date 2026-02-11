"use client"

import React, { useState } from "react"
import { Copy, CheckCircle, Code, Terminal, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface ExecutionResult {
  id: string
  status: "running" | "complete" | "error"
  startTime: string
  endTime?: string
  artifacts?: {
    html?: string
    code?: string
    json?: string
  }
  logs?: string[]
}

interface ArtifactPreviewProps {
  result: ExecutionResult | null
  onClose: () => void
}

export function ArtifactPreview({ result, onClose }: ArtifactPreviewProps) {
  const [activeTab, setActiveTab] = useState<"output" | "logs" | "trace">("output")
  const [copied, setCopied] = useState(false)

  if (!result) return null

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const mockHTML = `<div style="padding: 20px; font-family: system-ui;">
  <h1>Execution Result</h1>
  <p>Generated artifact from execution ${result.id}</p>
</div>`

  const mockCode = `// Generated code from canvas execution
function generated() {
  return { status: 'success', result: 'execution complete' }
}

export default generated`

  const mockJSON = JSON.stringify(
    {
      execution_id: result.id,
      status: result.status,
      timestamp: new Date().toISOString(),
      nodes: 5,
      edges: 4,
    },
    null,
    2
  )

  return (
    <div className="w-96 border-l border-border bg-card/50 flex flex-col shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Execution Result</h3>
          <p className="text-[10px] text-muted-foreground mt-0.5">{result.id}</p>
        </div>
        <Badge
          variant={result.status === "complete" ? "default" : "secondary"}
          className="capitalize"
        >
          {result.status}
        </Badge>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-0.5 px-4 py-2 border-b border-border bg-card/30 shrink-0">
        {[
          { id: "output", label: "Output", icon: Code },
          { id: "logs", label: "Logs", icon: Terminal },
          { id: "trace", label: "Trace", icon: Zap },
        ].map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded transition-colors",
                activeTab === tab.id
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="w-3 h-3" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {activeTab === "output" && (
          <>
            {/* HTML Preview */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-foreground">HTML Output</h4>
              <div className="border border-border rounded-lg p-3 bg-secondary/30 max-h-32 overflow-auto">
                <iframe
                  srcDoc={mockHTML}
                  className="w-full h-28 border-0"
                  sandbox={{} as any}
                />
              </div>
              <Button
                size="sm"
                variant="outline"
                className="w-full h-7 text-xs gap-1.5"
                onClick={() => copyToClipboard(mockHTML)}
              >
                {copied ? (
                  <>
                    <CheckCircle className="w-3 h-3" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    Copy HTML
                  </>
                )}
              </Button>
            </div>

            {/* Code */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-foreground">Generated Code</h4>
              <div className="border border-border rounded-lg p-2 bg-slate-950/50 max-h-32 overflow-auto font-mono text-[9px] text-slate-300 whitespace-pre">
                {mockCode}
              </div>
              <Button
                size="sm"
                variant="outline"
                className="w-full h-7 text-xs gap-1.5"
                onClick={() => copyToClipboard(mockCode)}
              >
                {copied ? (
                  <>
                    <CheckCircle className="w-3 h-3" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    Copy Code
                  </>
                )}
              </Button>
            </div>

            {/* JSON */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-foreground">JSON Schema</h4>
              <div className="border border-border rounded-lg p-2 bg-slate-950/50 max-h-32 overflow-auto font-mono text-[9px] text-slate-300 whitespace-pre">
                {mockJSON}
              </div>
              <Button
                size="sm"
                variant="outline"
                className="w-full h-7 text-xs gap-1.5"
                onClick={() => copyToClipboard(mockJSON)}
              >
                {copied ? (
                  <>
                    <CheckCircle className="w-3 h-3" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    Copy JSON
                  </>
                )}
              </Button>
            </div>
          </>
        )}

        {activeTab === "logs" && (
          <div className="space-y-2 text-xs font-mono text-slate-400">
            {(result.logs || [
              "2025-02-08 10:00:00 [INFO] Execution started",
              "2025-02-08 10:00:01 [INFO] code-gen-alpha assigned",
              "2025-02-08 10:00:05 [INFO] Processing node: task-1",
              "2025-02-08 10:00:10 [INFO] code-gen-alpha heartbeat",
              "2025-02-08 10:00:15 [INFO] Processing node: decision-1",
              "2025-02-08 10:00:20 [INFO] Execution complete",
            ]).map((log, i) => (
              <div key={i} className="leading-relaxed">
                {log}
              </div>
            ))}
          </div>
        )}

        {activeTab === "trace" && (
          <div className="space-y-2 text-xs">
            <p className="text-muted-foreground">
              Trace viewer available at:
            </p>
            <code className="block p-2 bg-secondary/30 rounded border border-border text-primary">
              /traces/{result.id}
            </code>
            <Button
              size="sm"
              className="w-full h-7 text-xs gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={() => window.open(`/traces/${result.id}`, "_blank")}
            >
              <Zap className="w-3 h-3" />
              Open Trace Viewer
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
