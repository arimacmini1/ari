import type { CanvasState, CanvasNode, CanvasEdge } from "@/lib/canvas-state"

export interface MergeConflict {
  id: string
  type: "node" | "edge"
  ours?: CanvasNode | CanvasEdge | null
  theirs?: CanvasNode | CanvasEdge | null
}

function equal(a: unknown, b: unknown) {
  return JSON.stringify(a) === JSON.stringify(b)
}

export function threeWayMerge(base: CanvasState, ours: CanvasState, theirs: CanvasState) {
  const mergedNodes: Map<string, CanvasNode> = new Map()
  const mergedEdges: Map<string, CanvasEdge> = new Map()
  const conflicts: MergeConflict[] = []

  const baseNodes = new Map(base.nodes.map((n) => [n.id, n]))
  const ourNodes = new Map(ours.nodes.map((n) => [n.id, n]))
  const theirNodes = new Map(theirs.nodes.map((n) => [n.id, n]))

  const nodeIds = new Set<string>([...baseNodes.keys(), ...ourNodes.keys(), ...theirNodes.keys()])
  for (const id of nodeIds) {
    const baseNode = baseNodes.get(id) ?? null
    const ourNode = ourNodes.get(id) ?? null
    const theirNode = theirNodes.get(id) ?? null

    const ourChanged = !equal(baseNode, ourNode)
    const theirChanged = !equal(baseNode, theirNode)

    if (ourChanged && theirChanged && !equal(ourNode, theirNode)) {
      conflicts.push({ id, type: "node", ours: ourNode, theirs: theirNode })
      continue
    }

    const winner = theirChanged ? theirNode : ourNode
    if (winner) mergedNodes.set(id, winner as CanvasNode)
  }

  const baseEdges = new Map(base.edges.map((e) => [e.id, e]))
  const ourEdges = new Map(ours.edges.map((e) => [e.id, e]))
  const theirEdges = new Map(theirs.edges.map((e) => [e.id, e]))

  const edgeIds = new Set<string>([...baseEdges.keys(), ...ourEdges.keys(), ...theirEdges.keys()])
  for (const id of edgeIds) {
    const baseEdge = baseEdges.get(id) ?? null
    const ourEdge = ourEdges.get(id) ?? null
    const theirEdge = theirEdges.get(id) ?? null

    const ourChanged = !equal(baseEdge, ourEdge)
    const theirChanged = !equal(baseEdge, theirEdge)

    if (ourChanged && theirChanged && !equal(ourEdge, theirEdge)) {
      conflicts.push({ id, type: "edge", ours: ourEdge, theirs: theirEdge })
      continue
    }

    const winner = theirChanged ? theirEdge : ourEdge
    if (winner) mergedEdges.set(id, winner as CanvasEdge)
  }

  return {
    merged: {
      ...ours,
      nodes: Array.from(mergedNodes.values()),
      edges: Array.from(mergedEdges.values()),
    } satisfies CanvasState,
    conflicts,
  }
}
