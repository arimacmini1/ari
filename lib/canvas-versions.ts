import type { CanvasState } from './canvas-state'

export interface CanvasVersion {
  version_id: string
  canvas_id: string
  timestamp: string
  user_id: string
  actor_name: string
  save_source: "manual" | "autosave" | "rollback"
  collaborator_count: number
  collaborator_names: string[]
  rollback_from_version_id: string | null
  canvas_json: CanvasState
  parent_version_id: string | null
  diff_summary: {
    nodes_added: number
    nodes_removed: number
    nodes_modified: number
    edges_added: number
    edges_removed: number
  }
}

export function computeDiffSummary(
  prev: CanvasState,
  next: CanvasState
): CanvasVersion['diff_summary'] {
  const prevNodeIds = new Set(prev.nodes.map((n) => n.id))
  const nextNodeIds = new Set(next.nodes.map((n) => n.id))

  let nodes_added = 0
  let nodes_removed = 0
  let nodes_modified = 0

  for (const id of nextNodeIds) {
    if (!prevNodeIds.has(id)) {
      nodes_added++
    }
  }
  for (const id of prevNodeIds) {
    if (!nextNodeIds.has(id)) {
      nodes_removed++
    }
  }

  const prevNodeMap = new Map(prev.nodes.map((n) => [n.id, n]))
  for (const node of next.nodes) {
    const prevNode = prevNodeMap.get(node.id)
    if (prevNode) {
      const prevData = JSON.stringify(prevNode.data)
      const nextData = JSON.stringify(node.data)
      if (prevData !== nextData) {
        nodes_modified++
      }
    }
  }

  const prevEdgeKeys = new Set(prev.edges.map((e) => `${e.source}->${e.target}`))
  const nextEdgeKeys = new Set(next.edges.map((e) => `${e.source}->${e.target}`))

  let edges_added = 0
  let edges_removed = 0

  for (const key of nextEdgeKeys) {
    if (!prevEdgeKeys.has(key)) edges_added++
  }
  for (const key of prevEdgeKeys) {
    if (!nextEdgeKeys.has(key)) edges_removed++
  }

  return { nodes_added, nodes_removed, nodes_modified, edges_added, edges_removed }
}

export class CanvasVersionStore {
  private versions: Map<string, CanvasVersion[]> = new Map()
  private static readonly MAX_VERSIONS = 250

  save(
    canvasId: string,
    state: CanvasState,
    options?: {
      userId?: string
      actorName?: string
      saveSource?: "manual" | "autosave" | "rollback"
      collaboratorNames?: string[]
      rollbackFromVersionId?: string | null
    }
  ): CanvasVersion {
    const existing = this.versions.get(canvasId) ?? []
    const lastVersion = existing.length > 0 ? existing[existing.length - 1] : null

    const emptyState: CanvasState = { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } }
    const prevState = lastVersion?.canvas_json ?? emptyState

    const version: CanvasVersion = {
      version_id: `v-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      canvas_id: canvasId,
      timestamp: new Date().toISOString(),
      user_id: options?.userId ?? "anonymous",
      actor_name: options?.actorName ?? "anonymous",
      save_source: options?.saveSource ?? "manual",
      collaborator_count: options?.collaboratorNames?.length ?? 0,
      collaborator_names: options?.collaboratorNames ?? [],
      rollback_from_version_id: options?.rollbackFromVersionId ?? null,
      canvas_json: structuredClone(state),
      parent_version_id: lastVersion?.version_id ?? null,
      diff_summary: computeDiffSummary(prevState, state),
    }

    existing.push(version)
    if (existing.length > CanvasVersionStore.MAX_VERSIONS) {
      existing.splice(0, existing.length - CanvasVersionStore.MAX_VERSIONS)
    }
    this.versions.set(canvasId, existing)
    return version
  }

  getVersions(canvasId: string): CanvasVersion[] {
    return this.versions.get(canvasId) ?? []
  }

  getVersion(canvasId: string, versionId: string): CanvasVersion | null {
    const versions = this.versions.get(canvasId) ?? []
    return versions.find((v) => v.version_id === versionId) ?? null
  }

  revert(canvasId: string, versionId: string): CanvasState | null {
    const version = this.getVersion(canvasId, versionId)
    if (!version) return null
    return structuredClone(version.canvas_json)
  }
}
