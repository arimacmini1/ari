"use client"

import { useRef, useState, type ChangeEvent } from "react"
import { FileJson, Upload, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { isPrdJson, type PrdCanvasLayout } from "@/lib/prd-canvas-converter"

const CANVAS_STATE_KEY = "canvas-state"
const CANVAS_STATE_EVENT = "aei:canvas-state"

type PrdExportMode = "deterministic" | "llm" | "agentic"
type PrdExportProvider = "auto" | "openai" | "anthropic" | "gemini"

export function PrdTool() {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [rawJson, setRawJson] = useState("")
  const [layout, setLayout] = useState<PrdCanvasLayout>("columns")
  const [includeSemanticEdges, setIncludeSemanticEdges] = useState(true)
  const [exportMode, setExportMode] = useState<PrdExportMode>("agentic")
  const [exportProvider, setExportProvider] = useState<PrdExportProvider>("openai")
  const [openAiModel, setOpenAiModel] = useState<string>("gpt-5.2")
  const [isExporting, setIsExporting] = useState(false)
  const [status, setStatus] = useState<string>("Load PRD JSON to export into Prompt Canvas.")
  const [error, setError] = useState<string | null>(null)

  const openFilePicker = () => {
    fileInputRef.current?.click()
  }

  const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (readerEvent) => {
      const next = typeof readerEvent.target?.result === "string" ? readerEvent.target.result : ""
      setRawJson(next)
      setError(null)
      setStatus(`Loaded ${file.name}`)
    }
    reader.readAsText(file)
  }

  const exportToCanvas = async () => {
    if (!rawJson.trim()) {
      setError("Paste or upload PRD JSON first.")
      return
    }

    try {
      const parsed = JSON.parse(rawJson) as unknown
      if (!isPrdJson(parsed)) {
        setError("JSON loaded, but it does not match expected PRD template shape.")
        return
      }
      setIsExporting(true)
      const response = await fetch("/api/prd/export-canvas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prd: parsed,
          layout,
          includeSemanticEdges,
          exportMode,
          exportProvider,
          openAiModel,
        }),
      })
      const result = (await response.json().catch(() => null)) as {
        canvas?: { nodes: unknown[]; edges: unknown[] }
        source?: string
        model?: string
        error?: string
      } | null
      if (!response.ok || !result?.canvas) {
        throw new Error(result?.error || "Failed to export PRD to canvas.")
      }

      localStorage.setItem(CANVAS_STATE_KEY, JSON.stringify(result.canvas))
      window.dispatchEvent(new Event(CANVAS_STATE_EVENT))
      setError(null)
      setStatus(
        `Exported to canvas (${result.canvas.nodes.length} nodes, ${result.canvas.edges.length} edges) via ${result.source || "deterministic"}${result.model ? ` (${result.model})` : ""}. Open Prompt Canvas tab.`
      )
    } catch (parseError) {
      setError(parseError instanceof Error ? parseError.message : "Invalid JSON.")
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="flex h-full flex-col bg-card/20">
      <div className="border-b border-border px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <FileJson className="h-4 w-4" />
          PRD Tool
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Keep PRD JSON as source of truth and export a generated workflow to Prompt Canvas.
        </p>
      </div>

      <div className="flex items-center gap-2 border-b border-border px-4 py-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={handleFileUpload}
        />
        <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5" onClick={openFilePicker}>
          <Upload className="h-3 w-3" />
          Upload PRD JSON
        </Button>
        <Button size="sm" className="h-7 text-xs gap-1.5" onClick={exportToCanvas} disabled={isExporting}>
          <ArrowRight className="h-3 w-3" />
          {isExporting ? "Exporting..." : "Export to Canvas"}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 border-b border-border px-4 py-3">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Layout</Label>
          <Select value={layout} onValueChange={(value) => setLayout(value as PrdCanvasLayout)}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Choose layout" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="columns">Columns (phase-focused)</SelectItem>
              <SelectItem value="timeline">Timeline (sequential)</SelectItem>
              <SelectItem value="radial">Radial (mindmap)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Semantic Links</Label>
          <div className="flex items-center gap-2 h-8">
            <Switch
              checked={includeSemanticEdges}
              onCheckedChange={setIncludeSemanticEdges}
              aria-label="Include semantic edges"
            />
            <span className="text-xs text-muted-foreground">Principles/Frictions/Risks &lt;-&gt; Features</span>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Provider</Label>
          <Select value={exportProvider} onValueChange={(value) => setExportProvider(value as PrdExportProvider)}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Choose provider" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="openai">OpenAI</SelectItem>
              <SelectItem value="auto">Auto</SelectItem>
              <SelectItem value="anthropic">Anthropic</SelectItem>
              <SelectItem value="gemini">Gemini</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Export Mode</Label>
          <Select value={exportMode} onValueChange={(value) => setExportMode(value as PrdExportMode)}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Choose export mode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="agentic">Agentic (multi-step LLM)</SelectItem>
              <SelectItem value="llm">LLM (single-pass)</SelectItem>
              <SelectItem value="deterministic">Deterministic</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {exportProvider === "openai" ? (
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">OpenAI Model</Label>
            <Select value={openAiModel} onValueChange={setOpenAiModel}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Choose OpenAI model" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gpt-5.2">GPT-5.2</SelectItem>
                <SelectItem value="gpt-5.2-codex">GPT-5.2-Codex</SelectItem>
                <SelectItem value="gpt-5.2-chat-latest">GPT-5.2 Chat Latest</SelectItem>
              </SelectContent>
            </Select>
          </div>
        ) : null}
      </div>

      <div className="flex-1 min-h-0 p-4">
        <Textarea
          value={rawJson}
          onChange={(event) => setRawJson(event.target.value)}
          className="h-full min-h-[320px] resize-none font-mono text-xs"
          placeholder="Paste PRD JSON here, then click Export to Canvas."
        />
      </div>

      <div className="border-t border-border px-4 py-2 text-xs">
        {error ? <span className="text-red-400">{error}</span> : <span className="text-muted-foreground">{status}</span>}
      </div>
    </div>
  )
}
