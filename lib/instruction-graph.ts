import type { CanvasNode, CanvasEdge, BlockType } from './canvas-state'

export interface InstructionTask {
  task_id: string
  task_type: 'atomic' | 'conditional' | 'iteration' | 'concurrent' | 'input' | 'output'
  description: string
  agent_type_hint: string
  priority: number
  source_node_id: string
  properties: Record<string, unknown>
}

export interface InstructionDependency {
  from_task_id: string
  to_task_id: string
  dependency_type: 'sequential' | 'conditional' | 'parallel'
}

export interface InstructionGraph {
  graph_id: string
  tasks: InstructionTask[]
  dependencies: InstructionDependency[]
  metadata: {
    total_tasks: number
    estimated_agents: number
    estimated_cost_cents: number
    estimated_duration_ms: number
    created_at: string
    canvas_node_count: number
    canvas_edge_count: number
  }
}

const BLOCK_TYPE_TO_TASK_TYPE: Record<BlockType, InstructionTask['task_type']> = {
  task: 'atomic',
  decision: 'conditional',
  loop: 'iteration',
  parallel: 'concurrent',
  text: 'input',
  artifact: 'output',
  preview: 'output',
}

function inferAgentTypeHint(node: CanvasNode): string {
  if (node.data.agentType) return node.data.agentType

  const label = (node.data.label ?? '').toLowerCase()
  if (label.includes('test')) return 'test-runner'
  if (label.includes('deploy')) return 'deploy-agent'
  if (label.includes('ui') || label.includes('design')) return 'ui-designer'
  return 'code-gen'
}

function buildAdjacency(nodes: CanvasNode[], edges: CanvasEdge[]) {
  const forward = new Map<string, string[]>()
  const reverse = new Map<string, string[]>()
  for (const node of nodes) {
    forward.set(node.id, [])
    reverse.set(node.id, [])
  }
  for (const edge of edges) {
    forward.get(edge.source)?.push(edge.target)
    reverse.get(edge.target)?.push(edge.source)
  }
  return { forward, reverse }
}

function detectCycle(nodes: CanvasNode[], forward: Map<string, string[]>): string | null {
  const visited = new Set<string>()
  const rec = new Set<string>()

  function dfs(id: string): string | null {
    visited.add(id)
    rec.add(id)
    for (const next of forward.get(id) ?? []) {
      if (!visited.has(next)) {
        const result = dfs(next)
        if (result) return result
      } else if (rec.has(next)) {
        return `Cycle detected: edge from "${id}" to "${next}" creates a circular dependency`
      }
    }
    rec.delete(id)
    return null
  }

  for (const node of nodes) {
    if (!visited.has(node.id)) {
      const result = dfs(node.id)
      if (result) return result
    }
  }
  return null
}

function computeTopologicalDepths(
  nodes: CanvasNode[],
  forward: Map<string, string[]>,
  reverse: Map<string, string[]>
): Map<string, number> {
  const inDegree = new Map<string, number>()
  for (const node of nodes) {
    inDegree.set(node.id, (reverse.get(node.id) ?? []).length)
  }

  const queue: string[] = []
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id)
  }

  const depth = new Map<string, number>()
  while (queue.length > 0) {
    const id = queue.shift()!
    const d = depth.get(id) ?? 0
    for (const next of forward.get(id) ?? []) {
      depth.set(next, Math.max(depth.get(next) ?? 0, d + 1))
      inDegree.set(next, (inDegree.get(next) ?? 1) - 1)
      if (inDegree.get(next) === 0) queue.push(next)
    }
  }

  for (const node of nodes) {
    if (!depth.has(node.id)) depth.set(node.id, 0)
  }

  return depth
}

function longestPathLength(
  nodes: CanvasNode[],
  forward: Map<string, string[]>,
  depths: Map<string, number>
): number {
  if (nodes.length === 0) return 0
  let max = 0
  for (const [, d] of depths) {
    if (d > max) max = d
  }
  return max + 1
}

function classifyDependencyType(
  sourceNode: CanvasNode,
  _targetNode: CanvasNode
): InstructionDependency['dependency_type'] {
  if (sourceNode.data.blockType === 'decision') return 'conditional'
  if (sourceNode.data.blockType === 'parallel') return 'parallel'
  return 'sequential'
}

export function parseCanvasToInstructionGraph(
  nodes: CanvasNode[],
  edges: CanvasEdge[]
): InstructionGraph {
  const { forward, reverse } = buildAdjacency(nodes, edges)

  const cycleMsg = detectCycle(nodes, forward)
  if (cycleMsg) {
    throw new Error(cycleMsg)
  }

  const depths = computeTopologicalDepths(nodes, forward, reverse)
  const maxDepth = nodes.length > 0 ? Math.max(...Array.from(depths.values())) : 0

  const nodeMap = new Map<string, CanvasNode>()
  for (const node of nodes) nodeMap.set(node.id, node)

  const nodeIdToTaskId = new Map<string, string>()
  const tasks: InstructionTask[] = nodes.map((node) => {
    const taskId = `task-${node.id}`
    nodeIdToTaskId.set(node.id, taskId)

    const depth = depths.get(node.id) ?? 0
    const priority = maxDepth > 0 ? Math.round(((maxDepth - depth) / maxDepth) * 100) : 100

    return {
      task_id: taskId,
      task_type: BLOCK_TYPE_TO_TASK_TYPE[node.data.blockType] ?? 'atomic',
      description: node.data.description ?? node.data.label ?? '',
      agent_type_hint: inferAgentTypeHint(node),
      priority,
      source_node_id: node.id,
      properties: {
        label: node.data.label,
        blockType: node.data.blockType,
        ...(node.data.loopCount != null ? { loopCount: node.data.loopCount } : {}),
        ...(node.data.conditionText ? { conditionText: node.data.conditionText } : {}),
      },
    }
  })

  const dependencies: InstructionDependency[] = edges
    .filter((edge) => nodeMap.has(edge.source) && nodeMap.has(edge.target))
    .map((edge) => ({
      from_task_id: nodeIdToTaskId.get(edge.source)!,
      to_task_id: nodeIdToTaskId.get(edge.target)!,
      dependency_type: classifyDependencyType(
        nodeMap.get(edge.source)!,
        nodeMap.get(edge.target)!
      ),
    }))

  const uniqueAgents = new Set(tasks.map((t) => t.agent_type_hint))
  const longestPath = longestPathLength(nodes, forward, depths)

  const graphId = `graph-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

  return {
    graph_id: graphId,
    tasks,
    dependencies,
    metadata: {
      total_tasks: tasks.length,
      estimated_agents: uniqueAgents.size,
      estimated_cost_cents: tasks.length * 50,
      estimated_duration_ms: longestPath * 3000,
      created_at: new Date().toISOString(),
      canvas_node_count: nodes.length,
      canvas_edge_count: edges.length,
    },
  }
}

export function hashTask(node: CanvasNode): string {
  const parts = [
    node.data.blockType,
    node.data.label ?? '',
    JSON.stringify(node.data.description ?? ''),
    JSON.stringify(node.data.loopCount ?? ''),
    JSON.stringify(node.data.conditionText ?? ''),
    JSON.stringify(node.data.agentType ?? ''),
  ]
  return parts.join('|')
}
