"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  ConsoleChat,
  type ConsoleChatHandle,
  type DraftStatus,
  type ChatMessage,
} from "@/components/aei/console-chat"
import { DraftCanvasPreview } from "@/components/aei/draft-canvas-preview"
import { Sparkles, ArrowRight, RefreshCcw, Undo2, Trash2 } from "lucide-react"
import type { CanvasState } from "@/lib/canvas-state"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const DRAFT_STATE_KEY = "aei.familiar.draft"
const DRAFT_HISTORY_KEY = "aei.familiar.draft.history"
const DRAFT_META_KEY = "aei.familiar.draft.meta"
const CHAT_HISTORY_KEY = "aei.familiar.chats"

interface DraftMeta {
  source: string
  model?: string
  updatedAt: string
  opsCount: number
}

interface ChatArchive {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  messages: ChatMessage[]
  draftState: CanvasState | null
}

interface FamiliarModeProps {
  showGuidance: boolean
  onDismissGuidance: () => void
  onEnterFull: () => void
  lastExpansionSource?: string | null
  lastExpansionModel?: string | null
  isExpanding?: boolean
  expansionNotice?: string | null
}

export function FamiliarMode({
  showGuidance,
  onDismissGuidance,
  onEnterFull,
  lastExpansionSource,
  lastExpansionModel,
  isExpanding = false,
  expansionNotice,
}: FamiliarModeProps) {
  const chatRef = useRef<ConsoleChatHandle | null>(null)
  const draftStateRef = useRef<CanvasState | null>(null)
  const [draftState, setDraftState] = useState<CanvasState | null>(null)
  const [draftHistory, setDraftHistory] = useState<CanvasState[]>([])
  const [draftMeta, setDraftMeta] = useState<DraftMeta | null>(null)
  const [draftStatus, setDraftStatus] = useState<DraftStatus>({ state: "idle" })
  const [chatArchives, setChatArchives] = useState<ChatArchive[]>([])

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
        const parsed = JSON.parse(storedHistory) as CanvasState[]
        if (Array.isArray(parsed)) {
          setDraftHistory(parsed)
        }
      } catch {}
    }
    const storedMeta = localStorage.getItem(DRAFT_META_KEY)
    if (storedMeta) {
      try {
        const parsed = JSON.parse(storedMeta) as DraftMeta
        if (parsed?.updatedAt) {
          setDraftMeta(parsed)
        }
      } catch {}
    }
    const storedArchives = localStorage.getItem(CHAT_HISTORY_KEY)
    if (storedArchives) {
      try {
        const parsed = JSON.parse(storedArchives) as ChatArchive[]
        if (Array.isArray(parsed)) {
          setChatArchives(parsed)
        }
      } catch {}
    }
  }, [])

  useEffect(() => {
    draftStateRef.current = draftState
    if (typeof window === "undefined") return
    if (draftState) {
      localStorage.setItem(DRAFT_STATE_KEY, JSON.stringify(draftState))
    }
    localStorage.setItem(DRAFT_HISTORY_KEY, JSON.stringify(draftHistory))
    if (draftMeta) {
      localStorage.setItem(DRAFT_META_KEY, JSON.stringify(draftMeta))
    }
    localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(chatArchives))
  }, [chatArchives, draftHistory, draftMeta, draftState])

  const handleDraftUpdate = (nextState: CanvasState, meta: DraftMeta) => {
    const current = draftStateRef.current
    if (current && meta.opsCount > 0) {
      setDraftHistory((prev) => [...prev, current].slice(-5))
    }
    setDraftState(nextState)
    setDraftMeta(meta)
  }

  const handleUndoDraft = () => {
    setDraftHistory((prev) => {
      if (prev.length === 0) return prev
      const next = [...prev]
      const last = next.pop() ?? null
      if (last) {
        setDraftState(last)
        setDraftMeta((current) =>
          current ? { ...current, source: "undo", updatedAt: new Date().toISOString() } : null
        )
      }
      return next
    })
  }

  const handleManualDraft = () => {
    chatRef.current?.requestDraftUpdate()
  }

  const handleClearChat = () => {
    const confirmed = window.confirm("Clear entire chat history? Draft preview will remain.")
    if (!confirmed) return
    chatRef.current?.clearChat()
  }

  const clearDraftState = () => {
    setDraftState(null)
    setDraftHistory([])
    setDraftMeta(null)
    draftStateRef.current = null
    if (typeof window !== "undefined") {
      localStorage.removeItem(DRAFT_STATE_KEY)
      localStorage.removeItem(DRAFT_HISTORY_KEY)
      localStorage.removeItem(DRAFT_META_KEY)
    }
  }

  const handleResetDraft = () => {
    const confirmed = window.confirm("Reset draft canvas preview? This does not delete your chat.")
    if (!confirmed) return
    clearDraftState()
  }

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
      messages,
      draftState,
    }
    setChatArchives((prev) => [archive, ...prev].slice(0, 20))
  }

  const handleNewChat = () => {
    archiveCurrentSession()
    chatRef.current?.clearChat()
    clearDraftState()
  }

  const restoreChat = (archiveId: string) => {
    const archive = chatArchives.find((entry) => entry.id === archiveId)
    if (!archive) return
    chatRef.current?.loadChat(archive.messages)
    setDraftState(archive.draftState)
    draftStateRef.current = archive.draftState
    setDraftHistory([])
    setDraftMeta({
      source: "restore",
      model: "history",
      updatedAt: new Date().toISOString(),
      opsCount: 0,
    })
  }

  const draftUpdatedLabel = draftMeta?.updatedAt
    ? new Date(draftMeta.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : null
  const draftModelLabel = draftMeta?.model ? ` - ${draftMeta.model}` : ""

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-5xl px-6 py-8 flex flex-col gap-6">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-widest text-muted-foreground">Familiar Mode</div>
              <h1 className="text-lg font-semibold">AEI Chat-First Workspace</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {lastExpansionSource ? (
              <span className="text-xs text-muted-foreground">
                Last expansion:{" "}
                <span className="font-semibold text-foreground">
                  {lastExpansionSource}
                  {lastExpansionModel ? ` - ${lastExpansionModel}` : ""}
                </span>
              </span>
            ) : null}
            <Button variant="outline" onClick={handleClearChat} className="gap-2">
              Clear Chat
              <Trash2 className="w-4 h-4" />
            </Button>
            <Button variant="outline" onClick={handleNewChat}>
              New Chat
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">History</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {chatArchives.length === 0 ? (
                  <DropdownMenuItem disabled>No archived chats</DropdownMenuItem>
                ) : (
                  chatArchives.map((archive) => (
                    <DropdownMenuItem key={archive.id} onSelect={() => restoreChat(archive.id)}>
                      {archive.title}
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button onClick={onEnterFull} className="gap-2" disabled={isExpanding}>
              {isExpanding ? "Expanding..." : "Open Full Workspace"}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </header>

        {expansionNotice ? (
          <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
            {expansionNotice}
          </div>
        ) : null}

        {showGuidance ? (
          <div className="rounded-lg border border-border bg-secondary/30 p-4 text-sm text-muted-foreground">
            <div className="font-semibold text-foreground">First time here?</div>
            <p className="mt-1">
              Start by describing your project in chat. When you&apos;re ready, switch to the full
              workspace to see the Prompt Canvas, Agents, and Orchestrator in action. Your chat
              context stays with you.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <Button variant="secondary" onClick={onDismissGuidance}>
                Got it
              </Button>
              <Button variant="outline" onClick={onEnterFull} disabled={isExpanding}>
                {isExpanding ? "Expanding..." : "Show me the full workspace"}
              </Button>
            </div>
          </div>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] h-[68vh]">
          <div className="rounded-xl border border-border bg-card/40 overflow-hidden">
            <ConsoleChat
              ref={chatRef}
              storageKey="aei.familiar.chat"
              showHeader={false}
              enableAssistant
              enableDraft
              draftState={draftState}
              onDraftStateChange={handleDraftUpdate}
              onDraftStatusChange={setDraftStatus}
              seedMessages={[]}
            />
          </div>
          <div className="rounded-xl border border-border bg-card/40 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border text-sm">
              <div>
                <div className="font-semibold text-foreground">Draft canvas</div>
                <div className="text-xs text-muted-foreground">
                  {draftUpdatedLabel
                    ? `Updated ${draftUpdatedLabel} via ${draftMeta?.source ?? "llm"}${draftModelLabel} (${draftMeta?.opsCount ?? 0} ops)`
                    : "Updates after 3 user turns"}
                  {draftStatus.state === "loading" ? " - Updating..." : null}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleManualDraft}>
                  <RefreshCcw className="w-3 h-3 mr-1" />
                  Update
                </Button>
                <Button variant="outline" size="sm" onClick={handleResetDraft}>
                  Reset
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleUndoDraft}
                  disabled={draftHistory.length === 0}
                >
                  <Undo2 className="w-3 h-3 mr-1" />
                  Undo
                </Button>
              </div>
            </div>
            {draftState ? (
              <DraftCanvasPreview state={draftState} className="flex-1" />
            ) : (
              <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground px-6 text-center">
                Draft preview will appear after a few chat turns. You can also click Update to
                generate a draft anytime.
              </div>
            )}
            {draftStatus.state === "error" ? (
              <div className="px-4 py-2 text-xs text-rose-500 border-t border-border">
                Draft update failed: {draftStatus.message ?? "Try again."}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
