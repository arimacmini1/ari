"use client"

import { useCallback, useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from "react"
import { Header } from "@/components/aei/header"
import { Sidebar } from "@/components/aei/sidebar"
import { MainWorkspace } from "@/components/aei/main-workspace"
import { CopilotWorkbench } from "@/components/aei/copilot-workbench"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { PanelRightClose, Bot, Settings, MessageSquare, Sun, Moon } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"

const COPILOT_OPEN_KEY = "aei.copilot.open"
const COPILOT_WIDTH_KEY = "aei.copilot.width"
const COPILOT_FONT_KEY = "aei.copilot.font"
const COPILOT_PROMPT_ID_KEY = "aei.copilot.promptId"
const COPILOT_RESOLVED_PROMPT_LABEL_KEY = "aei.copilot.resolvedPromptLabel"
const COPILOT_EXPANSION_SOURCE_KEY = "aei.familiar.expansionSource"
const COPILOT_EXPANSION_MODEL_KEY = "aei.familiar.expansionModel"
const COPILOT_STATUS_EVENT = "aei:copilot-status"
const COPILOT_DEFAULT_WIDTH = 384
const COPILOT_MIN_WIDTH = 320
const COPILOT_MAX_WIDTH = 720
const COMMENTS_VISIBLE_KEY = "aei.canvas.comments.visible"
const COMMENTS_VISIBILITY_EVENT = "aei:comments-visibility"
const SET_COMMENTS_VISIBILITY_EVENT = "aei:set-comments-panel"
const COLLAB_ACTIVITY_EVENT = "aei-collab-activity"
const IDENTITY_APPLY_KEY = "aei.test.identity.applied"

export default function Page() {
  const showCopilotRail = true
  const showCopilotPanel = true
  const [copilotOpen, setCopilotOpen] = useState(false)
  const [commentsVisible, setCommentsVisible] = useState(true)
  const [commentsAttention, setCommentsAttention] = useState(false)
  const [copilotWidth, setCopilotWidth] = useState(COPILOT_DEFAULT_WIDTH)
  const [copilotFont, setCopilotFont] = useState<"xsmall" | "small" | "normal">("small")
  const [copilotLastApplySource, setCopilotLastApplySource] = useState<string | null>(null)
  const [copilotLastApplyModel, setCopilotLastApplyModel] = useState<string | null>(null)
  const [copilotPromptChip, setCopilotPromptChip] = useState<string>("Auto")
  const resizeStartXRef = useRef(0)
  const resizeStartWidthRef = useRef(COPILOT_DEFAULT_WIDTH)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const userId = params.get("aei_user")?.trim() || ""
    const name = params.get("aei_name")?.trim() || ""
    if (!userId && !name) return

    const signature = `${userId}:${name}`
    const applied = sessionStorage.getItem(IDENTITY_APPLY_KEY)
    if (applied === signature) return

    if (userId) {
      sessionStorage.setItem("aei-user", userId)
      sessionStorage.setItem("aei.userId", userId)
      localStorage.removeItem("aei-user")
      localStorage.removeItem("aei.userId")
    }
    if (name) {
      sessionStorage.setItem("aei-collab-name", name)
      localStorage.removeItem("aei-collab-name")
    }
    sessionStorage.setItem(IDENTITY_APPLY_KEY, signature)

    const nextUrl = new URL(window.location.href)
    nextUrl.searchParams.delete("aei_user")
    nextUrl.searchParams.delete("aei_name")
    window.location.replace(nextUrl.toString())
  }, [])

  useEffect(() => {
    const storedCopilotOpen = localStorage.getItem(COPILOT_OPEN_KEY)
    setCopilotOpen(storedCopilotOpen === "true")
    const storedCommentsVisible = localStorage.getItem(COMMENTS_VISIBLE_KEY)
    setCommentsVisible(storedCommentsVisible !== "false")

    const storedCopilotWidth = localStorage.getItem(COPILOT_WIDTH_KEY)
    const parsedWidth = storedCopilotWidth ? Number.parseInt(storedCopilotWidth, 10) : NaN
    if (!Number.isNaN(parsedWidth)) {
      setCopilotWidth(Math.min(COPILOT_MAX_WIDTH, Math.max(COPILOT_MIN_WIDTH, parsedWidth)))
    }

    const storedCopilotFont = localStorage.getItem(COPILOT_FONT_KEY)
    if (storedCopilotFont === "xsmall" || storedCopilotFont === "small" || storedCopilotFont === "normal") {
      setCopilotFont(storedCopilotFont)
    }
  }, [])

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ visible: boolean }>).detail
      if (!detail || typeof detail.visible !== "boolean") return
      setCommentsVisible(detail.visible)
    }
    window.addEventListener(COMMENTS_VISIBILITY_EVENT, handler as EventListener)
    return () => window.removeEventListener(COMMENTS_VISIBILITY_EVENT, handler as EventListener)
  }, [])

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ count: number }>).detail
      if (!detail || typeof detail.count !== "number" || detail.count <= 0) return
      setCommentsAttention((prev) => (commentsVisible ? prev : true))
    }
    window.addEventListener(COLLAB_ACTIVITY_EVENT, handler as EventListener)
    return () => window.removeEventListener(COLLAB_ACTIVITY_EVENT, handler as EventListener)
  }, [commentsVisible])

  useEffect(() => {
    if (commentsVisible) {
      setCommentsAttention(false)
    }
  }, [commentsVisible])

  useEffect(() => {
    const readStatus = () => {
      const source = localStorage.getItem(COPILOT_EXPANSION_SOURCE_KEY)
      const model = localStorage.getItem(COPILOT_EXPANSION_MODEL_KEY)
      setCopilotLastApplySource(source)
      setCopilotLastApplyModel(model)

      const promptId = localStorage.getItem(COPILOT_PROMPT_ID_KEY) || "auto"
      if (promptId === "auto") {
        setCopilotPromptChip("Auto")
        return
      }

      const resolvedLabel = localStorage.getItem(COPILOT_RESOLVED_PROMPT_LABEL_KEY) || ""
      const resolvedName = resolvedLabel.split(" v")[0]?.trim()
      setCopilotPromptChip(resolvedName || promptId)
    }

    readStatus()
    const handleStorage = (event: StorageEvent) => {
      if (
        event.key === COPILOT_EXPANSION_SOURCE_KEY ||
        event.key === COPILOT_EXPANSION_MODEL_KEY ||
        event.key === COPILOT_PROMPT_ID_KEY ||
        event.key === COPILOT_RESOLVED_PROMPT_LABEL_KEY
      ) {
        readStatus()
      }
    }
    const handleStatusEvent = () => readStatus()

    window.addEventListener("storage", handleStorage)
    window.addEventListener(COPILOT_STATUS_EVENT, handleStatusEvent)
    return () => {
      window.removeEventListener("storage", handleStorage)
      window.removeEventListener(COPILOT_STATUS_EVENT, handleStatusEvent)
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(COPILOT_OPEN_KEY, copilotOpen ? "true" : "false")
  }, [copilotOpen])

  useEffect(() => {
    localStorage.setItem(COPILOT_WIDTH_KEY, String(copilotWidth))
  }, [copilotWidth])

  useEffect(() => {
    localStorage.setItem(COPILOT_FONT_KEY, copilotFont)
  }, [copilotFont])

  const startCopilotResize = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      event.preventDefault()
      resizeStartXRef.current = event.clientX
      resizeStartWidthRef.current = copilotWidth
      document.body.style.cursor = "ew-resize"
      document.body.style.userSelect = "none"

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const delta = resizeStartXRef.current - moveEvent.clientX
        const nextWidth = Math.min(
          COPILOT_MAX_WIDTH,
          Math.max(COPILOT_MIN_WIDTH, resizeStartWidthRef.current + delta)
        )
        setCopilotWidth(nextWidth)
      }

      const handleMouseUp = () => {
        document.body.style.cursor = ""
        document.body.style.userSelect = ""
        window.removeEventListener("mousemove", handleMouseMove)
        window.removeEventListener("mouseup", handleMouseUp)
      }

      window.addEventListener("mousemove", handleMouseMove)
      window.addEventListener("mouseup", handleMouseUp)
    },
    [copilotWidth]
  )

  const toggleCommentsPanel = useCallback(() => {
    const next = !commentsVisible
    setCommentsVisible(next)
    if (next) {
      setCommentsAttention(false)
    }
    localStorage.setItem(COMMENTS_VISIBLE_KEY, next ? "true" : "false")
    window.dispatchEvent(
      new CustomEvent(SET_COMMENTS_VISIBILITY_EVENT, {
        detail: { visible: next },
      })
    )
  }, [commentsVisible])

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      <Header />
      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <MainWorkspace />

        {showCopilotRail && (
          <aside
            className={
              showCopilotPanel && copilotOpen
                ? "hidden lg:flex border-l border-[#353840] bg-[#1f2023] relative shrink-0"
                : "hidden lg:flex lg:w-12 border-l border-[#353840] bg-[#1f2023] text-[#d7d7d9]"
            }
            style={showCopilotPanel && copilotOpen ? { width: `${copilotWidth}px` } : undefined}
          >
            {showCopilotPanel && copilotOpen ? (
              <div className="flex h-full w-full flex-col min-h-0">
                <div
                  className="absolute left-0 top-0 h-full w-1 cursor-ew-resize hover:bg-border/60"
                  onMouseDown={startCopilotResize}
                  aria-label="Resize AI Copilot panel"
                  title="Drag to resize"
                />
	              <div className="flex items-center justify-between px-3 py-2 border-b border-[#353840] shrink-0 bg-[#25272c]">
	                <div className="flex items-center gap-2 min-w-0">
	                  <Bot className="w-4 h-4 text-[#8fb4ff]" />
	                  <span className="text-sm font-semibold text-[#e1e3e8]">AI Copilot</span>
	                  <div className="flex items-center gap-2 ml-1 min-w-0">
	                    <div className="inline-flex items-center gap-2 rounded-full border border-[#343742] bg-[#1f2126]/60 px-2.5 py-1 text-[11px] text-[#cfd3dc] min-w-0">
	                      <span
	                        className={
	                          "h-1.5 w-1.5 rounded-full " +
	                          (copilotLastApplySource === null
	                            ? "bg-slate-500/60"
	                            : copilotLastApplySource === "deterministic"
	                              ? "bg-amber-400/80"
	                              : "bg-emerald-400/80")
	                        }
	                      />
	                      <span className="text-[#aeb4be] shrink-0">Applied</span>
	                      <span className="truncate max-w-[160px]">
	                        {copilotLastApplySource
	                          ? `${copilotLastApplySource} / ${copilotLastApplyModel || "unknown"}`
	                          : "-"}
	                      </span>
	                    </div>
	                    <div className="inline-flex items-center gap-2 rounded-full border border-[#343742] bg-[#1f2126]/60 px-2.5 py-1 text-[11px] text-[#cfd3dc] min-w-0">
	                      <span className="text-[#aeb4be] shrink-0">Prompt</span>
	                      <span className="truncate max-w-[120px]">{copilotPromptChip}</span>
	                    </div>
	                  </div>
	                </div>
	                <div className="flex items-center gap-1">
	                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-[#adb2bc] hover:text-[#e1e3e8] hover:bg-[#32353d]"
                        aria-label="AI Copilot settings"
                      >
                        <Settings className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-[140px]">
                      <DropdownMenuItem onSelect={() => setCopilotFont("xsmall")}>
                        Font: Smallest
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => setCopilotFont("small")}>
                        Font: Small
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => setCopilotFont("normal")}>
                        Font: Normal
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 text-[#adb2bc] hover:text-[#e1e3e8] hover:bg-[#32353d]"
                    onClick={() => setCopilotOpen(false)}
                    aria-label="Collapse AI Copilot"
                  >
                    <PanelRightClose className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="flex-1 min-h-0">
                <CopilotWorkbench fontScale={copilotFont} messageStyle="plain" />
              </div>
            </div>
            ) : (
              <div className="flex h-full w-full flex-col items-center pt-2 gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 text-[#adb2bc] hover:text-[#e1e3e8] hover:bg-[#32353d]"
                  onClick={() => setCopilotOpen(true)}
                  aria-label="Show AI Copilot"
                  title="Show AI Copilot"
                >
                  <Bot className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className={`relative h-8 w-8 p-0 hover:text-[#e1e3e8] hover:bg-[#32353d] ${
                    commentsVisible ? "text-[#8fb4ff] bg-[#32353d]" : "text-[#adb2bc]"
                  }`}
                  onClick={toggleCommentsPanel}
                  aria-label={commentsVisible ? "Hide comments" : "Show comments"}
                  title={commentsVisible ? "Hide comments" : "Show comments"}
                >
                  <MessageSquare className="w-4 h-4" />
                  {!commentsVisible && commentsAttention && (
                    <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-[#e3d787] ring-1 ring-[#e3d787]/40 animate-[pulse_2.4s_ease-in-out_infinite]" />
                  )}
                </Button>
              </div>
            )}
          </aside>
        )}
      </div>

      {showCopilotRail && showCopilotPanel && copilotOpen ? (
        <div className="fixed inset-0 z-40 bg-[#1f2023] lg:hidden">
	            <div className="flex h-full flex-col min-h-0">
	            <div className="flex items-center justify-between px-4 py-3 border-b border-[#353840] shrink-0 bg-[#25272c]">
	              <div className="flex items-center gap-2 min-w-0">
	                <Bot className="w-4 h-4 text-[#8fb4ff]" />
	                <span className="text-sm font-semibold text-[#e1e3e8]">AI Copilot</span>
	                <div className="flex items-center gap-2 ml-1 min-w-0">
	                  <div className="inline-flex items-center gap-2 rounded-full border border-[#343742] bg-[#1f2126]/60 px-2.5 py-1 text-[11px] text-[#cfd3dc] min-w-0">
	                    <span
	                      className={
	                        "h-1.5 w-1.5 rounded-full " +
	                        (copilotLastApplySource === null
	                          ? "bg-slate-500/60"
	                          : copilotLastApplySource === "deterministic"
	                            ? "bg-amber-400/80"
	                            : "bg-emerald-400/80")
	                      }
	                    />
	                    <span className="text-[#aeb4be] shrink-0">Applied</span>
	                    <span className="truncate max-w-[160px]">
	                      {copilotLastApplySource
	                        ? `${copilotLastApplySource} / ${copilotLastApplyModel || "unknown"}`
	                        : "-"}
	                    </span>
	                  </div>
	                  <div className="inline-flex items-center gap-2 rounded-full border border-[#343742] bg-[#1f2126]/60 px-2.5 py-1 text-[11px] text-[#cfd3dc] min-w-0">
	                    <span className="text-[#aeb4be] shrink-0">Prompt</span>
	                    <span className="truncate max-w-[120px]">{copilotPromptChip}</span>
	                  </div>
	                </div>
	              </div>
	              <div className="flex items-center gap-1">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-[#adb2bc] hover:text-[#e1e3e8] hover:bg-[#32353d]"
                      aria-label="AI Copilot settings"
                    >
                      <Settings className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="min-w-[140px]">
                    <DropdownMenuItem onSelect={() => setCopilotFont("xsmall")}>
                      Font: Smallest
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setCopilotFont("small")}>
                      Font: Small
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setCopilotFont("normal")}>
                      Font: Normal
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 text-[#adb2bc] hover:text-[#e1e3e8] hover:bg-[#32353d]"
                  onClick={() => setCopilotOpen(false)}
                  aria-label="Close AI Copilot"
                >
                  <PanelRightClose className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="flex-1 min-h-0">
              <CopilotWorkbench fontScale={copilotFont} messageStyle="plain" compact />
            </div>
          </div>
        </div>
      ) : showCopilotRail && showCopilotPanel ? (
        <div className="fixed bottom-6 left-6 lg:hidden">
          <Button variant="secondary" onClick={() => setCopilotOpen(true)} className="gap-2">
            <Bot className="w-4 h-4" />
            AI Copilot
          </Button>
        </div>
      ) : null}
    </div>
  )
}
