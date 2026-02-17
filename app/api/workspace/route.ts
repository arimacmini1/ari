/**
 * Code Workspace API
 * Feature: P1-MH-03 - Code Workspace Launcher
 * 
 * POST /api/workspace - Create workspace session
 * GET /api/workspace - List workspaces
 * GET /api/workspace/[id] - Get workspace status
 */

import { NextRequest, NextResponse } from 'next/server'
import { getRepoImport } from '@/lib/repo-import-store'

// In-memory workspace sessions (in production, use a proper store)
const workspaces = new Map<string, {
  id: string
  repo_id: string
  repo_name: string
  status: 'starting' | 'ready' | 'error'
  code_server_url: string
  created_at: string
}>()

/**
 * POST /api/workspace - Start a new workspace
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { repo_id } = body
    
    if (!repo_id) {
      return NextResponse.json(
        { error: 'Missing required field: repo_id' },
        { status: 400 }
      )
    }
    
    // Get repo info
    const repo = getRepoImport(repo_id)
    if (!repo) {
      return NextResponse.json(
        { error: 'Repository not found' },
        { status: 404 }
      )
    }
    
    if (repo.status !== 'ready') {
      return NextResponse.json(
        { error: 'Repository must be in ready status to open workspace' },
        { status: 400 }
      )
    }
    
    // Create workspace session
    const id = `ws-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
    const codeServerUrl = process.env.NEXT_PUBLIC_CODE_SERVER_URL || 'http://localhost:8081'
    
    const workspace = {
      id,
      repo_id,
      repo_name: repo.name,
      status: 'starting' as const,
      code_server_url: codeServerUrl,
      created_at: new Date().toISOString(),
    }
    
    workspaces.set(id, workspace)
    
    // Simulate workspace starting (in production, this would actually start code-server)
    setTimeout(() => {
      const ws = workspaces.get(id)
      if (ws) {
        ws.status = 'ready'
      }
    }, 2000)
    
    return NextResponse.json({ workspace }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

/**
 * GET /api/workspace - List all workspaces
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    
    if (id) {
      const workspace = workspaces.get(id)
      if (!workspace) {
        return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
      }
      return NextResponse.json({ workspace })
    }
    
    const allWorkspaces = Array.from(workspaces.values())
    return NextResponse.json({ workspaces: allWorkspaces })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
