/**
 * Recent Projects List Component
 * Feature: P1-CH-02 - Recent Projects List
 * 
 * Quick access to previously imported repos
 */

"use client"

import { useState, useEffect } from "react"
import { FolderOpen, Clock, Trash2, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export interface RecentProject {
  id: string
  name: string
  url: string
  lastOpened: string
  status: "ready" | "indexing" | "error"
}

export interface RecentProjectsListProps {
  maxItems?: number
  onProjectSelect?: (projectId: string) => void
  className?: string
}

export function RecentProjectsList({
  maxItems = 5,
  onProjectSelect,
  className = "",
}: RecentProjectsListProps) {
  const [projects, setProjects] = useState<RecentProject[]>([])
  const [loading, setLoading] = useState(true)

  // Load recent projects from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("recentProjects")
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setProjects(parsed.slice(0, maxItems))
      } catch {
        // Invalid JSON
      }
    }
    setLoading(false)
  }, [maxItems])

  const removeProject = (id: string) => {
    const updated = projects.filter((p) => p.id !== id)
    setProjects(updated)
    localStorage.setItem("recentProjects", JSON.stringify(updated))
  }

  const clearAll = () => {
    setProjects([])
    localStorage.removeItem("recentProjects")
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  if (loading) {
    return (
      <Button variant="ghost" size="sm" className={className}>
        <Clock className="w-4 h-4 mr-2" />
        Recent
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className={className}>
          <Clock className="w-4 h-4 mr-2" />
          Recent
          {projects.length > 0 && (
            <span className="ml-1 text-xs text-muted-foreground">
              ({projects.length})
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        {projects.length === 0 ? (
          <div className="px-2 py-4 text-center text-sm text-muted-foreground">
            No recent projects
          </div>
        ) : (
          <>
            {projects.map((project) => (
              <DropdownMenuItem
                key={project.id}
                onClick={() => onProjectSelect?.(project.id)}
                className="flex items-center gap-2"
              >
                <FolderOpen className="w-4 h-4 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate">{project.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatDate(project.lastOpened)}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation()
                    removeProject(project.id)
                  }}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={clearAll} className="text-red-500">
              <Trash2 className="w-4 h-4 mr-2" />
              Clear all
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/**
 * Add project to recent list
 */
export function addToRecentProjects(project: Omit<RecentProject, "lastOpened">) {
  const saved = localStorage.getItem("recentProjects")
  let projects: RecentProject[] = []
  
  if (saved) {
    try {
      projects = JSON.parse(saved)
    } catch {
      projects = []
    }
  }
  
  // Remove if already exists
  projects = projects.filter((p) => p.id !== project.id)
  
  // Add to front
  projects.unshift({
    ...project,
    lastOpened: new Date().toISOString(),
  })
  
  // Keep only 10
  projects = projects.slice(0, 10)
  
  localStorage.setItem("recentProjects", JSON.stringify(projects))
}
