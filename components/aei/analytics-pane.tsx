"use client"

import React from "react"

import { BarChart3, Coins, ShieldCheck, Clock, ArrowUpRight, ArrowDownRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface Metric {
  label: string
  value: string
  change: string
  trend: "up" | "down"
  icon: React.ElementType
}

const metrics: Metric[] = [
  { label: "Token Usage", value: "1.24M", change: "+12%", trend: "up", icon: Coins },
  { label: "Avg Latency", value: "2.3s", change: "-8%", trend: "down", icon: Clock },
  { label: "Code Quality", value: "94.2", change: "+3%", trend: "up", icon: BarChart3 },
  { label: "Compliance", value: "98%", change: "+1%", trend: "up", icon: ShieldCheck },
]

interface ActivityItem {
  time: string
  event: string
  agent: string
  type: "success" | "warning" | "info"
}

const recentActivity: ActivityItem[] = [
  { time: "2m ago", event: "Deployment pipeline complete", agent: "deploy-agent", type: "success" },
  { time: "5m ago", event: "Low confidence on pattern eval", agent: "code-gen-alpha", type: "warning" },
  { time: "8m ago", event: "Test suite passed (112/112)", agent: "test-runner-01", type: "success" },
  { time: "12m ago", event: "Security scan initiated", agent: "security-scan", type: "info" },
  { time: "15m ago", event: "Workflow branched: feature/auth", agent: "orchestrator-main", type: "info" },
]

export function AnalyticsPane() {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Analytics</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Last 24 hours</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {/* Metric cards */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {metrics.map((metric) => (
            <div
              key={metric.label}
              className="flex items-center gap-4 p-4 rounded-lg bg-secondary/40 border border-border"
            >
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 shrink-0">
                <metric.icon className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">{metric.label}</p>
                <p className="text-xl font-semibold font-mono text-foreground">{metric.value}</p>
              </div>
              <div
                className={cn(
                  "flex items-center gap-1 text-xs font-mono",
                  metric.trend === "up" && metric.label !== "Token Usage"
                    ? "text-emerald-400"
                    : metric.trend === "down"
                      ? "text-emerald-400"
                      : "text-amber-400"
                )}
              >
                {metric.trend === "up" ? (
                  <ArrowUpRight className="w-3.5 h-3.5" />
                ) : (
                  <ArrowDownRight className="w-3.5 h-3.5" />
                )}
                {metric.change}
              </div>
            </div>
          ))}
        </div>

        {/* Activity feed */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground">Activity Feed</h3>
            <button className="text-xs text-primary hover:underline">View all</button>
          </div>
          <div className="flex flex-col gap-2">
            {recentActivity.map((item, i) => (
              <div
                key={i}
                className="flex items-start gap-3 p-3 rounded-lg hover:bg-secondary/30 transition-colors border border-transparent hover:border-border"
              >
                <div
                  className={cn(
                    "w-2 h-2 rounded-full mt-1.5 shrink-0",
                    item.type === "success" && "bg-emerald-400",
                    item.type === "warning" && "bg-amber-400",
                    item.type === "info" && "bg-primary"
                  )}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground leading-relaxed">{item.event}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs font-mono text-muted-foreground">{item.agent}</span>
                    <span className="text-xs text-muted-foreground">{item.time}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
