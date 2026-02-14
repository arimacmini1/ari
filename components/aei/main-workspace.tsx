"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import { PromptCanvas } from "@/components/aei/prompt-canvas"
import { PrdTool } from "@/components/aei/prd-tool"
import { AgentPanel } from "@/components/aei/agent-panel"
import { TraceViewer } from "@/components/aei/trace-viewer"
import { AnalyticsPane } from "@/components/aei/analytics-pane"
import { ConsoleChat } from "@/components/aei/console-chat"
import { OrchestratorHub } from "@/components/aei/orchestrator-hub"
import { CodeExplorerMonaco } from "@/components/aei/code-explorer-monaco"
import { useAccessibilitySettings } from "@/components/accessibility/accessibility-provider"
import { useActiveProject } from "@/components/aei/active-project-provider"
import type { CanvasState } from "@/lib/canvas-state"
import { emitTelemetryEvent } from "@/lib/telemetry-client"
import {
  Layers,
  Code2,
  Eye,
  FileJson,
  RefreshCcw,
  FileCode2,
  Bot,
  GitBranch,
  BarChart3,
  Terminal,
  Network,
} from "lucide-react"
import type { CodeExplorerSnapshot } from "@/lib/code-explorer-snapshot"

const CANVAS_STATE_EVENT = "aei:canvas-state"
const CODE_EXPLORER_SNAPSHOT_EVENT = "aei:code-explorer-snapshot-updated"
const CODE_EXPLORER_SELECTED_PATH_KEY = "aei.code-explorer.selected-path"
const CODE_EXPLORER_EXPANDED_FOLDERS_KEY = "aei.code-explorer.expanded-folders"
const CODE_EXPLORER_SOURCE_KEY = "aei.code-explorer.source"
const MIGRATION_TIP_STORAGE_KEY = "aei.migration.tips.dismissed"

type CodeTreeNode =
  | { kind: "folder"; name: string; path: string; children: CodeTreeNode[] }
  | { kind: "file"; name: string; path: string; fileIndex: number }

type PreviewModel =
  | { mode: "empty" }
  | { mode: "iframe"; srcDoc: string; note: string }
  | { mode: "fallback"; reason: string }

interface QuickOpenEntry {
  path: string
  name: string
  lowerPath: string
  lowerName: string
}

function buildCodeTree(paths: Array<{ path: string; fileIndex: number }>): CodeTreeNode {
  const root: Extract<CodeTreeNode, { kind: "folder" }> = {
    kind: "folder",
    name: "root",
    path: "",
    children: [],
  }

  const ensureFolder = (
    parent: Extract<CodeTreeNode, { kind: "folder" }>,
    name: string,
    path: string
  ) => {
    const existing = parent.children.find(
      (child) => child.kind === "folder" && child.name === name
    ) as Extract<CodeTreeNode, { kind: "folder" }> | undefined

    if (existing) return existing

    const created: Extract<CodeTreeNode, { kind: "folder" }> = {
      kind: "folder",
      name,
      path,
      children: [],
    }
    parent.children.push(created)
    return created
  }

  for (const entry of paths) {
    const segments = entry.path.split("/").filter(Boolean)
    if (segments.length === 0) continue

    let current = root
    for (let idx = 0; idx < segments.length; idx++) {
      const segment = segments[idx]
      const isLeaf = idx === segments.length - 1
      const segmentPath = segments.slice(0, idx + 1).join("/")

      if (isLeaf) {
        current.children.push({
          kind: "file",
          name: segment,
          path: segmentPath,
          fileIndex: entry.fileIndex,
        })
      } else {
        current = ensureFolder(current, segment, segmentPath)
      }
    }
  }

  const sortFolder = (node: Extract<CodeTreeNode, { kind: "folder" }>) => {
    node.children.sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === "folder" ? -1 : 1
      return a.name.localeCompare(b.name)
    })
    node.children.forEach((child) => {
      if (child.kind === "folder") sortFolder(child)
    })
  }

  sortFolder(root)
  return root
}

function canRenderWebPreview(path: string, type: string): boolean {
  const lowerPath = path.toLowerCase()
  return (
    type === "html" ||
    type === "svg" ||
    lowerPath.endsWith(".html") ||
    lowerPath.endsWith(".htm") ||
    lowerPath.endsWith(".svg")
  )
}

