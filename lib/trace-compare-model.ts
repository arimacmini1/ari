import { DecisionNode } from "@/lib/trace-model"

export type TraceCompareStatus = "queued" | "running" | "completed" | "failed"

export interface TraceCompareRequest {
  execution_id: string
  node_id: string
  alternative_outcome: string
}

export interface TraceTradeoffMetrics {
  base_confidence_avg: number
  alt_confidence_avg: number
  confidence_delta: number

  base_cost_total: number
  alt_cost_total: number
  cost_delta: number

  base_latency_total_s: number
  alt_latency_total_s: number
  latency_delta_s: number

  per_decision_deltas: TraceDecisionDelta[]
}

export interface TraceDiffSummary {
  changed_node_ids: string[]
  added_node_ids: string[]
  removed_node_ids: string[]
}

export interface TraceDecisionDelta {
  node_id: string
  label?: string
  confidence_delta: number
  cost_delta: number
  latency_delta_s: number
  data_quality: "estimated" | "observed"
}

export interface TraceComparison {
  comparison_id: string
  status: TraceCompareStatus
  created_at: string

  execution_id: string
  fork_node_id: string
  selected_alternative_outcome: string

  base_path: DecisionNode
  alternative_path: DecisionNode

  diff_summary: TraceDiffSummary
  tradeoff_metrics: TraceTradeoffMetrics

  note?: string
  timings_ms?: {
    diff_compute_ms: number
  }
}
