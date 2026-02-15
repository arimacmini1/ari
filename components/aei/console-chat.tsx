"use client"

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react"
import { Send, Terminal, Bot, User, Sparkles, ArrowDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { applyOperations, type CollabOperation, type CollabVersions } from "@/lib/canvas-collab"
import { createInitialCanvasState, type CanvasState } from "@/lib/canvas-state"
import { emitTelemetryEvent } from "@/lib/telemetry-client"

const TELEMETRY_STORAGE_KEY = "aei.familiar.chat"

export interface ChatMessage {
  id: string
  role: "user" | "ai" | "system"
  content: string
  timestamp: string
}

interface DraftMeta {
  source: string
  model?: string
  updatedAt: string
  opsCount: number
}

export interface DraftStatus {
  state: "idle" | "loading" | "error"
  message?: string
}

export interface PromptResolution {
  id: string
  name: string
  version: number
  mode: "auto" | "manual"
  reason?: string
}

const defaultSeedMessages: ChatMessage[] = [
  {
    id: "1",
    role: "system",
    content: "Session initialized. Orchestrator connected with 6 agents.",
    timestamp: "14:02",
  },
  {
    id: "2",
    role: "user",
    content: "Build a real-time analytics dashboard with auth, REST API, and Postgres integration.",
    timestamp: "14:03",
  },
  {
    id: "3",
    role: "ai",
    content:
      "Parsed 4 task blocks. Dispatching to code-gen-alpha (architecture), test-runner-01 (test harness), and security-scan (compliance). Estimated completion: 12 minutes.",
    timestamp: "14:03",
  },
  {
    id: "4",
    role: "system",
    content: "code-gen-alpha: Architecture plan generated. Confidence: 89%. Proceeding to implementation.",
    timestamp: "14:05",
  },
]

export interface ConsoleChatHandle {
  requestDraftUpdate: () => void
  clearChat: () => void
  getMessages: () => ChatMessage[]
  loadChat: (messages: ChatMessage[]) => void
}

interface ConsoleChatProps {
  storageKey?: string
  showHeader?: boolean
  className?: string
  fontScale?: "normal" | "small" | "xsmall"
  messageStyle?: "detailed" | "plain"
  enableAssistant?: boolean
  enableDraft?: boolean
  draftState?: CanvasState | null
  onDraftStateChange?: (state: CanvasState, meta: DraftMeta) => void
  onDraftStatusChange?: (status: DraftStatus) => void
  onMessagesChange?: (messages: ChatMessage[]) => void
  chatPromptId?: string | null
  onPromptResolved?: (prompt: PromptResolution) => void
  seedMessages?: ChatMessage[]
}

function formatTimestamp(date: Date) {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

function validateDraftOps(ops: unknown): ops is CollabOperation[] {
  if (!Array.isArray(ops)) return false
  return ops.every((op) => {
    if (!op || typeof op !== "object") return false
    if (typeof op.type !== "string" || typeof op.id !== "string") return false
    if (op.type.startsWith("node") && !op.node && !op.targetId) return false
    if (op.type.startsWith("edge") && !op.edge && !op.targetId) return false
    return true
  })
}

export const ConsoleChat = forwardRef<ConsoleChatHandle, ConsoleChatProps>(function ConsoleChat(
  {
    storageKey = "aei.familiar.chat",
    showHeader = true,
    className,
    fontScale = "normal",
    messageStyle = "detailed",
    enableAssistant = false,
    enableDraft = false,
    draftState,
    onDraftStateChange,
    onDraftStatusChange,
    onMessagesChange,
    chatPromptId,
    onPromptResolved,
    seedMessages = defaultSeedMessages,
  },
  ref
) {
  const fontClass =
    fontScale === "xsmall" ? "text-[11px]" : fontScale === "small" ? "text-xs" : "text-sm"
  const labelFontClass = fontScale === "xsmall" ? "text-[10px]" : "text-[10px]"
  const draftKey = `${storageKey}.draft`
  const scrollAreaRef = useRef<HTMLDivElement | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (typeof window === "undefined") return seedMessages
    const stored = localStorage.getItem(storageKey)
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as ChatMessage[]
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed
        }
      } catch {}
    }
    return seedMessages
  })
  const [input, setInput] = useState(() => {
    if (typeof window === "undefined") return ""
    return localStorage.getItem(draftKey) ?? ""
  })
  const [isSending, setIsSending] = useState(false)
  const [draftStatus, setDraftStatus] = useState<DraftStatus>({ state: "idle" })
  const [autoScrollPaused, setAutoScrollPaused] = useState(false)
  const [showScrollToBottom, setShowScrollToBottom] = useState(false)
  const lastDraftUserCountRef = useRef(0)
  const versionsRef = useRef<CollabVersions>({
    nodeTs: new Map(),
    edgeTs: new Map(),
    nodeClock: new Map(),
    edgeClock: new Map(),
  })
  const draftStateRef = useRef<CanvasState | null>(draftState ?? null)
  const sessionStartedRef = useRef(false)
  const emitTelemetry = useCallback(
    async (eventName: string, metadata?: Record<string, unknown>) => {
      await emitTelemetryEvent({
        storageKey: storageKey || TELEMETRY_STORAGE_KEY,
        eventName,
        metadata,
      })
    },
    [storageKey]
  )

  useEffect(() => {
    draftStateRef.current = draftState ?? null
  }, [draftState])

  useEffect(() => {
    if (!storageKey) return
    localStorage.setItem(storageKey, JSON.stringify(messages))
  }, [messages, storageKey])

  useEffect(() => {
    onMessagesChange?.(messages)
  }, [messages, onMessagesChange])

  useEffect(() => {
    if (!storageKey) return
    localStorage.setItem(draftKey, input)
  }, [draftKey, input, storageKey])

  useEffect(() => {
    onDraftStatusChange?.(draftStatus)
  }, [draftStatus, onDraftStatusChange])

  const messageCount = useMemo(() => messages.length, [messages.length])
  const isNearBottom = useCallback((el: HTMLDivElement) => {
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    return distanceFromBottom <= 120
  }, [])

  const scrollToBottom = useCallback((behavior: ScrollBehavior) => {
    const el = scrollAreaRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior })
  }, [])

  const requestDraftUpdate = async (messagesForDraft: ChatMessage[]) => {
    if (!enableDraft || !onDraftStateChange) return
    if (draftStatus.state === "loading") return
    setDraftStatus({ state: "loading" })
    try {
      const resp = await fetch("/api/familiar/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: messagesForDraft.map((m) => ({ role: m.role, content: m.content })),
          draft: draftStateRef.current,
        }),
      })
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}))
        const message = err?.error || "Draft update failed."
        setDraftStatus({ state: "error", message })
        return
      }
      const data = await resp.json()
      const ops = data?.ops as CollabOperation[] | undefined
      if (!validateDraftOps(ops)) {
        setDraftStatus({ state: "error", message: "Draft patch validation failed." })
        return
      }
      const baseDraft = draftStateRef.current ?? createInitialCanvasState()
      const nextDraft = applyOperations(baseDraft, ops, versionsRef.current)
      const draftSource = data?.source || "deterministic"
      const draftModel = typeof data?.model === "string" ? data.model : undefined
      onDraftStateChange(nextDraft, {
        source: draftSource,
        model: draftModel,
        updatedAt: new Date().toISOString(),
        opsCount: ops.length,
      })
      emitTelemetry("draft_generated", {
        source: draftSource,
        model: draftModel,
        ops_count: ops.length,
      })
      setDraftStatus({ state: "idle" })
    } catch (error) {
      setDraftStatus({
        state: "error",
        message: error instanceof Error ? error.message : "Draft update failed.",
      })
    }
  }

  useImperativeHandle(ref, () => ({
    requestDraftUpdate: () => requestDraftUpdate(messages),
    clearChat: () => {
      setMessages([])
      setInput("")
      if (typeof window !== "undefined" && storageKey) {
        localStorage.removeItem(storageKey)
        localStorage.removeItem(draftKey)
      }
    },
    getMessages: () => messages,
    loadChat: (nextMessages: ChatMessage[]) => {
      setMessages(nextMessages)
      setInput("")
      lastDraftUserCountRef.current = 0
      versionsRef.current = {
        nodeTs: new Map(),
        edgeTs: new Map(),
        nodeClock: new Map(),
        edgeClock: new Map(),
      }
    },
  }))

  useEffect(() => {
    if (autoScrollPaused) return
    scrollToBottom("auto")
    setShowScrollToBottom(false)
  }, [messages, autoScrollPaused, scrollToBottom])

  useEffect(() => {
    scrollToBottom("auto")
  }, [scrollToBottom])

  const maybeAutoDraft = async (nextMessages: ChatMessage[]) => {
    if (!enableDraft) return
    const userCount = nextMessages.filter((msg) => msg.role === "user").length
    const autoEvery = 3
    if (userCount < autoEvery) return
    if (userCount % autoEvery !== 0) return
    if (lastDraftUserCountRef.current === userCount) return
    lastDraftUserCountRef.current = userCount
    await requestDraftUpdate(nextMessages)
  }

  const handleSend = async () => {
    if (isSending) return
    const trimmed = input.trim()
    if (!trimmed) return
    const timestamp = formatTimestamp(new Date())
    const userMessage: ChatMessage = {
      id: String(messages.length + 1),
      role: "user",
      content: trimmed,
      timestamp,
    }
    const nextMessages = [...messages, userMessage]
    setMessages(nextMessages)
    setInput("")
    if (!sessionStartedRef.current) {
      sessionStartedRef.current = true
      emitTelemetry("session_started", {
        prompt_id: chatPromptId ?? "auto",
        message_count: nextMessages.length,
      })
    }

    if (!enableAssistant) {
      await maybeAutoDraft(nextMessages)
      return
    }
    setIsSending(true)
    try {
      const resp = await fetch("/api/familiar/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
          promptId: chatPromptId ?? "auto",
        }),
      })
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}))
        const content = err?.error || "LLM request failed."
        setMessages((prev) => [
          ...prev,
          {
            id: String(prev.length + 1),
            role: "system",
            content,
            timestamp: formatTimestamp(new Date()),
          },
        ])
        await maybeAutoDraft(nextMessages)
        setIsSending(false)
        return
      }
      const data = await resp.json()
      if (data?.prompt?.id && data?.prompt?.name) {
        onPromptResolved?.({
          id: data.prompt.id,
          name: data.prompt.name,
          version: Number(data.prompt.version ?? 1),
          mode: data.prompt.mode === "manual" ? "manual" : "auto",
          reason: typeof data.prompt.reason === "string" ? data.prompt.reason : undefined,
        })
      }
      const reply = typeof data?.reply === "string" ? data.reply : null
      if (reply) {
        const assistantMessage: ChatMessage = {
          id: String(nextMessages.length + 1),
          role: "ai",
          content: reply,
          timestamp: formatTimestamp(new Date()),
        }
        const updated = [...nextMessages, assistantMessage]
        setMessages(updated)
        emitTelemetry("assistant_response", {
          prompt_id: chatPromptId ?? "auto",
          message_count: updated.length,
        })
        await maybeAutoDraft(updated)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "LLM request failed."
      setMessages((prev) => [
        ...prev,
        {
          id: String(prev.length + 1),
          role: "system",
          content: message,
          timestamp: formatTimestamp(new Date()),
        },
      ])
      await maybeAutoDraft(nextMessages)
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div
      className={cn(
        "flex flex-col h-full",
        messageStyle === "plain" && "bg-[#1f2023] text-[#d7d7d9]",
        className
      )}
    >
      {showHeader ? (
        <div className="flex items-center gap-3 px-6 py-3 border-b border-border shrink-0">
          <Terminal className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Console</h3>
          <div className="flex items-center gap-1.5 ml-auto">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-muted-foreground">Live</span>
          </div>
        </div>
      ) : null}

      <div className="relative flex-1 min-h-0">
        <div
          ref={scrollAreaRef}
          onScroll={() => {
            const el = scrollAreaRef.current
            if (!el) return
            const nearBottom = isNearBottom(el)
            if (!nearBottom && !autoScrollPaused) {
              setAutoScrollPaused(true)
            }
            setShowScrollToBottom(!nearBottom)
          }}
          className={cn(
            "h-full overflow-y-auto py-4 flex flex-col gap-3",
            messageStyle === "plain" ? "px-1.5 gap-2" : "px-6"
          )}
        >
          {messageCount === 0 ? (
            <div className={cn(fontScale === "normal" ? "text-xs" : "text-[11px]", "text-muted-foreground")}>
              Start by describing what you want the agents to build.
            </div>
          ) : null}
          {messages.map((msg) => (
          messageStyle === "plain" ? (
            <div
              key={msg.id}
              className={cn(
                "flex",
                msg.role === "user" ? "justify-end pr-1" : "justify-start pl-0.5"
              )}
            >
              <div className={cn(msg.role === "ai" && "px-2 w-full")}>
              <div
                className={cn(
                  "rounded-lg px-3 py-2 leading-relaxed border",
                  msg.role === "ai" ? "max-w-[99%]" : "max-w-[92%]",
                  fontClass,
                  msg.role === "user" && "bg-[#2a2c31] border-[rgba(40,223,202,0.35)] text-[#e4e5e7]",
                  msg.role === "ai" && "bg-[#26282d] border-[#3a3d44] text-[#d7d7d9]",
                  msg.role === "system" && "bg-[#24262a] border-[#373a40] text-[#a7abb3] italic"
                )}
              >
                <div className={cn("mb-0.5 uppercase tracking-wide text-[#9ea2ab]", labelFontClass)}>
                  {msg.role === "user" ? "You" : msg.role === "ai" ? "AI Copilot" : "System"}
                </div>
                <p className={cn("whitespace-pre-wrap break-words", msg.role === "user" && "pl-1")}>
                  {msg.content}
                </p>
              </div>
              </div>
            </div>
          ) : (
            <div
              key={msg.id}
              className={cn(
                "flex items-start gap-3 leading-relaxed",
                fontClass,
                msg.role === "system" && "text-muted-foreground italic"
              )}
            >
              <div className="shrink-0 mt-0.5">
                {msg.role === "user" && (
                  <div className="w-6 h-6 rounded-md bg-primary/20 flex items-center justify-center">
                    <User className="w-3.5 h-3.5 text-primary" />
                  </div>
                )}
                {msg.role === "ai" && (
                  <div className="w-6 h-6 rounded-md bg-primary/20 flex items-center justify-center">
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                  </div>
                )}
                {msg.role === "system" && (
                  <div className="w-6 h-6 rounded-md bg-secondary flex items-center justify-center">
                    <Bot className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <span
                  className={cn(
                    "font-mono whitespace-pre-wrap break-words",
                    fontClass,
                    msg.role === "user" && "text-foreground",
                    msg.role === "ai" && "text-primary",
                    msg.role === "system" && "text-muted-foreground"
                  )}
                >
                  {msg.content}
                </span>
              </div>
              <span className="text-xs font-mono text-muted-foreground shrink-0 mt-0.5">
                {msg.timestamp}
              </span>
            </div>
            )
          ))}
        </div>
        {showScrollToBottom && (
          <Button
            size="sm"
            variant="secondary"
            className="absolute bottom-3 right-3 h-8 px-2.5 text-xs"
            onClick={() => {
              setAutoScrollPaused(false)
              scrollToBottom("smooth")
            }}
          >
            <ArrowDown className="w-3.5 h-3.5 mr-1" />
            Latest
          </Button>
        )}
      </div>

      <div
        className={cn(
          "flex items-center gap-3 px-6 py-3 shrink-0 border-t",
          messageStyle === "plain" ? "border-[#353840]" : "border-border"
        )}
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Query agents or instruct orchestrator..."
          className={cn(
            "flex-1 h-9 placeholder:text-muted-foreground",
            messageStyle === "plain"
              ? "bg-[#2a2c31] border-[#3b3e45] text-[#d7d7d9] placeholder:text-[#8f949e]"
              : "bg-secondary border-border",
            messageStyle === "plain" ? "font-sans" : "font-mono",
            fontClass
          )}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault()
              handleSend()
            }
          }}
        />
        <Button
          size="icon"
          className={cn(
            "h-9 w-9 shrink-0",
            messageStyle === "plain"
              ? "bg-[#3a7df0] text-white hover:bg-[#4a89f5]"
              : "bg-primary text-primary-foreground hover:bg-primary/90"
          )}
          onClick={handleSend}
          disabled={isSending}
        >
          <Send className="w-4 h-4" />
          <span className="sr-only">Send message</span>
        </Button>
      </div>
    </div>
  )
})