function buildPreviewModel(
  file: CodeExplorerSnapshot["files"][number] | null
): PreviewModel {
  if (!file) return { mode: "empty" }

  if (!canRenderWebPreview(file.path, file.type)) {
    return {
      mode: "fallback",
      reason: "Preview is available for HTML/SVG artifacts. Use Monaco for other files.",
    }
  }

  if (file.type === "svg" || file.path.toLowerCase().endsWith(".svg")) {
    return {
      mode: "iframe",
      srcDoc: `<!doctype html><html><body style="margin:0;background:#0b0d10;display:flex;align-items:center;justify-content:center;min-height:100vh;">${file.content}</body></html>`,
      note: "SVG preview rendered in sandboxed iframe.",
    }
  }

  return {
    mode: "iframe",
    srcDoc: file.content,
    note: "HTML preview rendered in sandboxed iframe (scripts disabled).",
  }
}

function scoreFilenameQuery(query: string, entry: QuickOpenEntry): number {
  if (!query) return 0
  const q = query.toLowerCase()
  if (entry.lowerName === q) return 1000
  if (entry.lowerName.startsWith(q)) return 800 - entry.name.length
  if (entry.lowerPath.includes(q)) return 600 - entry.path.length

  // Lightweight fuzzy score: all query chars must appear in order.
  let idx = 0
  for (let i = 0; i < entry.lowerPath.length && idx < q.length; i++) {
    if (entry.lowerPath[i] === q[idx]) idx += 1
  }
  if (idx !== q.length) return -1
  return 300 - entry.path.length
}

const mainTabs = [
  { id: "canvas", label: "Prompt Canvas", icon: Layers },
  { id: "code-peek", label: "Code Peek", icon: Eye },
  { id: "code-explorer", label: "Code Explorer", icon: Code2 },
  { id: "prd", label: "PRD Tool", icon: FileJson },
  { id: "agents", label: "Agents", icon: Bot },
  { id: "traces", label: "Trace Viewer", icon: GitBranch },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "console", label: "Console", icon: Terminal },
  { id: "orchestrator", label: "Orchestrator", icon: Network },
] as const

type TabId = (typeof mainTabs)[number]["id"]

