import { v4 as uuidv4 } from "uuid"
import type { CanvasState, CanvasNode, CanvasEdge } from "@/lib/canvas-state"

export type CollabOpType =
  | "node:add"
  | "node:update"
  | "node:remove"
  | "edge:add"
  | "edge:update"
  | "edge:remove"

export interface CollabOperation {
  id: string
  clientId: string
  ts: number
  type: CollabOpType
  node?: CanvasNode
  edge?: CanvasEdge
  targetId?: string
}

export interface CollabVersions {
  nodeTs: Map<string, number>
  edgeTs: Map<string, number>
}

export function createOpId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID()
  }
  return uuidv4()
}

function nodeKey(node: CanvasNode) {
  return node.id
}

function edgeKey(edge: CanvasEdge) {
  return edge.id
}

export function diffCanvasState(prev: CanvasState, next: CanvasState, clientId: string): CollabOperation[] {
  const ops: CollabOperation[] = []
  const now = Date.now()

  const prevNodes = new Map(prev.nodes.map((n) => [nodeKey(n), n]))
  const nextNodes = new Map(next.nodes.map((n) => [nodeKey(n), n]))

  for (const [id, node] of nextNodes.entries()) {
    const prevNode = prevNodes.get(id)
    if (!prevNode) {
      ops.push({ id: createOpId(), clientId, ts: now, type: "node:add", node })
    } else if (JSON.stringify(prevNode) !== JSON.stringify(node)) {
      ops.push({ id: createOpId(), clientId, ts: now, type: "node:update", node })
    }
  }

  for (const [id] of prevNodes.entries()) {
    if (!nextNodes.has(id)) {
      ops.push({ id: createOpId(), clientId, ts: now, type: "node:remove", targetId: id })
    }
  }

  const prevEdges = new Map(prev.edges.map((e) => [edgeKey(e), e]))
  const nextEdges = new Map(next.edges.map((e) => [edgeKey(e), e]))

  for (const [id, edge] of nextEdges.entries()) {
    const prevEdge = prevEdges.get(id)
    if (!prevEdge) {
      ops.push({ id: createOpId(), clientId, ts: now, type: "edge:add", edge })
    } else if (JSON.stringify(prevEdge) !== JSON.stringify(edge)) {
      ops.push({ id: createOpId(), clientId, ts: now, type: "edge:update", edge })
    }
  }

  for (const [id] of prevEdges.entries()) {
    if (!nextEdges.has(id)) {
      ops.push({ id: createOpId(), clientId, ts: now, type: "edge:remove", targetId: id })
    }
  }

  return ops
}

export function applyOperations(state: CanvasState, ops: CollabOperation[], versions: CollabVersions): CanvasState {
  const nodes = new Map(state.nodes.map((n) => [nodeKey(n), n]))
  const edges = new Map(state.edges.map((e) => [edgeKey(e), e]))

  for (const op of ops) {
    if (op.type.startsWith("node")) {
      const targetId = op.node?.id ?? op.targetId
      if (!targetId) continue
      const lastTs = versions.nodeTs.get(targetId) ?? 0
      if (op.ts < lastTs) continue
      versions.nodeTs.set(targetId, op.ts)
      if (op.type === "node:remove") {
        nodes.delete(targetId)
      } else if (op.node) {
        nodes.set(targetId, op.node)
      }
    }

    if (op.type.startsWith("edge")) {
      const targetId = op.edge?.id ?? op.targetId
      if (!targetId) continue
      const lastTs = versions.edgeTs.get(targetId) ?? 0
      if (op.ts < lastTs) continue
      versions.edgeTs.set(targetId, op.ts)
      if (op.type === "edge:remove") {
        edges.delete(targetId)
      } else if (op.edge) {
        edges.set(targetId, op.edge)
      }
    }
  }

  return {
    ...state,
    nodes: Array.from(nodes.values()),
    edges: Array.from(edges.values()),
  }
}
