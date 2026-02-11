"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { PromptCanvas } from "@/components/aei/prompt-canvas"
import { AgentPanel } from "@/components/aei/agent-panel"
import { TraceViewer } from "@/components/aei/trace-viewer"
import { AnalyticsPane } from "@/components/aei/analytics-pane"
import { ConsoleChat } from "@/components/aei/console-chat"
import { OrchestratorHub } from "@/components/aei/orchestrator-hub"
import { useAccessibilitySettings } from "@/components/accessibility/accessibility-provider"
import {
  Layers,
  Bot,
  GitBranch,
  BarChart3,
  Terminal,
  Network,
} from "lucide-react"

const mainTabs = [
  { id: "canvas", label: "Prompt Canvas", icon: Layers },
  { id: "agents", label: "Agents", icon: Bot },
  { id: "traces", label: "Trace Viewer", icon: GitBranch },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "console", label: "Console", icon: Terminal },
  { id: "orchestrator", label: "Orchestrator", icon: Network },
] as const

type TabId = (typeof mainTabs)[number]["id"]

export function MainWorkspace() {
  const [activeTab, setActiveTab] = useState<TabId>("canvas")
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([])
  const { settings } = useAccessibilitySettings()
  const [showTip, setShowTip] = useState(false)
  const lastInteractionRef = useRef<number>(Date.now())

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
    const handler = (event: Event) => {
      const detail = (event as CustomEvent).detail as { type: string; tab?: string };
      if (detail?.type === 'switch-tab' && detail.tab) {
        const index = visibleTabs.findIndex((t) => t.id === detail.tab);
        if (index >= 0) {
          focusTab(index);
        }
      }
    };
    window.addEventListener('aei-voice-command', handler as EventListener);
    return () => window.removeEventListener('aei-voice-command', handler as EventListener);
  }, [focusTab]);

  useEffect(() => {
    if (!visibleTabs.find((tab) => tab.id === activeTab)) {
      setActiveTab(visibleTabs[0]?.id ?? 'canvas')
    }
  }, [activeTab, visibleTabs])

  useEffect(() => {
    const markInteraction = () => {
      lastInteractionRef.current = Date.now()
      setShowTip(false)
    }
    window.addEventListener('keydown', markInteraction)
    window.addEventListener('mousemove', markInteraction)
    const interval = setInterval(() => {
      if (settings.uiMode === 'novice' && Date.now() - lastInteractionRef.current > 15000) {
        setShowTip(true)
      }
    }, 3000)
    return () => {
      window.removeEventListener('keydown', markInteraction)
      window.removeEventListener('mousemove', markInteraction)
      clearInterval(interval)
    }
  }, [settings.uiMode])

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
        {showTip ? (
          <div className="mx-4 mt-4 rounded-lg border border-border bg-secondary/40 p-3 text-xs text-muted-foreground">
            Need help? Try the Prompt Canvas or open Agents to inspect the swarm.
          </div>
        ) : null}
        {activeTab === "canvas" && <PromptCanvas />}
        {activeTab === "agents" && <AgentPanel />}
        {activeTab === "traces" && <TraceViewer />}
        {activeTab === "analytics" && <AnalyticsPane />}
        {activeTab === "console" && <ConsoleChat storageKey="aei.familiar.chat" />}
        {activeTab === "orchestrator" && <OrchestratorHub />}
      </div>
    </div>
  )
}
