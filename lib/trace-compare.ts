import { DecisionNode, TraceExecution, flattenDecisionTree } from "@/lib/trace-model"
import {
  TraceComparison,
  TraceDecisionDelta,
  TraceDiffSummary,
  TraceTradeoffMetrics,
} from "@/lib/trace-compare-model"

function cloneDecisionNode(node: DecisionNode): DecisionNode {
  return {
    ...node,
    alternatives_considered: node.alternatives_considered
      ? node.alternatives_considered.map((alt) => ({ ...alt }))
      : undefined,
    children: node.children ? node.children.map(cloneDecisionNode) : undefined,
  }
}

function hashString(input: string): number {
  let hash = 0
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0
  }
  return hash
}

function deterministicJitter(seed: string, min: number, max: number): number {
  const h = hashString(seed) % 10000
  const ratio = h / 9999
  return min + (max - min) * ratio
}

function findDecisionNode(nodes: DecisionNode[], nodeId: string): DecisionNode | null {
  for (const node of nodes) {
    if (node.node_id === nodeId) return node
    if (node.children?.length) {
      const found = findDecisionNode(node.children, nodeId)
      if (found) return found
    }
  }
  return null
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function sumOrZero(values: Array<number | undefined>): number {
  return values.reduce<number>((acc, v) => acc + (typeof v === "number" ? v : 0), 0)
}

function avgOrZero(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((a, b) => a + b, 0) / values.length
}

function applyAlternativeOutcome(root: DecisionNode, alternativeOutcome: string): DecisionNode {
  const alt = cloneDecisionNode(root)
  alt.decision_outcome = alternativeOutcome

  // Heuristic drift to make comparisons more interesting without pretending this is "real" re-execution.
  // Downstream nodes are slightly perturbed; this is explicitly labeled as estimated in the UI note.
  const flat = flattenDecisionTree([alt])
  for (const node of flat) {
    if (node.node_id === alt.node_id) {
      node.confidence_score = clamp(node.confidence_score - 8, 0, 100)
      continue
    }

    node.confidence_score = clamp(
      node.confidence_score + deterministicJitter(`${node.node_id}:confidence`, -3, 3),
      0,
      100
    )
    if (typeof node.cost === "number") {
      node.cost = Math.max(
        0,
        node.cost * (1 + deterministicJitter(`${node.node_id}:cost`, -0.04, 0.04))
      )
    }
    if (typeof node.duration === "number") {
      node.duration = Math.max(
        0,
        node.duration * (1 + deterministicJitter(`${node.node_id}:duration`, -0.06, 0.06))
      )
    }
  }

  return alt
}

function cloneTraceExecution(execution: TraceExecution): TraceExecution {
  return {
    ...execution,
    root_decisions: execution.root_decisions.map(cloneDecisionNode),
  }
}

function findDecisionNodeMutable(nodes: DecisionNode[], nodeId: string): DecisionNode | null {
  for (const node of nodes) {
    if (node.node_id === nodeId) return node
    if (node.children?.length) {
      const found = findDecisionNodeMutable(node.children, nodeId)
      if (found) return found
    }
  }
  return null
}

function applyScopedPerturbation(root: DecisionNode, alternativeOutcome: string) {
  const rootFlat = flattenDecisionTree([root])
  for (const [index, node] of rootFlat.entries()) {
    const depthPenalty = Math.min(8, index)
    if (node.node_id === root.node_id) {
      node.decision_outcome = alternativeOutcome
      node.decision_context = `${node.decision_context}\n\n[Forked alternative selected]: ${alternativeOutcome}`
      node.confidence_score = clamp(node.confidence_score - 6, 0, 100)
    } else {
      node.confidence_score = clamp(
        node.confidence_score + deterministicJitter(`${alternativeOutcome}:${node.node_id}:confidence`, -5, 4) - depthPenalty * 0.2,
        0,
        100
      )
    }

    if (typeof node.cost === "number") {
      node.cost = Math.max(
        0,
        node.cost * (1 + deterministicJitter(`${alternativeOutcome}:${node.node_id}:cost`, -0.08, 0.12))
      )
    }
    if (typeof node.duration === "number") {
      node.duration = Math.max(
        0,
        node.duration * (1 + deterministicJitter(`${alternativeOutcome}:${node.node_id}:duration`, -0.1, 0.15))
      )
    }
  }
}

export function buildScopedForkExecution(options: {
  execution: TraceExecution
  forkExecutionId: string
  forkNodeId: string
  alternativeOutcome: string
}): { forkedExecution: TraceExecution; affected_nodes: number } {
  const { execution, forkExecutionId, forkNodeId, alternativeOutcome } = options
  const forkedExecution = cloneTraceExecution(execution)

  const forkNode = findDecisionNodeMutable(forkedExecution.root_decisions, forkNodeId)
  if (!forkNode) {
    throw new Error(`Decision node not found: ${forkNodeId}`)
  }

  const subtreeCount = flattenDecisionTree([forkNode]).length
  if (subtreeCount > 3000) {
    throw new Error(`Fork subtree too large to re-execute safely (${subtreeCount} nodes).`)
  }

  applyScopedPerturbation(forkNode, alternativeOutcome)

  const forkedFlat = flattenDecisionTree(forkedExecution.root_decisions)
  const totalCost = sumOrZero(forkedFlat.map((n) => n.cost))
  const totalDuration = sumOrZero(forkedFlat.map((n) => n.duration))

  forkedExecution.execution_id = forkExecutionId
  forkedExecution.start_time = new Date().toISOString()
  forkedExecution.status = "warning"
  forkedExecution.cost = totalCost
  forkedExecution.duration = totalDuration
  forkedExecution.source_execution_id = execution.execution_id
  forkedExecution.fork_node_id = forkNodeId
  forkedExecution.fork_mode = "scoped"

  return { forkedExecution, affected_nodes: subtreeCount }
}

function computeTradeoffs(basePath: DecisionNode, altPath: DecisionNode): TraceTradeoffMetrics {
  const baseFlat = flattenDecisionTree([basePath])
  const altFlat = flattenDecisionTree([altPath])
  const baseById = new Map(baseFlat.map((node) => [node.node_id, node] as const))
  const altById = new Map(altFlat.map((node) => [node.node_id, node] as const))

  const base_confidence_avg = avgOrZero(baseFlat.map((n) => n.confidence_score))
  const alt_confidence_avg = avgOrZero(altFlat.map((n) => n.confidence_score))

  const base_cost_total = sumOrZero(baseFlat.map((n) => n.cost))
  const alt_cost_total = sumOrZero(altFlat.map((n) => n.cost))

  const base_latency_total_s = sumOrZero(baseFlat.map((n) => n.duration))
  const alt_latency_total_s = sumOrZero(altFlat.map((n) => n.duration))

  const per_decision_deltas: TraceDecisionDelta[] = []
  for (const [nodeId, baseNode] of baseById.entries()) {
    const altNode = altById.get(nodeId)
    if (!altNode) continue
    per_decision_deltas.push({
      node_id: nodeId,
      label: altNode.label ?? baseNode.label,
      confidence_delta: altNode.confidence_score - baseNode.confidence_score,
      cost_delta: (altNode.cost ?? 0) - (baseNode.cost ?? 0),
      latency_delta_s: (altNode.duration ?? 0) - (baseNode.duration ?? 0),
      data_quality: "estimated",
    })
  }
  per_decision_deltas.sort((a, b) => {
    const magnitudeA =
      Math.abs(a.confidence_delta) + Math.abs(a.cost_delta) + Math.abs(a.latency_delta_s)
    const magnitudeB =
      Math.abs(b.confidence_delta) + Math.abs(b.cost_delta) + Math.abs(b.latency_delta_s)
    return magnitudeB - magnitudeA
  })

  return {
    base_confidence_avg,
    alt_confidence_avg,
    confidence_delta: alt_confidence_avg - base_confidence_avg,
    base_cost_total,
    alt_cost_total,
    cost_delta: alt_cost_total - base_cost_total,
    base_latency_total_s,
    alt_latency_total_s,
    latency_delta_s: alt_latency_total_s - base_latency_total_s,
    per_decision_deltas,
  }
}

function computeDiffSummary(basePath: DecisionNode, altPath: DecisionNode): TraceDiffSummary {
  const baseFlat = flattenDecisionTree([basePath])
  const altFlat = flattenDecisionTree([altPath])

  const baseById = new Map(baseFlat.map((n) => [n.node_id, n] as const))
  const altById = new Map(altFlat.map((n) => [n.node_id, n] as const))

  const changed_node_ids: string[] = []
  const added_node_ids: string[] = []
  const removed_node_ids: string[] = []

  for (const [id, altNode] of altById.entries()) {
    const baseNode = baseById.get(id)
    if (!baseNode) {
      added_node_ids.push(id)
      continue
    }

    if (
      baseNode.decision_outcome !== altNode.decision_outcome ||
      Math.round(baseNode.confidence_score) !== Math.round(altNode.confidence_score) ||
      ((typeof baseNode.cost === "number" || typeof altNode.cost === "number") &&
        Math.abs((baseNode.cost ?? 0) - (altNode.cost ?? 0)) > 1e-6) ||
      ((typeof baseNode.duration === "number" || typeof altNode.duration === "number") &&
        Math.abs((baseNode.duration ?? 0) - (altNode.duration ?? 0)) > 1e-6)
    ) {
      changed_node_ids.push(id)
    }
  }

  for (const id of baseById.keys()) {
    if (!altById.has(id)) removed_node_ids.push(id)
  }

  return { changed_node_ids, added_node_ids, removed_node_ids }
}

export function buildTraceComparison(options: {
  execution: TraceExecution
  forkNodeId: string
  alternativeOutcome: string
}): Omit<TraceComparison, "comparison_id" | "status" | "created_at"> {
  const { execution, forkNodeId, alternativeOutcome } = options

  const forkNode = findDecisionNode(execution.root_decisions, forkNodeId)
  if (!forkNode) {
    throw new Error(`Decision node not found: ${forkNodeId}`)
  }

  const base_path = cloneDecisionNode(forkNode)
  const baseCount = flattenDecisionTree([base_path]).length
  if (baseCount > 2500) {
    throw new Error(`Fork subtree too large to compare safely (${baseCount} nodes).`)
  }
  const alternative_path = applyAlternativeOutcome(base_path, alternativeOutcome)

  const tradeoff_metrics = computeTradeoffs(base_path, alternative_path)
  const diff_summary = computeDiffSummary(base_path, alternative_path)

  return {
    execution_id: execution.execution_id,
    fork_node_id: forkNodeId,
    selected_alternative_outcome: alternativeOutcome,
    base_path,
    alternative_path,
    diff_summary,
    tradeoff_metrics,
    note: "Trade-offs are estimated via heuristic perturbation (no scoped re-execution yet).",
  }
}
