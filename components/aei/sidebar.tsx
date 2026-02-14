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
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useAccessibilitySettings } from "@/components/accessibility/accessibility-provider"

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
  const [collapsed, setCollapsed] = useState(false)
  const [expanded, setExpanded] = useState<string | null>("Agents")
  const pathname = usePathname()
  useAccessibilitySettings()
  const handleSidebarSurfaceClick = (e: React.MouseEvent<HTMLElement>) => {
    const target = e.target as HTMLElement
    if (target.closest("button, a, input, textarea, select, [role='button']")) {
      return
    }
    setCollapsed((prev) => !prev)
  }

  return (
    <TooltipProvider delayDuration={300}>
      <aside
        onClick={handleSidebarSurfaceClick}
        className={cn(
          "flex flex-col border-r border-border bg-card/50 shrink-0 transition-all duration-200",
          collapsed ? "w-12" : "w-56"
        )}
      >
        <div className="flex items-center justify-between px-2 py-2 border-b border-border shrink-0">
          {!collapsed && (
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground pl-1">
              Navigation
            </span>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                className={cn("h-7 w-7 p-0", collapsed && "mx-auto")}
                onClick={() => setCollapsed(!collapsed)}
                aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
              >
                {collapsed ? (
                  <PanelLeftOpen className="w-3.5 h-3.5" />
                ) : (
                  <PanelLeftClose className="w-3.5 h-3.5" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              {collapsed ? "Expand navigation" : "Collapse navigation"}
            </TooltipContent>
          </Tooltip>
        </div>
        <div className={cn("flex-1 py-3 overflow-y-auto", collapsed && "py-2")}>
          <nav className={cn("flex flex-col gap-0.5", collapsed ? "px-1" : "px-2")}>
            {navItems.map((item) => {
              const isActive = pathname === item.href || (pathname === "/" && item.href === "/")
              const navButtonContent = (
                <>
                  <item.icon className="w-4 h-4 shrink-0" />
                  {!collapsed && <span className="flex-1 text-left">{item.label}</span>}
                  {!collapsed && item.badge && (
                    <Badge
                      variant="secondary"
                      className="h-4 px-1.5 text-[10px] font-mono bg-secondary text-muted-foreground"
                    >
                      {item.badge}
                    </Badge>
                  )}
                  {!collapsed && item.children && (
                    <ChevronRight
                      className={cn(
                        "w-3 h-3 transition-transform",
                        expanded === item.label && "rotate-90"
                      )}
                    />
                  )}
                </>
              )
              const navButtonClassName = cn(
                "w-full rounded-md font-medium transition-colors",
                item.href ? "no-underline" : "",
                collapsed
                  ? "flex h-8 items-center justify-center p-0"
                  : "flex items-center gap-2.5 px-2.5 py-2 text-xs",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              )
              const navButton = item.href ? (
                <Link
                  href={item.href}
                  onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
                    if (item.children) {
                      e.preventDefault()
                      setExpanded(expanded === item.label ? null : item.label)
                    }
                  }}
                  className={navButtonClassName}
                  aria-label={collapsed ? item.label : undefined}
                >
                  {navButtonContent}
                </Link>
              ) : (
                <button
                  onClick={() => {
                    if (item.children) {
                      setExpanded(expanded === item.label ? null : item.label)
                    }
                  }}
                  className={navButtonClassName}
                  aria-label={collapsed ? item.label : undefined}
                >
                  {navButtonContent}
                </button>
              )

              return (
                <div key={item.label}>
                  {collapsed ? (
                    <Tooltip>
                      <TooltipTrigger asChild>{navButton}</TooltipTrigger>
                      <TooltipContent side="right">{item.label}</TooltipContent>
                    </Tooltip>
                  ) : (
                    navButton
                  )}
                  {!collapsed && item.children && expanded === item.label && (
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

        {!collapsed && (
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
        )}
      </aside>
    </TooltipProvider>
  )
}
