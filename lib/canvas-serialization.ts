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
      const data = json as CanvasJSON

      // Schema validation
      if (!data.version || data.version !== '1') {
        console.error('Invalid canvas version')
        return null
      }
      if (!Array.isArray(data.nodes) || !Array.isArray(data.edges)) {
        console.error('Invalid nodes/edges structure')
        return null
      }
      if (!data.viewport || typeof data.viewport.x !== 'number') {
        console.error('Invalid viewport')
        return null
      }

      // Validate node types
      const validBlockTypes = ['task', 'decision', 'loop', 'parallel', 'text', 'artifact', 'preview']
      for (const node of data.nodes) {
        if (!node.data?.blockType || !validBlockTypes.includes(node.data.blockType)) {
          console.error(`Invalid block type: ${node.data?.blockType}`)
          return null
        }
      }

      // Check for circular dependencies
      const hasCircle = detectCircularDependencies(data.nodes, data.edges)
      if (hasCircle) {
        console.error('Circular dependencies detected')
        return null
      }

      // Check for orphaned nodes
      const nodeIds = new Set(data.nodes.map((n) => n.id))
      for (const edge of data.edges) {
        if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
          console.error(`Orphaned edge: ${edge.source} -> ${edge.target}`)
          return null
        }
      }

      return {
        nodes: data.nodes,
        edges: data.edges,
        viewport: data.viewport,
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
