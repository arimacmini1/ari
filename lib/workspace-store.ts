/**
 * Code Workspace API
 * Feature: P1-MH-03 - Code Workspace Launcher
 * 
 * Manages code-server workspace sessions
 */

import { NextRequest, NextResponse } from 'next/server'

export interface WorkspaceSession {
  id: string
  repo_id: string
  repo_name: string
  status: 'starting' | 'ready' | 'error'
  code_server_url?: string
  created_at: string
  updated_at: string
}

declare global {
  var __aei_workspaces_db: Map<string, WorkspaceSession> | undefined
}

function getWorkspacesDb(): Map<string, WorkspaceSession> {
  if (!globalThis.__aei_workspaces_db) {
    globalThis.__aei_workspaces_db = new Map<string, WorkspaceSession>()
  }
  return globalThis.__aei_workspaces_db
}

export function createWorkspaceSession(repoId: string, repoName: string): WorkspaceSession {
  const db = getWorkspacesDb()
  const id = `ws-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  
  const session: WorkspaceSession = {
    id,
    repo_id: repoId,
    repo_name: repoName,
    status: 'starting',
    code_server_url: process.env.NEXT_PUBLIC_CODE_SERVER_URL || 'http://localhost:8081',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
  
  db.set(id, session)
  
  // Simulate workspace starting
  setTimeout(() => {
    const ws = db.get(id)
    if (ws) {
      ws.status = 'ready'
      ws.updated_at = new Date().totoISOString()
      db.set(id, ws)
    }
  }, 3000)
  
  return session
}

export function getWorkspaceSession(id: string): WorkspaceSession | undefined {
  return getWorkspacesDb().get(id)
}

export function getAllWorkspaces(): WorkspaceSession[] {
  return Array.from(getWorkspacesDb().values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )
}
