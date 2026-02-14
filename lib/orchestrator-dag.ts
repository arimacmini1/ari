import type { Edge, Node } from "reactflow"

export type DagNodeKind = "agent" | "decision" | "task"

export function criticalPathLength(nodes: Node[], edges: Edge[]): number {
  if (nodes.length === 0) return 0

  const ids = new Set(nodes.map((node) => node.id))
  const outgoing = new Map<string, string[]>()
  const indegree = new Map<string, number>()
  for (const id of ids) {
    outgoing.set(id, [])
    indegree.set(id, 0)
  }

  for (const edge of edges) {
    if (!ids.has(edge.source) || !ids.has(edge.target)) continue
    outgoing.get(edge.source)?.push(edge.target)
    indegree.set(edge.target, (indegree.get(edge.target) ?? 0) + 1)
  }

  const queue: string[] = []
  for (const [id, degree] of indegree.entries()) {
    if (degree === 0) queue.push(id)
  }

  const topo: string[] = []
  while (queue.length > 0) {
    const id = queue.shift()!
    topo.push(id)
    for (const next of outgoing.get(id) ?? []) {
      const degree = (indegree.get(next) ?? 0) - 1
      indegree.set(next, degree)
      if (degree === 0) queue.push(next)
    }
  }

  // If graph has cycles, return a conservative fallback.
  if (topo.length !== ids.size) return 1

  const distance = new Map<string, number>()
  for (const id of topo) {
    const base = distance.get(id) ?? 1
    for (const next of outgoing.get(id) ?? []) {
      const candidate = base + 1
      if (candidate > (distance.get(next) ?? 1)) {
        distance.set(next, candidate)
      }
    }
  }

  let longest = 1
  for (const value of distance.values()) {
    if (value > longest) longest = value
  }
  return longest
}

export function estimateRecommendedAgents(input: {
  taskCount: number
  criticalPath: number
  priority: number
}): number {
  const taskCount = Math.max(0, input.taskCount)
  const criticalPath = Math.max(1, input.criticalPath)
  const base = Math.max(1, Math.ceil(taskCount / 3))
  const parallelCapacity = Math.max(0, taskCount - criticalPath)
  const parallelBonus = Math.ceil(parallelCapacity / 2)
  const priorityBoost = input.priority >= 8 ? 2 : input.priority >= 5 ? 1 : 0
  return Math.min(100, base + parallelBonus + priorityBoost)
}

