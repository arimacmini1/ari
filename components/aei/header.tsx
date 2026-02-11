"use client"

import {
  Search,
  Bell,
  Settings,
  ChevronDown,
  Zap,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

export function Header() {
  return (
    <header className="flex items-center justify-between h-14 px-4 border-b border-border bg-card">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
            <Zap className="w-4 h-4 text-primary" />
          </div>
          <span className="text-sm font-semibold text-foreground tracking-tight">AEI</span>
        </div>
        <div className="h-5 w-px bg-border" />
        <nav className="flex items-center gap-1">
          {["Dashboard", "Workflows", "Agents", "Analytics"].map((item) => (
            <button
              key={item}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                item === "Dashboard"
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              }`}
            >
              {item}
            </button>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Search agents, prompts..."
            className="w-64 h-8 pl-8 text-xs bg-secondary border-border placeholder:text-muted-foreground"
          />
        </div>
        <Button variant="ghost" size="icon" className="relative h-8 w-8">
          <Bell className="w-4 h-4 text-muted-foreground" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
          <span className="sr-only">Notifications</span>
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Settings className="w-4 h-4 text-muted-foreground" />
          <span className="sr-only">Settings</span>
        </Button>
        <div className="h-5 w-px bg-border" />
        <button className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-secondary transition-colors">
          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
            <span className="text-[10px] font-semibold text-primary">AE</span>
          </div>
          <span className="text-xs text-foreground">Engineer</span>
          <ChevronDown className="w-3 h-3 text-muted-foreground" />
        </button>
      </div>
    </header>
  )
}
