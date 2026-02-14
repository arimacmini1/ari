"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import {
  ConsoleChat,
  type ChatMessage,
  type ConsoleChatHandle,
  type PromptResolution,
} from "@/components/aei/console-chat"
import { Button } from "@/components/ui/button"
import {
  Plus,
  History as HistoryIcon,
  Bookmark,
  Trash2,
  SlidersHorizontal,
  Download,
  GraduationCap,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import type { CanvasState } from "@/lib/canvas-state"
import { toast } from "@/hooks/use-toast"
import { emitTelemetryEvent } from "@/lib/telemetry-client"

const DRAFT_STATE_KEY = "aei.familiar.draft"
const DRAFT_HISTORY_KEY = "aei.familiar.draft.history"
const DRAFT_META_KEY = "aei.familiar.draft.meta"
const CHAT_HISTORY_KEY = "aei.familiar.chats"
const CHECKPOINTS_KEY = "aei.familiar.checkpoints"
const CHAT_STORAGE_KEY = "aei.familiar.chat"
const TELEMETRY_STORAGE_KEY = CHAT_STORAGE_KEY
const CANVAS_STATE_KEY = "canvas-state"
const EXPANSION_SOURCE_KEY = "aei.familiar.expansionSource"
const EXPANSION_MODEL_KEY = "aei.familiar.expansionModel"
const COPILOT_PROMPT_ID_KEY = "aei.copilot.promptId"
const COPILOT_STATUS_EVENT = "aei:copilot-status"
const CANVAS_STATE_EVENT = "aei:canvas-state"
const CODE_EXPLORER_SNAPSHOT_EVENT = "aei:code-explorer-snapshot-updated"
const TUTORIAL_STATE_KEY = "aei.familiar.tutorial.state"
const TUTORIAL_METRICS_KEY = "aei.familiar.tutorial.metrics"
const IMPORT_INPUT_KEY = "aei.familiar.import.input"
const EXPAND_TIMEOUT_MS = 12000

interface DraftMeta {
  source: string
  model?: string
  updatedAt: string
  opsCount: number
}

interface ImportResponse {
  canvas?: CanvasState
  assignment_preview?: Array<{
    task_id: string
    task_label: string
    assigned_agent: string
  }>
  source?: string
  project_name?: string
  duration_ms?: number
  error?: string
  preflight?: boolean
  summary?: string
  tasks_preview?: string[]
}

interface ChatArchive {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  preview: string
  messages: ChatMessage[]
  draftState: CanvasState | null
}

interface MessageCheckpoint {
  id: string
  messageId: string
  label: string
  createdAt: string
  messages: ChatMessage[]
  draftState: CanvasState | null
}

interface CopilotWorkbenchProps {
  fontScale?: "xsmall" | "small" | "normal"
  messageStyle?: "plain" | "detailed"
  compact?: boolean
}

interface PromptOption {
  id: string
  name: string
  description: string
  version: number
  enabled: boolean
  subjectTags: string[]
}

interface TutorialState {
  active: boolean
  step: number
  startedAt: string | null
  completedAt: string | null
}

interface TutorialMetrics {
  startedAt: string | null
  firstOutputAt: string | null
  completedAt: string | null
  dropOffStep: number | null
}

const tutorialSteps = [
  {
    title: "Define Todo MVP",
    detail:
      "In chat, describe a Todo app MVP (tasks, auth optional, simple persistence). This mirrors Familiar Mode prompt-first entry.",
  },
  {
    title: "Apply to Canvas",
    detail:
      "Click Apply to Canvas to upgrade from chat guidance into multi-agent orchestration planning and inspect generated task graph.",
  },
  {
    title: "Inspect Generated Artifacts",
    detail:
      "Run simulation and open Code Peek to inspect generated files in read-only mode. This closes the Prompt → Preview loop.",
  },
  {
    title: "Iterate and Re-run",
    detail:
      "Refine requirements in chat, re-apply canvas, and re-run simulation. This demonstrates closed feedback loops and iteration.",
  },
] as const

function cloneCanvasState(state: CanvasState | null) {
  if (!state) return null
  return JSON.parse(JSON.stringify(state)) as CanvasState
}

function buildCanvasFromChat(messages: ChatMessage[]): CanvasState {
  const lastUser = [...messages].reverse().find((m) => m.role === "user")
  const prompt = lastUser?.content?.trim() || "Describe your project goals here."
  const textId = `node-${Date.now()}-text`
  const taskId = `node-${Date.now()}-task`

  return {
    nodes: [
      {
        id: textId,
        type: "block",
        data: {
          label: "Prompt",
          description: prompt,
          blockType: "text",
        },
        position: { x: 80, y: 120 },
      },
      {
        id: taskId,
        type: "block",
        data: {
          label: "Task",
          description: "Initial task derived from chat prompt",
          blockType: "task",
        },
        position: { x: 360, y: 140 },
      },
    ],
    edges: [{ id: `edge-${textId}-${taskId}`, source: textId, target: taskId }],
    viewport: { x: 0, y: 0, zoom: 1 },
  }
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function CopilotWorkbench({
  fontScale = "small",
  messageStyle = "plain",
}: CopilotWorkbenchProps) {
  const chatRef = useRef<ConsoleChatHandle | null>(null)
  const draftStateRef = useRef<CanvasState | null>(null)
  const checkpointMessageIdsRef = useRef<Set<string>>(new Set())
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [draftState, setDraftState] = useState<CanvasState | null>(null)
  const [draftMeta, setDraftMeta] = useState<DraftMeta | null>(null)
  const [chatArchives, setChatArchives] = useState<ChatArchive[]>([])
  const [checkpoints, setCheckpoints] = useState<MessageCheckpoint[]>([])
  const [isExpanding, setIsExpanding] = useState(false)
  const [lastExpansionSource, setLastExpansionSource] = useState<string | null>(null)
  const [lastExpansionModel, setLastExpansionModel] = useState<string | null>(null)
  const [promptOptions, setPromptOptions] = useState<PromptOption[]>([])
  const [selectedPromptId, setSelectedPromptId] = useState<string>("auto")
  const [resolvedPrompt, setResolvedPrompt] = useState<PromptResolution | null>(null)
  const [tutorialState, setTutorialState] = useState<TutorialState>({
    active: false,
    step: 0,
    startedAt: null,
    completedAt: null,
  })
  const [tutorialMetrics, setTutorialMetrics] = useState<TutorialMetrics>({
    startedAt: null,
    firstOutputAt: null,
    completedAt: null,
    dropOffStep: null,
  })
  const [importOpen, setImportOpen] = useState(false)
  const [importInput, setImportInput] = useState<string>("")
  const [importPreview, setImportPreview] = useState<ImportResponse | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [importPreflightLoading, setImportPreflightLoading] = useState(false)
  const [importRunLoading, setImportRunLoading] = useState(false)

  const resolvedPromptLabel = useMemo(() => {
    if (resolvedPrompt) {
      return `${resolvedPrompt.name} v${resolvedPrompt.version} (${resolvedPrompt.mode})`
    }
    return selectedPromptId === "auto" ? "Auto" : selectedPromptId
  }, [resolvedPrompt, selectedPromptId])

  const lastApplyLabel = useMemo(() => {
    if (!lastExpansionSource) return "Not applied"
    if (!lastExpansionModel) return `${lastExpansionSource}`
    return `${lastExpansionSource} / ${lastExpansionModel}`
  }, [lastExpansionModel, lastExpansionSource])

  useEffect(() => {
    if (typeof window === "undefined") return

    const storedDraft = localStorage.getItem(DRAFT_STATE_KEY)
    if (storedDraft) {
      try {
        const parsed = JSON.parse(storedDraft) as CanvasState
        if (parsed?.nodes && parsed?.edges) {
          setDraftState(parsed)
          draftStateRef.current = parsed
        }
      } catch {}
    }

    const storedHistory = localStorage.getItem(DRAFT_HISTORY_KEY)
    if (storedHistory) {
      try {
        const parsed = JSON.parse(storedHistory) as unknown
        if (!parsed) {
          localStorage.removeItem(DRAFT_HISTORY_KEY)
        }
      } catch {}
    }

    const storedMeta = localStorage.getItem(DRAFT_META_KEY)
    if (storedMeta) {
      try {
        const parsed = JSON.parse(storedMeta) as DraftMeta
        if (parsed?.updatedAt) setDraftMeta(parsed)
      } catch {}
    }

    const storedArchives = localStorage.getItem(CHAT_HISTORY_KEY)
    if (storedArchives) {
      try {
        const parsed = JSON.parse(storedArchives) as ChatArchive[]
        if (Array.isArray(parsed)) setChatArchives(parsed)
      } catch {}
    }

    const storedCheckpoints = localStorage.getItem(CHECKPOINTS_KEY)
    if (storedCheckpoints) {
      try {
        const parsed = JSON.parse(storedCheckpoints) as MessageCheckpoint[]
        if (Array.isArray(parsed)) {
          setCheckpoints(parsed)
          checkpointMessageIdsRef.current = new Set(parsed.map((item) => item.messageId))
        }
      } catch {}
    }

    setLastExpansionSource(localStorage.getItem(EXPANSION_SOURCE_KEY))
    setLastExpansionModel(localStorage.getItem(EXPANSION_MODEL_KEY))

    const storedPromptId = localStorage.getItem(COPILOT_PROMPT_ID_KEY)
    if (storedPromptId && storedPromptId.length > 0) {
      setSelectedPromptId(storedPromptId)
    }

    const storedTutorialState = localStorage.getItem(TUTORIAL_STATE_KEY)
    if (storedTutorialState) {
      try {
        const parsed = JSON.parse(storedTutorialState) as TutorialState
        if (typeof parsed?.active === "boolean") {
          setTutorialState(parsed)
        }
      } catch {}
    }

    const storedTutorialMetrics = localStorage.getItem(TUTORIAL_METRICS_KEY)
    if (storedTutorialMetrics) {
      try {
        const parsed = JSON.parse(storedTutorialMetrics) as TutorialMetrics
        if (parsed && "startedAt" in parsed) {
          setTutorialMetrics(parsed)
        }
      } catch {}
    }

    void (async () => {
      try {
        const resp = await fetch("/api/familiar/prompts")
        if (!resp.ok) return
        const data = await resp.json()
        const prompts = Array.isArray(data?.prompts) ? (data.prompts as PromptOption[]) : []
        setPromptOptions(prompts.filter((prompt) => prompt.enabled))
      } catch {
        // ignore and keep selector in auto-only mode
      }
    })()
  }, [])

  useEffect(() => {
    draftStateRef.current = draftState
    if (typeof window === "undefined") return
    if (draftState) localStorage.setItem(DRAFT_STATE_KEY, JSON.stringify(draftState))
    if (draftMeta) localStorage.setItem(DRAFT_META_KEY, JSON.stringify(draftMeta))
    localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(chatArchives))
    localStorage.setItem(CHECKPOINTS_KEY, JSON.stringify(checkpoints))
  }, [chatArchives, checkpoints, draftMeta, draftState])

  useEffect(() => {
    localStorage.setItem(COPILOT_PROMPT_ID_KEY, selectedPromptId)
    window.dispatchEvent(new Event(COPILOT_STATUS_EVENT))
  }, [selectedPromptId])

  useEffect(() => {
    localStorage.setItem(TUTORIAL_STATE_KEY, JSON.stringify(tutorialState))
  }, [tutorialState])

  useEffect(() => {
    localStorage.setItem(TUTORIAL_METRICS_KEY, JSON.stringify(tutorialMetrics))
  }, [tutorialMetrics])

  useEffect(() => {
    if (!importOpen) return
    const stored = localStorage.getItem(IMPORT_INPUT_KEY)
    if (stored && !importInput) {
      setImportInput(stored)
    }
  }, [importOpen, importInput])

  useEffect(() => {
    if (!tutorialState.active || tutorialMetrics.firstOutputAt) return
    const hasAssistantOutput = chatMessages.some((message) => message.role === "ai")
    if (!hasAssistantOutput) return
    setTutorialMetrics((prev) => ({
      ...prev,
      firstOutputAt: prev.firstOutputAt || new Date().toISOString(),
    }))
  }, [chatMessages, tutorialMetrics.firstOutputAt, tutorialState.active])

  const clearDraftState = () => {
    setDraftState(null)
    setDraftMeta(null)
    draftStateRef.current = null
    if (typeof window !== "undefined") {
      localStorage.removeItem(DRAFT_STATE_KEY)
      localStorage.removeItem(DRAFT_HISTORY_KEY)
      localStorage.removeItem(DRAFT_META_KEY)
    }
  }

  const handleDraftUpdate = (nextState: CanvasState, meta: DraftMeta) => {
    setDraftState(nextState)
    setDraftMeta(meta)

    // Keep the main Prompt Canvas in sync with the live draft so the user
    // sees updates immediately without needing a hard refresh.
    localStorage.setItem(CANVAS_STATE_KEY, JSON.stringify(nextState))
    window.dispatchEvent(new Event(CANVAS_STATE_EVENT))
  }

  const chatPreview = useMemo(() => {
    const ai = [...chatMessages].reverse().find((item) => item.role === "ai")?.content
    const user = chatMessages.find((item) => item.role === "user")?.content
    return (ai || user || "No preview").slice(0, 90)
  }, [chatMessages])

  const buildArchiveTitle = (messages: ChatMessage[]) => {
    const firstUser = messages.find((message) => message.role === "user")?.content?.trim()
    if (!firstUser) return "Untitled chat"
    return firstUser.split(/\s+/).slice(0, 6).join(" ")
  }

  const archiveCurrentSession = () => {
    const messages = chatRef.current?.getMessages() ?? []
    if (messages.length === 0) return
    const now = new Date().toISOString()
    const archive: ChatArchive = {
      id: `chat-${Date.now()}`,
      title: buildArchiveTitle(messages),
      createdAt: now,
      updatedAt: now,
      preview: chatPreview,
      messages,
      draftState: cloneCanvasState(draftState),
    }
    setChatArchives((prev) => [archive, ...prev].slice(0, 20))
  }

  const handleNewChat = () => {
    archiveCurrentSession()
    chatRef.current?.clearChat()
    setChatMessages([])
    clearDraftState()
    checkpointMessageIdsRef.current = new Set()
  }

  const startTutorial = () => {
    const now = new Date().toISOString()
    handleNewChat()
    setTutorialState({
      active: true,
      step: 0,
      startedAt: now,
      completedAt: null,
    })
    setTutorialMetrics({
      startedAt: now,
      firstOutputAt: null,
      completedAt: null,
      dropOffStep: null,
    })
    toast({
      title: "Tutorial started",
      description: "Follow the guided steps to ship a Todo MVP in under 15 minutes.",
    })
  }

  const skipTutorial = () => {
    setTutorialMetrics((prev) => ({
      ...prev,
      dropOffStep: tutorialState.step + 1,
    }))
    setTutorialState((prev) => ({ ...prev, active: false }))
  }

  const advanceTutorial = () => {
    setTutorialState((prev) => {
      const nextStep = prev.step + 1
      if (nextStep >= tutorialSteps.length) {
        const doneAt = new Date().toISOString()
        setTutorialMetrics((metrics) => ({
          ...metrics,
          completedAt: doneAt,
          dropOffStep: null,
        }))
        emitTelemetryEvent({
          storageKey: TELEMETRY_STORAGE_KEY,
          eventName: "tutorial_completed",
          metadata: { completed_at: doneAt },
        })
        return {
          ...prev,
          active: false,
          step: tutorialSteps.length - 1,
          completedAt: doneAt,
        }
      }
      return { ...prev, step: nextStep }
    })
  }

  const handleClearChat = () => {
    const confirmed = window.confirm("Clear entire chat history? Draft preview will remain.")
    if (!confirmed) return
    chatRef.current?.clearChat()
    setChatMessages([])
    checkpointMessageIdsRef.current = new Set()
  }

  const restoreChat = (archiveId: string) => {
    const archive = chatArchives.find((entry) => entry.id === archiveId)
    if (!archive) return
    chatRef.current?.loadChat(archive.messages)
    setChatMessages(archive.messages)
    setDraftState(cloneCanvasState(archive.draftState))
    draftStateRef.current = cloneCanvasState(archive.draftState)
    setDraftMeta({
      source: "restore",
      model: "history",
      updatedAt: new Date().toISOString(),
      opsCount: 0,
    })
  }

  const deleteArchive = (archiveId: string) => {
    setChatArchives((prev) => prev.filter((item) => item.id !== archiveId))
  }

  const restoreCheckpoint = (checkpointId: string) => {
    const checkpoint = checkpoints.find((item) => item.id === checkpointId)
    if (!checkpoint) return
    chatRef.current?.loadChat(checkpoint.messages)
    setChatMessages(checkpoint.messages)
    setDraftState(cloneCanvasState(checkpoint.draftState))
    draftStateRef.current = cloneCanvasState(checkpoint.draftState)
    setDraftMeta({
      source: "checkpoint-restore",
      model: "checkpoint",
      updatedAt: new Date().toISOString(),
      opsCount: 0,
    })
  }

  const deleteCheckpoint = (checkpointId: string) => {
    setCheckpoints((prev) => prev.filter((item) => item.id !== checkpointId))
  }

  const maybeCreateCheckpoint = (messages: ChatMessage[]) => {
    const userMessages = messages
      .map((message, index) => ({ message, index }))
      .filter((item) => item.message.role === "user")

    const additions: MessageCheckpoint[] = []
    for (const item of userMessages) {
      if (checkpointMessageIdsRef.current.has(item.message.id)) continue
      checkpointMessageIdsRef.current.add(item.message.id)
      const label = item.message.content.split(/\s+/).slice(0, 7).join(" ")
      additions.push({
        id: `checkpoint-${item.message.id}`,
        messageId: item.message.id,
        label: label || "Checkpoint",
        createdAt: new Date().toISOString(),
        messages: messages.slice(0, item.index + 1),
        draftState: cloneCanvasState(draftStateRef.current),
      })
    }

    if (additions.length > 0) {
      setCheckpoints((prev) => [...additions, ...prev].slice(0, 50))
    }
  }

  const applyToCanvas = async () => {
    if (isExpanding) return
    setIsExpanding(true)
    const raw = localStorage.getItem(CHAT_STORAGE_KEY)
    if (!raw) {
      setIsExpanding(false)
      return
    }

    let parsed: ChatMessage[] = []
    try {
      parsed = JSON.parse(raw) as ChatMessage[]
    } catch {
      setIsExpanding(false)
      return
    }

    if (!Array.isArray(parsed) || parsed.length === 0) {
      setIsExpanding(false)
      return
    }

    try {
      const abortController = new AbortController()
      let timeoutId: number | null = null
      const resp = await (async () => {
        try {
          timeoutId = window.setTimeout(() => abortController.abort(), EXPAND_TIMEOUT_MS)
          return await fetch("/api/familiar/expand", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ messages: parsed }),
            signal: abortController.signal,
          })
        } finally {
          if (timeoutId !== null) window.clearTimeout(timeoutId)
        }
      })()

      const data = await resp.json().catch(() => null as any)
      if (resp.ok && data?.canvas) {
        localStorage.setItem(CANVAS_STATE_KEY, JSON.stringify(data.canvas))
        window.dispatchEvent(new Event(CANVAS_STATE_EVENT))
        const source = data?.source || "llm"
        const model = data?.model || "unknown"
        localStorage.setItem(EXPANSION_SOURCE_KEY, source)
        localStorage.setItem(EXPANSION_MODEL_KEY, model)
        setLastExpansionSource(source)
        setLastExpansionModel(model)
        window.dispatchEvent(new Event(COPILOT_STATUS_EVENT))
        toast({
          title: "Canvas updated",
          description: `Applied with ${source} (${model}).`,
        })
        emitTelemetryEvent({
          storageKey: TELEMETRY_STORAGE_KEY,
          eventName: "expanded_to_canvas",
          metadata: { source, model, fallback: false },
        })
        return
      }

      const fallback = buildCanvasFromChat(parsed)
      localStorage.setItem(CANVAS_STATE_KEY, JSON.stringify(fallback))
      window.dispatchEvent(new Event(CANVAS_STATE_EVENT))
      localStorage.setItem(EXPANSION_SOURCE_KEY, "deterministic")
      localStorage.setItem(EXPANSION_MODEL_KEY, "deterministic")
      setLastExpansionSource("deterministic")
      setLastExpansionModel("deterministic")
      window.dispatchEvent(new Event(COPILOT_STATUS_EVENT))
      toast({
        title: "Expansion fallback",
        description:
          Array.isArray(data?.errors) && data.errors.length > 0
            ? `LLM unavailable (${String(data.errors[0]).slice(0, 120)}). Deterministic canvas generated.`
            : "LLM output unavailable. Deterministic canvas was generated.",
        variant: "destructive",
      })
      emitTelemetryEvent({
        storageKey: TELEMETRY_STORAGE_KEY,
        eventName: "expanded_to_canvas",
        metadata: { source: "deterministic", model: "deterministic", fallback: true },
      })
    } catch (error) {
      const fallback = buildCanvasFromChat(parsed)
      localStorage.setItem(CANVAS_STATE_KEY, JSON.stringify(fallback))
      window.dispatchEvent(new Event(CANVAS_STATE_EVENT))
      localStorage.setItem(EXPANSION_SOURCE_KEY, "deterministic")
      localStorage.setItem(EXPANSION_MODEL_KEY, "deterministic")
      setLastExpansionSource("deterministic")
      setLastExpansionModel("deterministic")
      window.dispatchEvent(new Event(COPILOT_STATUS_EVENT))
      const timedOut = error instanceof DOMException && error.name === "AbortError"
      toast({
        title: timedOut ? "Expansion timeout" : "Expansion failed",
        description: timedOut
          ? `Timed out after ${Math.floor(EXPAND_TIMEOUT_MS / 1000)}s. Deterministic canvas generated.`
          : "Deterministic canvas generated after expansion failure.",
        variant: "destructive",
      })
      emitTelemetryEvent({
        storageKey: TELEMETRY_STORAGE_KEY,
        eventName: "expanded_to_canvas",
        metadata: { source: "deterministic", model: "deterministic", fallback: true, timeout: timedOut },
      })
    } finally {
      setIsExpanding(false)
    }
  }

  const importProjectToCanvas = async () => {
    setImportOpen(true)
  }

  const runImportPreflight = async () => {
    if (!importInput.trim()) {
      setImportError("Import input is required.")
      return
    }
    setImportPreflightLoading(true)
    setImportError(null)
    try {
      const resp = await fetch("/api/familiar/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: importInput, preflight: true }),
      })
      const data = (await resp.json().catch(() => ({}))) as ImportResponse
      if (!resp.ok || !data.preflight) {
        setImportPreview(null)
        setImportError(data?.error || "Unable to validate import input.")
        return
      }
      setImportPreview(data)
    } catch (error) {
      setImportPreview(null)
      setImportError(error instanceof Error ? error.message : "Unable to validate import input.")
    } finally {
      setImportPreflightLoading(false)
    }
  }

  const runImport = async () => {
    if (!importInput.trim()) {
      setImportError("Import input is required.")
      return
    }
    setImportRunLoading(true)
    setImportError(null)
    emitTelemetryEvent({
      storageKey: TELEMETRY_STORAGE_KEY,
      eventName: "import_attempted",
      metadata: { input_length: importInput.length },
    })

    try {
      const resp = await fetch("/api/familiar/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: importInput }),
      })
      const data = (await resp.json().catch(() => ({}))) as ImportResponse
      if (!resp.ok || !data.canvas) {
        setImportError(data?.error || "Unable to generate starter canvas from import input.")
        emitTelemetryEvent({
          storageKey: TELEMETRY_STORAGE_KEY,
          eventName: "import_failed",
          metadata: { reason: data?.error || "import_error" },
        })
        return
      }

      localStorage.setItem(CANVAS_STATE_KEY, JSON.stringify(data.canvas))
      window.dispatchEvent(new Event(CANVAS_STATE_EVENT))
      window.dispatchEvent(new Event(CODE_EXPLORER_SNAPSHOT_EVENT))
      setDraftState(data.canvas)
      draftStateRef.current = data.canvas
      setDraftMeta({
        source: data.source || "deterministic-import",
        model: data.project_name || "import",
        updatedAt: new Date().toISOString(),
        opsCount: data.assignment_preview?.length ?? 0,
      })

      const preview = (data.assignment_preview || [])
        .slice(0, 3)
        .map((item) => `${item.task_label} → ${item.assigned_agent}`)
        .join(", ")

      toast({
        title: "Import mapped to starter canvas",
        description: preview
          ? `${preview}${data.assignment_preview && data.assignment_preview.length > 3 ? "..." : ""}`
          : "Starter task decomposition created.",
      })
      setImportOpen(false)
    } catch {
      setImportError("Unable to import project at this time.")
      emitTelemetryEvent({
        storageKey: TELEMETRY_STORAGE_KEY,
        eventName: "import_failed",
        metadata: { reason: "import_exception" },
      })
    } finally {
      setImportRunLoading(false)
    }
  }

  return (
    <div className="flex h-full w-full flex-col min-h-0">
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import Project</DialogTitle>
            <DialogDescription>
              Paste a Replit project description or export JSON. Run a preflight check before importing.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Textarea
              value={importInput}
              onChange={(event) => {
                const next = event.target.value
                setImportInput(next)
                localStorage.setItem(IMPORT_INPUT_KEY, next)
              }}
              rows={8}
              placeholder="Paste project description or export JSON..."
            />
            {importError ? (
              <div className="text-xs text-red-400">{importError}</div>
            ) : null}
            {importPreview ? (
              <div className="rounded-md border border-slate-800 bg-slate-950/50 p-3 text-xs text-slate-200">
                <div className="font-semibold text-slate-100 mb-1">{importPreview.project_name}</div>
                <div className="text-slate-400 mb-2">{importPreview.summary}</div>
                <div className="text-slate-400">
                  Tasks: {importPreview.tasks_preview?.slice(0, 5).join(", ") || "—"}
                </div>
              </div>
            ) : null}
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={runImportPreflight}
              disabled={importPreflightLoading || importRunLoading}
            >
              {importPreflightLoading ? "Validating..." : "Preflight"}
            </Button>
            <Button
              onClick={runImport}
              disabled={importRunLoading || importPreflightLoading}
            >
              {importRunLoading ? "Importing..." : "Import"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#30333a] shrink-0 bg-[#24262b]/90 backdrop-blur">
        <div />

        <div className="flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0 text-[#d2d7e0] hover:bg-[#2a2c31]"
                aria-label="Select system prompt"
                title={`Prompt: ${resolvedPromptLabel}`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => setSelectedPromptId("auto")}>Auto</DropdownMenuItem>
              {promptOptions.map((prompt) => (
                <DropdownMenuItem
                  key={prompt.id}
                  onSelect={() => setSelectedPromptId(prompt.id)}
                  title={prompt.description}
                >
                  {prompt.name} (v{prompt.version})
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 text-[#d2d7e0] hover:bg-[#2a2c31]"
            onClick={handleClearChat}
            aria-label="Clear chat"
            title="Clear chat"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 text-[#d2d7e0] hover:bg-[#2a2c31]"
            onClick={importProjectToCanvas}
            aria-label="Import project to canvas"
            title="Import project to canvas"
          >
            <Download className="w-3.5 h-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 text-[#d2d7e0]"
            onClick={handleNewChat}
            aria-label="New chat"
            title="New chat"
          >
            <Plus className="w-3.5 h-3.5" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0 text-[#d2d7e0]"
                aria-label="Chat history"
                title="Chat history"
              >
                <HistoryIcon className="w-3.5 h-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 p-2">
              {chatArchives.length === 0 ? (
                <div className="px-2 py-1 text-xs text-muted-foreground">No archived chats</div>
              ) : (
                chatArchives.map((archive) => (
                  <div
                    key={archive.id}
                    className="rounded-md border border-border/70 bg-background/60 px-2 py-2 mb-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-xs font-medium truncate">{archive.title}</div>
                        <div className="text-[10px] text-muted-foreground">{formatDateTime(archive.updatedAt)}</div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px]" onClick={() => restoreChat(archive.id)}>
                          Restore
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 text-rose-400 hover:text-rose-300"
                          onClick={() => deleteArchive(archive.id)}
                          aria-label="Delete archive"
                          title="Delete archive"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                    <div className="mt-1 text-[10px] text-muted-foreground line-clamp-2">{archive.preview}</div>
                  </div>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0 text-[#d2d7e0]"
                aria-label="Message checkpoints"
                title="Message checkpoints"
              >
                <Bookmark className="w-3.5 h-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 p-2">
              {checkpoints.length === 0 ? (
                <div className="px-2 py-1 text-xs text-muted-foreground">No checkpoints yet</div>
              ) : (
                checkpoints.map((checkpoint) => (
                  <div
                    key={checkpoint.id}
                    className="rounded-md border border-border/70 bg-background/60 px-2 py-2 mb-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-xs font-medium truncate">{checkpoint.label}</div>
                        <div className="text-[10px] text-muted-foreground">{formatDateTime(checkpoint.createdAt)}</div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px]" onClick={() => restoreCheckpoint(checkpoint.id)}>
                          Restore
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 text-rose-400 hover:text-rose-300"
                          onClick={() => deleteCheckpoint(checkpoint.id)}
                          aria-label="Delete checkpoint"
                          title="Delete checkpoint"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            size="sm"
            className="h-7 text-xs bg-[#34d9cb] text-[#0c2d2b] hover:bg-[#2fc6b9]"
            onClick={applyToCanvas}
            disabled={isExpanding}
          >
            {isExpanding ? "Expanding..." : "Apply to Canvas"}
          </Button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0 flex-col">
        <div className="px-3 py-2 border-b border-[#30333a] bg-[#1f2126]/80">
          <div className="flex items-start justify-between gap-3 rounded-md border border-border/70 bg-background/40 p-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs font-medium text-foreground">
                <GraduationCap className="h-3.5 w-3.5" />
                Onboarding Tutorial ({tutorialState.step + 1}/{tutorialSteps.length})
              </div>
              <div className="mt-1 text-sm text-foreground">{tutorialSteps[tutorialState.step].title}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                {tutorialSteps[tutorialState.step].detail}
              </div>
              <div className="mt-2 text-[11px] text-muted-foreground">
                Target: complete in under 15 minutes. first_output_at:{" "}
                {tutorialMetrics.firstOutputAt ? formatDateTime(tutorialMetrics.firstOutputAt) : "pending"}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {!tutorialState.active ? (
                <Button size="sm" className="h-7 text-xs" onClick={startTutorial}>
                  Start
                </Button>
              ) : (
                <>
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={skipTutorial}>
                    Skip
                  </Button>
                  <Button size="sm" className="h-7 text-xs" onClick={advanceTutorial}>
                    {tutorialState.step === tutorialSteps.length - 1 ? "Complete" : "Next"}
                  </Button>
                </>
              )}
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={startTutorial}>
                Restart
              </Button>
            </div>
          </div>
        </div>

        <div className="flex-1 min-h-0">
          <ConsoleChat
            ref={chatRef}
            storageKey={CHAT_STORAGE_KEY}
            showHeader={false}
            fontScale={fontScale}
            messageStyle={messageStyle}
            enableAssistant
            enableDraft
            draftState={draftState}
            onDraftStateChange={handleDraftUpdate}
            chatPromptId={selectedPromptId}
            onPromptResolved={(prompt) => {
              setResolvedPrompt(prompt)
              localStorage.setItem(
                "aei.copilot.resolvedPromptLabel",
                `${prompt.name} v${prompt.version} (${prompt.mode})`
              )
              window.dispatchEvent(new Event(COPILOT_STATUS_EVENT))
            }}
            onMessagesChange={(messages) => {
              setChatMessages(messages)
              maybeCreateCheckpoint(messages)
            }}
            seedMessages={[]}
          />
        </div>
      </div>
    </div>
  )
}
