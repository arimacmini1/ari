"use client"

import { useEffect, useState } from "react"
import { Header } from "@/components/aei/header"
import { Sidebar } from "@/components/aei/sidebar"
import { MainWorkspace } from "@/components/aei/main-workspace"
import { FamiliarMode } from "@/components/aei/familiar-mode"
import { Button } from "@/components/ui/button"

const FAMILIAR_MODE_KEY = "aei.familiar.enabled"
const FAMILIAR_FIRST_RUN_KEY = "aei.familiar.firstRunSeen"
const FAMILIAR_CHAT_KEY = "aei.familiar.chat"
const CANVAS_STATE_KEY = "canvas-state"
const FAMILIAR_EXPANSION_SOURCE_KEY = "aei.familiar.expansionSource"
const FAMILIAR_EXPANSION_MODEL_KEY = "aei.familiar.expansionModel"

type CanvasState = {
  nodes: Array<{
    id: string
    data: { label: string; description: string; blockType: string }
    position: { x: number; y: number }
    type: "block"
  }>
  edges: Array<{ id: string; source: string; target: string }>
  viewport: { x: number; y: number; zoom: number }
}

type ChatMessage = {
  role: "user" | "ai" | "system"
  content: string
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
    edges: [
      {
        id: `edge-${textId}-${taskId}`,
        source: textId,
        target: taskId,
      },
    ],
    viewport: { x: 0, y: 0, zoom: 1 },
  }
}

export default function Page() {
  const [familiarEnabled, setFamiliarEnabled] = useState<boolean | null>(null)
  const [showGuidance, setShowGuidance] = useState(false)
  const [lastExpansionSource, setLastExpansionSource] = useState<string | null>(null)
  const [lastExpansionModel, setLastExpansionModel] = useState<string | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem(FAMILIAR_MODE_KEY)
    if (stored === null) {
      localStorage.setItem(FAMILIAR_MODE_KEY, "true")
      setFamiliarEnabled(true)
      setShowGuidance(true)
      return
    }
    setFamiliarEnabled(stored === "true")
    const seen = localStorage.getItem(FAMILIAR_FIRST_RUN_KEY)
    setShowGuidance(seen !== "true")
    const lastSource = localStorage.getItem(FAMILIAR_EXPANSION_SOURCE_KEY)
    setLastExpansionSource(lastSource)
    const lastModel = localStorage.getItem(FAMILIAR_EXPANSION_MODEL_KEY)
    setLastExpansionModel(lastModel)
  }, [])

  const enterFull = async () => {
    const storedChat = localStorage.getItem(FAMILIAR_CHAT_KEY)
    if (storedChat) {
      try {
        const parsed = JSON.parse(storedChat) as ChatMessage[]
        if (Array.isArray(parsed) && parsed.length > 0) {
          const resp = await fetch("/api/familiar/expand", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ messages: parsed }),
          })
          if (resp.ok) {
            const data = await resp.json()
            if (data?.canvas) {
              localStorage.setItem(CANVAS_STATE_KEY, JSON.stringify(data.canvas))
              if (data?.source) {
                localStorage.setItem(FAMILIAR_EXPANSION_SOURCE_KEY, data.source)
                setLastExpansionSource(data.source)
              }
              if (data?.model) {
                localStorage.setItem(FAMILIAR_EXPANSION_MODEL_KEY, data.model)
                setLastExpansionModel(data.model)
              }
            } else {
              const canvasState = buildCanvasFromChat(parsed)
              localStorage.setItem(CANVAS_STATE_KEY, JSON.stringify(canvasState))
              localStorage.setItem(FAMILIAR_EXPANSION_SOURCE_KEY, "deterministic")
              setLastExpansionSource("deterministic")
              localStorage.setItem(FAMILIAR_EXPANSION_MODEL_KEY, "deterministic")
              setLastExpansionModel("deterministic")
            }
          } else {
            const canvasState = buildCanvasFromChat(parsed)
            localStorage.setItem(CANVAS_STATE_KEY, JSON.stringify(canvasState))
            localStorage.setItem(FAMILIAR_EXPANSION_SOURCE_KEY, "deterministic")
            setLastExpansionSource("deterministic")
            localStorage.setItem(FAMILIAR_EXPANSION_MODEL_KEY, "deterministic")
            setLastExpansionModel("deterministic")
          }
        }
      } catch {
        if (storedChat) {
          try {
            const parsed = JSON.parse(storedChat) as ChatMessage[]
            const canvasState = buildCanvasFromChat(parsed)
            localStorage.setItem(CANVAS_STATE_KEY, JSON.stringify(canvasState))
            localStorage.setItem(FAMILIAR_EXPANSION_SOURCE_KEY, "deterministic")
            setLastExpansionSource("deterministic")
            localStorage.setItem(FAMILIAR_EXPANSION_MODEL_KEY, "deterministic")
            setLastExpansionModel("deterministic")
          } catch {}
        }
      }
    }
    localStorage.setItem(FAMILIAR_MODE_KEY, "false")
    localStorage.setItem(FAMILIAR_FIRST_RUN_KEY, "true")
    setFamiliarEnabled(false)
    setShowGuidance(false)
  }

  const enterFamiliar = () => {
    localStorage.setItem(FAMILIAR_MODE_KEY, "true")
    setFamiliarEnabled(true)
  }

  const dismissGuidance = () => {
    localStorage.setItem(FAMILIAR_FIRST_RUN_KEY, "true")
    setShowGuidance(false)
  }

  if (familiarEnabled === null) {
    return null
  }

  if (familiarEnabled) {
    return (
      <FamiliarMode
        showGuidance={showGuidance}
        onDismissGuidance={dismissGuidance}
        onEnterFull={enterFull}
        lastExpansionSource={lastExpansionSource}
        lastExpansionModel={lastExpansionModel}
      />
    )
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      <Header />
      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <MainWorkspace />
      </div>
      <div className="fixed bottom-6 right-6">
        <Button variant="secondary" onClick={enterFamiliar}>
          Back to Familiar Mode
        </Button>
      </div>
    </div>
  )
}
