import { NextRequest, NextResponse } from 'next/server'
import { CanvasVersionStore } from '@/lib/canvas-versions'

const store = new CanvasVersionStore()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { canvas_id, nodes, edges, viewport, user_id } = body

    if (!canvas_id || !Array.isArray(nodes) || !Array.isArray(edges)) {
      return NextResponse.json(
        { error: 'Missing required fields: canvas_id, nodes, edges' },
        { status: 400 }
      )
    }

    const state = {
      nodes,
      edges,
      viewport: viewport ?? { x: 0, y: 0, zoom: 1 },
    }

    const version = store.save(canvas_id, state, user_id)
    return NextResponse.json(version, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const canvasId = searchParams.get('canvas_id')
  const page = parseInt(searchParams.get('page') ?? '1', 10)
  const perPage = 20

  if (!canvasId) {
    return NextResponse.json(
      { error: 'Missing required query param: canvas_id' },
      { status: 400 }
    )
  }

  const allVersions = store.getVersions(canvasId)
  const sorted = [...allVersions].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )

  const start = (page - 1) * perPage
  const paginated = sorted.slice(start, start + perPage)

  return NextResponse.json({
    versions: paginated,
    total: allVersions.length,
    page,
    per_page: perPage,
  })
}
