"use client"

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"

interface Project {
  project_id: string
  name: string
}

interface ActiveProjectContextValue {
  projects: Project[]
  activeProjectId: string | null
  activeProjectName: string | null
  loading: boolean
  setActiveProjectId: (projectId: string) => Promise<void>
  createProject: (name: string) => Promise<void>
}

const ActiveProjectContext = createContext<ActiveProjectContextValue | null>(null)
const ACTIVE_PROJECT_KEY = "aei.activeProjectId"

export function ActiveProjectProvider({ children }: { children: React.ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([])
  const [activeProjectId, setActiveProjectIdState] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const activeProjectIdRef = useRef<string | null>(null)

  useEffect(() => {
    activeProjectIdRef.current = activeProjectId
  }, [activeProjectId])

  const loadProjects = useCallback(async () => {
    const response = await fetch("/api/projects")
    if (!response.ok) throw new Error("Failed to load projects")
    const data = await response.json()
    const list = Array.isArray(data?.projects) ? data.projects : []
    setProjects(list)
    return list as Project[]
  }, [])

  const persistActiveProject = useCallback(async (projectId: string) => {
    if (activeProjectIdRef.current === projectId) {
      localStorage.setItem(ACTIVE_PROJECT_KEY, projectId)
      return
    }
    const response = await fetch("/api/projects/active", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project_id: projectId }),
    })
    if (!response.ok) {
      throw new Error("Failed to set active project")
    }
    setActiveProjectIdState((prev) => (prev === projectId ? prev : projectId))
    localStorage.setItem(ACTIVE_PROJECT_KEY, projectId)
  }, [])

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const list = await loadProjects()
        const fromStorage = localStorage.getItem(ACTIVE_PROJECT_KEY)
        const validFromStorage = fromStorage && list.some((project) => project.project_id === fromStorage)
        const fallback = list[0]?.project_id ?? null
        const nextProjectId = validFromStorage ? fromStorage : fallback

        if (!cancelled && nextProjectId && nextProjectId !== activeProjectIdRef.current) {
          await persistActiveProject(nextProjectId)
        }
      } catch (error) {
        console.error("Failed to initialize active project", error)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [loadProjects, persistActiveProject])

  const setActiveProjectId = useCallback(
    async (projectId: string) => {
      await persistActiveProject(projectId)
    },
    [persistActiveProject]
  )

  const createProject = useCallback(
    async (name: string) => {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      })
      if (!response.ok) throw new Error("Failed to create project")
      const data = await response.json()
      const created = data?.project as Project | undefined
      const list = await loadProjects()
      if (created?.project_id && list.some((project) => project.project_id === created.project_id)) {
        await persistActiveProject(created.project_id)
      } else if (list[0]?.project_id) {
        await persistActiveProject(list[0].project_id)
      }
    },
    [loadProjects, persistActiveProject]
  )

  const value = useMemo<ActiveProjectContextValue>(() => {
    const active = projects.find((project) => project.project_id === activeProjectId) ?? null
    return {
      projects,
      activeProjectId,
      activeProjectName: active?.name ?? null,
      loading,
      setActiveProjectId,
      createProject,
    }
  }, [projects, activeProjectId, loading, setActiveProjectId, createProject])

  return <ActiveProjectContext.Provider value={value}>{children}</ActiveProjectContext.Provider>
}

export function useActiveProject() {
  const context = useContext(ActiveProjectContext)
  if (!context) {
    throw new Error("useActiveProject must be used within ActiveProjectProvider")
  }
  return context
}
