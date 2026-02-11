/**
 * Agent Tree Data Structure and Utilities
 * Handles hierarchical agent relationships for dashboard visualization
 */

export interface AgentMetrics {
  cpu: number // 0-100%
  memory: number // 0-100%
  tokensPerMin: number
  cost: number // cumulative $
}

export interface Agent {
  id: string
  name: string
  type: "orchestrator" | "codegen" | "reviewer" | "tester" | "deployer" | "other"
  status: "idle" | "processing" | "waiting" | "error" | "complete" | "paused" | "terminated"
  metrics: AgentMetrics
  lastHeartbeat: number // timestamp
  parentId?: string
  childIds: string[]
  project?: string
}

export interface AgentTreeNode {
  agent: Agent
  children: AgentTreeNode[]
  isExpanded: boolean
  isSelected: boolean
}

/**
 * Build hierarchical tree from flat agent list
 * Orchestrators become roots, agents with parentId nested under them
 */
export function buildAgentTree(agents: Agent[]): AgentTreeNode[] {
  const agentMap = new Map<string, Agent>(agents.map(a => [a.id, a]))
  const nodeMap = new Map<string, AgentTreeNode>()

  // Create all nodes
  agents.forEach(agent => {
    nodeMap.set(agent.id, {
      agent,
      children: [],
      isExpanded: true,
      isSelected: false,
    })
  })

  // Build parent-child relationships
  const roots: AgentTreeNode[] = []
  agents.forEach(agent => {
    const node = nodeMap.get(agent.id)!
    if (agent.parentId) {
      const parentNode = nodeMap.get(agent.parentId)
      if (parentNode) {
        parentNode.children.push(node)
      }
    } else {
      // Agents without parent are roots
      roots.push(node)
    }
  })

  // Sort: orchestrators first, then by type
  return roots.sort((a, b) => {
    const aIsOrch = a.agent.type === "orchestrator" ? 0 : 1
    const bIsOrch = b.agent.type === "orchestrator" ? 0 : 1
    if (aIsOrch !== bIsOrch) return aIsOrch - bIsOrch
    return a.agent.name.localeCompare(b.agent.name)
  })
}

/**
 * Flatten tree to list with depth tracking for rendering
 * Used for virtualization: only render visible items
 */
export interface FlattenedNode {
  node: AgentTreeNode
  depth: number
  index: number
}

export function flattenTree(roots: AgentTreeNode[]): FlattenedNode[] {
  const flattened: FlattenedNode[] = []
  let index = 0

  function traverse(node: AgentTreeNode, depth: number) {
    flattened.push({ node, depth, index: index++ })
    if (node.isExpanded) {
      node.children.forEach(child => traverse(child, depth + 1))
    }
  }

  roots.forEach(root => traverse(root, 0))
  return flattened
}

/**
 * Compute aggregate metrics for parent agents
 * (sum of children or weighted average, depending on metric)
 */
export function aggregateChildMetrics(node: AgentTreeNode): AgentMetrics {
  if (node.children.length === 0) {
    return node.agent.metrics
  }

  const childMetrics = node.children.map(child => aggregateChildMetrics(child))

  return {
    cpu: Math.max(...childMetrics.map(m => m.cpu), node.agent.metrics.cpu),
    memory: Math.max(...childMetrics.map(m => m.memory), node.agent.metrics.memory),
    tokensPerMin: childMetrics.reduce((sum, m) => sum + m.tokensPerMin, node.agent.metrics.tokensPerMin),
    cost: childMetrics.reduce((sum, m) => sum + m.cost, node.agent.metrics.cost),
  }
}

/**
 * Get visible agents count (respecting expand/collapse state)
 */
export function getVisibleAgentCount(roots: AgentTreeNode[]): number {
  return flattenTree(roots).length
}

/**
 * Toggle expand/collapse state for a node
 */
export function toggleNodeExpanded(node: AgentTreeNode): void {
  node.isExpanded = !node.isExpanded
}

/**
 * Select/deselect a node
 */
export function toggleNodeSelection(node: AgentTreeNode): void {
  node.isSelected = !node.isSelected
}

/**
 * Get all selected agents (recursively)
 */
export function getSelectedAgents(roots: AgentTreeNode[]): Agent[] {
  const selected: Agent[] = []

  function traverse(node: AgentTreeNode) {
    if (node.isSelected) {
      selected.push(node.agent)
    }
    node.children.forEach(child => traverse(child))
  }

  roots.forEach(root => traverse(root))
  return selected
}

/**
 * Filter agents by type, status, or search query
 * Returns new tree with non-matching nodes hidden (collapsed)
 */
export function filterAgentTree(
  roots: AgentTreeNode[],
  predicate: (agent: Agent) => boolean
): AgentTreeNode[] {
  function shouldShowNode(node: AgentTreeNode): boolean {
    const nodeMatches = predicate(node.agent)
    const childMatches = node.children.some(child => shouldShowNode(child))
    return nodeMatches || childMatches
  }

  function filterNode(node: AgentTreeNode): AgentTreeNode | null {
    const childrenFiltered = node.children
      .map(child => filterNode(child))
      .filter((child): child is AgentTreeNode => child !== null)

    if (!predicate(node.agent) && childrenFiltered.length === 0) {
      return null
    }

    return {
      ...node,
      children: childrenFiltered,
      isExpanded: childrenFiltered.length > 0 ? true : node.isExpanded, // Auto-expand if filtered children exist
    }
  }

  return roots
    .map(root => filterNode(root))
    .filter((root): root is AgentTreeNode => root !== null)
}

/**
 * Mock data for development/testing
 */
export function generateMockAgents(count: number = 50): Agent[] {
  const agents: Agent[] = []
  const types: Agent['type'][] = ["orchestrator", "codegen", "reviewer", "tester", "deployer"]
  const projects = ["Project-A", "Project-B", "Project-C"]

  // Create 5 orchestrators as roots
  for (let i = 0; i < 5; i++) {
    agents.push({
      id: `orchestrator-${i}`,
      name: `Orchestrator-${i}`,
      type: "orchestrator",
      status: "processing",
      metrics: {
        cpu: Math.random() * 100,
        memory: Math.random() * 100,
        tokensPerMin: Math.floor(Math.random() * 1000),
        cost: Math.random() * 100,
      },
      lastHeartbeat: Date.now(),
      childIds: [],
      project: projects[i % projects.length],
    })
  }

  // Create worker agents as children
  let parentIdx = 0
  for (let i = 0; i < count - 5; i++) {
    const parentId = `orchestrator-${parentIdx % 5}`
    const parent = agents.find(a => a.id === parentId)!
    const agentId = `agent-${i}`

    agents.push({
      id: agentId,
      name: `${types[(i % types.length) + 1]}-${i}`,
      type: types[(i % types.length) + 1],
      status: ["idle", "processing", "waiting", "error", "complete"][i % 5] as Agent['status'],
      metrics: {
        cpu: Math.random() * 100,
        memory: Math.random() * 100,
        tokensPerMin: Math.floor(Math.random() * 1000),
        cost: Math.random() * 50,
      },
      lastHeartbeat: Date.now() - Math.random() * 10000,
      parentId,
      childIds: [],
      project: parent.project,
    })

    parent.childIds.push(agentId)
    parentIdx++
  }

  return agents
}