function CodePeekPanel() {
  const [snapshot, setSnapshot] = useState<CodeExplorerSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedPath, setSelectedPath] = useState<string | null>(null)

  const loadSnapshot = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/code-explorer/snapshot", { cache: "no-store" })
      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        setSnapshot(null)
        setError(body?.error || "No generated artifacts available yet.")
        setSelectedPath(null)
        return
      }
      const body = await response.json()
      const nextSnapshot = (body?.snapshot ?? null) as CodeExplorerSnapshot | null
      setSnapshot(nextSnapshot)
      if (nextSnapshot?.files?.length) {
        setSelectedPath((prev) =>
          prev && nextSnapshot.files.some((file) => file.path === prev)
            ? prev
            : nextSnapshot.files[0].path
        )
      } else {
        setSelectedPath(null)
      }
    } catch (peekError) {
      setSnapshot(null)
      setError(peekError instanceof Error ? peekError.message : "Failed to load generated artifacts.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSnapshot()
  }, [loadSnapshot])

  useEffect(() => {
    const handleSnapshotUpdated = () => {
      loadSnapshot()
    }
    window.addEventListener(CODE_EXPLORER_SNAPSHOT_EVENT, handleSnapshotUpdated)
    return () => {
      window.removeEventListener(CODE_EXPLORER_SNAPSHOT_EVENT, handleSnapshotUpdated)
    }
  }, [loadSnapshot])

  const files = useMemo(() => snapshot?.files ?? [], [snapshot])
  const selectedFile = useMemo(
    () => files.find((file) => file.path === selectedPath) ?? null,
    [files, selectedPath]
  )

  return (
    <div className="flex h-full w-full bg-background p-6">
      <div className="flex h-full w-full flex-col rounded-lg border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Code Peek</h2>
            <p className="text-xs text-muted-foreground">
              Read-only artifact inspection from latest simulation output.
            </p>
          </div>
          <button
            onClick={loadSnapshot}
            className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-secondary/40 hover:text-foreground"
            type="button"
          >
            <RefreshCcw className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {loading ? <div className="text-sm text-muted-foreground">Loading generated artifacts...</div> : null}

          {!loading && error ? (
            <div className="rounded-md border border-dashed border-border bg-secondary/20 p-3 text-sm text-muted-foreground">
              {error}
            </div>
          ) : null}

          {!loading && !error && files.length === 0 ? (
            <div className="rounded-md border border-dashed border-border bg-secondary/20 p-3 text-sm text-muted-foreground">
              No generated artifacts available yet.
            </div>
          ) : null}

          {!loading && !error && files.length > 0 ? (
            <div className="flex min-h-[480px] gap-3">
              <div className="w-[340px] shrink-0 rounded-md border border-border bg-card/30">
                <div className="border-b border-border px-3 py-2 text-xs text-muted-foreground">
                  Generated Files ({files.length})
                </div>
                <div className="max-h-[560px] overflow-auto p-2">
                  {files.map((file) => {
                    const selected = file.path === selectedPath
                    return (
                      <button
                        key={file.path}
                        type="button"
                        onClick={() => setSelectedPath(file.path)}
                        className={cn(
                          "mb-1 flex w-full items-center gap-2 rounded px-2 py-1 text-left text-xs",
                          selected
                            ? "bg-secondary text-foreground"
                            : "text-muted-foreground hover:bg-secondary/40 hover:text-foreground"
                        )}
                      >
                        <FileCode2 className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{file.path}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="flex min-w-0 flex-1 flex-col rounded-md border border-border bg-card/30">
                <div className="border-b border-border px-3 py-2">
                  <div className="truncate text-xs text-foreground">
                    {selectedFile ? selectedFile.path : "Select an artifact"}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {selectedFile
                      ? `${selectedFile.type}${selectedFile.language ? ` (${selectedFile.language})` : ""} · ${selectedFile.size}b`
                      : "Generated artifact preview."}
                  </div>
                </div>
                <div className="flex-1 overflow-auto p-3">
                  {selectedFile ? (
                    <pre className="whitespace-pre-wrap break-words font-mono text-[11px] text-foreground">
                      {selectedFile.content}
                    </pre>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      Select a generated artifact from the list.
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : null}

          <div className="mt-4 rounded-md border border-dashed border-border bg-secondary/20 p-3 text-xs text-muted-foreground">
            Code Peek is read-only by design. Editing artifacts is out of scope in AEI.
          </div>
        </div>
      </div>
    </div>
  )
}

function CodeExplorerPanel() {
  const [source, setSource] = useState<"generated" | "imported">(() => {
    if (typeof window === "undefined") return "generated"
    return localStorage.getItem(CODE_EXPLORER_SOURCE_KEY) === "imported"
      ? "imported"
      : "generated"
  })
  const [snapshot, setSnapshot] = useState<CodeExplorerSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sampleLoading, setSampleLoading] = useState(false)
  const [sampleError, setSampleError] = useState<string | null>(null)
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    () => {
      if (typeof window === "undefined") return new Set(["generated"])
      const raw = localStorage.getItem(CODE_EXPLORER_EXPANDED_FOLDERS_KEY)
      if (!raw) return new Set(["generated"])
      try {
        const parsed = JSON.parse(raw) as string[]
        if (!Array.isArray(parsed) || parsed.length === 0) return new Set(["generated"])
        return new Set(parsed)
      } catch {
        return new Set(["generated"])
      }
    }
  )
  const [selectedPath, setSelectedPath] = useState<string | null>(
    () => (typeof window === "undefined" ? null : localStorage.getItem(CODE_EXPLORER_SELECTED_PATH_KEY))
  )
  const snapshotLoadStartRef = useRef<number | null>(null)
  const selectStartRef = useRef<number | null>(null)
  const [snapshotLoadMs, setSnapshotLoadMs] = useState<number | null>(null)
  const [selectFileMs, setSelectFileMs] = useState<number | null>(null)

  const loadSnapshot = useCallback(async () => {
    snapshotLoadStartRef.current = Date.now()
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/code-explorer/snapshot?source=${source}`, {
        cache: "no-store",
      })
      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        setSnapshot(null)
        setError(body?.error || `No ${source} codebase snapshot available yet.`)
        setSelectedPath(null)
        return
      }
      const body = await response.json()
      setSnapshot((body?.snapshot ?? null) as CodeExplorerSnapshot | null)
      if (snapshotLoadStartRef.current !== null) {
        setSnapshotLoadMs(Date.now() - snapshotLoadStartRef.current)
      }
    } catch (fetchError) {
      setSnapshot(null)
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : `Failed to load ${source} Code Explorer snapshot.`
      )
    } finally {
      setLoading(false)
    }
  }, [source])

  useEffect(() => {
    loadSnapshot()
  }, [loadSnapshot])

  useEffect(() => {
    if (typeof window === "undefined") return
    localStorage.setItem(CODE_EXPLORER_SOURCE_KEY, source)
  }, [source])

  const loadPreviewSamples = useCallback(async () => {
    const now = new Date().toISOString()
    const encoder = new TextEncoder()
    const createVersionId = () => {
      if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return crypto.randomUUID()
      }
      return `sample-${Date.now()}`
    }

    const htmlContent =
      "<!doctype html><html><body style='font-family:sans-serif;padding:16px'><h1>Code Explorer Preview</h1><p>HTML preview is rendering.</p></body></html>"
    const svgContent =
      "<svg xmlns='http://www.w3.org/2000/svg' width='420' height='180'><rect width='100%' height='100%' fill='#0f172a'/><circle cx='90' cy='90' r='56' fill='#22c55e'/><text x='170' y='98' fill='white' font-size='22' font-family='sans-serif'>SVG Preview OK</text></svg>"

    const artifacts = [
      {
        type: "html",
        language: "html",
        content: htmlContent,
        metadata: {
          size: encoder.encode(htmlContent).length,
          lines: 1,
          created_at: now,
          version_id: createVersionId(),
        },
      },
      {
        type: "svg",
        language: "svg",
        content: svgContent,
        metadata: {
          size: encoder.encode(svgContent).length,
          lines: 1,
          created_at: now,
          version_id: createVersionId(),
        },
      },
    ]
    const importedFiles = [
      {
        path: "README.md",
        type: "markdown",
        language: "markdown",
        content: "# Imported Sample\n\nThis snapshot is from imported source.",
      },
      {
        path: "src/main.ts",
        type: "code",
        language: "typescript",
        content: "export const importedSample = () => 'hello from imported snapshot'\n",
      },
      {
        path: "src/index.html",
        type: "html",
        language: "html",
        content:
          "<!doctype html><html><body><h1>Imported Preview</h1><p>Source switch works.</p></body></html>",
      },
    ]

    setSampleLoading(true)
    setSampleError(null)
    try {
      const response = await fetch("/api/code-explorer/snapshot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source,
          artifacts: source === "generated" ? artifacts : [],
          files: source === "imported" ? importedFiles : [],
        }),
      })
      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        throw new Error(body?.error || "Failed to generate preview sample artifacts.")
      }
      await loadSnapshot()
    } catch (sampleFetchError) {
      setSampleError(
        sampleFetchError instanceof Error
          ? sampleFetchError.message
          : "Failed to generate preview sample artifacts."
      )
    } finally {
      setSampleLoading(false)
    }
  }, [loadSnapshot, source])

  useEffect(() => {
    const handleSnapshotUpdated = () => {
      loadSnapshot()
    }
    window.addEventListener(CODE_EXPLORER_SNAPSHOT_EVENT, handleSnapshotUpdated)
    return () => {
      window.removeEventListener(CODE_EXPLORER_SNAPSHOT_EVENT, handleSnapshotUpdated)
    }
  }, [loadSnapshot])

  const files = useMemo(() => snapshot?.files ?? [], [snapshot])
  const tree = useMemo(
    () => buildCodeTree(files.map((file, index) => ({ path: file.path, fileIndex: index }))),
    [files]
  )
  const selectedFile = useMemo(() => {
    if (!selectedPath) return null
    return files.find((file) => file.path === selectedPath) ?? null
  }, [files, selectedPath])
  const preview = useMemo(() => buildPreviewModel(selectedFile), [selectedFile])
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [quickOpenOpen, setQuickOpenOpen] = useState(false)
  const [quickOpenQuery, setQuickOpenQuery] = useState("")
  const [quickOpenIndex, setQuickOpenIndex] = useState(0)
  const quickOpenInputRef = useRef<HTMLInputElement | null>(null)

  const quickOpenEntries = useMemo<QuickOpenEntry[]>(
    () =>
      files.map((file) => ({
        path: file.path,
        name: file.path.split("/").pop() || file.path,
        lowerPath: file.path.toLowerCase(),
        lowerName: (file.path.split("/").pop() || file.path).toLowerCase(),
      })),
    [files]
  )

  const quickOpenResults = useMemo(() => {
    const query = quickOpenQuery.trim()
    if (!query) return quickOpenEntries.slice(0, 80)
    return quickOpenEntries
      .map((entry) => ({ entry, score: scoreFilenameQuery(query, entry) }))
      .filter((item) => item.score >= 0)
      .sort((a, b) => b.score - a.score || a.entry.path.localeCompare(b.entry.path))
      .slice(0, 80)
      .map((item) => item.entry)
  }, [quickOpenEntries, quickOpenQuery])

  useEffect(() => {
    if (selectedPath === null || selectedFile === null || selectStartRef.current === null) return
    setSelectFileMs(Date.now() - selectStartRef.current)
    selectStartRef.current = null
  }, [selectedFile, selectedPath])

  useEffect(() => {
    if (typeof window === "undefined") return
    localStorage.setItem(
      CODE_EXPLORER_EXPANDED_FOLDERS_KEY,
      JSON.stringify(Array.from(expandedFolders))
    )
  }, [expandedFolders])

  useEffect(() => {
    if (typeof window === "undefined") return
    if (selectedPath) {
      localStorage.setItem(CODE_EXPLORER_SELECTED_PATH_KEY, selectedPath)
    } else {
      localStorage.removeItem(CODE_EXPLORER_SELECTED_PATH_KEY)
    }
  }, [selectedPath])

  useEffect(() => {
    if (files.length === 0) return
    if (!selectedPath) return
    if (files.some((file) => file.path === selectedPath)) return
    setSelectedPath(files[0]?.path ?? null)
  }, [files, selectedPath])

  useEffect(() => {
    setPreviewError(null)
  }, [selectedPath])

  useEffect(() => {
    setQuickOpenIndex(0)
  }, [quickOpenQuery, quickOpenOpen])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        setQuickOpenOpen(true)
      } else if (event.key === "Escape") {
        setQuickOpenOpen(false)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => {
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [])

  useEffect(() => {
    if (!quickOpenOpen) return
    const timeout = window.setTimeout(() => {
      quickOpenInputRef.current?.focus()
      quickOpenInputRef.current?.select()
    }, 0)
    return () => window.clearTimeout(timeout)
  }, [quickOpenOpen])

  const toggleFolder = useCallback((path: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }, [])

  const renderTree = useCallback(
    (node: CodeTreeNode, depth: number): ReactNode => {
      if (node.kind === "file") {
        const isSelected = selectedPath === node.path
        return (
          <button
            key={node.path}
            type="button"
            onClick={() => {
              selectStartRef.current = Date.now()
              setSelectedPath(node.path)
            }}
            className={cn(
              "flex w-full items-center gap-2 rounded px-2 py-1 text-left text-xs",
              isSelected
                ? "bg-secondary text-foreground"
                : "text-muted-foreground hover:bg-secondary/40 hover:text-foreground"
            )}
            style={{ paddingLeft: `${8 + depth * 12}px` }}
          >
            <FileCode2 className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{node.name}</span>
          </button>
        )
      }

      const isExpanded = node.path === "" ? true : expandedFolders.has(node.path)
      const isRoot = node.path === ""

      return (
        <div key={node.path || "root"}>
          {!isRoot ? (
            <button
              type="button"
              onClick={() => toggleFolder(node.path)}
              className="flex w-full items-center gap-2 rounded px-2 py-1 text-left text-xs text-muted-foreground hover:bg-secondary/40 hover:text-foreground"
              style={{ paddingLeft: `${8 + depth * 12}px` }}
            >
              <span className="w-3.5 shrink-0 text-[10px]">
                {isExpanded ? "v" : ">"}
              </span>
              <span className="truncate">{node.name}</span>
            </button>
          ) : null}

          {isExpanded
            ? node.children.map((child) => renderTree(child, isRoot ? depth : depth + 1))
            : null}
        </div>
      )
    },
    [expandedFolders, selectedPath, toggleFolder]
  )

  return (
    <div className="flex h-full w-full bg-background p-6">
      <div className="flex h-full w-full flex-col rounded-lg border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Code Explorer</h2>
            <p className="text-xs text-muted-foreground">
              Snapshot source: {snapshot?.source ?? "none"} | root: {snapshot?.root ?? "-"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center rounded-md border border-border p-0.5">
              <button
                type="button"
                onClick={() => setSource("generated")}
                className={cn(
                  "rounded px-2 py-1 text-[11px]",
                  source === "generated"
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:bg-secondary/40 hover:text-foreground"
                )}
              >
                Generated
              </button>
              <button
                type="button"
                onClick={() => setSource("imported")}
                className={cn(
                  "rounded px-2 py-1 text-[11px]",
                  source === "imported"
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:bg-secondary/40 hover:text-foreground"
                )}
              >
                Imported
              </button>
            </div>
            <button
              onClick={() => setQuickOpenOpen(true)}
              className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-secondary/40 hover:text-foreground"
              type="button"
              title="Quick Open (Ctrl/Cmd+K)"
            >
              Quick Open
            </button>
            <button
              onClick={loadPreviewSamples}
              disabled={sampleLoading}
              className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-secondary/40 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
              type="button"
            >
              {sampleLoading ? "Generating..." : source === "generated" ? "Load Preview Samples" : "Load Imported Samples"}
            </button>
            <button
              onClick={loadSnapshot}
              className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-secondary/40 hover:text-foreground"
              type="button"
            >
              <RefreshCcw className="h-3.5 w-3.5" />
              Refresh
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4">
          {quickOpenOpen ? (
            <div className="mb-3 rounded-md border border-border bg-card/70 p-3">
              <div className="mb-2 text-xs text-muted-foreground">
                Quick Open (Ctrl/Cmd+K): search filenames and press Enter to open.
              </div>
              <input
                ref={quickOpenInputRef}
                value={quickOpenQuery}
                onChange={(event) => setQuickOpenQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "ArrowDown") {
                    event.preventDefault()
                    setQuickOpenIndex((prev) =>
                      Math.min(prev + 1, Math.max(quickOpenResults.length - 1, 0))
                    )
                  } else if (event.key === "ArrowUp") {
                    event.preventDefault()
                    setQuickOpenIndex((prev) => Math.max(prev - 1, 0))
                  } else if (event.key === "Enter") {
                    event.preventDefault()
                    const picked = quickOpenResults[quickOpenIndex]
                    if (!picked) return
                    setSelectedPath(picked.path)
                    setQuickOpenOpen(false)
                    setQuickOpenQuery("")
                  } else if (event.key === "Escape") {
                    event.preventDefault()
                    setQuickOpenOpen(false)
                  }
                }}
                className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm text-foreground outline-none ring-offset-background focus:ring-2 focus:ring-ring"
                placeholder="Search filename or path..."
                aria-label="Quick open search"
                aria-controls="code-explorer-quick-open-results"
                role="combobox"
                aria-expanded={quickOpenOpen}
              />
              <div
                id="code-explorer-quick-open-results"
                role="listbox"
                aria-label="Quick open results"
                className="mt-2 max-h-56 overflow-auto rounded-md border border-border bg-background"
              >
                {quickOpenResults.length === 0 ? (
                  <div className="px-2 py-2 text-xs text-muted-foreground">No matching files.</div>
                ) : (
                  quickOpenResults.map((entry, index) => {
                    const active = index === quickOpenIndex
                    return (
                      <button
                        key={entry.path}
                        type="button"
                        role="option"
                        aria-selected={active}
                        className={cn(
                          "flex w-full items-center justify-between gap-2 px-2 py-1.5 text-left text-xs",
                          active
                            ? "bg-secondary text-foreground"
                            : "text-muted-foreground hover:bg-secondary/40 hover:text-foreground"
                        )}
                        onMouseEnter={() => setQuickOpenIndex(index)}
                        onClick={() => {
                          setSelectedPath(entry.path)
                          setQuickOpenOpen(false)
                          setQuickOpenQuery("")
                        }}
                      >
                        <span className="truncate">{entry.name}</span>
                        <span className="truncate text-[11px] text-muted-foreground">
                          {entry.path}
                        </span>
                      </button>
                    )
                  })
                )}
              </div>
            </div>
          ) : null}

          {sampleError ? (
            <div className="mb-3 rounded-md border border-dashed border-border bg-secondary/20 p-3 text-xs text-muted-foreground">
              {sampleError}
            </div>
          ) : null}

          {loading ? (
            <div className="text-sm text-muted-foreground">Loading latest snapshot...</div>
          ) : null}

          {!loading && error ? (
            <div className="rounded-md border border-dashed border-border bg-secondary/20 p-3 text-sm text-muted-foreground">
              {error}
              <div className="mt-2 text-xs">
                {source === "generated"
                  ? "Run a simulation in Orchestrator, then click Refresh."
                  : "Use Import Project in Copilot to generate imported snapshot, then click Refresh."}
              </div>
            </div>
          ) : null}

          {!loading && !error && files.length === 0 ? (
            <div className="rounded-md border border-dashed border-border bg-secondary/20 p-3 text-sm text-muted-foreground">
              No files found in the latest snapshot.
            </div>
          ) : null}

          {!loading && !error && files.length > 0 ? (
            <div className="flex min-h-[520px] gap-3">
              <div className="w-[320px] shrink-0 rounded-md border border-border bg-card/30">
                <div className="border-b border-border px-3 py-2 text-xs text-muted-foreground">
                  Files ({files.length})
                </div>
                <div className="max-h-[520px] overflow-auto p-2">
                  {renderTree(tree, 0)}
                </div>
              </div>

              <div className="flex min-w-0 flex-1 gap-3">
                <div className="flex min-w-0 flex-1 flex-col rounded-md border border-border bg-card/30">
                  <div className="flex items-center justify-between border-b border-border px-3 py-2">
                    <div className="min-w-0">
                      <div className="truncate text-xs text-foreground">
                        {selectedFile ? selectedFile.path : "Select a file"}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {selectedFile
                          ? `${selectedFile.type}${selectedFile.language ? ` (${selectedFile.language})` : ""} · ${selectedFile.size}b`
                          : "Read-only Monaco preview."}
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 overflow-auto p-3">
                    {selectedFile ? (
                      <CodeExplorerMonaco
                        key={selectedFile.path}
                        path={selectedFile.path}
                        content={selectedFile.content}
                        language={selectedFile.language}
                      />
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        Pick a file from the tree to view its contents.
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex w-[34%] min-w-[280px] max-w-[420px] flex-col rounded-md border border-border bg-card/30">
                  <div className="border-b border-border px-3 py-2 text-xs text-muted-foreground">
                    Preview
                  </div>
                  <div className="flex-1 overflow-auto p-3">
                    {preview.mode === "empty" ? (
                      <div className="text-sm text-muted-foreground">
                        Select an artifact to preview.
                      </div>
                    ) : null}

                    {preview.mode === "fallback" ? (
                      <div className="rounded-md border border-dashed border-border bg-secondary/20 p-3 text-xs text-muted-foreground">
                        {preview.reason}
                      </div>
                    ) : null}

                    {preview.mode === "iframe" ? (
                      <div className="h-full min-h-[320px] overflow-hidden rounded-md border border-border">
                        {previewError ? (
                          <div className="p-3 text-xs text-muted-foreground">
                            Preview failed: {previewError}
                          </div>
                        ) : (
                          <iframe
                            title={`Preview ${selectedFile?.path ?? "artifact"}`}
                            srcDoc={preview.srcDoc}
                            sandbox=""
                            className="h-full min-h-[320px] w-full bg-white"
                            onError={() => {
                              setPreviewError("Unable to render preview content.")
                            }}
                          />
                        )}
                      </div>
                    ) : null}

                    {preview.mode === "iframe" && !previewError ? (
                      <div className="mt-2 text-[11px] text-muted-foreground">{preview.note}</div>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="w-[280px] shrink-0 rounded-md border border-border bg-card/30">
                <div className="border-b border-border px-3 py-2 text-xs text-muted-foreground">
                  Properties
                </div>
                <div className="space-y-3 p-3">
                  <div className="rounded-md border border-border bg-secondary/20 p-2 text-[11px] text-muted-foreground">
                    <div className="mb-1 text-foreground">Selected File</div>
                    <div className="break-all">{selectedFile?.path ?? "None selected"}</div>
                    <div className="mt-2">
                      Type: {selectedFile?.type ?? "-"}
                      {selectedFile?.language ? ` (${selectedFile.language})` : ""}
                    </div>
                    <div>Size: {selectedFile ? `${selectedFile.size} bytes` : "-"}</div>
                  </div>

                  <div className="rounded-md border border-border bg-secondary/20 p-2 text-[11px] text-muted-foreground">
                    <div className="mb-1 text-foreground">Timings</div>
                    <div>snapshot_load_ms: {snapshotLoadMs ?? "-"}</div>
                    <div>select_file_ms: {selectFileMs ?? "-"}</div>
                  </div>

                  <div className="rounded-md border border-dashed border-border bg-secondary/20 p-2 text-[11px] text-muted-foreground">
                    <div className="mb-1 text-foreground">Code Context</div>
                    <div>
                      Placeholder for symbol context, related files, and trace links (wired in
                      later slice).
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          <div className="mt-4 rounded-md border border-dashed border-border bg-secondary/20 p-3 text-xs text-muted-foreground">
            This is a separate read-only surface. Switching tabs will not reset Prompt Canvas
            state or chat context.
          </div>
        </div>
      </div>
    </div>
  )
}

export function MainWorkspace() {
  const [activeTab, setActiveTab] = useState<TabId>("canvas")
  const [draftCanvasState, setDraftCanvasState] = useState<CanvasState | null>(() => {
    if (typeof window === "undefined") return null
    const raw = localStorage.getItem("canvas-state")
    if (!raw) return null
    try {
      return JSON.parse(raw) as CanvasState
    } catch {
      return null
    }
  })
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([])
  const { settings } = useAccessibilitySettings()
  const { activeProjectId } = useActiveProject()
  const [showTip, setShowTip] = useState(false)

  const visibleTabs = useMemo(() => {
    if (settings.uiMode === 'novice') {
      return mainTabs.filter((tab) => tab.id !== 'traces' && tab.id !== 'orchestrator')
    }
    return mainTabs
  }, [settings.uiMode])

  const focusTab = useCallback((index: number) => {
    const tab = visibleTabs[index]
    if (!tab) return
    setActiveTab(tab.id)
    tabRefs.current[index]?.focus()
  }, [visibleTabs])

  useEffect(() => {
    if (!visibleTabs.find((tab) => tab.id === activeTab)) {
      setActiveTab(visibleTabs[0]?.id ?? 'canvas')
    }
  }, [activeTab, visibleTabs])

  useEffect(() => {
    if (typeof window === "undefined") return
    if (!activeProjectId) return
    const stored = window.localStorage.getItem(MIGRATION_TIP_STORAGE_KEY)
    const dismissed = stored ? JSON.parse(stored) as Record<string, boolean> : {}
    const shouldShow = !dismissed[activeProjectId]
    setShowTip(shouldShow)
    if (shouldShow) {
      emitTelemetryEvent({
        storageKey: "aei.familiar.chat",
        eventName: "migration_tip_shown",
        metadata: { project_id: activeProjectId, surface: "main_workspace" },
      })
    }
  }, [activeProjectId])

  const dismissTip = useCallback(() => {
    if (typeof window === "undefined" || !activeProjectId) return
    const stored = window.localStorage.getItem(MIGRATION_TIP_STORAGE_KEY)
    const dismissed = stored ? JSON.parse(stored) as Record<string, boolean> : {}
    dismissed[activeProjectId] = true
    window.localStorage.setItem(MIGRATION_TIP_STORAGE_KEY, JSON.stringify(dismissed))
    setShowTip(false)
    emitTelemetryEvent({
      storageKey: "aei.familiar.chat",
      eventName: "migration_tip_dismissed",
      metadata: { project_id: activeProjectId, surface: "main_workspace" },
    })
  }, [activeProjectId])

  const handleTipAction = useCallback((targetTab: TabId, action: string) => {
    setActiveTab(targetTab)
    emitTelemetryEvent({
      storageKey: "aei.familiar.chat",
      eventName: "migration_tip_clicked",
      metadata: { action, target_tab: targetTab, project_id: activeProjectId },
    })
  }, [activeProjectId])

  return (
    <div className="flex flex-1 flex-col min-w-0 min-h-0">
      {/* Tab bar */}
      <div
        className="flex items-center gap-1 px-4 py-1.5 border-b border-border bg-card/30 shrink-0 overflow-x-auto"
        role="tablist"
        aria-label="Primary workspace tabs"
      >
        {visibleTabs.map((tab, index) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              ref={(el) => {
                tabRefs.current[index] = el
              }}
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={activeTab === tab.id}
              aria-controls={`panel-${tab.id}`}
              tabIndex={activeTab === tab.id ? 0 : -1}
              onKeyDown={(event) => {
                if (event.key === "ArrowRight") {
                  event.preventDefault()
                  focusTab((index + 1) % visibleTabs.length)
                }
                if (event.key === "ArrowLeft") {
                  event.preventDefault()
                  focusTab((index - 1 + visibleTabs.length) % visibleTabs.length)
                }
              }}
              className={cn(
                "flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap",
                activeTab === tab.id
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Panel content */}
      <div
        className="flex-1 min-h-0 overflow-hidden"
        role="tabpanel"
        id={`panel-${activeTab}`}
        aria-labelledby={`tab-${activeTab}`}
      >
        {showTip && activeTab === "console" ? (
          <div className="mx-4 mt-4 rounded-lg border border-border bg-secondary/40 p-4 text-xs text-muted-foreground">
            <div className="text-foreground font-semibold mb-1">Upgrade your chat flow</div>
            <div className="mb-3">
              Chat → Prompt Canvas (graph). Preview → Simulator. Run → Orchestrator.
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleTipAction("canvas", "open_canvas")}
                className="px-3 py-1 rounded-md border border-slate-700 bg-slate-900 text-slate-200"
              >
                Open Prompt Canvas
              </button>
              <button
                onClick={() => handleTipAction("orchestrator", "open_orchestrator")}
                className="px-3 py-1 rounded-md border border-slate-700 bg-slate-900 text-slate-200"
              >
                Open Orchestrator
              </button>
              <button
                onClick={() => handleTipAction("analytics", "open_analytics")}
                className="px-3 py-1 rounded-md border border-slate-700 bg-slate-900 text-slate-200"
              >
                Open Analytics
              </button>
              <button
                onClick={dismissTip}
                className="px-3 py-1 rounded-md border border-slate-700 bg-transparent text-slate-400"
              >
                Dismiss tips
              </button>
            </div>
          </div>
        ) : null}
        {activeTab === "canvas" && <PromptCanvas />}
        {activeTab === "code-peek" && <CodePeekPanel />}
        {activeTab === "code-explorer" && <CodeExplorerPanel />}
        {activeTab === "prd" && <PrdTool />}
        {activeTab === "agents" && <AgentPanel />}
        {activeTab === "traces" && <TraceViewer />}
        {activeTab === "analytics" && <AnalyticsPane />}
        {activeTab === "console" && (
          <ConsoleChat
            storageKey="aei.familiar.chat"
            seedMessages={[]}
            enableAssistant
            enableDraft
            draftState={draftCanvasState}
            onDraftStateChange={(nextState) => {
              setDraftCanvasState(nextState)
              localStorage.setItem("canvas-state", JSON.stringify(nextState))
              window.dispatchEvent(new Event(CANVAS_STATE_EVENT))
            }}
          />
        )}
        {activeTab === "orchestrator" && <OrchestratorHub />}
      </div>
    </div>
  )
}
