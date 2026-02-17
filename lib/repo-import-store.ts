/**
 * Repo Import Store
 * Feature: P1-MH-01 - Repo Import Flow
 * 
 * Manages GitHub repository import with status progression:
 * Queued → Cloning → Indexing → Ready
 */

export type RepoImportStatus = 'queued' | 'cloning' | 'indexing' | 'ready' | 'failed'

export interface RepoImport {
  id: string
  url: string
  name: string
  status: RepoImportStatus
  project_path?: string
  files_count?: number
  last_commit?: string
  last_commit_hash?: string
  branch?: string
  error?: string
  created_at: string
  updated_at: string
}

declare global {
  var __aei_repo_imports_db: Map<string, RepoImport> | undefined
}

function getRepoImportsDb(): Map<string, RepoImport> {
  if (!globalThis.__aei_repo_imports_db) {
    globalThis.__aei_repo_imports_db = new Map<string, RepoImport>()
  }
  return globalThis.__aei_repo_imports_db
}

export function createRepoImport(url: string): RepoImport {
  const db = getRepoImportsDb()
  const id = `repo-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  
  // Extract repo name from URL
  const name = extractRepoName(url)
  
  const repoImport: RepoImport = {
    id,
    url,
    name,
    status: 'queued',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
  
  db.set(id, repoImport)
  
  // Simulate async status progression
  simulateImportProgress(id)
  
  return repoImport
}

function extractRepoName(url: string): string {
  // Handle GitHub URLs like:
  // https://github.com/user/repo
  // git@github.com:user/repo.git
  const httpMatch = url.match(/github\.com[/:]([\w-]+)\/([\w-]+)/)
  if (httpMatch) {
    return httpMatch[2]
  }
  return 'unknown-repo'
}

async function simulateImportProgress(id: string) {
  const db = getRepoImportsDb()
  const repo = db.get(id)
  if (!repo) return
  
  // Simulate cloning (after 1 second)
  setTimeout(() => {
    const current = db.get(id)
    if (current) {
      current.status = 'cloning'
      current.updated_at = new Date().toISOString()
      current.project_path = `/Users/ari_mac_mini/ari/projects/${current.name}`
      db.set(id, current)
    }
  }, 1000)
  
  // Simulate indexing (after 3 seconds)
  setTimeout(() => {
    const current = db.get(id)
    if (current) {
      current.status = 'indexing'
      current.files_count = Math.floor(Math.random() * 500) + 50
      current.updated_at = new Date().toISOString()
      db.set(id, current)
    }
  }, 3000)
  
  // Simulate ready (after 5 seconds)
  setTimeout(() => {
    const current = db.get(id)
    if (current) {
      current.status = 'ready'
      current.last_commit = 'Initial commit'
      current.last_commit_hash = Math.random().toString(36).slice(2, 10)
      current.branch = 'main'
      current.updated_at = new Date().toISOString()
      db.set(id, current)
    }
  }, 5000)
}

export function getRepoImport(id: string): RepoImport | undefined {
  return getRepoImportsDb().get(id)
}

export function getAllRepoImports(): RepoImport[] {
  return Array.from(getRepoImportsDb().values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )
}

export function updateRepoImport(id: string, updates: Partial<RepoImport>): RepoImport | undefined {
  const db = getRepoImportsDb()
  const existing = db.get(id)
  if (!existing) return undefined
  
  const updated = { ...existing, ...updates, updated_at: new Date().toISOString() }
  db.set(id, updated)
  return updated
}

export function deleteRepoImport(id: string): boolean {
  return getRepoImportsDb().delete(id)
}
