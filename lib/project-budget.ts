import { type ExecutionRecord } from "@/lib/execution-store"
import { type ProjectRecord } from "@/lib/project-store"

export interface ProjectBudgetSnapshot {
  current_spend: number
  incoming_estimated_cost: number
  projected_spend: number
  budget_warning_threshold?: number
  budget_hard_cap?: number
  warning_threshold_crossed: boolean
  hard_cap_reached: boolean
}

export function estimateExecutionCost(
  estimatedCost: unknown,
  assignmentPlan: unknown
): number {
  if (typeof estimatedCost === "number" && Number.isFinite(estimatedCost) && estimatedCost >= 0) {
    return estimatedCost
  }

  if (!Array.isArray(assignmentPlan)) return 0
  return assignmentPlan.reduce<number>((total, step) => {
    const stepCost = (step as { estimated_cost?: unknown })?.estimated_cost
    if (typeof stepCost === "number" && Number.isFinite(stepCost) && stepCost >= 0) {
      return total + stepCost
    }
    return total
  }, 0)
}

export function calculateProjectSpend(
  executions: Iterable<ExecutionRecord>,
  projectId: string
): number {
  let total = 0
  for (const execution of executions) {
    if (execution.project_id !== projectId) continue
    const cost = typeof execution.actual_cost === "number" ? execution.actual_cost : execution.estimated_cost
    if (Number.isFinite(cost) && cost >= 0) {
      total += cost
    }
  }
  return total
}

export function evaluateProjectBudget(options: {
  project: ProjectRecord
  executions: Iterable<ExecutionRecord>
  incomingEstimatedCost: number
}): ProjectBudgetSnapshot {
  const { project, executions, incomingEstimatedCost } = options
  const currentSpend = calculateProjectSpend(executions, project.project_id)
  const projectedSpend = currentSpend + incomingEstimatedCost

  const warningThreshold = project.budget_warning_threshold
  const hardCap = project.budget_hard_cap

  const warningCrossed =
    typeof warningThreshold === "number" && Number.isFinite(warningThreshold) && projectedSpend >= warningThreshold
  const hardCapReached = typeof hardCap === "number" && Number.isFinite(hardCap) && projectedSpend >= hardCap

  return {
    current_spend: currentSpend,
    incoming_estimated_cost: incomingEstimatedCost,
    projected_spend: projectedSpend,
    budget_warning_threshold: warningThreshold,
    budget_hard_cap: hardCap,
    warning_threshold_crossed: warningCrossed,
    hard_cap_reached: hardCapReached,
  }
}
