import type { BlockType } from "@/lib/canvas-state"

export const CONNECTION_RULES: Record<BlockType, BlockType[]> = {
  task: ["task", "decision", "loop", "parallel", "artifact", "preview", "memory"],
  decision: ["task", "loop", "parallel", "artifact", "preview", "memory"],
  loop: ["task", "decision", "parallel", "artifact", "preview", "memory"],
  parallel: ["task", "decision", "loop", "artifact", "preview", "memory"],
  text: ["task", "decision", "memory"],
  artifact: [],
  preview: [],
  memory: ["task", "decision", "artifact", "preview"],
}

export function wouldCreateCycle(
  sourceId: string,
  targetId: string,
  existingEdges: Array<{ source: string; target: string }>
): boolean {
  const adjacency = new Map<string, string[]>()
  for (const edge of existingEdges) {
    if (!adjacency.has(edge.source)) adjacency.set(edge.source, [])
    adjacency.get(edge.source)!.push(edge.target)
  }

  const visited = new Set<string>()
  const queue = [targetId]
  while (queue.length > 0) {
    const current = queue.shift()!
    if (current === sourceId) return true
    if (visited.has(current)) continue
    visited.add(current)
    const neighbors = adjacency.get(current) || []
    queue.push(...neighbors)
  }
  return false
}

export function isValidConnection(
  sourceType: BlockType,
  targetType: BlockType,
  sourceId: string,
  targetId: string,
  existingEdges: Array<{ source: string; target: string }>,
  _nodes: Array<{ id: string }>
): { valid: boolean; reason?: string } {
  if (sourceId === targetId) {
    return { valid: false, reason: "Cannot connect a block to itself" }
  }

  const allowedTargets = CONNECTION_RULES[sourceType]
  if (!allowedTargets || !allowedTargets.includes(targetType)) {
    return {
      valid: false,
      reason: `${sourceType} cannot connect to ${targetType}`,
    }
  }

  if (wouldCreateCycle(sourceId, targetId, existingEdges)) {
    return { valid: false, reason: "Connection would create a circular dependency" }
  }

  return { valid: true }
}
