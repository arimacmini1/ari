"use client"

import React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { useState } from "react"
import {
  LayoutDashboard,
  Bot,
  Network,
  Activity,
  GitBranch,
  Shield,
  Puzzle,
  MessageSquare,
  ChevronRight,
  Circle,
  TrendingUp,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { useAccessibilitySettings } from "@/components/accessibility/accessibility-provider"
import { VoiceCommandController } from "@/components/accessibility/voice-command-controller"

interface NavItem {
  icon: React.ElementType
  label: string
  href?: string
  badge?: string
  active?: boolean
  children?: { label: string; status?: "active" | "idle" | "error" }[]
}

const navItems: NavItem[] = [
  { icon: LayoutDashboard, label: "Overview", href: "/", active: true },
  {
    icon: Bot,
    label: "Agents",
    href: "/agents",
    badge: "12",
    children: [
      { label: "code-gen-alpha", status: "active" },
      { label: "test-runner-01", status: "active" },
      { label: "deploy-agent", status: "idle" },
      { label: "security-scan", status: "error" },
    ],
  },
  { icon: Network, label: "Orchestrator", href: "/orchestrator", badge: "3" },
  { icon: Activity, label: "Trace Viewer", href: "/trace" },
  { icon: TrendingUp, label: "Analytics", href: "/analytics" },
  { icon: GitBranch, label: "Workflows", href: "/workflows", badge: "5" },
  { icon: Shield, label: "Compliance", href: "/compliance" },
  { icon: Puzzle, label: "Plugins", href: "/plugins" },
  { icon: MessageSquare, label: "Console", href: "/console" },
]

function StatusDot({ status }: { status: "active" | "idle" | "error" }) {
  return (
    <Circle
      className={cn(
        "w-2 h-2 fill-current",
        status === "active" && "text-emerald-400",
        status === "idle" && "text-muted-foreground",
        status === "error" && "text-destructive"
      )}
    />
  )
}

export function Sidebar() {
  const [expanded, setExpanded] = useState<string | null>("Agents")
  const pathname = usePathname()
  useAccessibilitySettings()

  return (
    <aside className="flex flex-col w-56 border-r border-border bg-card/50 shrink-0">
      <div className="flex-1 py-3 overflow-y-auto">
        <div className="px-3 mb-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Navigation</span>
        </div>
        <nav className="flex flex-col gap-0.5 px-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (pathname === "/" && item.href === "/")
            const NavComponent = item.href ? Link : "button"
            const navProps = item.href ? { href: item.href } : {}

            return (
              <div key={item.label}>
                <NavComponent
                  {...navProps}
                  onClick={(e: React.MouseEvent) => {
                    if (item.children && item.href) {
                      e.preventDefault()
                      setExpanded(expanded === item.label ? null : item.label)
                    } else if (item.children && !item.href) {
                      setExpanded(expanded === item.label ? null : item.label)
                    }
                  }}
                  className={cn(
                    "flex items-center gap-2.5 w-full px-2.5 py-2 rounded-md text-xs font-medium transition-colors",
                    item.href ? "no-underline" : "",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                  )}
                >
                  <item.icon className="w-4 h-4 shrink-0" />
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.badge && (
                    <Badge
                      variant="secondary"
                      className="h-4 px-1.5 text-[10px] font-mono bg-secondary text-muted-foreground"
                    >
                      {item.badge}
                    </Badge>
                  )}
                  {item.children && (
                    <ChevronRight
                      className={cn(
                        "w-3 h-3 transition-transform",
                        expanded === item.label && "rotate-90"
                      )}
                    />
                  )}
                </NavComponent>
                {item.children && expanded === item.label && (
                  <div className="ml-4 mt-0.5 flex flex-col gap-0.5 border-l border-border pl-3">
                    {item.children.map((child) => (
                      <button
                        key={child.label}
                        className="flex items-center gap-2 px-2 py-1.5 text-[11px] font-mono text-muted-foreground hover:text-foreground rounded transition-colors"
                      >
                        {child.status && <StatusDot status={child.status} />}
                        <span className="truncate">{child.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </nav>
      </div>

      <div className="px-3 pb-3">
        <VoiceCommandController embedded />
      </div>

      <div className="p-3 border-t border-border">
        <div className="flex items-center gap-2 p-2 rounded-lg bg-secondary/50">
          <div className="flex items-center justify-center w-7 h-7 rounded-md bg-primary/10">
            <Activity className="w-3.5 h-3.5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-medium text-foreground truncate">System Health</p>
            <p className="text-[10px] text-muted-foreground">All agents nominal</p>
          </div>
          <div className="w-2 h-2 rounded-full bg-emerald-400" />
        </div>
      </div>
    </aside>
  )
}
