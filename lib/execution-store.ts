export interface ExecutionRecord {
  execution_id: string
  project_id: string
  rule_set_id: string
  created_at: string
  assignment_plan: Array<{
    id: string
    assigned_agent_id_or_pool: string
    estimated_cost: number
    estimated_duration: number
    status: string
  }>
  assigned_agents: string[]
  estimated_cost: number
  estimated_duration: number
  success_probability: number
  status: 'pending' | 'processing' | 'complete' | 'failed'
  actual_cost?: number
  actual_duration?: number
}

declare global {
  var __aei_executions_db: Map<string, ExecutionRecord> | undefined
}

export const EXECUTIONS_DB =
  globalThis.__aei_executions_db ?? (globalThis.__aei_executions_db = new Map<string, ExecutionRecord>())
