"use client"

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react"
import { Send, Terminal, Bot, User, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { applyOperations, type CollabOperation, type CollabVersions } from "@/lib/canvas-collab"
import { createInitialCanvasState, type CanvasState } from "@/lib/canvas-state"

interface Message {
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

const defaultSeedMessages: Message[] = [
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
}

interface ConsoleChatProps {
  storageKey?: string
  showHeader?: boolean
  className?: string
  enableAssistant?: boolean
  enableDraft?: boolean
  draftState?: CanvasState | null
  onDraftStateChange?: (state: CanvasState, meta: DraftMeta) => void
  onDraftStatusChange?: (status: DraftStatus) => void
  seedMessages?: Message[]
}

function formatTimestamp(date: Date) {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

function validateDraftOps(ops: CollabOperation[] | null | undefined) {
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
    enableAssistant = false,
    enableDraft = false,
    draftState,
    onDraftStateChange,
    onDraftStatusChange,
    seedMessages = defaultSeedMessages,
  },
  ref
) {
  const draftKey = `${storageKey}.draft`
  const [messages, setMessages] = useState<Message[]>(() => {
    if (typeof window === "undefined") return seedMessages
    const stored = localStorage.getItem(storageKey)
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as Message[]
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
  const lastDraftUserCountRef = useRef(0)
  const versionsRef = useRef<CollabVersions>({ nodeTs: new Map(), edgeTs: new Map() })
  const draftStateRef = useRef<CanvasState | null>(draftState ?? null)

  useEffect(() => {
    draftStateRef.current = draftState ?? null
  }, [draftState])

  useEffect(() => {
    if (!storageKey) return
    localStorage.setItem(storageKey, JSON.stringify(messages))
  }, [messages, storageKey])

  useEffect(() => {
    if (!storageKey) return
    localStorage.setItem(draftKey, input)
  }, [draftKey, input, storageKey])

  useEffect(() => {
    onDraftStatusChange?.(draftStatus)
  }, [draftStatus, onDraftStatusChange])

  const messageCount = useMemo(() => messages.length, [messages.length])

  const requestDraftUpdate = async (messagesForDraft: Message[]) => {
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
      onDraftStateChange(nextDraft, {
        source: data?.source || "deterministic",
        model: typeof data?.model === "string" ? data.model : undefined,
        updatedAt: new Date().toISOString(),
        opsCount: ops.length,
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
  }))

  const maybeAutoDraft = async (nextMessages: Message[]) => {
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
    const userMessage: Message = {
      id: String(messages.length + 1),
      role: "user",
      content: trimmed,
      timestamp,
    }
    const nextMessages = [...messages, userMessage]
    setMessages(nextMessages)
    setInput("")

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
      const reply = typeof data?.reply === "string" ? data.reply : null
      if (reply) {
        const assistantMessage: Message = {
          id: String(nextMessages.length + 1),
          role: "ai",
          content: reply,
          timestamp: formatTimestamp(new Date()),
        }
        const updated = [...nextMessages, assistantMessage]
        setMessages(updated)
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
    <div className={cn("flex flex-col h-full", className)}>
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

      <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-3">
        {messageCount === 0 ? (
          <div className="text-xs text-muted-foreground">
            Start by describing what you want the agents to build.
          </div>
        ) : null}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              "flex items-start gap-3 text-sm leading-relaxed",
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
                  "font-mono text-sm",
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
        ))}
      </div>

      <div className="flex items-center gap-3 px-6 py-3 border-t border-border shrink-0">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Query agents or instruct orchestrator..."
          className="flex-1 h-9 text-sm bg-secondary border-border font-mono placeholder:text-muted-foreground"
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault()
              handleSend()
            }
          }}
          disabled={isSending}
        />
        <Button
          size="icon"
          className="h-9 w-9 bg-primary text-primary-foreground hover:bg-primary/90 shrink-0"
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
