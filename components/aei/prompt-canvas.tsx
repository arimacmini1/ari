"use client"

import React, { useState, useCallback, useRef, useEffect, useMemo } from "react"
import { Play, Download, Upload, Undo2, Redo2, Scan, History, Save, GitBranch, ChevronDown, Trash2, MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { CanvasFlow } from "./canvas-flow"
import { BlockPalette } from "./block-palette"
import { PropertiesEditor } from "./properties-editor"
import { ArtifactPreview } from "./artifact-preview"
import { InstructionPreview } from "./instruction-preview"
import { VersionHistory } from "./version-history"
import { CanvasCommentsPanel } from "./canvas-comments-panel"
import type { CanvasState, CanvasNode, CanvasEdge, BlockType, HistoryState } from "@/lib/canvas-state"
import type { InstructionGraph } from "@/lib/instruction-graph"
import {
  canvasActions,
  createInitialHistory,
} from "@/lib/canvas-state"
import { canvasSerializer } from "@/lib/canvas-serialization"
import { convertPrdToCanvas, isPrdJson } from "@/lib/prd-canvas-converter"
import { CanvasVersionStore } from "@/lib/canvas-versions"
import { useCanvasCollaboration } from "@/lib/use-canvas-collaboration"
import { useCanvasComments } from "@/lib/use-canvas-comments"
import { threeWayMerge, type MergeConflict } from "@/lib/canvas-merge"
import { useActiveProject } from "@/components/aei/active-project-provider"

const blockDefaults: Record<BlockType, { label: string; description: string }> = {
  task: { label: "Task", description: "Process or action" },
  decision: { label: "Decision", description: "Conditional branch" },
  loop: { label: "Loop", description: "Iterative block" },
  parallel: { label: "Parallel", description: "Concurrent execution" },
  text: { label: "Text Input", description: "User input" },
  artifact: { label: "Artifact", description: "Generated output artifact" },
  preview: { label: "Preview", description: "Live output preview" },
}
const COMMENTS_VISIBLE_KEY = "aei.canvas.comments.visible"
const COMMENTS_VISIBILITY_EVENT = "aei:comments-visibility"
const SET_COMMENTS_VISIBILITY_EVENT = "aei:set-comments-panel"

interface ExecutionResult {
  id: string
  status: "running" | "complete" | "error"
  startTime: string
  endTime?: string
  logs?: string[]
}

export function PromptCanvas() {
  const canvasId = "default-canvas"
  const { activeProjectId } = useActiveProject()
  const effectiveProjectId = activeProjectId || "default-project"
  const containerRef = useRef<HTMLDivElement | null>(null)
  const suppressBroadcastRef = useRef(false)
  const lastLocalJsonRef = useRef<string>("")

  const [state, setState] = useState<CanvasState>(() => {
    if (typeof window === "undefined") return { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } }
    const saved = localStorage.getItem("canvas-state")
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch (e) {
        console.error("Failed to load canvas state:", e)
      }
    }
    return { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } }
  })
  const [history, setHistory] = useState<HistoryState>(createInitialHistory())
  const [selectedNode, setSelectedNode] = useState<CanvasNode | null>(null)
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null)
  const [showVersions, setShowVersions] = useState(false)
  const [showComments, setShowComments] = useState<boolean>(() => {
    if (typeof window === "undefined") return true
    const stored = localStorage.getItem(COMMENTS_VISIBLE_KEY)
    if (stored === "false") return false
    return true
  })
  const [showBranches, setShowBranches] = useState(false)
  const [versionStoreInstance] = useState(() => new CanvasVersionStore())
  const [currentVersionId, setCurrentVersionId] = useState<string | null>(null)
  const lastSavedRef = useRef<string>(JSON.stringify(state))

  const [parsedGraph, setParsedGraph] = useState<InstructionGraph | null>(null)
  const [deltaAnnotations, setDeltaAnnotations] = useState<Map<string, "add" | "update" | "remove"> | undefined>(undefined)
  const [isParsing, setIsParsing] = useState(false)
  const [showInstructionPreview, setShowInstructionPreview] = useState(false)
  const lastParsedNodesRef = useRef<CanvasNode[] | null>(null)
  const lastParsedEdgesRef = useRef<CanvasEdge[] | null>(null)

  const [branches, setBranches] = useState<Array<{
    id: string
    name: string
    description: string
    baseState: CanvasState
    headState: CanvasState
    createdAt: string
  }>>([])
  const [currentBranchId, setCurrentBranchId] = useState<string>("main")
  const [newBranchName, setNewBranchName] = useState("")
  const [newBranchDescription, setNewBranchDescription] = useState("")
  const [mergeConflicts, setMergeConflicts] = useState<MergeConflict[] | null>(null)
  const [mergeSourceId, setMergeSourceId] = useState<string | null>(null)
  const [mergeSelections, setMergeSelections] = useState<Record<string, "ours" | "theirs">>({})
  const [pendingMerges, setPendingMerges] = useState<Array<{
    id: string
    source_id: string
    target_id: string
    created_at: string
  }>>([])
  const [showApprovals, setShowApprovals] = useState(false)
  const role = useRef<string>(typeof window !== "undefined"
    ? (localStorage.getItem("aei-role") || "Admin")
    : "Admin")
  const actorId = useRef<string>(typeof window !== "undefined"
    ? (
        sessionStorage.getItem("aei-user") ||
        sessionStorage.getItem("aei.userId") ||
        "local-user"
      )
    : "local-user")


  const applyRemoteState = useCallback((nextState: CanvasState) => {
    suppressBroadcastRef.current = true
    setState(nextState)
    setHistory((prev) => ({ ...prev, present: nextState }))
    localStorage.setItem("canvas-state", JSON.stringify(nextState))
  }, [])

  useEffect(() => {
    lastLocalJsonRef.current = JSON.stringify(state)
  }, [state])

  useEffect(() => {
    if (typeof window === "undefined") return

    const readCanvasState = () => {
      const raw = localStorage.getItem("canvas-state")
      if (!raw) return
      if (raw === lastLocalJsonRef.current) return
      try {
        const parsed = JSON.parse(raw) as CanvasState
        if (!parsed?.nodes || !parsed?.edges) return
        applyRemoteState(parsed)
      } catch {
        // ignore invalid external state
      }
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== "canvas-state") return
      readCanvasState()
    }

    const handleCanvasEvent = () => readCanvasState()

    window.addEventListener("storage", handleStorage)
    window.addEventListener("aei:canvas-state", handleCanvasEvent)
    return () => {
      window.removeEventListener("storage", handleStorage)
      window.removeEventListener("aei:canvas-state", handleCanvasEvent)
    }
  }, [applyRemoteState])

  useEffect(() => {
    if (typeof window === "undefined") return
    localStorage.setItem(COMMENTS_VISIBLE_KEY, showComments ? "true" : "false")
    window.dispatchEvent(
      new CustomEvent(COMMENTS_VISIBILITY_EVENT, {
        detail: { visible: showComments },
      })
    )
  }, [showComments])

  useEffect(() => {
    if (typeof window === "undefined") return
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ visible: boolean }>).detail
      if (!detail || typeof detail.visible !== "boolean") return
      setShowComments(detail.visible)
    }
    window.addEventListener(SET_COMMENTS_VISIBILITY_EVENT, handler as EventListener)
    return () => {
      window.removeEventListener(SET_COMMENTS_VISIBILITY_EVENT, handler as EventListener)
    }
  }, [])

  const {
    displayName: collaborationDisplayName,
    collaborators,
    broadcastCursor,
    observeLocalState,
    conflicts,
    editEvents,
    resolveConflict,
  } = useCanvasCollaboration(canvasId, applyRemoteState, { scopeKey: effectiveProjectId })

  const {
    activity: commentActivity,
    unreadMentions,
    actorMentionHandle,
    addComment,
    recordEditActivity,
    recordRollbackActivity,
    threadForNode,
    markActivityRead,
    markAllActivityRead,
    clearReadActivity,
  } = useCanvasComments(canvasId, effectiveProjectId)
  const processedEditIdsRef = useRef<Set<string>>(new Set())
  const collaboratorPayload = useMemo(
    () =>
      collaborators.map((collaborator) => ({
        id: collaborator.userId || collaborator.id,
        name: collaborator.name,
      })),
    [collaborators]
  )
  const collaboratorEventSignature = useMemo(
    () =>
      JSON.stringify(
        collaboratorPayload
          .map((collaborator) => `${collaborator.id}:${collaborator.name}`)
          .sort()
      ),
    [collaboratorPayload]
  )

  useEffect(() => {
    const names = collaborators.slice(0, 4).map((c) => c.name)
    window.dispatchEvent(
      new CustomEvent("aei-collaborators", {
        detail: { count: collaborators.length, names, collaborators: collaboratorPayload },
      })
    )
  }, [collaboratorEventSignature, collaboratorPayload, collaborators])

  useEffect(() => {
    return () => {
      window.dispatchEvent(
        new CustomEvent("aei-collaborators", {
          detail: { count: 0, names: [], collaborators: [] },
        })
      )
    }
  }, [])

  const collaborationNames = useCallback(() => {
    const names = [collaborationDisplayName, ...collaborators.map((c) => c.name)]
      .map((name) => name.trim())
      .filter(Boolean)
    return Array.from(new Set(names))
  }, [collaborationDisplayName, collaborators])

  useEffect(() => {
    if (!editEvents.length) return
    for (const event of editEvents) {
      if (processedEditIdsRef.current.has(event.id)) continue
      processedEditIdsRef.current.add(event.id)
      recordEditActivity({
        editId: event.id,
        nodeId: event.nodeId,
        nodeLabel: event.nodeLabel,
        actorName: event.actorName,
        action: event.action,
        timestampMs: event.createdAt,
      })
    }
    if (processedEditIdsRef.current.size > 500) {
      const trimmed = Array.from(processedEditIdsRef.current).slice(-250)
      processedEditIdsRef.current = new Set(trimmed)
    }
  }, [editEvents, recordEditActivity])

  const handleStateChange = useCallback((newState: CanvasState) => {
    setState(newState)
    localStorage.setItem("canvas-state", JSON.stringify(newState))
    setBranches((prev) =>
      prev.map((b) => (b.id === currentBranchId ? { ...b, headState: structuredClone(newState) } : b))
    )
  }, [currentBranchId])

  const addBlock = useCallback(
    (blockType: BlockType) => {
      const id = `node-${Date.now()}`
      const defaults = blockDefaults[blockType]
      const newNode: CanvasNode = {
        id,
        data: {
          label: defaults.label,
          description: defaults.description,
          blockType,
        },
        position: { x: Math.random() * 400, y: Math.random() * 400 },
        type: "block",
      }
      const newState = {
        ...state,
        nodes: [...state.nodes, newNode],
      }
      handleStateChange(newState)
      setHistory((prev) => canvasActions.pushHistory({ ...prev, present: newState }))
    },
    [state, handleStateChange]
  )

  const addBlockAtPosition = useCallback(
    (blockType: BlockType, label: string, description: string, position: { x: number; y: number }) => {
      const id = `node-${Date.now()}`
      const newNode: CanvasNode = {
        id,
        data: { label, description, blockType },
        position,
        type: "block",
      }
      const newState = {
        ...state,
        nodes: [...state.nodes, newNode],
      }
      handleStateChange(newState)
      setHistory((prev) => canvasActions.pushHistory({ ...prev, present: newState }))
    },
    [state, handleStateChange]
  )

  const undo = useCallback(() => {
    setHistory((prev) => {
      const newHistory = canvasActions.undo(prev)
      setState(newHistory.present)
      return newHistory
    })
  }, [])

  const redo = useCallback(() => {
    setHistory((prev) => {
      const newHistory = canvasActions.redo(prev)
      setState(newHistory.present)
      return newHistory
    })
  }, [])

  const clearCanvas = useCallback(() => {
    if (state.nodes.length === 0 && state.edges.length === 0) return
    const confirmed = window.confirm("Delete all blocks and connections from this canvas?")
    if (!confirmed) return
    const cleared: CanvasState = {
      ...state,
      nodes: [],
      edges: [],
    }
    setSelectedNode(null)
    handleStateChange(cleared)
    setHistory((prev) => canvasActions.pushHistory({ ...prev, present: cleared }))
  }, [state, handleStateChange])

  const exportCanvas = useCallback(() => {
    canvasSerializer.downloadJSON(state)
  }, [state])

  const importCanvas = useCallback(() => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = "application/json"
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = (event) => {
        try {
          const json = JSON.parse(event.target?.result as string)
          if (isPrdJson(json)) {
            const converted = convertPrdToCanvas(json)
            if (converted) {
              handleStateChange(converted)
              setHistory((prev) => canvasActions.pushHistory({ ...prev, present: converted }))
              alert("PRD JSON imported and converted to canvas")
              return
            }
            alert("Unable to convert PRD JSON")
            return
          }

          const deserialized = canvasSerializer.import(json)
          if (deserialized) {
            handleStateChange(deserialized)
            setHistory((prev) => canvasActions.pushHistory({ ...prev, present: deserialized }))
            return
          }

          alert("Invalid canvas file")
        } catch {
          alert("Failed to parse canvas file")
        }
      }
      reader.readAsText(file)
    }
    input.click()
  }, [handleStateChange])

  const canvasChanged = useCallback(() => {
    if (!lastParsedNodesRef.current || !lastParsedEdgesRef.current) return true
    return (
      JSON.stringify(state.nodes) !== JSON.stringify(lastParsedNodesRef.current) ||
      JSON.stringify(state.edges) !== JSON.stringify(lastParsedEdgesRef.current)
    )
  }, [state])

  const parseCanvas = useCallback(async () => {
    if (state.nodes.length === 0) {
      alert("Canvas must contain at least one node")
      return
    }
    setIsParsing(true)
    try {
      const hasPrevious = parsedGraph && lastParsedNodesRef.current
      const changed = canvasChanged()

      if (hasPrevious && !changed) {
        setShowInstructionPreview(true)
        setIsParsing(false)
        return
      }

      if (hasPrevious && changed) {
        const response = await fetch("/api/canvases/parse/delta", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nodes: state.nodes,
            edges: state.edges,
            previous_graph_id: parsedGraph.graph_id,
            previous_tasks: parsedGraph.tasks,
          }),
        })
        if (!response.ok) {
          const err = await response.json()
          throw new Error(err.error || "Delta parse failed")
        }
        const result = await response.json()
        const annotations = new Map<string, "add" | "update" | "remove">()
        for (const d of result.deltas) {
          annotations.set(d.task.source_node_id, d.action)
        }
        setParsedGraph(result.full_graph)
        setDeltaAnnotations(annotations.size > 0 ? annotations : undefined)
      } else {
        const response = await fetch("/api/canvases/parse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nodes: state.nodes,
            edges: state.edges,
          }),
        })
        if (!response.ok) {
          const err = await response.json()
          throw new Error(err.error || "Parse failed")
        }
        const result = await response.json()
        setParsedGraph(result)
        setDeltaAnnotations(undefined)
      }

      lastParsedNodesRef.current = [...state.nodes]
      lastParsedEdgesRef.current = [...state.edges]
      setShowInstructionPreview(true)
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to parse canvas")
    } finally {
      setIsParsing(false)
    }
  }, [state, parsedGraph, canvasChanged])

  const executeFromPreview = useCallback(async () => {
    try {
      const repoUrl = localStorage.getItem("aei.workflow.context.repo_url") || undefined;
      const repoBranch = localStorage.getItem("aei.workflow.context.repo_branch") || undefined;
      const repoCommit = localStorage.getItem("aei.workflow.context.repo_commit") || undefined;
      const source_repo = repoUrl
        ? { url: repoUrl, branch: repoBranch || "main", commit: repoCommit }
        : undefined;

      const response = await fetch("/api/executions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nodes: state.nodes,
          edges: state.edges,
          source_repo,
        }),
      })
      if (!response.ok) throw new Error("Execution failed")
      const result = await response.json()
      setShowInstructionPreview(false)
      setParsedGraph(null)
      setDeltaAnnotations(undefined)
      lastParsedNodesRef.current = null
      lastParsedEdgesRef.current = null
      setExecutionResult({
        id: result.execution_id,
        status: "running",
        startTime: result.created_at,
        logs: [`Execution started: ${result.execution_id}`],
      })
      setTimeout(() => {
        setExecutionResult((prev) => {
          if (!prev) return prev
          return {
          ...prev,
          status: "complete",
          endTime: new Date().toISOString(),
          }
        })
      }, 3000)
    } catch {
      alert("Failed to execute canvas")
    }
  }, [state])

  const executeCanvas = useCallback(async () => {
    if (!parsedGraph || canvasChanged()) {
      await parseCanvas()
      return
    }
    await executeFromPreview()
  }, [parsedGraph, canvasChanged, parseCanvas, executeFromPreview])

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const isTypingTarget =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable
      if (isTypingTarget) return

      if (e.ctrlKey || e.metaKey) {
        if (e.key === "z") {
          e.preventDefault()
          undo()
        } else if (e.key === "y") {
          e.preventDefault()
          redo()
        } else if (e.shiftKey && (e.key === "Backspace" || e.key === "Delete")) {
          e.preventDefault()
          clearCanvas()
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [undo, redo, clearCanvas])

  const saveVersion = useCallback(() => {
    const version = versionStoreInstance.save(canvasId, state, {
      userId: actorId.current,
      actorName: collaborationDisplayName,
      saveSource: "manual",
      collaboratorNames: collaborationNames(),
    })
    setCurrentVersionId(version.version_id)
    lastSavedRef.current = JSON.stringify(state)
  }, [versionStoreInstance, canvasId, state, collaborationDisplayName, collaborationNames])

  const createBranch = useCallback(() => {
    const name = newBranchName.trim()
    if (!name) return
    const id = `branch-${Date.now()}`
    setBranches((prev) => [
      ...prev,
      {
        id,
        name,
        description: newBranchDescription.trim(),
        baseState: structuredClone(state),
        headState: structuredClone(state),
        createdAt: new Date().toISOString(),
      },
    ])
    setNewBranchName("")
    setNewBranchDescription("")
  }, [newBranchName, newBranchDescription, state])

  const switchBranch = useCallback((branchId: string) => {
    const branch = branches.find((b) => b.id === branchId)
    if (!branch) return
    setCurrentBranchId(branchId)
    suppressBroadcastRef.current = true
    setState(structuredClone(branch.headState))
    setHistory((prev) => ({ ...prev, present: structuredClone(branch.headState) }))
    localStorage.setItem("canvas-state", JSON.stringify(branch.headState))
  }, [branches])

  const mergeBranch = useCallback((sourceId: string) => {
    const source = branches.find((b) => b.id === sourceId)
    const target = branches.find((b) => b.id === currentBranchId)
    if (!source || !target) return
    const { merged, conflicts } = threeWayMerge(source.baseState, target.headState, source.headState)
    return { merged, conflicts }
  }, [branches, currentBranchId])

  const loadPendingMerges = useCallback(async () => {
    try {
      const response = await fetch("/api/merges", {
        headers: { "x-user-id": actorId.current },
      })
      if (!response.ok) return
      const data = await response.json()
      setPendingMerges(data.merges || [])
    } catch {
      // ignore for MVP
    }
  }, [])

  const requestMerge = useCallback(async (sourceId: string) => {
    try {
      const response = await fetch("/api/merges", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": actorId.current,
        },
        body: JSON.stringify({ source_id: sourceId, target_id: currentBranchId }),
      })
      if (response.ok) {
        await loadPendingMerges()
      }
    } catch {
      // ignore for MVP
    }
  }, [currentBranchId, loadPendingMerges])

  const approveMerge = useCallback(async (mergeId: string) => {
    if (role.current !== "Admin" && role.current !== "ProjectManager") return
    const merge = pendingMerges.find((m) => m.id === mergeId)
    if (!merge) return
    const response = await fetch(`/api/merges/${mergeId}/approve`, {
      method: "POST",
      headers: { "x-user-id": actorId.current },
    })
    if (!response.ok) return
    const result = mergeBranch(merge.source_id)
    if (result?.conflicts && result.conflicts.length > 0) {
      setMergeConflicts(result.conflicts)
      setMergeSourceId(merge.source_id)
      setMergeSelections({})
      return
    }
    if (result?.merged) {
      handleStateChange(result.merged)
    }
    await loadPendingMerges()
  }, [handleStateChange, loadPendingMerges, mergeBranch, pendingMerges])

  const rejectMerge = useCallback(async (mergeId: string) => {
    await fetch(`/api/merges/${mergeId}/reject`, {
      method: "POST",
      headers: { "x-user-id": actorId.current },
    })
    await loadPendingMerges()
  }, [loadPendingMerges])

  const applyMergeSelections = useCallback(() => {
    if (!mergeConflicts || !mergeSourceId) return
    let nextState = structuredClone(state)
    for (const conflict of mergeConflicts) {
      const choice = mergeSelections[conflict.id] ?? "ours"
      if (conflict.type === "node") {
        if (choice === "theirs") {
          if (conflict.theirs) {
            nextState.nodes = nextState.nodes.map((n) => (n.id === conflict.id ? conflict.theirs as any : n))
          } else {
            nextState.nodes = nextState.nodes.filter((n) => n.id !== conflict.id)
          }
        }
      } else if (conflict.type === "edge") {
        if (choice === "theirs") {
          if (conflict.theirs) {
            nextState.edges = nextState.edges.map((e) => (e.id === conflict.id ? conflict.theirs as any : e))
          } else {
            nextState.edges = nextState.edges.filter((e) => e.id !== conflict.id)
          }
        }
      }
    }
    handleStateChange(nextState)
    setMergeConflicts(null)
    setMergeSourceId(null)
    setMergeSelections({})
  }, [mergeConflicts, mergeSelections, state, handleStateChange, mergeSourceId])

  const handleRevert = useCallback(
    (versionId: string) => {
      const confirmed = window.confirm("Revert canvas to this saved version?")
      if (!confirmed) return
      const targetVersion = versionStoreInstance.getVersion(canvasId, versionId)
      const reverted = versionStoreInstance.revert(canvasId, versionId)
      if (reverted && targetVersion) {
        handleStateChange(reverted)
        setHistory((prev) => canvasActions.pushHistory({ ...prev, present: reverted }))
        const rollbackVersion = versionStoreInstance.save(canvasId, reverted, {
          userId: actorId.current,
          actorName: collaborationDisplayName,
          saveSource: "rollback",
          collaboratorNames: collaborationNames(),
          rollbackFromVersionId: targetVersion.version_id,
        })
        setCurrentVersionId(rollbackVersion.version_id)
        recordRollbackActivity({
          rollbackId: `rollback-${rollbackVersion.version_id}`,
          actorName: collaborationDisplayName,
          fromVersionId: targetVersion.version_id,
          toVersionId: rollbackVersion.version_id,
          timestampMs: Date.now(),
        })
        lastSavedRef.current = JSON.stringify(reverted)
      }
    },
    [
      versionStoreInstance,
      canvasId,
      handleStateChange,
      collaborationDisplayName,
      collaborationNames,
      recordRollbackActivity,
    ]
  )

  useEffect(() => {
    if (suppressBroadcastRef.current) {
      suppressBroadcastRef.current = false
      return
    }
    observeLocalState(state)
  }, [state, observeLocalState])

  useEffect(() => {
    loadPendingMerges()
  }, [loadPendingMerges])

  useEffect(() => {
    if (branches.length === 0) {
      setBranches([
        {
          id: "main",
          name: "main",
          description: "Default branch",
          baseState: structuredClone(state),
          headState: structuredClone(state),
          createdAt: new Date().toISOString(),
        },
      ])
    }
  }, [branches.length, state])

  useEffect(() => {
    const interval = setInterval(() => {
      const current = JSON.stringify(state)
      if (current !== lastSavedRef.current) {
        const version = versionStoreInstance.save(canvasId, state, {
          userId: actorId.current,
          actorName: collaborationDisplayName,
          saveSource: "autosave",
          collaboratorNames: collaborationNames(),
        })
        setCurrentVersionId(version.version_id)
        lastSavedRef.current = current
      }
    }, 60000)
    return () => clearInterval(interval)
  }, [state, versionStoreInstance, canvasId, collaborationDisplayName, collaborationNames])

  return (
    <div className="flex flex-1 h-full gap-0">
      <BlockPalette onAddBlock={addBlock} />

      <div className="flex-1 flex flex-col min-h-0 min-w-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <h2 className="text-sm font-semibold text-foreground shrink-0">Prompt Canvas</h2>
          </div>
          <div className="flex items-center gap-1.5 justify-end lg:flex-nowrap lg:overflow-x-auto">
            <Button
              size="sm"
              variant="outline"
              className="h-7 w-7 p-0"
              onClick={() => undo()}
              disabled={history.past.length === 0}
              aria-label="Undo"
              title="Undo"
            >
              <Undo2 className="w-3 h-3" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 w-7 p-0"
              onClick={() => redo()}
              disabled={history.future.length === 0}
              aria-label="Redo"
              title="Redo"
            >
              <Redo2 className="w-3 h-3" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5">
                  File
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={exportCanvas}>
                  <Download className="w-3 h-3" />
                  Export
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={importCanvas}>
                  <Upload className="w-3 h-3" />
                  Import
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={clearCanvas}>
                  <Trash2 className="w-3 h-3" />
                  Clear canvas
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5">
                  Workflow
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => setShowVersions((v) => !v)}>
                  <History className="w-3 h-3" />
                  Versions
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setShowBranches(true)}>
                  <GitBranch className="w-3 h-3" />
                  Branches
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setShowApprovals(true)}>
                  Approvals
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setShowComments((value) => !value)}>
                  <MessageSquare className="w-3 h-3" />
                  {showComments ? "Hide comments" : "Show comments"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              size="sm"
              variant="outline"
              className="h-7 w-7 p-0"
              onClick={saveVersion}
              aria-label="Save version"
              title="Save version"
            >
              <Save className="w-3 h-3" />
            </Button>
            {unreadMentions > 0 && (
              <span className="inline-flex h-7 items-center rounded-full border border-amber-300/40 bg-amber-200/10 px-2 text-[10px] font-medium text-amber-200">
                {unreadMentions} unread
              </span>
            )}
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1.5"
              onClick={parseCanvas}
              disabled={isParsing}
            >
              <Scan className="w-3 h-3" />
              {isParsing ? "Parsing..." : "Parse"}
            </Button>
            <Button
              size="sm"
              className="h-7 text-xs gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={executeCanvas}
            >
              <Play className="w-3 h-3" />
              Execute
            </Button>
          </div>
        </div>

        {conflicts.length > 0 && (
          <div className="mx-6 mt-3 rounded-lg border border-amber-300/40 bg-amber-50/10 px-4 py-3 text-xs text-amber-200">
            <div className="mb-2 font-semibold text-amber-100">Edit conflicts detected ({conflicts.length})</div>
            <div className="space-y-2">
              {conflicts.slice(0, 3).map((conflict) => (
                <div key={conflict.id} className="flex items-center justify-between gap-3">
                  <div className="text-amber-200/80">Node {conflict.nodeId}</div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => resolveConflict(conflict.id, "mine")}
                    >
                      Keep mine
                    </Button>
                    <Button
                      size="sm"
                      className="h-7 text-xs bg-amber-500 text-amber-950 hover:bg-amber-400"
                      onClick={() => resolveConflict(conflict.id, "theirs")}
                    >
                      Use theirs
                    </Button>
                  </div>
                </div>
              ))}
              {conflicts.length > 3 && (
                <div className="text-amber-200/70">Resolve remaining conflicts in order.</div>
              )}
            </div>
          </div>
        )}

        <div className="flex-1 min-h-0 overflow-hidden relative" ref={containerRef}>
          <CanvasFlow
            initialState={state}
            onStateChange={handleStateChange}
            onDropBlock={addBlockAtPosition}
            collaborators={collaborators}
            selectedNode={selectedNode?.id}
            onSelectNode={(id) => {
              const node = state.nodes.find((n) => n.id === id)
              setSelectedNode(node || null)
            }}
            onFlowPointerMove={(point) => {
              broadcastCursor(point.xFlow, point.yFlow)
            }}
          />
        </div>
      </div>

      {selectedNode && (
        <PropertiesEditor
          node={selectedNode}
          onClose={() => setSelectedNode(null)}
          onSave={(node) => {
            const newState = {
              ...state,
              nodes: state.nodes.map((n) => (n.id === node.id ? node : n)),
            }
            handleStateChange(newState)
            setHistory((prev) => canvasActions.pushHistory({ ...prev, present: newState }))
          }}
        />
      )}

      {showComments && (
        <CanvasCommentsPanel
          selectedNode={selectedNode}
          activeThread={threadForNode(selectedNode?.id || null)}
          activity={commentActivity}
          unreadMentions={unreadMentions}
          actorMentionHandle={actorMentionHandle}
          onAddComment={addComment}
          onMarkActivityRead={markActivityRead}
          onMarkAllActivityRead={markAllActivityRead}
          onClearReadActivity={clearReadActivity}
          onHidePanel={() => setShowComments(false)}
        />
      )}

      {showInstructionPreview && parsedGraph && (
        <InstructionPreview
          graph={parsedGraph}
          deltas={deltaAnnotations}
          onExecute={executeFromPreview}
          onClose={() => {
            setShowInstructionPreview(false)
            setDeltaAnnotations(undefined)
          }}
        />
      )}

      {showVersions && (
        <VersionHistory
          versions={versionStoreInstance.getVersions(canvasId)}
          currentVersionId={currentVersionId}
          onRevert={handleRevert}
          onClose={() => setShowVersions(false)}
        />
      )}

      <Dialog open={showBranches} onOpenChange={setShowBranches}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Branches</DialogTitle>
            <DialogDescription>Create, switch, and merge canvas branches.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Input
                placeholder="New branch name"
                value={newBranchName}
                onChange={(e) => setNewBranchName(e.target.value)}
              />
              <Input
                placeholder="Description (optional)"
                value={newBranchDescription}
                onChange={(e) => setNewBranchDescription(e.target.value)}
              />
              <Button size="sm" onClick={createBranch}>Create branch</Button>
            </div>
            <div className="space-y-2">
              {branches.map((branch) => (
                <div key={branch.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                  <div>
                    <div className="font-medium">{branch.name}</div>
                    <div className="text-xs text-muted-foreground">{branch.description || "No description"}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {branch.id === currentBranchId ? (
                      <span className="text-xs text-emerald-400">Current</span>
                    ) : (
                      <>
                        <Button size="sm" variant="outline" onClick={() => switchBranch(branch.id)}>
                          Switch
                        </Button>
                        <Button size="sm" onClick={() => requestMerge(branch.id)}>
                          Request merge
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBranches(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showApprovals} onOpenChange={setShowApprovals}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Merge approvals</DialogTitle>
            <DialogDescription>Approve or reject pending merge requests.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {pendingMerges.length === 0 && (
              <div className="text-sm text-muted-foreground">No pending merges.</div>
            )}
              {pendingMerges.map((merge) => (
                <div key={merge.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                  <div>
                    <div className="font-medium">Merge {merge.source_id} → {merge.target_id}</div>
                    <div className="text-xs text-muted-foreground">{new Date(merge.created_at).toLocaleString()}</div>
                  </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={role.current !== "Admin" && role.current !== "ProjectManager"}
                    onClick={() => approveMerge(merge.id)}
                  >
                    Approve
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => rejectMerge(merge.id)}>
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApprovals(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {mergeConflicts && mergeConflicts.length > 0 && (
        <Dialog open={true} onOpenChange={() => setMergeConflicts(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Merge conflicts</DialogTitle>
              <DialogDescription>
                {mergeConflicts.length} conflicts detected. Choose how to resolve.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 text-sm">
              {mergeConflicts.map((conflict) => (
                <div key={conflict.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                  <div>
                    <div className="font-medium">
                      {conflict.type === "node" ? "Node" : "Edge"} {conflict.id}
                    </div>
                    <div className="text-xs text-muted-foreground">Pick a version to keep.</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant={mergeSelections[conflict.id] === "ours" ? "default" : "outline"}
                      onClick={() => setMergeSelections((prev) => ({ ...prev, [conflict.id]: "ours" }))}
                    >
                      Ours
                    </Button>
                    <Button
                      size="sm"
                      variant={mergeSelections[conflict.id] === "theirs" ? "default" : "outline"}
                      onClick={() => setMergeSelections((prev) => ({ ...prev, [conflict.id]: "theirs" }))}
                    >
                      Theirs
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setMergeConflicts(null)}>
                Cancel
              </Button>
              <Button onClick={applyMergeSelections}>
                Apply resolutions
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {executionResult && (
        <ArtifactPreview
          result={executionResult}
          onClose={() => setExecutionResult(null)}
        />
      )}
    </div>
  )
}
