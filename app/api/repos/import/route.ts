/**
 * Repo Import API
 * Feature: P1-MH-01 - Repo Import Flow
 * 
 * POST /api/repos/import - Start repo import
 * GET /api/repos/import - List all imports
 * GET /api/repos/import/[id] - Get import status
 */

import { NextRequest, NextResponse } from 'next/server'
import { 
  createRepoImport, 
  getRepoImport, 
  getAllRepoImports,
  deleteRepoImport,
  type RepoImport 
} from '@/lib/repo-import-store'

/**
 * POST /api/repos/import - Start a new repo import
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { url } = body
    
    if (!url) {
      return NextResponse.json(
        { error: 'Missing required field: url' },
        { status: 400 }
      )
    }
    
    // Validate GitHub URL
    if (!url.includes('github.com')) {
      return NextResponse.json(
        { error: 'Only GitHub URLs are supported' },
        { status: 400 }
      )
    }
    
    const repoImport = createRepoImport(url)
    
    return NextResponse.json({ repo: repoImport }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

/**
 * GET /api/repos/import - List all repo imports
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    
    if (id) {
      const repo = getRepoImport(id)
      if (!repo) {
        return NextResponse.json({ error: 'Import not found' }, { status: 404 })
      }
      return NextResponse.json({ repo })
    }
    
    const repos = getAllRepoImports()
    return NextResponse.json({ repos })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
