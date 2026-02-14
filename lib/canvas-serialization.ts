import type { CanvasState, CanvasNode, CanvasEdge } from './canvas-state'

export interface CanvasJSON {
  version: '1'
  nodes: CanvasNode[]
  edges: CanvasEdge[]
  viewport: CanvasState['viewport']
  metadata: {
    created: string
    modified: string
    user?: string
  }
}

export const canvasSerializer = {
  export: (state: CanvasState, user?: string): CanvasJSON => {
    const now = new Date().toISOString()
    return {
      version: '1',
      nodes: state.nodes,
      edges: state.edges,
      viewport: state.viewport,
      metadata: {
        created: now,
        modified: now,
        user,
      },
    }
  },

  import: (json: unknown): CanvasState | null => {
    try {
      const data = json as Record<string, unknown>
      if (!Array.isArray(data.nodes) || !Array.isArray(data.edges)) {
        console.error('Invalid canvas JSON: expected "nodes" and "edges" arrays')
        return null
      }

      const normalizedVersion = normalizeVersion(data.version)
      if (data.version !== undefined && normalizedVersion !== '1') {
        console.error('Invalid canvas version')
        return null
      }

      const normalizedViewport = normalizeViewport(data.viewport)
      const nodes = normalizeNodes(data.nodes)
      const edges = normalizeEdges(data.edges)
      if (!nodes || !edges) return null

      // Check for circular dependencies
      const hasCircle = detectCircularDependencies(nodes, edges)
      if (hasCircle) {
        console.error('Circular dependencies detected')
        return null
      }

      // Check for orphaned nodes
      const nodeIds = new Set(nodes.map((n) => n.id))
      for (const edge of edges) {
        if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
          console.error(`Orphaned edge: ${edge.source} -> ${edge.target}`)
          return null
        }
      }

      return {
        nodes,
        edges,
        viewport: normalizedViewport,
      }
    } catch (err) {
      console.error('Failed to parse canvas JSON:', err)
      return null
    }
  },

  serialize: (json: CanvasJSON): string => {
    return JSON.stringify(json, null, 2)
  },

  deserialize: (str: string): CanvasJSON | null => {
    try {
      return JSON.parse(str) as CanvasJSON
    } catch {
      return null
    }
  },

  downloadJSON: (state: CanvasState, user?: string) => {
    const json = canvasSerializer.export(state, user)
    const str = canvasSerializer.serialize(json)
    const blob = new Blob([str], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `canvas-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  },
}

const validBlockTypes = ['task', 'decision', 'loop', 'parallel', 'text', 'artifact', 'preview'] as const

function normalizeVersion(version: unknown): '1' | null {
  if (version === 1 || version === '1' || version === 'v1' || version === 'V1') return '1'
  return null
}

function normalizeViewport(viewport: unknown): CanvasState['viewport'] {
  if (
    viewport &&
    typeof viewport === 'object' &&
    typeof (viewport as Record<string, unknown>).x === 'number' &&
    typeof (viewport as Record<string, unknown>).y === 'number' &&
    typeof (viewport as Record<string, unknown>).zoom === 'number'
  ) {
    const v = viewport as CanvasState['viewport']
    return { x: v.x, y: v.y, zoom: v.zoom }
  }
  return { x: 0, y: 0, zoom: 1 }
}

function normalizeNodes(nodes: unknown[]): CanvasNode[] | null {
  const normalized: CanvasNode[] = []
  for (let i = 0; i < nodes.length; i++) {
    const raw = nodes[i]
    if (!raw || typeof raw !== 'object') {
      console.error(`Invalid node at index ${i}`)
      return null
    }

    const node = raw as Record<string, unknown>
    const id = typeof node.id === 'string' ? node.id : `node-${i + 1}`
    const typeCandidate =
      getString((node.data as Record<string, unknown> | undefined)?.blockType) ??
      getString(node.type) ??
      'task'
    if (!isValidBlockType(typeCandidate)) {
      console.error(`Invalid block type: ${typeCandidate}`)
      return null
    }

    const label =
      getString((node.data as Record<string, unknown> | undefined)?.label) ??
      getString(node.label) ??
      typeCandidate[0].toUpperCase() + typeCandidate.slice(1)
    const description =
      getString((node.data as Record<string, unknown> | undefined)?.description) ??
      getString(node.description) ??
      ''

    const position = normalizePosition(node.position, i)
    normalized.push({
      ...(node as CanvasNode),
      id,
      type: 'block',
      position,
      data: {
        ...(node.data as Record<string, unknown>),
        label,
        description,
        blockType: typeCandidate,
      } as CanvasNode['data'],
    })
  }
  return normalized
}

function normalizeEdges(edges: unknown[]): CanvasEdge[] | null {
  const normalized: CanvasEdge[] = []
  for (let i = 0; i < edges.length; i++) {
    const raw = edges[i]
    if (!raw || typeof raw !== 'object') {
      console.error(`Invalid edge at index ${i}`)
      return null
    }
    const edge = raw as Record<string, unknown>
    const source = getString(edge.source)
    const target = getString(edge.target)
    if (!source || !target) {
      console.error(`Invalid edge endpoints at index ${i}`)
      return null
    }
    normalized.push({
      ...(edge as CanvasEdge),
      id: getString(edge.id) ?? `edge-${i + 1}`,
      source,
      target,
    })
  }
  return normalized
}

function normalizePosition(position: unknown, index: number): CanvasNode['position'] {
  if (
    position &&
    typeof position === 'object' &&
    typeof (position as Record<string, unknown>).x === 'number' &&
    typeof (position as Record<string, unknown>).y === 'number'
  ) {
    return {
      x: (position as Record<string, number>).x,
      y: (position as Record<string, number>).y,
    }
  }
  return { x: (index % 6) * 240, y: Math.floor(index / 6) * 160 }
}

function getString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null
}

function isValidBlockType(value: string): value is CanvasNode['data']['blockType'] {
  return (validBlockTypes as readonly string[]).includes(value)
}

function detectCircularDependencies(
  nodes: CanvasNode[],
  edges: CanvasEdge[]
): boolean {
  const adj = new Map<string, string[]>()
  for (const node of nodes) {
    adj.set(node.id, [])
  }
  for (const edge of edges) {
    adj.get(edge.source)?.push(edge.target)
  }

  const visited = new Set<string>()
  const rec = new Set<string>()

  function dfs(id: string): boolean {
    visited.add(id)
    rec.add(id)
    for (const next of adj.get(id) || []) {
      if (!visited.has(next)) {
        if (dfs(next)) return true
      } else if (rec.has(next)) {
        return true
      }
    }
    rec.delete(id)
    return false
  }

  for (const node of nodes) {
    if (!visited.has(node.id)) {
      if (dfs(node.id)) return true
    }
  }
  return false
}
