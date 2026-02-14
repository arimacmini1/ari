import { randomUUID } from 'crypto'

export interface ProjectRecord {
  project_id: string
  name: string
  created_at: string
  updated_at: string
  budget_warning_threshold?: number
  budget_hard_cap?: number
}

declare global {
  var __aei_projects_db: Map<string, ProjectRecord> | undefined
}

function getProjectsDb(): Map<string, ProjectRecord> {
  if (!globalThis.__aei_projects_db) {
    globalThis.__aei_projects_db = new Map<string, ProjectRecord>()
  }
  return globalThis.__aei_projects_db
}

function seedIfNeeded() {
  const projectsDb = getProjectsDb()
  if (projectsDb.size > 0) return
  const now = new Date().toISOString()
  const project: ProjectRecord = {
    project_id: 'project-default',
    name: 'Default Project',
    created_at: now,
    updated_at: now,
    budget_warning_threshold: 100,
    budget_hard_cap: 500,
  }
  projectsDb.set(project.project_id, project)
}

export function listProjects(): ProjectRecord[] {
  seedIfNeeded()
  return Array.from(getProjectsDb().values()).sort((a, b) => a.name.localeCompare(b.name))
}

export function getProject(projectId: string): ProjectRecord | null {
  seedIfNeeded()
  return getProjectsDb().get(projectId) ?? null
}

export function createProject(input: {
  name: string
  budget_warning_threshold?: number
  budget_hard_cap?: number
}): ProjectRecord {
  seedIfNeeded()
  const projectsDb = getProjectsDb()
  const now = new Date().toISOString()
  const project: ProjectRecord = {
    project_id: `project-${randomUUID().slice(0, 8)}`,
    name: input.name.trim(),
    created_at: now,
    updated_at: now,
    budget_warning_threshold: input.budget_warning_threshold,
    budget_hard_cap: input.budget_hard_cap,
  }
  projectsDb.set(project.project_id, project)
  return project
}
