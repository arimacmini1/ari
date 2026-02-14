"use client"

import { useEffect, useState } from "react"
import {
  Search,
  Bell,
  Settings,
  ChevronDown,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useActiveProject } from "@/components/aei/active-project-provider"

export function Header() {
  const [collaborators, setCollaborators] = useState<string[]>([])
  const [unreadMentions, setUnreadMentions] = useState(0)
  const { projects, activeProjectId, loading, setActiveProjectId, createProject } = useActiveProject()
  const selectedProjectId =
    activeProjectId && projects.some((project) => project.project_id === activeProjectId)
      ? activeProjectId
      : undefined

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ count: number; names: string[] }>).detail
      if (!detail || !Array.isArray(detail.names)) return
      setCollaborators(detail.names)
    }
    window.addEventListener("aei-collaborators", handler as EventListener)
    return () => window.removeEventListener("aei-collaborators", handler as EventListener)
  }, [])

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ unread: number }>).detail
      if (!detail || typeof detail.unread !== "number") return
      setUnreadMentions(detail.unread)
    }
    window.addEventListener("aei-collab-notifications", handler as EventListener)
    return () => window.removeEventListener("aei-collab-notifications", handler as EventListener)
  }, [])

  const handleCreateProject = async () => {
    const name = window.prompt("New project name")
    if (!name || !name.trim()) return
    try {
      await createProject(name.trim())
    } catch (error) {
      console.error("Failed to create project", error)
      window.alert("Failed to create project")
    }
  }

  return (
    <header className="flex items-center justify-between h-14 px-4 border-b border-border bg-card">
      <div className="flex items-center gap-3">
        <span className="font-semibold text-[#28dfca] tracking-tight leading-none">
          <span className="text-xl">A</span>
          <span className="inline-block w-0.5" />
          <span className="text-[17px] relative -top-px text-[#ffffff]">r</span>
          <span className="inline-block w-0.5" />
          <span className="text-xl font-extrabold">i</span>
        </span>
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
        <div className="h-5 w-px bg-border" />
        <div className="flex items-center gap-2">
          <select
            value={selectedProjectId ?? ""}
            onChange={(event) => {
              const value = event.target.value
              if (!value || value === activeProjectId) return
              void setActiveProjectId(value)
            }}
            disabled={loading || projects.length === 0}
            className="h-8 w-[190px] rounded-md border border-border bg-secondary px-2 text-xs text-foreground"
          >
            <option value="" disabled>
              {loading ? "Loading projects..." : "Select project"}
            </option>
            {projects.map((project) => (
              <option key={project.project_id} value={project.project_id}>
                {project.name}
              </option>
            ))}
          </select>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={handleCreateProject}>
            New
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden lg:flex items-center gap-2 text-xs text-muted-foreground">
          <span className="shrink-0">Collaborators</span>
          <div className="flex items-center gap-1">
            {collaborators.length === 0 && <span className="text-xs">Solo</span>}
            {collaborators.map((name, idx) => (
              <span
                key={`${name}-${idx}`}
                className="inline-flex items-center rounded-full px-2 py-0.5 border border-border text-xs text-foreground"
              >
                {name}
              </span>
            ))}
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Search agents, prompts..."
            className="w-64 h-8 pl-8 text-xs bg-secondary border-border placeholder:text-muted-foreground"
          />
        </div>
        <Button variant="ghost" size="icon" className="relative h-8 w-8">
          <Bell className="w-4 h-4 text-muted-foreground" />
          {unreadMentions > 0 ? (
            <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-amber-500 text-[10px] leading-4 text-amber-950 font-semibold text-center">
              {Math.min(unreadMentions, 9)}
            </span>
          ) : (
            <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" />
          )}
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
